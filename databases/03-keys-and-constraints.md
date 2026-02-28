# Keys and Constraints

[← Back to Index](/databases/00-index.md)

---

## Overview

Keys and constraints are the enforcement mechanisms for data integrity. Keys uniquely identify rows and establish relationships, while constraints define rules that data must follow. Together, they ensure your database remains consistent even when applications have bugs.

### When This Matters Most
- Designing schema that enforces business rules at the database level
- Debugging foreign key violations
- Optimizing queries (keys often become indexes)
- Migrating data between systems

---

## Core Concepts

### Primary Keys

The unique identifier for each row in a table.

**Types of Primary Keys:**

| Type | Description | Example |
|------|-------------|---------|
| **Surrogate** | System-generated, no business meaning | `AUTO_INCREMENT`, UUID |
| **Natural** | Real-world attribute | Email, SSN, ISBN |
| **Composite** | Multiple columns together | (order_id, product_id) |

```sql
-- Surrogate key (recommended for most cases)
CREATE TABLE customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,  -- MySQL
    -- customer_id SERIAL PRIMARY KEY,          -- PostgreSQL
    -- customer_id INT IDENTITY(1,1) PRIMARY KEY, -- SQL Server
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

-- Natural key
CREATE TABLE countries (
    country_code CHAR(2) PRIMARY KEY,  -- 'US', 'GB', 'DE'
    name VARCHAR(100) NOT NULL
);

-- Composite key
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);
```

**Surrogate vs Natural Keys:**

| Aspect | Surrogate | Natural |
|--------|-----------|---------|
| Stability | Never changes | May change (email, name) |
| Size | Usually small (INT) | Can be large (VARCHAR) |
| Meaning | Meaningless | Self-documenting |
| Joins | Efficient | May be slower |
| Uniqueness | Guaranteed | Must verify |

💡 **Best Practice**: Use surrogate keys by default, add UNIQUE constraints for natural identifiers.

---

### Foreign Keys

Establish relationships between tables and enforce referential integrity.

```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- Foreign key to composite primary key
CREATE TABLE shipment_items (
    shipment_id INT,
    order_id INT,
    product_id INT,
    quantity_shipped INT,
    
    PRIMARY KEY (shipment_id, order_id, product_id),
    FOREIGN KEY (order_id, product_id) 
        REFERENCES order_items(order_id, product_id)
);
```

#### Referential Actions

What happens when parent row is updated or deleted:

```sql
CREATE TABLE order_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    
    -- When order is deleted, delete its items too
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    -- When product is deleted, prevent if it has order items
    FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);
```

| Action | On DELETE | On UPDATE |
|--------|-----------|-----------|
| **CASCADE** | Delete child rows | Update child FKs |
| **RESTRICT** | Block if children exist | Block if children exist |
| **NO ACTION** | Same as RESTRICT (checked at end of statement) | Same as RESTRICT |
| **SET NULL** | Set FK to NULL | Set FK to NULL |
| **SET DEFAULT** | Set FK to default value | Set FK to default value |

```sql
-- Example: SET NULL for optional relationships
CREATE TABLE employees (
    employee_id INT PRIMARY KEY AUTO_INCREMENT,
    manager_id INT,
    name VARCHAR(100) NOT NULL,
    
    -- If manager is deleted, employees become unassigned
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL
);
```

---

### Unique Constraints

Ensure no duplicate values (other than NULL, which is allowed multiple times in most databases).

```sql
-- Single column unique
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE
);

-- Composite unique (combination must be unique)
CREATE TABLE product_categories (
    product_id INT,
    category_id INT,
    display_order INT,
    
    -- A product can only be in a category once
    UNIQUE (product_id, category_id),
    
    -- Separate constraint: product can only have one "primary" category
    -- (would need additional logic, shown for illustration)
    
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Named constraint (useful for error messages and migrations)
CREATE TABLE tenants (
    tenant_id INT PRIMARY KEY,
    slug VARCHAR(50) NOT NULL,
    domain VARCHAR(255),
    
    CONSTRAINT uk_tenant_slug UNIQUE (slug),
    CONSTRAINT uk_tenant_domain UNIQUE (domain)
);
```

**NULL Handling in UNIQUE:**

