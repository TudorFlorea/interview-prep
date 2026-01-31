# Subqueries and CTEs

[← Back to Index](00-index.md)

---

## Overview

Subqueries (queries nested inside other queries) and CTEs (Common Table Expressions) allow you to build complex queries from simpler parts. They enable calculations that require multiple steps, comparisons against aggregates, and cleaner organization of complex logic.

### When This Matters Most
- Comparing rows against aggregated values
- Building queries step by step
- Recursive data structures (trees, graphs)
- Making complex queries readable and maintainable

---

## Core Concepts

### Types of Subqueries

| Type | Returns | Location | Correlation |
|------|---------|----------|-------------|
| **Scalar** | Single value | SELECT, WHERE, HAVING | Optional |
| **Row** | Single row, multiple columns | WHERE (rare) | Optional |
| **Table** | Multiple rows and columns | FROM, JOIN | Optional |
| **Correlated** | Depends on outer query | Anywhere | Required |

---

## Scalar Subqueries

Returns exactly one value. Used for comparisons or calculations.

```sql
-- In WHERE: Compare against aggregate
SELECT name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products);

-- In SELECT: Add calculated column
SELECT 
    p.name,
    p.price,
    (SELECT AVG(price) FROM products) AS avg_price,
    p.price - (SELECT AVG(price) FROM products) AS diff_from_avg
FROM products p;

-- In SELECT: Related count
SELECT 
    c.name,
    c.email,
    (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS order_count
FROM customers c;
```

⚠️ **Warning**: If a scalar subquery returns more than one row, you get an error!

```sql
-- ❌ ERROR: subquery returns multiple rows
SELECT * FROM products WHERE price = (SELECT price FROM products);

-- ✅ Fix with aggregate or LIMIT
SELECT * FROM products WHERE price = (SELECT MAX(price) FROM products);
```

---

## Table Subqueries (Derived Tables)

Returns a result set that can be used like a table.

```sql
-- In FROM clause (must have alias)
SELECT 
    customer_tier,
    AVG(order_count) AS avg_orders,
    SUM(total_spent) AS tier_revenue
FROM (
    SELECT 
        c.tier AS customer_tier,
        COUNT(o.order_id) AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.customer_id, c.tier
) AS customer_summary
GROUP BY customer_tier;

-- Filtering before JOIN
SELECT 
    o.order_id,
    o.order_date,
    recent_customers.name
FROM orders o
JOIN (
    SELECT customer_id, name
    FROM customers
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
) AS recent_customers ON o.customer_id = recent_customers.customer_id;
```

---

## Correlated Subqueries

References columns from the outer query. Executed once per outer row.

```sql
-- Find orders above customer's average
SELECT 
    o.order_id,
    o.customer_id,
    o.total_amount
FROM orders o
WHERE o.total_amount > (
    SELECT AVG(o2.total_amount)
    FROM orders o2
    WHERE o2.customer_id = o.customer_id  -- Correlation
);

-- Latest order per customer
SELECT *
FROM orders o1
WHERE o1.order_date = (
    SELECT MAX(o2.order_date)
    FROM orders o2
    WHERE o2.customer_id = o1.customer_id  -- Correlation
);
```

**Performance Note**: Correlated subqueries can be slow (runs for each outer row). Consider rewriting as JOINs or window functions.

```sql
-- Correlated subquery (slower)
SELECT 
    o.order_id,
    (SELECT SUM(oi.quantity * oi.unit_price) 
     FROM order_items oi 
     WHERE oi.order_id = o.order_id) AS calculated_total
FROM orders o;

-- JOIN (usually faster)
SELECT 
    o.order_id,
    SUM(oi.quantity * oi.unit_price) AS calculated_total
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id;
```

---

## EXISTS and NOT EXISTS

Tests for existence of rows. Very efficient for checking relationships.

