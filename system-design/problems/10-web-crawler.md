# Design Web Crawler

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a distributed web crawler that can crawl billions of web pages, extract content, and build a searchable index while respecting politeness policies.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Crawl web pages** - Fetch HTML content from URLs
2. **Extract links** - Discover new URLs to crawl
3. **Respect robots.txt** - Honor crawl restrictions
4. **Avoid duplicates** - Don't re-crawl same content
5. **Handle dynamic content** - JavaScript rendering (optional)
6. **Store content** - Save pages for indexing
7. **Prioritize URLs** - Crawl important pages first
8. **Incremental updates** - Re-crawl changed pages

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | Continue on individual failures |
| **CAP** | AP - Eventual consistency |
| **Compliance** | Respect robots.txt, rate limits |
| **Scalability** | 10B pages, 1B pages/day |
| **Latency** | N/A (batch processing) |
| **Environment** | Global |
| **Durability** | Store crawled content |
| **Security** | Handle malicious sites |

---

## 2. Back of Envelope Calculations

```
Crawl Target:
- 10 billion pages total
- 1 billion pages/day
- 1B / 86400 ≈ 11,500 pages/second

Page Sizes:
- Average page: 500 KB
- 1B pages × 500 KB = 500 TB/day

Bandwidth:
- 500 TB / 86400 sec = 5.8 GB/sec = 46 Gbps

Storage (keep 1 copy):
- 10B pages × 500 KB = 5 PB
- With compression (~5:1): 1 PB

URLs to Track:
- 10B URLs × 100 bytes = 1 TB
```

---

## 3. Core Entities

```sql
-- URL Frontier (to be crawled)
CREATE TABLE url_frontier (
    url_hash BIGINT PRIMARY KEY,  -- Hash for dedup
    url TEXT NOT NULL,
    domain VARCHAR(255),
    priority INT,
    scheduled_at TIMESTAMP,
    last_crawled_at TIMESTAMP,
    crawl_count INT DEFAULT 0,
    
    INDEX idx_priority (priority DESC, scheduled_at)
);

-- Crawled Pages
CREATE TABLE crawled_pages (
    url_hash BIGINT PRIMARY KEY,
    url TEXT,
    content_hash BIGINT,  -- For dedup
    status_code INT,
    content_type VARCHAR(100),
    storage_path VARCHAR(500),
    crawled_at TIMESTAMP,
    
    INDEX idx_content_hash (content_hash)
);

-- Domain State
CREATE TABLE domains (
    domain VARCHAR(255) PRIMARY KEY,
    robots_txt TEXT,
    robots_fetched_at TIMESTAMP,
    crawl_delay_ms INT DEFAULT 1000,
    last_crawled_at TIMESTAMP,
    page_count INT DEFAULT 0
);
```

---

## 4. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         WEB CRAWLER ARCHITECTURE                           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         URL FRONTIER                                 │  │
│  │                                                                       │  │
│  │  ┌──────────────────────────────────────────────────────────────┐   │  │
│  │  │                    Priority Queues                            │   │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │   │  │
│  │  │  │Priority │  │Priority │  │Priority │  │Priority │         │   │  │
│  │  │  │ High    │  │ Medium  │  │  Low    │  │Re-crawl │         │   │  │
│  │  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │   │  │
│  │  │       └────────────┴───────────┴─────────────┘               │   │  │
│  │  └─────────────────────────────────┬────────────────────────────┘   │  │
│  │                                    │                                 │  │
│  │  ┌─────────────────────────────────▼────────────────────────────┐   │  │
│  │  │                 Domain Rate Limiter                           │   │  │
│  │  │         (Ensures politeness per domain)                       │   │  │
│  │  └─────────────────────────────────┬────────────────────────────┘   │  │
│  └────────────────────────────────────┼─────────────────────────────────┘  │
│                                       │                                    │
│  ┌────────────────────────────────────▼────────────────────────────────┐  │
│  │                         CRAWLER WORKERS                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │ Worker 1 │  │ Worker 2 │  │ Worker 3 │  │ Worker N │   ...      │  │
│  │  │  Fetch   │  │  Fetch   │  │  Fetch   │  │  Fetch   │            │  │
│  │  │  Parse   │  │  Parse   │  │  Parse   │  │  Parse   │            │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │  │
│  │       └─────────────┴────────────┴──────────────┘                   │  │
│  └───────────────────────────────────┬──────────────────────────────────┘  │
│                                      │                                     │
│     ┌────────────────────────────────┼────────────────────────────────┐   │
│     │                                │                                │    │
│     ▼                                ▼                                ▼    │
│ ┌───────────┐                  ┌───────────┐                  ┌───────────┐│
│ │  Content  │                  │   Link    │                  │   Dedup   ││
│ │   Store   │                  │ Extractor │                  │  Service  ││
│ │   (S3)    │                  │           │                  │           ││
│ └───────────┘                  └─────┬─────┘                  └───────────┘│
│                                      │                                     │
│                                      ▼                                     │
│                               ┌───────────┐                               │
│                               │    URL    │                               │
│                               │  Filter   │◄──── robots.txt check         │
│                               │           │◄──── seen URL check           │
│                               └─────┬─────┘                               │
│                                     │                                      │
│                                     ▼                                      │
│                              Back to Frontier                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deep Dive: URL Frontier

