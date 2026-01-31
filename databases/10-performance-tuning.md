# Performance Tuning

[← Back to Index](00-index.md)

---

## Overview

Performance tuning is a holistic approach to database optimization that goes beyond individual queries. It encompasses connection management, caching strategies, hardware utilization, and monitoring. This chapter provides the tools and techniques for maintaining high-performance database systems.

### When This Matters Most
- Production database slowdowns
- Scaling for increased load
- Capacity planning
- Cost optimization

---

## Performance Monitoring

### Key Metrics to Track

| Metric | What It Measures | Warning Signs |
|--------|------------------|---------------|
| **Query latency** | Response time | p99 > 1s, increasing trend |
| **Throughput** | Queries/second | Decreasing under load |
| **Connection count** | Active connections | Near pool maximum |
| **Buffer hit ratio** | Cache effectiveness | &lt; 99% for OLTP |
| **Lock waits** | Contention | Increasing wait times |
| **Disk I/O** | Storage performance | High read latency, saturation |
| **CPU usage** | Processing capacity | Sustained > 80% |
| **Memory usage** | RAM utilization | Swap activity |

### Identifying Slow Queries

```sql
-- PostgreSQL: pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT 
    query,
    calls,
    total_exec_time / 1000 as total_seconds,
    mean_exec_time as avg_ms,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- MySQL: Slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Log queries > 1 second
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- Query from performance_schema
SELECT 
    DIGEST_TEXT,
    COUNT_STAR,
    AVG_TIMER_WAIT/1000000000 as avg_ms,
    SUM_ROWS_EXAMINED,
    SUM_ROWS_SENT
FROM performance_schema.events_statements_summary_by_digest
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 20;

-- SQL Server: Query Store
SELECT TOP 20
    qt.query_sql_text,
    rs.avg_duration / 1000 as avg_ms,
    rs.count_executions,
    rs.avg_logical_io_reads
FROM sys.query_store_query q
JOIN sys.query_store_query_text qt ON q.query_text_id = qt.query_text_id
JOIN sys.query_store_plan p ON q.query_id = p.query_id
JOIN sys.query_store_runtime_stats rs ON p.plan_id = rs.plan_id
ORDER BY rs.avg_duration DESC;
```

---

## Connection Management

### Connection Pooling

Opening database connections is expensive. Use connection pools to reuse them.

```
Without Pooling:                   With Pooling:
┌───────────┐                      ┌───────────┐
│ Request 1 │─┐                    │ Request 1 │─┐
├───────────┤ │ Each creates      ├───────────┤ │
│ Request 2 │─┤ new connection    │ Request 2 │─┤ Share pool of
├───────────┤ │ (expensive!)      ├───────────┤ │ connections
│ Request 3 │─┤                   │ Request 3 │─┤ (fast!)
├───────────┤ │                   ├───────────┤ │
│   ...     │─┘                   │   ...     │─┘
└───────────┘                      └───────────┘
      │                                  │
      ▼                                  ▼
  ┌─────┐┌─────┐┌─────┐           ┌─────────────┐
  │Conn1││Conn2││Conn3│           │ Pool: 10    │
  │ DB  ││ DB  ││ DB  │           │ connections │
  └─────┘└─────┘└─────┘           └─────────────┘
```

**External Pool Solutions:**
- **PgBouncer** (PostgreSQL)
- **ProxySQL** (MySQL)
- **Application-level**: HikariCP (Java), SQLAlchemy pools (Python)

```ini
# PgBouncer configuration example
[databases]
mydb = host=localhost dbname=mydb

[pgbouncer]
pool_mode = transaction  # Share connections between transactions
max_client_conn = 1000   # Max client connections
default_pool_size = 20   # Connections to database per pool
```

**Pool Sizing Formula:**
```
Optimal pool size ≈ ((core_count * 2) + effective_spindle_count)

For SSD: core_count * 2 + 1
For HDD with 4 drives: core_count * 2 + 4

Example: 8 cores, SSD = (8 * 2) + 1 = 17 connections
```

