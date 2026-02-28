# Stored Procedures and Triggers

[← Back to Index](/databases/00-index.md)

---

## Overview

Stored procedures, functions, and triggers allow you to embed business logic directly in the database. They can improve performance, ensure data consistency, and encapsulate complex operations. However, they also move logic away from application code, which has trade-offs.

### When This Matters Most
- Enforcing complex business rules
- Auditing and logging changes
- Reducing round-trips for multi-step operations
- Maintaining derived/computed data

---

## Functions vs Procedures

| Feature | Function | Procedure |
|---------|----------|-----------|
| **Returns** | Value(s) | Nothing (or OUT params) |
| **In SELECT** | ✅ Yes | ❌ No |
| **Transaction control** | ❌ No COMMIT/ROLLBACK | ✅ Can COMMIT/ROLLBACK |
| **Side effects** | Discouraged | Expected |
| **Calling** | `SELECT my_func()` | `CALL my_proc()` |

---

## Functions

### Basic Function Syntax

```sql
-- PostgreSQL: Simple function
CREATE OR REPLACE FUNCTION calculate_tax(price DECIMAL, tax_rate DECIMAL DEFAULT 0.10)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN price * tax_rate;
END;
$$;

-- Usage
SELECT calculate_tax(100.00);  -- Returns 10.00
SELECT calculate_tax(100.00, 0.08);  -- Returns 8.00
SELECT product_name, price, calculate_tax(price) AS tax FROM products;
```

### Function Languages

```sql
-- SQL language (simple, no procedural logic)
CREATE FUNCTION get_order_total(order_id INT)
RETURNS DECIMAL
LANGUAGE SQL
STABLE
AS $$
    SELECT SUM(quantity * unit_price)
    FROM order_items
    WHERE order_id = $1;
$$;

-- PL/pgSQL (procedural, most common)
CREATE FUNCTION get_customer_status(customer_id INT)
RETURNS VARCHAR
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    total_orders INT;
    total_spent DECIMAL;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
    INTO total_orders, total_spent
    FROM orders
    WHERE customer_id = get_customer_status.customer_id;
    
    IF total_spent >= 10000 THEN
        RETURN 'platinum';
    ELSIF total_spent >= 1000 THEN
        RETURN 'gold';
    ELSIF total_orders > 0 THEN
        RETURN 'regular';
    ELSE
        RETURN 'new';
    END IF;
END;
$$;
```

### Returning Multiple Rows

```sql
-- RETURNS TABLE
CREATE FUNCTION get_orders_by_status(status_filter VARCHAR)
RETURNS TABLE (
    order_id INT,
    customer_name VARCHAR,
    total_amount DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, c.name, o.total_amount
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.status = status_filter;
END;
$$;

-- Usage
SELECT * FROM get_orders_by_status('pending');

-- RETURNS SETOF
CREATE FUNCTION search_products(search_term VARCHAR)
RETURNS SETOF products
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM products
    WHERE name ILIKE '%' || search_term || '%';
END;
$$;
```

### Function Volatility

```sql
-- IMMUTABLE: Same inputs always give same output, no side effects
CREATE FUNCTION full_name(first_name VARCHAR, last_name VARCHAR)
RETURNS VARCHAR
IMMUTABLE
LANGUAGE SQL
AS $$
    SELECT first_name || ' ' || last_name;
$$;

-- STABLE: Same inputs give same output within a single query
-- Can read database but not modify
CREATE FUNCTION get_current_price(product_id INT)
RETURNS DECIMAL
STABLE
LANGUAGE SQL
AS $$
    SELECT price FROM products WHERE id = product_id;
$$;

-- VOLATILE: Can return different results, may have side effects (default)
CREATE FUNCTION generate_order_number()
RETURNS VARCHAR
VOLATILE
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'ORD-' || to_char(NOW(), 'YYYYMMDD') || '-' || nextval('order_seq');
END;
$$;
```

---

## Stored Procedures

### Basic Procedure Syntax

```sql
-- PostgreSQL 11+
CREATE OR REPLACE PROCEDURE transfer_funds(
    from_account INT,
    to_account INT,
    amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Debit source account
    UPDATE accounts SET balance = balance - amount WHERE id = from_account;
    
    -- Credit destination account
    UPDATE accounts SET balance = balance + amount WHERE id = to_account;
    
    -- Procedure can commit within itself
    COMMIT;
END;
$$;

-- Call procedure
CALL transfer_funds(1, 2, 100.00);

-- MySQL syntax
DELIMITER //
CREATE PROCEDURE transfer_funds(
    IN from_account INT,
    IN to_account INT,
    IN amount DECIMAL(10,2)
)
BEGIN
    UPDATE accounts SET balance = balance - amount WHERE id = from_account;
    UPDATE accounts SET balance = balance + amount WHERE id = to_account;
END //
DELIMITER ;

CALL transfer_funds(1, 2, 100.00);
```

