# Query Optimization

[← Back to Index](/databases/00-index.md)

---

## Overview

Query optimization is the art and science of rewriting queries to execute faster. This goes beyond just adding indexes—it involves understanding how your queries interact with the optimizer, avoiding common anti-patterns, and choosing the right approach for your data.

### When This Matters Most
- Slow queries in production
- Queries that don't use available indexes
- Complex reports timing out
- Scaling existing applications

---

## Core Principles

### 1. Reduce Data Early

Filter and aggregate as early as possible in the query pipeline.

```sql
-- ❌ Bad: Filter late, process all data first
SELECT * FROM (
    SELECT customer_id, SUM(amount) as total
    FROM orders
    GROUP BY customer_id
) sub
WHERE customer_id = 123;

-- ✅ Good: Filter early, process only needed data
SELECT customer_id, SUM(amount) as total
FROM orders
WHERE customer_id = 123
GROUP BY customer_id;
```

### 2. Use Indexes Effectively

Write queries that can leverage indexes.

```sql
-- ❌ Bad: Function on column prevents index use
SELECT * FROM users WHERE YEAR(created_at) = 2024;

-- ✅ Good: Range condition uses index
SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- ❌ Bad: Implicit type conversion
SELECT * FROM users WHERE phone = 5551234567;  -- phone is VARCHAR

-- ✅ Good: Matching types
SELECT * FROM users WHERE phone = '5551234567';
```

### 3. Minimize Round Trips

Get all needed data in one query instead of multiple.

```sql
-- ❌ Bad: N+1 query pattern (in application code)
for customer in get_customers():
    orders = get_orders(customer.id)  -- N more queries!

-- ✅ Good: Single query with JOIN
SELECT c.*, o.*
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id;
```

---

## Query Rewriting Techniques

### Transform Subqueries to JOINs

```sql
-- ❌ Correlated subquery (runs for each row)
SELECT c.name,
       (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as order_count
FROM customers c;

-- ✅ JOIN with aggregate (runs once)
SELECT c.name, COALESCE(COUNT(o.id), 0) as order_count
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;

-- ❌ IN with subquery
SELECT * FROM products
WHERE category_id IN (SELECT id FROM categories WHERE active = true);

-- ✅ EXISTS (often faster, short-circuits)
SELECT * FROM products p
WHERE EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND c.active = true);

-- ✅ Or JOIN
SELECT p.* FROM products p
JOIN categories c ON p.category_id = c.id
WHERE c.active = true;
```

### Use EXISTS Instead of COUNT

```sql
-- ❌ COUNT all matches just to check existence
SELECT * FROM customers c
WHERE (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) > 0;

-- ✅ EXISTS stops at first match
SELECT * FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```

### Avoid SELECT *

```sql
-- ❌ Retrieves all columns, prevents covering index
SELECT * FROM orders WHERE customer_id = 123;

-- ✅ Only needed columns, can use covering index
SELECT order_id, order_date, total_amount 
FROM orders 
WHERE customer_id = 123;
```

### Use UNION ALL Instead of UNION

```sql
-- ❌ UNION removes duplicates (requires sort + dedup)
SELECT product_id FROM warehouse_a
UNION
SELECT product_id FROM warehouse_b;

-- ✅ UNION ALL when duplicates are OK or impossible
SELECT product_id, 'A' as warehouse FROM warehouse_a
UNION ALL
SELECT product_id, 'B' as warehouse FROM warehouse_b;
```

### Optimize OR Conditions

```sql
-- ❌ OR can prevent index use
SELECT * FROM orders WHERE status = 'pending' OR status = 'processing';

-- ✅ IN is equivalent but often optimized better
SELECT * FROM orders WHERE status IN ('pending', 'processing');

-- ✅ Or UNION ALL for complex cases
SELECT * FROM orders WHERE status = 'pending'
UNION ALL
SELECT * FROM orders WHERE status = 'processing';
```

---

## Common Anti-Patterns

### Anti-Pattern 1: Functions on Indexed Columns

```sql
-- ❌ Index on order_date cannot be used
SELECT * FROM orders WHERE DATE(order_date) = '2024-01-15';
SELECT * FROM orders WHERE YEAR(order_date) = 2024;
SELECT * FROM orders WHERE order_date + INTERVAL 7 DAY > NOW();
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- ✅ Rewrite to preserve index usage
SELECT * FROM orders WHERE order_date >= '2024-01-15' AND order_date < '2024-01-16';
SELECT * FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';
SELECT * FROM orders WHERE order_date > NOW() - INTERVAL 7 DAY;
-- For case-insensitive: create expression index on LOWER(email) or use CITEXT type
```

### Anti-Pattern 2: Leading Wildcard LIKE

