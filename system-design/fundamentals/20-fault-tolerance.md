# Fault Tolerance and Resilience

[← Back to Fundamentals](00-index.md)

---

## Overview

Fault tolerance is the ability of a system to continue operating when components fail. In distributed systems, failures are not exceptional—they're expected. This guide covers strategies for building resilient systems that gracefully handle failures.

---

## 💥 Types of Failures

```
┌─────────────────────────────────────────────────────────────────┐
│                    FAILURE TYPES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Hardware Failures:                                             │
│  ──────────────────                                             │
│  • Disk failures                                                │
│  • Server crashes                                               │
│  • Network card failures                                        │
│  • Power outages                                                │
│                                                                 │
│  Software Failures:                                             │
│  ──────────────────                                             │
│  • Bugs and exceptions                                          │
│  • Memory leaks                                                 │
│  • Deadlocks                                                    │
│  • Resource exhaustion                                          │
│                                                                 │
│  Network Failures:                                              │
│  ─────────────────                                              │
│  • Packet loss                                                  │
│  • Network partitions                                           │
│  • DNS failures                                                 │
│  • High latency                                                 │
│                                                                 │
│  Dependency Failures:                                           │
│  ────────────────────                                           │
│  • Database unavailable                                         │
│  • Third-party API down                                         │
│  • Cache failures                                               │
│  • Message queue issues                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Circuit Breaker Pattern

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    CIRCUIT BREAKER STATES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │     ┌────────┐    failures > threshold   ┌────────┐     │  │
│  │     │ CLOSED │ ─────────────────────────► │  OPEN  │     │  │
│  │     │        │                            │        │     │  │
│  │     │ Normal │                            │ Fail   │     │  │
│  │     │ ops    │                            │ fast   │     │  │
│  │     └────────┘                            └───┬────┘     │  │
│  │         ▲                                     │          │  │
│  │         │                              timeout│          │  │
│  │         │                                     │          │  │
│  │         │         ┌────────────┐              │          │  │
│  │         │         │ HALF-OPEN  │◄─────────────┘          │  │
│  │         │         │            │                          │  │
│  │         │         │ Test with  │                          │  │
│  │         │         │ few reqs   │                          │  │
│  │         │         └─────┬──────┘                          │  │
│  │         │               │                                 │  │
│  │         │    success    │    failure                      │  │
│  │         └───────────────┘────────────────► back to OPEN  │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  CLOSED: Normal operation, requests go through                 │
│  OPEN:   Fail immediately, don't call failing service         │
│  HALF-OPEN: Test if service recovered                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```python
from enum import Enum
from datetime import datetime, timedelta
from threading import Lock

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        half_open_requests: int = 3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = timedelta(seconds=recovery_timeout)
        self.half_open_requests = half_open_requests
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.lock = Lock()
    
    def can_execute(self) -> bool:
        with self.lock:
            if self.state == CircuitState.CLOSED:
                return True
            
            if self.state == CircuitState.OPEN:
                # Check if recovery timeout has passed
                if datetime.now() - self.last_failure_time > self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                    return True
                return False
            
            if self.state == CircuitState.HALF_OPEN:
                # Allow limited requests in half-open state
                return self.success_count < self.half_open_requests
    
    def record_success(self):
        with self.lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.half_open_requests:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
            elif self.state == CircuitState.CLOSED:
                self.failure_count = 0
    
    def record_failure(self):
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = datetime.now()
            
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
            elif self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
    
    def execute(self, func, *args, **kwargs):
        if not self.can_execute():
            raise CircuitOpenError("Circuit is open")
        
        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise

# Usage
payment_circuit = CircuitBreaker(failure_threshold=5)

def process_payment(order):
    try:
        return payment_circuit.execute(
            payment_service.charge,
            order.amount
        )
    except CircuitOpenError:
        # Fallback: queue for later processing
        payment_queue.enqueue(order)
        return {"status": "pending", "message": "Payment queued"}
