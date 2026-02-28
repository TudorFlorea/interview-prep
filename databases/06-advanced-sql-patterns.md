# Advanced SQL Patterns

[← Back to Index](/databases/00-index.md)

---

## Overview

Beyond basic queries lie powerful SQL features that enable complex analytics, data transformations, and efficient solutions to common problems. This chapter covers window functions, advanced aggregations, pivoting, and other patterns that separate intermediate from advanced SQL practitioners.

### When This Matters Most
- Analytics and reporting queries
- Rankings and running totals
- Row-by-row comparisons within groups
- Transforming data shapes (rows ↔ columns)
- Technical interviews (window functions are a favorite)

---

## Window Functions

Window functions perform calculations across a set of rows "related to" the current row, without collapsing them into a single output row like GROUP BY.

### Anatomy of a Window Function

```sql
function_name(expression) OVER (
    [PARTITION BY column1, column2, ...]
    [ORDER BY column3, column4, ...]
    [ROWS/RANGE BETWEEN ... AND ...]
)
```

| Component | Purpose |
|-----------|---------|
| `function_name` | ROW_NUMBER, RANK, SUM, AVG, LEAD, LAG, etc. |
| `PARTITION BY` | Divides rows into groups (like GROUP BY but keeps rows) |
| `ORDER BY` | Orders rows within each partition |
| `ROWS/RANGE` | Defines the window frame (which rows to include) |

---

### Ranking Functions

```sql
-- Sample data: Sales per employee per month
| employee_id | month    | sales  |
|-------------|----------|--------|
| 1           | 2024-01  | 5000   |
| 1           | 2024-02  | 7000   |
| 2           | 2024-01  | 6000   |
| 2           | 2024-02  | 6000   |
| 3           | 2024-01  | 5000   |
```

```sql
SELECT 
    employee_id,
    month,
    sales,
    
    -- ROW_NUMBER: Unique sequential number (no ties)
    ROW_NUMBER() OVER (ORDER BY sales DESC) AS row_num,
    
    -- RANK: Same rank for ties, then skip
    RANK() OVER (ORDER BY sales DESC) AS rank,
    
    -- DENSE_RANK: Same rank for ties, no skip
    DENSE_RANK() OVER (ORDER BY sales DESC) AS dense_rank,
    
    -- NTILE: Divide into N buckets
    NTILE(4) OVER (ORDER BY sales DESC) AS quartile
FROM monthly_sales;

-- Result:
| employee_id | month   | sales | row_num | rank | dense_rank | quartile |
|-------------|---------|-------|---------|------|------------|----------|
| 1           | 2024-02 | 7000  | 1       | 1    | 1          | 1        |
| 2           | 2024-01 | 6000  | 2       | 2    | 2          | 1        |
| 2           | 2024-02 | 6000  | 3       | 2    | 2          | 2        |
| 1           | 2024-01 | 5000  | 4       | 4    | 3          | 3        |
| 3           | 2024-01 | 5000  | 5       | 4    | 3          | 4        |
```

**Common Use Cases:**

```sql
-- Top N per group (e.g., top 3 products per category)
WITH ranked AS (
    SELECT 
        p.*,
        ROW_NUMBER() OVER (
            PARTITION BY category_id 
            ORDER BY sales DESC
        ) AS rn
    FROM products p
)
SELECT * FROM ranked WHERE rn <= 3;

-- Percentile ranking
SELECT 
    student_id,
    score,
    PERCENT_RANK() OVER (ORDER BY score) AS percentile
FROM exam_results;
```

---

### Aggregate Window Functions

Apply aggregates without collapsing rows.

```sql
SELECT 
    order_id,
    customer_id,
    order_date,
    total_amount,
    
    -- Running total (cumulative sum)
    SUM(total_amount) OVER (
        PARTITION BY customer_id 
        ORDER BY order_date
        ROWS UNBOUNDED PRECEDING
    ) AS running_total,
    
    -- Customer average (across all their orders)
    AVG(total_amount) OVER (
        PARTITION BY customer_id
    ) AS customer_avg,
    
    -- Moving average (last 3 orders)
    AVG(total_amount) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3,
    
    -- Percent of customer's total
    total_amount / SUM(total_amount) OVER (PARTITION BY customer_id) * 100 AS pct_of_total

FROM orders
ORDER BY customer_id, order_date;
```