### Connection Limits

```sql
-- PostgreSQL: Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Set limits
ALTER SYSTEM SET max_connections = 200;

-- Per-user limits
ALTER ROLE app_user CONNECTION LIMIT 50;

-- MySQL
SHOW VARIABLES LIKE 'max_connections';
SET GLOBAL max_connections = 200;
```

---

## Memory Tuning

### Buffer Pool / Shared Buffers

The buffer pool caches frequently accessed data pages.

```sql
-- PostgreSQL: shared_buffers
-- Recommended: 25% of system RAM (but no more than 8GB typically)
ALTER SYSTEM SET shared_buffers = '4GB';

-- Check buffer hit ratio
SELECT 
    sum(heap_blks_read) as blocks_read,
    sum(heap_blks_hit) as blocks_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as hit_ratio
FROM pg_statio_user_tables;
-- Target: > 0.99 for OLTP

-- MySQL: InnoDB buffer pool
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
-- Recommended: 70-80% of RAM for dedicated database servers
SET GLOBAL innodb_buffer_pool_size = 8589934592;  -- 8GB

-- Check hit ratio
SHOW STATUS LIKE 'Innodb_buffer_pool_read%';
-- Hit ratio = 1 - (Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests)
```

### Work Memory

Memory for sorting and hashing operations per query.

```sql
-- PostgreSQL: work_mem
-- Be careful: this is per-operation, not per-query
-- A query with 5 sorts could use 5 × work_mem
ALTER SYSTEM SET work_mem = '256MB';

-- For specific sessions needing more
SET work_mem = '1GB';
SELECT ... ORDER BY ... ;  -- Uses up to 1GB for sort
RESET work_mem;

-- MySQL: sort_buffer_size, join_buffer_size
SET GLOBAL sort_buffer_size = 268435456;  -- 256MB
SET GLOBAL join_buffer_size = 268435456;
```

---

## Caching Strategies

### Query Result Caching

```sql
-- MySQL: Query Cache (deprecated in 8.0, removed)
-- Use application-level caching instead (Redis, Memcached)

-- PostgreSQL: No built-in query cache
-- Use application-level caching or materialized views
```

**Application-Level Caching Pattern:**
```python
# Pseudo-code
def get_product(product_id):
    cache_key = f"product:{product_id}"
    
    # Check cache first
    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Query database
    product = db.query("SELECT * FROM products WHERE id = %s", product_id)
    
    # Store in cache with TTL
    redis.setex(cache_key, 3600, json.dumps(product))  # 1 hour TTL
    
    return product
```

### Materialized Views

Pre-computed query results stored as tables.

```sql
-- PostgreSQL: Materialized Views
CREATE MATERIALIZED VIEW product_sales_summary AS
SELECT 
    p.product_id,
    p.name,
    COUNT(*) as order_count,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.quantity * oi.unit_price) as total_revenue
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY p.product_id, p.name;

CREATE UNIQUE INDEX idx_pss_product ON product_sales_summary(product_id);

-- Refresh (blocking)
REFRESH MATERIALIZED VIEW product_sales_summary;

-- Refresh concurrently (non-blocking, requires unique index)
REFRESH MATERIALIZED VIEW CONCURRENTLY product_sales_summary;

-- Schedule refresh via cron or pg_cron extension
```

---

## Vacuuming and Maintenance

### PostgreSQL: VACUUM and ANALYZE

```sql
-- VACUUM: Reclaim space from dead tuples
VACUUM orders;

-- VACUUM FULL: Completely rewrites table (exclusive lock!)
VACUUM FULL orders;  -- Use sparingly

-- ANALYZE: Update statistics
ANALYZE orders;

-- Both together (common maintenance)
VACUUM ANALYZE orders;

-- Check for bloated tables
SELECT 
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;

-- Autovacuum settings (usually good defaults, but adjustable)
ALTER TABLE high_churn_table SET (
    autovacuum_vacuum_scale_factor = 0.05,  -- Vacuum when 5% dead (vs default 20%)
    autovacuum_analyze_scale_factor = 0.02  -- Analyze when 2% changed
);
```

