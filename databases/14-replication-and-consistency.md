# Replication and Consistency

[← Back to Index](00-index.md)

---

## Overview

Replication copies data across multiple database servers for high availability, disaster recovery, and read scaling. Understanding replication topologies and consistency trade-offs is essential for building reliable distributed systems.

### When This Matters Most
- High availability requirements
- Disaster recovery planning
- Read-heavy workload scaling
- Geographic distribution

---

## Replication Basics

### Why Replicate?

| Goal | How Replication Helps |
|------|----------------------|
| **High Availability** | Failover to replica if primary fails |
| **Read Scaling** | Distribute read queries across replicas |
| **Disaster Recovery** | Copy in different datacenter survives disasters |
| **Low Latency** | Geo-replicas closer to users |
| **Backup** | Replica can be snapshotted without impacting primary |

### Replication Topologies

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PRIMARY-REPLICA (Master-Slave)                                          │
│                                                                          │
│         Writes                                                           │
│           │                                                              │
│           ▼                                                              │
│     ┌──────────┐                                                         │
│     │ PRIMARY  │─────────┬────────────┐                                  │
│     │ (Master) │         │            │                                  │
│     └──────────┘    Replication   Replication                            │
│                          │            │                                  │
│                    ┌─────▼────┐  ┌────▼─────┐                            │
│                    │ REPLICA 1│  │ REPLICA 2│                            │
│                    │ (Slave)  │  │ (Slave)  │                            │
│                    └──────────┘  └──────────┘                            │
│                          ▲            ▲                                  │
│                          └────────────┘                                  │
│                              Reads                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  MULTI-PRIMARY (Master-Master)                                           │
│                                                                          │
│     ┌──────────┐◄────────────────►┌──────────┐                          │
│     │PRIMARY 1 │   Bi-directional │PRIMARY 2 │                          │
│     │          │   Replication    │          │                          │
│     └──────────┘                  └──────────┘                          │
│          │                             │                                 │
│      Writes/Reads                 Writes/Reads                           │
│                                                                          │
│  ⚠️ Conflict resolution required!                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Synchronous vs Asynchronous Replication

### Asynchronous Replication (Default)

```
Primary                         Replica
   │                               │
   │ 1. COMMIT                     │
   │◄── (returns immediately)      │
   │                               │
   │ 2. Stream WAL ──────────────► │
   │                               │
   │                    3. Apply   │
   │                               │

Pros: Fast commits, no network latency
Cons: Replica may lag, data loss on failure
```

### Synchronous Replication

```
Primary                         Replica
   │                               │
   │ 1. Prepare COMMIT             │
   │                               │
   │ 2. Stream WAL ──────────────► │
   │                               │
   │                    3. Flush   │
   │                               │
   │ 4. ACK ◄───────────────────── │
   │                               │
   │ 5. COMMIT                     │
   │◄── (returns to client)        │

Pros: No data loss, strong consistency
Cons: Higher latency, blocked by slow replica
```

```sql
-- PostgreSQL: Configure synchronous replication
-- On primary:
ALTER SYSTEM SET synchronous_standby_names = 'replica1';

-- Check sync status
SELECT 
    application_name,
    sync_state,  -- 'sync', 'async', 'potential'
    sent_lsn,
    write_lsn,
    replay_lsn
FROM pg_stat_replication;
```

---

## Replication Lag

The delay between a write on primary and its availability on replica.

### Measuring Lag

```sql
-- PostgreSQL: Check lag on primary
SELECT 
    client_addr,
    application_name,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
    EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds
FROM pg_stat_replication;

-- MySQL: Check on replica
SHOW SLAVE STATUS\G
-- Look at: Seconds_Behind_Master

-- PostgreSQL: Check on replica
SELECT 
    CASE WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn()
         THEN 0
         ELSE EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp())
    END AS replication_lag_seconds;
```

### Handling Lag in Applications

