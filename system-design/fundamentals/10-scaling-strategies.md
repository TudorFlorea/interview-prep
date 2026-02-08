# Scaling Strategies

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

Scaling is the process of increasing a system's capacity to handle more load. Understanding when and how to scale is crucial for building systems that grow with your users. This guide covers vertical vs horizontal scaling, stateless architecture, and auto-scaling strategies.

---

## 📊 Vertical vs Horizontal Scaling

### Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│              VERTICAL VS HORIZONTAL SCALING                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Vertical Scaling (Scale Up)    Horizontal Scaling (Scale Out)  │
│  ────────────────────────────   ─────────────────────────────   │
│                                                                 │
│       ┌─────────┐                   ┌───┐ ┌───┐ ┌───┐          │
│       │ BIGGER  │                   │ S │ │ S │ │ S │          │
│       │ SERVER  │                   │ 1 │ │ 2 │ │ 3 │          │
│       │         │                   └───┘ └───┘ └───┘          │
│       │  64 CPU │                     │     │     │            │
│       │ 512 RAM │                     └─────┴─────┘            │
│       └─────────┘                           │                  │
│            ▲                         Load Balancer             │
│            │                                                   │
│       ┌─────────┐                                              │
│       │ 16 CPU  │                                              │
│       │ 64 RAM  │                                              │
│       └─────────┘                                              │
│                                                                 │
│  ✅ Simple, no code changes       ✅ Near-infinite scale        │
│  ✅ No distributed complexity     ✅ Fault tolerant             │
│  ❌ Hardware limits               ✅ Cost-effective at scale    │
│  ❌ Single point of failure       ❌ More complex architecture  │
│  ❌ Expensive at high end         ❌ Requires stateless design  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### When to Use Each

| Scenario | Recommended Approach |
|----------|---------------------|
| Early startup, simple app | Vertical (start simple) |
| Database scaling | Vertical first, then read replicas |
| Web servers | Horizontal (stateless) |
| High availability requirement | Horizontal (redundancy) |
| Unpredictable traffic | Horizontal (auto-scale) |
| Cost optimization | Horizontal (many small instances) |

---

## 🏗️ Stateless Architecture

### Stateless vs Stateful

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATEFUL VS STATELESS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stateful Server:                                               │
│  ─────────────────────────────────────────                      │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │    Server 1      │                                          │
│  │ ┌──────────────┐ │   User A must always                     │
│  │ │ User A data  │ │   hit Server 1!                          │
│  │ │ User B data  │ │                                          │
│  │ └──────────────┘ │                                          │
│  └──────────────────┘                                          │
│                                                                 │
│  ❌ Sticky sessions required                                    │
│  ❌ Can't freely scale/restart                                  │
│  ❌ Session lost if server dies                                 │
│                                                                 │
│  Stateless Server:                                              │
│  ─────────────────────────────────────────                      │
│                                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐                              │
│  │Server 1│ │Server 2│ │Server 3│   Any server can             │
│  │(no     │ │(no     │ │(no     │   handle any request!        │
│  │ state) │ │ state) │ │ state) │                              │
│  └───┬────┘ └───┬────┘ └───┬────┘                              │
│      │          │          │                                    │
│      └──────────┼──────────┘                                    │
│                 ▼                                               │
│          ┌───────────┐                                         │
│          │  Shared   │   State stored externally               │
│          │  Storage  │   (Redis, Database)                     │
│          └───────────┘                                         │
│                                                                 │
│  ✅ Easy horizontal scaling                                     │
│  ✅ Any server handles any request                              │
│  ✅ Servers can restart freely                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Making Services Stateless

```csharp
// ❌ STATEFUL: Session stored in server memory
public class StatefulController
{
    private static Dictionary<string, UserSession> _sessions = new();
    
    public void Login(string userId)
    {
        _sessions[userId] = new UserSession { /* ... */ };
        // Problem: Only this server has this session!
    }
}

// ✅ STATELESS: Session stored in Redis
public class StatelessController
{
    private readonly IDistributedCache _cache;
    
    public async Task Login(string userId)
    {
        await _cache.SetStringAsync(
            $"session:{userId}", 
            JsonSerializer.Serialize(new UserSession { /* ... */ }),
            new DistributedCacheEntryOptions 
            { 
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
            }
        );
        // Any server can now read this session!
    }
}
```

### What to Externalize

| Local State | Externalize To |
|-------------|----------------|
| User sessions | Redis, database |
| File uploads | S3, blob storage |
| Caches | Redis, Memcached |
| Configuration | Config service, environment vars |
| Scheduled tasks | Centralized scheduler |

---

## ⚖️ Auto-Scaling