```

---

## 🔄 Retry Strategies

### Exponential Backoff with Jitter

```
┌─────────────────────────────────────────────────────────────────┐
│                    RETRY STRATEGIES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Linear backoff (bad):                                          │
│  ─────────────────────                                          │
│  Retry 1: 1s, Retry 2: 2s, Retry 3: 3s                         │
│                                                                 │
│  Problem: All clients retry at same time                        │
│           → Thundering herd                                     │
│                                                                 │
│  Exponential backoff:                                           │
│  ─────────────────────                                          │
│  Retry 1: 1s, Retry 2: 2s, Retry 3: 4s, Retry 4: 8s            │
│                                                                 │
│  With jitter (best):                                            │
│  ──────────────────                                             │
│  Retry 1: 1s + random(0-500ms)                                 │
│  Retry 2: 2s + random(0-1000ms)                                │
│  Retry 3: 4s + random(0-2000ms)                                │
│                                                                 │
│  Visualization:                                                 │
│  Time: 0s   1s   2s   3s   4s   5s   6s   7s   8s              │
│  ──────────────────────────────────────────────                 │
│  Linear:  │R1  │R2  │R3  │                     (predictable)   │
│  Exp:     │R1  │  R2│      R3│                 (spread out)    │
│  +Jitter: │R1 │   R2│        R3│               (randomized)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```python
import random
import time
from typing import TypeVar, Callable

T = TypeVar('T')

def retry_with_backoff(
    func: Callable[[], T],
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: tuple = (Exception,)
) -> T:
    """
    Retry a function with exponential backoff and jitter.
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return func()
        except retryable_exceptions as e:
            last_exception = e
            
            if attempt == max_retries:
                break
            
            # Calculate delay with exponential backoff
            delay = min(base_delay * (exponential_base ** attempt), max_delay)
            
            # Add jitter
            if jitter:
                delay = delay * (0.5 + random.random())
            
            print(f"Attempt {attempt + 1} failed, retrying in {delay:.2f}s")
            time.sleep(delay)
    
    raise last_exception

# Usage
def fetch_user_data(user_id):
    return retry_with_backoff(
        lambda: api_client.get(f"/users/{user_id}"),
        max_retries=3,
        retryable_exceptions=(TimeoutError, ConnectionError)
    )
```

### Retry vs Circuit Breaker

```
Retry: "Try again, maybe it was transient"
Circuit Breaker: "Stop trying, the service is down"

Use BOTH together:
┌────────────────────────────────────────────────────────┐
│                                                        │
│  Request → [Retry Logic] → [Circuit Breaker] → Service │
│              │                    │                    │
│              │ Retry 3x           │ If failures > 5    │
│              │ with backoff       │ → stop all calls   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🎛️ Bulkhead Pattern

### Isolation for Fault Containment

```
┌─────────────────────────────────────────────────────────────────┐
│                    BULKHEAD PATTERN                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Without bulkhead:                                              │
│  ─────────────────                                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Shared Thread Pool (100 threads)           │   │
│  │                                                         │   │
│  │  Payment ─────┐                                         │   │
│  │  Email   ─────┼──► All share same pool                 │   │
│  │  Search  ─────┘                                         │   │
│  │                                                         │   │
│  │  If Email service hangs → All 100 threads blocked      │   │
│  │  → Payment and Search also fail!                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  With bulkhead:                                                 │
│  ───────────────                                                │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Payment    │  │    Email     │  │    Search    │         │
│  │   Pool (40)  │  │   Pool (20)  │  │   Pool (40)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  If Email service hangs → Only Email's 20 threads blocked      │
│  → Payment and Search continue working!                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Approaches

```python
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, TypeVar

T = TypeVar('T')

class BulkheadExecutor:
    def __init__(self, max_concurrent: int = 10, max_wait: int = 100):
        self.semaphore = threading.Semaphore(max_concurrent)
        self.max_wait = max_wait
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent)
    
    def execute(self, func: Callable[[], T], timeout: float = None) -> T:
        acquired = self.semaphore.acquire(timeout=timeout or self.max_wait)
        
        if not acquired:
            raise BulkheadFullError("Bulkhead capacity exceeded")
        
        try:
            return func()
        finally:
            self.semaphore.release()

# Create separate bulkheads for different services
payment_bulkhead = BulkheadExecutor(max_concurrent=40)
email_bulkhead = BulkheadExecutor(max_concurrent=20)
search_bulkhead = BulkheadExecutor(max_concurrent=40)

# Usage
def process_order(order):
    # Payment can use up to 40 concurrent calls
    payment_result = payment_bulkhead.execute(
        lambda: payment_service.charge(order)
    )
    
    # Email is isolated - won't affect payment
    try:
        email_bulkhead.execute(
            lambda: email_service.send_confirmation(order)
        )
    except BulkheadFullError:
        # Queue for later
        email_queue.add(order)
    
    return payment_result
```

---

## ⏱️ Timeouts

