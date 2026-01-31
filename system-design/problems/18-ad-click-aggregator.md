# Design Ad Click Aggregator

[← Back to Problems](00-index.md)

---

## 🎯 Problem Statement

Design a real-time ad click aggregation system that processes billions of click events daily, aggregates metrics for advertisers, and handles click fraud detection.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Ingest clicks** - Billions of events per day
2. **Aggregate metrics** - Clicks by ad, campaign, time window
3. **Real-time dashboard** - Near real-time updates
4. **Fraud detection** - Identify suspicious patterns
5. **Query historical data** - Analytics and reporting
6. **Billing integration** - Accurate click counts for billing

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Throughput** | 1M clicks/second peak |
| **Latency** | Aggregates within 1 minute |
| **Accuracy** | 99.99% (billing) |
| **Availability** | 99.9% |
| **Deduplication** | Exactly-once counting |

---

## 2. Back of Envelope Calculations

```
Click Volume:
- 10 billion clicks/day
- 10B / 86400 ≈ 115K clicks/second average
- Peak: 1M clicks/second

Event Size:
- Click event: 500 bytes
- 10B × 500 bytes = 5 TB/day raw

Aggregation Output:
- 1 million advertisers
- 10 campaigns each = 10M campaigns
- Aggregates per minute = 10M × 1440 = 14.4B records/day
- With rollups: much less
```

---

## 3. Core Entities

```sql
-- Raw click events (streaming/log format)
-- Stored in Kafka, then cold storage

-- Minute-level aggregates
CREATE TABLE click_aggregates_minute (
    ad_id UUID,
    campaign_id UUID,
    advertiser_id UUID,
    window_start TIMESTAMP,
    window_end TIMESTAMP,
    click_count BIGINT,
    unique_users BIGINT,  -- HyperLogLog
    valid_clicks BIGINT,
    fraud_clicks BIGINT,
    total_cost DECIMAL(19,4),
    
    PRIMARY KEY (ad_id, window_start)
) PARTITION BY RANGE (window_start);

-- Hourly rollups
CREATE TABLE click_aggregates_hourly (
    ad_id UUID,
    campaign_id UUID,
    advertiser_id UUID,
    hour TIMESTAMP,
    click_count BIGINT,
    unique_users BIGINT,
    valid_clicks BIGINT,
    fraud_clicks BIGINT,
    total_cost DECIMAL(19,4),
    
    PRIMARY KEY (ad_id, hour)
);

-- Daily aggregates for billing
CREATE TABLE click_aggregates_daily (
    advertiser_id UUID,
    campaign_id UUID,
    ad_id UUID,
    date DATE,
    click_count BIGINT,
    valid_clicks BIGINT,
    fraud_clicks BIGINT,
    billable_clicks BIGINT,
    total_cost DECIMAL(19,4),
    
    PRIMARY KEY (advertiser_id, date, campaign_id, ad_id)
);
```

---

