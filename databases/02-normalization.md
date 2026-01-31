# Normalization

[← Back to Index](00-index.md)

---

## Overview

Normalization is the process of organizing database tables to minimize redundancy and dependency. It involves decomposing tables into smaller ones and defining relationships between them. The goal is eliminating data anomalies while maintaining data integrity.

### Why Normalize?
- **Eliminate redundancy**: Same data stored once, not many times
- **Prevent anomalies**: Insert, update, and delete work correctly
- **Improve integrity**: Changes propagate consistently
- **Reduce storage**: Less duplicate data

### When to Denormalize?
- Read-heavy workloads where JOINs are expensive
- Reporting/analytics databases (OLAP)
- Caching layers for computed values
- Proven performance bottlenecks (not premature optimization)

---

## Core Concepts

### Data Anomalies

Without proper normalization, you encounter these problems:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  UNNORMALIZED: orders_denormalized                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ order_id │ customer_name │ customer_email      │ product_name │ price      │
├──────────┼───────────────┼─────────────────────┼──────────────┼────────────┤
│ 1        │ John Doe      │ john@example.com    │ Laptop       │ 999.00     │
│ 2        │ John Doe      │ john@example.com    │ Mouse        │ 29.00      │
│ 3        │ Jane Smith    │ jane@example.com    │ Laptop       │ 999.00     │
└──────────┴───────────────┴─────────────────────┴──────────────┴────────────┘
```

| Anomaly | Problem | Example |
|---------|---------|---------|
| **Insert** | Can't add data without unrelated data | Can't add a customer without an order |
| **Update** | Must update multiple rows for one change | John changes email → update all his orders |
| **Delete** | Deleting data loses unrelated information | Delete last order → lose customer info |

---

### Functional Dependencies

Normalization is based on **functional dependencies** (FD):

**Definition**: `X → Y` means "X determines Y" or "if you know X, you can find Y"

```
Examples in an order:
- order_id → order_date          (order_id determines order_date)
- order_id → customer_id         (order_id determines customer_id)
- product_id → product_name      (product_id determines product_name)
- product_id → price             (product_id determines price)

- {order_id, product_id} → quantity   (composite key determines quantity)
```

**Key Types**:
- **Candidate Key**: Minimal set of attributes that uniquely identifies a row
- **Primary Key**: Chosen candidate key
- **Partial Dependency**: FD on part of a composite key
- **Transitive Dependency**: X → Y → Z (X determines Z through Y)

---

## Normal Forms

### First Normal Form (1NF)

**Rule**: All columns contain atomic (indivisible) values; no repeating groups.

```sql
-- ❌ Violates 1NF: Multi-valued column
CREATE TABLE orders_bad (
    order_id INT PRIMARY KEY,
    products VARCHAR(500)  -- "Laptop, Mouse, Keyboard"
);

-- ❌ Violates 1NF: Repeating groups
CREATE TABLE orders_bad2 (
    order_id INT PRIMARY KEY,
    product1_name VARCHAR(100),
    product1_qty INT,
    product2_name VARCHAR(100),
    product2_qty INT,
    product3_name VARCHAR(100),
    product3_qty INT
);

-- ✅ 1NF: Atomic values, separate rows
CREATE TABLE orders (
    order_id INT,
    product_name VARCHAR(100),
    quantity INT,
    PRIMARY KEY (order_id, product_name)
);
```

**1NF Checklist**:
- ✅ Each column holds a single value
- ✅ No repeating groups of columns
- ✅ Each row is unique (has a primary key)
- ✅ Column order doesn't matter

---

### Second Normal Form (2NF)

**Rule**: Must be in 1NF + no partial dependencies (non-key columns depend on the *entire* primary key).

Only relevant when you have a **composite primary key**.

```sql
-- ❌ Violates 2NF: Partial dependency
-- PK: (order_id, product_id)
-- product_name depends only on product_id (partial dependency)
CREATE TABLE order_items_bad (
    order_id INT,
    product_id INT,
    product_name VARCHAR(100),  -- Depends only on product_id!
    quantity INT,
    PRIMARY KEY (order_id, product_id)
);