```
┌─────────────────────────────────────────────────────────────────┐
│                   URL FRONTIER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  The frontier manages URLs to be crawled with:                 │
│  • Prioritization (which URLs to crawl first)                  │
│  • Politeness (don't overwhelm any single domain)              │
│                                                                 │
│  Architecture:                                                  │
│  ──────────────                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   Front Queues                          │    │
│  │              (Prioritization)                           │    │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │    │
│  │  │ High │  │Medium│  │ Low  │  │Recrawl│              │    │
│  │  │  F1  │  │  F2  │  │  F3  │  │  F4  │              │    │
│  │  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘              │    │
│  │     └─────────┴────┬────┴─────────┘                   │    │
│  │                    │                                   │    │
│  │                    ▼                                   │    │
│  │            ┌──────────────┐                           │    │
│  │            │   Selector   │  (Weighted random)        │    │
│  │            └──────┬───────┘                           │    │
│  │                   │                                   │    │
│  └───────────────────┼───────────────────────────────────┘    │
│                      │                                         │
│  ┌───────────────────▼───────────────────────────────────┐    │
│  │                  Back Queues                           │    │
│  │              (Per-domain politeness)                   │    │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │    │
│  │  │domain│  │domain│  │domain│  │domain│              │    │
│  │  │  A   │  │  B   │  │  C   │  │  D   │  ...        │    │
│  │  │next: │  │next: │  │next: │  │next: │              │    │
│  │  │12:00 │  │12:01 │  │12:00 │  │12:02 │              │    │
│  │  └──────┘  └──────┘  └──────┘  └──────┘              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Priority Signals:                                              │
│  ──────────────────                                             │
│  • PageRank score                                              │
│  • Domain authority                                            │
│  • Freshness (how recently crawled)                            │
│  • Link depth (home page > deep pages)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Frontier Implementation

```python
class URLFrontier:
    def __init__(self, redis: Redis):
        self.redis = redis
        
    def add_url(self, url: str, priority: int):
        """Add URL to frontier with priority"""
        url_hash = hash_url(url)
        domain = extract_domain(url)
        
        # Check if already seen
        if self.redis.sismember("seen_urls", url_hash):
            return False
            
        # Add to seen set
        self.redis.sadd("seen_urls", url_hash)
        
        # Add to priority queue (front queue)
        self.redis.zadd(f"frontier:priority:{priority}", 
                       {url: time.time()})
        
        # Add to domain queue (back queue)
        self.redis.rpush(f"frontier:domain:{domain}", url)
        
        return True
        
    def get_next_url(self) -> Optional[str]:
        """Get next URL respecting politeness"""
        
        # Get domains that are ready (past their delay)
        ready_domains = self.get_ready_domains()
        
        for domain in ready_domains:
            url = self.redis.lpop(f"frontier:domain:{domain}")
            if url:
                # Update last crawl time for domain
                self.redis.set(f"domain:last_crawl:{domain}", 
                              time.time())
                return url
                
        return None
        
    def get_ready_domains(self) -> List[str]:
        """Get domains whose delay has elapsed"""
        now = time.time()
        ready = []
        
        for domain in self.get_active_domains():
            last_crawl = self.redis.get(f"domain:last_crawl:{domain}")
            delay = self.get_crawl_delay(domain)
            
            if last_crawl is None or (now - float(last_crawl)) >= delay:
                ready.append(domain)
                
        return ready
