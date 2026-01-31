# Back-of-Envelope Calculations

[← Back to Fundamentals](00-index.md)

---

## Overview

Back-of-envelope calculations help you quickly estimate system requirements during design interviews. These rough calculations guide architectural decisions about database choices, caching needs, server counts, and more. The goal isn't precision—it's getting within an order of magnitude to make informed decisions.

---

## 📊 Numbers Every Engineer Should Know

### Latency Comparison Numbers

```
┌─────────────────────────────────────────────────────────────────┐
│                    LATENCY NUMBERS (2024)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Operation                              Time                    │
│  ─────────────────────────────────────────────────────          │
│  L1 cache reference                     0.5 ns                  │
│  Branch mispredict                      5 ns                    │
│  L2 cache reference                     7 ns                    │
│  Mutex lock/unlock                      25 ns                   │
│  Main memory reference                  100 ns                  │
│  Compress 1KB with Zippy               3,000 ns    (3 μs)       │
│  Send 1KB over 1 Gbps network         10,000 ns    (10 μs)      │
│  Read 4KB randomly from SSD          150,000 ns    (150 μs)     │
│  Read 1MB sequentially from memory   250,000 ns    (250 μs)     │
│  Round trip within same datacenter   500,000 ns    (500 μs)     │
│  Read 1MB sequentially from SSD    1,000,000 ns    (1 ms)       │
│  HDD seek                         10,000,000 ns    (10 ms)      │
│  Read 1MB sequentially from HDD   20,000,000 ns    (20 ms)      │
│  Send packet CA → Netherlands    150,000,000 ns    (150 ms)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Insights from Latency Numbers

| Insight | Implication |
|---------|------------|
| Memory is ~100x faster than SSD | Cache frequently accessed data in memory |
| SSD is ~100x faster than HDD | Use SSDs for databases |
| Network within DC is ~0.5ms | Microservices calls add up quickly |
| Cross-continental is ~150ms | Consider geographic distribution |
| Compression is cheap | Compress data before network transfer |

### Throughput Numbers

```
┌─────────────────────────────────────────────────────────────────┐
│                    THROUGHPUT BENCHMARKS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Component                          Throughput                  │
│  ─────────────────────────────────────────────────────          │
│  HDD sequential read/write          100-200 MB/s                │
│  SSD sequential read                500-3000 MB/s               │
│  SSD sequential write               200-2000 MB/s               │
│  1 Gbps network                     ~100 MB/s                   │
│  10 Gbps network                    ~1 GB/s                     │
│  DDR4 memory bandwidth              25-50 GB/s                  │
│                                                                 │
│  IOPS (I/O Operations Per Second):                              │
│  ─────────────────────────────────────────────────────          │
│  HDD                                100-200 IOPS                │
│  SSD                                10,000-100,000 IOPS         │
│  NVMe SSD                           100,000-1,000,000 IOPS      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Performance Benchmarks

| Database | Read QPS | Write QPS | Notes |
|----------|----------|-----------|-------|
| PostgreSQL (single) | 10K-50K | 5K-20K | Depends on query complexity |
| MySQL (single) | 10K-50K | 5K-20K | Similar to Postgres |
| Redis | 100K+ | 100K+ | In-memory, single-threaded |
| MongoDB | 10K-100K | 10K-50K | Depends on indexing |
| Cassandra (per node) | 10K-50K | 10K-50K | Scales linearly |
| DynamoDB | Unlimited | Unlimited | Pay per request, auto-scales |

### Web Server Benchmarks

| Server Type | Requests/Second | Notes |
|-------------|-----------------|-------|
| Simple API (Node.js) | 10K-50K | I/O bound operations |
| Complex API (with DB) | 1K-10K | Database is usually bottleneck |
| Static file server | 50K-100K | Very fast |
| WebSocket connections | 10K-100K per server | Memory bound |

---

## 🔢 Quick Reference Conversions

### Time Conversions

```
1 day    = 86,400 seconds    ≈ 100K seconds (use 10^5)
1 week   = 604,800 seconds   ≈ 600K seconds
1 month  = 2.6M seconds      ≈ 2.5 × 10^6
1 year   = 31.5M seconds     ≈ 3 × 10^7
```

