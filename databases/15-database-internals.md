# Database Internals

[← Back to Index](/databases/00-index.md)

---

## Overview

Understanding how databases work internally helps you make better design decisions, troubleshoot performance issues, and use database features effectively. This chapter covers storage engines, write-ahead logging, buffer management, and other core concepts.

### When This Matters Most
- Diagnosing mysterious performance issues
- Capacity planning and hardware selection
- Understanding EXPLAIN output deeply
- Making architecture decisions

---

## Storage Engines

### Row-Oriented vs Column-Oriented

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ROW-ORIENTED (OLTP)                    COLUMN-ORIENTED (OLAP)          │
│                                                                          │
│  ┌────┬──────┬─────┬───────┐           ┌────────────────────────┐       │
│  │ ID │ Name │ Age │ Salary│           │ ID: 1, 2, 3, 4, 5...   │       │
│  ├────┼──────┼─────┼───────┤           ├────────────────────────┤       │
│  │ 1  │ Alice│ 30  │ 75000 │           │ Name: Alice, Bob, ...  │       │
│  │ 2  │ Bob  │ 25  │ 65000 │           ├────────────────────────┤       │
│  │ 3  │ Carol│ 35  │ 85000 │           │ Age: 30, 25, 35, ...   │       │
│  └────┴──────┴─────┴───────┘           ├────────────────────────┤       │
│                                         │ Salary: 75K, 65K, ...  │       │
│  ✅ Fast: SELECT * WHERE id=1          └────────────────────────┘       │
│  ❌ Slow: SELECT AVG(salary)                                            │
│                                         ❌ Slow: SELECT * WHERE id=1    │
│                                         ✅ Fast: SELECT AVG(salary)     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| Engine Type | Best For | Examples |
|-------------|----------|----------|
| **Row-Oriented** | OLTP, point queries | PostgreSQL, MySQL, SQL Server |
| **Column-Oriented** | OLAP, analytics | ClickHouse, Redshift, BigQuery |
| **Hybrid** | Mixed workloads | CockroachDB, TiDB |

### Page/Block Storage

Databases organize data in fixed-size pages (typically 8KB):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PAGE STRUCTURE (8KB typical)                                            │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ PAGE HEADER (24 bytes)                                            │   │
│  │ - Page ID, LSN, Checksum, Flags                                   │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │ ITEM POINTERS (4 bytes each)                                      │   │
│  │ [ptr1] [ptr2] [ptr3] [ptr4] ... ────────────────────────┐        │   │
│  ├──────────────────────────────────────────────────────────┼───────┤   │
│  │                                                          │        │   │
│  │               FREE SPACE                                 │        │   │
│  │               (for new rows)                             │        │   │
│  │                                                          ▼        │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │ [tuple4] [tuple3] [tuple2] [tuple1]                              │   │
│  │ TUPLES (rows) - grow backwards from end                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Benefits: Fixed-size I/O, efficient buffer management                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Heap vs Clustered Storage

```sql
-- Heap table: Rows stored in insertion order (PostgreSQL default)
-- Fast inserts, full table scan for range queries

-- Clustered table: Rows stored in index order (SQL Server, MySQL InnoDB)
-- Range queries on clustered index are fast
-- Primary key lookups are fastest
```

---

## Write-Ahead Logging (WAL)

The fundamental technique for crash recovery and replication.

### WAL Concept

```
┌─────────────────────────────────────────────────────────────────────────┐
│  WRITE-AHEAD LOGGING                                                     │
│                                                                          │
│     Application                                                          │
│         │                                                                │
│         ▼ INSERT INTO orders ...                                         │
│  ┌──────────────┐                                                        │
│  │   Database   │                                                        │
│  │    Server    │                                                        │
│  └──────┬───────┘                                                        │
│         │                                                                │
│    1. Write to WAL (sequential, fast)                                    │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ WAL FILE (append-only)                                            │   │
│  │ [LSN:100 INSERT] [LSN:101 UPDATE] [LSN:102 DELETE] [LSN:103...]  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│    2. Return "committed" to application                                  │
│         │                                                                │
│    3. Later: Background flush to data files                              │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ DATA FILES (random I/O, slower)                                   │   │
│  │ [Page 1] [Page 2] [Page 3] ...                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  On Crash Recovery:                                                      │
│  - Replay WAL from last checkpoint                                       │
│  - Data files restored to consistent state                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### WAL Configuration

```sql
-- PostgreSQL WAL settings
SHOW wal_level;           -- minimal, replica, logical
SHOW max_wal_size;        -- Trigger checkpoint when reached
SHOW min_wal_size;        -- Keep at least this much WAL
SHOW wal_buffers;         -- In-memory WAL buffer