### Timeout Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIMEOUT CONFIGURATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Without timeout:                                               │
│  ─────────────────                                              │
│                                                                 │
│  Client ──────────► Service (hung)                              │
│    │                    │                                       │
│    │    waiting...      │                                       │
│    │    waiting...      │                                       │
│    │    waiting...      │  ← Thread blocked forever            │
│    │    waiting...      │                                       │
│    ▼                    ▼                                       │
│  Resources exhausted                                            │
│                                                                 │
│  With timeout:                                                  │
│  ─────────────                                                  │
│                                                                 │
│  Client ──────────► Service (slow)                              │
│    │                    │                                       │
│    │    waiting...      │                                       │
│    │    TIMEOUT!        │  ← Fail fast after 5s                │
│    ▼                                                            │
│  Handle failure, release resources                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Types of Timeouts

```python
import httpx

# Connection timeout: Time to establish connection
# Read timeout: Time to receive data after connected

client = httpx.Client(
    timeout=httpx.Timeout(
        connect=5.0,    # Connection timeout
        read=10.0,      # Read timeout
        write=5.0,      # Write timeout
        pool=5.0        # Waiting for connection from pool
    )
)

# Database timeouts
connection = psycopg2.connect(
    host="localhost",
    connect_timeout=5,      # Connection timeout
    options="-c statement_timeout=30000"  # Query timeout (30s)
)

# End-to-end timeout
async def get_user_with_timeout(user_id: str):
    try:
        async with asyncio.timeout(10.0):  # Total operation timeout
            user = await fetch_user(user_id)
            profile = await fetch_profile(user_id)
            return {**user, **profile}
    except asyncio.TimeoutError:
        raise ServiceTimeoutError("User fetch timed out")
```

### Timeout Budget

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIMEOUT BUDGET                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  API has 5 second SLA                                           │
│                                                                 │
│  Request flow:                                                  │
│  API Gateway → Service A → Service B → Database                │
│                                                                 │
│  Naive approach:                                                │
│  Gateway: 5s → A: 5s → B: 5s → DB: 5s                          │
│  Total possible: 20 seconds! (SLA violated)                     │
│                                                                 │
│  Budget approach:                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Total budget: 5 seconds                                  │   │
│  │                                                          │   │
│  │ Gateway: 5s ────────────────────────────────────────     │   │
│  │ Service A:    4s ───────────────────────────────         │   │
│  │ Service B:         3s ──────────────────────             │   │
│  │ Database:              2s ──────────                     │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Each layer reduces budget passed to next                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fallbacks

### Graceful Degradation

```
┌─────────────────────────────────────────────────────────────────┐
│                    FALLBACK STRATEGIES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Static fallback:                                            │
│  ───────────────────                                            │
│  if recommendation_service.is_down():                          │
│      return default_recommendations  # Pre-computed list       │
│                                                                 │
│  2. Cached fallback:                                            │
│  ──────────────────                                             │
│  try:                                                           │
│      data = fetch_from_service()                               │
│      cache.set(key, data)                                      │
│      return data                                               │
│  except ServiceError:                                          │
│      return cache.get(key)  # Return stale but available       │
│                                                                 │
│  3. Alternative service:                                        │
│  ────────────────────────                                       │
│  try:                                                           │
│      return primary_payment_gateway.charge(amount)             │
│  except PaymentError:                                          │
│      return backup_payment_gateway.charge(amount)              │
│                                                                 │
│  4. Graceful degradation:                                       │
│  ────────────────────────                                       │
│  if search_service.is_down():                                  │
│      return simple_database_search()  # Slower but works       │
│                                                                 │
│  5. Queue for later:                                            │
│  ──────────────────                                             │
│  try:                                                           │
│      send_email_now(order)                                     │
│  except EmailServiceError:                                     │
│      email_queue.add(order)  # Process when service recovers   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔁 Idempotency

### Making Operations Safe to Retry

```
┌─────────────────────────────────────────────────────────────────┐
│                    IDEMPOTENCY                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Without idempotency:                                           │
│  ─────────────────────                                          │
│                                                                 │
│  Client: POST /charge (amount=100)                             │
│  Server: Charges $100, returns OK                              │
│  Network: Response lost                                         │
│  Client: Timeout! Retry: POST /charge (amount=100)             │
│  Server: Charges $100 again!                                   │
│  Result: Customer charged $200 ❌                               │
│                                                                 │
│  With idempotency key:                                          │
│  ──────────────────────                                         │
│                                                                 │
│  Client: POST /charge (amount=100, idempotency_key=abc123)     │
│  Server: Charges $100, stores key→result, returns OK           │
│  Network: Response lost                                         │
│  Client: Retry: POST /charge (amount=100, idempotency_key=abc123)│
│  Server: Key exists! Return cached result                      │
│  Result: Customer charged $100 once ✓                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```python
import hashlib
import json
from datetime import datetime, timedelta

class IdempotencyHandler:
    def __init__(self, cache, ttl_hours=24):
        self.cache = cache
        self.ttl = timedelta(hours=ttl_hours)
    
    def execute(self, key: str, func, *args, **kwargs):
        # Check for existing result
        cached = self.cache.get(f"idempotency:{key}")
        if cached:
            return cached['result']
        
        # Check if in-progress
        if self.cache.get(f"idempotency:lock:{key}"):
            raise ConcurrentRequestError("Request in progress")
        
        # Set lock
        self.cache.set(
            f"idempotency:lock:{key}", 
            True, 
            ttl=60  # Lock expires after 60s
        )
        
        try:
            result = func(*args, **kwargs)
            
            # Store result
            self.cache.set(
                f"idempotency:{key}",
                {'result': result, 'created_at': datetime.now().isoformat()},
                ttl=self.ttl.total_seconds()
            )
            
            return result
        finally:
            self.cache.delete(f"idempotency:lock:{key}")

# Usage
@app.route('/api/payments', methods=['POST'])
def create_payment():
    idempotency_key = request.headers.get('Idempotency-Key')
    if not idempotency_key:
        return {"error": "Idempotency-Key required"}, 400
    
    return idempotency_handler.execute(
        idempotency_key,
        payment_service.create_payment,
        request.json
    )
```