---

### LAG and LEAD

Access values from other rows relative to current row.

```sql
SELECT 
    order_date,
    total_amount,
    
    -- Previous row's value
    LAG(total_amount, 1) OVER (ORDER BY order_date) AS prev_amount,
    
    -- Next row's value
    LEAD(total_amount, 1) OVER (ORDER BY order_date) AS next_amount,
    
    -- Two rows back with default
    LAG(total_amount, 2, 0) OVER (ORDER BY order_date) AS two_back,
    
    -- Change from previous
    total_amount - LAG(total_amount, 1) OVER (ORDER BY order_date) AS change

FROM orders;

-- Year-over-year comparison
SELECT 
    year,
    month,
    revenue,
    LAG(revenue, 12) OVER (ORDER BY year, month) AS revenue_last_year,
    revenue - LAG(revenue, 12) OVER (ORDER BY year, month) AS yoy_change
FROM monthly_revenue;
```

---

### FIRST_VALUE, LAST_VALUE, NTH_VALUE

```sql
SELECT 
    employee_id,
    month,
    sales,
    
    -- First value in partition
    FIRST_VALUE(sales) OVER (
        PARTITION BY employee_id 
        ORDER BY month
    ) AS first_month_sales,
    
    -- Last value (careful with frame!)
    LAST_VALUE(sales) OVER (
        PARTITION BY employee_id 
        ORDER BY month
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_month_sales,
    
    -- Nth value
    NTH_VALUE(sales, 2) OVER (
        PARTITION BY employee_id 
        ORDER BY month
    ) AS second_month_sales

FROM monthly_sales;
```

⚠️ **LAST_VALUE trap**: Default frame is `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, so LAST_VALUE returns current row! Always specify full frame.

---

### Window Frame Specification

```sql
ROWS BETWEEN <start> AND <end>

-- Start/End options:
UNBOUNDED PRECEDING  -- First row of partition
n PRECEDING          -- n rows before current
CURRENT ROW          -- Current row
n FOLLOWING          -- n rows after current
UNBOUNDED FOLLOWING  -- Last row of partition
```

```sql
-- Examples
-- Running total (all previous rows)
SUM(x) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING)

-- Centered moving average (2 before, current, 2 after)
AVG(x) OVER (ORDER BY date ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING)

-- Looking ahead (current + next 2)
SUM(x) OVER (ORDER BY date ROWS BETWEEN CURRENT ROW AND 2 FOLLOWING)

-- RANGE vs ROWS (for ties)
-- ROWS: Physical row count
-- RANGE: Logical value range (includes ties)
SUM(x) OVER (ORDER BY date RANGE BETWEEN INTERVAL '7' DAY PRECEDING AND CURRENT ROW)
```

---

## Advanced Aggregations

### GROUPING SETS

Multiple GROUP BY in one query.

```sql
-- Instead of multiple queries with UNION
SELECT region, product, SUM(sales) FROM orders GROUP BY region, product
UNION ALL
SELECT region, NULL, SUM(sales) FROM orders GROUP BY region
UNION ALL
SELECT NULL, product, SUM(sales) FROM orders GROUP BY product
UNION ALL
SELECT NULL, NULL, SUM(sales) FROM orders;

-- Use GROUPING SETS
SELECT 
    region,
    product,
    SUM(sales) AS total_sales
FROM orders
GROUP BY GROUPING SETS (
    (region, product),  -- By region and product
    (region),           -- By region only
    (product),          -- By product only
    ()                  -- Grand total
);
```

### ROLLUP

Hierarchical subtotals.

```sql
SELECT 
    COALESCE(region, 'ALL REGIONS') AS region,
    COALESCE(product, 'ALL PRODUCTS') AS product,
    SUM(sales) AS total_sales
FROM orders
GROUP BY ROLLUP (region, product);

-- Produces:
-- region    product     total_sales
-- East      Widget      1000
-- East      Gadget      1500
-- East      ALL PRODUCTS 2500      <- subtotal for East
-- West      Widget      2000
-- West      Gadget      1000
-- West      ALL PRODUCTS 3000      <- subtotal for West
-- ALL REGIONS ALL PRODUCTS 5500    <- grand total
```

### CUBE

All possible combinations.

```sql
SELECT 
    region,
    product,
    SUM(sales) AS total_sales,
    GROUPING(region) AS is_region_total,
    GROUPING(product) AS is_product_total
