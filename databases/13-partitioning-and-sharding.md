# Partitioning and Sharding

[← Back to Index](/databases/00-index.md)

---

## Overview

When tables grow to billions of rows or terabytes of data, standard optimization techniques aren't enough. Partitioning and sharding are strategies for dividing data to improve performance, manageability, and scalability.

### Key Difference

| Strategy | Scope | Location | Use Case |
|----------|-------|----------|----------|
| **Partitioning** | Single database | Same server | Manageability, query performance |
| **Sharding** | Multiple databases | Different servers | Horizontal scaling, capacity |

---

## Partitioning

### Types of Partitioning

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PARTITIONING TYPES                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  RANGE: By value ranges                 LIST: By discrete values         │
│  ┌─────────────────────────┐           ┌─────────────────────────┐      │
│  │ 2022 │ 2023 │ 2024 │    │           │ US  │ EU  │ APAC │ ... │      │
│  └─────────────────────────┘           └─────────────────────────┘      │
│                                                                          │
│  HASH: By hash of key                   COMPOSITE: Combination           │
│  ┌─────────────────────────┐           ┌─────────────────────────┐      │
│  │  0  │  1  │  2  │  3  │            │ 2024-US │ 2024-EU │ ... │      │
│  └─────────────────────────┘           └─────────────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Range Partitioning

Best for time-series data or naturally ordered data.

```sql
-- PostgreSQL: Range partitioning by date
CREATE TABLE orders (
    order_id BIGSERIAL,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(10,2)
) PARTITION BY RANGE (order_date);

-- Create partitions for each year
CREATE TABLE orders_2022 PARTITION OF orders
    FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');

CREATE TABLE orders_2023 PARTITION OF orders
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE orders_2024 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Default partition for values outside ranges
CREATE TABLE orders_default PARTITION OF orders DEFAULT;

-- Queries automatically use only relevant partitions
SELECT * FROM orders WHERE order_date = '2024-06-15';
-- Only scans orders_2024 partition!
```

```sql
-- MySQL: Range partitioning
CREATE TABLE orders (
    order_id BIGINT AUTO_INCREMENT,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(10,2),
    PRIMARY KEY (order_id, order_date)  -- Partition key must be in PK
) PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### List Partitioning

Best for categorical data with known values.

```sql
-- PostgreSQL: List partitioning by region
CREATE TABLE customers (
    customer_id SERIAL,
    name VARCHAR(100),
    region VARCHAR(20) NOT NULL
) PARTITION BY LIST (region);

CREATE TABLE customers_americas PARTITION OF customers
    FOR VALUES IN ('US', 'CA', 'MX', 'BR');

CREATE TABLE customers_europe PARTITION OF customers
    FOR VALUES IN ('UK', 'DE', 'FR', 'ES', 'IT');

CREATE TABLE customers_apac PARTITION OF customers
    FOR VALUES IN ('JP', 'CN', 'AU', 'IN', 'SG');
```

### Hash Partitioning

Best for even data distribution when no natural partitioning key exists.

```sql
-- PostgreSQL: Hash partitioning
CREATE TABLE events (
    event_id BIGSERIAL,
    user_id INT NOT NULL,
    event_type VARCHAR(50),
    created_at TIMESTAMP
) PARTITION BY HASH (user_id);

-- Create 4 partitions (even distribution)
CREATE TABLE events_0 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE events_1 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE events_2 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE events_3 PARTITION OF events FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### Partition Management

```sql
-- Add new partition
CREATE TABLE orders_2025 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Detach partition (for archival)
ALTER TABLE orders DETACH PARTITION orders_2022;
-- orders_2022 is now a regular table, can be archived/dropped

-- Drop partition (removes data)
DROP TABLE orders_2022;

-- Attach existing table as partition
ALTER TABLE orders ATTACH PARTITION orders_archive
    FOR VALUES FROM ('2020-01-01') TO ('2021-01-01');
```

---

## Partition Pruning

The optimizer automatically skips irrelevant partitions.

```sql
-- Example: Only scans 2024 partition
EXPLAIN SELECT * FROM orders WHERE order_date BETWEEN '2024-06-01' AND '2024-06-30';

-- Plan shows:
-- Append
--   -> Seq Scan on orders_2024  (only this partition scanned!)

-- Enable partition pruning (usually on by default)
SET enable_partition_pruning = on;
```

**When pruning works:**
- Direct comparisons: `WHERE order_date = '2024-06-15'`
- Range conditions: `WHERE order_date BETWEEN ... AND ...`
- IN lists: `WHERE region IN ('US', 'CA')`

**When pruning doesn't work:**
- Functions on partition key: `WHERE YEAR(order_date) = 2024`
- OR with non-partition conditions
- Joins without partition key filter

