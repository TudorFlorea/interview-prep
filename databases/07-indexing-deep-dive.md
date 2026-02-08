# Indexing Deep Dive

[← Back to Index](/databases/00-index.md)

---

## Overview

Indexes are data structures that improve the speed of data retrieval operations at the cost of additional storage and slower writes. Understanding how indexes work, when to use them, and how to design them is critical for database performance.

### When This Matters Most
- Query performance optimization
- Database design for read-heavy workloads
- Understanding EXPLAIN plans
- Scaling databases efficiently

---

## Core Concepts

### How Indexes Work

An index is like a book's index: instead of scanning every page (full table scan), you look up keywords and jump directly to the relevant pages.

```
┌──────────────────────────────────────────────────────────────────┐
│                      WITHOUT INDEX                                │
│                                                                   │
│   SELECT * FROM users WHERE email = 'alice@example.com'          │
│                                                                   │
│   ┌─────┬───────────────────────┬──────────┐                     │
│   │ id  │ email                 │ name     │  ← Scan row 1       │
│   │ 1   │ bob@example.com       │ Bob      │  ← Not a match      │
│   │ 2   │ carol@example.com     │ Carol    │  ← Not a match      │
│   │ 3   │ alice@example.com     │ Alice    │  ← MATCH! (row 3)   │
│   │ ... │ ...                   │ ...      │  ← Keep scanning... │
│   │ N   │ ...                   │ ...      │  ← Scanned N rows   │
│   └─────┴───────────────────────┴──────────┘                     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       WITH INDEX                                  │
│                                                                   │
│   B-Tree Index on email:                                         │
│                                                                   │
│                    ┌───────────────┐                              │
│                    │  d...  │  m... │  ← Root                     │
│                    └───┬───────┬───┘                              │
│                   ┌────┘       └────┐                             │
│             ┌─────┴─────┐     ┌─────┴─────┐                       │
│             │ a... │ c..│     │ j... │ z..│  ← Leaf               │
│             └──┬───────┘     └───────────┘                        │
│                │                                                  │
│          alice@ → Row 3     (Direct lookup: 2-3 steps)           │
└──────────────────────────────────────────────────────────────────┘
```

---

### Index Types

| Type | Description | Use Case | Example |
|------|-------------|----------|---------|
| **B-Tree** | Balanced tree, sorted | Most queries: =, &lt;, >, BETWEEN, ORDER BY | Default index type |
| **Hash** | Hash table | Equality only (=) | PostgreSQL specific |
| **GIN** | Generalized Inverted | Full-text, arrays, JSONB | Array contains, text search |
| **GiST** | Generalized Search Tree | Geometric, range types | Geo queries, overlap |
| **BRIN** | Block Range Index | Large sorted tables | Time-series data |

```sql
-- B-Tree (default)
CREATE INDEX idx_users_email ON users(email);

-- Hash (PostgreSQL)
CREATE INDEX idx_users_email_hash ON users USING HASH (email);

-- GIN for array contains
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);

-- GiST for geometric
CREATE INDEX idx_locations_point ON locations USING GIST (coordinates);

-- BRIN for time-series
CREATE INDEX idx_logs_timestamp ON logs USING BRIN (created_at);
```

---

### B-Tree Deep Dive

The most common index type. Keeps data sorted and balanced.

**Structure:**
```
                        ┌─────────────────────────┐
                        │   [50]                  │  Root
                        └─────────────────────────┘
                       /                          \
          ┌───────────────────┐          ┌───────────────────┐
          │  [20] [35]        │          │  [70] [85]        │  Internal
          └───────────────────┘          └───────────────────┘
         /     |       \                /      |       \
    ┌──────┐ ┌──────┐ ┌──────┐    ┌──────┐ ┌──────┐ ┌──────┐
    │10,15 │ │25,30 │ │40,45 │    │55,65 │ │75,80 │ │90,95 │  Leaf
    └──────┘ └──────┘ └──────┘    └──────┘ └──────┘ └──────┘
       ↓        ↓        ↓           ↓        ↓        ↓
    (rows)   (rows)   (rows)      (rows)   (rows)   (rows)
```