-- Monitor WAL
SELECT pg_current_wal_lsn();  -- Current position
SELECT pg_walfile_name(pg_current_wal_lsn());  -- Current file
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0') / 1024 / 1024 AS wal_mb;
```

---

## Buffer Pool / Shared Buffers

The in-memory cache of data pages.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BUFFER POOL                                                             │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        SHARED MEMORY                               │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │  BUFFER POOL (shared_buffers)                                │  │  │
│  │  │  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐  │  │  │
│  │  │  │Page 1│Page 7│Page 3│Page 9│ Free │ Free │Page 2│Page 5│  │  │  │
│  │  │  │(hot) │(dirty)│(cold)│(hot)│      │      │(cold)│(dirty)│ │  │  │
│  │  │  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  Hot = recently accessed, Cold = not recently accessed             │  │
│  │  Dirty = modified, needs write to disk                             │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Buffer Manager:                                                         │
│  1. Request page → Check buffer pool                                     │
│  2. Hit: Return from memory (fast!)                                      │
│  3. Miss: Load from disk, evict cold page if needed                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Buffer Pool Tuning

```sql
-- PostgreSQL
SHOW shared_buffers;     -- Default often 128MB, set 25% of RAM
SHOW effective_cache_size; -- Hint to planner about OS cache

ALTER SYSTEM SET shared_buffers = '4GB';
-- Requires restart

-- Monitor buffer usage
SELECT 
    c.relname,
    pg_size_pretty(pg_relation_size(c.oid)) AS size,
    count(*) AS buffers,
    round(100.0 * count(*) / (SELECT count(*) FROM pg_buffercache), 1) AS pct
FROM pg_buffercache b
JOIN pg_class c ON b.relfilenode = c.relfilenode
WHERE c.relname NOT LIKE 'pg_%'
GROUP BY c.relname, c.oid
ORDER BY buffers DESC
LIMIT 20;
```

---

## Checkpoints

Periodic writes of all dirty buffers to disk.

```
Timeline:
─────────────────────────────────────────────────────────────────────────►
│                           │                           │
▼ Checkpoint                ▼ Checkpoint                ▼ Checkpoint
└───────────────────────────┴───────────────────────────┴
    WAL generated              WAL generated              WAL generated
    Dirty pages written        Dirty pages written        Dirty pages written
    
On Recovery:
- Start from last checkpoint
- Replay WAL since checkpoint
- Older WAL can be recycled
```

```sql
-- PostgreSQL checkpoint settings
SHOW checkpoint_timeout;        -- Time between checkpoints (default 5min)
SHOW max_wal_size;             -- WAL size triggers checkpoint
SHOW checkpoint_completion_target;  -- Spread writes over this fraction

-- Force checkpoint (for maintenance)
CHECKPOINT;

