# Design Metrics and Monitoring System

[← Back to Problems](00-index.md)

---

## 🎯 Problem Statement

Design a metrics collection and monitoring system (like Datadog/Prometheus) that ingests millions of metrics per second, stores time-series data efficiently, and enables real-time alerting.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Ingest metrics** - From thousands of servers
2. **Query metrics** - Time-range queries, aggregations
3. **Dashboards** - Real-time visualization
4. **Alerting** - Threshold-based alerts
5. **Retention** - Different policies (hot/warm/cold)
6. **Tagging** - Filter by dimensions (host, region, etc.)

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Write Throughput** | 10M metrics/second |
| **Query Latency** | < 1s for dashboards |
| **Availability** | 99.9% |
| **Retention** | 1 year |
| **Alert Latency** | < 1 minute |

---

## 2. Back of Envelope Calculations

```
Write Volume:
- 10 million metrics/second
- Each metric: 100 bytes (name, tags, value, timestamp)
- 10M × 100 = 1 GB/second
- 86 TB/day raw

Storage (with compression):
- 10:1 compression typical for time-series
- 8.6 TB/day compressed
- 3.1 PB/year

Query Patterns:
- 90% queries on last 1 hour (hot)
- 9% queries on last 7 days (warm)
- 1% queries on older data (cold)
```

---

## 3. Core Entities

```sql
-- Metric metadata
CREATE TABLE metric_definitions (
    metric_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50),
    type ENUM('counter', 'gauge', 'histogram'),
    created_at TIMESTAMP
);

-- Time-series data (conceptual - stored in TSDB)
-- In InfluxDB/TimescaleDB format:
-- metric_name{tag1=v1,tag2=v2} value timestamp

-- Alerts
CREATE TABLE alerts (
    alert_id UUID PRIMARY KEY,
    name VARCHAR(255),
    query TEXT,  -- PromQL or similar
    threshold DECIMAL,
    comparison ENUM('gt', 'lt', 'eq'),
    duration_seconds INT,  -- Fire after N seconds
    severity ENUM('info', 'warning', 'critical'),
    notification_channels JSON,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP
);

-- Alert Events
CREATE TABLE alert_events (
    event_id UUID PRIMARY KEY,
    alert_id UUID,
    status ENUM('firing', 'resolved'),
    value DECIMAL,
    started_at TIMESTAMP,
    resolved_at TIMESTAMP,
    acknowledged_by VARCHAR(100),
    
    INDEX idx_alert_time (alert_id, started_at)
);

-- Dashboards
CREATE TABLE dashboards (
    dashboard_id UUID PRIMARY KEY,
    name VARCHAR(255),
    owner_id UUID,
    layout JSON,  -- Panel positions
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## 4. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   METRICS SYSTEM ARCHITECTURE                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│   │ Server 1 │ │ Server 2 │ │ Server 3 │ │ Server N │   Agents           │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘                    │
│        │            │            │            │                           │
│        └────────────┴─────┬──────┴────────────┘                          │
│                           │                                               │
│                           ▼                                               │
│                  ┌─────────────────┐                                     │
│                  │  Load Balancer  │                                     │
│                  └────────┬────────┘                                     │
│                           │                                               │
│            ┌──────────────┼──────────────┐                               │
│            ▼              ▼              ▼                               │
│       ┌─────────┐   ┌─────────┐   ┌─────────┐                           │
│       │Ingestion│   │Ingestion│   │Ingestion│   Write Path             │
│       │ Node 1  │   │ Node 2  │   │ Node N  │                           │
│       └────┬────┘   └────┬────┘   └────┬────┘                           │
│            │             │             │                                 │
│            └─────────────┼─────────────┘                                 │
│                          │                                               │
│                          ▼                                               │
│                   ┌─────────────┐                                        │
│                   │   Kafka     │   Buffer/Queue                        │
│                   │  (Buffer)   │                                        │
│                   └──────┬──────┘                                        │
│                          │                                               │
│          ┌───────────────┼───────────────┐                              │
│          ▼               ▼               ▼                              │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐                        │
│    │ Storage  │    │ Storage  │    │ Storage  │   Storage Layer        │
│    │ Node 1   │    │ Node 2   │    │ Node N   │                        │
│    │ (TSDB)   │    │ (TSDB)   │    │ (TSDB)   │                        │
│    └──────────┘    └──────────┘    └──────────┘                        │
│          │               │               │                              │
│          └───────────────┼───────────────┘                              │
│                          │                                               │
│    ┌──────────────────────┬──────────────────────┐                      │
│    │                      │                      │                       │
│    ▼                      ▼                      ▼                       │
│ ┌───────────┐      ┌─────────────┐      ┌─────────────┐                │
│ │  Query    │      │   Alert     │      │ Dashboard   │   Read Path    │
│ │  Engine   │      │   Engine    │      │   Service   │                │
│ └───────────┘      └─────────────┘      └─────────────┘                │
│                                                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deep Dive: Time-Series Data Model

```
┌─────────────────────────────────────────────────────────────────┐
│                   TIME-SERIES DATA MODEL                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Metric Format:                                                 │
│  ───────────────                                                │
│  <metric_name>{<label_key>=<label_value>,...} <value> <ts>    │
│                                                                 │
│  Example:                                                       │
│  ──────────                                                     │
│  http_requests_total{method="GET",path="/api",status="200"}   │
│    154239 1699123456789                                        │
│                                                                 │
│  Cardinality:                                                   │
│  ─────────────                                                  │
│  • Each unique label combination = new time series             │
│  • High cardinality = explosion of series                      │
│  • Bad: user_id as label (millions of series)                 │
│  • Good: region, service, status (bounded values)             │
│                                                                 │
│  Data Types:                                                    │
│  ────────────                                                   │
│  • Counter: Monotonically increasing (requests_total)         │
│  • Gauge: Can go up/down (temperature, memory)                │
│  • Histogram: Distribution (latency buckets)                  │
│                                                                 │
│  Storage Layout:                                                │
│  ────────────────                                               │
│  Series are stored together for compression:                   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Series: http_requests{method=GET}                      │   │
│  │ ┌────────────────────────────────────────────────────┐ │   │
│  │ │ t1: 100 │ t2: 105 │ t3: 110 │ t4: 118 │ ...      │ │   │
│  │ └────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Compression: Delta-of-delta for timestamps                   │
│               XOR for values (same bits → 0 bits stored)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Deep Dive: Write Path

