# Migrations and Schema Versioning

[← Back to Index](/databases/00-index.md)

---

## Overview

As applications evolve, database schemas must change too. Migrations provide a controlled, versioned approach to schema changes—enabling reproducible deployments, team collaboration, and rollback capabilities. This chapter covers migration strategies, tools, and zero-downtime techniques.

### When This Matters Most
- Team collaboration on schema changes
- CI/CD pipelines for database changes
- Zero-downtime deployments
- Audit trail for schema evolution

---

## Migration Fundamentals

### What is a Migration?

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MIGRATION = Schema Change + Version                                     │
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   V001      │───►│   V002      │───►│   V003      │                 │
│  │ Create      │    │ Add column  │    │ Create      │                 │
│  │ users table │    │ email       │    │ orders      │                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│        │                  │                  │                          │
│        ▼                  ▼                  ▼                          │
│  ┌─────────────────────────────────────────────────┐                   │
│  │ schema_migrations                                │                   │
│  │ ├── version: 001, applied_at: 2024-01-01        │                   │
│  │ ├── version: 002, applied_at: 2024-01-15        │                   │
│  │ └── version: 003, applied_at: 2024-02-01        │                   │
│  └─────────────────────────────────────────────────┘                   │
│                                                                          │
│  Each environment tracks which migrations have been applied              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Migration File Structure

```
migrations/
├── 001_create_users_table.sql
├── 001_create_users_table.down.sql     (rollback)
├── 002_add_email_to_users.sql
├── 002_add_email_to_users.down.sql
├── 003_create_orders_table.sql
├── 003_create_orders_table.down.sql
└── ...
```

### Migration Tracking Table

```sql
-- Standard schema for tracking applied migrations
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW(),
    execution_time_ms INT,
    checksum VARCHAR(64)  -- Optional: detect modified migrations
);
```

---

## Migration Tools

### Popular Migration Tools

| Tool | Language | Databases |
|------|----------|-----------|
| **Flyway** | Java/CLI | PostgreSQL, MySQL, etc. |
| **Liquibase** | Java/CLI | All major databases |
| **Alembic** | Python | SQLAlchemy-based |
| **golang-migrate** | Go/CLI | PostgreSQL, MySQL, etc. |
| **Knex.js** | JavaScript | PostgreSQL, MySQL, SQLite |
| **Prisma** | TypeScript | PostgreSQL, MySQL, SQLite |
| **Rails Migrations** | Ruby | ActiveRecord |
| **Django Migrations** | Python | Django ORM |

### Flyway Example

```bash
# Directory structure
migrations/
├── V1__Create_users_table.sql
├── V2__Add_email_column.sql
└── V3__Create_orders_table.sql

# V1__Create_users_table.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

# Run migrations
flyway -url=jdbc:postgresql://localhost/mydb migrate

# Check status
flyway info
```

### golang-migrate Example

```bash
# Create migration
migrate create -ext sql -dir ./migrations -seq create_users_table

# Generates:
# 000001_create_users_table.up.sql
# 000001_create_users_table.down.sql

# Run migrations
migrate -database "postgres://user:pass@localhost/db?sslmode=disable" \
        -path ./migrations up

# Rollback one migration
migrate -database "..." -path ./migrations down 1

# Force version (for fixing stuck migrations)
migrate -database "..." -path ./migrations force 2
```

---

## Writing Safe Migrations

### Atomic Migrations

```sql
-- PostgreSQL: Wrap in transaction (automatic with some tools)
BEGIN;

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id),
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);

COMMIT;
```

### Idempotent Migrations

```sql
-- Safe to run multiple times
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

-- Add column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(255);
    END IF;
END $$;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### Rollback Migrations

```sql
-- Up migration: 002_add_email.up.sql
ALTER TABLE users ADD COLUMN email VARCHAR(255);
CREATE INDEX idx_users_email ON users(email);