**Complexity:**
- Lookup: O(log n)
- Insert: O(log n)
- Range scan: O(log n + k) where k = rows returned

**Good for:**
- `=` equality
- `&lt;`, `>`, `&lt;=`, `>=` comparisons
- `BETWEEN`
- `LIKE 'prefix%'` (prefix search)
- `ORDER BY` (already sorted!)
- `IS NULL` / `IS NOT NULL`

**Not good for:**
- `LIKE '%suffix'` (no prefix)
- Complex expressions unless indexed exactly

---

## Index Strategies

### Single-Column Index

```sql
-- Most basic index
CREATE INDEX idx_customers_email ON customers(email);

-- Query that uses it
SELECT * FROM customers WHERE email = 'alice@example.com';
```

### Composite (Multi-Column) Index

Column order matters! Index on (a, b, c) can be used for:
- Queries on (a)
- Queries on (a, b)
- Queries on (a, b, c)
- But NOT for queries on (b) or (c) alone

```sql
-- Composite index
CREATE INDEX idx_orders_customer_date 
ON orders(customer_id, order_date);

-- ✅ Uses index (leftmost prefix)
SELECT * FROM orders WHERE customer_id = 123;
SELECT * FROM orders WHERE customer_id = 123 AND order_date = '2024-01-15';
SELECT * FROM orders WHERE customer_id = 123 ORDER BY order_date;

-- ❌ Cannot use index (missing leftmost column)
SELECT * FROM orders WHERE order_date = '2024-01-15';

-- Partial use (customer_id only)
SELECT * FROM orders WHERE customer_id = 123 AND status = 'shipped';
```

**Ordering Columns in Composite Index:**
1. Equality conditions first (`WHERE col = value`)
2. Range conditions next (`WHERE col > value`)
3. ORDER BY columns last

```sql
-- Query: WHERE customer_id = ? AND order_date >= ? ORDER BY total_amount DESC
CREATE INDEX idx_optimal ON orders(customer_id, order_date, total_amount);
```

### Covering Index (Include All Columns)

Index contains all columns needed by query → no table access needed.

```sql
-- Query frequently runs:
SELECT customer_id, order_date, total_amount 
FROM orders 
WHERE customer_id = 123;

-- Covering index
CREATE INDEX idx_covering ON orders(customer_id, order_date, total_amount);

-- PostgreSQL: INCLUDE for non-key columns
CREATE INDEX idx_covering ON orders(customer_id) INCLUDE (order_date, total_amount);

-- SQL Server: INCLUDE clause
CREATE INDEX idx_covering ON orders(customer_id) INCLUDE (order_date, total_amount);
```

The query becomes "index-only scan" - much faster!

### Partial (Filtered) Index

Index only a subset of rows.

```sql
-- Only index active users (much smaller index)
CREATE INDEX idx_active_users ON users(email) WHERE is_active = TRUE;

-- Only index recent orders
CREATE INDEX idx_recent_orders ON orders(customer_id, order_date)
WHERE order_date >= '2024-01-01';

-- Only non-null values
CREATE INDEX idx_shipped_orders ON orders(shipped_at) WHERE shipped_at IS NOT NULL;
```

**Benefits:**
- Smaller index size
- Faster maintenance
- Better cache efficiency

**Query must match the WHERE condition to use the index!**

```sql
-- ✅ Uses partial index
SELECT * FROM users WHERE email = 'alice@example.com' AND is_active = TRUE;

-- ❌ Cannot use partial index (missing condition)
SELECT * FROM users WHERE email = 'alice@example.com';
```

### Expression Index (Functional Index)

Index on an expression or function result.