```sql
-- ❌ Leading wildcard = full table scan
SELECT * FROM products WHERE name LIKE '%widget%';
SELECT * FROM products WHERE name LIKE '%son';

-- ✅ Trailing wildcard can use index
SELECT * FROM products WHERE name LIKE 'widget%';

-- For full-text needs, use proper full-text search
CREATE INDEX idx_products_name_fts ON products USING GIN (to_tsvector('english', name));
SELECT * FROM products WHERE to_tsvector('english', name) @@ to_tsquery('widget');
```

### Anti-Pattern 3: Implicit Type Conversion

```sql
-- ❌ Type mismatch forces conversion, breaks index
SELECT * FROM users WHERE user_id = '123';  -- user_id is INT
SELECT * FROM orders WHERE order_code = 12345;  -- order_code is VARCHAR

-- ✅ Use correct types
SELECT * FROM users WHERE user_id = 123;
SELECT * FROM orders WHERE order_code = '12345';
```

### Anti-Pattern 4: NOT IN with NULLs

```sql
-- ❌ If subquery returns ANY NULL, entire NOT IN returns no rows!
SELECT * FROM products WHERE category_id NOT IN (SELECT id FROM inactive_categories);
-- If inactive_categories.id has a NULL, result is empty

-- ✅ Use NOT EXISTS instead
SELECT * FROM products p
WHERE NOT EXISTS (SELECT 1 FROM inactive_categories ic WHERE ic.id = p.category_id);

-- ✅ Or filter NULLs
SELECT * FROM products WHERE category_id NOT IN (
    SELECT id FROM inactive_categories WHERE id IS NOT NULL
);
```

### Anti-Pattern 5: Expensive Expressions in SELECT with LIMIT

```sql
-- ❌ Computes expensive function for all rows, then limits
SELECT id, name, complex_calculation(data) as result
FROM large_table
ORDER BY name
LIMIT 10;

-- ✅ Filter/limit first, then compute
WITH limited AS (
    SELECT id, name, data
    FROM large_table
    ORDER BY name
    LIMIT 10
)
SELECT id, name, complex_calculation(data) as result
FROM limited;
```

---

## Join Optimization

### Choose the Right Join Type

```sql
-- INNER JOIN: Only matching rows (most restrictive)
-- Use when you only need rows that match in both tables
SELECT c.name, o.order_id
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id;

-- LEFT JOIN: All from left, matching from right
-- Use when you need all left rows regardless of match
SELECT c.name, COUNT(o.order_id) as order_count
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name;

-- Don't use LEFT JOIN when you actually want INNER
-- ❌ LEFT JOIN + WHERE on right table = hidden INNER JOIN
SELECT c.name, o.order_id
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'completed';  -- This filters out NULL o rows!

-- ✅ Be explicit
SELECT c.name, o.order_id
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'completed';
```

### Join Order Hints (Use Sparingly)

```sql
-- PostgreSQL: join_collapse_limit affects optimizer freedom
SET join_collapse_limit = 1;  -- Forces written order

-- MySQL: STRAIGHT_JOIN forces order
SELECT STRAIGHT_JOIN c.name, o.order_id
FROM customers c
STRAIGHT_JOIN orders o ON c.id = o.customer_id;

-- Usually better: fix statistics or indexes instead of hints
ANALYZE customers;
ANALYZE orders;
```

### Reduce Join Data First

```sql
-- ❌ Join full tables, then filter
SELECT c.name, o.total_amount
FROM customers c
JOIN orders o ON c.id = o.customer_id
WHERE o.order_date = '2024-01-15' AND c.tier = 'gold';

-- ✅ Filter in subqueries first (optimizer often does this, but not always)
SELECT c.name, o.total_amount
FROM (SELECT id, name FROM customers WHERE tier = 'gold') c
JOIN (SELECT customer_id, total_amount FROM orders WHERE order_date = '2024-01-15') o
ON c.id = o.customer_id;
```

---

## Aggregation Optimization

### Filter Before Aggregating

```sql
-- ❌ Aggregate all, then filter (if possible to filter earlier)
SELECT customer_id, SUM(amount) as total
FROM orders
GROUP BY customer_id
HAVING SUM(amount) > 1000;

-- Can't always avoid HAVING, but WHERE runs before GROUP BY:
-- ✅ Filter rows first
SELECT customer_id, SUM(amount) as total
FROM orders
WHERE status = 'completed'  -- Reduces rows before grouping
GROUP BY customer_id
HAVING SUM(amount) > 1000;
```

### Use Approximate Counts for Large Tables

```sql
-- ❌ Exact count requires full scan
SELECT COUNT(*) FROM large_table;

-- ✅ PostgreSQL: Approximate from stats (instant but approximate)
SELECT reltuples::bigint AS estimate
FROM pg_class
WHERE relname = 'large_table';

-- For exact recent counts, maintain a summary table
CREATE TABLE table_counts (
    table_name VARCHAR(100) PRIMARY KEY,
    row_count BIGINT,
    updated_at TIMESTAMP
);
```