### MySQL: OPTIMIZE TABLE

```sql
-- Reclaim space from InnoDB tables
OPTIMIZE TABLE orders;

-- Or use ALTER TABLE for InnoDB
ALTER TABLE orders ENGINE=InnoDB;  -- Rebuilds table

-- Analyze for statistics
ANALYZE TABLE orders;

-- Check fragmentation
SELECT 
    TABLE_NAME,
    DATA_LENGTH,
    DATA_FREE,
    DATA_FREE * 100 / DATA_LENGTH as fragmentation_pct
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb'
ORDER BY DATA_FREE DESC;
```

---

## Read Replicas

Distribute read queries across multiple database copies.

```
                    ┌──────────────┐
          Writes───→│   Primary    │
                    │   (Master)   │
                    └──────┬───────┘
                           │
            Replication────┼─────────────┐
                           │             │
                    ┌──────▼───────┐ ┌───▼──────────┐
          Reads────→│   Replica 1  │ │   Replica 2  │
                    │   (Slave)    │ │   (Slave)    │
                    └──────────────┘ └──────────────┘
```

**Application Logic:**
```python
# Pseudo-code
def get_connection(operation='read'):
    if operation == 'write':
        return primary_db_connection
    else:
        return random.choice(replica_connections)

# Use primary for writes
with get_connection('write') as conn:
    conn.execute("INSERT INTO orders ...")

# Use replica for reads
with get_connection('read') as conn:
    orders = conn.execute("SELECT * FROM orders WHERE ...")
```

**Considerations:**
- **Replication lag**: Replicas may be slightly behind
- **Read-your-writes**: May need to read from primary immediately after write
- **Consistency**: Use primary for critical reads

---

## Bulk Operations

### Batch Inserts

```sql
-- ❌ Slow: Individual inserts
INSERT INTO orders VALUES (1, 'A', 100);
INSERT INTO orders VALUES (2, 'B', 200);
INSERT INTO orders VALUES (3, 'C', 300);
-- ... (1000 round trips!)

-- ✅ Fast: Bulk insert
INSERT INTO orders VALUES 
(1, 'A', 100),
(2, 'B', 200),
(3, 'C', 300),
... ;  -- (1 round trip)

-- PostgreSQL: COPY (fastest for large datasets)
COPY orders FROM '/path/to/data.csv' WITH CSV HEADER;

-- MySQL: LOAD DATA
LOAD DATA INFILE '/path/to/data.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

### Bulk Updates/Deletes

```sql
-- ❌ Slow: Update all rows at once (locks table, logs huge transaction)
UPDATE orders SET status = 'archived' WHERE order_date &lt; '2020-01-01';

-- ✅ Better: Batch updates
-- Process in chunks to reduce lock time and transaction log size
DO $$
DECLARE
    batch_size INT := 10000;
    affected INT;
BEGIN
    LOOP
        UPDATE orders 
        SET status = 'archived' 
        WHERE order_id IN (
            SELECT order_id FROM orders 
            WHERE order_date &lt; '2020-01-01' 
            AND status != 'archived'
            LIMIT batch_size
        );
        
        GET DIAGNOSTICS affected = ROW_COUNT;
        EXIT WHEN affected = 0;
        
        COMMIT;  -- Release locks between batches
        PERFORM pg_sleep(0.1);  -- Brief pause to let other queries through
    END LOOP;
END $$;

-- For deletes: Same pattern, or use partitioning to drop entire partitions
```

---

## Hardware Considerations

### Disk I/O

| Storage Type | Characteristics | Best For |
|--------------|-----------------|----------|
| **HDD** | High capacity, low cost, slow random I/O | Archives, cold data |
| **SSD** | Fast random I/O, moderate capacity | General OLTP |
| **NVMe** | Very fast, low latency | High-performance OLTP |

```sql
-- Check I/O wait time (Linux)
-- $ iostat -x 1

-- PostgreSQL: Check read performance
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM large_table WHERE id = 12345;
-- Look for: shared read (vs. shared hit) indicates disk I/O

