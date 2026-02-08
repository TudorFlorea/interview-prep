# Database Scaling

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

Databases are often the hardest component to scale because they hold state and require consistency. This guide covers the major strategies for scaling databases: vertical scaling, read replicas, sharding, and NewSQL approaches.

---

## 📊 Scaling Progression

```
┌─────────────────────────────────────────────────────────────────┐
│                DATABASE SCALING PROGRESSION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stage 1: Single Server                                         │
│  └── Vertical scaling (bigger machine)                          │
│  └── Indexing and query optimization                            │
│  └── Connection pooling                                         │
│                                                                 │
│  Stage 2: Read Replicas                                         │
│  └── Write to primary, read from replicas                       │
│  └── Handles read-heavy workloads                               │
│                                                                 │
│  Stage 3: Caching Layer                                         │
│  └── Redis/Memcached in front of database                       │
│  └── Reduces read load significantly                            │
│                                                                 │
│  Stage 4: Vertical Partitioning                                 │
│  └── Split tables into different databases                      │
│  └── e.g., Users DB, Orders DB, Analytics DB                    │
│                                                                 │
│  Stage 5: Horizontal Sharding                                   │
│  └── Split data across multiple databases                       │
│  └── Each shard holds a subset of data                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📖 Read Replicas

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    READ REPLICA ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        Application                              │
│                            │                                    │
│              ┌─────────────┴─────────────┐                      │
│              │                           │                      │
│           Writes                       Reads                    │
│              │                           │                      │
│              ▼                           ▼                      │
│      ┌─────────────┐           ┌─────────────────────┐         │
│      │   Primary   │           │   Read Replicas     │         │
│      │   (Write)   │ ─────────►│                     │         │
│      │             │  Async    │  ┌────┐ ┌────┐     │         │
│      │             │  Replic.  │  │ R1 │ │ R2 │ ... │         │
│      └─────────────┘           │  └────┘ └────┘     │         │
│                                └─────────────────────┘         │
│                                                                 │
│  Benefits:                                                      │
│  ✅ Offloads read traffic from primary                          │
│  ✅ Can have replicas in different regions                      │
│  ✅ Replicas can serve as failover                              │
│                                                                 │
│  Limitations:                                                   │
│  ❌ Replication lag (eventual consistency)                      │
│  ❌ Doesn't help with write scaling                             │
│  ❌ All data still on each server                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Replication Types

| Type | Description | Lag | Consistency |
|------|-------------|-----|-------------|
| **Async** | Primary doesn't wait for replicas | Seconds | Eventual |
| **Semi-sync** | Primary waits for 1 replica | Milliseconds | Near-real-time |
| **Sync** | Primary waits for all replicas | Zero | Strong |

### Handling Replication Lag

```csharp
// Problem: User updates profile, immediately reads stale data
public async Task<User> UpdateAndGetProfile(UpdateRequest request)
{
    await _primaryDb.UpdateUser(request);  // Writes to primary
    return await _replicaDb.GetUser(request.UserId);  // Reads stale data!
}

// Solution 1: Read-your-writes consistency
public async Task<User> UpdateAndGetProfile(UpdateRequest request)
{
    await _primaryDb.UpdateUser(request);
    return await _primaryDb.GetUser(request.UserId);  // Read from primary
}

// Solution 2: Session-based routing
// Track user's last write, route to primary if recent
public async Task<User> GetUser(string userId, DateTime? lastWrite)
{
    if (lastWrite > DateTime.UtcNow.AddSeconds(-5))
    {
        return await _primaryDb.GetUser(userId);  // Recent write, use primary
    }
    return await _replicaDb.GetUser(userId);  // Safe to use replica
}
```

---

## 🔪 Sharding (Horizontal Partitioning)

### Concept

Split data across multiple database servers, each holding a subset.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARDING ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                      Application                                │
│                          │                                      │
│                          ▼                                      │
│                  ┌───────────────┐                              │
│                  │ Shard Router  │                              │
│                  │ (determines   │                              │
│                  │ which shard)  │                              │
│                  └───────┬───────┘                              │
│               ┌──────────┼──────────┐                           │
│               ▼          ▼          ▼                           │
│          ┌────────┐ ┌────────┐ ┌────────┐                      │
│          │Shard 1 │ │Shard 2 │ │Shard 3 │                      │
│          │Users   │ │Users   │ │Users   │                      │
│          │A-H     │ │I-P     │ │Q-Z     │                      │
│          └────────┘ └────────┘ └────────┘                      │
│                                                                 │
│  Each shard is a complete database with a subset of data        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Sharding Strategies

#### 1. Range-Based Sharding

```
┌─────────────────────────────────────────────────────────────────┐
│                    RANGE-BASED SHARDING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Key: user_id (integer)                                         │
│                                                                 │
│  Shard 1: user_id 1 - 1,000,000                                 │
│  Shard 2: user_id 1,000,001 - 2,000,000                         │
│  Shard 3: user_id 2,000,001 - 3,000,000                         │
│                                                                 │
│  ✅ Easy to understand                                          │
│  ✅ Good for range queries                                      │
│  ❌ Can create hot spots (new users all go to latest shard)     │
│  ❌ Uneven distribution as data grows                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Hash-Based Sharding