-- Monitor checkpoints
SELECT * FROM pg_stat_bgwriter;
-- checkpoints_timed: scheduled checkpoints
-- checkpoints_req: forced checkpoints (bad if high)
```

---

## MVCC Implementation

How databases implement Multi-Version Concurrency Control.

### PostgreSQL MVCC

```
┌─────────────────────────────────────────────────────────────────────────┐
│  POSTGRESQL MVCC (Heap-based)                                            │
│                                                                          │
│  Transaction 100 inserts row:                                            │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ Row Version 1                                            │            │
│  │ xmin=100, xmax=null, data="Alice"                        │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                          │
│  Transaction 200 updates row:                                            │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ Row Version 1 (old)                                      │            │
│  │ xmin=100, xmax=200, data="Alice"  ← marked as updated   │            │
│  └─────────────────────────────────────────────────────────┘            │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ Row Version 2 (new)                                      │            │
│  │ xmin=200, xmax=null, data="Alicia"  ← new version       │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                          │
│  Visibility Rule:                                                        │
│  Transaction sees row if:                                                │
│  - xmin committed AND xmin < snapshot_xid                                │
│  - xmax null OR xmax > snapshot_xid OR xmax aborted                      │
│                                                                          │
│  VACUUM removes old versions when no transaction needs them              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### MySQL InnoDB MVCC

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MYSQL INNODB MVCC (Undo-log based)                                      │
│                                                                          │
│  Main Table Row:                                                         │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ data="Alicia", trx_id=200, roll_ptr→                    │            │
│  └───────────────────────────────────────────┬─────────────┘            │
│                                               │                          │
│                                               ▼ Undo Log                 │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ Previous version: data="Alice", trx_id=100, roll_ptr→   │            │
│  └───────────────────────────────────────────┬─────────────┘            │
│                                               │                          │
│                                               ▼                          │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ Original version: data="Alice", trx_id=50               │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                          │
│  To read old version: Follow roll_ptr chain in undo log                  │
│  Main row always has latest version                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## B-Tree Internals

```
┌─────────────────────────────────────────────────────────────────────────┐
│  B-TREE STRUCTURE                                                        │
│                                                                          │
│                    ROOT NODE                                             │
│               ┌────────────────┐                                         │
│               │   [50, 100]    │                                         │
│               └─┬─────┬─────┬──┘                                         │
│              <50│  50-99 │ ≥100                                          │
│            ┌────┘    │    └────┐                                         │
│            ▼         ▼         ▼                                         │
│     INTERNAL     INTERNAL    INTERNAL                                    │
│    ┌────────┐   ┌────────┐  ┌────────┐                                   │
│    │[10,30] │   │[60,80] │  │[120,150]│                                  │
│    └┬──┬──┬─┘   └┬──┬──┬─┘  └┬───┬──┬┘                                   │
│     │  │  │      │  │  │     │   │  │                                    │
│     ▼  ▼  ▼      ▼  ▼  ▼     ▼   ▼  ▼                                    │
│    LEAF NODES (contain actual data or pointers to rows)                  │
│   ┌─────┐ ┌─────┐ ┌─────┐   ... etc                                      │
│   │5,8,9│→│12,15│→│35,40│→                                               │
│   └─────┘ └─────┘ └─────┘                                                │
│            ↑                                                             │
│            Leaf nodes are linked for range scans                         │
│                                                                          │
│  Properties:                                                             │
│  - All leaves at same depth (balanced)                                   │
│  - O(log n) search, insert, delete                                       │
│  - Nodes = pages, good for disk I/O                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Query Execution Pipeline

```
SQL Query: SELECT * FROM users WHERE age > 25 ORDER BY name LIMIT 10;

┌─────────────────────────────────────────────────────────────────────────┐
│  QUERY PROCESSING STAGES                                                 │
│                                                                          │
│  1. PARSER                                                               │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ SQL text → Abstract Syntax Tree (AST)                        │     │
│     │ Check syntax, identify tables/columns                        │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                          │                                               │
│                          ▼                                               │
│  2. ANALYZER                                                             │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ Resolve names, check permissions, type checking              │     │
│     │ AST → Query Tree                                             │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                          │                                               │
│                          ▼                                               │
│  3. REWRITER                                                             │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ Apply rules, expand views, apply RLS policies                │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                          │                                               │
│                          ▼                                               │
│  4. PLANNER/OPTIMIZER                                                    │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ Generate execution plans, estimate costs                     │     │
│     │ Choose: indexes, join order, join algorithms                 │     │
│     │ Query Tree → Execution Plan                                  │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                          │                                               │
│                          ▼                                               │
│  5. EXECUTOR                                                             │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │ Execute plan nodes (Volcano iterator model)                  │     │
│     │ Pull tuples through plan tree                                │     │
│     │ Return results to client                                     │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Statistics and Cost Estimation

The optimizer uses statistics to estimate costs.

```sql
-- PostgreSQL: View statistics
SELECT 
    attname,
    n_distinct,
    most_common_vals,
    most_common_freqs,
    histogram_bounds
FROM pg_stats 
WHERE tablename = 'orders';

-- Update statistics
ANALYZE orders;

-- Extended statistics (for correlated columns)
CREATE STATISTICS orders_multi ON order_date, status FROM orders;
ANALYZE orders;
```

