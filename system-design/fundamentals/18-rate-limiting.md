# Rate Limiting

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

Rate limiting controls how many requests a user or client can make within a time window. It's essential for protecting services from abuse, ensuring fair usage, and preventing cascading failures. This guide covers algorithms, distributed rate limiting, and implementation strategies.

---

## 🎯 Why Rate Limiting?

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHY RATE LIMIT?                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Without rate limiting:                                         │
│  ─────────────────────                                          │
│                                                                 │
│  ┌────────┐  10,000 req/s   ┌──────────┐                       │
│  │ Abuser │ ───────────────►│  Server  │ 💥 Crashed!           │
│  └────────┘                 └──────────┘                       │
│                                                                 │
│  With rate limiting:                                            │
│  ────────────────────                                           │
│                                                                 │
│  ┌────────┐  10,000 req/s   ┌─────────┐   100 req/s            │
│  │ Abuser │ ───────────────►│  Rate   │ ──────────► Server     │
│  └────────┘                 │ Limiter │                        │
│                             └─────────┘                        │
│                                 │                               │
│                             9,900 req/s                         │
│                             rejected (429)                      │
│                                                                 │
│  Use cases:                                                     │
│  ───────────                                                    │
│  • Prevent DDoS attacks                                         │
│  • Enforce API quotas (free vs paid tiers)                     │
│  • Protect expensive operations                                 │
│  • Fair resource sharing                                        │
│  • Cost control (upstream API calls)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Rate Limiting Algorithms

### 1. Fixed Window Counter

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIXED WINDOW COUNTER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Rule: 100 requests per minute                                  │
│                                                                 │
│  Time:  0:00          1:00          2:00                        │
│         │─────────────│─────────────│                           │
│         │   Window 1  │   Window 2  │                           │
│         │             │             │                           │
│  Count: [0→100]       [0→...]       [0→...]                     │
│         └ allowed ─┘  └ reset ─────────┘                        │
│                                                                 │
│  Implementation:                                                │
│  ──────────────                                                 │
│  key = "rate:user123:2023-11-01T14:05"  (minute bucket)        │
│  count = INCR key                                               │
│  EXPIRE key 60                                                  │
│  if count > 100: reject                                         │
│                                                                 │
│  ✅ Simple to implement                                         │
│  ✅ Memory efficient                                            │
│  ❌ Burst at window edges                                       │
│                                                                 │
│  Edge burst problem:                                            │
│  │  Window 1  │  Window 2  │                                    │
│  │       [100]│[100]       │  ← 200 req in 1 second!           │
│  │    0:59.99 │ 1:00.01    │                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Sliding Window Log

```
┌─────────────────────────────────────────────────────────────────┐
│                    SLIDING WINDOW LOG                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Store timestamp of each request                                │
│                                                                 │
│  Rule: 100 requests per minute                                  │
│  Current time: 14:05:30                                         │
│                                                                 │
│  Log: [14:04:35, 14:04:40, 14:05:01, 14:05:15, ...]            │
│         │         │         │         │                         │
│       Remove    Remove    Keep      Keep                        │
│       (>60s)    (>60s)    (<60s)    (<60s)                     │
│                                                                 │
│  Algorithm:                                                     │
│  ──────────                                                     │
│  1. Remove entries older than window                            │
│  2. Count remaining entries                                     │
│  3. If count >= limit, reject                                   │
│  4. Add current timestamp                                       │
│                                                                 │
│  ✅ Accurate (no burst at edges)                                │
│  ❌ Memory intensive (stores all timestamps)                    │
│  ❌ Slow for high-volume                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Sliding Window Counter

```
┌─────────────────────────────────────────────────────────────────┐
│                    SLIDING WINDOW COUNTER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Combines fixed window with sliding calculation                 │
│                                                                 │
│  Rule: 100 requests per minute                                  │
│  Current time: 14:05:30 (30 seconds into current window)        │
│                                                                 │
│  Previous window (14:04:00): 80 requests                        │
│  Current window (14:05:00): 40 requests                         │
│                                                                 │
│  Weighted count:                                                │
│  = prev_count × (1 - elapsed/window) + curr_count              │
│  = 80 × (1 - 30/60) + 40                                       │
│  = 80 × 0.5 + 40                                               │
│  = 40 + 40 = 80                                                │
│                                                                 │
│  80 < 100, so request ALLOWED                                   │
│                                                                 │
│  ✅ Memory efficient (2 counters)                               │
│  ✅ Smooth rate limiting                                        │
│  ✅ Good approximation                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Token Bucket

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN BUCKET                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Imagine a bucket that fills with tokens at a steady rate       │
│                                                                 │
│  Parameters:                                                    │
│  • Bucket size (capacity): 10 tokens                            │
│  • Refill rate: 1 token per second                              │
│                                                                 │
│  ┌─────────────┐                                               │
│  │ ● ● ● ● ●   │  ← Bucket (5 tokens currently)                │
│  │ ● ● ●       │                                               │
│  └──────┬──────┘                                               │
│         │                                                       │
│      Refill: +1 token/sec                                       │
│                                                                 │
│  Request arrives:                                               │
│  • If tokens > 0: Take token, allow request                    │
│  • If tokens = 0: Reject (429)                                 │
│                                                                 │
│  ✅ Allows bursts up to bucket size                             │
│  ✅ Smooth average rate                                         │
│  ✅ Memory efficient                                            │
│                                                                 │
│  Example:                                                       │
│  Bucket = 10, Rate = 1/sec                                     │
│  Can handle burst of 10 requests instantly                     │
│  Then 1 request per second sustained                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Leaky Bucket

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEAKY BUCKET                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Like token bucket, but processes at fixed rate                 │
│  Requests queue up and "leak" out at constant rate              │
│                                                                 │
│       ┌─────────────────┐                                      │
│       │ ▼ ▼ ▼ Requests  │  ← Incoming (variable rate)          │
│       │ ┌─────────────┐ │                                      │
│       │ │ Queue       │ │                                      │
│       │ │ (bucket)    │ │                                      │
│       │ └─────┬───────┘ │                                      │
│       │       │         │                                      │
│       │       ▼ ▼ ▼     │  ← Outgoing (fixed rate)             │
│       └─────────────────┘                                      │
│                                                                 │
│  Parameters:                                                    │
│  • Bucket size: Max queue length                               │
│  • Leak rate: Requests per second processed                    │
│                                                                 │
│  ✅ Strictly constant output rate                               │
│  ✅ Smooths out bursts                                          │
│  ❌ Can add latency (queuing)                                   │
│                                                                 │
│  Good for: Traffic shaping, smoothing to downstream             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Algorithm Comparison