---

## Sharding

Distributing data across multiple database servers.

### Sharding Strategies

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SHARDING STRATEGIES                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Range-Based:                    Hash-Based:                             │
│  ┌───────┬───────┬───────┐      ┌───────┬───────┬───────┐              │
│  │ A-H   │ I-P   │ Q-Z   │      │Hash=0 │Hash=1 │Hash=2 │              │
│  │Shard 1│Shard 2│Shard 3│      │Shard 1│Shard 2│Shard 3│              │
│  └───────┴───────┴───────┘      └───────┴───────┴───────┘              │
│  Easy range queries              Even distribution                       │
│  Potential hotspots              Range queries harder                    │
│                                                                          │
│  Directory-Based:                Geography-Based:                        │
│  ┌─────────────────────┐        ┌───────┬───────┬───────┐              │
│  │  Lookup Service     │        │  US   │  EU   │ APAC  │              │
│  │  user→shard mapping │        │Shard 1│Shard 2│Shard 3│              │
│  └─────────────────────┘        └───────┴───────┴───────┘              │
│  Flexible                        Low latency per region                  │
│  Extra lookup overhead           Good for multi-region apps              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Choosing a Shard Key

**Good shard keys:**
- Even distribution of data
- Even distribution of queries
- Avoid cross-shard operations

```
Customer-based sharding (customer_id):
✅ Good: Each customer's data on one shard
✅ Good: Most queries filter by customer
❌ Problem: Large customers may skew distribution
❌ Problem: Cross-customer reports need all shards

Tenant-based sharding (tenant_id):
✅ Good: Natural isolation between tenants
✅ Good: Easy to move tenants between shards
❌ Problem: Large tenants may need their own shard
```

### Application-Level Sharding

```python
# Shard selection logic
SHARD_COUNT = 4
SHARD_CONNECTIONS = {
    0: connect('shard0.db.example.com'),
    1: connect('shard1.db.example.com'),
    2: connect('shard2.db.example.com'),
    3: connect('shard3.db.example.com'),
}

def get_shard(customer_id: int):
    """Consistent hash to determine shard."""
    shard_num = hash(customer_id) % SHARD_COUNT
    return SHARD_CONNECTIONS[shard_num]

def get_customer_orders(customer_id: int):
    """Query the correct shard."""
    shard = get_shard(customer_id)
    return shard.query("SELECT * FROM orders WHERE customer_id = %s", customer_id)

def get_all_orders_report():
    """Fan-out query to all shards."""
    results = []
    for shard in SHARD_CONNECTIONS.values():
        results.extend(shard.query("SELECT * FROM orders"))
    return results  # May need to merge/sort
```

### Database Sharding Solutions

| Solution | Type | Description |
|----------|------|-------------|
| **Citus** | PostgreSQL extension | Distributed tables, automatic sharding |
| **Vitess** | MySQL proxy | Sharding middleware, used by YouTube |
| **CockroachDB** | Distributed SQL | Built-in sharding, geo-distribution |
| **TiDB** | MySQL compatible | Distributed NewSQL database |
| **ProxySQL** | MySQL proxy | Query routing to shards |

---

## Cross-Shard Operations

The challenging part of sharding.

### Cross-Shard Joins

```sql
-- This doesn't work directly across shards!
SELECT c.name, o.total
FROM customers c
JOIN orders o ON c.id = o.customer_id;
-- customers on shard A, orders on shard B?
```

**Solutions:**
1. **Denormalization**: Copy necessary data to each shard
2. **Application-side join**: Query both shards, join in application
3. **Reference tables**: Small tables replicated to all shards
4. **Co-location**: Related data on same shard (shard by customer_id for both)

### Cross-Shard Aggregations

```sql
-- SELECT COUNT(*) FROM orders
-- Need to query all shards and sum
```

```python
def count_all_orders():
    total = 0
    for shard in SHARD_CONNECTIONS.values():
        count = shard.query("SELECT COUNT(*) FROM orders")[0]
        total += count
    return total
```

### Distributed Transactions

Maintaining ACID across shards is complex:

```
Two-Phase Commit (2PC):

Phase 1: Prepare
┌──────────┐     ┌──────────┐     ┌──────────┐
│Coordinator│────▶│ Shard 1  │────▶│ Shard 2  │
│           │     │ PREPARE  │     │ PREPARE  │
└──────────┘     └──────────┘     └──────────┘

Phase 2: Commit (if all prepared successfully)
┌──────────┐     ┌──────────┐     ┌──────────┐
│Coordinator│────▶│ Shard 1  │────▶│ Shard 2  │
│           │     │  COMMIT  │     │  COMMIT  │
└──────────┘     └──────────┘     └──────────┘

Problems:
- Blocking if coordinator fails
- Performance overhead
- Increased latency
```

