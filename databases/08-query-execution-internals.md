# Query Execution Internals

[← Back to Index](/databases/00-index.md)

---

## Overview

Understanding how databases execute queries helps you write faster SQL and debug performance issues. This chapter explores query parsing, optimization, execution plans, and the internal operations that transform your SQL into results.

### When This Matters Most
- Debugging slow queries
- Understanding EXPLAIN output
- Making informed optimization decisions
- Technical interviews on database internals

---

## Query Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        QUERY LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  SQL Query                                                               │
│      │                                                                   │
│      ▼                                                                   │
│  ┌─────────┐                                                             │
│  │ PARSER  │  → Syntax check, create parse tree                         │
│  └────┬────┘                                                             │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────┐                                                         │
│  │  ANALYZER   │  → Validate tables/columns, resolve names               │
│  └──────┬──────┘                                                         │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────┐                                                         │
│  │  REWRITER   │  → Apply rules, expand views                            │
│  └──────┬──────┘                                                         │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────┐                                                         │
│  │  OPTIMIZER  │  → Generate execution plans, choose cheapest            │
│  └──────┬──────┘                                                         │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────┐                                                         │
│  │  EXECUTOR   │  → Execute plan, return results                         │
│  └─────────────┘                                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Query Optimizer

The optimizer's job is to find the most efficient way to execute a query. It considers:

1. **Available indexes**
2. **Table statistics** (row counts, value distributions)
3. **Join order** (which table to start with)
4. **Join algorithms** (nested loop, hash, merge)
5. **Access methods** (sequential scan, index scan)

### Cost-Based Optimization

The optimizer estimates "cost" for each possible plan:

```sql
-- The optimizer might consider:
-- Plan A: Seq Scan on orders, filter customer_id (Cost: 15000)
-- Plan B: Index Scan on idx_customer_id (Cost: 50)
-- Winner: Plan B
```

Costs are abstract units based on:
- Disk I/O (page reads)
- CPU processing (tuple comparisons)
- Memory usage
- Network transfer

---

## Execution Plan Operations

### Access Methods

How the database reads data from tables:

| Operation | Description | When Used |
|-----------|-------------|-----------|
| **Sequential Scan** | Read every row | No useful index, small table |
| **Index Scan** | Use index, then fetch rows | Index covers filter, few rows returned |
| **Index Only Scan** | Read only from index | All needed columns in index |
| **Bitmap Scan** | Build bitmap from index, then scan | Multiple conditions, moderate rows |

```sql
-- Sequential Scan (full table read)
EXPLAIN SELECT * FROM orders WHERE notes LIKE '%urgent%';
-- Seq Scan on orders  (cost=0.00..15000.00 rows=50 width=100)
--   Filter: (notes ~~ '%urgent%'::text)

-- Index Scan (use index, fetch rows)
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;
-- Index Scan using idx_customer on orders  (cost=0.42..8.44 rows=5 width=100)
--   Index Cond: (customer_id = 123)

-- Index Only Scan (all data from index)
EXPLAIN SELECT customer_id, order_date FROM orders WHERE customer_id = 123;
-- Index Only Scan using idx_customer_date on orders  (cost=0.42..4.44 rows=5 width=12)
--   Index Cond: (customer_id = 123)
```

### Join Algorithms

| Algorithm | How It Works | Best When |
|-----------|--------------|-----------|
| **Nested Loop** | For each row in A, scan B | Small outer table, indexed inner |
| **Hash Join** | Build hash table from A, probe with B | Medium tables, no useful index |
| **Merge Join** | Sort both, merge | Both already sorted, large tables |

```sql
-- Nested Loop (outer small, inner indexed)
EXPLAIN SELECT * FROM customers c JOIN orders o ON c.customer_id = o.customer_id;
-- Nested Loop  (cost=0.42..100.00)
--   -> Seq Scan on customers c
--   -> Index Scan using idx_orders_customer on orders o
--         Index Cond: (customer_id = c.customer_id)

-- Hash Join (no index, medium tables)  
EXPLAIN SELECT * FROM orders o JOIN order_items oi ON o.order_id = oi.order_id;
-- Hash Join  (cost=50.00..150.00)
--   Hash Cond: (oi.order_id = o.order_id)
--   -> Seq Scan on order_items oi
--   -> Hash
--         -> Seq Scan on orders o

-- Merge Join (both sorted)
EXPLAIN SELECT * FROM a JOIN b ON a.id = b.id ORDER BY a.id;
-- Merge Join  (cost=100.00..200.00)
--   Merge Cond: (a.id = b.id)
--   -> Index Scan using a_pkey on a
--   -> Index Scan using b_id_idx on b
```

### Other Operations