-- Functional Dependencies:
-- (order_id, product_id) → quantity     ✅ Full dependency
-- product_id → product_name             ❌ Partial dependency

-- ✅ 2NF: Remove partial dependencies to separate table
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100)
);

CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

**2NF Checklist**:
- ✅ Is in 1NF
- ✅ Every non-key column depends on the complete primary key
- ✅ No partial dependencies (for composite keys)

---

### Third Normal Form (3NF)

**Rule**: Must be in 2NF + no transitive dependencies (non-key columns don't depend on other non-key columns).

```sql
-- ❌ Violates 3NF: Transitive dependency
-- order_id → customer_id → customer_name
-- customer_name depends on order_id THROUGH customer_id
CREATE TABLE orders_bad (
    order_id INT PRIMARY KEY,
    customer_id INT,
    customer_name VARCHAR(100),  -- Transitively dependent!
    order_date DATE
);

-- ✅ 3NF: Remove transitive dependencies
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    customer_name VARCHAR(100)
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date DATE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);
```

**3NF Checklist**:
- ✅ Is in 2NF
- ✅ No transitive dependencies
- ✅ Every non-key column depends *only* on the primary key

**Boyce-Codd Normal Form (BCNF)**: A stricter version of 3NF. For every FD `X → Y`, X must be a superkey.

---

### Higher Normal Forms (4NF, 5NF)

Less commonly applied but important for complex scenarios:

**Fourth Normal Form (4NF)**: No multi-valued dependencies

```sql
-- ❌ Violates 4NF: Multi-valued dependencies
-- An employee can have multiple skills AND multiple languages
-- These are independent of each other
CREATE TABLE employee_skills_languages (
    employee_id INT,
    skill VARCHAR(50),
    language VARCHAR(50),
    PRIMARY KEY (employee_id, skill, language)
);

-- Problem: If John knows {Java, Python} and speaks {English, Spanish}
-- You get a Cartesian product: 4 rows instead of 2+2

-- ✅ 4NF: Separate independent multi-valued facts
CREATE TABLE employee_skills (
    employee_id INT,
    skill VARCHAR(50),
    PRIMARY KEY (employee_id, skill)
);

CREATE TABLE employee_languages (
    employee_id INT,
    language VARCHAR(50),
    PRIMARY KEY (employee_id, language)
);
```

---

## Normalization Process

### Step-by-Step Example

**Starting Point**: Unnormalized data

```
ORDER_DATA (unnormalized):
┌───────────┬────────────┬─────────────────┬──────────────────────────────────┐
│ order_id  │ order_date │ customer_info   │ items                            │
├───────────┼────────────┼─────────────────┼──────────────────────────────────┤
│ 1001      │ 2024-01-15 │ John, NYC,      │ Laptop:999:1, Mouse:29:2         │
│           │            │ john@email.com  │                                  │
├───────────┼────────────┼─────────────────┼──────────────────────────────────┤
│ 1002      │ 2024-01-16 │ Jane, LA,       │ Keyboard:79:1                    │
│           │            │ jane@email.com  │                                  │
└───────────┴────────────┴─────────────────┴──────────────────────────────────┘
```

**Step 1: Convert to 1NF** (atomic values, no repeating groups)

```sql
-- Split composite columns and repeating groups
CREATE TABLE orders_1nf (
    order_id INT,
    order_date DATE,
    customer_name VARCHAR(100),
    customer_city VARCHAR(100),
    customer_email VARCHAR(255),
    product_name VARCHAR(100),
    product_price DECIMAL(10,2),
    quantity INT,
    PRIMARY KEY (order_id, product_name)
);

-- Data now:
-- 1001, 2024-01-15, John, NYC, john@email.com, Laptop, 999, 1
-- 1001, 2024-01-15, John, NYC, john@email.com, Mouse, 29, 2
-- 1002, 2024-01-16, Jane, LA, jane@email.com, Keyboard, 79, 1
```

**Step 2: Convert to 2NF** (remove partial dependencies)

```sql
-- Identify FDs:
-- order_id → order_date, customer_* (partial: only needs order_id)
-- product_name → product_price (partial: only needs product_name)
-- (order_id, product_name) → quantity (full dependency)

CREATE TABLE orders_2nf (
    order_id INT PRIMARY KEY,
    order_date DATE,
    customer_name VARCHAR(100),
    customer_city VARCHAR(100),
    customer_email VARCHAR(255)
);

CREATE TABLE products_2nf (
    product_name VARCHAR(100) PRIMARY KEY,
    product_price DECIMAL(10,2)
);

CREATE TABLE order_items_2nf (
    order_id INT,
    product_name VARCHAR(100),
    quantity INT,
    PRIMARY KEY (order_id, product_name)
);
```

**Step 3: Convert to 3NF** (remove transitive dependencies)

```sql
-- In orders_2nf:
-- order_id → customer_email → customer_name, customer_city
-- (If email determines customer info, that's transitive)

CREATE TABLE customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(100),
    customer_city VARCHAR(100),
    customer_email VARCHAR(255) UNIQUE
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    order_date DATE,
    customer_id INT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(100),
    product_price DECIMAL(10,2)
);

CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(10,2),  -- Price at time of order (may differ from current)
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

---

## Denormalization Strategies

When normalized design causes performance issues:

### Strategy 1: Calculated/Derived Columns

```sql
-- Instead of: SUM(order_items.quantity * unit_price) every time
ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10,2);