```python
# Pattern 1: Read-your-writes consistency
def create_order(customer_id, items):
    # Write to primary
    order = primary_db.execute("INSERT INTO orders ... RETURNING *")
    
    # Option A: Subsequent reads from primary (for this session)
    # Option B: Pass order_id to client, they fetch with explicit primary query
    return order

# Pattern 2: Causal consistency
def get_order_with_items(order_id, min_version=None):
    # If we know minimum version, wait for replica to catch up
    if min_version:
        while replica_db.query("SELECT version FROM ...") &lt; min_version:
            time.sleep(0.1)
    
    return replica_db.query("SELECT * FROM orders WHERE id = %s", order_id)

# Pattern 3: Lag-aware routing
def get_database_connection(consistency='eventual'):
    if consistency == 'strong':
        return primary_db
    elif consistency == 'eventual':
        # Check which replicas are caught up
        available = [r for r in replicas if r.lag_seconds &lt; 5]
        return random.choice(available) if available else primary_db
```

---

## Failover

What happens when the primary fails.

### Automatic Failover

```
                Before Failure                    After Failover
                
                ┌──────────┐                     ┌──────────┐
  Writes ──────►│ PRIMARY  │        Writes ─────►│ REPLICA 1│ (promoted)
                └────┬─────┘                     └────┬─────┘
                     │                                │
              ┌──────┴──────┐                  ┌──────┴──────┐
              ▼             ▼                  ▼             ▼
        ┌──────────┐  ┌──────────┐       ┌──────────┐  ┌──────────┐
        │ REPLICA 1│  │ REPLICA 2│       │ NEW      │  │ REPLICA 2│
        └──────────┘  └──────────┘       │ REPLICA  │  └──────────┘
                                         └──────────┘
```

**Failover Steps:**
1. Detect primary failure (heartbeat timeout)
2. Elect new primary (most up-to-date replica)
3. Promote replica to primary
4. Reconfigure other replicas to follow new primary
5. Update application connection strings

### Failover Tools

| Database | Tool | Description |
|----------|------|-------------|
| PostgreSQL | Patroni | Consensus-based HA with etcd/ZooKeeper |
| PostgreSQL | pg_auto_failover | Microsoft's HA extension |
| MySQL | MySQL Router | Connection routing and failover |
| MySQL | Orchestrator | Topology management and failover |

```yaml
# Patroni configuration example
scope: my-cluster
name: postgres1

restapi:
  listen: 0.0.0.0:8008
  
etcd:
  hosts: localhost:2379

bootstrap:
  dcs:
    postgresql:
      parameters:
        max_connections: 100

postgresql:
  listen: 0.0.0.0:5432
  data_dir: /var/lib/postgresql/data
```

---

## The CAP Theorem

You can only have two of three:

```
         CONSISTENCY
              △
             ╱ ╲
            ╱   ╲
           ╱     ╲
          ╱  CA   ╲     
         ╱         ╲
        ╱           ╲
       ╱      ┌──────╲
      ╱   CP  │       ╲
     ╱        │   AP   ╲
    ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔
  AVAILABILITY      PARTITION
                    TOLERANCE

CA (no partition tolerance): Single node systems
CP (sacrifice availability): Pause until partition heals
AP (sacrifice consistency): Allow stale reads during partition
```

**In practice (network partitions happen):**
- **CP Systems**: PostgreSQL synchronous replication, Spanner
- **AP Systems**: Cassandra, DynamoDB (with eventual consistency)

---

## Consistency Models

| Model | Guarantee | Example |
|-------|-----------|---------|
| **Strong** | Read sees latest write | Synchronous replication |
| **Sequential** | All see same order | Single-leader replication |
| **Causal** | Cause precedes effect | Writes with timestamps |
| **Eventual** | Eventually converges | Async replication |

### Read Consistency Levels