```sql
-- Index on lowercase email
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Query must use same expression
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- Index on extracted date part
CREATE INDEX idx_orders_year ON orders(EXTRACT(YEAR FROM order_date));

-- Index on JSON field
CREATE INDEX idx_users_preferences_theme 
ON users((preferences->>'theme'));
```

---

## Index Performance Factors

### Selectivity

How "unique" the indexed values are. Higher selectivity = more efficient.

```sql
-- High selectivity (good for index)
email (mostly unique values)
customer_id (many distinct values)

-- Low selectivity (poor for index)
gender (only 2-3 values)
is_active (boolean)
status (few values like 'pending', 'active', 'closed')
```

**Rule of thumb:** Index is useful when it filters out >90% of rows.

```sql
-- Check selectivity
SELECT 
    COUNT(DISTINCT status) AS distinct_values,
    COUNT(*) AS total_rows,
    COUNT(DISTINCT status)::float / COUNT(*) AS selectivity
FROM orders;

-- If status has 5 values and 1M rows, selectivity = 0.000005 (very low)
-- Index on status alone won't help much
```

### Index Size

Larger indexes = slower updates, more memory needed.

```sql
-- Check index sizes (PostgreSQL)
SELECT 
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- MySQL
SHOW INDEX FROM table_name;
SELECT index_name, stat_value * @@innodb_page_size AS size_bytes
FROM mysql.innodb_index_stats
WHERE table_name = 'your_table' AND stat_name = 'size';
```

### Write Overhead

Each index slows down INSERT, UPDATE, DELETE.

