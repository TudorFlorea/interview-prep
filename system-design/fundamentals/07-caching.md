# Caching

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

Caching is one of the most powerful techniques for improving system performance. By storing frequently accessed data in fast storage (usually memory), we can dramatically reduce latency, decrease database load, and improve user experience. Understanding caching strategies is essential for any system design interview.

---

## 🎯 Why Caching Matters

### Performance Impact

```
┌─────────────────────────────────────────────────────────────────┐
│                    LATENCY COMPARISON                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Without Cache:                                                 │
│  Client → API → Database → API → Client                         │
│  Latency: 50-200ms                                              │
│                                                                 │
│  With Cache (hit):                                              │
│  Client → API → Cache → API → Client                            │
│  Latency: 1-5ms                                                 │
│                                                                 │
│  Performance improvement: 10-100x faster!                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### When to Cache

| Scenario | Cache Value |
|----------|-------------|
| Read-heavy workloads | High - reduces DB load |
| Expensive computations | High - avoid recalculating |
| Slow external APIs | High - reduce latency |
| Frequently accessed data | High - hot data in memory |
| Write-heavy workloads | Low - cache invalidation complex |
| Highly personalized data | Low - poor cache hit rate |
| Rapidly changing data | Low - stale data issues |

---

## 📚 Caching Strategies

### Cache-Aside (Lazy Loading)

The most common pattern. Application manages cache explicitly.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CACHE-ASIDE PATTERN                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Read Path:                                                     │
│  ───────────────────────────────────────                        │
│                                                                 │
│    ┌────────┐  1. Check   ┌───────┐                            │
│    │  App   │────────────►│ Cache │                            │
│    └────────┘             └───────┘                            │
│        │                      │                                 │
│        │ 2. Cache miss?       │ 2a. Cache hit?                  │
│        ▼                      │     Return data                 │
│    ┌────────┐                 │                                 │
│    │   DB   │◄────────────────┘                                │
│    └────────┘                                                   │
│        │                                                        │
│        │ 3. Fetch from DB                                       │
│        ▼                                                        │
│    ┌────────┐  4. Store   ┌───────┐                            │
│    │  App   │────────────►│ Cache │                            │
│    └────────┘             └───────┘                            │
│        │                                                        │
│        ▼ 5. Return to client                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```csharp
public async Task<User> GetUserAsync(string userId)
{
    // 1. Try cache first
    var cached = await _cache.GetAsync<User>($"user:{userId}");
    if (cached != null)
    {
        return cached; // Cache hit
    }
    
    // 2. Cache miss - fetch from database
    var user = await _database.GetUserAsync(userId);
    
    // 3. Store in cache for next time
    await _cache.SetAsync($"user:{userId}", user, TimeSpan.FromMinutes(30));
    
    return user;
}
```

**Pros:**
- Simple to implement
- Only requested data is cached
- Cache failures don't break the system

**Cons:**
- Cache miss = slower response (extra round trip)
- Data can become stale
- Potential thundering herd problem

### Read-Through Cache

Cache sits between application and database. Cache manages DB reads.

```
┌─────────────────────────────────────────────────────────────────┐
│                    READ-THROUGH PATTERN                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌────────┐  1. Request  ┌───────┐  2. If miss  ┌──────┐    │
│    │  App   │─────────────►│ Cache │─────────────►│  DB  │    │
│    └────────┘              └───────┘              └──────┘    │
│        ▲                       │                      │        │
│        │                       │◄─────────────────────┘        │
│        │                       │  3. Cache stores              │
│        └───────────────────────┘     and returns               │
│              4. Return data                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Simpler application code
- Consistent cache population

**Cons:**
- Cache library must support this pattern
- First request still slow (cache miss)

### Write-Through Cache

Data is written to cache and database synchronously.

