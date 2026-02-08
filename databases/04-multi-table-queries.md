# Multi-Table Queries

[← Back to Index](/databases/00-index.md)

---

## Overview

Real-world queries rarely involve a single table. Multi-table queries combine data from related tables using JOINs and set operations. Understanding these operations deeply is essential for writing efficient, correct queries.

### When This Matters Most
- Any non-trivial database application
- Reporting and analytics queries
- Performance optimization (choosing the right JOIN)
- Technical interviews

---

## Core Concepts

### The Sample Data

For all examples in this guide:

```sql
-- customers (5 rows)
| customer_id | name          | tier     |
|-------------|---------------|----------|
| 1           | Alice Smith   | gold     |
| 2           | Bob Jones     | silver   |
| 3           | Carol White   | bronze   |
| 4           | David Brown   | gold     |
| 5           | Eve Wilson    | silver   |

-- orders (6 rows)
| order_id | customer_id | order_date | total_amount |
|----------|-------------|------------|--------------|
| 101      | 1           | 2024-01-15 | 250.00       |
| 102      | 1           | 2024-01-20 | 150.00       |
| 103      | 2           | 2024-01-18 | 300.00       |
| 104      | 3           | 2024-01-22 | 75.00        |
| 105      | 1           | 2024-02-01 | 500.00       |
| 106      | NULL        | 2024-02-05 | 100.00       |  -- orphan order

-- products (4 rows)
| product_id | name       | category_id | price  |
|------------|------------|-------------|--------|
| 1          | Laptop     | 1           | 999.00 |
| 2          | Mouse      | 1           | 29.00  |
| 3          | Desk       | 2           | 299.00 |
| 4          | Headphones | 1           | 149.00 |

-- Note: Customer 4, 5 have no orders
-- Note: Order 106 has no valid customer (data quality issue)
```

---

## JOIN Types

### INNER JOIN

Returns only matching rows from both tables.

```sql
-- Basic INNER JOIN
SELECT 
    c.name AS customer_name,
    o.order_id,
    o.total_amount
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;

-- Result: 5 rows (customers 4, 5 excluded - no orders)
-- Order 106 excluded - no matching customer
| customer_name | order_id | total_amount |
|---------------|----------|--------------|
| Alice Smith   | 101      | 250.00       |
| Alice Smith   | 102      | 150.00       |
| Alice Smith   | 105      | 500.00       |
| Bob Jones     | 103      | 300.00       |
| Carol White   | 104      | 75.00        |
```

**Diagram:**
```
CUSTOMERS        ORDERS
┌───────┐       ┌───────┐
│   1   │───────│   1   │
│   2   │───────│   2   │
│   3   │───────│   3   │
│   4   │       │ NULL  │
│   5   │       └───────┘
└───────┘
         ↓
    INNER JOIN
    ┌───────┐
    │   1   │  Only matches
    │   2   │
    │   3   │
    └───────┘
```

### LEFT JOIN (LEFT OUTER JOIN)

Returns all rows from left table, matching rows from right (NULL if no match).

```sql
SELECT 
    c.name AS customer_name,
    o.order_id,
    o.total_amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;

-- Result: 7 rows (all customers, including those without orders)
| customer_name | order_id | total_amount |
|---------------|----------|--------------|
| Alice Smith   | 101      | 250.00       |
| Alice Smith   | 102      | 150.00       |
| Alice Smith   | 105      | 500.00       |
| Bob Jones     | 103      | 300.00       |
| Carol White   | 104      | 75.00        |
| David Brown   | NULL     | NULL         |  -- No orders
| Eve Wilson    | NULL     | NULL         |  -- No orders
```

**Use Case: Find customers without orders**
```sql
SELECT c.name
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_id IS NULL;

-- Result: David Brown, Eve Wilson
```

### RIGHT JOIN (RIGHT OUTER JOIN)

Returns all rows from right table, matching from left. (Less common; usually rewrite as LEFT JOIN)