| Operation | Description |
|-----------|-------------|
| **Sort** | Sort rows (for ORDER BY, merge join) |
| **Aggregate** | GROUP BY, COUNT, SUM, etc. |
| **Hash Aggregate** | GROUP BY using hash table |
| **Limit** | Stop after N rows |
| **Materialize** | Store intermediate results |
| **Unique** | Remove duplicates |
| **Append** | UNION ALL multiple inputs |

---

## Reading EXPLAIN Output

### Basic EXPLAIN

```sql
EXPLAIN SELECT * FROM orders WHERE customer_id = 123;

-- Output:
-- Index Scan using idx_customer on orders  (cost=0.42..8.44 rows=5 width=100)
--   Index Cond: (customer_id = 123)
```

**Understanding the numbers:**
- `cost=0.42..8.44`: Startup cost..total cost (abstract units)
- `rows=5`: Estimated rows returned
- `width=100`: Estimated bytes per row

### EXPLAIN ANALYZE

Actually runs the query and shows real numbers:

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;

-- Output:
-- Index Scan using idx_customer on orders  
--   (cost=0.42..8.44 rows=5 width=100) 
--   (actual time=0.015..0.020 rows=7 loops=1)
--   Index Cond: (customer_id = 123)
-- Planning Time: 0.100 ms
-- Execution Time: 0.050 ms
```

**New information:**
- `actual time=0.015..0.020`: Real time in ms (startup..total)
- `rows=7`: Actual rows (vs. estimated 5)
- `loops=1`: How many times this node executed
- `Planning Time`: Time to create the plan
- `Execution Time`: Time to execute

### EXPLAIN Options

```sql
-- PostgreSQL: All options
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT * FROM orders WHERE customer_id = 123;

-- Shows buffer usage:
-- Buffers: shared hit=5 read=2

-- Format as JSON (for tools)
EXPLAIN (ANALYZE, FORMAT JSON) SELECT ...;

-- MySQL
EXPLAIN FORMAT=TREE SELECT ...;
EXPLAIN ANALYZE SELECT ...;  -- MySQL 8.0.18+

-- SQL Server
SET STATISTICS IO ON;
SET STATISTICS TIME ON;
SELECT ...;
-- or
SET SHOWPLAN_ALL ON;
```

---

## Common Plan Problems

### Problem 1: Wrong Cardinality Estimates

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending';

-- Expected: rows=100, Actual: rows=50000
-- The optimizer thought 100 rows, planned accordingly (nested loop)
-- Actually got 50000 rows (should have used hash join)
```

**Cause:** Outdated statistics
**Fix:**
```sql
-- PostgreSQL
ANALYZE orders;

-- MySQL
ANALYZE TABLE orders;

-- SQL Server
UPDATE STATISTICS orders;
```

### Problem 2: Sequential Scan Instead of Index

```sql
EXPLAIN SELECT * FROM orders WHERE status = 'pending';
-- Seq Scan (not using idx_status)
```

**Possible causes:**
1. Statistics say most rows match (low selectivity)
2. Query returns >10-20% of table (seq scan is faster)
3. Function on indexed column: `WHERE UPPER(status) = 'PENDING'`
4. Type mismatch: `WHERE status = 123` (status is VARCHAR)

### Problem 3: Bad Join Order

```sql
EXPLAIN ANALYZE
SELECT * FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE p.category_id = 5;

-- If it starts with orders (1M rows) instead of 
-- products with category=5 (100 rows), it's inefficient
```

**Fix:** Usually optimizer gets it right with good statistics. If not:
```sql
-- Hint (use sparingly)
SELECT /*+ LEADING(p oi o) */ ...  -- Oracle/MySQL hints
```

---

## Statistics and Cardinality

### What Statistics Track

```sql
-- PostgreSQL: View table statistics
SELECT 
    relname,
    reltuples AS row_count,
    relpages AS page_count
FROM pg_class
WHERE relname = 'orders';

-- Column statistics
SELECT 
    attname,
    n_distinct,
    most_common_vals,
    most_common_freqs,
    histogram_bounds
FROM pg_stats
WHERE tablename = 'orders';
```

### Updating Statistics

```sql
-- PostgreSQL: Analyze specific table
ANALYZE orders;

-- Analyze all tables
ANALYZE;

-- With verbose output
ANALYZE VERBOSE orders;

-- MySQL
ANALYZE TABLE orders;

-- SQL Server
UPDATE STATISTICS orders;
UPDATE STATISTICS orders WITH FULLSCAN;  -- More accurate
```

### Statistics-Related Settings

```sql
-- PostgreSQL: Sample size for ANALYZE
ALTER TABLE orders SET (autovacuum_analyze_scale_factor = 0.02);

-- MySQL: Histogram support (8.0+)
ANALYZE TABLE orders UPDATE HISTOGRAM ON status, customer_id;

-- View histogram
SELECT * FROM information_schema.column_statistics
WHERE table_name = 'orders';
```

---