```

---

## 6. Deep Dive: Politeness

```
┌─────────────────────────────────────────────────────────────────┐
│                   POLITENESS POLICY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  robots.txt Parsing:                                            │
│  ─────────────────────                                          │
│  # Example robots.txt                                           │
│  User-agent: *                                                  │
│  Disallow: /admin/                                              │
│  Disallow: /private/                                            │
│  Crawl-delay: 2                                                 │
│                                                                 │
│  User-agent: Googlebot                                          │
│  Allow: /                                                       │
│                                                                 │
│  Implementation:                                                │
│  ─────────────────                                              │
│  1. Fetch robots.txt before crawling new domain                │
│  2. Cache for 24 hours                                         │
│  3. Parse Disallow/Allow rules                                 │
│  4. Extract Crawl-delay                                        │
│  5. Check each URL against rules before fetching               │
│                                                                 │
│  Rate Limiting:                                                 │
│  ───────────────                                                │
│  • Default: 1 request per second per domain                    │
│  • Honor Crawl-delay if specified                              │
│  • Track last request time per domain                          │
│                                                                 │
│  Additional Politeness:                                         │
│  ───────────────────────                                        │
│  • Identify crawler in User-Agent                              │
│  • Provide contact info                                        │
│  • Don't follow infinite loops (calendar URLs, etc.)          │
│  • Limit depth per domain                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Deep Dive: Deduplication

```
┌─────────────────────────────────────────────────────────────────┐
│                   DEDUPLICATION                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Two Types of Duplicates:                                       │
│  ─────────────────────────                                      │
│  1. URL-level: Same URL seen before                            │
│  2. Content-level: Different URLs, same content                │
│                                                                 │
│  URL Deduplication:                                             │
│  ───────────────────                                            │
│  • Normalize URLs (lowercase, remove fragments, sort params)  │
│  • Store 64-bit hash in Bloom filter                          │
│  • 10B URLs × 8 bytes = 80 GB (fits in memory)                │
│                                                                 │
│  Content Deduplication:                                         │
│  ───────────────────────                                        │
│  • Compute content hash (MD5/SHA1 of body)                     │
│  • SimHash for near-duplicate detection                        │
│                                                                 │
│  SimHash Algorithm:                                             │
│  ───────────────────                                            │
│  1. Extract features (words, shingles)                         │
│  2. Hash each feature to 64-bit                                │
│  3. For each bit position:                                     │
│     - If bit is 1, add weight                                  │
│     - If bit is 0, subtract weight                             │
│  4. Final hash: positive → 1, negative → 0                    │
│                                                                 │
│  Near-duplicates have similar SimHash (Hamming distance < 3)  │
│                                                                 │
│  Bloom Filter:                                                  │
│  ──────────────                                                 │
│  • Space-efficient probabilistic data structure                │
│  • 1% false positive rate with 10 bits per element            │
│  • No false negatives                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Crawler Worker

```python
class CrawlerWorker:
    def __init__(self):
        self.frontier = URLFrontier()
        self.content_store = S3Client()
        self.robots_cache = RobotsCache()
        
    async def run(self):
        while True:
            url = self.frontier.get_next_url()
            if not url:
                await asyncio.sleep(0.1)
                continue
                
            await self.crawl(url)
            
    async def crawl(self, url: str):
        domain = extract_domain(url)
        
        # Check robots.txt
        robots = await self.robots_cache.get(domain)
        if not robots.can_fetch(url):
            return
            
        try:
            # Fetch page
            response = await self.fetch(url, timeout=30)
            
            if response.status_code != 200:
                self.handle_error(url, response.status_code)
                return
                
            # Check for duplicates
            content_hash = hash_content(response.body)
            if self.is_duplicate_content(content_hash):
                return
                
            # Store content
            storage_path = self.content_store.store(
                url, response.body, response.headers
            )
            
            # Extract and queue links
            if 'text/html' in response.headers.get('Content-Type', ''):
                links = self.extract_links(url, response.body)
                for link in links:
                    priority = self.calculate_priority(link)
                    self.frontier.add_url(link, priority)
                    
        except Exception as e:
            self.handle_error(url, str(e))
            
    async def fetch(self, url: str, timeout: int) -> Response:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                timeout=timeout,
                headers={
                    'User-Agent': 'MyCrawler/1.0 (+https://example.com/bot)',
                    'Accept': 'text/html'
                }
            ) as response:
                body = await response.read()
                return Response(
                    status_code=response.status,
                    headers=dict(response.headers),
                    body=body
                )
