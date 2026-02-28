# Monitoring and Observability

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

Observability enables understanding system behavior through external outputs. The three pillars—metrics, logs, and traces—provide complementary views into system health and performance. This guide covers observability fundamentals essential for operating reliable distributed systems.

---

## 📊 The Three Pillars

```
┌─────────────────────────────────────────────────────────────────┐
│                    THREE PILLARS OF OBSERVABILITY               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │     METRICS     │  │      LOGS       │  │     TRACES      │ │
│  │                 │  │                 │  │                 │ │
│  │  "What is       │  │  "What          │  │  "How do        │ │
│  │   happening?"   │  │   happened?"    │  │   requests      │ │
│  │                 │  │                 │  │   flow?"        │ │
│  │  Aggregated     │  │  Detailed       │  │  End-to-end     │ │
│  │  Time-series    │  │  Events         │  │  Request path   │ │
│  │                 │  │                 │  │                 │ │
│  │  CPU: 65%       │  │  Error at       │  │  A → B → C      │ │
│  │  Requests: 1K/s │  │  14:05:32       │  │  50ms→20ms→10ms│ │
│  │  Errors: 0.1%   │  │  User: 123      │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                    │                    │          │
│           └────────────────────┼────────────────────┘          │
│                                │                               │
│                    Combined for full picture                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📈 Metrics

### Types of Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                    METRIC TYPES                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Counter:                                                       │
│  ─────────                                                      │
│  Monotonically increasing value                                 │
│  • Total requests served                                        │
│  • Errors encountered                                           │
│  • Bytes transferred                                            │
│                                                                 │
│  Example: http_requests_total{method="GET", status="200"} 1234 │
│                                                                 │
│  Gauge:                                                         │
│  ──────                                                         │
│  Value that can go up or down                                   │
│  • Current CPU usage                                            │
│  • Memory used                                                  │
│  • Active connections                                           │
│                                                                 │
│  Example: node_memory_used_bytes 4294967296                    │
│                                                                 │
│  Histogram:                                                     │
│  ──────────                                                     │
│  Distribution of values in buckets                              │
│  • Request latency percentiles                                  │
│  • Response size distribution                                   │
│                                                                 │
│  Example: http_request_duration_seconds_bucket{le="0.1"} 500   │
│           http_request_duration_seconds_bucket{le="0.5"} 800   │
│           http_request_duration_seconds_bucket{le="1.0"} 900   │
│                                                                 │
│  Summary:                                                       │
│  ────────                                                       │
│  Pre-calculated quantiles                                       │
│  • p50, p95, p99 latency                                       │
│                                                                 │
│  Example: http_request_duration_seconds{quantile="0.99"} 0.25 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Metrics to Track

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESSENTIAL METRICS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RED Metrics (Request-driven services):                         │
│  ───────────────────────────────────────                        │
│  Rate:     Requests per second                                  │
│  Errors:   Failed requests per second                           │
│  Duration: Latency distribution                                 │
│                                                                 │
│  USE Metrics (Resources):                                       │
│  ─────────────────────────                                      │
│  Utilization: % of resource used (CPU, memory, disk)           │
│  Saturation:  Queue depth, wait time                           │
│  Errors:      Error count                                      │
│                                                                 │
│  Four Golden Signals (Google SRE):                              │
│  ──────────────────────────────────                             │
│  Latency:     Time to serve request                            │
│  Traffic:     Requests per second                              │
│  Errors:      Error rate                                       │
│  Saturation:  How "full" the service is                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Prometheus Metrics Example

```python
from prometheus_client import Counter, Histogram, Gauge

# Counter - total requests
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Histogram - latency distribution
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Gauge - current connections
ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Number of active connections'
)

# Usage in application
@app.route('/api/users')
def get_users():
    start_time = time.time()
    ACTIVE_CONNECTIONS.inc()
    
    try:
        result = fetch_users()
        REQUEST_COUNT.labels(
            method='GET', 
            endpoint='/api/users', 
            status='200'
        ).inc()
        return result
    except Exception as e:
        REQUEST_COUNT.labels(
            method='GET', 
            endpoint='/api/users', 
            status='500'
        ).inc()
        raise
    finally:
        ACTIVE_CONNECTIONS.dec()
        REQUEST_LATENCY.labels(
            method='GET', 
            endpoint='/api/users'
        ).observe(time.time() - start_time)
