# Design a URL Shortener

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a URL shortening service like bit.ly or TinyURL that converts long URLs into short, shareable links.

**Difficulty**: 🟢 Foundational (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Shorten URL**: Given a long URL, generate a unique short URL
2. **Redirect**: When accessing short URL, redirect to original long URL
3. **Custom aliases** (optional): Allow users to choose custom short URLs
4. **Expiration** (optional): URLs can have TTL
5. **Analytics** (optional): Track click counts, referrers, locations

### Non-Functional Requirements (FCC-SLEDS)

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | Service should be highly available |
| **CAP** | CP - consistency preferred (same short URL → same long URL) |
| **Compliance** | May need to handle abuse/malicious URLs |
| **Scalability** | 100M URLs created per day, 1B redirects per day |
| **Latency** | Redirect < 100ms, creation < 500ms |
| **Environment** | Global users, need geo-distribution |
| **Durability** | URLs should be durable (no data loss) |
| **Security** | Prevent enumeration attacks, rate limit creation |

---

## 2. Back of Envelope Calculations

### Scale Estimation

```
Write Operations (URL Creation):
- 100M URLs/day
- 100M / 86400 ≈ 1200 URLs/second
- Peak: 3x average = ~3600 URLs/second

Read Operations (Redirects):
- 1B redirects/day (10:1 read/write ratio)
- 1B / 86400 ≈ 12000 redirects/second
- Peak: ~36000 redirects/second

Storage (5 year retention):
- URLs per year: 100M × 365 = 36.5B
- 5 years: ~180B URLs
- Average URL size: 100 bytes (long URL) + 20 bytes (metadata)
- Storage: 180B × 120 bytes = 21.6 TB
```

### Short URL Length

```
Characters: [a-zA-Z0-9] = 62 characters
Length 6: 62^6 = 56.8 billion combinations
Length 7: 62^7 = 3.5 trillion combinations

With 100M URLs/day for 5 years = 180B URLs
→ 7 characters provides 3.5T combinations (20x headroom)
→ 6 characters could work with efficient allocation
```

---

## 3. API Design

### REST Endpoints

```
POST /urls
Request:
{
  "longUrl": "https://example.com/very/long/path/to/resource?param=value",
  "customAlias": "my-link",  // optional
  "expiresAt": "2024-12-31"  // optional
}

Response: 201 Created
{
  "shortUrl": "https://short.ly/abc123",
  "shortCode": "abc123",
  "longUrl": "https://example.com/...",
  "expiresAt": "2024-12-31T00:00:00Z",
  "createdAt": "2023-11-01T12:00:00Z"
}

---

GET /{shortCode}
Response: 301/302 Redirect
Location: https://example.com/very/long/path/to/resource?param=value

---

GET /urls/{shortCode}/stats
Response:
{
  "shortCode": "abc123",
  "totalClicks": 15234,
  "clicksByDay": [...],
  "topReferrers": [...],
  "topCountries": [...]
}

---

DELETE /urls/{shortCode}
Response: 204 No Content
```

### 301 vs 302 Redirect

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDIRECT CODES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  301 Moved Permanently:                                         │
│  • Browser caches redirect                                      │
│  • Faster subsequent access                                     │
│  • Loses analytics (browser skips our server)                   │
│                                                                 │
│  302 Found (Temporary):                                         │
│  • Browser always hits our server                              │
│  • Better for analytics                                         │
│  • Slightly slower (extra hop)                                  │
│                                                                 │
│  Recommendation: 302 if analytics needed, 301 for pure redirect │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### URL Entity

```sql
CREATE TABLE urls (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    long_url TEXT NOT NULL,
    long_url_hash VARCHAR(64) NOT NULL,  -- For duplicate detection
    user_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    click_count BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_short_code (short_code),
    INDEX idx_url_hash (long_url_hash),
    INDEX idx_expires (expires_at)
);

-- Analytics (separate table for write optimization)
CREATE TABLE url_clicks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    short_code VARCHAR(10) NOT NULL,
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    country_code VARCHAR(2),
    
    INDEX idx_short_code_time (short_code, clicked_at)
);
```

---

## 5. High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         URL SHORTENER ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     ┌──────────┐                                                            │
│     │  Client  │                                                            │
│     └────┬─────┘                                                            │
│          │                                                                  │
│          ▼                                                                  │
│     ┌────────────┐         ┌─────────────────┐                             │
│     │    CDN     │────────►│  Static Assets  │                             │
│     └─────┬──────┘         └─────────────────┘                             │
│           │                                                                 │
│           ▼                                                                 │
│     ┌───────────────┐                                                       │
│     │ Load Balancer │                                                       │
│     └───────┬───────┘                                                       │
│             │                                                               │
│     ┌───────┴───────────────────────────┐                                  │
│     │                                   │                                   │
│     ▼                                   ▼                                   │
│  ┌──────────────┐                 ┌──────────────┐                         │
│  │ URL Service  │                 │ URL Service  │    (Stateless)          │
│  │   Server 1   │                 │   Server 2   │                         │
│  └──────┬───────┘                 └──────┬───────┘                         │
│         │                                │                                  │
│         └───────────┬────────────────────┘                                  │
│                     │                                                       │
│         ┌───────────┼────────────────────────────┐                         │
│         │           │                            │                          │
│         ▼           ▼                            ▼                          │
│  ┌─────────────┐ ┌─────────────┐          ┌────────────┐                   │
│  │    Redis    │ │   ID Gen    │          │  Analytics │                   │
│  │   (Cache)   │ │  Service    │          │   Queue    │                   │
│  └─────────────┘ └─────────────┘          └─────┬──────┘                   │
│         │              │                        │                           │
│         └───────┬──────┘                        ▼                           │
│                 ▼                         ┌────────────┐                    │
│     ┌──────────────────────┐              │ Analytics  │                   │
│     │    PostgreSQL DB     │              │  Workers   │                   │
│     │  (Primary + Replicas)│              └─────┬──────┘                   │
│     └──────────────────────┘                    │                           │
│                                                 ▼                           │
│                                          ┌────────────┐                    │
│                                          │ ClickHouse │                    │
│                                          │ (Analytics)│                    │
│                                          └────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Deep Dive: Short Code Generation

### Option 1: Base62 Encoding of Counter

```
┌─────────────────────────────────────────────────────────────────┐
│                    COUNTER + BASE62                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Counter: 1, 2, 3, ... → Base62 → a, b, c, ..., abc123          │
│                                                                 │
│  ID Generator (Distributed Counter):                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Server 1: counter = 1, 4, 7, 10, ...  (mod 3 = 1)       │  │
│  │  Server 2: counter = 2, 5, 8, 11, ...  (mod 3 = 2)       │  │
│  │  Server 3: counter = 3, 6, 9, 12, ...  (mod 3 = 0)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Or: Use Twitter Snowflake / ULID for distributed IDs           │
│                                                                 │
│  ✅ No collisions                                               │
│  ✅ Predictable length                                          │
│  ❌ Sequential (enumerable)                                     │
│  ❌ Need distributed counter coordination                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```python
CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def encode_base62(num: int) -> str:
    if num == 0:
        return CHARS[0]
    
    result = []
    while num:
        result.append(CHARS[num % 62])
        num //= 62
    
    return ''.join(reversed(result))

def decode_base62(s: str) -> int:
    result = 0
    for char in s:
        result = result * 62 + CHARS.index(char)
    return result

# Examples:
# 1 → "1"
# 62 → "10"
# 1000000 → "4C92"
# 1000000000 → "15ftgG"
```

### Option 2: Hash + Collision Resolution

```
┌─────────────────────────────────────────────────────────────────┐
│                    HASH APPROACH                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Long URL → MD5/SHA256 → First 7 chars                          │
│                                                                 │
│  "https://example.com/path" → "abc123f..."                      │
│                              → "abc123f"                        │
│                                                                 │
│  Collision Handling:                                            │
│  1. Hash URL + try insert                                       │
│  2. If collision, hash URL+1, URL+2, ...                       │
│  3. Or: append random chars until unique                        │
│                                                                 │
│  ✅ Same URL → same short code (deduplication)                  │
│  ✅ Not sequential/enumerable                                   │
│  ❌ Collision handling adds latency                             │
│  ❌ Can't guarantee short length                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Option 3: Pre-Generated Keys (KGS)

```
┌─────────────────────────────────────────────────────────────────┐
│                    KEY GENERATION SERVICE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pre-generate all possible keys, store in database              │
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │ KGS Service │────►│ Unused Keys │     │  Used Keys  │       │
│  └─────────────┘     │ Table       │     │  Table      │       │
│         │            └─────────────┘     └─────────────┘       │
│         │                   │                   ▲               │
│         │            Move to used ──────────────┘               │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                                │
│  │ URL Service │ Gets batch of keys                            │
│  │ (in-memory  │ Mark as "in-use"                              │
│  │  key cache) │                                                │
│  └─────────────┘                                                │
│                                                                 │
│  ✅ No collision checks needed                                  │
│  ✅ Constant time key retrieval                                 │
│  ❌ Need to pre-generate keys                                   │
│  ❌ Keys "leaked" if server crashes                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Approach

```python
# Hybrid: Base62 encoded Snowflake-style ID

class ShortCodeGenerator:
    def __init__(self, server_id: int):
        self.server_id = server_id  # 0-1023
        self.sequence = 0
        self.last_timestamp = 0
    
    def generate(self) -> str:
        timestamp = int(time.time() * 1000)  # milliseconds
        
        if timestamp == self.last_timestamp:
            self.sequence = (self.sequence + 1) & 0xFFF  # 12 bits
            if self.sequence == 0:
                # Wait for next millisecond
                while timestamp <= self.last_timestamp:
                    timestamp = int(time.time() * 1000)
        else:
            self.sequence = 0
        
        self.last_timestamp = timestamp
        
        # Snowflake-style: timestamp (41 bits) | server_id (10 bits) | sequence (12 bits)
        id_num = ((timestamp << 22) | (self.server_id << 12) | self.sequence)
        
        return encode_base62(id_num)
```

---

## 7. Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    CACHING LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Redirect Flow (Read-Heavy):                                    │
│  ────────────────────────────                                   │
│                                                                 │
│  1. GET /abc123                                                 │
│  2. Check Redis: GET url:abc123                                 │
│  3. If hit → redirect immediately                               │
│  4. If miss → query DB → cache result → redirect                │
│                                                                 │
│  Cache Strategy: Cache-Aside with LRU                           │
│                                                                 │
│  Redis Structure:                                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Key: url:{shortCode}                                   │    │
│  │ Value: {longUrl, expiresAt}                            │    │
│  │ TTL: 24 hours (or until URL expires)                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Hot URLs (80/20 rule):                                         │
│  • 20% of URLs get 80% of traffic                              │
│  • Cache size: 20% of 180B URLs × 200 bytes = 7.2 TB           │
│  • Practical: 100GB cache for top 0.01% (18M URLs)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```python
class UrlService:
    def __init__(self, cache: Redis, db: Database):
        self.cache = cache
        self.db = db
        self.CACHE_TTL = 86400  # 24 hours
    
    async def get_long_url(self, short_code: str) -> str | None:
        # Try cache first
        cached = await self.cache.get(f"url:{short_code}")
        if cached:
            return json.loads(cached)['long_url']
        
        # Query database
        url_record = await self.db.fetch_one(
            "SELECT long_url, expires_at FROM urls WHERE short_code = $1",
            short_code
        )
        
        if not url_record:
            return None
        
        # Check expiration
        if url_record['expires_at'] and url_record['expires_at'] < datetime.now():
            return None
        
        # Cache for future requests
        await self.cache.setex(
            f"url:{short_code}",
            self.CACHE_TTL,
            json.dumps({
                'long_url': url_record['long_url'],
                'expires_at': url_record['expires_at'].isoformat() if url_record['expires_at'] else None
            })
        )
        
        return url_record['long_url']
```

---

## 8. Analytics Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYTICS ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Don't slow down redirects - async analytics                    │
│                                                                 │
│  ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌───────────┐ │
│  │ Redirect │───►│  Kafka  │───►│ Consumer │───►│ClickHouse│ │
│  │ Service  │    │ (Queue) │    │ (Batch)  │    │(Analytics)│ │
│  └──────────┘    └─────────┘    └──────────┘    └───────────┘ │
│                                                                 │
│  Click Event:                                                   │
│  {                                                              │
│    "short_code": "abc123",                                      │
│    "timestamp": "2023-11-01T12:00:00Z",                        │
│    "ip": "1.2.3.4",                                            │
│    "user_agent": "Mozilla/5.0...",                             │
│    "referrer": "https://twitter.com/..."                       │
│  }                                                              │
│                                                                 │
│  Consumer batches writes to ClickHouse every 5 seconds          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Security Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY MEASURES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Malicious URL Detection:                                    │
│  • Check against Google Safe Browsing API                      │
│  • Maintain internal blocklist                                  │
│  • Rate limit by IP and user                                   │
│                                                                 │
│  2. Anti-Enumeration:                                           │
│  • Use non-sequential short codes                              │
│  • Rate limit redirect requests per IP                         │
│  • CAPTCHA after threshold                                     │
│                                                                 │
│  3. Abuse Prevention:                                           │
│  • Require authentication for creation                          │
│  • Limit URLs per user per day                                 │
│  • Report mechanism for abuse                                   │
│                                                                 │
│  4. Input Validation:                                           │
│  • Validate URL format                                          │
│  • Check URL is reachable (optional)                           │
│  • Limit URL length                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Scaling Strategy

### Read Scaling (Redirects)

```
┌─────────────────────────────────────────────────────────────────┐
│                    READ SCALING                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Multi-level Caching:                                        │
│     CDN (edge) → Redis Cluster → DB Read Replicas              │
│                                                                 │
│  2. Database Read Replicas:                                     │
│     Primary (writes) → Replica 1 (reads)                        │
│                     → Replica 2 (reads)                         │
│                     → Replica 3 (reads)                         │
│                                                                 │
│  3. Geographic Distribution:                                    │
│     US-East: Cache + Replica                                    │
│     EU-West: Cache + Replica                                    │
│     AP-South: Cache + Replica                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Write Scaling (URL Creation)

```
┌─────────────────────────────────────────────────────────────────┐
│                    WRITE SCALING                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Option 1: Sharding by short_code                               │
│  • Consistent hashing on short_code                             │
│  • Each shard handles range of short codes                     │
│                                                                 │
│  Option 2: Append-only with partitioning                        │
│  • Partition by creation date                                   │
│  • Old partitions become read-only                              │
│                                                                 │
│  ID Generation at Scale:                                        │
│  • Each server gets unique ID range                            │
│  • Or use Snowflake-style IDs (built-in uniqueness)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Final Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      COMPLETE URL SHORTENER ARCHITECTURE                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌─────────┐                                     │
│                              │  Users  │                                     │
│                              └────┬────┘                                     │
│                                   │                                          │
│                    ┌──────────────┴──────────────┐                          │
│                    │                             │                           │
│           short.ly/abc123                 POST /urls                        │
│                    │                             │                           │
│                    ▼                             ▼                           │
│              ┌─────────┐                  ┌─────────┐                        │
│              │   CDN   │                  │   CDN   │                        │
│              │ (Cache) │                  │         │                        │
│              └────┬────┘                  └────┬────┘                        │
│                   │                            │                             │
│                   └──────────┬─────────────────┘                             │
│                              ▼                                               │
│                    ┌─────────────────┐                                       │
│                    │  Load Balancer  │                                       │
│                    └────────┬────────┘                                       │
│                             │                                                │
│              ┌──────────────┴──────────────┐                                │
│              │                             │                                 │
│              ▼                             ▼                                 │
│       ┌────────────┐               ┌────────────┐                           │
│       │   API      │               │   API      │                           │
│       │  Server 1  │               │  Server 2  │                           │
│       └──────┬─────┘               └──────┬─────┘                           │
│              │                            │                                  │
│              └────────────┬───────────────┘                                  │
│                           │                                                  │
│    ┌──────────────────────┼──────────────────────────┐                      │
│    │                      │                          │                       │
│    ▼                      ▼                          ▼                       │
│ ┌────────┐         ┌────────────┐            ┌─────────────┐                │
│ │ Redis  │         │   Kafka    │            │ ID Generator│                │
│ │Cluster │         │ (Analytics)│            │  (Snowflake)│                │
│ └───┬────┘         └─────┬──────┘            └─────────────┘                │
│     │                    │                                                   │
│     │                    ▼                                                   │
│     │             ┌─────────────┐                                           │
│     │             │ Consumers   │                                           │
│     │             └──────┬──────┘                                           │
│     │                    │                                                   │
│     ▼                    ▼                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐     │
│ │                         DATA LAYER                                   │     │
│ │  ┌─────────────┐                          ┌────────────────────┐   │     │
│ │  │ PostgreSQL  │                          │    ClickHouse      │   │     │
│ │  │ ┌─────────┐ │                          │   (Analytics)      │   │     │
│ │  │ │ Primary │ │                          │                    │   │     │
│ │  │ └────┬────┘ │                          └────────────────────┘   │     │
│ │  │      │      │                                                    │     │
│ │  │ ┌────┴────┐ │                                                    │     │
│ │  │ │Replicas │ │                                                    │     │
│ │  │ └─────────┘ │                                                    │     │
│ │  └─────────────┘                                                    │     │
│ └─────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Interview Tips

### Common Follow-up Questions

1. **How do you handle duplicate long URLs?**
   - Hash the URL, store hash, check before creating new short code
   - Return existing short code if duplicate found

2. **How do you handle expired URLs?**
   - Lazy deletion: check expiration on access
   - Background job for cleanup
   - Reclaim expired short codes

3. **How do you prevent hot keys in cache?**
   - Replicate hot keys across multiple Redis nodes
   - Use local in-memory cache for extremely hot keys

4. **How would you implement custom aliases?**
   - Check availability before creation
   - Reserve common/branded words
   - Handle case sensitivity

5. **What if the ID generator fails?**
   - Fall back to UUID-based generation
   - Multiple ID generators with health checks
   - Pre-allocated ID ranges

---

## ✅ Key Takeaways

1. **Read-heavy workload** - Cache aggressively (80/20 rule)
2. **Short code generation** - Base62 encoding is efficient, Snowflake for distribution
3. **Analytics async** - Don't block redirects for analytics
4. **7 characters suffice** - 3.5 trillion combinations
5. **302 for analytics** - 301 gets cached by browsers
6. **Security matters** - Malicious URL detection, rate limiting

---

## 📚 Related Topics

- [Caching](/system-design/fundamentals/07-caching.md) - Cache strategies
- [Database Scaling](/system-design/fundamentals/11-database-scaling.md) - Replication and sharding
- [Consistent Hashing](/system-design/fundamentals/12-consistent-hashing.md) - Distributed ID generation
- [Rate Limiter](/system-design/problems/02-rate-limiter.md) - Abuse prevention