```
┌─────────────────────────────────────────────────────────────────┐
│                    HASH-BASED SHARDING                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  shard_number = hash(user_id) % number_of_shards                │
│                                                                 │
│  hash("user_123") % 3 = 1  → Shard 1                            │
│  hash("user_456") % 3 = 0  → Shard 0                            │
│  hash("user_789") % 3 = 2  → Shard 2                            │
│                                                                 │
│  ✅ Even distribution                                           │
│  ✅ No hot spots                                                │
│  ❌ Range queries need all shards                               │
│  ❌ Resharding is painful (data moves on shard add/remove)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. Directory-Based Sharding

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIRECTORY-BASED SHARDING                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Lookup table determines shard location:                        │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │  Shard Lookup Table                      │                   │
│  ├───────────────┬─────────────────────────┤                   │
│  │ user_id       │ shard                   │                   │
│  ├───────────────┼─────────────────────────┤                   │
│  │ user_123      │ shard_2                 │                   │
│  │ user_456      │ shard_1                 │                   │
│  │ user_789      │ shard_3                 │                   │
│  └───────────────┴─────────────────────────┘                   │
│                                                                 │
│  ✅ Complete flexibility                                        │
│  ✅ Easy to rebalance                                           │
│  ❌ Lookup table is single point of failure                     │
│  ❌ Extra lookup on every query                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Choosing a Shard Key

| Factor | Consideration |
|--------|---------------|
| **Cardinality** | High cardinality for even distribution |
| **Access patterns** | Key should be in most queries |
| **Growth** | Key should distribute new data evenly |
| **Query patterns** | Avoid cross-shard queries |

```
Good shard keys:
─────────────────────────────────────────────
• user_id for user-centric apps
• tenant_id for multi-tenant SaaS
• geographic_region for regional data
• order_id for order processing

Bad shard keys:
─────────────────────────────────────────────
• created_date (hot spot on recent dates)
• status (only a few values)
• boolean fields (only 2 values)
```

---

## ⚠️ Sharding Challenges

### Cross-Shard Queries

```
┌─────────────────────────────────────────────────────────────────┐
│                    CROSS-SHARD QUERY PROBLEM                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Query: SELECT * FROM orders WHERE total > 100 ORDER BY date    │
│                                                                 │
│  Without sharding: Single database handles it                   │
│                                                                 │
│  With sharding:                                                 │
│  1. Query ALL shards                                            │
│  2. Collect results from each                                   │
│  3. Merge and sort in application                               │
│  4. Apply LIMIT                                                 │
│                                                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐                                  │
│  │Shard1│  │Shard2│  │Shard3│                                  │
│  └──┬───┘  └──┬───┘  └──┬───┘                                  │
│     │         │         │                                       │
│     └─────────┼─────────┘                                       │
│               ▼                                                 │
│       ┌─────────────┐                                          │
│       │ Application │ ← Merge results here                     │
│       │   (slow!)   │                                          │
│       └─────────────┘                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Solutions:**
- Design schema to avoid cross-shard queries
- Denormalize data
- Use search index (Elasticsearch) for complex queries

### Cross-Shard Transactions

```
Problem: Order and Inventory on different shards

Shard 1 (Orders): Create order
Shard 2 (Inventory): Reduce stock

If one fails, data is inconsistent!

Solutions:
─────────────────────────────────────────────

1. Saga Pattern: Compensating transactions
   - Create order → Reduce inventory
   - If inventory fails → Cancel order (compensate)

2. Two-Phase Commit (2PC):
   - Phase 1: All shards prepare
   - Phase 2: All shards commit
   - Slow and blocking, rarely used

3. Avoid cross-shard transactions:
   - Keep related data on same shard
   - Use eventual consistency
```

### Resharding

```
When you need to change shard count:
─────────────────────────────────────────────

Adding Shard 4 to 3 existing shards:

Before: hash(key) % 3
After:  hash(key) % 4

Many keys move to different shards!

Solutions:
─────────────────────────────────────────────

1. Consistent Hashing: Minimizes data movement
   (See: Consistent Hashing doc)

2. Virtual Shards: Over-partition initially
   - Create 256 virtual shards
   - Distribute across 4 physical servers
   - Adding server = move virtual shards, not data

3. Dual-write migration:
   - Write to old and new shard
   - Migrate reads gradually
   - Complex but minimizes downtime
```

---

## 🔀 Partitioning Strategies

### Vertical Partitioning

Split tables into different databases by domain.