```

---

## 📝 Logging

### Structured Logging

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRUCTURED VS UNSTRUCTURED                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Unstructured (bad):                                            │
│  ───────────────────                                            │
│  2023-11-01 14:05:32 ERROR: Failed to process order 12345      │
│  for user john@example.com - connection timeout                 │
│                                                                 │
│  Hard to parse, search, and aggregate!                          │
│                                                                 │
│  Structured (good):                                             │
│  ──────────────────                                             │
│  {                                                              │
│    "timestamp": "2023-11-01T14:05:32.123Z",                    │
│    "level": "error",                                           │
│    "message": "Failed to process order",                       │
│    "order_id": "12345",                                        │
│    "user_email": "john@example.com",                           │
│    "error_type": "connection_timeout",                         │
│    "service": "order-service",                                 │
│    "trace_id": "abc123def456",                                 │
│    "span_id": "span789"                                        │
│  }                                                              │
│                                                                 │
│  Easy to query: error_type:connection_timeout AND level:error  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| **DEBUG** | Development details | "Cache lookup: key=user:123" |
| **INFO** | Normal operations | "Order created: id=12345" |
| **WARN** | Potential issues | "Slow query: 2.5s" |
| **ERROR** | Failures (recoverable) | "Payment failed: retrying" |
| **FATAL** | Critical failures | "Database connection lost" |

### Logging Best Practices

```python
import structlog
import uuid

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# Always include context
def process_order(order_id: str, user_id: str):
    log = logger.bind(
        order_id=order_id,
        user_id=user_id,
        trace_id=get_trace_id()
    )
    
    log.info("processing_order_started")
    
    try:
        result = do_process(order_id)
        log.info("processing_order_completed", 
                 duration_ms=result.duration)
        return result
    except PaymentError as e:
        log.error("processing_order_failed",
                  error_type="payment_error",
                  error_message=str(e))
        raise

# DON'T log sensitive data
log.info("user_login", user_id=user.id)  # ✓ Good
log.info("user_login", password=password)  # ✗ Never!
log.info("payment", card_number=card[-4:])  # ✓ Masked
```

### Centralized Logging Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOGGING ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Service  │  │ Service  │  │ Service  │                      │
│  │    A     │  │    B     │  │    C     │                      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                      │
│       │             │             │                             │
│       ▼             ▼             ▼                             │
│  ┌────────────────────────────────────────┐                    │
│  │           Log Shipper                  │                    │
│  │    (Fluentd, Filebeat, Vector)         │                    │
│  └────────────────────┬───────────────────┘                    │
│                       │                                         │
│                       ▼                                         │
│  ┌────────────────────────────────────────┐                    │
│  │           Message Queue               │                    │
│  │         (Kafka - optional)            │                    │
│  └────────────────────┬───────────────────┘                    │
│                       │                                         │
│                       ▼                                         │
│  ┌────────────────────────────────────────┐                    │
│  │         Log Storage & Search          │                    │
│  │    (Elasticsearch, Loki, Splunk)      │                    │
│  └────────────────────┬───────────────────┘                    │
│                       │                                         │
│                       ▼                                         │
│  ┌────────────────────────────────────────┐                    │
│  │          Visualization                │                    │
│  │       (Kibana, Grafana)               │                    │
│  └────────────────────────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Distributed Tracing

### How Tracing Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED TRACE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Request flow through services:                                 │
│                                                                 │
│  User Request                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐                                               │
│  │ API Gateway │ ─── Span 1 (50ms) ─────────────────────────   │
│  └──────┬──────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                               │
│  │ Order Svc   │ ─── Span 2 (30ms) ───────────────────         │
│  └──────┬──────┘                                               │
│         │                                                       │
│    ┌────┴────┐                                                  │
│    ▼         ▼                                                  │
│  ┌─────┐  ┌─────────┐                                          │
│  │ DB  │  │ Payment │                                          │
│  └─────┘  │ Service │                                          │
│  Span 3   └─────────┘                                          │
│  (5ms)    Span 4 (15ms)                                        │
│                                                                 │
│  Trace ID: abc123 (same for all spans)                         │
│  Parent-child relationships preserved                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Trace Context Propagation

```python
# OpenTelemetry example
from opentelemetry import trace
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer(__name__)

# Incoming request - extract context
@app.route('/api/orders', methods=['POST'])
def create_order():
    # Extract trace context from incoming headers
    context = extract(request.headers)
    
    with tracer.start_as_current_span(
        "create_order",
        context=context
    ) as span:
        span.set_attribute("order.user_id", request.json['user_id'])
        
        # Call downstream service
        result = call_payment_service(request.json)
        
        return result

# Outgoing request - inject context
def call_payment_service(order_data):
    headers = {}
    inject(headers)  # Adds trace context headers
    
    with tracer.start_as_current_span("payment_request") as span:
        span.set_attribute("payment.amount", order_data['amount'])
        
        response = requests.post(
            'http://payment-service/charge',
            json=order_data,
            headers=headers  # Propagate trace context
        )
        
        return response.json()