```sql
SELECT 
    c.name AS customer_name,
    o.order_id,
    o.total_amount
FROM customers c
RIGHT JOIN orders o ON c.customer_id = o.customer_id;

-- Result: 6 rows (all orders, including orphan)
| customer_name | order_id | total_amount |
|---------------|----------|--------------|
| Alice Smith   | 101      | 250.00       |
| Alice Smith   | 102      | 150.00       |
| Bob Jones     | 103      | 300.00       |
| Carol White   | 104      | 75.00        |
| Alice Smith   | 105      | 500.00       |
| NULL          | 106      | 100.00       |  -- Orphan order
```

### FULL OUTER JOIN

Returns all rows from both tables, with NULLs where no match.

```sql
SELECT 
    c.name AS customer_name,
    o.order_id,
    o.total_amount
FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;

-- Result: 8 rows (everything)
| customer_name | order_id | total_amount |
|---------------|----------|--------------|
| Alice Smith   | 101      | 250.00       |
| Alice Smith   | 102      | 150.00       |
| Alice Smith   | 105      | 500.00       |
| Bob Jones     | 103      | 300.00       |
| Carol White   | 104      | 75.00        |
| David Brown   | NULL     | NULL         |  -- Customer without orders
| Eve Wilson    | NULL     | NULL         |  -- Customer without orders
| NULL          | 106      | 100.00       |  -- Order without customer
```

⚠️ **MySQL Note**: MySQL doesn't support FULL OUTER JOIN. Emulate with UNION:

```sql
SELECT c.name, o.order_id, o.total_amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id

UNION

SELECT c.name, o.order_id, o.total_amount
FROM customers c
RIGHT JOIN orders o ON c.customer_id = o.customer_id;
```

### CROSS JOIN

Cartesian product: every row from left combined with every row from right.

```sql
-- Every customer × every product
SELECT 
    c.name AS customer,
    p.name AS product
FROM customers c
CROSS JOIN products p;

-- Result: 5 × 4 = 20 rows
```

**Use Cases:**
- Generate all combinations (calendar × locations)
- Create test data
- Pivot table generation

```sql
-- Generate date × product report template
SELECT 
    d.report_date,
    p.product_id,
    COALESCE(sales.total, 0) AS sales_total
FROM (
    SELECT generate_series('2024-01-01'::date, '2024-01-31'::date, '1 day') AS report_date
) d
CROSS JOIN products p
LEFT JOIN (
    SELECT DATE(order_date) AS sale_date, product_id, SUM(quantity * unit_price) AS total
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    GROUP BY DATE(order_date), product_id
) sales ON d.report_date = sales.sale_date AND p.product_id = sales.product_id;
```

---

### SELF JOIN

Joining a table to itself. Essential for hierarchical or comparative queries.

```sql
-- Find employees and their managers
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    name VARCHAR(100),
    manager_id INT
);

SELECT 
    e.name AS employee,
    m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.employee_id;

-- Compare orders: find orders larger than a customer's previous order
SELECT 
    o1.order_id,
    o1.customer_id,
    o1.total_amount AS current_order,
    o2.total_amount AS previous_order
FROM orders o1
JOIN orders o2 ON o1.customer_id = o2.customer_id
    AND o1.order_date > o2.order_date
    AND o1.total_amount > o2.total_amount;
```

---

## Multi-Table JOINs

Joining more than two tables:

```sql
-- Full order details: customer + order + items + products
SELECT 
    c.name AS customer_name,
    c.tier AS customer_tier,
    o.order_id,
    o.order_date,
    p.name AS product_name,
    oi.quantity,
    oi.unit_price,
    (oi.quantity * oi.unit_price) AS line_total
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01'
ORDER BY o.order_date, o.order_id, oi.line_number;
```

**Chain of JOINs:**
```
customers → orders → order_items → products
    1:N         1:N          N:1
```

**Multiple relationships to same table:**
```sql
-- Orders with billing and shipping addresses
CREATE TABLE addresses (
    address_id INT PRIMARY KEY,
    customer_id INT,
    address_type VARCHAR(20),
    street VARCHAR(200),
    city VARCHAR(100)
);

SELECT 
    o.order_id,
    billing.city AS billing_city,
    shipping.city AS shipping_city
FROM orders o
LEFT JOIN addresses billing ON o.billing_address_id = billing.address_id
LEFT JOIN addresses shipping ON o.shipping_address_id = shipping.address_id;
```