-- Update via trigger or application code
UPDATE orders o
SET total_amount = (
    SELECT SUM(quantity * unit_price)
    FROM order_items oi
    WHERE oi.order_id = o.order_id
);
```

### Strategy 2: Redundant Columns

```sql
-- Frequently need customer_name with order
-- Instead of always joining
ALTER TABLE orders ADD COLUMN customer_name VARCHAR(100);

-- Trade-off: Must keep in sync with customers table
```

### Strategy 3: Summary Tables

```sql
-- For reporting: pre-aggregated data
CREATE TABLE daily_sales_summary (
    summary_date DATE PRIMARY KEY,
    total_orders INT,
    total_revenue DECIMAL(12,2),
    avg_order_value DECIMAL(10,2),
    updated_at TIMESTAMP
);

-- Refresh periodically or via triggers
```

### Strategy 4: Materialized Views

```sql
-- PostgreSQL materialized view
CREATE MATERIALIZED VIEW product_sales_summary AS
SELECT 
    p.product_id,
    p.product_name,
    COUNT(DISTINCT oi.order_id) as order_count,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.quantity * oi.unit_price) as total_revenue
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.product_name;

-- Refresh when needed
REFRESH MATERIALIZED VIEW product_sales_summary;
```

---

## Common Patterns & Best Practices

### ✅ When to Normalize
- Transactional (OLTP) systems
- Data integrity is critical
- Write-heavy workloads
- Schema will evolve

### ✅ When to Denormalize
- Read-heavy / analytics (OLAP) systems
- Proven JOIN performance problems
- Caching derived values
- Reporting tables

### ⚠️ Red Flags in Schema
| Red Flag | Normal Form Violated |
|----------|---------------------|
| Comma-separated values in column | 1NF |
| Same data in multiple columns (phone1, phone2) | 1NF |
| Non-key column depends on part of composite key | 2NF |
| Column could be looked up from another non-key column | 3NF |

---

## Exercises

### Exercise 1: Identify Normal Form 🟢

**Task**: For each table, identify the highest normal form it satisfies.

**Table A:**
```
students
├── student_id (PK)
├── name
├── email
├── courses (e.g., "Math, Science, History")
└── advisor_name
```

**Table B:**
```
enrollments
├── student_id (PK)
├── course_id (PK)
├── course_name
├── instructor_name
├── grade
└── enrollment_date
```

**Table C:**
```
employees
├── employee_id (PK)
├── name
├── department_id
├── department_name
└── manager_id
```

<details>
<summary>✅ Solution</summary>

**Table A**: Not in 1NF
- `courses` contains multiple values (comma-separated)

**Table B**: 1NF (not 2NF)
- Is 1NF: All columns are atomic
- Violates 2NF: `course_name` and `instructor_name` depend only on `course_id` (partial dependency)

**Table C**: 2NF (not 3NF)
- Is 1NF: All columns atomic
- Is 2NF: Single-column PK, no partial dependencies possible
- Violates 3NF: `employee_id → department_id → department_name` (transitive dependency)

</details>

---

### Exercise 2: Normalize to 3NF 🟡

**Task**: Normalize this table to 3NF. Show each step and the final schema.

```
invoice_data
├── invoice_id (PK)
├── invoice_date
├── customer_id
├── customer_name
├── customer_address
├── product_codes (e.g., "P001,P002,P003")
├── product_names (e.g., "Laptop,Mouse,Keyboard")
├── quantities (e.g., "1,2,1")
├── unit_prices (e.g., "999,29,79")
├── salesperson_id
├── salesperson_name
└── total_amount
```

<details>
<summary>💡 Hints</summary>

1. First fix the multi-valued columns (1NF)
2. Identify the composite key after 1NF
3. Find partial dependencies (things that depend on part of the key)
4. Find transitive dependencies (non-key → non-key)

</details>

<details>
<summary>✅ Solution</summary>

**Step 1: 1NF - Eliminate multi-valued columns**

Split products into separate rows:
```
invoice_items_1nf
├── invoice_id
├── invoice_date
├── customer_id
├── customer_name
├── customer_address
├── product_code
├── product_name
├── quantity
├── unit_price
├── salesperson_id
├── salesperson_name
└── PRIMARY KEY (invoice_id, product_code)
```

**Step 2: 2NF - Remove partial dependencies**

FDs identified:
- `invoice_id →` invoice_date, customer_*, salesperson_*, (partial)
- `product_code →` product_name (partial)
- `(invoice_id, product_code) →` quantity, unit_price (full)

```sql
CREATE TABLE invoices_2nf (
    invoice_id INT PRIMARY KEY,
    invoice_date DATE,
    customer_id INT,
    customer_name VARCHAR(100),
    customer_address TEXT,
    salesperson_id INT,
    salesperson_name VARCHAR(100)
);

