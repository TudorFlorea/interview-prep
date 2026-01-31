# Security and Access Control

[← Back to Index](00-index.md)

---

## Overview

Database security is a critical layer of defense. Proper access control prevents unauthorized data access, limits damage from application vulnerabilities, and ensures compliance with regulations. This chapter covers authentication, authorization, row-level security, and encryption.

### When This Matters Most
- Multi-tenant applications
- Compliance requirements (GDPR, HIPAA, SOC2)
- Defense in depth
- Preventing SQL injection damage

---

## Roles and Users

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ROLE HIERARCHY                                                          │
│                                                                          │
│                    ┌─────────────────┐                                   │
│                    │   superuser     │                                   │
│                    │   (postgres)    │                                   │
│                    └────────┬────────┘                                   │
│                             │                                            │
│           ┌─────────────────┼─────────────────┐                          │
│           ▼                 ▼                 ▼                          │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│    │   db_admin   │  │   app_role   │  │   readonly   │                 │
│    │  (CREATE,    │  │ (CRUD on     │  │  (SELECT     │                 │
│    │   DROP, etc) │  │  app tables) │  │   only)      │                 │
│    └──────────────┘  └──────┬───────┘  └──────────────┘                 │
│                             │                                            │
│              ┌──────────────┼──────────────┐                             │
│              ▼              ▼              ▼                             │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐                        │
│       │  api_1   │   │  api_2   │   │ worker_1 │                        │
│       │ (webapp) │   │ (mobile) │   │  (jobs)  │                        │
│       └──────────┘   └──────────┘   └──────────┘                        │
│                                                                          │
│  Users inherit permissions from roles they belong to                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Creating Roles and Users

```sql
-- PostgreSQL: Create role (group)
CREATE ROLE app_role;
GRANT CONNECT ON DATABASE mydb TO app_role;
GRANT USAGE ON SCHEMA public TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;

-- Create user (login role) inheriting from app_role
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';
GRANT app_role TO app_user;

-- Read-only role
CREATE ROLE readonly;
GRANT CONNECT ON DATABASE mydb TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- Create readonly user
CREATE ROLE analyst WITH LOGIN PASSWORD 'another_password';
GRANT readonly TO analyst;

-- MySQL: Similar concepts
CREATE USER 'app_user'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_user'@'%';
```

### Privilege Types

| Privilege | Tables | Sequences | Functions | Schemas |
|-----------|--------|-----------|-----------|---------|
| **SELECT** | Read rows | Get currval | - | - |
| **INSERT** | Add rows | - | - | - |
| **UPDATE** | Modify rows | - | - | - |
| **DELETE** | Remove rows | - | - | - |
| **TRUNCATE** | Remove all | - | - | - |
| **REFERENCES** | Create FK | - | - | - |
| **TRIGGER** | Create trigger | - | - | - |
| **USAGE** | - | Use nextval | - | Access |
| **EXECUTE** | - | - | Call | - |
| **CREATE** | - | - | - | Create objects |

---

## Column-Level Permissions

```sql
-- Grant access to specific columns only
GRANT SELECT (id, name, email) ON customers TO support_role;
-- support_role cannot see: phone, address, payment_info

-- Grant update on specific columns
GRANT UPDATE (status, notes) ON orders TO support_role;
-- support_role cannot update: total_amount, customer_id

-- Revoke from all, grant specific
REVOKE ALL ON customers FROM public;
GRANT SELECT (id, name) ON customers TO public;
GRANT SELECT, UPDATE ON customers TO app_role;
```

---

## Row-Level Security (RLS)

### Enabling RLS

```sql
-- Enable RLS on table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (optional)
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Without policies, no rows visible (deny by default)
SELECT * FROM orders;  -- Returns nothing
```

### Creating Policies

```sql
-- Policy: Users see only their own orders
CREATE POLICY user_orders ON orders
    FOR ALL  -- SELECT, INSERT, UPDATE, DELETE
    TO app_role
    USING (customer_id = current_setting('app.current_user_id')::int);

-- Set user context (from application)
SET app.current_user_id = '123';
SELECT * FROM orders;  -- Only customer 123's orders

-- Separate policies for different operations
CREATE POLICY orders_select ON orders
    FOR SELECT
    TO app_role
    USING (customer_id = current_setting('app.current_user_id')::int);

CREATE POLICY orders_insert ON orders
    FOR INSERT
    TO app_role
    WITH CHECK (customer_id = current_setting('app.current_user_id')::int);

CREATE POLICY orders_update ON orders
    FOR UPDATE
    TO app_role
    USING (customer_id = current_setting('app.current_user_id')::int)
    WITH CHECK (customer_id = current_setting('app.current_user_id')::int);
```