---

## JOIN Conditions

### Equality vs Non-Equality JOINs

```sql
-- Standard equality JOIN
SELECT * FROM orders o
JOIN customers c ON o.customer_id = c.customer_id;

-- Non-equality: Range JOIN (prices within tolerance)
SELECT 
    p1.name AS product1,
    p2.name AS product2,
    ABS(p1.price - p2.price) AS price_diff
FROM products p1
JOIN products p2 ON p1.product_id &lt; p2.product_id  -- Avoid duplicates
    AND ABS(p1.price - p2.price) &lt;= 50;  -- Within $50

-- Non-equality: Date ranges
SELECT 
    o.order_id,
    p.promotion_name
FROM orders o
JOIN promotions p ON o.order_date BETWEEN p.start_date AND p.end_date;
```

### Multiple JOIN Conditions

```sql
-- JOIN on composite key
SELECT *
FROM order_items oi
JOIN inventory_snapshots inv 
    ON oi.product_id = inv.product_id 
    AND DATE(oi.created_at) = inv.snapshot_date;

-- Additional filtering in JOIN vs WHERE
SELECT c.name, o.order_id
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id 
    AND o.order_date >= '2024-01-01';  -- Filter in JOIN: keeps all customers

-- vs

SELECT c.name, o.order_id  
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_date >= '2024-01-01';  -- Filter in WHERE: removes non-matching customers
```

💡 **Important**: For OUTER JOINs, conditions in ON vs WHERE behave differently!

---

## Set Operations

Combine results from multiple queries.

### UNION / UNION ALL

```sql
-- UNION: Removes duplicates
SELECT name, email FROM customers
UNION
SELECT name, email FROM leads;

-- UNION ALL: Keeps all rows (faster, no dedup)
SELECT product_id, 'sale' AS type, amount FROM sales
UNION ALL
SELECT product_id, 'return' AS type, -amount FROM returns;
```

**When to use which:**
- `UNION ALL` when duplicates are impossible or acceptable (performance)
- `UNION` when you need distinct results

### INTERSECT

Returns rows that appear in both queries.

```sql
-- Customers who are also newsletter subscribers
SELECT email FROM customers
INTERSECT
SELECT email FROM newsletter_subscribers;

-- Products in both warehouses
SELECT product_id FROM warehouse_a_inventory
INTERSECT
SELECT product_id FROM warehouse_b_inventory;
```

### EXCEPT / MINUS

Returns rows from first query not in second.

```sql
-- Customers NOT subscribed to newsletter
SELECT email FROM customers
EXCEPT  -- MINUS in Oracle
SELECT email FROM newsletter_subscribers;

-- Products in warehouse A but not B
SELECT product_id FROM warehouse_a_inventory
EXCEPT
SELECT product_id FROM warehouse_b_inventory;
```

⚠️ **MySQL Note**: MySQL doesn't have INTERSECT or EXCEPT. Use JOINs:

```sql
-- INTERSECT alternative
SELECT DISTINCT c.email 
FROM customers c
INNER JOIN newsletter_subscribers n ON c.email = n.email;

-- EXCEPT alternative
SELECT c.email 
FROM customers c
LEFT JOIN newsletter_subscribers n ON c.email = n.email
WHERE n.email IS NULL;
```

---

## Performance Considerations

### JOIN Order

The optimizer usually handles this, but understanding helps:

```sql
-- Start with the most selective table (fewer rows after filtering)
-- Filter early (in WHERE or JOIN condition)

-- Less efficient: Filter after large JOIN
SELECT * 
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_date = '2024-01-15';

-- More readable and helps optimizer
SELECT * 
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date = '2024-01-15';
```

### Indexes for JOINs

```sql
-- JOINs are fast when:
-- 1. JOIN columns are indexed
-- 2. Data types match exactly
-- 3. Statistics are current

-- Ensure indexes exist
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

### Avoid N+1 Patterns

```sql
-- ❌ Bad: Query per customer (in application loop)
SELECT * FROM customers;
-- For each customer:
SELECT * FROM orders WHERE customer_id = ?;