```sql
-- PostgreSQL: Consistency via synchronous_commit
SET synchronous_commit = ON;   -- Wait for replica (strong)
SET synchronous_commit = OFF;  -- Async commit (eventual)

-- Application-level read consistency
-- Route reads appropriately:
def read_order(order_id, consistency='eventual'):
    if consistency == 'strong':
        return primary.query("SELECT * FROM orders WHERE id = %s", order_id)
    else:
        return any_replica.query("SELECT * FROM orders WHERE id = %s", order_id)
```

---

## Multi-Region Replication

### Geographic Distribution

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MULTI-REGION SETUP                                                      │
│                                                                          │
│   US-EAST (Primary)                           EU-WEST (Replica)          │
│  ┌──────────────────┐                       ┌──────────────────┐        │
│  │                  │    Async Replication  │                  │        │
│  │  ┌──────────┐   │  ─────────────────────►│  ┌──────────┐   │        │
│  │  │ Primary  │   │     ~100ms latency    │  │ Replica  │   │        │
│  │  └──────────┘   │                       │  └──────────┘   │        │
│  │                  │                       │                  │        │
│  └──────────────────┘                       └──────────────────┘        │
│                                                                          │
│  US users:                                  EU users:                    │
│  - Write to US-EAST                         - Read from EU-WEST          │
│  - Read from US-EAST                        - Write to US-EAST (or local)│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Conflict Resolution (Multi-Primary)

When two regions accept writes:

```python
# Last-Write-Wins (LWW)
# Each write has timestamp, latest wins
{
    "user_id": 123,
    "name": "Alice",
    "updated_at": "2024-01-15T10:30:00Z"  # Timestamp determines winner
}

# Merge (for compatible data types)
# Example: counter, add sets
{
    "cart_items": ["item1", "item2"],  # CRDT set - union
    "view_count": 150  # CRDT counter - sum of increments
}

# Custom resolution
def resolve_conflict(region_a_value, region_b_value):
    # Business logic determines winner
    # Example: Prefer the version with more items
    return max([region_a_value, region_b_value], key=lambda x: len(x['items']))
```

---

## PostgreSQL Replication Setup

### Streaming Replication

```bash
# On Primary (postgresql.conf)
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10

# Create replication user
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secret';

# pg_hba.conf
host replication replicator replica_ip/32 md5

# On Replica
pg_basebackup -h primary_ip -D /var/lib/postgresql/data -U replicator -P -R

# Start replica - it connects automatically using primary_conninfo in postgresql.auto.conf
```

### Logical Replication

```sql
-- On Primary: Create publication
CREATE PUBLICATION my_pub FOR TABLE orders, customers;

-- On Replica: Create subscription
CREATE SUBSCRIPTION my_sub
    CONNECTION 'host=primary dbname=mydb user=replicator password=secret'
    PUBLICATION my_pub;

-- Check status
SELECT * FROM pg_stat_subscription;
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Monitor replication lag**: Alert before it becomes a problem
- **Test failover regularly**: Ensure it works when needed
- **Use connection pooling**: Handle connection string changes gracefully
- **Design for eventual consistency**: Most applications can tolerate it
- **Keep replicas close**: Network latency affects sync replication

### ❌ Avoid:
- **Ignoring split-brain**: Both nodes think they're primary
- **Sync replication across continents**: Latency kills performance
- **Writing to replicas**: Causes divergence (unless multi-primary)
- **Assuming zero lag**: Always code for potential lag

---

## Exercises

### Exercise 1: Replication Design 🟢

**Scenario:** An e-commerce site needs:
- 99.9% uptime
- Read scaling for product catalog (heavy reads)
- Acceptable: 5-second lag for product views
- Required: Strong consistency for checkout

Design the replication topology.

<details>
<summary>✅ Solution</summary>

```
                    ┌──────────────┐
  Writes & ────────►│   PRIMARY    │
  Checkout          └──────┬───────┘
                           │
              Async Replication
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ REPLICA 1  │  │ REPLICA 2  │  │ REPLICA 3  │
    │ (products) │  │ (products) │  │ (standby)  │
    └────────────┘  └────────────┘  └────────────┘
          ▲              ▲
          │              │
       Product Reads (load balanced)