```
┌─────────────────────────────────────────────────────────────────┐
│                    VERTICAL PARTITIONING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Before: One database with all tables                           │
│  ┌─────────────────────────────────────────┐                   │
│  │  users, profiles, orders, products,     │                   │
│  │  inventory, reviews, analytics...       │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  After: Domain-specific databases                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ User DB  │  │ Order DB │  │ Product  │                      │
│  │ users    │  │ orders   │  │ DB       │                      │
│  │ profiles │  │ payments │  │ products │                      │
│  │ sessions │  │ shipping │  │ inventory│                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                 │
│  ✅ Natural fit for microservices                               │
│  ✅ Each DB optimized for its workload                          │
│  ✅ Independent scaling                                         │
│  ❌ JOINs across databases not possible                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Functional Partitioning

Separate OLTP (transactional) from OLAP (analytical).

```
┌─────────────────────────────────────────────────────────────────┐
│                    OLTP vs OLAP SEPARATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐           ┌─────────────────┐                 │
│  │ OLTP        │   ETL     │ OLAP            │                 │
│  │ (Primary)   │ ───────►  │ (Data Warehouse)│                 │
│  │             │           │                 │                 │
│  │ PostgreSQL  │           │ Snowflake       │                 │
│  │ Fast writes │           │ Complex queries │                 │
│  │ Real-time   │           │ Historical      │                 │
│  └─────────────┘           └─────────────────┘                 │
│        ▲                           ▲                           │
│        │                           │                           │
│   Applications               Analytics/BI                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Database Scaling Architectures

### Primary-Replica with Caching

```
┌─────────────────────────────────────────────────────────────────┐
│                    TYPICAL PRODUCTION SETUP                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                       Application                               │
│                           │                                     │
│            ┌──────────────┼──────────────┐                      │
│            │              │              │                      │
│            ▼              ▼              ▼                      │
│      ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│      │  Cache   │   │ Primary  │   │ Replicas │                │
│      │ (Redis)  │   │ (Write)  │   │ (Read)   │                │
│      └──────────┘   └────┬─────┘   └──────────┘                │
│                          │              ▲                       │
│                          │──────────────┘                       │
│                        Replication                              │
│                                                                 │
│  Read Path:                                                     │
│  1. Check cache                                                 │
│  2. Cache miss → Read replica                                   │
│  3. Populate cache                                              │
│                                                                 │
│  Write Path:                                                    │
│  1. Write to primary                                            │
│  2. Invalidate cache                                            │
│  3. Replicas update async                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Region Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-REGION DATABASE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│       US-East (Primary)              EU-West (Replica)          │
│      ┌─────────────────┐            ┌─────────────────┐        │
│      │  ┌───────────┐  │            │  ┌───────────┐  │        │
│      │  │  Primary  │──│────────────│─►│  Replica  │  │        │
│      │  │   (RW)    │  │   Async    │  │   (RO)    │  │        │
│      │  └───────────┘  │   Replic.  │  └───────────┘  │        │
│      │       │         │            │                  │        │
│      │       ▼         │            │                  │        │
│      │  ┌───────────┐  │            │                  │        │
│      │  │  Replica  │  │            │                  │        │
│      │  │   (RO)    │  │            │                  │        │
│      │  └───────────┘  │            │                  │        │
│      └─────────────────┘            └─────────────────┘        │
│                                                                 │
│  US users → US-East primary (low latency)                       │
│  EU users → EU-West replica for reads                           │
│             US-East for writes (higher latency)                 │
│                                                                 │
│  For true multi-region writes: Consider CockroachDB, Spanner    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🆕 NewSQL Databases

Databases designed for distributed transactions with SQL interface.

| Database | Highlights | Use Case |
|----------|------------|----------|
| **CockroachDB** | PostgreSQL-compatible, geo-distributed | Multi-region, strong consistency |
| **TiDB** | MySQL-compatible, HTAP | Mixed OLTP/OLAP |
| **Google Spanner** | Global consistency, managed | Large enterprise |
| **YugabyteDB** | PostgreSQL/Cassandra-compatible | Cloud-native SQL |

```
NewSQL Advantages:
─────────────────────────────────────────────
✅ Automatic sharding
✅ Distributed transactions
✅ SQL interface (familiar)
✅ Horizontal scaling
✅ Strong consistency possible

Trade-offs:
─────────────────────────────────────────────
❌ Higher latency than single-node
❌ More complex operations
❌ Younger ecosystem
❌ Cost (especially managed)
```

---

## ✅ Key Takeaways

1. **Start simple** - Vertical scaling and optimization first
2. **Add read replicas** - For read-heavy workloads
3. **Cache aggressively** - Reduce database load
4. **Shard as last resort** - Adds significant complexity
5. **Choose shard key carefully** - Impacts all future queries
6. **Plan for cross-shard queries** - They're expensive
7. **Consider NewSQL** - If starting fresh at scale

---

## 📚 Related Topics

- [Databases](/system-design/fundamentals/06-databases.md) - Database fundamentals
- [Consistent Hashing](/system-design/fundamentals/12-consistent-hashing.md) - Better sharding
- [CAP Theorem](/system-design/fundamentals/13-cap-theorem.md) - Consistency trade-offs
- [Caching](/system-design/fundamentals/07-caching.md) - Reducing database load