```
┌─────────────────────────────────────────────────────────────────┐
│                   WRITE PATH                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Agent → Ingestion → Kafka → Storage                          │
│                                                                 │
│  1. Agent Collection                                            │
│     ─────────────────                                           │
│     • Collects metrics locally (CPU, memory, custom)          │
│     • Batches metrics (every 10 seconds)                      │
│     • Sends batch to ingestion service                        │
│                                                                 │
│  2. Ingestion Service                                          │
│     ───────────────────                                         │
│     • Validates metric format                                  │
│     • Enriches with additional labels (datacenter, etc.)      │
│     • Writes to Kafka topic partitioned by metric name        │
│                                                                 │
│  3. Kafka Buffer                                                │
│     ──────────────                                              │
│     • Absorbs write spikes                                     │
│     • Provides durability before storage                       │
│     • Partitioned for parallelism                             │
│                                                                 │
│  4. Storage Writer                                              │
│     ───────────────                                             │
│     • Consumes from Kafka                                      │
│     • Writes to TSDB (InfluxDB, TimescaleDB, Prometheus)     │
│     • Handles backpressure                                     │
│                                                                 │
│  Write-Ahead Log (WAL):                                         │
│  ────────────────────────                                       │
│  • All writes go to WAL first                                 │
│  • In-memory buffer for recent data                           │
│  • Periodically flushed to disk                               │
│  • WAL replayed on crash recovery                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Deep Dive: Query Engine

```
┌─────────────────────────────────────────────────────────────────┐
│                   QUERY ENGINE                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Query Language (PromQL-like):                                 │
│  ──────────────────────────────                                 │
│  # Rate of HTTP requests over 5 minutes                       │
│  rate(http_requests_total[5m])                                │
│                                                                 │
│  # 99th percentile latency by service                         │
│  histogram_quantile(0.99,                                     │
│    rate(request_latency_bucket[5m]))                          │
│                                                                 │
│  # Sum of errors by region                                    │
│  sum by (region) (rate(errors_total[1m]))                    │
│                                                                 │
│  Query Execution:                                               │
│  ─────────────────                                              │
│  1. Parse query into AST                                       │
│  2. Identify time range and series matchers                   │
│  3. Fan out to storage nodes                                  │
│  4. Each node returns local results                           │
│  5. Merge and aggregate at query layer                        │
│                                                                 │
│  Downsampling:                                                  │
│  ─────────────                                                  │
│  • Raw data: 10 second resolution → 7 days                    │
│  • 1 minute averages → 30 days                                │
│  • 5 minute averages → 1 year                                 │
│  • Daily averages → forever                                   │
│                                                                 │
│  Pre-computed Aggregations:                                     │
│  ───────────────────────────                                    │
│  • Recording rules: pre-compute expensive queries             │
│  • Materialized views for dashboards                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Alerting Engine