```sql
-- Most databases: Multiple NULLs allowed in UNIQUE column
INSERT INTO tenants (tenant_id, slug, domain) VALUES (1, 'acme', NULL);
INSERT INTO tenants (tenant_id, slug, domain) VALUES (2, 'globex', NULL);
-- Both work! NULL ≠ NULL

-- To prevent multiple NULLs (SQL Server syntax):
CREATE UNIQUE INDEX uix_domain ON tenants(domain) WHERE domain IS NOT NULL;

-- PostgreSQL: NULLS NOT DISTINCT (v15+)
CREATE TABLE example (
    id INT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NULLS NOT DISTINCT  -- Only one NULL allowed
);
```

---

### Check Constraints

Enforce domain rules on column values.

```sql
CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    weight_kg DECIMAL(8,3),
    
    -- Simple range check
    CONSTRAINT chk_price_positive CHECK (price > 0),
    CONSTRAINT chk_stock_non_negative CHECK (stock_quantity >= 0),
    
    -- Enumeration check
    CONSTRAINT chk_valid_status CHECK (status IN ('draft', 'active', 'discontinued')),
    
    -- Conditional check
    CONSTRAINT chk_weight_if_active CHECK (
        status != 'active' OR weight_kg IS NOT NULL
    )
);

-- Multi-column check
CREATE TABLE events (
    event_id INT PRIMARY KEY,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    
    CONSTRAINT chk_end_after_start CHECK (end_time > start_time)
);

-- Complex business rules
CREATE TABLE discounts (
    discount_id INT PRIMARY KEY,
    discount_type VARCHAR(20) NOT NULL,
    percentage DECIMAL(5,2),
    fixed_amount DECIMAL(10,2),
    
    -- Either percentage OR fixed_amount, not both
    CONSTRAINT chk_discount_type CHECK (
        (discount_type = 'percentage' AND percentage IS NOT NULL AND fixed_amount IS NULL)
        OR
        (discount_type = 'fixed' AND fixed_amount IS NOT NULL AND percentage IS NULL)
    ),
    
    CONSTRAINT chk_percentage_range CHECK (percentage BETWEEN 0 AND 100)
);
```

⚠️ **MySQL Note**: CHECK constraints are parsed but not enforced before MySQL 8.0.16.

---

### NOT NULL Constraint

The simplest but most important constraint.

```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT NOT NULL,           -- Required relationship
    order_date DATE NOT NULL,           -- Required field
    shipped_date DATE,                  -- Optional (NULL = not yet shipped)
    notes TEXT,                         -- Optional
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- Adding NOT NULL to existing column
ALTER TABLE orders 
    ALTER COLUMN customer_id SET NOT NULL;  -- PostgreSQL
    
ALTER TABLE orders 
    MODIFY customer_id INT NOT NULL;        -- MySQL
    
ALTER TABLE orders 
    ALTER COLUMN customer_id INT NOT NULL;  -- SQL Server
```

---

### Default Values

Provide automatic values when none specified.

```sql
CREATE TABLE audit_log (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    row_id INT NOT NULL,
    old_values JSON,
    new_values JSON,
    
    -- Timestamp defaults
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Static defaults
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Expression defaults (PostgreSQL)
    -- uuid_col UUID DEFAULT gen_random_uuid()
);

-- MySQL: DEFAULT with expressions (8.0+)
CREATE TABLE records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Advanced Patterns

### Partial Indexes with Constraints

```sql
-- PostgreSQL: Unique constraint only for active records
CREATE UNIQUE INDEX idx_unique_active_email 
ON users(email) 
WHERE is_deleted = FALSE;

-- Enforce: only one primary address per customer
CREATE UNIQUE INDEX idx_one_primary_address
ON addresses(customer_id)
WHERE is_primary = TRUE;
```

### Deferrable Constraints

For circular references or batch operations:

```sql
-- PostgreSQL
CREATE TABLE nodes (
    node_id INT PRIMARY KEY,
    parent_id INT,
    name VARCHAR(100) NOT NULL,
    
    CONSTRAINT fk_parent 
        FOREIGN KEY (parent_id) REFERENCES nodes(node_id)
        DEFERRABLE INITIALLY DEFERRED
);

