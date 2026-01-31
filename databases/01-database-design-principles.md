# Database Design Principles

[← Back to Index](00-index.md)

---

## Overview

Database design is the process of producing a detailed data model of a database. Good design ensures data integrity, reduces redundancy, and optimizes query performance. Poor design leads to anomalies, maintenance nightmares, and scalability issues.

### When This Matters Most
- Starting a new project from scratch
- Refactoring a legacy system
- Designing for scale from day one
- Interview whiteboard sessions

---

## Core Concepts

### Entity-Relationship Modeling

Entities represent real-world objects; relationships describe how they connect.

```
┌─────────────────────────────────────────────────────────────────┐
│  ENTITY TYPES                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Strong Entity    - Exists independently (Customer, Product)   │
│  Weak Entity      - Depends on another entity (OrderItem)      │
│  Associative      - Represents M:N relationship (Enrollment)   │
└─────────────────────────────────────────────────────────────────┘
```

**Example: E-commerce Domain**
```
┌──────────┐         ┌──────────┐         ┌──────────┐
│ Customer │───1:N───│  Order   │───1:N───│OrderItem │
└──────────┘         └──────────┘         └──────────┘
                                                │
                                              N:1
                                                │
                                          ┌──────────┐
                                          │ Product  │
                                          └──────────┘
```

### Cardinality and Participation

| Relationship | Meaning | Example |
|--------------|---------|---------|
| **1:1** | One-to-one | User ↔ UserProfile |
| **1:N** | One-to-many | Customer → Orders |
| **M:N** | Many-to-many | Students ↔ Courses |

**Participation:**
- **Total (mandatory)**: Every entity must participate (double line in ERD)
- **Partial (optional)**: Participation is optional (single line)

```sql
-- 1:1 Relationship: User and Profile
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    email VARCHAR(255) NOT NULL
);

CREATE TABLE user_profiles (
    profile_id INT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,  -- UNIQUE enforces 1:1
    bio TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- M:N Relationship: Students and Courses (via junction table)
CREATE TABLE students (
    student_id INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE courses (
    course_id INT PRIMARY KEY,
    title VARCHAR(200)
);

CREATE TABLE enrollments (  -- Junction/associative table
    student_id INT,
    course_id INT,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grade CHAR(2),
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
);
```

---

### Attribute Types

| Type | Description | Example |
|------|-------------|---------|
| **Simple** | Atomic, indivisible | `age`, `price` |
| **Composite** | Can be divided | `address` → street, city, zip |
| **Derived** | Calculated from others | `age` from `birth_date` |
| **Multi-valued** | Multiple values | `phone_numbers` |

**Design Decision: Composite vs Separate Columns**

```sql
-- ❌ Single composite column (hard to query)
CREATE TABLE customers (
    id INT PRIMARY KEY,
    full_address VARCHAR(500)  -- "123 Main St, NYC, NY 10001"
);

-- ✅ Separate columns (queryable, indexable)
CREATE TABLE customers (
    id INT PRIMARY KEY,
    street VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50)
);

-- For multi-valued attributes: separate table
CREATE TABLE customer_phones (
    customer_id INT,
    phone_type VARCHAR(20),  -- 'home', 'work', 'mobile'
    phone_number VARCHAR(20),
    PRIMARY KEY (customer_id, phone_type),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

---

### Schema Design Patterns

#### Pattern 1: Lookup/Reference Tables

For controlled vocabularies and configurable values:

```sql
-- Instead of hardcoding statuses
CREATE TABLE order_statuses (
    status_id INT PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_terminal BOOLEAN DEFAULT FALSE  -- Can order still change?
);

INSERT INTO order_statuses VALUES
(1, 'pending', 'Order received, awaiting payment', FALSE),
(2, 'paid', 'Payment confirmed', FALSE),
(3, 'shipped', 'Order dispatched', FALSE),
(4, 'delivered', 'Order completed', TRUE),
(5, 'cancelled', 'Order cancelled', TRUE);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    status_id INT NOT NULL DEFAULT 1,
    FOREIGN KEY (status_id) REFERENCES order_statuses(status_id)
);
```

#### Pattern 2: Self-Referential Relationships

For hierarchical data (categories, org charts, comments):

```sql
CREATE TABLE categories (
    category_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INT,  -- NULL for root categories
    FOREIGN KEY (parent_id) REFERENCES categories(category_id)
);