### Cost Model

```
Total Cost = Startup Cost + (Page Fetches × seq_page_cost) 
           + (Random Page Fetches × random_page_cost)
           + (Rows Processed × cpu_tuple_cost)
           + (Index Entries × cpu_index_tuple_cost)
           + (Operators Evaluated × cpu_operator_cost)

PostgreSQL default costs:
- seq_page_cost = 1.0        -- Sequential disk read
- random_page_cost = 4.0     -- Random disk read (4x slower)
- cpu_tuple_cost = 0.01      -- Process one row
- cpu_index_tuple_cost = 0.005
- cpu_operator_cost = 0.0025
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Size shared_buffers appropriately**: 25% of RAM for dedicated DB
- **Monitor buffer hit ratio**: Should be >99% for OLTP
- **Keep statistics updated**: Run ANALYZE after large changes
- **Understand your storage**: SSD changes optimal strategies
- **Monitor checkpoint frequency**: Too often = I/O overhead

### ❌ Avoid:
- **Ignoring bloat**: Dead tuples waste space and slow scans
- **Disabling WAL for performance**: Sacrifices durability
- **Over-allocating shared_buffers**: Leaves less for OS cache
- **Skipping ANALYZE**: Bad stats = bad query plans

---

## Exercises

### Exercise 1: Storage Calculation 🟢

**Scenario:** A table has:
- 10 million rows
- Average row size: 200 bytes
- 8KB page size
- 80% fill factor

Calculate:
1. Estimated table size
2. Number of pages
3. Buffer pool needed for full cache

<details>
<summary>✅ Solution</summary>

**1. Estimated Table Size:**
```
Raw data = 10,000,000 rows × 200 bytes = 2,000,000,000 bytes ≈ 1.86 GB
With overhead (tuple headers, etc.): ~2.2 GB
```

**2. Number of Pages:**
```
Usable space per page = 8KB × 80% fill factor = 6,553 bytes
Rows per page = 6,553 ÷ 200 = ~32 rows/page
Pages needed = 10,000,000 ÷ 32 = 312,500 pages
Size = 312,500 × 8KB = 2.5 GB
```

**3. Buffer Pool for Full Cache:**
```
To cache entire table: 2.5 GB
Plus indexes (estimate 20% of table): 0.5 GB
Plus working memory: 0.5 GB
Recommended shared_buffers for this table: 3.5 GB minimum

But: shared_buffers should be 25% of total RAM
If this is the main table, system needs at least 14 GB RAM
```

**Verification Query:**
```sql
SELECT 
    pg_size_pretty(pg_relation_size('mytable')) AS table_size,
    pg_size_pretty(pg_indexes_size('mytable')) AS index_size,
    pg_size_pretty(pg_total_relation_size('mytable')) AS total_size;
```

</details>

---

### Exercise 2: WAL Analysis 🟡

**Scenario:** A production database shows:
- WAL generation: 10GB per hour
- Checkpoint every 5 minutes
- Disk I/O spikes every 5 minutes
- Application experiences latency spikes

Diagnose and fix.

<details>
<summary>✅ Solution</summary>

**Diagnosis:**

The symptoms suggest **checkpoint storms** - too-frequent checkpoints causing I/O spikes.

```sql
-- Check checkpoint frequency
SELECT * FROM pg_stat_bgwriter;
-- High checkpoints_req indicates forced checkpoints

-- Check current settings
SHOW checkpoint_timeout;     -- Probably 5min (default)
SHOW max_wal_size;          -- Might be too small
SHOW checkpoint_completion_target;
```

**Root Cause:**
- 10GB/hour WAL = 833 MB every 5 minutes
- If max_wal_size < 833MB, checkpoints forced by WAL size
- All dirty pages flushed at once = I/O spike

**Solution:**

```sql
-- Increase max_wal_size to allow longer checkpoint intervals
ALTER SYSTEM SET max_wal_size = '4GB';

-- Spread checkpoint writes over more time (default 0.5 = 50%)
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- Increase checkpoint interval
ALTER SYSTEM SET checkpoint_timeout = '15min';