---

## 🛡️ Health Checks

### Types of Health Checks

```
┌─────────────────────────────────────────────────────────────────┐
│                    HEALTH CHECK TYPES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Liveness: "Is the process alive?"                              │
│  ───────────────────────────────                                │
│  GET /health/live → 200 OK                                      │
│  Simple check that service is running                           │
│  If fails: Restart the container/process                        │
│                                                                 │
│  Readiness: "Can it handle traffic?"                            │
│  ────────────────────────────────────                           │
│  GET /health/ready → 200 OK                                     │
│  Checks dependencies (DB, cache, etc.)                          │
│  If fails: Remove from load balancer, don't restart             │
│                                                                 │
│  Startup: "Has it finished initializing?"                       │
│  ─────────────────────────────────────────                      │
│  GET /health/startup → 200 OK                                   │
│  Used during slow startups                                      │
│  If fails: Keep waiting, don't kill yet                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Health Check Implementation

```python
from flask import Flask, jsonify
from datetime import datetime, timedelta

app = Flask(__name__)

@app.route('/health/live')
def liveness():
    """Am I alive?"""
    return jsonify({"status": "ok"})

@app.route('/health/ready')
def readiness():
    """Can I handle requests?"""
    checks = {
        "database": check_database(),
        "cache": check_cache(),
        "external_api": check_external_api()
    }
    
    all_healthy = all(checks.values())
    
    return jsonify({
        "status": "ok" if all_healthy else "degraded",
        "checks": checks
    }), 200 if all_healthy else 503

def check_database():
    try:
        db.execute("SELECT 1")
        return True
    except:
        return False

def check_cache():
    try:
        cache.ping()
        return True
    except:
        return False

def check_external_api():
    try:
        response = requests.get(
            "https://api.external.com/health",
            timeout=2
        )
        return response.status_code == 200
    except:
        return False
```

---

## ✅ Key Takeaways

1. **Expect failures** - Design assuming components will fail
2. **Circuit breakers prevent cascades** - Stop calling failing services
3. **Retry with backoff and jitter** - Avoid thundering herd
4. **Bulkheads isolate failures** - One failure shouldn't take down everything
5. **Always set timeouts** - Fail fast, release resources
6. **Have fallbacks ready** - Graceful degradation > complete failure
7. **Make operations idempotent** - Safe to retry
8. **Health checks are essential** - Let infrastructure help

---

## 📚 Related Topics

- [Distributed Patterns](14-distributed-patterns.md) - Saga, consensus
- [Monitoring](19-monitoring-and-observability.md) - Detecting failures
- [Load Balancing](08-load-balancing.md) - Health checks in LB
- [Message Queues](09-message-queues.md) - Async for resilience