-- Example data:
-- Electronics (parent_id: NULL)
--   ├── Phones (parent_id: 1)
--   │     ├── Smartphones (parent_id: 2)
--   │     └── Feature Phones (parent_id: 2)
--   └── Computers (parent_id: 1)
--         ├── Laptops (parent_id: 5)
--         └── Desktops (parent_id: 5)
```

#### Pattern 3: Type/Subtype (Table Inheritance)

When entities share common attributes but have specific ones:

```sql
-- Option A: Single Table Inheritance (STI)
-- All types in one table with nullable columns
CREATE TABLE payments (
    payment_id INT PRIMARY KEY,
    payment_type VARCHAR(20) NOT NULL,  -- 'credit_card', 'bank_transfer', 'paypal'
    amount DECIMAL(10,2) NOT NULL,
    -- Credit card fields (NULL for other types)
    card_last_four CHAR(4),
    card_expiry DATE,
    -- Bank transfer fields
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    -- PayPal fields
    paypal_email VARCHAR(255)
);

-- Option B: Class Table Inheritance (CTI)
-- Separate tables with shared parent
CREATE TABLE payments (
    payment_id INT PRIMARY KEY,
    payment_type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_card_payments (
    payment_id INT PRIMARY KEY,
    card_last_four CHAR(4) NOT NULL,
    card_expiry DATE NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
);

CREATE TABLE bank_transfers (
    payment_id INT PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
);
```

| Approach | Pros | Cons |
|----------|------|------|
| **STI** | Simple queries, one table | Many NULLs, harder constraints |
| **CTI** | Clean schema, proper constraints | JOINs required, more complex |

#### Pattern 4: Audit/History Tables

Tracking changes over time:

```sql
-- Trigger-based audit trail
CREATE TABLE products_audit (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(100),
    operation VARCHAR(10),  -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSON,
    new_values JSON
);

-- Or: Temporal tables (SQL Server 2016+, PostgreSQL)
-- Automatically tracks all historical versions
```

---

### Naming Conventions

Consistency matters more than which convention you choose:

| Element | Convention | Example |
|---------|------------|---------|
| Tables | Plural, snake_case | `customers`, `order_items` |
| Columns | Singular, snake_case | `customer_id`, `created_at` |
| Primary Key | `{table_singular}_id` | `customer_id`, `order_id` |
| Foreign Key | Same as referenced PK | `orders.customer_id` |
| Junction Tables | Both table names | `student_courses` |
| Booleans | `is_`, `has_`, `can_` prefix | `is_active`, `has_verified` |
| Timestamps | `_at` suffix | `created_at`, `updated_at` |

```sql
-- ✅ Good naming
CREATE TABLE order_items (
    order_item_id INT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    is_gift_wrapped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ❌ Inconsistent naming
CREATE TABLE tbl_OrderItem (
    ID INT PRIMARY KEY,
    OrderID INT,
    prod_id INT,
    Qty INT,
    Price DECIMAL(10,2),
    GiftWrap BIT,
    DateCreated DATETIME
);
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Start with the domain**: Understand the business before designing
- **Use surrogate keys**: Auto-increment IDs are simpler than natural keys
- **Plan for NULL**: Decide what NULL means for each column
- **Add timestamps**: `created_at`, `updated_at` on most tables
- **Document relationships**: ERD diagrams save future confusion

### ❌ Avoid:
- **God tables**: One table with 50+ columns doing everything
- **Implicit relationships**: Data that "should" match without FK enforcement
- **Reserved words**: Column names like `order`, `user`, `group` cause issues
- **Premature optimization**: Normalize first, denormalize when proven needed

---

## Exercises

### Exercise 1: Blog Platform 🟢

**Scenario:** Design a schema for a blogging platform.

**Requirements:**
- Users can write multiple posts
- Posts can have multiple tags (M:N)
- Users can comment on posts
- Comments can be replies to other comments (threaded)

**Task:** Create the table definitions with appropriate keys and constraints.

<details>
<summary>💡 Hints</summary>

- Users → Posts is 1:N
- Posts ↔ Tags needs a junction table
- Comments need self-referential for threading
- Consider `ON DELETE` behavior for cascades

</details>

<details>
<summary>✅ Solution</summary>

```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    post_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'published', 'archived'
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE tags (
    tag_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE  -- URL-friendly version
);

CREATE TABLE post_tags (
    post_id INT,
    tag_id INT,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

CREATE TABLE comments (
    comment_id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_comment_id INT,  -- NULL for top-level comments
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
```

</details>

---

### Exercise 2: Multi-Tenant SaaS 🟡

**Scenario:** Design a schema for a project management SaaS where:
- Multiple organizations (tenants) share the database
- Each org has users, projects, and tasks
- Users can belong to multiple orgs with different roles
- Tasks can be assigned to multiple users

**Task:** Design the schema with tenant isolation in mind.

<details>
<summary>💡 Hints</summary>

- Include `org_id` in most tables for tenant isolation
- User ↔ Organization is M:N with roles
- Consider composite keys or tenant-scoped indexes
- Think about `ON DELETE` behavior across tenants

</details>

<details>
<summary>✅ Solution</summary>

```sql
-- Core tenant table
CREATE TABLE organizations (
    org_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,  -- for URLs
    plan VARCHAR(20) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (global, can belong to multiple orgs)
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- M:N with roles per organization
CREATE TABLE org_members (
    org_id INT,
    user_id INT,
    role VARCHAR(20) NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (org_id, user_id),
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Projects scoped to org
CREATE TABLE projects (
    project_id INT PRIMARY KEY AUTO_INCREMENT,
    org_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_org ON projects(org_id);

-- Tasks scoped to project (and transitively to org)
CREATE TABLE tasks (
    task_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo',  -- 'todo', 'in_progress', 'done'
    priority INT DEFAULT 0,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- M:N task assignments
CREATE TABLE task_assignees (
    task_id INT,
    user_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- For queries: "all tasks in my org" needs org_id on tasks
-- Option: Add denormalized org_id to tasks
ALTER TABLE tasks ADD COLUMN org_id INT;
CREATE INDEX idx_tasks_org ON tasks(org_id);
```

</details>

---

### Exercise 3: Event Sourcing Schema 🔴

**Scenario:** Design an event-sourced schema for a banking system where:
- All changes are stored as immutable events
- Current state is derived from replaying events
- Need to support snapshots for performance
- Events must be ordered per account

**Task:** Design the event store schema and the snapshot mechanism.

<details>
<summary>💡 Hints</summary>

- Events table needs: aggregate_id, event_type, payload, version, timestamp
- Version per aggregate enables optimistic concurrency
- Snapshots store computed state at a point in time
- Consider event ordering and idempotency

</details>

<details>
<summary>✅ Solution</summary>

```sql
-- Event store: immutable log of all changes
CREATE TABLE events (
    event_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    aggregate_type VARCHAR(50) NOT NULL,  -- 'Account', 'Transfer'
    aggregate_id VARCHAR(50) NOT NULL,     -- The account number
    event_type VARCHAR(100) NOT NULL,      -- 'AccountOpened', 'MoneyDeposited'
    event_version INT NOT NULL,            -- Per-aggregate sequence number
    payload JSON NOT NULL,                 -- Event data
    metadata JSON,                         -- Correlation ID, user, etc.
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),  -- Microseconds
    
    -- Ensures ordering within aggregate
    UNIQUE KEY uk_aggregate_version (aggregate_type, aggregate_id, event_version)
);

CREATE INDEX idx_events_aggregate ON events(aggregate_type, aggregate_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created ON events(created_at);

-- Example events:
-- { aggregate_id: 'ACC001', event_type: 'AccountOpened', version: 1, 
--   payload: { owner: 'John Doe', initial_balance: 0 } }
-- { aggregate_id: 'ACC001', event_type: 'MoneyDeposited', version: 2,
--   payload: { amount: 1000, reference: 'DEP001' } }

-- Snapshots: computed state at a version
CREATE TABLE snapshots (
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(50) NOT NULL,
    version INT NOT NULL,              -- Event version this snapshot is at
    state JSON NOT NULL,               -- Computed aggregate state
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (aggregate_type, aggregate_id, version)
);

-- Current state view (for fast lookups)
CREATE TABLE account_projections (
    account_id VARCHAR(50) PRIMARY KEY,
    owner_name VARCHAR(100) NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_event_version INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Outbox pattern: for reliable event publishing
CREATE TABLE outbox (
    outbox_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id BIGINT NOT NULL,
    destination VARCHAR(100) NOT NULL,  -- Queue/topic name
    payload JSON NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'sent', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

CREATE INDEX idx_outbox_status ON outbox(status, created_at);

-- Sample query: Rebuild account state from events
-- SELECT * FROM events 
-- WHERE aggregate_type = 'Account' AND aggregate_id = 'ACC001'
-- ORDER BY event_version;

-- Optimized: Load from snapshot + newer events
-- 1. SELECT * FROM snapshots WHERE aggregate_id = 'ACC001' ORDER BY version DESC LIMIT 1
-- 2. SELECT * FROM events WHERE aggregate_id = 'ACC001' AND event_version > {snapshot_version}
```

</details>

---

## Key Takeaways

- 📐 **Model the domain first** - Understand entities and relationships before writing SQL
- 🔑 **Relationships matter** - 1:1, 1:N, M:N determine your table structure
- 📏 **Naming consistency** - Pick a convention and stick to it
- 🧱 **Patterns exist** - Lookup tables, self-reference, inheritance, audit logs
- ⚖️ **Trade-offs everywhere** - Normalization vs query simplicity, flexibility vs constraints

---

## Related Topics

- [Normalization](02-normalization.md) - Formal rules for schema design
- [Keys and Constraints](03-keys-and-constraints.md) - Enforcing data integrity
- [Multi-Table Queries](04-multi-table-queries.md) - Querying your designed schema