### Multi-Tenant RLS

```sql
-- Tenant isolation
CREATE POLICY tenant_isolation ON all_tables
    USING (tenant_id = current_setting('app.tenant_id')::int);

-- Application sets tenant on connection
SET app.tenant_id = '42';
-- All queries now automatically filtered by tenant

-- Admin bypass policy
CREATE POLICY admin_full_access ON orders
    FOR ALL
    TO admin_role
    USING (true);  -- No filter
```

### RLS with Multiple Conditions

```sql
-- Complex policy: Users see their orders OR orders they're assigned to support
CREATE POLICY order_visibility ON orders
    FOR SELECT
    USING (
        customer_id = current_setting('app.user_id')::int
        OR assigned_agent_id = current_setting('app.user_id')::int
        OR current_setting('app.is_admin')::boolean = true
    );

-- Policy based on role
CREATE POLICY role_based_access ON sensitive_data
    FOR SELECT
    USING (
        CASE current_setting('app.role')
            WHEN 'admin' THEN true
            WHEN 'manager' THEN department = current_setting('app.department')
            WHEN 'employee' THEN owner_id = current_setting('app.user_id')::int
            ELSE false
        END
    );
```

---

## Security Functions

### SECURITY DEFINER vs SECURITY INVOKER

```sql
-- SECURITY INVOKER (default): Runs with caller's permissions
CREATE FUNCTION get_my_orders()
RETURNS SETOF orders
SECURITY INVOKER
AS $$
    SELECT * FROM orders;  -- Respects RLS policies
$$ LANGUAGE sql;

-- SECURITY DEFINER: Runs with function owner's permissions
CREATE FUNCTION get_order_summary(order_id INT)
RETURNS TABLE (id INT, total DECIMAL)
SECURITY DEFINER
AS $$
    -- Bypasses RLS, runs as function owner
    SELECT id, total_amount FROM orders WHERE id = order_id;
$$ LANGUAGE sql;

-- Best practice: Set search_path for SECURITY DEFINER
CREATE FUNCTION sensitive_operation()
RETURNS VOID
SECURITY DEFINER
SET search_path = public, pg_temp  -- Prevent search path attacks
AS $$
BEGIN
    -- Function body
END;
$$ LANGUAGE plpgsql;
```

---

## Encryption

### Encryption at Rest

```sql
-- PostgreSQL: pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt data with a key
INSERT INTO users (email, ssn_encrypted)
VALUES (
    'user@example.com',
    pgp_sym_encrypt('123-45-6789', 'encryption_key')
);

-- Decrypt data
SELECT email, pgp_sym_decrypt(ssn_encrypted, 'encryption_key') AS ssn
FROM users WHERE id = 1;

-- Hash passwords (one-way)
INSERT INTO users (email, password_hash)
VALUES ('user@example.com', crypt('user_password', gen_salt('bf')));

-- Verify password
SELECT * FROM users 
WHERE email = 'user@example.com' 
  AND password_hash = crypt('user_password', password_hash);
```

### Encryption in Transit

```sql
-- PostgreSQL: Require SSL connections
-- In pg_hba.conf:
-- hostssl all all 0.0.0.0/0 md5

-- Check if connection is encrypted
SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid();

-- Force SSL in connection string
-- postgresql://user:pass@host:5432/db?sslmode=require
```

---

## SQL Injection Prevention

### Parameterized Queries

```python
# ❌ NEVER: String concatenation
user_input = "'; DROP TABLE users; --"
query = f"SELECT * FROM users WHERE id = {user_input}"  # SQL INJECTION!

# ✅ ALWAYS: Parameterized queries
cursor.execute("SELECT * FROM users WHERE id = %s", (user_input,))

# ✅ With named parameters
cursor.execute(
    "SELECT * FROM users WHERE email = %(email)s AND status = %(status)s",
    {"email": email, "status": "active"}
)
```

### Database-Side Defense

```sql
-- Minimal privileges
GRANT SELECT ON users TO app_role;
-- Even if injected, can't DROP or DELETE

-- Don't use superuser for applications
-- Create dedicated app user with minimal permissions

-- Stored procedures for sensitive operations
CREATE FUNCTION transfer_funds(from_id INT, to_id INT, amount DECIMAL)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    -- Validated, type-safe parameters
    UPDATE accounts SET balance = balance - amount WHERE id = from_id;
    UPDATE accounts SET balance = balance + amount WHERE id = to_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Audit Logging

### Connection Logging

```sql
-- PostgreSQL: Log all connections
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Log all statements
ALTER SYSTEM SET log_statement = 'all';  -- 'none', 'ddl', 'mod', 'all'