```

### Trace Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│  Trace: abc123                                    Total: 85ms   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ├─ api-gateway: POST /orders                         [85ms]   │
│  │  ├─ authentication                                  [5ms]    │
│  │  └─ order-service: create_order                    [75ms]   │
│  │     ├─ validate_request                             [2ms]    │
│  │     ├─ postgres: INSERT orders                     [10ms]   │
│  │     ├─ payment-service: charge                     [45ms]   │
│  │     │  ├─ fraud_check                              [15ms]   │
│  │     │  └─ stripe: create_charge                    [25ms]   │
│  │     └─ kafka: publish order_created                 [3ms]    │
│  │                                                              │
│  Timeline:                                                      │
│  0ms     25ms    50ms    75ms    85ms                          │
│  │───────│───────│───────│───────│                             │
│  [=== api-gateway ============================]                 │
│     [===== order-service ==================]                    │
│          [== db ==]                                             │
│               [========= payment =========]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚨 Alerting

### Alert Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALERTING BEST PRACTICES                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Good alerts are:                                               │
│  ─────────────────                                              │
│  ✅ Actionable - someone can fix it                             │
│  ✅ Urgent - needs attention now                                │
│  ✅ Real - not a false positive                                 │
│                                                                 │
│  Bad alerts:                                                    │
│  ───────────                                                    │
│  ❌ CPU > 80% (so what? Is it affecting users?)                 │
│  ❌ Disk > 90% (alert, but not at 3 AM)                         │
│  ❌ Any single error (noise)                                    │
│                                                                 │
│  Alert on symptoms, not causes:                                 │
│  ─────────────────────────────                                  │
│  ❌ "Database CPU high"                                         │
│  ✅ "Order creation latency > 2s for 5 minutes"                 │
│                                                                 │
│  ❌ "Memory usage 95%"                                          │
│  ✅ "Error rate > 1% of requests"                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Alert Severity Levels

| Severity | Response Time | Example |
|----------|---------------|---------|
| **P1 Critical** | Immediate | Site down, data loss |
| **P2 High** | &lt; 1 hour | Feature broken, high error rate |
| **P3 Medium** | &lt; 4 hours | Degraded performance |
| **P4 Low** | Next business day | Minor issues, warnings |

### Example Alert Rules (Prometheus)

```yaml
groups:
  - name: service-alerts
    rules:
      # Error rate alert
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Latency alert
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High p95 latency"
          description: "p95 latency is {{ $value }}s"

      # Saturation alert
      - alert: HighSaturation
        expr: avg(node_cpu_seconds_total{mode="idle"}) < 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU saturation"
```

---

## 📊 Dashboards

### Dashboard Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE DASHBOARD                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Row 1: Overview (Golden Signals)                               │
│  ┌──────────────┬──────────────┬──────────────┬───────────────┐│
│  │  Request     │   Error      │   Latency    │  Saturation   ││
│  │   Rate       │    Rate      │    (p99)     │   (CPU/Mem)   ││
│  │   1,234/s    │   0.02%      │    45ms      │    65%        ││
│  └──────────────┴──────────────┴──────────────┴───────────────┘│
│                                                                 │
│  Row 2: Latency Distribution                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Latency (ms)                                                ││
│  │ 100 │                    ╭─────╮                            ││
│  │  50 │    ╭───────────────╯     ╰──────                      ││
│  │   0 │────╯                                                  ││
│  │     └────────────────────────────────────────► Time         ││
│  │     [p50: 15ms] [p95: 45ms] [p99: 120ms]                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Row 3: Dependencies                                            │
│  ┌────────────────────────┬────────────────────────────────────┐│
│  │ Database Latency       │ Cache Hit Rate                     ││
│  │ [Graph]                │ [Graph: 98.5%]                     ││
│  └────────────────────────┴────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Observability Stack Options

| Category | Open Source | Commercial |
|----------|-------------|------------|
| **Metrics** | Prometheus, InfluxDB | Datadog, New Relic |
| **Logs** | ELK Stack, Loki | Splunk, Sumo Logic |
| **Traces** | Jaeger, Zipkin | Lightstep, Honeycomb |
| **All-in-One** | Grafana Stack | Datadog, Dynatrace |

---

## ✅ Key Takeaways

1. **Three pillars complement each other** - Metrics, logs, and traces
2. **Use RED/USE/Golden Signals** - Proven metric frameworks
3. **Structured logging always** - JSON, include context
4. **Correlate with trace IDs** - Connect logs to traces
5. **Alert on symptoms** - User impact, not internal metrics
6. **Avoid alert fatigue** - Every alert should be actionable
7. **Dashboards for context** - Not for alerting

---

## 📚 Related Topics

- [Distributed Patterns](/system-design/fundamentals/14-distributed-patterns.md) - Tracing in distributed systems
- [Fault Tolerance](/system-design/fundamentals/20-fault-tolerance.md) - Detecting failures
- [Scaling Strategies](/system-design/fundamentals/10-scaling-strategies.md) - Monitoring at scale