### Scaling Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTO-SCALING TRIGGERS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CPU-Based:                                                     │
│  ─────────────────────────────────────────                      │
│  Scale up when: Average CPU > 70%                               │
│  Scale down when: Average CPU < 30%                             │
│                                                                 │
│  Memory-Based:                                                  │
│  ─────────────────────────────────────────                      │
│  Scale up when: Memory usage > 80%                              │
│  Scale down when: Memory usage < 40%                            │
│                                                                 │
│  Request-Based:                                                 │
│  ─────────────────────────────────────────                      │
│  Scale up when: Requests per instance > 1000/min                │
│  Scale down when: Requests per instance < 200/min               │
│                                                                 │
│  Queue-Based:                                                   │
│  ─────────────────────────────────────────                      │
│  Scale up when: Queue depth > 100 messages                      │
│  Scale down when: Queue depth < 10 messages                     │
│                                                                 │
│  Custom Metrics:                                                │
│  ─────────────────────────────────────────                      │
│  Scale based on business metrics (orders/sec, etc.)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Scaling Policies

```yaml
# AWS Auto Scaling Group Example
AutoScalingGroup:
  MinSize: 2                    # Always at least 2 for HA
  MaxSize: 20                   # Cost control
  DesiredCapacity: 4            # Starting point

ScalingPolicy:
  # Target Tracking: Maintain target metric value
  TargetTrackingConfiguration:
    TargetValue: 70.0           # Target 70% CPU
    PredefinedMetricSpecification:
      PredefinedMetricType: ASGAverageCPUUtilization
    ScaleInCooldown: 300        # Wait 5 min before scale down
    ScaleOutCooldown: 60        # Scale up faster (1 min)

  # Step Scaling: Different actions for different thresholds
  StepScalingConfiguration:
    - MetricIntervalLowerBound: 0
      MetricIntervalUpperBound: 20
      ScalingAdjustment: 1      # Add 1 instance
    - MetricIntervalLowerBound: 20
      MetricIntervalUpperBound: 50
      ScalingAdjustment: 2      # Add 2 instances
    - MetricIntervalLowerBound: 50
      ScalingAdjustment: 3      # Add 3 instances
```

### Scheduled Scaling

```yaml
# Scale up before known traffic spike
ScheduledAction:
  - Name: "MorningRushScaleUp"
    Schedule: "cron(0 8 * * MON-FRI)"  # 8 AM weekdays
    DesiredCapacity: 10
    
  - Name: "EveningScaleDown"
    Schedule: "cron(0 22 * * *)"        # 10 PM daily
    DesiredCapacity: 4
    
  - Name: "BlackFridayPrep"
    Schedule: "cron(0 0 25 11 *)"       # Nov 25 midnight
    DesiredCapacity: 50
```

---

## 🔄 Scaling Patterns

### Pattern 1: Clone Services

Most common for stateless web servers.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLONE SERVICES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    Load Balancer                                │
│                         │                                       │
│         ┌───────────────┼───────────────┐                       │
│         ▼               ▼               ▼                       │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐                   │
│    │ Clone 1 │    │ Clone 2 │    │ Clone 3 │                   │
│    │ (same   │    │ (same   │    │ (same   │                   │
│    │  code)  │    │  code)  │    │  code)  │                   │
│    └─────────┘    └─────────┘    └─────────┘                   │
│                                                                 │
│  All instances run identical code                               │
│  Request can go to any instance                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Pattern 2: Functional Decomposition

Split by feature/function into microservices.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUNCTIONAL DECOMPOSITION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Monolith:                     Microservices:                   │
│  ─────────                     ──────────────                   │
│                                                                 │
│  ┌─────────────┐              ┌─────────┐ ┌─────────┐          │
│  │   All       │              │  User   │ │  Order  │          │
│  │ Features    │     →        │ Service │ │ Service │          │
│  │  in One     │              └─────────┘ └─────────┘          │
│  └─────────────┘                                               │
│                               ┌─────────┐ ┌─────────┐          │
│                               │ Payment │ │  Email  │          │
│                               │ Service │ │ Service │          │
│                               └─────────┘ └─────────┘          │
│                                                                 │
│  Scale each service independently based on its needs            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Pattern 3: Data Partitioning

Split by data (customer, region, etc.).

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PARTITIONING                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Router/Shard Manager                                           │
│         │                                                       │
│   ┌─────┼─────┬─────────┐                                       │
│   ▼     ▼     ▼         ▼                                       │
│ ┌────┐┌────┐┌────┐   ┌────┐                                    │
│ │ A-F││ G-L││ M-R│...│ W-Z│   By customer last name            │
│ └────┘└────┘└────┘   └────┘                                    │
│                                                                 │
│ ┌────┐┌────┐┌────┐                                             │
│ │ US ││ EU ││Asia│              By region                      │
│ └────┘└────┘└────┘                                             │
│                                                                 │
│ ┌────┐┌────┐┌────┐                                             │
│ │Free││ Pro││Ent.│              By tier                        │
│ └────┘└────┘└────┘                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📈 Scaling Different Components