-- Log slow queries
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- ms
```

### Query-Level Audit

```sql
-- pgAudit extension for detailed auditing
CREATE EXTENSION pgaudit;

-- Log all reads and writes
SET pgaudit.log = 'read, write';

-- Log specific tables
SET pgaudit.log_relation = on;

-- Audit log example output:
-- AUDIT: SESSION,1,1,READ,SELECT,TABLE,public.users,"SELECT * FROM users WHERE id = 5"
```

### Application-Level Audit

```sql
-- Audit table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(20),
    table_name VARCHAR(100),
    record_id INT,
    user_id INT,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to capture changes
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (action, table_name, record_id, user_id, old_data, new_data, ip_address)
    VALUES (
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        current_setting('app.user_id', true)::int,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END,
        current_setting('app.client_ip', true)::inet
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Principle of least privilege**: Grant minimum necessary permissions
- **Use roles for groups**: Easier to manage than per-user grants
- **Enable RLS for multi-tenant**: Defense in depth
- **Encrypt sensitive data**: PII, credentials, financial info
- **Audit everything important**: Compliance and forensics

### ❌ Avoid:
- **Using superuser for apps**: Too much power
- **Storing passwords in plain text**: Always hash
- **Trusting application layer only**: Database is last line of defense
- **Overly permissive SECURITY DEFINER**: Can bypass all checks
- **Disabling SSL**: Data in transit is vulnerable

---

## Exercises

### Exercise 1: Role Setup 🟢

Create a role hierarchy for an e-commerce app:
1. `app_admin`: Full access
2. `app_user`: CRUD on orders, SELECT on products
3. `app_readonly`: SELECT only on products and orders

<details>
<summary>✅ Solution</summary>

```sql
-- Create roles
CREATE ROLE app_admin;
CREATE ROLE app_user;
CREATE ROLE app_readonly;

-- app_admin: Full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_admin;

-- app_user: CRUD on orders, SELECT on products
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON order_items TO app_user;
GRANT SELECT ON products TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- app_readonly: SELECT only
GRANT SELECT ON products TO app_readonly;
GRANT SELECT ON orders TO app_readonly;
GRANT SELECT ON order_items TO app_readonly;

-- Create login users
CREATE ROLE admin_user WITH LOGIN PASSWORD 'admin_pass';
GRANT app_admin TO admin_user;

CREATE ROLE web_app WITH LOGIN PASSWORD 'web_pass';
GRANT app_user TO web_app;

CREATE ROLE analyst WITH LOGIN PASSWORD 'analyst_pass';
GRANT app_readonly TO analyst;

-- Make future tables accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO app_readonly;
```

</details>

---

### Exercise 2: Row-Level Security 🟡

Implement RLS for a multi-tenant SaaS:
1. Each tenant sees only their data
2. Support staff can see all tenants they're assigned to
3. Admins see everything

<details>
<summary>✅ Solution</summary>

```sql
-- Setup
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_customers ON customers
    FOR ALL
    TO app_user
    USING (
        tenant_id = current_setting('app.tenant_id')::int
    );

CREATE POLICY tenant_orders ON orders
    FOR ALL
    TO app_user
    USING (
        tenant_id = current_setting('app.tenant_id')::int
    );

-- Support staff policy (separate role)
CREATE ROLE support_role;

CREATE TABLE support_assignments (
    support_user_id INT,
    tenant_id INT,
    PRIMARY KEY (support_user_id, tenant_id)
);

CREATE POLICY support_customers ON customers
    FOR SELECT
    TO support_role
    USING (
        EXISTS (
            SELECT 1 FROM support_assignments
            WHERE support_user_id = current_setting('app.user_id')::int
              AND tenant_id = customers.tenant_id
        )
    );

CREATE POLICY support_orders ON orders
    FOR SELECT
    TO support_role
    USING (
        EXISTS (
            SELECT 1 FROM support_assignments
            WHERE support_user_id = current_setting('app.user_id')::int
              AND tenant_id = orders.tenant_id
        )
    );

-- Admin bypass
CREATE POLICY admin_customers ON customers
    FOR ALL
    TO admin_role
    USING (true);

CREATE POLICY admin_orders ON orders
    FOR ALL
    TO admin_role
    USING (true);

-- Application usage
SET app.tenant_id = '42';
SET app.user_id = '100';
SELECT * FROM customers;  -- Only tenant 42's customers
```

</details>

---

### Exercise 3: Secure PII Storage 🔴

Design a system to:
1. Store user SSN encrypted
2. Log all access to SSN
3. Allow decryption only through a secure function
4. Rate limit SSN lookups

<details>
<summary>✅ Solution</summary>

```sql
-- Setup encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table with encrypted SSN
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ssn_encrypted BYTEA,  -- Encrypted with pgp_sym_encrypt
    created_at TIMESTAMP DEFAULT NOW()
);

-- Access log
CREATE TABLE ssn_access_log (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    accessor_id INT NOT NULL,
    accessed_at TIMESTAMP DEFAULT NOW(),
    reason VARCHAR(255)
);

-- Rate limit tracking
CREATE TABLE ssn_rate_limit (
    accessor_id INT PRIMARY KEY,
    access_count INT DEFAULT 0,
    window_start TIMESTAMP DEFAULT NOW()
);

-- Secure function to store SSN
CREATE OR REPLACE FUNCTION store_ssn(
    p_user_id INT,
    p_ssn VARCHAR(11)
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Get encryption key from secure location (could be env var, vault, etc.)
    encryption_key := current_setting('app.ssn_key');
    
    UPDATE users 
    SET ssn_encrypted = pgp_sym_encrypt(p_ssn, encryption_key)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Secure function to retrieve SSN
CREATE OR REPLACE FUNCTION get_ssn(
    p_user_id INT,
    p_reason VARCHAR
)
RETURNS VARCHAR
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    encryption_key TEXT;
    decrypted_ssn VARCHAR;
    accessor INT;
    rate_count INT;
    rate_window TIMESTAMP;
BEGIN
    accessor := current_setting('app.user_id')::int;
    
    -- Check rate limit (max 10 per hour)
    SELECT access_count, window_start
    INTO rate_count, rate_window
    FROM ssn_rate_limit
    WHERE accessor_id = accessor;
    
    IF rate_window IS NOT NULL AND rate_window > NOW() - INTERVAL '1 hour' THEN
        IF rate_count >= 10 THEN
            RAISE EXCEPTION 'Rate limit exceeded for SSN access';
        END IF;
        UPDATE ssn_rate_limit 
        SET access_count = access_count + 1
        WHERE accessor_id = accessor;
    ELSE
        INSERT INTO ssn_rate_limit (accessor_id, access_count, window_start)
        VALUES (accessor, 1, NOW())
        ON CONFLICT (accessor_id) 
        DO UPDATE SET access_count = 1, window_start = NOW();
    END IF;
    
    -- Log access
    INSERT INTO ssn_access_log (user_id, accessor_id, reason)
    VALUES (p_user_id, accessor, p_reason);
    
    -- Decrypt and return
    encryption_key := current_setting('app.ssn_key');
    
    SELECT pgp_sym_decrypt(ssn_encrypted, encryption_key)
    INTO decrypted_ssn
    FROM users
    WHERE id = p_user_id;
    
    RETURN decrypted_ssn;
END;
$$ LANGUAGE plpgsql;

-- Permissions
REVOKE ALL ON FUNCTION get_ssn FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_ssn TO authorized_role;

-- Prevent direct access to encrypted column
REVOKE SELECT ON users FROM app_role;
GRANT SELECT (id, email, created_at) ON users TO app_role;

-- Usage
SET app.ssn_key = 'super_secret_encryption_key';
SET app.user_id = '5';

SELECT store_ssn(1, '123-45-6789');
SELECT get_ssn(1, 'Customer verification call');

-- Audit query
SELECT * FROM ssn_access_log ORDER BY accessed_at DESC LIMIT 100;
```

</details>

---

## Key Takeaways

- 👤 **Roles over users**: Easier permission management
- 🔒 **Least privilege**: Grant only what's needed
- 🏢 **RLS for multi-tenant**: Automatic data isolation
- 🔐 **Encrypt sensitive data**: Defense in depth
- 📝 **Audit everything**: Compliance and forensics
- 💉 **Parameterized queries**: Prevent SQL injection

---

## Related Topics

- [Stored Procedures and Triggers](18-stored-procedures-triggers.md) - SECURITY DEFINER functions
- [ORM vs Raw SQL](21-orm-vs-raw-sql.md) - Parameterized queries in ORMs
- [Transactions and ACID](11-transactions-and-acid.md) - Transaction-level security