### Pre-aggregate for Reporting

```sql
-- Instead of computing aggregates on every query:
-- Create summary tables updated periodically

CREATE TABLE daily_order_summary (
    summary_date DATE PRIMARY KEY,
    order_count INT,
    total_revenue DECIMAL(12,2),
    avg_order_value DECIMAL(10,2)
);

-- Populate via scheduled job
INSERT INTO daily_order_summary
SELECT 
    DATE(order_date) as summary_date,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value
FROM orders
WHERE DATE(order_date) = CURRENT_DATE - 1
GROUP BY DATE(order_date)
ON CONFLICT (summary_date) DO UPDATE 
SET order_count = EXCLUDED.order_count,
    total_revenue = EXCLUDED.total_revenue,
    avg_order_value = EXCLUDED.avg_order_value;
```

---

## Pagination Optimization

### Offset-Based Pagination Problems

```sql
-- ❌ OFFSET scans and discards rows (slow for large offsets)
SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 10000;
-- Database reads 10020 rows, returns 20

-- Performance degrades linearly with offset
-- OFFSET 0:     ~1ms
-- OFFSET 10000: ~100ms
-- OFFSET 100000: ~1000ms
```

### Keyset (Cursor) Pagination

```sql
-- ✅ Use WHERE instead of OFFSET (constant performance)
-- First page
SELECT * FROM products ORDER BY created_at DESC, id DESC LIMIT 20;

-- Next pages: use last row's values
SELECT * FROM products 
WHERE (created_at, id) < ('2024-01-15 10:30:00', 12345)
ORDER BY created_at DESC, id DESC 
LIMIT 20;

-- Requires: 
-- 1. Deterministic ordering (include PK)
-- 2. Index on (created_at DESC, id DESC)
-- 3. Client tracks last-seen values
```

### Deferred Join

```sql
-- ❌ Joins all columns for offset rows
SELECT p.*, c.name as category_name
FROM products p
JOIN categories c ON p.category_id = c.id
ORDER BY p.created_at DESC
LIMIT 20 OFFSET 10000;

-- ✅ Get IDs first, then fetch full data
SELECT p.*, c.name as category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.id IN (
    SELECT id FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 10000
)
ORDER BY p.created_at DESC;
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Profile before optimizing**: Find the actual slow queries
- **Use EXPLAIN ANALYZE**: Verify your changes help
- **Test with production-like data**: Performance varies with data size/distribution
- **Keep statistics updated**: ANALYZE tables after large changes
- **Start simple**: Often a missing index is the answer

### ❌ Avoid:
- **Premature optimization**: If it's fast enough, stop
- **Over-using hints**: Fix the root cause instead
- **Ignoring the optimizer**: It's usually right
- **Optimizing for edge cases**: Optimize for the common path

---

## Exercises

### Exercise 1: Query Rewrite 🟢

**Rewrite these queries for better performance:**

```sql
-- Query 1: Find users created this year
SELECT * FROM users WHERE YEAR(created_at) = YEAR(NOW());

-- Query 2: Find products not in any order
SELECT * FROM products 
WHERE id NOT IN (SELECT DISTINCT product_id FROM order_items);

-- Query 3: Count orders per customer (only customers with orders)
SELECT c.name, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id)
FROM customers c
WHERE (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) > 0;
```

<details>
<summary>✅ Solutions</summary>

```sql
-- Query 1: Use date range instead of function
SELECT * FROM users 
WHERE created_at >= DATE_TRUNC('year', NOW())
  AND created_at < DATE_TRUNC('year', NOW()) + INTERVAL '1 year';
-- Or simply:
-- WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- Query 2: Use NOT EXISTS (safer with NULLs, often faster)
SELECT * FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
);
-- Or LEFT JOIN:
SELECT p.* FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
WHERE oi.product_id IS NULL;

-- Query 3: JOIN instead of correlated subqueries
SELECT c.name, COUNT(o.id) as order_count
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name
HAVING COUNT(o.id) > 0;  -- Actually redundant with INNER JOIN

-- Or more simply:
SELECT c.name, COUNT(*) as order_count
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;
```

</details>

---

### Exercise 2: Index-Aware Rewrite 🟡

**Given these indexes, rewrite the query to use them:**

```sql
-- Available indexes:
-- orders(customer_id)
-- orders(order_date)
-- orders(status)

-- Slow query:
SELECT * FROM orders 
WHERE DATE(order_date) = '2024-01-15' 
  AND status IN ('pending', 'processing')
  AND LOWER(customer_email) = 'john@example.com';