-- Down migration: 002_add_email.down.sql
DROP INDEX IF EXISTS idx_users_email;
ALTER TABLE users DROP COLUMN IF EXISTS email;
```

---

## Zero-Downtime Migrations

### Expand-Contract Pattern

```
┌─────────────────────────────────────────────────────────────────────────┐
│  EXPAND-CONTRACT for Column Rename                                       │
│                                                                          │
│  Step 1: EXPAND - Add new column                                         │
│  ┌───────────────────────────────┐                                      │
│  │ users                         │                                      │
│  │ ├── id                        │                                      │
│  │ ├── name (old)               │                                      │
│  │ └── full_name (new, nullable) │  ← Add new column                   │
│  └───────────────────────────────┘                                      │
│                                                                          │
│  Step 2: MIGRATE - Copy data                                             │
│  UPDATE users SET full_name = name WHERE full_name IS NULL;             │
│  (Application writes to BOTH columns)                                    │
│                                                                          │
│  Step 3: SWITCH - Application uses new column only                       │
│                                                                          │
│  Step 4: CONTRACT - Remove old column                                    │
│  ┌───────────────────────────────┐                                      │
│  │ users                         │                                      │
│  │ ├── id                        │                                      │
│  │ └── full_name (NOT NULL)      │  ← Old column removed               │
│  └───────────────────────────────┘                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Safe Column Operations

```sql
-- ✅ Safe: Add nullable column
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- ⚠️ Unsafe: Add NOT NULL without default (locks table)
ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL;

-- ✅ Safe: Add NOT NULL with default
ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT '';

-- ✅ PostgreSQL 11+: Non-blocking default
ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
-- Writes default to metadata, not every row

-- ⚠️ Unsafe: Drop column while in use
ALTER TABLE users DROP COLUMN old_field;

-- ✅ Safe: Application stops using column, THEN drop
-- 1. Deploy app that doesn't use old_field
-- 2. Wait for all instances to update
-- 3. ALTER TABLE users DROP COLUMN old_field;
```

### Safe Index Creation

```sql
-- ⚠️ Unsafe: Blocks writes during creation
CREATE INDEX idx_orders_date ON orders(created_at);

-- ✅ Safe: Concurrent index creation
CREATE INDEX CONCURRENTLY idx_orders_date ON orders(created_at);

-- Note: CONCURRENTLY can't be in a transaction
-- Slower, but doesn't lock the table

-- MySQL: Online DDL
ALTER TABLE orders ADD INDEX idx_orders_date (created_at), ALGORITHM=INPLACE, LOCK=NONE;
```

### Backfilling Data Safely

```sql
-- ⚠️ Unsafe: One massive update
UPDATE users SET full_name = name;  -- Locks all rows

-- ✅ Safe: Batch updates
DO $$
DECLARE
    batch_size INT := 10000;
    total_updated INT := 0;
    rows_affected INT;
BEGIN
    LOOP
        UPDATE users
        SET full_name = name
        WHERE id IN (
            SELECT id FROM users
            WHERE full_name IS NULL
            LIMIT batch_size
        );
        
        GET DIAGNOSTICS rows_affected = ROW_COUNT;
        total_updated := total_updated + rows_affected;
        
        RAISE NOTICE 'Updated % rows (total: %)', rows_affected, total_updated;
        
        EXIT WHEN rows_affected = 0;
        
        -- Optional: Throttle to reduce impact
        PERFORM pg_sleep(0.1);
        
        COMMIT;  -- Release locks between batches
    END LOOP;
END $$;
```

---

## Migration Workflows

### Feature Branch Workflow

```
main branch:        V001 ─── V002 ─── V003 ─────────────── V004
                                  ╲                      ╱
feature branch:                    ─── V003_feature ────

When merging:
1. Rebase/merge feature branch
2. Renumber migration if needed: V003_feature → V004
3. Ensure migration applies cleanly to production state
```

### Pull Request Checklist

```markdown
## Migration Checklist

- [ ] Migration is idempotent (can run twice)
- [ ] Rollback migration tested
- [ ] Large tables: uses batching or CONCURRENTLY
- [ ] No breaking changes to live application
- [ ] Index creation uses CONCURRENTLY
- [ ] Migration reviewed by DBA (if significant)
- [ ] Tested on production-like dataset
```

### CI/CD Integration

```yaml
# GitHub Actions example
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run migrations on staging
        run: |
          flyway -url=${{ secrets.STAGING_DB_URL }} migrate
      
      - name: Run integration tests
        run: npm test
      
      - name: Run migrations on production
        if: success()
        run: |
          flyway -url=${{ secrets.PROD_DB_URL }} migrate
```