| Algorithm | Memory | Burst Handling | Accuracy | Complexity |
|-----------|--------|----------------|----------|------------|
| Fixed Window | O(1) | Allows 2x at edge | Low | Simple |
| Sliding Log | O(n) | Perfect | High | Complex |
| Sliding Counter | O(1) | Good | Medium | Medium |
| Token Bucket | O(1) | Controlled burst | High | Medium |
| Leaky Bucket | O(n) | No burst | High | Medium |

---

## 🌐 Distributed Rate Limiting

### The Challenge

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED PROBLEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User sends 100 requests, load balanced across 4 servers        │
│                                                                 │
│  ┌────────┐                                                    │
│  │  User  │ ─┬──► Server 1: 25 req (under limit) ✓             │
│  │100 req │  ├──► Server 2: 25 req (under limit) ✓             │
│  └────────┘  ├──► Server 3: 25 req (under limit) ✓             │
│              └──► Server 4: 25 req (under limit) ✓             │
│                                                                 │
│  Each server thinks user is under limit!                        │
│  But total is 100 requests (should be limited)                  │
│                                                                 │
│  Solution: Centralized counter (Redis)                          │
│                                                                 │
│  ┌────────┐     ┌─────────────────────────────────┐            │
│  │  User  │────►│ Load Balancer                   │            │
│  └────────┘     └──┬──────┬──────┬──────┬────────┘            │
│                    │      │      │      │                       │
│                    ▼      ▼      ▼      ▼                       │
│                   S1     S2     S3     S4                       │
│                    │      │      │      │                       │
│                    └──────┴──────┴──────┘                       │
│                           │                                     │
│                           ▼                                     │
│                      ┌─────────┐                               │
│                      │  Redis  │  Shared counter               │
│                      └─────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Redis Implementation

```python
import redis
import time

class RateLimiter:
    def __init__(self, redis_client, limit, window_seconds):
        self.redis = redis_client
        self.limit = limit
        self.window = window_seconds
    
    def is_allowed(self, user_id):
        """Sliding window counter implementation"""
        now = time.time()
        window_start = now - self.window
        key = f"rate:{user_id}"
        
        # Use Redis pipeline for atomicity
        pipe = self.redis.pipeline()
        
        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count current entries
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(now): now})
        
        # Set expiry
        pipe.expire(key, self.window)
        
        results = pipe.execute()
        current_count = results[1]
        
        return current_count < self.limit


# Token bucket with Redis
class TokenBucketLimiter:
    def __init__(self, redis_client, capacity, refill_rate):
        self.redis = redis_client
        self.capacity = capacity  # Max tokens
        self.refill_rate = refill_rate  # Tokens per second
    
    def is_allowed(self, user_id, tokens=1):
        key = f"bucket:{user_id}"
        now = time.time()
        
        # Lua script for atomicity
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local requested = tonumber(ARGV[4])
        
        -- Get current state
        local data = redis.call('HMGET', key, 'tokens', 'timestamp')
        local tokens = tonumber(data[1]) or capacity
        local last_update = tonumber(data[2]) or now
        
        -- Calculate tokens to add
        local elapsed = now - last_update
        local new_tokens = math.min(capacity, tokens + elapsed * refill_rate)
        
        -- Check if request can be fulfilled
        if new_tokens >= requested then
            new_tokens = new_tokens - requested
            redis.call('HMSET', key, 'tokens', new_tokens, 'timestamp', now)
            redis.call('EXPIRE', key, 3600)
            return 1
        else
            return 0
        end
        """
        
        result = self.redis.eval(
            lua_script, 1, key,
            self.capacity, self.refill_rate, now, tokens
        )
        return result == 1
```