### Data Size Conversions

```
1 Byte (B)      = 8 bits
1 Kilobyte (KB) = 1,000 bytes         ≈ 10^3 B
1 Megabyte (MB) = 1,000 KB            ≈ 10^6 B
1 Gigabyte (GB) = 1,000 MB            ≈ 10^9 B
1 Terabyte (TB) = 1,000 GB            ≈ 10^12 B
1 Petabyte (PB) = 1,000 TB            ≈ 10^15 B
```

### Character/Data Sizes

| Data Type | Size |
|-----------|------|
| ASCII character | 1 byte |
| Unicode character (UTF-8) | 1-4 bytes |
| Integer | 4 bytes |
| Long integer | 8 bytes |
| UUID | 16 bytes (128 bits) |
| IPv4 address | 4 bytes |
| IPv6 address | 16 bytes |
| Unix timestamp | 4-8 bytes |
| MD5 hash | 16 bytes |
| SHA-256 hash | 32 bytes |

---

## 📐 Estimation Formulas

### QPS (Queries Per Second)

```
Basic formula:
─────────────────────────────────────────────
QPS = Daily operations ÷ Seconds per day
QPS = Daily operations ÷ 86,400
QPS ≈ Daily operations ÷ 100,000 (for quick math)

Peak QPS:
─────────────────────────────────────────────
Peak QPS = Average QPS × Peak factor
Peak factor is typically 2x-3x for most applications
(Could be 10x+ for event-driven traffic like sports/elections)
```

### Storage Estimation

```
Daily storage = New records per day × Record size
Yearly storage = Daily storage × 365
N-year storage = Yearly storage × N × (1 + replication factor)

With compression (typical 10:1 for text):
Actual storage = Raw storage ÷ Compression ratio
```

### Bandwidth Estimation

```
Incoming bandwidth = Write QPS × Average request size
Outgoing bandwidth = Read QPS × Average response size

Example:
─────────────────────────────────────────────
Read QPS: 10,000
Average response: 10 KB

Outgoing = 10,000 × 10 KB = 100 MB/s = 800 Mbps
Need at least 1 Gbps network capacity
```

### Server Count Estimation

```
Servers needed = Peak QPS ÷ QPS per server

Example:
─────────────────────────────────────────────
Peak QPS: 100,000
Single server capacity: 10,000 QPS

Servers = 100,000 ÷ 10,000 = 10 servers minimum
Add 50% for redundancy = 15 servers
```

### Cache Size Estimation

```
Cache size = Hot data percentage × Total data size

Common pattern (80/20 rule):
20% of data serves 80% of requests
Cache 20% of your dataset for high hit rate
```

---

## 🧮 Worked Examples

### Example 1: Twitter-like Service