---

## Handling Breaking Changes

### Adding NOT NULL Column

```sql
-- Step 1: Add nullable column
ALTER TABLE orders ADD COLUMN status VARCHAR(20);

-- Step 2: Backfill (application or migration)
UPDATE orders SET status = 'completed' WHERE status IS NULL AND shipped_at IS NOT NULL;
UPDATE orders SET status = 'pending' WHERE status IS NULL;

-- Step 3: Add constraint
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;

-- Or in one migration with PostgreSQL:
ALTER TABLE orders ADD COLUMN status VARCHAR(20) DEFAULT 'pending' NOT NULL;
```

### Renaming Tables/Columns

```sql
-- Unsafe: Direct rename breaks application
ALTER TABLE customers RENAME TO clients;

-- Safe: View for backward compatibility
-- Step 1: Rename table
ALTER TABLE customers RENAME TO clients;

-- Step 2: Create backward-compatible view
CREATE VIEW customers AS SELECT * FROM clients;

-- Step 3: Update application to use 'clients'
-- Step 4: Drop view after all apps updated
DROP VIEW customers;
```

### Splitting Tables

```sql
-- Original: users table has address columns
-- Goal: Extract addresses to separate table

-- Step 1: Create new table
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id),
    street VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20)
);

-- Step 2: Copy data
INSERT INTO addresses (user_id, street, city, postal_code)
SELECT id, street, city, postal_code FROM users;

-- Step 3: Application uses new table
-- Step 4: Drop old columns
ALTER TABLE users 
    DROP COLUMN street,
    DROP COLUMN city,
    DROP COLUMN postal_code;
```

---

## Schema Diffing

### Comparing Schemas

```bash
# PostgreSQL: pg_dump schema only
pg_dump --schema-only production_db > prod_schema.sql
pg_dump --schema-only staging_db > staging_schema.sql
diff prod_schema.sql staging_schema.sql

# Tools for visual diff
# - pgAdmin schema compare
# - DataGrip schema diff
# - Liquibase diff command
```

### Generating Migrations from Diff

```bash
# Liquibase: Generate changelog from database
liquibase --url=jdbc:postgresql://localhost/prod_db \
          --referenceUrl=jdbc:postgresql://localhost/dev_db \
          diffChangeLog

# Prisma: Generate migration from schema changes
npx prisma migrate dev --name add_email_column
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Version everything**: Every schema change is a migration
- **Test migrations locally**: Use production-like data
- **Write rollback scripts**: Even if you rarely use them
- **Use CONCURRENTLY**: For index creation on large tables
- **Batch large updates**: Avoid locking entire tables
- **Review migrations**: Part of code review process

### ❌ Avoid:
- **Direct production changes**: Always go through migrations
- **Editing applied migrations**: Create new migration instead
- **Assuming empty tables**: Migrations run on production data
- **Skipping environments**: Dev → Staging → Production
- **Long-running locks**: Use expand-contract pattern

---

## Exercises

### Exercise 1: Basic Migration 🟢

Write migrations (up and down) to:
1. Create a `products` table with id, name, price
2. Add a `description` column
3. Add an index on name

<details>
<summary>✅ Solution</summary>

```sql
-- 001_create_products.up.sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 001_create_products.down.sql
DROP TABLE IF EXISTS products;

-- 002_add_product_description.up.sql
ALTER TABLE products ADD COLUMN description TEXT;

-- 002_add_product_description.down.sql
ALTER TABLE products DROP COLUMN IF EXISTS description;

-- 003_add_products_name_index.up.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name 
ON products(name);

-- 003_add_products_name_index.down.sql
DROP INDEX CONCURRENTLY IF EXISTS idx_products_name;
```

</details>

---

### Exercise 2: Zero-Downtime Column Rename 🟡

Rename `users.name` to `users.full_name` without downtime.

Write the sequence of migrations and deployment steps.

<details>
<summary>✅ Solution</summary>

**Phase 1: Add new column**

```sql
-- Migration 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Copy existing data
UPDATE users SET full_name = name WHERE full_name IS NULL;
```

**Phase 2: Dual-write (Application change)**

```python
# Application writes to BOTH columns
def update_user_name(user_id, new_name):
    db.execute("""
        UPDATE users 
        SET name = %s, full_name = %s 
        WHERE id = %s
    """, new_name, new_name, user_id)