-- Now you can insert parent and child in any order within a transaction
BEGIN;
INSERT INTO nodes VALUES (2, 1, 'Child');  -- Parent doesn't exist yet
INSERT INTO nodes VALUES (1, NULL, 'Parent');
COMMIT;  -- Constraint checked here, succeeds
```

### Exclusion Constraints

Prevent overlapping ranges (PostgreSQL):

```sql
-- Requires btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE room_bookings (
    booking_id INT PRIMARY KEY,
    room_id INT NOT NULL,
    during TSTZRANGE NOT NULL,
    
    -- Prevent overlapping bookings for same room
    EXCLUDE USING GIST (room_id WITH =, during WITH &&)
);

INSERT INTO room_bookings VALUES 
(1, 101, '[2024-01-15 09:00, 2024-01-15 10:00)');

INSERT INTO room_bookings VALUES 
(2, 101, '[2024-01-15 09:30, 2024-01-15 11:00)');
-- ERROR: conflicting key value violates exclusion constraint
```

---

### Self-Referential Constraints

For hierarchies and graphs:

```sql
-- Simple hierarchy (tree)
CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    parent_id INT,
    name VARCHAR(100) NOT NULL,
    
    FOREIGN KEY (parent_id) REFERENCES categories(category_id)
        ON DELETE SET NULL  -- Orphan children become roots
);

-- Prevent self-reference
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    manager_id INT,
    name VARCHAR(100) NOT NULL,
    
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id),
    CONSTRAINT chk_not_own_manager CHECK (employee_id != manager_id)
);
```

---

## Constraint Management

### Adding Constraints to Existing Tables

```sql
-- Add foreign key
ALTER TABLE orders
ADD CONSTRAINT fk_orders_customer
FOREIGN KEY (customer_id) REFERENCES customers(customer_id);

-- Add check constraint
ALTER TABLE products
ADD CONSTRAINT chk_price CHECK (price >= 0);

-- Add unique constraint
ALTER TABLE users
ADD CONSTRAINT uk_users_email UNIQUE (email);
```

### Dropping Constraints

```sql
-- By name (preferred)
ALTER TABLE orders DROP CONSTRAINT fk_orders_customer;

-- MySQL: Different syntax for different constraint types
ALTER TABLE orders DROP FOREIGN KEY fk_orders_customer;
ALTER TABLE orders DROP INDEX uk_some_index;
ALTER TABLE orders DROP CHECK chk_something;
```

### Temporarily Disabling Constraints

```sql
-- PostgreSQL: Disable triggers (includes FK enforcement)
ALTER TABLE orders DISABLE TRIGGER ALL;
-- ... bulk operations ...
ALTER TABLE orders ENABLE TRIGGER ALL;

-- MySQL: Session-level
SET FOREIGN_KEY_CHECKS = 0;
-- ... bulk operations ...
SET FOREIGN_KEY_CHECKS = 1;

-- SQL Server
ALTER TABLE orders NOCHECK CONSTRAINT fk_orders_customer;
-- ... bulk operations ...
ALTER TABLE orders CHECK CONSTRAINT fk_orders_customer;

-- Verify no violations were introduced
DBCC CHECKCONSTRAINTS('orders');  -- SQL Server
```

⚠️ **Warning**: Re-enabling constraints doesn't validate existing data. Use `WITH CHECK` (SQL Server) or equivalent to validate.

---

## Common Patterns & Best Practices

### ✅ Do:
- **Name all constraints**: Makes errors readable and migrations manageable
- **Use surrogate primary keys**: Stable, efficient, simple
- **Add UNIQUE for natural keys**: Even with surrogate PK
- **Consider ON DELETE behavior**: Explicitly choose CASCADE, RESTRICT, or SET NULL
- **Use CHECK for enums**: Database-enforced valid values

### ❌ Avoid:
- **Overly complex CHECK constraints**: Hard to maintain, move logic to application
- **Circular foreign keys**: Use deferrable or redesign
- **Disabling constraints permanently**: Data corruption risk
- **Natural primary keys that might change**: Email, phone, etc.

---

## Exercises

### Exercise 1: Design Constraints 🟢

**Task**: Add appropriate constraints to this event management schema.

```sql
CREATE TABLE venues (
    venue_id INT,
    name VARCHAR(100),
    capacity INT,
    hourly_rate DECIMAL(10,2)
);