```sql
-- Customers who have placed at least one order
SELECT c.customer_id, c.name
FROM customers c
WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.customer_id = c.customer_id
);

-- Customers with NO orders
SELECT c.customer_id, c.name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.customer_id = c.customer_id
);

-- Products ordered by gold-tier customers
SELECT p.product_id, p.name
FROM products p
WHERE EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    JOIN customers c ON o.customer_id = c.customer_id
    WHERE oi.product_id = p.product_id
    AND c.tier = 'gold'
);
```

**EXISTS vs IN vs JOIN:**

```sql
-- All three find customers with orders:

-- EXISTS (short-circuits on first match)
SELECT * FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);

-- IN (gets all matching values first)
SELECT * FROM customers
WHERE customer_id IN (SELECT DISTINCT customer_id FROM orders);

-- JOIN (may return duplicates without DISTINCT)
SELECT DISTINCT c.* FROM customers c
JOIN orders o ON c.customer_id = o.customer_id;
```

| Method | Best When | Avoids |
|--------|-----------|--------|
| EXISTS | Correlated check, large subquery | Full subquery scan |
| IN | Simple list, small subquery | Correlation overhead |
| JOIN | Need columns from both tables | Subquery overhead |

---

## IN, ANY, ALL

```sql
-- IN: Matches any value in list
SELECT * FROM products
WHERE category_id IN (1, 3, 5);

SELECT * FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders WHERE total_amount > 1000);

-- ANY: Comparison true for at least one value
SELECT * FROM products
WHERE price > ANY (SELECT price FROM products WHERE category_id = 1);
-- Equivalent to: WHERE price > (SELECT MIN(price) ...)

-- ALL: Comparison true for all values
SELECT * FROM products
WHERE price > ALL (SELECT price FROM products WHERE category_id = 1);
-- Equivalent to: WHERE price > (SELECT MAX(price) ...)
```

---

## Common Table Expressions (CTEs)

Named temporary result sets defined at the start of a query. More readable than nested subqueries.

### Basic CTE Syntax

```sql
WITH cte_name AS (
    SELECT ...
)
SELECT * FROM cte_name;

-- Multiple CTEs
WITH 
    customer_orders AS (
        SELECT customer_id, COUNT(*) AS order_count
        FROM orders
        GROUP BY customer_id
    ),
    high_value_customers AS (
        SELECT customer_id
        FROM customer_orders
        WHERE order_count >= 5
    )
SELECT c.name, co.order_count
FROM customers c
JOIN customer_orders co ON c.customer_id = co.customer_id
WHERE c.customer_id IN (SELECT customer_id FROM high_value_customers);
```

### CTEs vs Subqueries

```sql
-- Complex query with nested subqueries (hard to read)
SELECT *
FROM (
    SELECT customer_id, 
           order_count,
           (SELECT AVG(order_count) FROM (
               SELECT customer_id, COUNT(*) AS order_count
               FROM orders GROUP BY customer_id
           ) t) AS avg_orders
    FROM (
        SELECT customer_id, COUNT(*) AS order_count
        FROM orders
        GROUP BY customer_id
    ) customer_stats
) result
WHERE order_count > avg_orders;

-- Same query with CTEs (much clearer)
WITH customer_stats AS (
    SELECT 
        customer_id,
        COUNT(*) AS order_count
    FROM orders
    GROUP BY customer_id
),
avg_orders AS (
    SELECT AVG(order_count) AS avg_count FROM customer_stats
)
SELECT cs.*
FROM customer_stats cs
CROSS JOIN avg_orders ao
WHERE cs.order_count > ao.avg_count;
```

### CTE Best Practices

- ✅ Name CTEs descriptively (`monthly_revenue`, not `cte1`)
- ✅ Build complex logic step by step
- ✅ Reference CTEs multiple times when needed
- ⚠️ CTEs are typically not materialized (re-executed each reference)

---

## Recursive CTEs

For hierarchical and graph-like data structures.

### Basic Recursive Structure

```sql
WITH RECURSIVE cte_name AS (
    -- Base case (anchor member)
    SELECT ... WHERE ... (starting condition)
    
    UNION ALL
    
    -- Recursive case (references itself)
    SELECT ... FROM cte_name WHERE ... (termination condition)
)
SELECT * FROM cte_name;
```