```

**Phase 3: Switch to new column (Application change)**

```python
# Application reads from new column
def get_user(user_id):
    return db.execute("""
        SELECT id, full_name AS name FROM users WHERE id = %s
    """, user_id)

# Application writes only to new column
def update_user_name(user_id, new_name):
    db.execute("""
        UPDATE users SET full_name = %s WHERE id = %s
    """, new_name, user_id)
```

**Phase 4: Drop old column**

```sql
-- Migration 2: Make new column NOT NULL (after backfill)
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- Migration 3: Drop old column (after all apps deployed)
ALTER TABLE users DROP COLUMN name;
```

**Deployment Sequence:**
1. Deploy Migration 1
2. Deploy application with dual-write
3. Verify data consistency
4. Deploy application reading from `full_name`
5. Deploy application writing only to `full_name`
6. Deploy Migration 2 & 3

</details>

---

### Exercise 3: Large Table Migration 🔴

**Scenario:** You need to add a `status` column to an `orders` table with 100 million rows. The column should:
- Be NOT NULL
- Default to 'pending' for existing rows
- Be indexed

Write safe migrations that won't lock the table.

<details>
<summary>✅ Solution</summary>

```sql
-- Migration 1: Add nullable column (instant in PostgreSQL 11+)
-- This is metadata-only, doesn't touch rows
ALTER TABLE orders ADD COLUMN status VARCHAR(20);

-- Migration 2: Add default for new rows
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';

-- Migration 3: Backfill existing rows in batches
-- Run this as a separate script or background job

DO $$
DECLARE
    batch_size INT := 50000;
    last_id BIGINT := 0;
    max_id BIGINT;
    affected INT;
BEGIN
    SELECT MAX(id) INTO max_id FROM orders;
    
    WHILE last_id &lt; max_id LOOP
        UPDATE orders
        SET status = CASE 
            WHEN shipped_at IS NOT NULL THEN 'shipped'
            WHEN cancelled_at IS NOT NULL THEN 'cancelled'
            ELSE 'pending'
        END
        WHERE id > last_id 
          AND id &lt;= last_id + batch_size
          AND status IS NULL;
        
        GET DIAGNOSTICS affected = ROW_COUNT;
        last_id := last_id + batch_size;
        
        RAISE NOTICE 'Processed up to ID %, updated % rows', last_id, affected;
        
        -- Commit to release locks
        COMMIT;
        
        -- Brief pause to reduce impact
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;

-- Migration 4: Add NOT NULL constraint
-- Only after backfill is complete
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;

-- Migration 5: Create index concurrently
-- Run outside transaction (CONCURRENTLY can't be in transaction)
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);

-- Verify index creation succeeded
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'orders';
```

**Alternative: Constraint-based approach**

```sql
-- Add constraint instead of ALTER COLUMN NOT NULL
-- Validates existing rows without full table lock
ALTER TABLE orders 
ADD CONSTRAINT orders_status_not_null 
CHECK (status IS NOT NULL) NOT VALID;

-- Then validate in background
ALTER TABLE orders 
VALIDATE CONSTRAINT orders_status_not_null;
```

**Monitoring Script:**

```sql
-- Check backfill progress
SELECT 
    COUNT(*) FILTER (WHERE status IS NOT NULL) AS filled,
    COUNT(*) FILTER (WHERE status IS NULL) AS remaining,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status IS NOT NULL) / COUNT(*), 2) AS pct_complete
FROM orders;
```

</details>

---

## Key Takeaways

- 📝 **Version everything**: Migrations = version control for schema
- 🔄 **Always have rollback**: Down migrations for safety
- ⚡ **Zero-downtime**: Expand-contract pattern for safe changes
- 🔨 **CONCURRENTLY**: For index operations on live systems
- 📊 **Batch large changes**: Avoid locking millions of rows
- 🔍 **Test with real data**: Production-like datasets catch issues

---

## Related Topics

- [Database Design Principles](/databases/01-database-design-principles.md) - Initial schema design
- [Performance Tuning](/databases/10-performance-tuning.md) - Index strategies
- [Locking and Concurrency](/databases/12-locking-and-concurrency.md) - Understanding locks