```
┌─────────────────────────────────────────────────────────────────┐
│                    WRITE-THROUGH PATTERN                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌────────┐  1. Write   ┌───────┐  2. Write   ┌──────┐      │
│    │  App   │────────────►│ Cache │────────────►│  DB  │      │
│    └────────┘             └───────┘             └──────┘      │
│        ▲                      │                     │          │
│        │                      │◄────────────────────┘          │
│        │                      │  3. Confirm both               │
│        └──────────────────────┘     successful                 │
│              4. Return success                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Cache always consistent with DB
- Reads always hit cache

**Cons:**
- Higher write latency (two writes)
- Caches data that may never be read

### Write-Behind (Write-Back) Cache

Writes go to cache immediately, then asynchronously to database.

```
┌─────────────────────────────────────────────────────────────────┐
│                    WRITE-BEHIND PATTERN                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌────────┐  1. Write   ┌───────┐                            │
│    │  App   │────────────►│ Cache │                            │
│    └────────┘             └───────┘                            │
│        ▲                      │                                 │
│        │ 2. Immediate         │ 3. Async write (batched)       │
│        │    success           ▼                                 │
│        │                  ┌──────┐                             │
│        │                  │  DB  │                             │
│        │                  └──────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:**
- Very fast writes
- Can batch DB writes
- Smooths out write spikes

**Cons:**
- Risk of data loss if cache fails
- Complex to implement correctly
- Eventual consistency

---

## 🔄 Cache Invalidation

### The Hardest Problem

> "There are only two hard things in Computer Science: cache invalidation and naming things."
> — Phil Karlton

### Invalidation Strategies

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVALIDATION STRATEGIES                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Time-To-Live (TTL)                                          │
│  ─────────────────────────────────────────                      │
│  Cache entries expire after fixed duration                      │
│  SET user:123 "{...}" EX 3600  # Expires in 1 hour              │
│                                                                 │
│  ✅ Simple, automatic                                           │
│  ❌ May serve stale data until TTL                              │
│                                                                 │
│  2. Active Invalidation                                         │
│  ─────────────────────────────────────────                      │
│  Explicitly delete cache on updates                             │
│  DEL user:123  # When user is updated                           │
│                                                                 │
│  ✅ Immediate consistency                                       │
│  ❌ Must track all cache keys to invalidate                     │
│                                                                 │
│  3. Event-Driven Invalidation                                   │
│  ─────────────────────────────────────────                      │
│  Publish events that trigger cache updates                      │
│  DB → Event Bus → Cache invalidation service                    │
│                                                                 │
│  ✅ Decoupled, scalable                                         │
│  ❌ More complex infrastructure                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### TTL Guidelines

| Data Type | TTL Recommendation |
|-----------|-------------------|
| User sessions | 24-48 hours |
| User profiles | 15-60 minutes |
| Product catalog | 5-15 minutes |
| Search results | 1-5 minutes |
| Real-time data | Seconds or no cache |
| Static content | Hours to days |

---

## 🗂️ Cache Types

### Application Cache (In-Process)