```

<details>
<summary>✅ Solution</summary>

```sql
-- 1. DATE() prevents index use on order_date
-- 2. LOWER() prevents index use (if there was one on customer_email)
-- 3. IN is fine for status

-- Optimized query:
SELECT * FROM orders 
WHERE order_date >= '2024-01-15' AND order_date < '2024-01-16'
  AND status IN ('pending', 'processing')
  AND customer_email = 'john@example.com';  -- If case-sensitive is OK

-- If case-insensitive matching is required:
-- Option A: Store lowercase in table, match lowercase
-- Option B: Create expression index
CREATE INDEX idx_orders_email_lower ON orders(LOWER(customer_email));
-- Then query with:
WHERE LOWER(customer_email) = 'john@example.com'

-- Best composite index for this query:
CREATE INDEX idx_orders_date_status ON orders(order_date, status);
-- And either:
CREATE INDEX idx_orders_email ON orders(customer_email);
-- Or the expression index above
```

</details>

---

### Exercise 3: Optimize a Report Query 🔴

**This monthly report query takes 30+ seconds. Optimize it:**

```sql
SELECT 
    c.name AS customer_name,
    c.tier,
    COUNT(DISTINCT o.order_id) AS order_count,
    SUM(oi.quantity * oi.unit_price) AS total_revenue,
    AVG(oi.quantity * oi.unit_price) AS avg_item_value,
    (SELECT MAX(o2.order_date) FROM orders o2 WHERE o2.customer_id = c.id) AS last_order_date
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id AND YEAR(o.order_date) = 2024 AND MONTH(o.order_date) = 1
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY c.id, c.name, c.tier
HAVING COUNT(DISTINCT o.order_id) > 0
ORDER BY total_revenue DESC
LIMIT 100;
```

<details>
<summary>✅ Solution</summary>

**Problems identified:**
1. `YEAR()` and `MONTH()` on order_date prevent index use
2. Correlated subquery for last_order_date runs per row
3. LEFT JOIN + HAVING > 0 = hidden INNER JOIN
4. Complex aggregation without supporting indexes

```sql
-- Optimized version:
WITH january_orders AS (
    -- Pre-filter orders for the month
    SELECT order_id, customer_id, order_date
    FROM orders
    WHERE order_date >= '2024-01-01' AND order_date < '2024-02-01'
),
order_totals AS (
    -- Pre-aggregate order items
    SELECT 
        jo.customer_id,
        COUNT(DISTINCT jo.order_id) AS order_count,
        SUM(oi.quantity * oi.unit_price) AS total_revenue,
        AVG(oi.quantity * oi.unit_price) AS avg_item_value,
        MAX(jo.order_date) AS last_order_date
    FROM january_orders jo
    JOIN order_items oi ON jo.order_id = oi.order_id
    GROUP BY jo.customer_id
),
customer_last_orders AS (
    -- Get last order date per customer (once, not per row)
    SELECT customer_id, MAX(order_date) AS last_order_date
    FROM orders
    GROUP BY customer_id
)
SELECT 
    c.name AS customer_name,
    c.tier,
    ot.order_count,
    ot.total_revenue,
    ot.avg_item_value,
    COALESCE(ot.last_order_date, clo.last_order_date) AS last_order_date
FROM customers c
JOIN order_totals ot ON c.id = ot.customer_id  -- INNER JOIN since we only want active
LEFT JOIN customer_last_orders clo ON c.id = clo.customer_id
ORDER BY ot.total_revenue DESC
LIMIT 100;

-- Supporting indexes:
CREATE INDEX idx_orders_date_customer ON orders(order_date, customer_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- If this report runs frequently, consider materialized view:
CREATE MATERIALIZED VIEW monthly_customer_revenue AS
SELECT 
    DATE_TRUNC('month', o.order_date) AS month,
    o.customer_id,
    COUNT(DISTINCT o.order_id) AS order_count,
    SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY DATE_TRUNC('month', o.order_date), o.customer_id;

CREATE INDEX idx_mv_month ON monthly_customer_revenue(month);
```

</details>

---

## Key Takeaways

- 🔍 **Filter early**: Reduce data before joins and aggregations
- 📇 **Preserve index usage**: Avoid functions on indexed columns
- 🔄 **Prefer JOINs over correlated subqueries**: Usually faster
- ✅ **Use EXISTS for existence checks**: Short-circuits on first match
- 📄 **Select only needed columns**: Enables covering indexes
- 📖 **Use keyset pagination**: Constant time vs. linear with OFFSET
- 📊 **Pre-aggregate for reports**: Summary tables for frequent queries

---

## Related Topics

- [Indexing Deep Dive](/databases/07-indexing-deep-dive.md) - Creating effective indexes
- [Query Execution Internals](/databases/08-query-execution-internals.md) - Understanding plans
- [Performance Tuning](/databases/10-performance-tuning.md) - System-level optimization