-- ✅ Good: Single query with JOIN
SELECT c.*, o.*
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
ORDER BY c.customer_id;
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Use table aliases**: Short, consistent (`c` for customers, `o` for orders)
- **Qualify all columns**: `c.name` not just `name` (even if unambiguous)
- **Start with INNER JOIN**: Add LEFT/RIGHT only when needed
- **Put most restrictive conditions first**: Helps readability and sometimes performance

### ❌ Avoid:
- **Implicit joins**: `FROM a, b WHERE a.id = b.id` (use explicit JOIN)
- **Cartesian products by accident**: Missing JOIN condition
- **Mixing LEFT JOIN with INNER JOIN conditions in WHERE**: Changes to implicit INNER JOIN

---

## Exercises

### Exercise 1: Basic JOINs 🟢

Using the sample e-commerce schema:

**Tasks:**
1. List all orders with customer names (exclude orders without customers)
2. List ALL customers with their order count (0 for those with none)
3. Find products that have never been ordered

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Orders with customer names (INNER JOIN)
SELECT 
    o.order_id,
    o.order_date,
    c.name AS customer_name,
    o.total_amount
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
ORDER BY o.order_date;

-- 2. All customers with order count (LEFT JOIN + aggregate)
SELECT 
    c.customer_id,
    c.name,
    COUNT(o.order_id) AS order_count,
    COALESCE(SUM(o.total_amount), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name
ORDER BY order_count DESC;

-- 3. Products never ordered (LEFT JOIN + NULL check)
SELECT p.product_id, p.name
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
WHERE oi.product_id IS NULL;

-- Alternative using NOT EXISTS
SELECT p.product_id, p.name
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.product_id = p.product_id
);
```

</details>

---

### Exercise 2: Multi-Table Analysis 🟡

**Scenario:** Generate a product sales report showing:
- Product name
- Category name  
- Total quantity sold
- Total revenue
- Number of unique customers who bought it
- Average order value for orders containing this product

<details>
<summary>💡 Hints</summary>

- Need: products, categories, order_items, orders, customers
- GROUP BY product
- Use COUNT(DISTINCT) for unique customers
- Be careful about averaging - what exactly should be averaged?

</details>

<details>
<summary>✅ Solution</summary>

```sql
SELECT 
    p.product_id,
    p.name AS product_name,
    cat.name AS category_name,
    COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_revenue,
    COUNT(DISTINCT o.customer_id) AS unique_customers,
    -- Average of order totals (not line items)
    ROUND(AVG(DISTINCT o.total_amount), 2) AS avg_order_value
FROM products p
LEFT JOIN categories cat ON p.category_id = cat.category_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id
GROUP BY p.product_id, p.name, cat.name
ORDER BY total_revenue DESC;

-- Note: AVG(DISTINCT o.total_amount) averages unique order totals
-- If same order appears multiple times (multiple items), 
-- DISTINCT ensures we count each order once

-- Alternative approach for more accurate order average:
WITH product_orders AS (
    SELECT DISTINCT 
        p.product_id,
        o.order_id,
        o.total_amount
    FROM products p
    JOIN order_items oi ON p.product_id = oi.product_id
    JOIN orders o ON oi.order_id = o.order_id
)
SELECT 
    p.product_id,
    p.name,
    COUNT(po.order_id) AS orders_containing_product,
    AVG(po.total_amount) AS avg_order_value