CREATE TABLE events (
    event_id INT,
    venue_id INT,
    title VARCHAR(200),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    expected_attendance INT,
    status VARCHAR(20)
);
```

**Requirements:**
- Capacity must be positive
- Hourly rate must be non-negative (can be 0 for free venues)
- Event start must be before end
- Expected attendance can't exceed venue capacity
- Status must be: 'draft', 'confirmed', 'cancelled', 'completed'

<details>
<summary>✅ Solution</summary>

```sql
CREATE TABLE venues (
    venue_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    CONSTRAINT chk_venue_capacity CHECK (capacity > 0),
    CONSTRAINT chk_venue_rate CHECK (hourly_rate >= 0)
);

CREATE TABLE events (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    venue_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    expected_attendance INT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    
    CONSTRAINT fk_events_venue 
        FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
    
    CONSTRAINT chk_event_times 
        CHECK (end_time > start_time),
    
    CONSTRAINT chk_event_status 
        CHECK (status IN ('draft', 'confirmed', 'cancelled', 'completed')),
    
    CONSTRAINT chk_attendance_positive
        CHECK (expected_attendance IS NULL OR expected_attendance > 0)
);

-- Note: Cross-table constraint (attendance <= capacity) 
-- can't be done with CHECK, requires trigger or application logic:
CREATE OR REPLACE FUNCTION check_attendance_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expected_attendance > (SELECT capacity FROM venues WHERE venue_id = NEW.venue_id) THEN
        RAISE EXCEPTION 'Expected attendance exceeds venue capacity';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_capacity
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION check_attendance_capacity();
```

</details>

---

### Exercise 2: Fix FK Design 🟡

**Scenario**: This e-commerce schema has foreign key issues. Identify problems and fix them.

```sql
CREATE TABLE customers (
    email VARCHAR(255) PRIMARY KEY,  -- Natural key
    name VARCHAR(100) NOT NULL
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_email VARCHAR(255) REFERENCES customers(email),
    total DECIMAL(10,2)
);

CREATE TABLE order_items (
    order_id INT,
    line_number INT,
    product_name VARCHAR(100),
    quantity INT,
    price DECIMAL(10,2),
    PRIMARY KEY (order_id, line_number)
    -- Missing FK to orders
);

CREATE TABLE reviews (
    review_id INT PRIMARY KEY,
    customer_email VARCHAR(255),
    product_name VARCHAR(100),
    rating INT,
    comment TEXT
    -- No FKs defined
);
```

**Problems to fix:**
1. Natural PK issues
2. Missing foreign keys
3. ON DELETE behavior
4. Missing constraints

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Use surrogate keys, keep natural as UNIQUE
CREATE TABLE customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products table (was missing)
CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    
    CONSTRAINT chk_product_price CHECK (price >= 0)
);

-- 3. Orders with proper FK and constraints
CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_orders_customer 
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE RESTRICT  -- Don't delete customers with orders
        ON UPDATE CASCADE,
    
    CONSTRAINT chk_order_total CHECK (total >= 0),
    CONSTRAINT chk_order_status CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled'))
);

-- 4. Order items with all FKs
CREATE TABLE order_items (
    order_id INT,
    line_number INT,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    
    PRIMARY KEY (order_id, line_number),
    
    CONSTRAINT fk_items_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE,  -- Delete items when order deleted
    
    CONSTRAINT fk_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE RESTRICT,  -- Don't delete products with order history
    
    CONSTRAINT chk_quantity CHECK (quantity > 0),
    CONSTRAINT chk_unit_price CHECK (unit_price >= 0)
);

-- 5. Reviews with proper FKs
CREATE TABLE reviews (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_reviews_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON DELETE CASCADE,  -- Delete reviews if customer deleted
    
    CONSTRAINT fk_reviews_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE CASCADE,  -- Delete reviews if product deleted
    
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    
    -- One review per customer per product
    CONSTRAINT uk_review_unique UNIQUE (customer_id, product_id)
);
```

</details>

---

### Exercise 3: Constraint Debugging 🔴

**Scenario**: Your team is getting this error when trying to delete a product:

```
ERROR: update or delete on table "products" violates foreign key constraint 
"fk_order_items_product" on table "order_items"
DETAIL: Key (product_id)=(42) is still referenced from table "order_items".
```