### Procedures with OUT Parameters

```sql
-- PostgreSQL
CREATE PROCEDURE get_account_balance(
    account_id INT,
    OUT balance DECIMAL,
    OUT status VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT a.balance, a.status
    INTO balance, status
    FROM accounts a
    WHERE a.id = account_id;
END;
$$;

-- Call and capture output
DO $$
DECLARE
    bal DECIMAL;
    stat VARCHAR;
BEGIN
    CALL get_account_balance(1, bal, stat);
    RAISE NOTICE 'Balance: %, Status: %', bal, stat;
END;
$$;
```

---

## Triggers

### Trigger Concepts

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TRIGGER TIMING                                                          │
│                                                                          │
│  BEFORE:                           AFTER:                                │
│  ┌──────────────────┐              ┌──────────────────┐                 │
│  │ Validate/Modify  │              │ Audit, Cascade   │                 │
│  │ Can change NEW   │              │ Cannot change    │                 │
│  │ Can abort        │              │ Already committed│                 │
│  └──────────────────┘              └──────────────────┘                 │
│                                                                          │
│  INSTEAD OF (views only):                                                │
│  ┌──────────────────┐                                                   │
│  │ Custom logic for │                                                   │
│  │ view INSERT/     │                                                   │
│  │ UPDATE/DELETE    │                                                   │
│  └──────────────────┘                                                   │
│                                                                          │
│  FOR EACH ROW:                     FOR EACH STATEMENT:                   │
│  ┌──────────────────┐              ┌──────────────────┐                 │
│  │ Fires per row    │              │ Fires once per   │                 │
│  │ Has OLD/NEW      │              │ statement        │                 │
│  └──────────────────┘              └──────────────────┘                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Creating Triggers

```sql
-- PostgreSQL: Trigger function (returns TRIGGER)
CREATE OR REPLACE FUNCTION update_modified_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.modified_at = NOW();
    RETURN NEW;
END;
$$;

-- Attach trigger to table
CREATE TRIGGER set_modified_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_at();

-- MySQL: Inline trigger body
CREATE TRIGGER set_modified_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    SET NEW.modified_at = NOW();
```

### Audit Trigger

```sql
-- Audit log table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    record_id INT,
    action VARCHAR(20),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Generic audit function
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), current_user);
        RETURN OLD;
    END IF;
END;
$$;

-- Apply to tables
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION audit_changes();

CREATE TRIGGER audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION audit_changes();
```

### Validation Trigger

```sql
-- Validate before insert/update
CREATE OR REPLACE FUNCTION validate_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check order total is positive
    IF NEW.total_amount <= 0 THEN
        RAISE EXCEPTION 'Order total must be positive';
    END IF;
    
    -- Check customer exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM customers 
        WHERE id = NEW.customer_id AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Customer not found or inactive';
    END IF;
    
    -- Set defaults
    NEW.status := COALESCE(NEW.status, 'pending');
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_order_trigger
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION validate_order();
```

### Maintaining Aggregates

```sql
-- Maintain denormalized order count on customer
ALTER TABLE customers ADD COLUMN order_count INT DEFAULT 0;

CREATE OR REPLACE FUNCTION update_customer_order_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE customers SET order_count = order_count + 1 WHERE id = NEW.customer_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE customers SET order_count = order_count - 1 WHERE id = OLD.customer_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.customer_id != NEW.customer_id THEN
        UPDATE customers SET order_count = order_count - 1 WHERE id = OLD.customer_id;
        UPDATE customers SET order_count = order_count + 1 WHERE id = NEW.customer_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER order_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_order_count();
```

---

## Conditional Triggers

```sql
-- PostgreSQL: WHEN clause
CREATE TRIGGER log_price_changes
    AFTER UPDATE ON products
    FOR EACH ROW
    WHEN (OLD.price IS DISTINCT FROM NEW.price)  -- Only when price changes
    EXECUTE FUNCTION log_price_change();

-- PostgreSQL: UPDATE OF specific columns
CREATE TRIGGER update_search_vector
    BEFORE UPDATE OF name, description ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_search();
```

---

## Error Handling