### Example: Category Hierarchy

```sql
-- Table: categories (id, name, parent_id)
-- Find all subcategories under "Electronics" (id=1)

WITH RECURSIVE category_tree AS (
    -- Base case: start with Electronics
    SELECT category_id, name, parent_id, 0 AS depth, 
           CAST(name AS VARCHAR(1000)) AS path
    FROM categories
    WHERE category_id = 1
    
    UNION ALL
    
    -- Recursive case: find children
    SELECT c.category_id, c.name, c.parent_id, ct.depth + 1,
           CONCAT(ct.path, ' > ', c.name) AS path
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.category_id
)
SELECT * FROM category_tree ORDER BY depth, name;

-- Result:
-- | category_id | name        | parent_id | depth | path                            |
-- |-------------|-------------|-----------|-------|----------------------------------|
-- | 1           | Electronics | NULL      | 0     | Electronics                      |
-- | 2           | Phones      | 1         | 1     | Electronics > Phones             |
-- | 5           | Computers   | 1         | 1     | Electronics > Computers          |
-- | 3           | Smartphones | 2         | 2     | Electronics > Phones > Smartphones|
```

### Example: Employee Hierarchy

```sql
-- Find all reports (direct and indirect) under a manager
WITH RECURSIVE reports AS (
    -- Base: Direct reports
    SELECT employee_id, name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id = 100  -- Manager ID
    
    UNION ALL
    
    -- Recursive: Reports of reports
    SELECT e.employee_id, e.name, e.manager_id, r.level + 1
    FROM employees e
    JOIN reports r ON e.manager_id = r.employee_id
)
SELECT * FROM reports ORDER BY level, name;
```

### Example: Bill of Materials (BOM)

```sql
-- Products composed of other products
CREATE TABLE product_components (
    product_id INT,
    component_id INT,
    quantity INT
);

-- Calculate total components needed for a product
WITH RECURSIVE bom AS (
    -- Base: Direct components
    SELECT 
        product_id,
        component_id,
        quantity,
        1 AS level
    FROM product_components
    WHERE product_id = 1000
    
    UNION ALL
    
    -- Recursive: Components of components
    SELECT 
        bom.product_id,
        pc.component_id,
        bom.quantity * pc.quantity AS quantity,
        bom.level + 1
    FROM bom
    JOIN product_components pc ON bom.component_id = pc.product_id
    WHERE bom.level &lt; 10  -- Safety limit
)
SELECT 
    component_id,
    SUM(quantity) AS total_quantity_needed
FROM bom
GROUP BY component_id;
```

### Recursive CTE Safety

```sql
-- Always include termination conditions:
-- 1. Level/depth limit
WHERE level &lt; 100

-- 2. Cycle detection (PostgreSQL)
WITH RECURSIVE tree AS (
    SELECT id, parent_id, ARRAY[id] AS path, false AS is_cycle
    FROM nodes WHERE id = 1
    
    UNION ALL
    
    SELECT n.id, n.parent_id, t.path || n.id, n.id = ANY(t.path)
    FROM nodes n
    JOIN tree t ON n.parent_id = t.id
    WHERE NOT t.is_cycle
)
SELECT * FROM tree;

-- MySQL 8.0+ has CYCLE detection built in
```

---

## Advanced Patterns

### Subquery in UPDATE

```sql
-- Update prices to match competitor
UPDATE products p
SET price = (
    SELECT c.price 
    FROM competitor_prices c 
    WHERE c.product_sku = p.sku
)
WHERE EXISTS (
    SELECT 1 
    FROM competitor_prices c 
    WHERE c.product_sku = p.sku
);

-- Update with aggregated value
UPDATE orders o
SET total_amount = (
    SELECT SUM(quantity * unit_price)
    FROM order_items oi
    WHERE oi.order_id = o.order_id
);
```

### Subquery in INSERT