**Alternative: Saga Pattern**
```
Sequence of local transactions with compensating actions:

1. Shard A: Debit $100 from account
2. Shard B: Credit $100 to account

If step 2 fails:
3. Shard A: Credit $100 back (compensate)
```

---

## When to Use What

| Scenario | Solution |
|----------|----------|
| Table > 100M rows, single server OK | Partitioning |
| Time-series data, need to archive old data | Range Partitioning |
| Multi-tenant with large tenants | List Partitioning |
| Even distribution needed | Hash Partitioning |
| Outgrowing single server capacity | Sharding |
| Global users, need low latency | Geographic Sharding |
| Write throughput > 10K/second | Sharding |

---

## Common Patterns & Best Practices

### ✅ Do:
- **Start with partitioning**: Simpler than sharding
- **Choose partition key wisely**: Must be in most queries' WHERE clause
- **Plan for growth**: Leave room for new partitions
- **Automate partition management**: Script creation of future partitions
- **Shard by tenant for SaaS**: Natural isolation and scaling

### ❌ Avoid:
- **Sharding prematurely**: Adds significant complexity
- **Cross-shard transactions**: Design to avoid them
- **Too many partitions**: Each has overhead (aim for < 1000)
- **Changing shard key later**: Very difficult migration

---

## Exercises

### Exercise 1: Partition Design 🟢

**Scenario:** Design partitioning for an events table:
- 10 million events per day
- 90-day retention policy
- Most queries filter by event_date and event_type
- Event types: 'pageview', 'click', 'purchase', 'signup'

<details>
<summary>✅ Solution</summary>

```sql
-- Composite partitioning: Range (date) + List (type)
CREATE TABLE events (
    event_id BIGSERIAL,
    event_type VARCHAR(20) NOT NULL,
    user_id INT,
    event_data JSONB,
    event_date DATE NOT NULL
) PARTITION BY RANGE (event_date);

-- Create daily partitions (one per day)
-- Automated script creates these ahead of time:
CREATE TABLE events_2024_01_15 PARTITION OF events
    FOR VALUES FROM ('2024-01-15') TO ('2024-01-16');

-- For each date partition, sub-partition by type (if supported)
-- Or use list partitioning at top level with sub-partitions

-- Alternative: Just date partitioning with index on type
CREATE TABLE events (
    event_id BIGSERIAL,
    event_type VARCHAR(20) NOT NULL,
    user_id INT,
    event_data JSONB,
    event_date DATE NOT NULL
) PARTITION BY RANGE (event_date);

-- Index on event_type for filtering
CREATE INDEX idx_events_type ON events(event_type);

-- Retention: Drop old partitions
-- Cron job runs: 
DROP TABLE IF EXISTS events_2024_01_14;  -- 90 days ago

-- Partition creation script (run weekly):
DO $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..7 LOOP
        partition_date := CURRENT_DATE + i;
        partition_name := 'events_' || to_char(partition_date, 'YYYY_MM_DD');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            partition_date,
            partition_date + 1
        );
    END LOOP;
END $$;
```

</details>

---

### Exercise 2: Shard Key Selection 🟡

**Scenario:** An e-commerce platform needs sharding. Evaluate these shard key options:

1. `order_id` (auto-increment)
2. `customer_id`
3. `product_id`
4. `order_date`
5. `region`

Consider these access patterns:
- Customer views their order history (very frequent)
- Product inventory updates (frequent)
- Daily sales reports (daily)
- Search for orders by date range

<details>
<summary>✅ Solution</summary>

**Analysis:**

| Shard Key | Distribution | Query Fit | Cross-Shard | Verdict |
|-----------|--------------|-----------|-------------|---------|
| order_id | ✅ Even | ❌ No common queries use just order_id | ❌ Order history needs all shards | ❌ Poor |
| customer_id | ✅ Usually even | ✅ Order history on one shard | ✅ Customer operations contained | ✅ Good |
| product_id | ⚠️ May skew | ⚠️ Inventory ok, orders spread | ❌ Order with multiple products | ⚠️ Maybe |
| order_date | ❌ Time skew | ❌ Old shards empty, new hot | ✅ Date range on one shard | ❌ Poor |
| region | ⚠️ Uneven | ⚠️ Region queries ok | ✅ If business is regional | ⚠️ Context-dependent |

**Recommendation: `customer_id`**

Reasons:
1. Customer order history (most common) hits one shard
2. Even distribution across customers
3. Customer-related operations (cart, checkout, profile) contained
4. Can co-locate orders, order_items, customer on same shard