```
┌─────────────────────────────────────────────────────────────────┐
│           TWITTER CAPACITY ESTIMATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Given:                                                         │
│  • 500M total users                                             │
│  • 200M daily active users (DAU)                                │
│  • Average user reads 100 tweets/day                            │
│  • Average user posts 2 tweets/day                              │
│  • Average tweet: 300 bytes (text + metadata)                   │
│  • 20% of tweets have images (average 200KB compressed)         │
│                                                                 │
│  QPS Calculations:                                              │
│  ─────────────────────────────────────────────                  │
│  Read tweets: 200M × 100 = 20B/day                              │
│  Read QPS: 20B ÷ 86,400 ≈ 230,000 QPS                           │
│  Peak Read QPS: 230,000 × 3 = 690,000 QPS                       │
│                                                                 │
│  Post tweets: 200M × 2 = 400M/day                               │
│  Write QPS: 400M ÷ 86,400 ≈ 4,600 QPS                           │
│  Peak Write QPS: 4,600 × 3 = 13,800 QPS                         │
│                                                                 │
│  Storage Calculations:                                          │
│  ─────────────────────────────────────────────                  │
│  Text storage: 400M × 300B = 120 GB/day                         │
│  Image storage: 400M × 0.2 × 200KB = 16 TB/day                  │
│  Total: ~16.1 TB/day, ~5.9 PB/year                              │
│                                                                 │
│  Bandwidth:                                                     │
│  ─────────────────────────────────────────────                  │
│  Assume 10% of reads include images                             │
│  Text reads: 230K × 300B = 70 MB/s                              │
│  Image reads: 23K × 200KB = 4.6 GB/s                            │
│  Total outbound: ~5 GB/s = 40 Gbps                              │
│  (This is why you need a CDN!)                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Example 2: URL Shortener

```
┌─────────────────────────────────────────────────────────────────┐
│           URL SHORTENER CAPACITY ESTIMATION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Given:                                                         │
│  • 100M URLs created per month                                  │
│  • 100:1 read/write ratio                                       │
│  • URL record: 500 bytes (short URL + long URL + metadata)      │
│  • Keep URLs for 5 years                                        │
│                                                                 │
│  QPS Calculations:                                              │
│  ─────────────────────────────────────────────                  │
│  Write QPS: 100M ÷ (30 × 86,400) ≈ 40 QPS                       │
│  Read QPS: 40 × 100 = 4,000 QPS                                 │
│  Peak Read QPS: 4,000 × 3 = 12,000 QPS                          │
│                                                                 │
│  Storage Calculations:                                          │
│  ─────────────────────────────────────────────                  │
│  Monthly: 100M × 500B = 50 GB                                   │
│  Yearly: 50 GB × 12 = 600 GB                                    │
│  5 years: 600 GB × 5 = 3 TB                                     │
│  With replication (3x): 9 TB                                    │
│                                                                 │
│  URL Length Calculation:                                        │
│  ─────────────────────────────────────────────                  │
│  URLs in 5 years: 100M × 12 × 5 = 6 billion                     │
│  Base62 characters: [a-zA-Z0-9] = 62 characters                 │
│  62^6 = 56.8 billion (enough!)                                  │
│  62^7 = 3.5 trillion (plenty of room)                           │
│  Recommend: 7 characters for safety margin                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Example 3: Video Streaming (YouTube-like)

```
┌─────────────────────────────────────────────────────────────────┐
│           VIDEO STREAMING CAPACITY ESTIMATION                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Given:                                                         │
│  • 1B daily active users                                        │
│  • Average user watches 5 videos/day (5 min each)               │
│  • 1M videos uploaded per day                                   │
│  • Average video length: 10 minutes                             │
│  • Raw video: 1 GB per minute                                   │
│  • Compressed video: 100 MB per minute (HD)                     │
│  • Store 3 quality levels (SD, HD, 4K)                          │
│                                                                 │
│  Video View QPS:                                                │
│  ─────────────────────────────────────────────                  │
│  Views per day: 1B × 5 = 5B                                     │
│  View QPS: 5B ÷ 86,400 ≈ 58,000 QPS                             │
│                                                                 │
│  Upload Processing:                                             │
│  ─────────────────────────────────────────────                  │
│  Uploads per second: 1M ÷ 86,400 ≈ 12 uploads/second            │
│  Raw data uploaded: 12 × 10 min × 1GB = 120 GB/s                │
│  (Need significant transcoding infrastructure)                  │
│                                                                 │
│  Storage:                                                       │
│  ─────────────────────────────────────────────                  │
│  Per video (10 min, 3 quality levels):                          │
│  • SD: 10 min × 10 MB/min = 100 MB                              │
│  • HD: 10 min × 100 MB/min = 1 GB                               │
│  • 4K: 10 min × 500 MB/min = 5 GB                               │
│  • Total per video: ~6 GB                                       │
│                                                                 │
│  Daily: 1M × 6 GB = 6 PB                                        │
│  Yearly: 6 PB × 365 = 2.2 EB (Exabytes!)                        │
│                                                                 │
│  Bandwidth (streaming):                                         │
│  ─────────────────────────────────────────────                  │
│  Concurrent viewers at peak: 100M                               │
│  Average bitrate: 5 Mbps (HD)                                   │
│  Peak bandwidth: 100M × 5 Mbps = 500 Pbps                       │
│  (This is why CDNs are essential!)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Estimation Tips

### The 2-5-10 Rule for Web Services

| Metric | Rough Estimate |
|--------|----------------|
| Simple DB query | 2-5 ms |
| API call (internal) | 5-10 ms |
| External API call | 50-100 ms |
| Disk I/O | 10-20 ms |

### The Rule of 72

For exponential growth estimation:
```
Years to double = 72 ÷ Growth rate (%)