```sql
-- PostgreSQL exception handling
CREATE OR REPLACE FUNCTION safe_transfer(
    from_id INT,
    to_id INT,
    amount DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Attempt transfer
    UPDATE accounts SET balance = balance - amount WHERE id = from_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source account not found';
    END IF;
    
    UPDATE accounts SET balance = balance + amount WHERE id = to_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination account not found';
    END IF;
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        INSERT INTO error_log (message, detail)
        VALUES (SQLERRM, SQLSTATE);
        
        -- Re-raise or return failure
        RETURN FALSE;
END;
$$;

-- Specific exception handling
CREATE OR REPLACE FUNCTION divide_safe(a DECIMAL, b DECIMAL)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN a / b;
EXCEPTION
    WHEN division_by_zero THEN
        RETURN NULL;
    WHEN numeric_value_out_of_range THEN
        RAISE NOTICE 'Result out of range';
        RETURN NULL;
END;
$$;
```

---

## Managing Triggers

```sql
-- View triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Disable trigger temporarily
ALTER TABLE products DISABLE TRIGGER set_modified_at;

-- Re-enable
ALTER TABLE products ENABLE TRIGGER set_modified_at;

-- Disable ALL triggers on table
ALTER TABLE products DISABLE TRIGGER ALL;

-- Drop trigger
DROP TRIGGER set_modified_at ON products;

-- Drop function (CASCADE drops dependent triggers)
DROP FUNCTION update_modified_at() CASCADE;
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Use for data integrity**: Enforce rules that span tables
- **Audit changes**: Automatic, unforgettable logging
- **Maintain derived data**: Counters, aggregates, search vectors
- **Set defaults/timestamps**: Consistent across all entry points
- **Keep triggers simple**: Complex logic is hard to debug

### ❌ Avoid:
- **Business logic in triggers**: Hard to maintain and test
- **Triggers that call triggers**: Cascade confusion
- **Heavy processing in triggers**: Slows all DML
- **Ignoring in bulk operations**: May need to disable for imports
- **Hidden side effects**: Document what triggers exist

---

## Exercises

### Exercise 1: Auto-Timestamp 🟢

Create a trigger that automatically sets:
- `created_at` on INSERT (if not provided)
- `updated_at` on UPDATE

Test with a `notes` table.

<details>
<summary>✅ Solution</summary>

```sql
-- Create table
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Trigger function
CREATE OR REPLACE FUNCTION set_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set created_at on insert if not provided
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := COALESCE(NEW.created_at, NOW());
        NEW.updated_at := NEW.created_at;
    END IF;
    
    -- Always update updated_at on update
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER notes_timestamps
    BEFORE INSERT OR UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION set_timestamps();

-- Test
INSERT INTO notes (title, content) VALUES ('Test Note', 'Content here');
SELECT * FROM notes;  -- created_at and updated_at set