FROM orders
GROUP BY CUBE (region, product);

-- Use GROUPING() to identify subtotal rows (returns 1 for grouped columns)
```

---

## Pivot and Unpivot

### Pivoting (Rows to Columns)

```sql
-- Source: monthly_sales (product, month, amount)
-- Goal: products as rows, months as columns

-- PostgreSQL/MySQL: Conditional aggregation
SELECT 
    product,
    SUM(CASE WHEN month = 'Jan' THEN amount ELSE 0 END) AS jan,
    SUM(CASE WHEN month = 'Feb' THEN amount ELSE 0 END) AS feb,
    SUM(CASE WHEN month = 'Mar' THEN amount ELSE 0 END) AS mar
FROM monthly_sales
GROUP BY product;

-- SQL Server: PIVOT operator
SELECT *
FROM (
    SELECT product, month, amount
    FROM monthly_sales
) AS source
PIVOT (
    SUM(amount) FOR month IN ([Jan], [Feb], [Mar])
) AS pivot_table;
```

### Unpivoting (Columns to Rows)

```sql
-- Source: products (id, q1_sales, q2_sales, q3_sales, q4_sales)
-- Goal: id, quarter, sales

-- Using UNION ALL (portable)
SELECT id, 'Q1' AS quarter, q1_sales AS sales FROM products
UNION ALL
SELECT id, 'Q2' AS quarter, q2_sales AS sales FROM products
UNION ALL
SELECT id, 'Q3' AS quarter, q3_sales AS sales FROM products
UNION ALL
SELECT id, 'Q4' AS quarter, q4_sales AS sales FROM products;

-- SQL Server: UNPIVOT operator
SELECT id, quarter, sales
FROM products
UNPIVOT (
    sales FOR quarter IN (q1_sales, q2_sales, q3_sales, q4_sales)
) AS unpivoted;

-- PostgreSQL: VALUES + LATERAL
SELECT p.id, q.quarter, q.sales
FROM products p
CROSS JOIN LATERAL (
    VALUES ('Q1', q1_sales), ('Q2', q2_sales), ('Q3', q3_sales), ('Q4', q4_sales)
) AS q(quarter, sales);
```

---

## MERGE (Upsert)

Insert or update in a single statement.

```sql
-- SQL Server / PostgreSQL 15+
MERGE INTO products AS target
USING staging_products AS source
ON target.product_id = source.product_id
WHEN MATCHED THEN
    UPDATE SET 
        name = source.name,
        price = source.price,
        updated_at = CURRENT_TIMESTAMP
WHEN NOT MATCHED THEN
    INSERT (product_id, name, price, created_at)
    VALUES (source.product_id, source.name, source.price, CURRENT_TIMESTAMP);

-- MySQL: INSERT ... ON DUPLICATE KEY UPDATE
INSERT INTO products (product_id, name, price)
VALUES (1, 'Widget', 9.99)
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    price = VALUES(price);

-- PostgreSQL: INSERT ... ON CONFLICT
INSERT INTO products (product_id, name, price)
VALUES (1, 'Widget', 9.99)
ON CONFLICT (product_id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    price = EXCLUDED.price;
```

---

## Common Advanced Patterns

### Gap and Island Problems

Finding sequences and breaks in data.

```sql
-- Find gaps in a sequence
WITH all_ids AS (
    SELECT generate_series(
        (SELECT MIN(id) FROM records),
        (SELECT MAX(id) FROM records)
    ) AS id
)
SELECT a.id AS missing_id
FROM all_ids a
LEFT JOIN records r ON a.id = r.id
WHERE r.id IS NULL;

-- Find islands (consecutive sequences)
WITH numbered AS (
    SELECT 
        id,
        id - ROW_NUMBER() OVER (ORDER BY id) AS grp
    FROM records
)
SELECT 
    MIN(id) AS island_start,
    MAX(id) AS island_end,
    COUNT(*) AS island_size
FROM numbered
GROUP BY grp
ORDER BY island_start;
```

### Finding Consecutive Events

```sql
-- Consecutive login days
WITH daily_logins AS (
    SELECT DISTINCT user_id, DATE(login_time) AS login_date
    FROM logins
),
numbered AS (
    SELECT 
        user_id,
        login_date,
        login_date - ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY login_date
        )::INT AS grp
    FROM daily_logins
)
SELECT 
    user_id,
    MIN(login_date) AS streak_start,
    MAX(login_date) AS streak_end,
    COUNT(*) AS streak_length