```sql
-- Insert from query
INSERT INTO order_archive (order_id, customer_id, total_amount, archived_at)
SELECT order_id, customer_id, total_amount, NOW()
FROM orders
WHERE order_date &lt; DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Insert with subquery values
INSERT INTO daily_summary (report_date, order_count, total_revenue)
SELECT 
    CURRENT_DATE,
    (SELECT COUNT(*) FROM orders WHERE DATE(order_date) = CURRENT_DATE),
    (SELECT SUM(total_amount) FROM orders WHERE DATE(order_date) = CURRENT_DATE);
```

### Lateral Joins (CROSS APPLY)

Subquery that can reference columns from preceding tables:

```sql
-- PostgreSQL: LATERAL
-- SQL Server: CROSS APPLY / OUTER APPLY

-- Top 3 orders per customer
SELECT 
    c.customer_id,
    c.name,
    top_orders.order_id,
    top_orders.total_amount
FROM customers c
CROSS JOIN LATERAL (  -- or CROSS APPLY in SQL Server
    SELECT order_id, total_amount
    FROM orders o
    WHERE o.customer_id = c.customer_id
    ORDER BY total_amount DESC
    LIMIT 3
) AS top_orders;

-- Without LATERAL (less efficient)
SELECT c.customer_id, c.name, o.order_id, o.total_amount
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE (
    SELECT COUNT(*) FROM orders o2 
    WHERE o2.customer_id = c.customer_id 
    AND o2.total_amount >= o.total_amount
) &lt;= 3;
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Use CTEs for complex logic**: Break down step by step
- **EXISTS for existence checks**: More efficient than COUNT > 0
- **LATERAL for "top N per group"**: Cleaner than window functions sometimes
- **Add depth limits to recursive CTEs**: Prevent infinite loops

### ❌ Avoid:
- **Deeply nested subqueries**: Refactor to CTEs
- **Correlated subqueries in SELECT for many rows**: Use JOIN
- **Assuming CTEs are materialized**: They're usually not (except PostgreSQL `MATERIALIZED` hint)

---

## Exercises

### Exercise 1: Subquery Basics 🟢

**Tasks:**
1. Find all products priced above the average product price
2. Find customers who have never placed an order (using NOT EXISTS)
3. For each order, show the order total and the customer's lifetime total

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Products above average price
SELECT product_id, name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products)
ORDER BY price DESC;

-- 2. Customers with no orders (NOT EXISTS)
SELECT c.customer_id, c.name, c.email
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
);

-- 3. Order with customer lifetime total
SELECT 
    o.order_id,
    o.customer_id,
    o.total_amount AS order_total,
    (SELECT SUM(o2.total_amount) 
     FROM orders o2 
     WHERE o2.customer_id = o.customer_id) AS customer_lifetime_total
FROM orders o
ORDER BY o.customer_id, o.order_date;
```

</details>

---

### Exercise 2: CTE for Analytics 🟡

**Scenario:** Build a customer segmentation report using CTEs:

1. Calculate each customer's total orders and total spending
2. Categorize customers as: 'VIP' (>$1000), 'Regular' (>$100), 'New' (≤$100 or no orders)
3. Show count and total revenue per segment

<details>
<summary>💡 Hints</summary>

- First CTE: aggregate per customer
- Second CTE: add segment classification
- Final query: aggregate per segment

</details>

<details>
<summary>✅ Solution</summary>

```sql
WITH customer_metrics AS (
    -- Step 1: Customer-level aggregates
    SELECT 
        c.customer_id,
        c.name,
        COUNT(o.order_id) AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS total_spent
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.customer_id, c.name
),
customer_segments AS (
    -- Step 2: Classify into segments
    SELECT 
        customer_id,
        name,
        order_count,
        total_spent,
        CASE 
            WHEN total_spent > 1000 THEN 'VIP'
            WHEN total_spent > 100 THEN 'Regular'
            ELSE 'New'
        END AS segment
    FROM customer_metrics
)
-- Step 3: Segment summary
SELECT 
    segment,
    COUNT(*) AS customer_count,
    SUM(order_count) AS total_orders,
    SUM(total_spent) AS segment_revenue,
    ROUND(AVG(total_spent), 2) AS avg_customer_value
FROM customer_segments
GROUP BY segment
ORDER BY segment_revenue DESC;
```