Example: 15% yearly growth
Years to double: 72 ÷ 15 = 4.8 years
```

### Powers of 2 for Quick Math

| Power | Value | Common Use |
|-------|-------|------------|
| 2^10 | ~1K (1,024) | Kilobyte |
| 2^20 | ~1M (1,048,576) | Megabyte |
| 2^30 | ~1B (1,073,741,824) | Gigabyte |
| 2^40 | ~1T | Terabyte |
| 2^32 | ~4B | IPv4 addresses |
| 2^64 | ~18 quintillion | Max bigint |

### Sanity Checks

```
┌─────────────────────────────────────────────────────────────────┐
│                    SANITY CHECK REFERENCE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  If your estimate is...        Something might be wrong         │
│  ───────────────────────────────────────────────────            │
│  > 1M QPS on single server     Servers can't handle this        │
│  < 100 QPS total               Why do we need a distributed     │
│                                system?                          │
│  > 1 PB storage for text       Check your math                  │
│  < 1 GB storage for images     Probably underestimating         │
│  > 100 Gbps per server         Exceeds network card limits      │
│  < 10 ms for cross-region      Physically impossible            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Estimation Template

Use this template during interviews:

```
┌─────────────────────────────────────────────────────────────────┐
│              CAPACITY ESTIMATION WORKSHEET                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRAFFIC                                                        │
│  ────────────────────────────                                   │
│  Total users:          _______                                  │
│  DAU:                  _______                                  │
│  Operations/user/day:  _______ reads, _______ writes            │
│                                                                 │
│  Read QPS:  DAU × reads ÷ 86,400 = _______                      │
│  Write QPS: DAU × writes ÷ 86,400 = _______                     │
│  Peak (3x): Read: _______ Write: _______                        │
│                                                                 │
│  STORAGE                                                        │
│  ────────────────────────────                                   │
│  Record size: _______                                           │
│  Daily new data: writes/day × size = _______                    │
│  Yearly: _______ × 365 = _______                                │
│  5-year: _______ × 5 = _______                                  │
│  With replication (3x): _______                                 │
│                                                                 │
│  BANDWIDTH                                                      │
│  ────────────────────────────                                   │
│  Incoming: Write QPS × request size = _______                   │
│  Outgoing: Read QPS × response size = _______                   │
│                                                                 │
│  INFRASTRUCTURE                                                 │
│  ────────────────────────────                                   │
│  Servers needed: Peak QPS ÷ QPS/server = _______                │
│  Cache size: Hot data (20%) = _______                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Common Estimation Mistakes

| Mistake | Impact | Correction |
|---------|--------|------------|
| Forgetting peak multiplier | Underestimating capacity | Use 2-3x for normal, 10x for events |
| Not accounting for replication | Storage underestimate | Multiply by replication factor (usually 3) |
| Ignoring metadata | Storage underestimate | Metadata can be 10-20% overhead |
| Assuming uniform traffic | Missing peak capacity | Model traffic patterns |
| Forgetting about growth | System becomes obsolete | Plan for 2-3 years growth |
| Over-precision | Wasting time | Round to nearest power of 10 |

---

## ✅ Key Takeaways

1. **Memorize key numbers** - Latencies, throughput, and conversions
2. **Round aggressively** - Use powers of 10 for quick math
3. **Work in orders of magnitude** - Exact numbers aren't needed
4. **Always estimate peak** - Systems fail at peak load
5. **Consider replication** - Storage and bandwidth multiply
6. **Sanity check results** - Do they make sense?
7. **Show your work** - Explain the math step by step

---

## 📚 Related Topics

- [Requirements Gathering](02-requirements-gathering.md) - Context for estimates
- [Scaling Strategies](10-scaling-strategies.md) - What to do with these numbers
- [Database Scaling](11-database-scaling.md) - Database capacity planning