## 4. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   AD CLICK AGGREGATOR ARCHITECTURE                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                                    │
│   │ Ad SDK  │ │ Ad SDK  │ │ Ad SDK  │  Mobile/Web SDKs                   │
│   └────┬────┘ └────┬────┘ └────┬────┘                                    │
│        │           │           │                                          │
│        └───────────┼───────────┘                                          │
│                    ▼                                                       │
│           ┌─────────────────┐                                             │
│           │  Load Balancer  │                                             │
│           └────────┬────────┘                                             │
│                    │                                                       │
│         ┌──────────┴──────────┐                                           │
│         ▼                     ▼                                           │
│   ┌───────────┐         ┌───────────┐                                    │
│   │ Ingestion │         │ Ingestion │    Click Collectors               │
│   │  Node 1   │         │  Node N   │                                    │
│   └─────┬─────┘         └─────┬─────┘                                    │
│         │                     │                                           │
│         └──────────┬──────────┘                                           │
│                    ▼                                                       │
│           ┌─────────────────┐                                             │
│           │     Kafka       │    Raw Events                              │
│           │ (Partitioned by │                                             │
│           │    ad_id)       │                                             │
│           └────────┬────────┘                                             │
│                    │                                                       │
│     ┌──────────────┼──────────────┐                                       │
│     ▼              ▼              ▼                                       │
│ ┌────────┐   ┌──────────┐   ┌────────────┐                              │
│ │ Flink  │   │  Fraud   │   │ Raw Event  │                              │
│ │Aggreg- │   │Detection │   │  Archive   │                              │
│ │ ation  │   │  Stream  │   │   (S3)     │                              │
│ └───┬────┘   └────┬─────┘   └────────────┘                              │
│     │             │                                                       │
│     └──────┬──────┘                                                       │
│            ▼                                                               │
│   ┌─────────────────┐                                                     │
│   │  Aggregates DB  │    ClickHouse/Druid                                │
│   │  (OLAP Engine)  │                                                     │
│   └────────┬────────┘                                                     │
│            │                                                               │
│   ┌────────┴────────┐                                                     │
│   ▼                 ▼                                                     │
│ ┌──────────┐  ┌────────────┐                                             │
│ │Dashboard │  │  Billing   │                                             │
│ │ Service  │  │  Service   │                                             │
│ └──────────┘  └────────────┘                                             │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deep Dive: Stream Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                   STREAM AGGREGATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Window Types:                                                  │
│  ──────────────                                                 │
│  • Tumbling Window: Fixed, non-overlapping                     │
│    [0-1min] [1-2min] [2-3min] ...                             │
│                                                                 │
│  • Sliding Window: Overlapping                                 │
│    [0-5min] [1-6min] [2-7min] ...                             │
│                                                                 │
│  • Session Window: Gap-based                                   │
│    [activity...gap...activity...]                             │
│                                                                 │
│  Aggregation Pipeline (Flink):                                 │
│  ──────────────────────────────                                 │
│  clicks                                                         │
│    .keyBy(click -> click.adId)                                │
│    .window(TumblingEventTimeWindows.of(Time.minutes(1)))      │
│    .aggregate(new ClickAggregator())                          │
│    .addSink(new ClickHouseSink());                            │
│                                                                 │
│  Late Arrivals:                                                 │
│  ───────────────                                                │
│  • Allow lateness: 5 minutes                                   │
│  • Late events update aggregates                              │
│  • Very late events → separate handling                       │
│                                                                 │
│  .window(TumblingEventTimeWindows.of(Time.minutes(1)))        │
│  .allowedLateness(Time.minutes(5))                            │
│  .sideOutputLateData(lateOutputTag)                           │
│                                                                 │
│  Watermarks:                                                    │
│  ────────────                                                   │
│  • Track event time progress                                   │
│  • Watermark = max_event_time - allowed_lateness              │
│  • Triggers window computation                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Deep Dive: Exactly-Once Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                   EXACTLY-ONCE SEMANTICS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Challenge: Don't count a click twice, don't miss any         │
│                                                                 │
│  Deduplication at Ingestion:                                    │
│  ─────────────────────────────                                  │
│  • Each click has unique click_id                             │
│  • Bloom filter for fast duplicate check                      │
│  • Redis for recent click_ids (TTL: 1 hour)                   │
│                                                                 │
│  def process_click(click):                                     │
│      # Fast check with Bloom filter                           │
│      if bloom_filter.might_contain(click.id):                 │
│          # Slower check with Redis                            │
│          if redis.exists(f"click:{click.id}"):               │
│              return  # Duplicate                               │
│                                                                 │
│      # Not duplicate, process                                  │
│      redis.setex(f"click:{click.id}", 3600, "1")             │
│      bloom_filter.add(click.id)                               │
│      kafka.send("clicks", click)                              │
│                                                                 │
│  Flink Checkpointing:                                          │
│  ──────────────────────                                         │
│  • Periodic snapshots of state                                │
│  • On failure, restart from checkpoint                        │
│  • Combined with Kafka transactions                           │
│                                                                 │
│  Two-Phase Sink:                                                │
│  ─────────────────                                              │
│  1. Pre-commit: Write to staging table                        │
│  2. Checkpoint complete                                        │
│  3. Commit: Move to final table                               │
│  4. Rollback on failure                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Fraud Detection