## Execution Plan Deep Dive

### Nested Query Execution

```sql
EXPLAIN ANALYZE
SELECT c.name, 
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS order_count
FROM customers c
WHERE c.tier = 'gold';

-- Plan might show:
-- Seq Scan on customers  (loops=1)
--   Filter: (tier = 'gold')
--   SubPlan 1
--     -> Aggregate  (loops=50)  -- Runs 50 times!
--           -> Index Scan on orders  (loops=50)
```

**The `loops=50` means the subquery runs for each of the 50 gold customers.**

### Parallel Query Execution

```sql
EXPLAIN ANALYZE SELECT COUNT(*) FROM orders;

-- Gather  (actual time=50..55 rows=1)
--   Workers Planned: 2
--   Workers Launched: 2
--   -> Partial Aggregate  (actual loops=3)  -- 3 = leader + 2 workers
--         -> Parallel Seq Scan on orders  (loops=3)
```

**Understanding parallel plans:**
- `Gather`: Collects results from parallel workers
- `Workers Planned/Launched`: Parallelism level
- Total time divided among workers

---

## Common Patterns & Best Practices

### ✅ Do:
- **Run EXPLAIN ANALYZE**: Actual numbers reveal reality
- **Check row estimates**: Big difference from actual = stale stats
- **Look for Seq Scans on large tables**: Usually indicates missing index
- **Keep statistics updated**: ANALYZE regularly or enable autovacuum
- **Read plans bottom-up**: Innermost operations execute first

### ❌ Avoid:
- **Trusting cost alone**: It's an estimate, compare with actual time
- **Ignoring loops**: Nested loop × 10000 loops = slow
- **Over-optimizing**: If it's fast enough, move on
- **Hints as first solution**: Fix data/indexes/statistics first

---

## Exercises

### Exercise 1: Read an Explain Plan 🟢

**Given this plan, answer the questions:**

```
Hash Join  (cost=16.75..133.00 rows=500 width=48) (actual time=0.150..0.800 rows=487 loops=1)
  Hash Cond: (o.customer_id = c.customer_id)
  -> Seq Scan on orders o  (cost=0.00..105.00 rows=5000 width=24) (actual time=0.010..0.300 rows=5000 loops=1)
  -> Hash  (cost=11.50..11.50 rows=420 width=24) (actual time=0.100..0.100 rows=420 loops=1)
        Buckets: 1024  Batches: 1  Memory Usage: 20kB
        -> Seq Scan on customers c  (cost=0.00..11.50 rows=420 width=24) (actual time=0.005..0.050 rows=420 loops=1)
              Filter: (tier = 'gold'::text)
              Rows Removed by Filter: 580
Planning Time: 0.200 ms
Execution Time: 1.000 ms
```

**Questions:**
1. What join algorithm is used?
2. How many customers matched the filter?
3. Was the row estimate accurate?
4. What could make this faster?

<details>
<summary>✅ Answers</summary>

1. **Hash Join** - customers table is hashed, then orders are probed against it

2. **420 customers matched** (tier = 'gold'), 580 were removed by filter

3. **Estimates were accurate:**
   - Customers: estimated 420, actual 420 ✓
   - Orders: estimated 5000, actual 5000 ✓
   - Final: estimated 500, actual 487 (close enough) ✓

4. **Potential improvements:**
   - Index on `customers(tier)` would help filter (though 420/1000 = 42% might still seq scan)
   - Index on `orders(customer_id)` might enable nested loop if customers are fewer
   - The query is already fast (1ms) - probably fine as-is

</details>

---

### Exercise 2: Diagnose a Slow Query 🟡

**This query is slow. Analyze the plan and propose fixes:**

```sql
SELECT p.name, SUM(oi.quantity) as total_sold
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE EXTRACT(YEAR FROM o.order_date) = 2024
GROUP BY p.product_id, p.name
ORDER BY total_sold DESC
LIMIT 10;
```

```
Limit  (actual time=2500.000..2500.100 rows=10)
  -> Sort  (actual time=2500.000..2500.050 rows=10)
        Sort Key: (sum(oi.quantity)) DESC
        -> HashAggregate  (actual time=2400.000..2450.000 rows=1000)
              Group Key: p.product_id
              -> Hash Join  (actual time=100.000..2000.000 rows=500000)
                    Hash Cond: (oi.product_id = p.product_id)
                    -> Hash Join  (actual time=50.000..1800.000 rows=500000)
                          Hash Cond: (oi.order_id = o.order_id)
                          -> Seq Scan on order_items oi  (actual time=0.050..200.000 rows=2000000)
                          -> Hash  (actual time=40.000..40.000 rows=200000)
                                -> Seq Scan on orders o  (actual time=0.050..30.000 rows=200000)
                                      Filter: (EXTRACT(year FROM order_date) = 2024)
                                      Rows Removed by Filter: 800000
                    -> Hash  (actual time=5.000..5.000 rows=1000)
                          -> Seq Scan on products p  (actual time=0.010..3.000 rows=1000)
Planning Time: 1.000 ms
Execution Time: 2500.500 ms
```