FROM numbered
GROUP BY user_id, grp
HAVING COUNT(*) >= 3  -- At least 3 consecutive days
ORDER BY streak_length DESC;
```

### Running Deduplication

```sql
-- Keep only first occurrence per group
DELETE FROM contacts
WHERE ctid NOT IN (
    SELECT MIN(ctid)
    FROM contacts
    GROUP BY email
);

-- Or with window function
WITH ranked AS (
    SELECT 
        ctid,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at) AS rn
    FROM contacts
)
DELETE FROM contacts
WHERE ctid IN (SELECT ctid FROM ranked WHERE rn > 1);
```

### Conditional Aggregation

```sql
SELECT 
    customer_id,
    
    -- Count with conditions
    COUNT(*) AS total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_orders,
    
    -- Sum with conditions
    SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) AS revenue,
    
    -- Boolean aggregation
    BOOL_OR(is_gift) AS has_gift_orders,  -- PostgreSQL
    MAX(CASE WHEN is_gift THEN 1 ELSE 0 END) AS has_gift_orders,  -- Portable
    
    -- String aggregation
    STRING_AGG(DISTINCT status, ', ') AS all_statuses  -- PostgreSQL
    -- GROUP_CONCAT(DISTINCT status) AS all_statuses  -- MySQL

FROM orders
GROUP BY customer_id;
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Use window functions for analytics**: Running totals, rankings, comparisons
- **Name complex windows**: `WINDOW w AS (...)` then `OVER w`
- **Use CTEs with window functions**: Build step by step
- **Understand the frame**: Default is often `UNBOUNDED PRECEDING TO CURRENT ROW`

### ❌ Avoid:
- **Window functions in WHERE**: Use CTE/subquery, then filter
- **Assuming order without ORDER BY**: Partitions are unordered by default
- **Forgetting LAST_VALUE frame issue**: Specify full partition frame
- **Overcomplicating**: Sometimes a correlated subquery or join is clearer

---

## Exercises

### Exercise 1: Ranking and Comparison 🟢

Using the orders table:

**Tasks:**
1. Rank orders by total_amount (highest first), showing rank and dense_rank
2. For each customer, show their orders with a running total
3. Show each order with the previous order's amount for the same customer

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Ranking orders
SELECT 
    order_id,
    customer_id,
    total_amount,
    RANK() OVER (ORDER BY total_amount DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY total_amount DESC) AS dense_rank
FROM orders;

-- 2. Running total per customer
SELECT 
    order_id,
    customer_id,
    order_date,
    total_amount,
    SUM(total_amount) OVER (
        PARTITION BY customer_id 
        ORDER BY order_date
        ROWS UNBOUNDED PRECEDING
    ) AS running_total
FROM orders
ORDER BY customer_id, order_date;

-- 3. Previous order amount
SELECT 
    order_id,
    customer_id,
    order_date,
    total_amount,
    LAG(total_amount) OVER (
        PARTITION BY customer_id 
        ORDER BY order_date
    ) AS prev_order_amount,
    total_amount - LAG(total_amount) OVER (
        PARTITION BY customer_id 
        ORDER BY order_date
    ) AS change_from_prev
FROM orders
ORDER BY customer_id, order_date;
```

</details>

---

### Exercise 2: Sales Analytics 🟡

**Scenario:** Monthly sales analysis with year-over-year comparisons.

Given a table:
```sql
monthly_revenue (year, month, product_category, revenue)
```

**Tasks:**
1. Show each month with same-month-last-year revenue and YoY growth %
2. Add a 3-month moving average of revenue
3. Rank product categories within each month by revenue

<details>
<summary>✅ Solution</summary>

```sql
-- Combined solution
SELECT 
    year,
    month,
    product_category,
    revenue,
    
    -- 1. YoY comparison
    LAG(revenue, 12) OVER (
        PARTITION BY product_category 
        ORDER BY year, month
    ) AS last_year_revenue,
    
    ROUND(
        (revenue - LAG(revenue, 12) OVER (
            PARTITION BY product_category ORDER BY year, month
        )) * 100.0 / NULLIF(LAG(revenue, 12) OVER (
            PARTITION BY product_category ORDER BY year, month
        ), 0), 
        1
    ) AS yoy_growth_pct,
    
    -- 2. 3-month moving average
    ROUND(
        AVG(revenue) OVER (
            PARTITION BY product_category
            ORDER BY year, month
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ), 
        2
    ) AS moving_avg_3m,
    
    -- 3. Rank within month
    RANK() OVER (
        PARTITION BY year, month 
        ORDER BY revenue DESC
    ) AS rank_in_month