CREATE TABLE products_2nf (
    product_code VARCHAR(20) PRIMARY KEY,
    product_name VARCHAR(100)
);

CREATE TABLE invoice_items_2nf (
    invoice_id INT,
    product_code VARCHAR(20),
    quantity INT,
    unit_price DECIMAL(10,2),
    PRIMARY KEY (invoice_id, product_code)
);
```

**Step 3: 3NF - Remove transitive dependencies**

In invoices_2nf:
- `invoice_id → customer_id → customer_name, customer_address`
- `invoice_id → salesperson_id → salesperson_name`

```sql
-- Final 3NF Schema

CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    customer_name VARCHAR(100),
    customer_address TEXT
);

CREATE TABLE salespersons (
    salesperson_id INT PRIMARY KEY,
    salesperson_name VARCHAR(100)
);

CREATE TABLE products (
    product_code VARCHAR(20) PRIMARY KEY,
    product_name VARCHAR(100),
    current_price DECIMAL(10,2)  -- Added for current pricing
);

CREATE TABLE invoices (
    invoice_id INT PRIMARY KEY,
    invoice_date DATE,
    customer_id INT,
    salesperson_id INT,
    -- total_amount is derived, but can be stored for performance
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (salesperson_id) REFERENCES salespersons(salesperson_id)
);

CREATE TABLE invoice_items (
    invoice_id INT,
    product_code VARCHAR(20),
    quantity INT,
    unit_price DECIMAL(10,2),  -- Price at time of sale (historical)
    PRIMARY KEY (invoice_id, product_code),
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
    FOREIGN KEY (product_code) REFERENCES products(product_code)
);
```

</details>

---

### Exercise 3: Denormalization Decision 🔴

**Scenario**: You have a fully normalized e-commerce database. The product listing page is slow because it requires:

```sql
SELECT 
    p.product_id,
    p.name,
    p.price,
    c.category_name,
    (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.product_id) as review_count,
    (SELECT AVG(rating) FROM reviews r WHERE r.product_id = p.product_id) as avg_rating,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.product_id) as times_ordered