**Current Schema:**
```sql
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_discontinued BOOLEAN DEFAULT FALSE
);

CREATE TABLE order_items (
    item_id INT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

**Task**: Design a solution that allows "deleting" products while preserving order history integrity. Consider:
1. Soft delete approach
2. Archive table approach
3. ON DELETE behavior changes
4. Trade-offs of each approach

<details>
<summary>✅ Solution</summary>

### Approach 1: Soft Delete (Recommended)

Never actually delete products; mark them as discontinued:

```sql
-- Add soft delete columns
ALTER TABLE products 
ADD COLUMN is_discontinued BOOLEAN DEFAULT FALSE,
ADD COLUMN discontinued_at TIMESTAMP,
ADD COLUMN discontinued_reason VARCHAR(255);

-- Create view for "active" products
CREATE VIEW active_products AS
SELECT * FROM products WHERE is_discontinued = FALSE;

-- "Delete" becomes an update
UPDATE products 
SET is_discontinued = TRUE, 
    discontinued_at = CURRENT_TIMESTAMP
WHERE product_id = 42;

-- Queries use the view
SELECT * FROM active_products WHERE category_id = 5;
```

**Pros**: Full history preserved, simple, no data loss
**Cons**: Table grows forever, must filter in all queries

### Approach 2: Archive Table

Move deleted products to separate table:

```sql
-- Create archive table (same structure)
CREATE TABLE products_archive (
    product_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    -- ... same columns ...
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_by VARCHAR(100),
    archive_reason VARCHAR(255)
);

-- Modify FK to reference both tables (requires trigger)
-- OR: Store product snapshot in order_items

ALTER TABLE order_items 
ADD COLUMN product_name VARCHAR(100),  -- Snapshot at order time
ADD COLUMN product_price DECIMAL(10,2); -- Price at order time

-- Now order history is self-contained
-- Archive procedure:
INSERT INTO products_archive 
SELECT *, CURRENT_TIMESTAMP, 'admin', 'discontinued'
FROM products WHERE product_id = 42;

DELETE FROM products WHERE product_id = 42;
```

**Pros**: Main table stays clean, archived data separate
**Cons**: More complex queries if needing archived data

### Approach 3: Change FK Behavior

```sql
-- Option A: SET NULL (loses reference but keeps history)
ALTER TABLE order_items 
DROP CONSTRAINT fk_order_items_product;

ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_product 
FOREIGN KEY (product_id) REFERENCES products(product_id)
ON DELETE SET NULL;

-- Problem: product_id becomes NULL, lose product info

-- Better: Store product snapshot before allowing NULL
ALTER TABLE order_items 
ADD COLUMN product_snapshot JSON;  -- Store {name, price, sku} at order time

-- Then SET NULL is acceptable
```

### Approach 4: Hybrid (Best Practice)

Combine soft delete with denormalized snapshots:

```sql
-- Products: soft delete
ALTER TABLE products 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN deleted_at TIMESTAMP;

-- Order items: store snapshot at order time
ALTER TABLE order_items 
ADD COLUMN product_name VARCHAR(100) NOT NULL,
ADD COLUMN product_price DECIMAL(10,2) NOT NULL;

-- FK still exists but product always "exists" (just inactive)
-- Order history has complete information regardless

-- Index for filtering active products
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = TRUE;
```

**Recommendation**: Use soft delete (Approach 1 or 4) for most cases. Archive table for compliance/GDPR requirements where you truly need to remove data.

</details>

---

## Key Takeaways

- 🔑 **Primary keys**: Prefer surrogates, add UNIQUE for natural identifiers
- 🔗 **Foreign keys**: Always define explicitly with appropriate ON DELETE behavior
- ✅ **CHECK constraints**: Enforce domain rules at database level
- 📛 **Name constraints**: `chk_`, `fk_`, `uk_` prefixes make maintenance easier
- ⚠️ **Design for delete**: Soft delete often better than CASCADE for business data

---

## Related Topics

- [Database Design Principles](/databases/01-database-design-principles.md) - Schema design context
- [Normalization](/databases/02-normalization.md) - Why these structures exist
- [Multi-Table Queries](/databases/04-multi-table-queries.md) - Querying related tables