### Rate Limiting at Different Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-LAYER RATE LIMITING                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Edge/CDN                                              │
│  ─────────────────────                                          │
│  • Block malicious IPs                                          │
│  • DDoS protection                                              │
│  • Geographic limits                                            │
│                                                                 │
│  Layer 2: API Gateway                                           │
│  ─────────────────────                                          │
│  • Rate limit by API key                                        │
│  • Quota enforcement (free/paid)                                │
│  • Per-endpoint limits                                          │
│                                                                 │
│  Layer 3: Application                                           │
│  ─────────────────────                                          │
│  • User-specific limits                                         │
│  • Resource-specific limits                                     │
│  • Complex business rules                                       │
│                                                                 │
│  Layer 4: Database                                              │
│  ─────────────────────                                          │
│  • Connection limits                                            │
│  • Query rate limits                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Rate Limit Headers

### Standard Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100           # Max requests per window
X-RateLimit-Remaining: 45        # Remaining requests in window
X-RateLimit-Reset: 1699000000    # Unix timestamp when window resets
Retry-After: 30                  # Seconds to wait (when limited)

# When rate limited:
HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/json

{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please retry after 30 seconds.",
  "retry_after": 30
}
```

### RateLimit Header (draft standard)

```http
RateLimit-Limit: 100
RateLimit-Remaining: 45
RateLimit-Reset: 30
RateLimit-Policy: 100;w=60;burst=10
```

---

## 🏗️ Rate Limiting Strategies

### Per-User Rate Limiting

```python
# Different limits for different user tiers
RATE_LIMITS = {
    'free': {'requests': 100, 'window': 3600},      # 100/hour
    'basic': {'requests': 1000, 'window': 3600},    # 1000/hour
    'pro': {'requests': 10000, 'window': 3600},     # 10000/hour
    'enterprise': {'requests': 100000, 'window': 3600}  # 100000/hour
}

def get_rate_limit(user):
    tier = user.subscription_tier
    return RATE_LIMITS.get(tier, RATE_LIMITS['free'])
```

### Per-Endpoint Rate Limiting

```python
# Different endpoints have different costs
ENDPOINT_LIMITS = {
    'GET /users': {'requests': 1000, 'window': 60},
    'POST /orders': {'requests': 10, 'window': 60},
    'POST /payments': {'requests': 5, 'window': 60},
    'GET /search': {'requests': 30, 'window': 60},
}
```

### Adaptive Rate Limiting

```python
# Reduce limits when system is under stress
class AdaptiveRateLimiter:
    def __init__(self, base_limit):
        self.base_limit = base_limit
        self.current_multiplier = 1.0
    
    def update_multiplier(self, cpu_usage, error_rate):
        if cpu_usage > 80 or error_rate > 0.05:
            self.current_multiplier = max(0.5, self.current_multiplier - 0.1)
        elif cpu_usage < 50 and error_rate < 0.01:
            self.current_multiplier = min(1.0, self.current_multiplier + 0.1)
    
    def get_limit(self):
        return int(self.base_limit * self.current_multiplier)
```

---

## ⚡ Handling Rate Limits (Client Side)

```javascript
class APIClient {
    async request(url, options = {}) {
        const response = await fetch(url, options);
        
        if (response.status === 429) {
            const retryAfter = parseInt(
                response.headers.get('Retry-After') || '60'
            );
            
            console.log(`Rate limited. Retrying in ${retryAfter}s`);
            
            await this.sleep(retryAfter * 1000);
            return this.request(url, options);  // Retry
        }
        
        // Track remaining quota
        const remaining = response.headers.get('X-RateLimit-Remaining');
        if (remaining && parseInt(remaining) < 10) {
            console.warn(`Low quota remaining: ${remaining}`);
        }
        
        return response;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

---

## ✅ Key Takeaways

1. **Choose the right algorithm** - Token bucket for burst tolerance, sliding window for accuracy
2. **Use Redis for distributed** - Centralized counter for multi-server
3. **Rate limit at multiple layers** - Edge, gateway, application
4. **Return proper headers** - Help clients handle limits gracefully
5. **Different limits for different tiers** - Monetization opportunity
6. **Expensive operations need lower limits** - Protect resources
7. **Consider adaptive limits** - Reduce during high load

---

## 📚 Related Topics

- [API Design](/system-design/fundamentals/04-api-design.md) - API quotas and throttling
- [Caching](/system-design/fundamentals/07-caching.md) - Redis for rate limit storage
- [Load Balancing](/system-design/fundamentals/08-load-balancing.md) - Traffic distribution
- [Distributed Patterns](/system-design/fundamentals/14-distributed-patterns.md) - Circuit breakers