### Web Servers (Easy)

```
Strategy: Horizontal scaling with load balancer
─────────────────────────────────────────────

1. Make stateless (externalize sessions)
2. Put behind load balancer
3. Auto-scale based on CPU/requests
4. Use health checks

Typical: 5-100+ instances
```

### Databases (Harder)

```
Strategy: Vertical first, then read replicas, then sharding
─────────────────────────────────────────────

Phase 1: Vertical scaling (bigger instance)
Phase 2: Read replicas (for read-heavy loads)
Phase 3: Caching layer (Redis in front)
Phase 4: Sharding (distribute data)

See: Database Scaling doc for details
```

### Caches (Moderate)

```
Strategy: Cluster or consistent hashing
─────────────────────────────────────────────

Redis Cluster: Automatic sharding
Memcached: Add more nodes with consistent hashing

Typical: 3-20+ nodes
```

### Message Queues (Moderate)

```
Strategy: Add partitions/consumers
─────────────────────────────────────────────

Kafka: Add partitions to topic
       Add consumers (up to partition count)
       
SQS: Just add more consumers

Scale consumers based on queue depth
```

---

## ⚠️ Scaling Challenges

### The Database Bottleneck

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE BOTTLENECK                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Common scenario:                                               │
│  ─────────────────────────────────────────                      │
│                                                                 │
│       ┌────────────────────────────┐                           │
│       │    Load Balancer           │                           │
│       └────────────┬───────────────┘                           │
│            ┌───────┼───────┐                                    │
│            ▼       ▼       ▼                                    │
│         ┌────┐  ┌────┐  ┌────┐    ← Easy to scale              │
│         │App1│  │App2│  │App3│                                 │
│         └──┬─┘  └──┬─┘  └──┬─┘                                 │
│            │       │       │                                    │
│            └───────┼───────┘                                    │
│                    ▼                                            │
│              ┌──────────┐                                      │
│              │ Database │  ← BOTTLENECK!                       │
│              └──────────┘                                      │
│                                                                 │
│  Solution: Add caching, read replicas, eventually shard        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cold Start Problems

```
Issue: New instances take time to warm up

Solutions:
1. Warm-up endpoint: Call heavy paths after deploy
2. Pre-provisioned instances: Keep spare capacity
3. Graceful load introduction: Slow traffic increase
4. Pre-compiled code: AOT compilation, no JIT warmup
```

### Scaling Delays

```
Issue: Auto-scaling isn't instant

Timeline:
- CloudWatch detects high CPU:        60 seconds
- Scaling decision made:              30 seconds  
- New instance launched:              30-60 seconds
- Instance passes health check:       30-60 seconds
- Added to load balancer:             Immediate
───────────────────────────────────────────────
Total: 2-4 minutes to add capacity

Solutions:
1. Predictive scaling (scale before load)
2. Over-provision during uncertain times
3. Set aggressive scale-out thresholds
```

---

## 📋 Scaling Checklist

### Before Scaling

- [ ] Profile your application - where are bottlenecks?
- [ ] Make services stateless
- [ ] Add caching for expensive operations
- [ ] Optimize database queries and add indexes
- [ ] Consider CDN for static content

### Infrastructure Setup

- [ ] Load balancer configured
- [ ] Health checks in place
- [ ] Auto-scaling policies defined
- [ ] Monitoring and alerts configured
- [ ] Database connection pooling

### During Scaling

- [ ] Monitor instance health
- [ ] Watch for cascading failures
- [ ] Check database connection limits
- [ ] Verify session handling works
- [ ] Test failover scenarios

---

## ✅ Key Takeaways

1. **Start vertical, go horizontal** - Simpler is better initially
2. **Design stateless from day one** - Much easier than retrofitting
3. **Scale the bottleneck** - Usually the database
4. **Use caching aggressively** - Often better than more servers
5. **Auto-scale thoughtfully** - Set sensible min/max/cooldowns
6. **Monitor everything** - Can't scale what you can't measure
7. **Plan for failure** - Scaled systems have more failure points

---

## 📚 Related Topics

- [Database Scaling](/system-design/fundamentals/11-database-scaling.md) - Replication and sharding
- [Load Balancing](/system-design/fundamentals/08-load-balancing.md) - Distributing traffic
- [Caching](/system-design/fundamentals/07-caching.md) - Reducing load
- [Consistent Hashing](/system-design/fundamentals/12-consistent-hashing.md) - Distributing data