```

---

## 9. Handling Scale

```
┌─────────────────────────────────────────────────────────────────┐
│                   SCALING STRATEGIES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Distributed Crawling:                                          │
│  ──────────────────────                                         │
│  • Partition URLs by domain hash                               │
│  • Each worker handles subset of domains                       │
│  • Ensures politeness without coordination                     │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │           Domain Partitioning                       │        │
│  │                                                     │        │
│  │  Worker 1: domains where hash(domain) mod 10 = 0   │        │
│  │  Worker 2: domains where hash(domain) mod 10 = 1   │        │
│  │  ...                                                │        │
│  │  Worker 10: domains where hash(domain) mod 10 = 9  │        │
│  │                                                     │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                 │
│  Multi-Region Crawling:                                         │
│  ───────────────────────                                        │
│  • Deploy crawlers in multiple regions                         │
│  • Crawl local sites from local region                        │
│  • Reduces latency, respects data residency                   │
│                                                                 │
│  DNS Caching:                                                   │
│  ─────────────                                                  │
│  • Cache DNS lookups (TTL-based)                               │
│  • Reduces DNS overhead significantly                          │
│                                                                 │
│  Connection Pooling:                                            │
│  ────────────────────                                           │
│  • Keep-alive connections to frequently crawled domains        │
│  • Reduces TCP handshake overhead                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Frontier | Redis + RocksDB | Fast queues + persistence |
| Content Store | S3 / HDFS | Scalable blob storage |
| Seen URLs | Bloom Filter + Redis | Memory efficient dedup |
| Metadata | Cassandra | Write-heavy, partitioned |
| Crawlers | Python (asyncio) | High concurrency |
| Coordination | Kafka | URL distribution |

---

## 11. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. POLITENESS IS CRITICAL                                      │
│     Respect robots.txt and crawl delays                        │
│     Partition by domain for enforcement                        │
│                                                                 │
│  2. URL FRONTIER DESIGN                                         │
│     Front queues for priority                                  │
│     Back queues for per-domain rate limiting                  │
│                                                                 │
│  3. DEDUPLICATION                                               │
│     URL-level with Bloom filters                               │
│     Content-level with SimHash                                 │
│                                                                 │
│  4. HANDLE FAILURES GRACEFULLY                                  │
│     Retry with backoff                                         │
│     Don't get stuck on bad domains                            │
│                                                                 │
│  5. SCALE HORIZONTALLY                                          │
│     Partition by domain hash                                   │
│     Deploy multi-region                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. References

- [18-rate-limiting.md](/system-design/fundamentals/18-rate-limiting.md) - Rate limiting
- [10-scaling-strategies.md](/system-design/fundamentals/10-scaling-strategies.md) - Scaling
- [09-message-queues.md](/system-design/fundamentals/09-message-queues.md) - URL distribution

---

[← Back to Problems](/system-design/problems/00-index.md) | [Next: Ticketmaster →](/system-design/problems/11-ticketmaster.md)