```
┌─────────────────────────────────────────────────────────────────┐
│                   FRAUD DETECTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Types of Click Fraud:                                          │
│  ──────────────────────                                         │
│  • Bot clicks (automated)                                      │
│  • Click farms (organized human)                               │
│  • Competitor clicking (draining budget)                       │
│  • Publisher fraud (fake clicks for revenue)                  │
│                                                                 │
│  Detection Signals:                                             │
│  ───────────────────                                            │
│  1. Rate-based                                                  │
│     • Too many clicks from same IP                            │
│     • Abnormal click rate for an ad                           │
│                                                                 │
│  2. Behavioral                                                  │
│     • No mouse movement before click                          │
│     • Click on hidden element                                 │
│     • Immediate bounce (< 1 second)                           │
│                                                                 │
│  3. Pattern-based                                               │
│     • Clicks at regular intervals                             │
│     • Same device fingerprint, different IPs                  │
│     • Geographic impossibility                                │
│                                                                 │
│  Real-time Detection:                                           │
│  ─────────────────────                                          │
│  clicks                                                         │
│    .keyBy(click -> click.ip)                                  │
│    .window(SlidingWindow.of(1.minute, 10.seconds))           │
│    .aggregate(ClickCounter())                                 │
│    .filter(count -> count > THRESHOLD)                       │
│    .process(FraudMarker())                                    │
│                                                                 │
│  ML-based Detection:                                            │
│  ────────────────────                                           │
│  • Feature extraction from click events                       │
│  • Real-time inference on stream                              │
│  • Model trained on labeled fraud data                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. MapReduce for Batch Aggregation

```
┌─────────────────────────────────────────────────────────────────┐
│                   BATCH PROCESSING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Daily Reconciliation:                                          │
│  ──────────────────────                                         │
│  Stream processing for speed, batch for accuracy              │
│                                                                 │
│  Lambda Architecture:                                           │
│  ─────────────────────                                          │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     Raw Events (Kafka)                                 │   │
│  │           │                                            │   │
│  │     ┌─────┴─────┐                                     │   │
│  │     ▼           ▼                                      │   │
│  │  ┌───────┐  ┌───────┐                                 │   │
│  │  │Speed  │  │ Batch │                                 │   │
│  │  │Layer  │  │ Layer │                                 │   │
│  │  │(Flink)│  │(Spark)│                                 │   │
│  │  └───┬───┘  └───┬───┘                                 │   │
│  │      │          │                                      │   │
│  │      ▼          ▼                                      │   │
│  │  ┌───────┐  ┌───────┐                                 │   │
│  │  │Real-  │  │Daily  │                                 │   │
│  │  │time   │  │Batch  │                                 │   │
│  │  │View   │  │View   │                                 │   │
│  │  └───┬───┘  └───┬───┘                                 │   │
│  │      │          │                                      │   │
│  │      └────┬─────┘                                     │   │
│  │           ▼                                            │   │
│  │     Merged Query                                       │   │
│  │                                                         │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Batch corrects any stream errors (late data, duplicates)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Query Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                   QUERY PATTERNS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Real-time Queries (last 1 hour):                              │
│  ─────────────────────────────────                              │
│  SELECT                                                         │
│    ad_id,                                                      │
│    sum(click_count) as total_clicks,                          │
│    sum(valid_clicks) as valid,                                │
│    sum(fraud_clicks) as fraud                                 │
│  FROM click_aggregates_minute                                  │
│  WHERE window_start > now() - interval '1 hour'               │
│  GROUP BY ad_id;                                               │
│                                                                 │
│  Historical Queries:                                            │
│  ────────────────────                                           │
│  • Use hourly/daily rollups                                   │
│  • Pre-aggregated by campaign, advertiser                     │
│                                                                 │
│  Approximate Counts (HyperLogLog):                             │
│  ───────────────────────────────────                            │
│  • Unique user counts                                          │
│  • 99% accuracy with minimal storage                          │
│  • HLL sketches are mergeable                                 │
│                                                                 │
│  SELECT                                                         │
│    campaign_id,                                                │
│    uniqMerge(unique_users_hll) as unique_users                │
│  FROM click_aggregates_hourly                                  │
│  WHERE hour BETWEEN '2024-01-01' AND '2024-01-31'             │
│  GROUP BY campaign_id;                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Stream Processing | Apache Flink | Exactly-once, low latency |
| Message Queue | Kafka | High throughput, replay |
| OLAP DB | ClickHouse | Fast aggregations |
| Dedup Cache | Redis | Fast lookups |
| Batch Processing | Apache Spark | Large-scale batch |
| Cold Storage | S3 + Parquet | Cost effective |

---

## 11. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. STREAM + BATCH                                              │
│     Lambda architecture for speed and accuracy                 │
│                                                                 │
│  2. EXACTLY-ONCE                                                │
│     Deduplication at ingestion + checkpointing                 │
│                                                                 │
│  3. WINDOWED AGGREGATION                                        │
│     Tumbling windows with late arrival handling                │
│                                                                 │
│  4. FRAUD DETECTION                                             │
│     Real-time patterns + ML models                             │
│                                                                 │
│  5. APPROXIMATE ALGORITHMS                                      │
│     HyperLogLog for unique counts                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. References

- [09-message-queues.md](../fundamentals/09-message-queues.md) - Kafka streaming
- [11-databases.md](../fundamentals/11-databases.md) - OLAP databases
- [22-batch-processing.md](../fundamentals/22-batch-processing.md) - MapReduce patterns

---

[← Back to Problems](00-index.md) | [Next: Distributed Key-Value Store →](19-key-value-store.md)