```
┌─────────────────────────────────────────────────────────────────┐
│                   ALERTING                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Alert Rule Example:                                            │
│  ────────────────────                                           │
│  - name: HighErrorRate                                         │
│    query: rate(errors_total[5m]) / rate(requests_total[5m])  │
│    threshold: 0.05  # 5%                                       │
│    for: 5m  # Must be true for 5 minutes                      │
│    severity: critical                                          │
│    notify: [pagerduty, slack]                                 │
│                                                                 │
│  Alerting Flow:                                                 │
│  ───────────────                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  Every 15 seconds:                                     │   │
│  │    for each alert_rule:                                │   │
│  │      result = query(alert_rule.query)                  │   │
│  │                                                         │   │
│  │      if result > threshold:                            │   │
│  │        if not currently_firing(alert):                 │   │
│  │          start_pending(alert)                          │   │
│  │        if pending_duration >= for_duration:            │   │
│  │          fire_alert(alert)                             │   │
│  │          notify_channels(alert)                        │   │
│  │      else:                                              │   │
│  │        if currently_firing(alert):                     │   │
│  │          resolve_alert(alert)                          │   │
│  │          notify_resolved(alert)                        │   │
│  │                                                         │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Alert States:                                                  │
│  ──────────────                                                 │
│  • Inactive: Condition not met                                │
│  • Pending: Condition met, waiting for 'for' duration         │
│  • Firing: Alert active, notifications sent                   │
│  • Resolved: Was firing, now condition cleared                │
│                                                                 │
│  Deduplication:                                                 │
│  ───────────────                                                │
│  • Group similar alerts                                        │
│  • Send single notification for group                         │
│  • Avoid alert fatigue                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Storage Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│                   STORAGE TIERS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Hot Tier (Last 24 hours):                                     │
│  ──────────────────────────                                     │
│  • In-memory + SSD                                             │
│  • Full resolution (10s intervals)                            │
│  • Fastest queries                                             │
│                                                                 │
│  Warm Tier (1-30 days):                                        │
│  ────────────────────────                                       │
│  • SSD storage                                                 │
│  • 1-minute resolution                                         │
│  • Good query performance                                      │
│                                                                 │
│  Cold Tier (30+ days):                                         │
│  ───────────────────────                                        │
│  • Object storage (S3)                                         │
│  • 5-minute or hourly resolution                              │
│  • Slower queries, cheaper storage                            │
│                                                                 │
│  Automatic Tiering:                                             │
│  ───────────────────                                            │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  Age < 24h  → Hot (memory/SSD)                        │   │
│  │  Age 1-30d  → Warm (SSD) + downsample to 1m          │   │
│  │  Age > 30d  → Cold (S3) + downsample to 5m           │   │
│  │                                                         │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| TSDB | InfluxDB/TimescaleDB | Purpose-built for metrics |
| Buffer | Kafka | High throughput |
| Query | PromQL | Industry standard |
| Alerting | Custom | Flexible rules |
| Cold Storage | S3 + Parquet | Cost effective |
| Dashboard | Grafana | Standard tool |

---

## 11. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TIME-SERIES DATABASE                                        │
│     Specialized storage for metrics                            │
│                                                                 │
│  2. DOWNSAMPLING                                                │
│     Reduce resolution over time                                │
│                                                                 │
│  3. CARDINALITY MANAGEMENT                                      │
│     Avoid high-cardinality labels                              │
│                                                                 │
│  4. TIERED STORAGE                                              │
│     Hot/warm/cold for cost optimization                        │
│                                                                 │
│  5. PRE-AGGREGATION                                             │
│     Recording rules for expensive queries                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. References

- [11-databases.md](../fundamentals/11-databases.md) - Storage engines
- [05-caching.md](../fundamentals/05-caching.md) - Hot tier caching
- [09-message-queues.md](../fundamentals/09-message-queues.md) - Kafka buffering

---

[← Back to Problems](00-index.md) | [Next: Ad Click Aggregator →](18-ad-click-aggregator.md)