```sql
-- Table with 5 indexes: Each INSERT updates 5 index structures
-- Consider: Is this index worth the write cost?

-- Find unused indexes (PostgreSQL)
SELECT 
    indexrelname,
    idx_scan AS times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Index Maintenance

### Monitoring Index Usage

```sql
-- PostgreSQL: Index usage statistics
SELECT 
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- MySQL: Index usage from performance_schema
SELECT 
    object_name AS table_name,
    index_name,
    count_read,
    count_write
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL
ORDER BY count_read DESC;
```

### Index Fragmentation

Over time, indexes become fragmented (pages split, gaps form).

```sql
-- PostgreSQL: Check bloat and reindex
SELECT 
    schemaname, 
    relname, 
    n_dead_tup, 
    n_live_tup,
    round(n_dead_tup * 100.0 / nullif(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Rebuild index
REINDEX INDEX idx_name;
REINDEX TABLE table_name;

-- Concurrent reindex (doesn't lock table, PostgreSQL 12+)
REINDEX INDEX CONCURRENTLY idx_name;

-- MySQL: Optimize table (rebuilds indexes)
OPTIMIZE TABLE table_name;

-- SQL Server: Rebuild or reorganize
ALTER INDEX idx_name ON table_name REBUILD;
ALTER INDEX idx_name ON table_name REORGANIZE;
```

### Removing Unused Indexes

```sql
-- Find duplicate indexes (PostgreSQL)
SELECT 
    a.indexrelid::regclass AS index_1,
    b.indexrelid::regclass AS index_2,
    a.indkey AS columns_1,
    b.indkey AS columns_2
FROM pg_index a
JOIN pg_index b ON a.indrelid = b.indrelid 
    AND a.indexrelid != b.indexrelid
    AND a.indkey = b.indkey;

-- Drop unused index
DROP INDEX IF EXISTS idx_never_used;
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Index foreign keys**: Almost always needed for JOINs
- **Index WHERE clause columns**: Starting with highest selectivity
- **Use composite indexes**: For multi-column queries
- **Consider covering indexes**: For frequently-run read queries
- **Monitor usage**: Remove unused indexes

### ❌ Avoid:
- **Over-indexing**: Each index has write cost
- **Indexing low-selectivity columns alone**: Boolean, status fields
- **Indexing small tables**: Sequential scan is fine for &lt;1000 rows
- **Duplicate indexes**: Check if composite index covers simpler queries
- **Ignoring index maintenance**: Bloated indexes are slow

### Index Decision Framework

```
┌─────────────────────────────────────────────────────────────┐
│ Should I create an index?                                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Is the table large enough (>1000 rows)? ─────┬─── No ──→ Skip │
│                                                  │                │
│ 2. Is this query run frequently?  ──────────────┬─── No ──→ Skip │
│                                                  │                │
│ 3. Is the column selective (many distinct)?  ───┬─── No ──→ Maybe│
│                                                  │     (consider  │
│ 4. Can I use an existing composite index?  ─────┤     composite) │
│                                                  │                │
│ 5. Is write performance critical?  ─────────────┼─── Yes ─→ Limit│
│                                                  │     indexes    │
│ 6. CREATE INDEX!                                 │                │
└──────────────────────────────────────────────────┴────────────────┘
```

---

## Exercises

### Exercise 1: Basic Indexing 🟢

Given this table and common queries:

```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_country VARCHAR(50)
);

-- Common queries:
-- Q1: SELECT * FROM orders WHERE customer_id = ?
-- Q2: SELECT * FROM orders WHERE order_date BETWEEN ? AND ?
-- Q3: SELECT * FROM orders WHERE status = 'pending' ORDER BY order_date
```

**Task:** Design appropriate indexes for each query.

<details>
<summary>✅ Solution</summary>

```sql
-- Q1: Lookup by customer_id (high selectivity)
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Q2: Date range query
CREATE INDEX idx_orders_date ON orders(order_date);

-- Q3: Status filter + date ordering
-- Status alone has low selectivity, but combined with date sort:
CREATE INDEX idx_orders_status_date ON orders(status, order_date);

-- Alternative: Partial index if 'pending' is common query
CREATE INDEX idx_orders_pending ON orders(order_date) 
WHERE status = 'pending';

-- If all three queries are equally important:
-- Consider composite: (customer_id, order_date, status)
-- Would work for Q1 and partially for Q2/Q3
```

</details>

---

### Exercise 2: Composite Index Design 🟡

**Scenario:** An e-commerce reporting system runs these queries thousands of times daily:

```sql
-- Report 1: Customer order history
SELECT order_id, order_date, total_amount 
FROM orders 
WHERE customer_id = ? 
ORDER BY order_date DESC;

-- Report 2: Daily revenue by customer tier
SELECT c.tier, SUM(o.total_amount)
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.order_date = ?
GROUP BY c.tier;

-- Report 3: Top customers in date range
SELECT customer_id, SUM(total_amount) as total
FROM orders
WHERE order_date BETWEEN ? AND ?
  AND status = 'completed'
GROUP BY customer_id
ORDER BY total DESC
LIMIT 100;
```

**Task:** Design an optimal indexing strategy. Consider trade-offs.

<details>
<summary>✅ Solution</summary>

```sql
-- Report 1: Customer order history
-- Needs: customer_id (filter), order_date (sort), columns in SELECT
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date DESC)
INCLUDE (order_id, total_amount);  -- Covering index

-- Report 2: Daily revenue by customer tier
-- Main filter is on order_date, then JOIN to customers
CREATE INDEX idx_orders_date ON orders(order_date);
-- customers.customer_id should already be indexed (PK or FK)

-- Report 3: Date range + status filter + aggregate
-- status = 'completed' is a filter, consider partial index
CREATE INDEX idx_orders_completed_date ON orders(order_date, customer_id, total_amount)
WHERE status = 'completed';

-- Or if status varies in queries:
CREATE INDEX idx_orders_status_date ON orders(status, order_date, customer_id);

-- Trade-off analysis:
-- - 3 indexes for optimal read performance
-- - Each INSERT/UPDATE touches all 3 indexes
-- - For write-heavy system, might consolidate to:
CREATE INDEX idx_orders_main ON orders(customer_id, order_date, status);
-- Less optimal but covers multiple query patterns
```

</details>

---

### Exercise 3: Index Troubleshooting 🔴

**Scenario:** This query is slow despite having indexes:

```sql
-- Takes 30 seconds on 10M row table
SELECT * 
FROM orders 
WHERE YEAR(order_date) = 2024
  AND customer_id IN (SELECT customer_id FROM vip_customers)
ORDER BY order_date DESC
LIMIT 100;

-- Existing indexes:
-- PRIMARY KEY (order_id)
-- INDEX idx_customer (customer_id)
-- INDEX idx_date (order_date)
```

**Task:**
1. Identify why existing indexes aren't helping
2. Propose solutions
3. Rewrite the query if needed

<details>
<summary>✅ Solution</summary>

**Problems Identified:**

1. `YEAR(order_date) = 2024` - Function on indexed column prevents index use
2. `SELECT *` - Forces table access even if index scan happens
3. `IN (SELECT ...)` - May not correlate with the main index strategy
4. No composite index for common pattern

**Solutions:**

```sql
-- 1. Fix the date filter (use range instead of function)
WHERE order_date >= '2024-01-01' AND order_date &lt; '2025-01-01'

-- 2. Create better index
CREATE INDEX idx_orders_date_customer ON orders(order_date DESC, customer_id);

-- 3. Rewrite with explicit JOIN
SELECT o.* 
FROM orders o
JOIN vip_customers v ON o.customer_id = v.customer_id
WHERE o.order_date >= '2024-01-01' 
  AND o.order_date &lt; '2025-01-01'
ORDER BY o.order_date DESC
LIMIT 100;

-- 4. If only specific columns needed, use covering index
CREATE INDEX idx_orders_vip_lookup ON orders(
    order_date DESC, 
    customer_id
) INCLUDE (order_id, total_amount, status);

-- Alternative: Expression index for YEAR (if can't change query)
CREATE INDEX idx_orders_year ON orders(EXTRACT(YEAR FROM order_date), customer_id);

-- 5. If vip_customers is small, consider EXISTS pattern
SELECT o.*
FROM orders o
WHERE o.order_date >= '2024-01-01' 
  AND o.order_date &lt; '2025-01-01'
  AND EXISTS (SELECT 1 FROM vip_customers v WHERE v.customer_id = o.customer_id)
ORDER BY o.order_date DESC
LIMIT 100;

-- With index: orders(order_date DESC) and vip_customers(customer_id)
```

**Verify with EXPLAIN:**
```sql
EXPLAIN ANALYZE
SELECT o.* 
FROM orders o
JOIN vip_customers v ON o.customer_id = v.customer_id
WHERE o.order_date >= '2024-01-01' AND o.order_date &lt; '2025-01-01'
ORDER BY o.order_date DESC
LIMIT 100;

-- Look for:
-- - Index Scan (not Seq Scan)
-- - Reasonable row estimates
-- - Sort avoided if index provides order
```

</details>

---

## Key Takeaways

- 🌲 **B-Tree** is the default and handles most use cases (=, &lt;, >, BETWEEN, ORDER BY)
- 📊 **Selectivity matters** - index columns that filter out most rows
- 📚 **Column order in composites** - leftmost prefix must be used
- 📑 **Covering indexes** eliminate table access for huge speedups
- 🎯 **Partial indexes** reduce size and maintenance for filtered queries
- ⚖️ **Balance reads vs writes** - each index slows down writes
- 🔍 **Monitor and maintain** - find unused indexes, rebuild fragmented ones

---

## Related Topics

- [Query Execution Internals](/databases/08-query-execution-internals.md) - How indexes are used
- [Query Optimization](/databases/09-query-optimization.md) - Choosing the right index
- [Performance Tuning](/databases/10-performance-tuning.md) - Overall optimization strategy