UPDATE notes SET content = 'Updated content' WHERE id = 1;
SELECT * FROM notes;  -- updated_at changed, created_at unchanged
```

</details>

---

### Exercise 2: Inventory Tracking 🟡

Create a system that:
1. Tracks product inventory levels
2. Logs all inventory changes
3. Prevents negative inventory

<details>
<summary>✅ Solution</summary>

```sql
-- Inventory table
CREATE TABLE inventory (
    product_id INT PRIMARY KEY REFERENCES products(id),
    quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Inventory change log
CREATE TABLE inventory_log (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    change_amount INT NOT NULL,  -- Positive or negative
    reason VARCHAR(100),
    old_quantity INT,
    new_quantity INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Function to adjust inventory
CREATE OR REPLACE FUNCTION adjust_inventory(
    p_product_id INT,
    p_change INT,
    p_reason VARCHAR
)
RETURNS INT  -- Returns new quantity
LANGUAGE plpgsql
AS $$
DECLARE
    old_qty INT;
    new_qty INT;
BEGIN
    -- Get current quantity with lock
    SELECT quantity INTO old_qty
    FROM inventory
    WHERE product_id = p_product_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not in inventory', p_product_id;
    END IF;
    
    new_qty := old_qty + p_change;
    
    -- Prevent negative inventory
    IF new_qty < 0 THEN
        RAISE EXCEPTION 'Insufficient inventory. Available: %, Requested: %', old_qty, -p_change;
    END IF;
    
    -- Update inventory
    UPDATE inventory
    SET quantity = new_qty, last_updated = NOW()
    WHERE product_id = p_product_id;
    
    -- Log the change
    INSERT INTO inventory_log (product_id, change_amount, reason, old_quantity, new_quantity)
    VALUES (p_product_id, p_change, p_reason, old_qty, new_qty);
    
    RETURN new_qty;
END;
$$;

-- Trigger to auto-adjust on order_items insert
CREATE OR REPLACE FUNCTION order_item_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM adjust_inventory(
            NEW.product_id, 
            -NEW.quantity, 
            'Order #' || NEW.order_id
        );
    ELSIF TG_OP = 'DELETE' THEN
        -- Restore inventory on order cancellation
        PERFORM adjust_inventory(
            OLD.product_id, 
            OLD.quantity, 
            'Cancelled Order #' || OLD.order_id
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER order_item_inventory_trigger
    AFTER INSERT OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION order_item_inventory();

-- Test
INSERT INTO inventory (product_id, quantity) VALUES (1, 100);
SELECT adjust_inventory(1, -10, 'Manual adjustment');  -- Returns 90
SELECT adjust_inventory(1, -95, 'Test');  -- ERROR: Insufficient inventory
SELECT * FROM inventory_log WHERE product_id = 1;
```

</details>

---

### Exercise 3: Order Total Calculation 🔴

**Scenario:** Create a system where:
1. Order total is automatically calculated from line items
2. Discounts and taxes are applied
3. Changes to line items automatically update order total
4. Order status changes are logged

<details>
<summary>✅ Solution</summary>

```sql
-- Tables
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0.10,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id),
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE order_status_log (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Function to recalculate order totals
CREATE OR REPLACE FUNCTION recalculate_order(p_order_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_subtotal DECIMAL(10,2);
    v_discount_pct DECIMAL(5,2);
    v_tax_rate DECIMAL(5,2);
    v_discount_amt DECIMAL(10,2);
    v_tax_amt DECIMAL(10,2);
    v_total DECIMAL(10,2);
BEGIN
    -- Get order settings
    SELECT discount_percent, tax_rate
    INTO v_discount_pct, v_tax_rate
    FROM orders WHERE id = p_order_id;
    
    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_subtotal
    FROM order_items WHERE order_id = p_order_id;
    
    -- Calculate discount
    v_discount_amt := v_subtotal * (v_discount_pct / 100);
    
    -- Calculate tax on discounted amount
    v_tax_amt := (v_subtotal - v_discount_amt) * v_tax_rate;
    
    -- Calculate total
    v_total := v_subtotal - v_discount_amt + v_tax_amt;
    
    -- Update order
    UPDATE orders
    SET subtotal = v_subtotal,
        discount_amount = v_discount_amt,
        tax_amount = v_tax_amt,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = p_order_id;
END;
$$;

-- Trigger for order item changes
CREATE OR REPLACE FUNCTION order_items_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Recalculate the affected order
    PERFORM recalculate_order(COALESCE(NEW.order_id, OLD.order_id));
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER recalc_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION order_items_changed();

-- Trigger for discount/tax rate changes
CREATE OR REPLACE FUNCTION order_rates_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.discount_percent != NEW.discount_percent 
       OR OLD.tax_rate != NEW.tax_rate THEN
        PERFORM recalculate_order(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER recalc_on_rate_change
    AFTER UPDATE OF discount_percent, tax_rate ON orders
    FOR EACH ROW
    EXECUTE FUNCTION order_rates_changed();

-- Trigger for status logging
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_log (order_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER log_order_status
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_status_change();

-- Test
INSERT INTO orders (customer_id, discount_percent, tax_rate) 
VALUES (1, 10, 0.08) RETURNING id;  -- id = 1

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (1, 1, 2, 100.00);  -- Line total = 200

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (1, 2, 3, 50.00);   -- Line total = 150

SELECT * FROM orders WHERE id = 1;
-- subtotal = 350
-- discount_amount = 35 (10%)
-- tax_amount = 25.20 (8% of 315)
-- total_amount = 340.20

UPDATE orders SET status = 'processing' WHERE id = 1;
UPDATE orders SET status = 'shipped' WHERE id = 1;

SELECT * FROM order_status_log WHERE order_id = 1;
```

</details>

---

## Key Takeaways

- ⚙️ **Functions**: Reusable calculations, can be used in SELECT
- 🔧 **Procedures**: Multi-step operations with transaction control
- 🎯 **Triggers**: Automatic reactions to data changes
- ⏰ **BEFORE triggers**: Validate/modify data before save
- 📝 **AFTER triggers**: Audit/cascade after commit
- ⚠️ **Be cautious**: Hidden logic is hard to debug and maintain

---

## Related Topics

- [Transactions and ACID](/databases/11-transactions-and-acid.md) - Transaction control in procedures
- [Security and Access Control](/databases/19-security-and-access-control.md) - Function permissions
- [Performance Tuning](/databases/10-performance-tuning.md) - Trigger performance impact