-- Reload configuration
SELECT pg_reload_conf();
```

**Expected Result:**
```
Before: 
- Checkpoint every 5 min
- 2GB of dirty pages flushed in ~30 seconds
- I/O spike: 60-70 MB/s burst

After:
- Checkpoint every 15 min (or when 4GB WAL)
- Same dirty pages spread over 13.5 minutes (90% of 15min)
- Steady I/O: ~5 MB/s continuous
```

**Monitor improvement:**
```sql
-- Watch for checkpoint spread
SELECT 
    checkpoints_timed,
    checkpoints_req,
    buffers_checkpoint,
    buffers_backend,  -- Should be low (not bypassing bgwriter)
    checkpoint_write_time,
    checkpoint_sync_time
FROM pg_stat_bgwriter;
```

</details>

---

### Exercise 3: MVCC Bloat Investigation 🔴

**Scenario:** Table performance degraded over time:
- SELECT queries getting slower
- Table size: 50GB, but should be ~10GB based on row count
- Autovacuum is running

Investigate and resolve.

<details>
<summary>✅ Solution</summary>

**Diagnosis Steps:**

```sql
-- 1. Check dead tuple count
SELECT 
    relname,
    n_live_tup,
    n_dead_tup,
    round(n_dead_tup::numeric / greatest(n_live_tup, 1) * 100, 2) AS dead_pct,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'orders';

-- 2. Check table bloat
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname || '.' || tablename) - 
                   (reltuples * avg_width)::bigint) AS bloat_estimate
FROM pg_stat_user_tables
JOIN pg_class ON relname = tablename
JOIN (
    SELECT tablename, avg(avg_width) AS avg_width
    FROM pg_stats
    GROUP BY tablename
) s USING (tablename)
WHERE tablename = 'orders';

-- 3. Check for long-running transactions blocking vacuum
SELECT 
    pid,
    now() - xact_start AS duration,
    state,
    query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start;

-- 4. Check autovacuum settings
SHOW autovacuum_vacuum_threshold;
SHOW autovacuum_vacuum_scale_factor;
```

**Common Causes:**

1. **Long-running transactions hold back vacuum:**
```sql
-- Old transactions prevent removing versions
-- Kill or fix application that holds transactions open
SELECT pg_terminate_backend(pid) WHERE ...
```

2. **Autovacuum can't keep up:**
```sql
-- Make autovacuum more aggressive for this table
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.01,  -- Vacuum at 1% dead tuples
    autovacuum_vacuum_threshold = 1000,
    autovacuum_vacuum_cost_limit = 2000     -- Work harder
);
```

3. **Bloat already accumulated, need manual intervention:**
```sql
-- Option A: VACUUM FULL (locks table, rewrites entirely)
VACUUM FULL orders;  -- Requires exclusive lock!

-- Option B: pg_repack (online, minimal locking)
-- Install extension first
pg_repack -t orders -d mydb

-- Option C: CLUSTER (reorders by index, exclusive lock)
CLUSTER orders USING orders_pkey;
```

**Prevention:**

```sql
-- Monitor regularly
CREATE VIEW bloat_monitor AS
SELECT 
    schemaname || '.' || relname AS table,
    pg_size_pretty(pg_relation_size(relid)) AS size,
    n_dead_tup,
    last_autovacuum,
    now() - last_autovacuum AS since_vacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;

-- Alert if dead tuples exceed threshold
-- Set up monitoring for dead_tup ratio
```

</details>

---

## Key Takeaways

- 📄 **Pages are fundamental**: All I/O in page-sized chunks
- 📝 **WAL ensures durability**: Write-ahead, replay on crash
- 🧠 **Buffer pool is critical**: Tune shared_buffers appropriately
- ⏰ **Checkpoints balance durability vs performance**: Tune carefully
- 🔄 **MVCC enables concurrency**: But creates dead tuples
- 🧹 **Vacuum/maintenance is essential**: Dead tuples cause bloat

---

## Related Topics

- [Query Execution Internals](/databases/08-query-execution-internals.md) - Query plans
- [Indexing Deep Dive](/databases/07-indexing-deep-dive.md) - B-tree details
- [Performance Tuning](/databases/10-performance-tuning.md) - Configuration tuning