```
┌─────────────────────────────────────────────────────────────────┐
│                    IN-PROCESS CACHE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────┐                      │
│  │            Application Server         │                      │
│  │  ┌────────────────────────────────┐  │                      │
│  │  │     Local Cache (In Memory)    │  │                      │
│  │  │  • ConcurrentDictionary        │  │                      │
│  │  │  • IMemoryCache (.NET)         │  │                      │
│  │  │  • Caffeine (Java)             │  │                      │
│  │  └────────────────────────────────┘  │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
│  ✅ Extremely fast (no network)                                 │
│  ✅ No external dependencies                                    │
│  ❌ Not shared across servers                                   │
│  ❌ Lost on restart                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Distributed Cache

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED CACHE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                        │
│  │ Server1 │  │ Server2 │  │ Server3 │                        │
│  └────┬────┘  └────┬────┘  └────┬────┘                        │
│       │            │            │                               │
│       └────────────┼────────────┘                               │
│                    │                                            │
│                    ▼                                            │
│  ┌──────────────────────────────────────┐                      │
│  │         Redis Cluster                 │                      │
│  │  ┌────────┐ ┌────────┐ ┌────────┐   │                      │
│  │  │ Node 1 │ │ Node 2 │ │ Node 3 │   │                      │
│  │  └────────┘ └────────┘ └────────┘   │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
│  ✅ Shared across all servers                                   │
│  ✅ Survives server restarts                                    │
│  ❌ Network latency (~1ms)                                      │
│  ❌ Additional infrastructure                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CDN (Content Delivery Network)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CDN CACHING                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User in Tokyo                    User in NYC                   │
│       │                                │                        │
│       ▼                                ▼                        │
│  ┌─────────┐                     ┌─────────┐                   │
│  │ Tokyo   │                     │ NYC     │                   │
│  │ Edge    │                     │ Edge    │                   │
│  └────┬────┘                     └────┬────┘                   │
│       │ Cache miss?                   │ Cache miss?            │
│       │                               │                        │
│       └───────────────┬───────────────┘                        │
│                       ▼                                         │
│                ┌─────────────┐                                 │
│                │   Origin    │                                 │
│                │   Server    │                                 │
│                └─────────────┘                                 │
│                                                                 │
│  ✅ Global edge locations                                       │
│  ✅ Reduces origin load                                         │
│  ✅ Improves latency worldwide                                  │
│  Best for: Static assets, public content                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Redis Deep Dive

### Common Caching Patterns with Redis

```python
# Pattern 1: Simple key-value cache
SET user:123 '{"name":"Alice","email":"alice@example.com"}' EX 3600
GET user:123

# Pattern 2: Hash for structured data
HSET user:123 name "Alice" email "alice@example.com" age 30
HGET user:123 name
HGETALL user:123

# Pattern 3: Sorted set for leaderboards
ZADD leaderboard 100 "player1" 95 "player2" 90 "player3"
ZREVRANGE leaderboard 0 9 WITHSCORES  # Top 10

# Pattern 4: List for recent items
LPUSH user:123:recent_views "product:456"
LTRIM user:123:recent_views 0 9  # Keep only 10 items
LRANGE user:123:recent_views 0 -1

# Pattern 5: Set for unique collections
SADD user:123:followers "user:456" "user:789"
SISMEMBER user:123:followers "user:456"  # Check if following
SCARD user:123:followers  # Count followers
```

### Redis Cluster

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDIS CLUSTER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Hash slots: 0-16383 divided among masters                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Master 1        Master 2        Master 3               │   │
│  │  Slots 0-5460    Slots 5461-10922  Slots 10923-16383   │   │
│  │       │               │                │                 │   │
│  │       ▼               ▼                ▼                 │   │
│  │  Replica 1a       Replica 2a       Replica 3a           │   │
│  │  Replica 1b       Replica 2b       Replica 3b           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Key "user:123" → CRC16("user:123") % 16384 = slot 5649        │
│  → Routes to Master 2                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Eviction Policies

When cache is full, what gets removed?

| Policy | Description | Use Case |
|--------|-------------|----------|
| **LRU** | Least Recently Used | General purpose, good default |
| **LFU** | Least Frequently Used | When popularity matters |
| **FIFO** | First In, First Out | Simple, predictable |
| **TTL-based** | Expired entries first | Time-sensitive data |
| **Random** | Random eviction | Simple, fast |
| **No eviction** | Return errors when full | When data loss unacceptable |

### Redis Eviction Policies

```
# In redis.conf or via CONFIG SET

# Remove any key using LRU approximation
maxmemory-policy allkeys-lru

# Only remove keys with TTL set
maxmemory-policy volatile-lru

# Remove any key using LFU
maxmemory-policy allkeys-lfu