-- Separate data files, WAL, and logs to different disks
-- postgresql.conf:
-- data_directory = '/fast-ssd/pg_data'
-- log_directory = '/hdd/pg_logs'
```

### Memory

```
Rule of thumb for dedicated database servers:

25-40%   - Buffer pool / Shared buffers
5-10%    - OS file system cache
5%       - Per-connection memory (work_mem × expected connections)
Remainder - OS and other processes

Example: 64GB RAM server
- shared_buffers = 16GB
- effective_cache_size = 48GB (tells optimizer what's available)
- work_mem = 256MB (with 50 connections = potential 12.5GB)
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Monitor continuously**: Set up alerts before problems become critical
- **Use connection pooling**: Essential for high-concurrency applications
- **Size buffer pool appropriately**: Usually 25% (PostgreSQL) or 70% (MySQL) of RAM
- **Keep statistics fresh**: Autovacuum/analyze should run regularly
- **Batch bulk operations**: Reduce lock time and transaction log size

### ❌ Avoid:
- **Too many connections**: More connections ≠ more throughput
- **Ignoring maintenance**: Bloat accumulates over time
- **Over-caching**: Stale cache worse than slow query
- **Premature sharding**: Optimize single node first

---

## Exercises

### Exercise 1: Diagnose Slow System 🟢

**Scenario:** Users report the application is slow. Database CPU is 90%. How do you investigate?

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Check active queries
SELECT 
    pid,
    now() - query_start AS duration,
    state,
    query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- 2. Find slow query patterns
SELECT 
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 3. Check for blocking locks
SELECT 
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks ON blocked_locks.locktype = blocking_locks.locktype
    AND blocked_locks.relation = blocking_locks.relation
    AND blocked_locks.pid != blocking_locks.pid
JOIN pg_stat_activity blocking ON blocking_locks.pid = blocking.pid
WHERE blocked_locks.granted = FALSE AND blocking_locks.granted = TRUE;

-- 4. Check table statistics freshness
SELECT 
    relname,
    last_vacuum,
    last_analyze,
    n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- 5. Take action based on findings:
-- - Kill long-running query: SELECT pg_terminate_backend(pid);
-- - Add missing index for slow query
-- - Run ANALYZE on table with stale statistics
-- - Vacuum bloated tables
```

</details>

---

### Exercise 2: Connection Pool Sizing 🟡

**Scenario:** Your app has:
- 8-core database server with SSD
- 100 application servers
- Each app server runs 10 worker processes
- Each worker might need a database connection

**Questions:**
1. What's the optimal pool size on the database?
2. How should you configure the application pools?
3. What happens if you have too many connections?

<details>
<summary>✅ Solution</summary>

**1. Optimal database pool size:**
```
Formula: (core_count * 2) + effective_spindles
For 8 cores + SSD: (8 * 2) + 1 = 17 connections

Practical: Round up to 20-25 for headroom
```

**2. Application pool configuration:**
```
Problem: 100 servers × 10 workers = 1000 potential connections
Database optimum: ~20 connections

Solution: Use PgBouncer as central connection pool

                 ┌─────────────────────────────────────┐
                 │     PgBouncer (max_client=1000)     │
                 │     Pool size per DB: 20           │
                 └─────────────────────────────────────┘
                                  │
                                  ▼
                 ┌─────────────────────────────────────┐
                 │       PostgreSQL (20 connections)   │
                 └─────────────────────────────────────┘

Or per-app-server pools (less efficient):
- Each app server: pool_size = 20 / 100 = 0.2 (not practical!)
- Better: 1-2 per server, use central pooler for overflow
```

**3. Too many connections problems:**
```
- Context switching overhead (OS manages many threads)
- Memory exhaustion (each connection uses ~5-10MB)
- Lock contention increases
- Performance degrades non-linearly:
  
  Connections vs Throughput:
  
  Throughput
      │      ╭──────╮
      │     ╱        ╲
      │    ╱          ╲
      │   ╱            ╲
      │  ╱              ╲
      └─────────────────────
         20   100   500
         Connections
         
  Peak around optimal pool size, then degrades!
```

</details>

---

### Exercise 3: Performance Tuning Plan 🔴

**Scenario:** You're taking over a database with these characteristics:
- 500GB data, 50M row main table
- 100 queries/second average, spikes to 500/second
- p99 latency: 500ms (goal: &lt;100ms)
- Current settings: defaults

**Create a tuning plan covering:**
1. Immediate quick wins
2. Medium-term improvements
3. Monitoring setup
4. Scaling strategy

<details>
<summary>✅ Solution</summary>

**1. Immediate Quick Wins (Day 1):**

```sql
-- A. Tune memory settings
ALTER SYSTEM SET shared_buffers = '8GB';  -- 25% of assumed 32GB RAM
ALTER SYSTEM SET effective_cache_size = '24GB';
ALTER SYSTEM SET work_mem = '128MB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';

-- B. Enable and review slow queries
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms

-- C. Update statistics
ANALYZE;  -- All tables

-- D. Identify and fix missing indexes
-- Run top slow queries through EXPLAIN ANALYZE
-- Add indexes for sequential scans on large tables

-- E. Enable pg_stat_statements
CREATE EXTENSION pg_stat_statements;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
```

**2. Medium-Term Improvements (Week 1-4):**

```sql
-- A. Connection pooling
-- Deploy PgBouncer with:
-- - transaction mode
-- - pool_size = 25
-- - max_client_conn = 500

-- B. Query optimization
-- Review top 10 queries from pg_stat_statements
-- Rewrite anti-patterns (see Query Optimization chapter)

-- C. Table maintenance
-- Identify bloated tables and indexes
SELECT
    relname,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    n_dead_tup,
    last_vacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Vacuum bloated tables
VACUUM ANALYZE bloated_table;

-- D. Partitioning for large table
-- If 50M row table is time-series, partition by date
CREATE TABLE orders_partitioned (
    LIKE orders INCLUDING ALL
) PARTITION BY RANGE (order_date);

-- E. Read replica for reporting queries
-- Set up streaming replication
-- Route read-only queries to replica
```

**3. Monitoring Setup:**

```yaml
# Key metrics to alert on:
- Query latency p99 > 100ms
- Active connections > 80% of max
- Buffer hit ratio &lt; 99%
- Replication lag > 30 seconds
- Disk usage > 80%
- Lock wait time > 1 second

# Tools:
- pgBadger for log analysis
- pg_stat_statements for query metrics
- Prometheus + Grafana for visualization
- PgHero for easy overview
```

**4. Scaling Strategy:**

```
Current: Single node, 500 QPS peak

Phase 1 - Vertical (if not maxed):
- Upgrade to more RAM (64GB+)
- Faster storage (NVMe)
- More CPU cores

Phase 2 - Read scaling:
- Add 2 read replicas
- Route read queries to replicas
- Capacity: 3x read throughput

Phase 3 - Data partitioning:
- Archive old data (> 1 year) to separate table/database
- Partition active table by date
- Consider time-series extension (TimescaleDB)

Phase 4 - Sharding (if needed):
- Only if > 1TB active data or > 10K QPS needed
- Shard by customer_id or tenant_id
- Use Citus or application-level sharding
```

</details>

---

## Key Takeaways

- 🔌 **Connection pooling is essential**: ~20 connections often outperform 200
- 💾 **Tune memory settings**: Buffer pool is your first line of defense
- 📊 **Monitor continuously**: You can't fix what you can't see
- 🔄 **Maintain regularly**: Vacuum, analyze, reindex
- 📦 **Batch bulk operations**: Reduce lock time and transaction size
- 📈 **Scale reads first**: Replicas before sharding

---

## Related Topics

- [Indexing Deep Dive](07-indexing-deep-dive.md) - Index optimization
- [Query Optimization](09-query-optimization.md) - Query-level tuning
- [Transactions and ACID](11-transactions-and-acid.md) - Transaction overhead