```

**Configuration:**
```sql
-- Primary
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET max_wal_senders = 5;
ALTER SYSTEM SET synchronous_commit = 'on';  -- For checkouts

-- Application routing:
class DatabaseRouter:
    def route(self, query_type, table):
        if query_type == 'write':
            return self.primary
        if table == 'orders' or query_type == 'checkout':
            return self.primary  # Strong consistency
        if table == 'products':
            # Load balance reads across replicas
            healthy = [r for r in self.replicas if r.lag_seconds &lt; 5]
            return random.choice(healthy)
        return self.primary
```

**Failover:**
- Replica 3 is hot standby for failover
- Use Patroni for automatic promotion
- DNS or load balancer update for connection routing

</details>

---

### Exercise 2: Lag Analysis 🟡

**Scenario:** Users report seeing stale data. Logs show:
- Primary: 1000 writes/second
- Replica lag: fluctuating 0-30 seconds
- Replica CPU: 40%
- Network: 100Mbps, 20% utilized

Diagnose and fix the issue.

<details>
<summary>✅ Solution</summary>

**Diagnosis Steps:**

```sql
-- 1. Check replication slot lag on primary
SELECT 
    slot_name,
    pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_bytes
FROM pg_replication_slots;

-- 2. Check replay rate on replica
SELECT 
    pg_last_wal_receive_lsn(),
    pg_last_wal_replay_lsn(),
    pg_last_xact_replay_timestamp();

-- 3. Check for long-running queries on replica blocking replay
SELECT pid, now() - query_start AS duration, query 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY duration DESC;

-- 4. Check I/O on replica
-- Linux: iostat -x 1
```

**Common Causes & Fixes:**

1. **Long-running queries on replica block replay:**
```sql
-- Fix: Set hot_standby_feedback or statement timeout
ALTER SYSTEM SET hot_standby_feedback = on;
ALTER SYSTEM SET statement_timeout = '30s';
```

2. **Slow I/O on replica:**
```sql
-- Replica might need SSD or more IOPS
-- Check: replica writes all WAL + replays = 2x I/O
```

3. **High transaction rate needs more parallelism:**
```sql
-- Increase parallel apply workers (PostgreSQL 15+)
ALTER SYSTEM SET max_parallel_apply_workers_per_subscription = 4;
```

4. **Heavy indexes causing slow apply:**
```sql
-- Consider: fewer indexes on replica
-- Or: use logical replication to select tables/columns
```

**Application-Level Fixes:**
```python
# Route time-sensitive reads to primary
def get_order(order_id, just_created=False):
    if just_created:
        return primary_db.query("SELECT * FROM orders WHERE id = %s", order_id)
    return replica_db.query("SELECT * FROM orders WHERE id = %s", order_id)
```

</details>

---

### Exercise 3: Multi-Region Design 🔴

**Scenario:** Design a database architecture for a global SaaS platform:
- Users in US, EU, and Asia-Pacific
- Data must stay in region for compliance (GDPR for EU)
- Need 99.99% availability
- Acceptable latency: &lt;100ms for reads, &lt;500ms for writes

<details>
<summary>✅ Solution</summary>

**Architecture: Regional Primaries with Selective Sync**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MULTI-REGION ARCHITECTURE                                               │
│                                                                          │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐        │
│  │   US-EAST      │    │    EU-WEST     │    │   APAC-TOKYO   │        │
│  │                │    │                │    │                │        │
│  │ ┌──────────┐   │    │ ┌──────────┐   │    │ ┌──────────┐   │        │
│  │ │ Primary  │   │    │ │ Primary  │   │    │ │ Primary  │   │        │
│  │ │  (US)    │   │    │ │  (EU)    │   │    │ │ (APAC)   │   │        │
│  │ └────┬─────┘   │    │ └────┬─────┘   │    │ └────┬─────┘   │        │
│  │      │         │    │      │         │    │      │         │        │
│  │ ┌────▼─────┐   │    │ ┌────▼─────┐   │    │ ┌────▼─────┐   │        │
│  │ │ Replica  │   │    │ │ Replica  │   │    │ │ Replica  │   │        │
│  │ │  (HA)    │   │    │ │  (HA)    │   │    │ │  (HA)    │   │        │
│  │ └──────────┘   │    │ └──────────┘   │    │ └──────────┘   │        │
│  │                │    │                │    │                │        │
│  └───────┬────────┘    └───────┬────────┘    └───────┬────────┘        │
│          │                     │                     │                  │
│          │      Global Metadata Sync (async)         │                  │
│          └─────────────────────┼─────────────────────┘                  │
│                                │                                         │
│                    ┌───────────▼───────────┐                            │
│                    │ GLOBAL METADATA DB    │                            │
│                    │ (user→region mapping) │                            │
│                    └───────────────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data Partitioning:**

```sql
-- Each region has:
-- 1. Local customer data (stays in region)
-- 2. Reference data (replicated from global)

