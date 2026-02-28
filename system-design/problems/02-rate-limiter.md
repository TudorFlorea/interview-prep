# Design a Rate Limiter

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a rate limiting service that can restrict the number of requests a client can make within a time window.

**Difficulty**: 🟢 Foundational (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Limit requests** by various keys (user ID, IP, API key)
2. **Configurable limits** per endpoint or globally
3. **Return rate limit headers** (remaining, reset time)
4. **Support different limiting strategies** (fixed window, sliding window, token bucket)
5. **Graceful handling** when limit exceeded (429 response)

### Non-Functional Requirements (FCC-SLEDS)

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | Fail open (allow) or fail closed (deny) on errors |
| **CAP** | AP preferred - eventual consistency acceptable |
| **Compliance** | Fair usage policies, SLA requirements |
| **Scalability** | Handle millions of requests per second |
| **Latency** | &lt; 1ms overhead per request |
| **Environment** | Distributed across multiple data centers |
| **Durability** | Counters can be reset on failure (not critical) |
| **Security** | Prevent bypass attacks |

---

## 2. Rate Limiting Algorithms

### Algorithm 1: Fixed Window Counter

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIXED WINDOW COUNTER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Limit: 100 requests per minute                                 │
│                                                                 │
│  Window 1 (12:00-12:01)    Window 2 (12:01-12:02)              │
│  ┌────────────────────┐    ┌────────────────────┐              │
│  │ ████████████░░░░░░ │    │ ██████░░░░░░░░░░░░ │              │
│  │     80/100         │    │     45/100         │              │
│  └────────────────────┘    └────────────────────┘              │
│                                                                 │
│  ✅ Simple to implement                                         │
│  ✅ Memory efficient                                            │
│  ❌ Burst at window edges                                       │
│     (100 at 12:00:59 + 100 at 12:01:01 = 200 in 2 seconds)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```python
class FixedWindowCounter:
    def __init__(self, redis: Redis, limit: int, window_seconds: int):
        self.redis = redis
        self.limit = limit
        self.window = window_seconds
    
    def is_allowed(self, key: str) -> bool:
        # Get current window
        window_key = f"ratelimit:{key}:{int(time.time() // self.window)}"
        
        # Increment and check
        current = self.redis.incr(window_key)
        
        # Set expiry on first request
        if current == 1:
            self.redis.expire(window_key, self.window)
        
        return current <= self.limit
    
    def get_remaining(self, key: str) -> int:
        window_key = f"ratelimit:{key}:{int(time.time() // self.window)}"
        current = int(self.redis.get(window_key) or 0)
        return max(0, self.limit - current)
```

### Algorithm 2: Sliding Window Log

```
┌─────────────────────────────────────────────────────────────────┐
│                    SLIDING WINDOW LOG                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Store timestamp of each request                                │
│                                                                 │
│  Window: Last 60 seconds from NOW                               │
│                                                                 │
│  Timestamps stored:                                             │
│  [12:00:15, 12:00:23, 12:00:45, 12:01:02, 12:01:08]            │
│                                                                 │
│  Now: 12:01:10                                                  │
│  Window start: 12:00:10                                         │
│  Requests in window: [12:00:15, 12:00:23, 12:00:45, 12:01:02, 12:01:08]
│  Count: 5                                                       │
│                                                                 │
│  ✅ Very accurate                                               │
│  ❌ High memory (stores all timestamps)                         │
│  ❌ Expensive cleanup                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```python
class SlidingWindowLog:
    def __init__(self, redis: Redis, limit: int, window_seconds: int):
        self.redis = redis
        self.limit = limit
        self.window = window_seconds
    
    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window
        redis_key = f"ratelimit:{key}"
        
        pipe = self.redis.pipeline()
        
        # Remove old timestamps
        pipe.zremrangebyscore(redis_key, 0, window_start)
        
        # Count current window
        pipe.zcard(redis_key)
        
        # Add current request
        pipe.zadd(redis_key, {str(now): now})
        
        # Set expiry
        pipe.expire(redis_key, self.window)
        
        results = pipe.execute()
        count = results[1]
        
        return count < self.limit
```

### Algorithm 3: Sliding Window Counter (Hybrid)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SLIDING WINDOW COUNTER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Approximation using weighted average of two windows            │
│                                                                 │
│  Previous Window    Current Window                              │
│  ┌──────────────┐   ┌──────────────┐                           │
│  │    80 reqs   │   │    30 reqs   │                           │
│  └──────────────┘   └──────────────┘                           │
│                                                                 │
│  Current position: 25% into current window                      │
│                                                                 │
│  Weighted count = prev_count × (1 - position%) + curr_count    │
│                 = 80 × 0.75 + 30 × 1.0                          │
│                 = 60 + 30 = 90                                  │
│                                                                 │
│  ✅ Memory efficient (just 2 counters)                          │
│  ✅ Good accuracy                                               │
│  ✅ No burst at edges                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```python
class SlidingWindowCounter:
    def __init__(self, redis: Redis, limit: int, window_seconds: int):
        self.redis = redis
        self.limit = limit
        self.window = window_seconds
    
    def is_allowed(self, key: str) -> bool:
        now = time.time()
        current_window = int(now // self.window)
        prev_window = current_window - 1
        
        # Position within current window (0.0 to 1.0)
        position = (now % self.window) / self.window
        
        # Get both counters
        prev_count = int(self.redis.get(f"ratelimit:{key}:{prev_window}") or 0)
        curr_count = int(self.redis.get(f"ratelimit:{key}:{current_window}") or 0)
        
        # Weighted count
        weighted = prev_count * (1 - position) + curr_count
        
        if weighted >= self.limit:
            return False
        
        # Increment current window
        pipe = self.redis.pipeline()
        pipe.incr(f"ratelimit:{key}:{current_window}")
        pipe.expire(f"ratelimit:{key}:{current_window}", self.window * 2)
        pipe.execute()
        
        return True
```

### Algorithm 4: Token Bucket

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN BUCKET                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bucket: capacity = 10, refill_rate = 1 token/second            │
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │ ● ● ● ● ● ● ○ ○ ○ ○  │  6 tokens available                   │
│  └──────────────────────┘                                       │
│           ↑                                                     │
│     Tokens added                                                │
│     at refill_rate                                              │
│                                                                 │
│  Request arrives:                                               │
│  • Has tokens? Remove 1 token, allow request                    │
│  • No tokens? Reject request                                    │
│                                                                 │
│  ✅ Allows short bursts (up to bucket capacity)                 │
│  ✅ Smooth rate over time                                       │
│  ✅ Memory efficient                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```python
class TokenBucket:
    def __init__(self, redis: Redis, capacity: int, refill_rate: float):
        self.redis = redis
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
    
    def is_allowed(self, key: str) -> bool:
        now = time.time()
        redis_key = f"tokenbucket:{key}"
        
        # Lua script for atomic operation
        lua_script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        local data = redis.call('HMGET', key, 'tokens', 'last_update')
        local tokens = tonumber(data[1]) or capacity
        local last_update = tonumber(data[2]) or now
        
        -- Calculate tokens to add
        local elapsed = now - last_update
        local new_tokens = math.min(capacity, tokens + elapsed * refill_rate)
        
        -- Try to consume token
        if new_tokens >= 1 then
            new_tokens = new_tokens - 1
            redis.call('HMSET', key, 'tokens', new_tokens, 'last_update', now)
            redis.call('EXPIRE', key, 3600)
            return 1
        else
            return 0
        end
        """
        
        result = self.redis.eval(
            lua_script, 
            1, 
            redis_key,
            self.capacity,
            self.refill_rate,
            now
        )
        
        return result == 1
```

### Algorithm 5: Leaky Bucket

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEAKY BUCKET                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Requests queue up, processed at constant rate                  │
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │ ─► [req4]            │  Queue (bucket)                       │
│  │    [req3]            │                                       │
│  │    [req2]            │                                       │
│  │    [req1]            │                                       │
│  └─────────┬────────────┘                                       │
│            │                                                    │
│            ▼ (leak at constant rate)                            │
│      ─► Processed                                               │
│                                                                 │
│  ✅ Smooth output rate                                          │
│  ✅ No bursts                                                   │
│  ❌ Adds latency (requests wait in queue)                       │
│  ❌ Queue can grow during bursts                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Algorithm Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALGORITHM COMPARISON                         │
├─────────────────┬──────────┬──────────┬──────────┬─────────────┤
│ Algorithm       │ Memory   │ Accuracy │ Bursts   │ Use Case    │
├─────────────────┼──────────┼──────────┼──────────┼─────────────┤
│ Fixed Window    │ Low      │ Low      │ Yes      │ Simple apps │
│ Sliding Log     │ High     │ High     │ No       │ Low volume  │
│ Sliding Counter │ Low      │ Medium   │ No       │ Most APIs   │
│ Token Bucket    │ Low      │ High     │ Allowed  │ Flexible    │
│ Leaky Bucket    │ Medium   │ High     │ Smoothed │ Queued work │
└─────────────────┴──────────┴──────────┴──────────┴─────────────┘
```

---

## 3. High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RATE LIMITER ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     ┌──────────┐                                                            │
│     │  Client  │                                                            │
│     └────┬─────┘                                                            │
│          │ Request with API Key / User ID                                   │
│          ▼                                                                  │
│     ┌───────────────┐                                                       │
│     │ Load Balancer │                                                       │
│     └───────┬───────┘                                                       │
│             │                                                               │
│             ▼                                                               │
│     ┌───────────────────────────────────────────────────────────────┐      │
│     │                    API GATEWAY                                 │      │
│     │  ┌─────────────────────────────────────────────────────────┐  │      │
│     │  │                 RATE LIMITER MIDDLEWARE                  │  │      │
│     │  │                                                          │  │      │
│     │  │  1. Extract key (user_id, ip, api_key)                  │  │      │
│     │  │  2. Check rate limit                                     │  │      │
│     │  │  3. Allow or reject (429)                                │  │      │
│     │  │                                                          │  │      │
│     │  └─────────────────────────┬───────────────────────────────┘  │      │
│     │                            │                                   │      │
│     └────────────────────────────┼───────────────────────────────────┘      │
│                                  │                                          │
│                    ┌─────────────┴─────────────┐                           │
│                    │                           │                            │
│              (If allowed)                (If rejected)                      │
│                    │                           │                            │
│                    ▼                           ▼                            │
│            ┌─────────────┐             ┌─────────────┐                     │
│            │   Backend   │             │ 429 Response│                     │
│            │   Service   │             │ Too Many    │                     │
│            └─────────────┘             │ Requests    │                     │
│                                        └─────────────┘                     │
│                                                                             │
│     ┌───────────────────────────────────────────────────────────────┐      │
│     │                    RATE LIMIT STORAGE                          │      │
│     │                                                                │      │
│     │    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │      │
│     │    │   Redis 1   │────│   Redis 2   │────│   Redis 3   │     │      │
│     │    │  (Primary)  │    │  (Replica)  │    │  (Replica)  │     │      │
│     │    └─────────────┘    └─────────────┘    └─────────────┘     │      │
│     │                                                                │      │
│     └───────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Rate Limit Rules Configuration

```yaml
# Rate limit configuration
rate_limits:
  # Default limits
  default:
    requests_per_minute: 60
    requests_per_hour: 1000
  
  # Per endpoint limits
  endpoints:
    - path: "/api/login"
      method: "POST"
      limit: 5
      window: "1m"
      key: "ip"  # Rate limit by IP for login
    
    - path: "/api/search"
      method: "GET"
      limit: 30
      window: "1m"
      key: "user_id"
    
    - path: "/api/upload"
      method: "POST"
      limit: 10
      window: "1h"
      key: "user_id"
  
  # Tier-based limits
  tiers:
    free:
      requests_per_minute: 30
      requests_per_day: 1000
    
    pro:
      requests_per_minute: 100
      requests_per_day: 10000
    
    enterprise:
      requests_per_minute: 1000
      requests_per_day: 100000
```

```python
class RateLimitRule:
    path_pattern: str
    method: str
    limit: int
    window_seconds: int
    key_type: str  # 'user_id', 'ip', 'api_key'
    tier_overrides: Dict[str, int]

class RateLimiterService:
    def __init__(self, redis: Redis, rules: List[RateLimitRule]):
        self.redis = redis
        self.rules = rules
        self.default_limiter = SlidingWindowCounter(redis, 60, 60)
    
    def check_rate_limit(self, request: Request, user: User) -> RateLimitResult:
        # Find matching rule
        rule = self.find_rule(request.path, request.method)
        
        if not rule:
            rule = self.default_rule
        
        # Determine limit based on user tier
        limit = rule.tier_overrides.get(user.tier, rule.limit)
        
        # Build key
        key = self.build_key(rule, request, user)
        
        # Check limit
        limiter = SlidingWindowCounter(self.redis, limit, rule.window_seconds)
        allowed = limiter.is_allowed(key)
        remaining = limiter.get_remaining(key)
        
        return RateLimitResult(
            allowed=allowed,
            limit=limit,
            remaining=remaining,
            reset_at=self.calculate_reset_time(rule.window_seconds)
        )
```

---

## 5. Response Headers

```
┌─────────────────────────────────────────────────────────────────┐
│                    RATE LIMIT HEADERS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Standard Headers:                                              │
│  ─────────────────                                              │
│                                                                 │
│  X-RateLimit-Limit: 100           # Max requests allowed        │
│  X-RateLimit-Remaining: 45        # Requests remaining          │
│  X-RateLimit-Reset: 1699012800    # Unix timestamp of reset     │
│                                                                 │
│  On 429 Too Many Requests:                                      │
│  ─────────────────────────                                      │
│                                                                 │
│  Retry-After: 30                  # Seconds until retry         │
│  X-RateLimit-Limit: 100                                         │
│  X-RateLimit-Remaining: 0                                       │
│  X-RateLimit-Reset: 1699012800                                  │
│                                                                 │
│  Response Body:                                                 │
│  {                                                              │
│    "error": "rate_limit_exceeded",                              │
│    "message": "Too many requests. Retry after 30 seconds.",     │
│    "retry_after": 30                                            │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```python
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    user = get_current_user(request)
    result = rate_limiter.check_rate_limit(request, user)
    
    # Set headers on all responses
    response_headers = {
        "X-RateLimit-Limit": str(result.limit),
        "X-RateLimit-Remaining": str(result.remaining),
        "X-RateLimit-Reset": str(int(result.reset_at.timestamp()))
    }
    
    if not result.allowed:
        retry_after = int((result.reset_at - datetime.now()).total_seconds())
        return JSONResponse(
            status_code=429,
            headers={
                **response_headers,
                "Retry-After": str(retry_after)
            },
            content={
                "error": "rate_limit_exceeded",
                "message": f"Too many requests. Retry after {retry_after} seconds.",
                "retry_after": retry_after
            }
        )
    
    response = await call_next(request)
    
    for key, value in response_headers.items():
        response.headers[key] = value
    
    return response
```

---

## 6. Distributed Rate Limiting

### Challenge: Multiple Servers

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED CHALLENGE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Problem: Limit is 100/min, but we have 10 servers              │
│                                                                 │
│       Server 1  Server 2  Server 3  ...  Server 10              │
│       ───────   ───────   ───────       ───────                 │
│       count=15  count=12  count=20      count=18                │
│                                                                 │
│  Each server sees partial view!                                 │
│  User could make 150 requests (15 to each server)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Solution 1: Centralized Redis

```
┌─────────────────────────────────────────────────────────────────┐
│                    CENTRALIZED REDIS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  All servers share single Redis for rate limiting               │
│                                                                 │
│  ┌──────────┐                                                   │
│  │ Server 1 │─────┐                                             │
│  └──────────┘     │                                             │
│  ┌──────────┐     │     ┌────────────────┐                     │
│  │ Server 2 │─────┼────►│ Redis Cluster  │                     │
│  └──────────┘     │     │ (Rate Limits)  │                     │
│  ┌──────────┐     │     └────────────────┘                     │
│  │ Server 3 │─────┘                                             │
│  └──────────┘                                                   │
│                                                                 │
│  ✅ Accurate global count                                       │
│  ❌ Redis becomes bottleneck                                    │
│  ❌ Network latency on every request                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Solution 2: Local + Sync

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOCAL + PERIODIC SYNC                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Each server tracks locally, syncs periodically                 │
│                                                                 │
│  ┌──────────────────┐                                           │
│  │ Server 1         │                                           │
│  │ Local: 15        │──────┐                                    │
│  │ Global est: 150  │      │                                    │
│  └──────────────────┘      │      ┌─────────────────┐          │
│  ┌──────────────────┐      │      │                 │          │
│  │ Server 2         │      ├─────►│  Redis (sync)   │          │
│  │ Local: 12        │      │      │                 │          │
│  │ Global est: 150  │──────┤      └─────────────────┘          │
│  └──────────────────┘      │                                    │
│  ┌──────────────────┐      │      Sync every 1 second          │
│  │ Server 3         │      │                                    │
│  │ Local: 20        │──────┘                                    │
│  │ Global est: 150  │                                           │
│  └──────────────────┘                                           │
│                                                                 │
│  ✅ Low latency (local check)                                   │
│  ❌ Less accurate (sync delay)                                  │
│  ❌ Can exceed limit briefly                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Solution 3: Sticky Sessions

```
┌─────────────────────────────────────────────────────────────────┐
│                    STICKY SESSIONS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Route same user to same server (by user_id hash)               │
│                                                                 │
│                    ┌─────────────┐                              │
│  User A ──────────►│             │                              │
│  (hash % 3 = 0)    │             │──────► Server 1              │
│                    │    Load     │                              │
│  User B ──────────►│  Balancer   │──────► Server 2              │
│  (hash % 3 = 1)    │             │                              │
│                    │ (Consistent │──────► Server 3              │
│  User C ──────────►│   Hashing)  │                              │
│  (hash % 3 = 2)    └─────────────┘                              │
│                                                                 │
│  ✅ Each server has complete view of its users                  │
│  ✅ No cross-server coordination                                │
│  ❌ Hot users can overload one server                          │
│  ❌ Server failure affects subset of users                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Solution 4: Redis Cluster with Sharding

```python
class DistributedRateLimiter:
    def __init__(self, redis_cluster: RedisCluster):
        self.redis = redis_cluster
    
    def is_allowed(self, key: str) -> bool:
        # Key automatically routed to correct shard
        # Redis Cluster handles sharding by key
        
        # Use Lua script for atomic operation
        lua_script = """
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        local current = redis.call('INCR', key)
        
        if current == 1 then
            redis.call('EXPIRE', key, window)
        end
        
        if current <= limit then
            return {1, limit - current}  -- allowed, remaining
        else
            return {0, 0}  -- denied, 0 remaining
        end
        """
        
        window_key = f"ratelimit:{key}:{int(time.time() // 60)}"
        
        result = self.redis.eval(
            lua_script,
            1,
            window_key,
            100,  # limit
            60,   # window
            time.time()
        )
        
        return result[0] == 1
```

---

## 7. Race Condition Handling

### The Read-Modify-Write Problem

```
┌─────────────────────────────────────────────────────────────────┐
│                    RACE CONDITION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Two requests arrive simultaneously                             │
│                                                                 │
│  Time     Request A           Request B                         │
│  ─────    ─────────           ─────────                         │
│  T1       Read: count=99      Read: count=99                    │
│  T2       Check: 99<100 ✓     Check: 99<100 ✓                   │
│  T3       Write: count=100    Write: count=100                  │
│  T4       Allow               Allow                             │
│                                                                 │
│  Result: Both allowed, but count should be 101 (over limit!)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Solution: Lua Scripts (Atomic Operations)

```python
# All operations in single atomic Lua script
RATE_LIMIT_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

-- Atomic increment
local current = redis.call('INCR', key)

-- Set expiry only on first request
if current == 1 then
    redis.call('EXPIRE', key, window)
end

-- Check limit
if current > limit then
    return {0, 0, redis.call('TTL', key)}  -- denied
else
    return {1, limit - current, redis.call('TTL', key)}  -- allowed
end
"""

class AtomicRateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.script = self.redis.register_script(RATE_LIMIT_SCRIPT)
    
    def check(self, key: str, limit: int, window: int) -> RateLimitResult:
        result = self.script(
            keys=[f"ratelimit:{key}"],
            args=[limit, window]
        )
        
        return RateLimitResult(
            allowed=result[0] == 1,
            remaining=result[1],
            reset_in_seconds=result[2]
        )
```

---

## 8. Fault Tolerance

### What Happens When Redis is Down?

```
┌─────────────────────────────────────────────────────────────────┐
│                    FAILURE HANDLING                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Option 1: Fail Open (Allow all)                                │
│  ───────────────────────────────                                │
│  If Redis down → allow requests                                 │
│  • Better user experience                                       │
│  • Risk of abuse during outage                                  │
│  • Use for non-critical limits                                  │
│                                                                 │
│  Option 2: Fail Closed (Deny all)                               │
│  ────────────────────────────────                               │
│  If Redis down → reject requests                                │
│  • Protects backend                                             │
│  • Bad user experience                                          │
│  • Use for critical protection                                  │
│                                                                 │
│  Option 3: Local Fallback                                       │
│  ─────────────────────────                                      │
│  If Redis down → use local in-memory limiter                    │
│  • Graceful degradation                                         │
│  • Less accurate but functional                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```python
class ResilientRateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.local_limiter = LocalTokenBucket()
        self.fail_open = True  # Configuration
    
    async def is_allowed(self, key: str) -> bool:
        try:
            return await asyncio.wait_for(
                self.check_redis(key),
                timeout=0.1  # 100ms timeout
            )
        except (RedisError, asyncio.TimeoutError) as e:
            logger.warning(f"Redis rate limit failed: {e}")
            metrics.increment("rate_limiter.fallback")
            
            if self.fail_open:
                # Fall back to local limiter
                return self.local_limiter.is_allowed(key)
            else:
                return False  # Fail closed
    
    async def check_redis(self, key: str) -> bool:
        # Normal Redis check
        ...
```

---

## 9. Multi-Region Rate Limiting

```
┌─────────────────────────────────────────────────────────────────┐
│                    GLOBAL RATE LIMITING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Challenge: User limit is 1000/min globally                     │
│  User makes requests from US, EU, and Asia simultaneously       │
│                                                                 │
│  Option 1: Single Global Redis                                  │
│  ────────────────────────────                                   │
│                                                                 │
│      US-East        EU-West        AP-South                     │
│         │              │              │                         │
│         └──────────────┼──────────────┘                         │
│                        ▼                                        │
│               ┌──────────────┐                                  │
│               │ Global Redis │  (high latency)                  │
│               └──────────────┘                                  │
│                                                                 │
│  Option 2: Partitioned Limits                                   │
│  ───────────────────────────                                    │
│  Global limit = 1000/min                                        │
│  US = 400/min, EU = 400/min, AP = 200/min                      │
│                                                                 │
│      US-East           EU-West           AP-South               │
│    ┌──────────┐      ┌──────────┐      ┌──────────┐            │
│    │ Redis    │      │ Redis    │      │ Redis    │            │
│    │ 400/min  │      │ 400/min  │      │ 200/min  │            │
│    └──────────┘      └──────────┘      └──────────┘            │
│                                                                 │
│  Option 3: Async Aggregation                                    │
│  ───────────────────────────                                    │
│  • Local limits per region                                      │
│  • Async sync of totals                                         │
│  • Adjust local limits based on global usage                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Interview Tips

### Common Questions

1. **Why not just use local counters?**
   - Inaccurate in distributed systems
   - User can hit multiple servers

2. **How do you handle bursts?**
   - Token bucket allows controlled bursts
   - Sliding window prevents edge bursts

3. **What about DDoS attacks?**
   - Rate limiting is one layer
   - Also need WAF, IP blocking
   - Limit at edge (CDN level)

4. **How do you test rate limiting?**
   - Load testing tools
   - Verify headers are correct
   - Test edge cases (reset timing)

5. **Can users bypass by changing IP?**
   - Rate limit by multiple keys
   - User ID (after auth)
   - Device fingerprinting
   - CAPTCHA as fallback

---

## ✅ Key Takeaways

1. **Choose algorithm by use case** - Token bucket for bursts, sliding window for accuracy
2. **Use Lua scripts** - Atomic operations prevent race conditions
3. **Plan for failure** - Fail open vs closed based on criticality
4. **Return proper headers** - Limit, Remaining, Reset, Retry-After
5. **Distributed is hard** - Use centralized Redis or partition limits
6. **Multiple keys** - Combine user ID, IP, and API key
7. **Config-driven rules** - Different limits per endpoint/tier

---

## 📚 Related Topics

- [Rate Limiting Fundamentals](/system-design/fundamentals/18-rate-limiting.md) - Deep dive on algorithms
- [Caching](/system-design/fundamentals/07-caching.md) - Redis patterns
- [Distributed Patterns](/system-design/fundamentals/14-distributed-patterns.md) - Consensus for distributed limits
- [URL Shortener](/system-design/problems/01-url-shortener.md) - Uses rate limiting