FROM products p
LEFT JOIN product_orders po ON p.product_id = po.product_id
GROUP BY p.product_id, p.name;
```

</details>

---

### Exercise 3: Complex JOIN Scenario 🔴

**Scenario:** Customer segmentation analysis. For each customer tier (gold, silver, bronze), calculate:

1. Number of customers
2. Average orders per customer
3. Average order value
4. Total revenue
5. Most popular product category (by revenue)
6. Customer with highest lifetime value in that tier

<details>
<summary>💡 Hints</summary>

- Use CTEs to break down the problem
- First aggregate at customer level, then at tier level
- "Most popular category" requires ranking within groups
- Window functions can help with "highest in tier"

</details>

<details>
<summary>✅ Solution</summary>

```sql
WITH customer_stats AS (
    -- Per-customer metrics
    SELECT 
        c.customer_id,
        c.name,
        c.tier,
        COUNT(o.order_id) AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS lifetime_value
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.customer_id, c.name, c.tier
),
tier_stats AS (
    -- Aggregate by tier
    SELECT 
        tier,
        COUNT(*) AS customer_count,
        ROUND(AVG(order_count), 2) AS avg_orders_per_customer,
        SUM(lifetime_value) AS total_revenue
    FROM customer_stats
    GROUP BY tier
),
tier_avg_order AS (
    -- Average order value per tier (different base)
    SELECT 
        c.tier,
        ROUND(AVG(o.total_amount), 2) AS avg_order_value
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.tier
),
tier_top_category AS (
    -- Most popular category by revenue per tier
    SELECT DISTINCT ON (c.tier)  -- PostgreSQL; use ROW_NUMBER for others
        c.tier,
        cat.name AS top_category,
        SUM(oi.quantity * oi.unit_price) AS category_revenue
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    JOIN categories cat ON p.category_id = cat.category_id
    GROUP BY c.tier, cat.category_id, cat.name
    ORDER BY c.tier, category_revenue DESC
),
tier_top_customer AS (
    -- Highest LTV customer per tier
    SELECT DISTINCT ON (tier)
        tier,
        name AS top_customer,
        lifetime_value AS top_customer_ltv
    FROM customer_stats
    ORDER BY tier, lifetime_value DESC
)
-- Final result
SELECT 
    ts.tier,
    ts.customer_count,
    ts.avg_orders_per_customer,
    COALESCE(tao.avg_order_value, 0) AS avg_order_value,
    ts.total_revenue,
    COALESCE(ttc.top_category, 'N/A') AS most_popular_category,
    COALESCE(ttcust.top_customer, 'N/A') AS highest_ltv_customer,
    COALESCE(ttcust.top_customer_ltv, 0) AS highest_ltv_amount
FROM tier_stats ts
LEFT JOIN tier_avg_order tao ON ts.tier = tao.tier
LEFT JOIN tier_top_category ttc ON ts.tier = ttc.tier
LEFT JOIN tier_top_customer ttcust ON ts.tier = ttcust.tier
ORDER BY ts.total_revenue DESC;

-- Alternative for non-PostgreSQL (using ROW_NUMBER):
/*
WITH ranked_categories AS (
    SELECT 
        c.tier,
        cat.name AS category_name,
        SUM(oi.quantity * oi.unit_price) AS revenue,
        ROW_NUMBER() OVER (PARTITION BY c.tier ORDER BY SUM(oi.quantity * oi.unit_price) DESC) AS rn
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    JOIN categories cat ON p.category_id = cat.category_id
    GROUP BY c.tier, cat.category_id, cat.name
)
SELECT * FROM ranked_categories WHERE rn = 1;
*/
```

</details>

---

## Key Takeaways

- 🔗 **INNER JOIN** = Only matching rows from both sides
- ⬅️ **LEFT JOIN** = All rows from left + matching from right (NULL if none)
- ➡️ **RIGHT JOIN** = All rows from right + matching from left (rarely used)
- ↔️ **FULL OUTER JOIN** = All rows from both (with NULLs for non-matches)
- ✖️ **CROSS JOIN** = Cartesian product (every combination)
- 🔄 **SELF JOIN** = Table joined to itself (hierarchies, comparisons)
- 📍 **ON vs WHERE matters** for OUTER JOINs - conditions in ON keep all outer rows

---

## Related Topics

- [Subqueries and CTEs](/databases/05-subqueries-and-ctes.md) - Alternative to JOINs
- [Advanced SQL Patterns](/databases/06-advanced-sql-patterns.md) - Window functions, pivots
- [Query Optimization](/databases/09-query-optimization.md) - JOIN performance