-- US-EAST tables:
CREATE TABLE customers_us (
    customer_id UUID PRIMARY KEY,
    email VARCHAR(255),
    region VARCHAR(10) DEFAULT 'US',
    data JSONB
);

-- Global metadata (replicated everywhere, read-only copies)
CREATE TABLE products (
    product_id UUID PRIMARY KEY,
    name VARCHAR(255),
    -- Global product catalog
);
```

**Routing Logic:**

```python
REGION_DATABASES = {
    'US': {'primary': 'us-east.db', 'replica': 'us-east-replica.db'},
    'EU': {'primary': 'eu-west.db', 'replica': 'eu-west-replica.db'},
    'APAC': {'primary': 'apac-tokyo.db', 'replica': 'apac-replica.db'},
}

def get_user_region(user_id):
    # Cached globally
    return global_metadata_db.query(
        "SELECT region FROM user_regions WHERE user_id = %s", user_id
    )

def get_database(user_id, write=False):
    region = get_user_region(user_id)
    dbs = REGION_DATABASES[region]
    return dbs['primary'] if write else random.choice([dbs['primary'], dbs['replica']])
```

**Cross-Region Queries:**

```python
def get_global_analytics():
    """Fan-out to all regions, aggregate."""
    results = []
    for region, dbs in REGION_DATABASES.items():
        regional_data = dbs['replica'].query(
            "SELECT COUNT(*) as users, SUM(revenue) as revenue FROM customers"
        )
        results.append({'region': region, **regional_data})
    return results
```

**Failover:**

```python
def handle_region_failure(failed_region):
    # 1. Users temporarily get errors (acceptable for 99.99%)
    # 2. In-region replica promoted (automated via Patroni)
    # 3. If entire region down:
    #    - Route to nearest region (degraded mode)
    #    - Or: Show "region unavailable" message
    #    - Data stays safe in remaining regions' replicas
    pass
```

**GDPR Compliance:**

```sql
-- EU data never leaves EU region
-- Only anonymized aggregates cross regions
-- User deletion cascade:
DELETE FROM customers_eu WHERE customer_id = ?;
-- Automatically removes from EU primary and replicas
-- No PII in global metadata
```

</details>

---

## Key Takeaways

- 🔄 **Async replication**: Faster but may lose data on failure
- ⏱️ **Sync replication**: Safe but higher latency
- 📏 **Replication lag**: Always exists with async, design for it
- 🔀 **Failover planning**: Test regularly, automate where possible
- 🌐 **CAP theorem**: Choose consistency or availability during partitions
- 🗺️ **Multi-region**: Complex but necessary for global applications

---

## Related Topics

- [Partitioning and Sharding](13-partitioning-and-sharding.md) - Data distribution
- [Transactions and ACID](11-transactions-and-acid.md) - Consistency in single node
- [Database Internals](15-database-internals.md) - How WAL replication works