FROM products p
JOIN categories c ON p.category_id = c.category_id
WHERE p.is_active = TRUE
ORDER BY times_ordered DESC
LIMIT 50;
```

**Task**: 
1. Propose a denormalization strategy
2. Design the schema changes
3. Describe how to keep denormalized data consistent
4. Discuss trade-offs of your approach

<details>
<summary>💡 Hints</summary>

- Review/order stats change less frequently than they're read
- Consider what can be pre-computed
- Think about consistency mechanisms: triggers, async jobs, or application code

</details>

<details>
<summary>✅ Solution</summary>

**1. Denormalization Strategy**

Add computed columns to products table for frequently-accessed aggregates:

```sql
ALTER TABLE products ADD COLUMN review_count INT DEFAULT 0;
ALTER TABLE products ADD COLUMN avg_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN times_ordered INT DEFAULT 0;
ALTER TABLE products ADD COLUMN category_name VARCHAR(100);  -- Optional
ALTER TABLE products ADD COLUMN stats_updated_at TIMESTAMP;

CREATE INDEX idx_products_listing ON products(is_active, times_ordered DESC);
```

**2. Simplified Query**

```sql
SELECT 
    product_id,
    name,
    price,
    category_name,
    review_count,
    avg_rating,
    times_ordered
FROM products
WHERE is_active = TRUE
ORDER BY times_ordered DESC
LIMIT 50;
```

**3. Consistency Mechanisms**

Option A: Triggers (real-time, adds write overhead)
```sql
CREATE TRIGGER update_product_review_stats
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    UPDATE products
    SET review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id),
        avg_rating = (SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id),
        stats_updated_at = NOW()
    WHERE product_id = NEW.product_id;
END;
```

Option B: Scheduled job (eventual consistency, lower write overhead)
```sql
-- Run every 5 minutes or hourly
UPDATE products p
SET 
    review_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.product_id),
    avg_rating = (SELECT AVG(rating) FROM reviews r WHERE r.product_id = p.product_id),
    times_ordered = (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.product_id),
    stats_updated_at = NOW()
WHERE p.stats_updated_at &lt; NOW() - INTERVAL 5 MINUTE
   OR p.stats_updated_at IS NULL;
```

Option C: Application-level cache (Redis/Memcached)
- Cache query results with TTL
- Invalidate on relevant writes

**4. Trade-offs**

| Aspect | Normalized | Denormalized |
|--------|------------|--------------|
| Read Speed | Slower (JOINs, subqueries) | Faster (single table) |
| Write Speed | Faster (one write) | Slower (maintain aggregates) |
| Consistency | Always consistent | May be stale |
| Storage | Less | More |
| Complexity | Query complexity | Sync complexity |

**Recommendation**: Use scheduled job (Option B) for this case because:
- Stats don't need to be real-time (a few minutes delay is acceptable)
- Lower write overhead on high-traffic order/review tables
- Simpler to maintain than triggers
- Add cache (Option C) as additional layer if still slow

</details>

---

## Key Takeaways

- 📊 **Normalization prevents anomalies** - Insert, update, delete work correctly
- 🔑 **Based on functional dependencies** - X → Y relationships determine normal forms
- 📈 **Progressive normal forms** - 1NF → 2NF → 3NF (and beyond)
- ⚖️ **Denormalization is intentional** - Trade consistency for performance when needed
- 🎯 **3NF is usually sufficient** - Higher forms rarely needed in practice

---

## Related Topics

- [Database Design Principles](01-database-design-principles.md) - Context for normalization
- [Keys and Constraints](03-keys-and-constraints.md) - Enforcing normalized structure
- [Performance Tuning](10-performance-tuning.md) - When to denormalize