FROM monthly_revenue
ORDER BY year, month, revenue DESC;
```

</details>

---

### Exercise 3: Gap and Island Analysis 🔴

**Scenario:** User activity analysis for a subscription service.

```sql
CREATE TABLE user_activity (
    user_id INT,
    activity_date DATE
);
-- Records one row per day a user was active
```

**Tasks:**
1. Find all "active streaks" (consecutive days of activity) for each user
2. Identify the longest streak per user
3. Find users who had a streak of 7+ days that ended (went inactive for 3+ days after)

<details>
<summary>💡 Hints</summary>

- Use the row_number trick: `activity_date - ROW_NUMBER()` groups consecutive dates
- A streak "ends" when there's a gap of 3+ days to the next activity
- Use LEAD to look at the next activity date

</details>

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Find all active streaks
WITH streaks AS (
    SELECT 
        user_id,
        activity_date,
        activity_date - (ROW_NUMBER() OVER (
            PARTITION BY user_id 
            ORDER BY activity_date
        ))::INT AS streak_group
    FROM user_activity
)
SELECT 
    user_id,
    MIN(activity_date) AS streak_start,
    MAX(activity_date) AS streak_end,
    COUNT(*) AS streak_days
FROM streaks
GROUP BY user_id, streak_group
ORDER BY user_id, streak_start;

-- 2. Longest streak per user
WITH streaks AS (
    SELECT 
        user_id,
        activity_date,
        activity_date - (ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY activity_date
        ))::INT AS streak_group
    FROM user_activity
),
streak_summary AS (
    SELECT 
        user_id,
        MIN(activity_date) AS streak_start,
        MAX(activity_date) AS streak_end,
        COUNT(*) AS streak_days
    FROM streaks
    GROUP BY user_id, streak_group
),
ranked AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY streak_days DESC) AS rn
    FROM streak_summary
)
SELECT user_id, streak_start, streak_end, streak_days
FROM ranked
WHERE rn = 1;

-- 3. 7+ day streaks that ended (3+ day gap after)
WITH streaks AS (
    SELECT 
        user_id,
        activity_date,
        activity_date - (ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY activity_date
        ))::INT AS streak_group
    FROM user_activity
),
streak_summary AS (
    SELECT 
        user_id,
        MIN(activity_date) AS streak_start,
        MAX(activity_date) AS streak_end,
        COUNT(*) AS streak_days
    FROM streaks
    GROUP BY user_id, streak_group
),
with_next AS (
    SELECT 
        *,
        LEAD(streak_start) OVER (
            PARTITION BY user_id 
            ORDER BY streak_start
        ) AS next_streak_start
    FROM streak_summary
)
SELECT 
    user_id,
    streak_start,
    streak_end,
    streak_days,
    next_streak_start,
    next_streak_start - streak_end AS days_until_next
FROM with_next
WHERE streak_days >= 7
  AND (next_streak_start IS NULL OR next_streak_start - streak_end > 3);
```

</details>

---

## Key Takeaways

- 🪟 **Window functions** compute across rows while preserving them (vs GROUP BY which collapses)
- 📊 **Ranking**: ROW_NUMBER (unique), RANK (gaps), DENSE_RANK (no gaps)
- ⏪ **LAG/LEAD** access previous/next rows - essential for comparisons
- 📐 **Frame specification** controls which rows are included in the window
- 🔄 **ROLLUP/CUBE/GROUPING SETS** enable multiple GROUP BY levels in one query
- ↔️ **Pivot patterns** transform rows to columns and vice versa

---

## Related Topics

- [Subqueries and CTEs](/databases/05-subqueries-and-ctes.md) - Building blocks for window queries
- [Query Optimization](/databases/09-query-optimization.md) - Window function performance
- [Performance Tuning](/databases/10-performance-tuning.md) - Analytics query optimization