</details>

---

### Exercise 3: Recursive CTE Challenge 🔴

**Scenario:** Given a category tree, write queries for:

```sql
-- Sample data
CREATE TABLE categories (
    category_id INT PRIMARY KEY,
    name VARCHAR(100),
    parent_id INT
);

INSERT INTO categories VALUES
(1, 'All Products', NULL),
(2, 'Electronics', 1),
(3, 'Clothing', 1),
(4, 'Phones', 2),
(5, 'Computers', 2),
(6, 'Men', 3),
(7, 'Women', 3),
(8, 'Smartphones', 4),
(9, 'Laptops', 5),
(10, 'Accessories', 2);
```

**Tasks:**
1. Build full hierarchy from any category showing path and depth
2. Find all leaf categories (categories with no children)
3. For a product in category "Smartphones", list all ancestor categories

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Full hierarchy with path and depth
WITH RECURSIVE category_hierarchy AS (
    -- Base: root categories
    SELECT 
        category_id,
        name,
        parent_id,
        0 AS depth,
        name AS path,
        CAST(category_id AS VARCHAR(100)) AS id_path
    FROM categories
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Recursive: children
    SELECT 
        c.category_id,
        c.name,
        c.parent_id,
        ch.depth + 1,
        CONCAT(ch.path, ' > ', c.name),
        CONCAT(ch.id_path, ' > ', c.category_id)
    FROM categories c
    JOIN category_hierarchy ch ON c.parent_id = ch.category_id
)
SELECT 
    REPEAT('  ', depth) || name AS indented_name,
    depth,
    path
FROM category_hierarchy
ORDER BY path;

-- 2. Leaf categories (no children)
SELECT c.category_id, c.name
FROM categories c
WHERE NOT EXISTS (
    SELECT 1 FROM categories child
    WHERE child.parent_id = c.category_id
);

-- Alternative with LEFT JOIN
SELECT c.category_id, c.name
FROM categories c
LEFT JOIN categories child ON c.category_id = child.parent_id
WHERE child.category_id IS NULL;

-- 3. Ancestors of "Smartphones" (category_id = 8)
WITH RECURSIVE ancestors AS (
    -- Base: start with the category
    SELECT category_id, name, parent_id, 0 AS distance
    FROM categories
    WHERE category_id = 8
    
    UNION ALL
    
    -- Recursive: move up to parent
    SELECT c.category_id, c.name, c.parent_id, a.distance + 1
    FROM categories c
    JOIN ancestors a ON c.category_id = a.parent_id
)
SELECT category_id, name, distance
FROM ancestors
ORDER BY distance;

-- Result:
-- | category_id | name         | distance |
-- |-------------|--------------|----------|
-- | 8           | Smartphones  | 0        |
-- | 4           | Phones       | 1        |
-- | 2           | Electronics  | 2        |
-- | 1           | All Products | 3        |

-- Practical use: Breadcrumb navigation
SELECT STRING_AGG(name, ' > ' ORDER BY distance DESC) AS breadcrumb
FROM ancestors;
-- Result: "All Products > Electronics > Phones > Smartphones"
```

</details>

---

## Key Takeaways

- 📦 **Scalar subqueries** return one value - use in SELECT, WHERE, HAVING
- 📋 **Table subqueries** return rows - must be aliased in FROM clause
- 🔄 **Correlated subqueries** reference outer query - run per row, can be slow
- ✅ **EXISTS** is efficient for existence checks - short-circuits on first match
- 📝 **CTEs** make complex queries readable - named, reusable query blocks
- 🔁 **Recursive CTEs** handle hierarchies - always include termination condition

---

## Related Topics

- [Multi-Table Queries](04-multi-table-queries.md) - JOINs as alternative to subqueries
- [Advanced SQL Patterns](06-advanced-sql-patterns.md) - Window functions
- [Query Optimization](09-query-optimization.md) - Subquery performance