```python
# Sharding strategy
def get_shard_for_customer(customer_id):
    return hash(customer_id) % SHARD_COUNT

# Orders table includes customer_id
# All queries filter by or JOIN on customer_id
# Daily reports: fan-out to all shards, aggregate results
```

**For reports concern:**
- Pre-aggregate daily summaries in each shard
- Or use separate analytics database (OLAP) that syncs from shards

</details>

---

### Exercise 3: Migration to Sharding 🔴

**Scenario:** Your single PostgreSQL database has:
- 500M order records
- 50M customer records  
- Growing 10% monthly
- Current queries are slow despite optimization

Plan a migration to 4 shards using customer_id as shard key.

<details>
<summary>✅ Solution</summary>

**Phase 1: Preparation (Week 1-2)**

```sql
-- Ensure all tables have customer_id
-- Add if missing on any tables that need sharding
ALTER TABLE order_items ADD COLUMN customer_id INT;
UPDATE order_items oi SET customer_id = (SELECT customer_id FROM orders o WHERE o.id = oi.order_id);
ALTER TABLE order_items ALTER COLUMN customer_id SET NOT NULL;
```

**Phase 2: Set Up Shards (Week 2-3)**

```bash
# Create 4 new database instances
# shard0.db, shard1.db, shard2.db, shard3.db

# Schema identical on each shard
pg_dump --schema-only source_db | psql shard0_db
# Repeat for each shard
```

**Phase 3: Dual-Write Layer (Week 3-4)**

```python
class DualWriteDB:
    def __init__(self):
        self.old_db = connect('old_db')
        self.shards = [connect(f'shard{i}') for i in range(4)]
    
    def get_shard(self, customer_id):
        return self.shards[hash(customer_id) % 4]
    
    def insert_order(self, order):
        # Write to both old and new
        self.old_db.execute("INSERT INTO orders ...", order)
        shard = self.get_shard(order['customer_id'])
        shard.execute("INSERT INTO orders ...", order)
```

**Phase 4: Backfill Historical Data (Week 4-6)**

```python
# Batch migration script
BATCH_SIZE = 10000

def migrate_orders():
    offset = 0
    while True:
        orders = old_db.query("""
            SELECT * FROM orders 
            ORDER BY id 
            LIMIT %s OFFSET %s
        """, BATCH_SIZE, offset)
        
        if not orders:
            break
        
        # Group by shard
        by_shard = defaultdict(list)
        for order in orders:
            shard_id = hash(order['customer_id']) % 4
            by_shard[shard_id].append(order)
        
        # Bulk insert to each shard
        for shard_id, shard_orders in by_shard.items():
            shards[shard_id].bulk_insert('orders', shard_orders)
        
        offset += BATCH_SIZE
        log(f"Migrated {offset} orders")
```

**Phase 5: Verification (Week 6-7)**

```sql
-- Compare counts
-- Old DB
SELECT COUNT(*) FROM orders;  -- 500M

-- Sum of shards
SELECT 'shard0', COUNT(*) FROM orders
UNION ALL SELECT 'shard1', COUNT(*) FROM orders ...
-- Should sum to 500M

-- Sample verification
SELECT * FROM orders WHERE customer_id = 12345;
-- Should match on old_db and appropriate shard
```

**Phase 6: Cutover (Week 7-8)**

```python
# Application code switch
class ShardedDB:
    def __init__(self):
        self.shards = [connect(f'shard{i}') for i in range(4)]
    
    def get_customer_orders(self, customer_id):
        shard = self.shards[hash(customer_id) % 4]
        return shard.query("SELECT * FROM orders WHERE customer_id = %s", customer_id)
    
    def get_all_orders_count(self):
        # Fan-out query
        return sum(shard.query("SELECT COUNT(*) FROM orders")[0] for shard in self.shards)
```

**Phase 7: Cleanup (Week 8+)**

```bash
# After verification period (e.g., 1 month)
# Archive or drop old database
pg_dump old_db > old_db_archive.sql
dropdb old_db
```

</details>

---

## Key Takeaways

- 📊 **Partitioning**: Single DB, divide tables for manageability and performance
- 🌐 **Sharding**: Multiple DBs, distribute for capacity and throughput
- 📅 **Range partitioning**: Best for time-series, enables easy archival
- 🔑 **Shard key selection**: Critical decision, hard to change later
- 🔀 **Cross-shard operations**: Minimize by co-locating related data
- 📈 **Start simple**: Partitioning first, shard only when necessary

---

## Related Topics

- [Replication and Consistency](/databases/14-replication-and-consistency.md) - High availability
- [Performance Tuning](/databases/10-performance-tuning.md) - Optimization before sharding
- [Database Internals](/databases/15-database-internals.md) - How partitions are stored