<details>
<summary>✅ Analysis and Solution</summary>

**Problems Identified:**

1. **`EXTRACT(YEAR FROM order_date) = 2024`** - Function prevents index use on `order_date`
   - Seq Scan on orders reads 1M rows to get 200K

2. **Seq Scan on order_items (2M rows)** - No index being used
   
3. **Hash joins throughout** - Not necessarily bad, but lot of data flowing

**Solutions:**

```sql
-- 1. Rewrite date filter to use range (allows index)
WHERE o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01'

-- 2. Create supporting indexes
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- 3. Optimized query
SELECT p.name, SUM(oi.quantity) as total_sold
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_date >= '2024-01-01' AND o.order_date < '2025-01-01'
GROUP BY p.product_id, p.name
ORDER BY total_sold DESC
LIMIT 10;

-- Expected improvement:
-- - Index scan on orders (date range)
-- - Nested loop or merge join with indexed lookups
-- - Much fewer rows flowing through pipeline
```

</details>

---

### Exercise 3: Plan Comparison 🔴

**Two developers propose different queries for the same result. Compare the plans and recommend which to use:**

**Query A:**
```sql
SELECT c.customer_id, c.name, order_stats.total_orders, order_stats.total_amount
FROM customers c
JOIN (
    SELECT customer_id, COUNT(*) as total_orders, SUM(total_amount) as total_amount
    FROM orders
    GROUP BY customer_id
) order_stats ON c.customer_id = order_stats.customer_id
WHERE c.tier = 'gold';
```

**Query B:**
```sql
SELECT c.customer_id, c.name, COUNT(o.order_id) as total_orders, SUM(o.total_amount) as total_amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE c.tier = 'gold'
GROUP BY c.customer_id, c.name;
```

<details>
<summary>✅ Analysis</summary>

**Query A Analysis:**
```
Hash Join
  Hash Cond: (order_stats.customer_id = c.customer_id)
  -> Subquery Scan on order_stats
        -> HashAggregate  -- Aggregates ALL orders first
              -> Seq Scan on orders (1M rows)
  -> Hash
        -> Seq Scan on customers (filter tier='gold', ~400 rows)
```

**Query B Analysis:**
```
HashAggregate
  Group Key: c.customer_id
  -> Hash Right Join
        Hash Cond: (o.customer_id = c.customer_id)
        -> Seq Scan on orders
        -> Hash
              -> Seq Scan on customers (filter tier='gold', ~400 rows)
```

**Comparison:**

| Aspect | Query A | Query B |
|--------|---------|---------|
| Aggregation scope | All customers, then filter | Only gold customers' orders |
| Work done | Aggregate 1M orders, then discard most | Aggregate only relevant orders |
| Customers with no orders | Excluded (INNER JOIN) | Included with 0/NULL (LEFT JOIN) |

**Recommendation:**

**Query B is likely better IF:**
- There's an index on `orders(customer_id)` 
- Gold customers are a small fraction
- The optimizer uses the customer filter first

**Query A might be better IF:**
- You often need this aggregation for all customers (could cache)
- The subquery is materialized/cached

**Best approach - rewrite Query A to filter first:**
```sql
SELECT c.customer_id, c.name, 
       COALESCE(o.total_orders, 0) as total_orders,
       COALESCE(o.total_amount, 0) as total_amount
FROM customers c
LEFT JOIN (
    SELECT customer_id, COUNT(*) as total_orders, SUM(total_amount) as total_amount
    FROM orders
    WHERE customer_id IN (SELECT customer_id FROM customers WHERE tier = 'gold')
    GROUP BY customer_id
) o ON c.customer_id = o.customer_id
WHERE c.tier = 'gold';
```

</details>

---

## Key Takeaways

- 🔄 **Query pipeline**: Parse → Analyze → Rewrite → Optimize → Execute
- 💰 **Cost-based optimization**: Optimizer estimates cost, picks cheapest plan
- 📊 **Statistics matter**: Stale stats = bad plans. Run ANALYZE regularly
- 🔍 **EXPLAIN ANALYZE**: Shows actual vs. estimated - reveals problems
- 📈 **Key metrics**: Row estimates, loops, actual time, buffer usage
- ⚙️ **Join algorithms**: Nested loop (small outer), Hash (medium), Merge (sorted)

---

## Related Topics

- [Indexing Deep Dive](/databases/07-indexing-deep-dive.md) - Index types and strategies
- [Query Optimization](/databases/09-query-optimization.md) - Rewriting for performance
- [Performance Tuning](/databases/10-performance-tuning.md) - System-level optimization