# Never evict, return errors on write
maxmemory-policy noeviction
```

---

## 🌩️ Cache Problems & Solutions

### Thundering Herd Problem

When a popular cache key expires, many requests simultaneously hit the database.

```
┌─────────────────────────────────────────────────────────────────┐
│                    THUNDERING HERD                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Popular cache key expires at 10:00:00                          │
│                                                                 │
│  10:00:01  Request 1 → Cache miss → Hits DB                    │
│  10:00:01  Request 2 → Cache miss → Hits DB                    │
│  10:00:01  Request 3 → Cache miss → Hits DB                    │
│  10:00:01  ...100 more requests → All hit DB                   │
│                                                                 │
│  Result: DB overwhelmed!                                        │
│                                                                 │
│  Solutions:                                                     │
│  ─────────────────────────────────────────                      │
│  1. Lock-based: Only one request fetches, others wait           │
│  2. Probabilistic early refresh: Refresh before expiry          │
│  3. Stale-while-revalidate: Serve stale, refresh async          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```csharp
// Solution: Lock to prevent thundering herd
public async Task<User> GetUserWithLockAsync(string userId)
{
    var key = $"user:{userId}";
    var lockKey = $"lock:{key}";
    
    // Try cache first
    var cached = await _cache.GetAsync<User>(key);
    if (cached != null) return cached;
    
    // Try to acquire lock
    var acquired = await _cache.SetAsync(lockKey, "1", 
        TimeSpan.FromSeconds(10), When.NotExists);
    
    if (acquired)
    {
        try
        {
            // Double-check cache
            cached = await _cache.GetAsync<User>(key);
            if (cached != null) return cached;
            
            // Fetch and cache
            var user = await _database.GetUserAsync(userId);
            await _cache.SetAsync(key, user, TimeSpan.FromMinutes(30));
            return user;
        }
        finally
        {
            await _cache.DeleteAsync(lockKey);
        }
    }
    else
    {
        // Wait and retry
        await Task.Delay(50);
        return await GetUserWithLockAsync(userId);
    }
}
```

### Cache Penetration

Requests for non-existent data always miss cache and hit database.

```
Solution: Cache negative results
─────────────────────────────────────────────

// If user doesn't exist, cache a null marker
var user = await _database.GetUserAsync(userId);
if (user == null)
{
    // Cache "not found" with short TTL
    await _cache.SetAsync($"user:{userId}", NULL_MARKER, 
        TimeSpan.FromMinutes(5));
    return null;
}
await _cache.SetAsync($"user:{userId}", user, TimeSpan.FromMinutes(30));
return user;
```

### Cache Stampede (Hot Key)

Single extremely popular key gets too many requests.

```
Solutions:
─────────────────────────────────────────────
1. Replicate hot keys across multiple cache nodes
2. Use local in-memory cache for hot keys
3. Rate limit at application level
```

---

## 📊 Cache Metrics

### Key Metrics to Monitor

| Metric | Target | Concern If |
|--------|--------|------------|
| Hit Rate | >90% | <80% - review cache strategy |
| Latency (P99) | <5ms | >10ms - check network/size |
| Memory Usage | <80% | >90% - add capacity/eviction |
| Evictions | Low, stable | Spiking - add memory |
| Connections | Stable | Growing - connection leak |

### Calculating Hit Rate

```
Hit Rate = Cache Hits / (Cache Hits + Cache Misses)

Example:
- Cache hits: 9,500
- Cache misses: 500
- Hit rate: 9,500 / 10,000 = 95%

If hit rate is low:
1. TTL too short?
2. Wrong data being cached?
3. Cache too small (evictions)?
4. High cardinality keys?
```

---

## ✅ Key Takeaways

1. **Cache-aside is the most common pattern** - Start here
2. **Choose TTL carefully** - Balance freshness vs. hit rate
3. **Invalidation is hard** - Plan your strategy upfront
4. **Use Redis for distributed caching** - Battle-tested, feature-rich
5. **Monitor hit rates** - Should be >90% for effective caching
6. **Handle edge cases** - Thundering herd, penetration, stampede
7. **Layer your caches** - CDN → Distributed → Local

---

## 📚 Related Topics

- [Databases](/system-design/fundamentals/06-databases.md) - What you're caching
- [Load Balancing](/system-design/fundamentals/08-load-balancing.md) - Sticky sessions and caching
- [Consistent Hashing](/system-design/fundamentals/12-consistent-hashing.md) - Distributing cache keys
- [Blob Storage & CDN](/system-design/fundamentals/17-blob-storage-and-cdn.md) - CDN caching for static content
