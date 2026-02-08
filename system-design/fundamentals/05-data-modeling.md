# Data Modeling

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

Data modeling is the process of designing how data is structured, stored, and related. Good data modeling decisions impact performance, scalability, and maintainability. In system design interviews, your data model choices should align with your access patterns and scale requirements.

---

## 🎯 Core Concepts

### Entities, Attributes, and Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA MODEL COMPONENTS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Entity: A distinct object or concept                           │
│  ─────────────────────────────────────────                      │
│  Examples: User, Post, Order, Product                           │
│                                                                 │
│  Attribute: A property of an entity                             │
│  ─────────────────────────────────────────                      │
│  Examples: user.name, post.content, order.total                 │
│                                                                 │
│  Relationship: How entities connect                             │
│  ─────────────────────────────────────────                      │
│  • One-to-One (1:1)    User ←→ Profile                         │
│  • One-to-Many (1:N)   User ←→ Posts                           │
│  • Many-to-Many (N:M)  Users ←→ Groups                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Entity-Relationship Diagram Example

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │     Post     │       │   Comment    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │───┐   │ id (PK)      │───┐   │ id (PK)      │
│ username     │   │   │ user_id (FK) │◄──┘   │ post_id (FK) │◄──┐
│ email        │   │   │ content      │   │   │ user_id (FK) │◄──┤
│ created_at   │   │   │ created_at   │   │   │ content      │   │
└──────────────┘   │   └──────────────┘   │   │ created_at   │   │
                   │                       │   └──────────────┘   │
                   │                       │                       │
                   └───────────────────────┴───────────────────────┘
                           1:N relationships
```

---

## 📊 SQL vs NoSQL Data Modeling

### When to Use Each

```
┌─────────────────────────────────────────────────────────────────┐
│                    SQL vs NoSQL DECISION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Choose SQL When:                                               │
│  ─────────────────────────────────────────                      │
│  ✅ Complex relationships between entities                       │
│  ✅ Need ACID transactions                                       │
│  ✅ Data structure is well-defined                               │
│  ✅ Complex queries with JOINs                                   │
│  ✅ Data integrity is critical                                   │
│                                                                 │
│  Choose NoSQL When:                                             │
│  ─────────────────────────────────────────                      │
│  ✅ High write throughput required                               │
│  ✅ Horizontal scaling is priority                               │
│  ✅ Flexible/evolving schema                                     │
│  ✅ Simple access patterns (key-value, document)                 │
│  ✅ Eventual consistency acceptable                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### NoSQL Types and Use Cases

| Type | Examples | Best For | Data Model |
|------|----------|----------|------------|
| **Key-Value** | Redis, DynamoDB | Caching, sessions | `key → value` |
| **Document** | MongoDB, Couchbase | Content, catalogs | `key → JSON document` |
| **Wide-Column** | Cassandra, HBase | Time-series, IoT | `row key → columns` |
| **Graph** | Neo4j, Neptune | Social networks, recommendations | `nodes + edges` |

---

## 🔄 Normalization vs Denormalization

### Normalization

Organizing data to reduce redundancy and improve integrity.

```
Normalized Schema (3NF):
─────────────────────────────────────────────

Users Table:
┌────┬──────────┬─────────────────────┐
│ id │ username │ email               │
├────┼──────────┼─────────────────────┤
│ 1  │ alice    │ alice@example.com   │
│ 2  │ bob      │ bob@example.com     │
└────┴──────────┴─────────────────────┘

Posts Table:
┌────┬─────────┬─────────────────────────┐
│ id │ user_id │ content                 │
├────┼─────────┼─────────────────────────┤
│ 1  │ 1       │ Hello world!            │
│ 2  │ 1       │ Another post            │
│ 3  │ 2       │ Bob's first post        │
└────┴─────────┴─────────────────────────┘

Query to get post with username:
SELECT p.content, u.username 
FROM posts p 
JOIN users u ON p.user_id = u.id;
```

**Pros:**
- No data duplication
- Easy updates (change in one place)
- Data consistency guaranteed

**Cons:**
- Requires JOINs (slower reads)
- More complex queries
- Doesn't scale horizontally well

### Denormalization

Duplicating data to optimize read performance.

```
Denormalized Schema:
─────────────────────────────────────────────

Posts Table (with embedded user data):
┌────┬─────────┬──────────┬─────────────────────┐
│ id │ user_id │ username │ content             │
├────┼─────────┼──────────┼─────────────────────┤
│ 1  │ 1       │ alice    │ Hello world!        │
│ 2  │ 1       │ alice    │ Another post        │
│ 3  │ 2       │ bob      │ Bob's first post    │
└────┴─────────┴──────────┴─────────────────────┘

Query (no JOIN needed):
SELECT content, username FROM posts WHERE id = 1;
```

**Pros:**
- Faster reads (no JOINs)
- Simpler queries
- Better horizontal scaling

**Cons:**
- Data duplication
- Update complexity (must update everywhere)
- Potential inconsistency

### When to Denormalize

| Scenario | Action |
|----------|--------|
| Read-heavy workload (>10:1 read/write) | Denormalize |
| Need sub-millisecond reads | Denormalize |
| Data rarely changes | Denormalize |
| Strong consistency required | Keep normalized |
| Complex updates | Keep normalized |

---

## 📐 Schema Design Patterns

### Pattern 1: Embedding (Document Store)

```json
// User document with embedded posts
{
  "_id": "user_123",
  "username": "alice",
  "email": "alice@example.com",
  "posts": [
    {
      "id": "post_1",
      "content": "Hello world!",
      "created_at": "2024-01-15T10:00:00Z"
    },
    {
      "id": "post_2", 
      "content": "Another post",
      "created_at": "2024-01-16T10:00:00Z"
    }
  ]
}
```

**Use when:**
- Data is accessed together
- Embedded data is bounded
- One-to-few relationships

### Pattern 2: Referencing

```json
// User document
{
  "_id": "user_123",
  "username": "alice",
  "email": "alice@example.com"
}

// Post documents (separate collection)
{
  "_id": "post_1",
  "user_id": "user_123",
  "content": "Hello world!"
}
```

**Use when:**
- Data grows unbounded
- Need to query independently
- Many-to-many relationships

### Pattern 3: Bucketing (Time-Series)

```json
// Instead of one document per reading...
// Group readings into time buckets

{
  "_id": "sensor_123_2024_01_15",
  "sensor_id": "sensor_123",
  "date": "2024-01-15",
  "readings": [
    { "timestamp": "10:00:00", "value": 72.5 },
    { "timestamp": "10:01:00", "value": 72.8 },
    { "timestamp": "10:02:00", "value": 73.1 }
    // ... up to 1440 readings per day
  ]
}
```

**Use when:**
- Time-series data
- High write volume
- Range queries by time

### Pattern 4: Materialized Views

```
┌─────────────────────────────────────────────────────────────────┐
│                    MATERIALIZED VIEWS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source Tables (normalized):                                    │
│  ─────────────────────────────────────────                      │
│  orders, order_items, products, customers                       │
│                                                                 │
│  Materialized View (pre-computed):                              │
│  ─────────────────────────────────────────                      │
│  daily_sales_summary                                            │
│  ┌────────────┬──────────┬───────┬─────────┐                   │
│  │ date       │ category │ count │ revenue │                   │
│  ├────────────┼──────────┼───────┼─────────┤                   │
│  │ 2024-01-15 │ Books    │ 150   │ 2,250   │                   │
│  │ 2024-01-15 │ Music    │ 89    │ 1,335   │                   │
│  └────────────┴──────────┴───────┴─────────┘                   │
│                                                                 │
│  Refreshed periodically or on-demand                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Access Pattern-Driven Design

### Design Process

```
Step 1: List all access patterns
─────────────────────────────────────────────
• Get user by ID
• Get user by email
• List posts by user (newest first)
• Get post by ID
• Get feed for user (posts from following)
• Search posts by hashtag

Step 2: Design schema to support patterns
─────────────────────────────────────────────
• Primary key: user_id for Users table
• Secondary index: email for Users table
• Sort key: created_at DESC for Posts
• Partition key: user_id for Posts (user's posts)
• GSI: hashtag for Posts (hashtag search)
```

### DynamoDB Single-Table Design Example

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINGLE TABLE DESIGN                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  All entities in one table with composite keys:                 │
│                                                                 │
│  ┌────────────────┬─────────────────┬─────────────────────┐    │
│  │ PK             │ SK              │ Attributes          │    │
│  ├────────────────┼─────────────────┼─────────────────────┤    │
│  │ USER#123       │ PROFILE         │ name, email, bio    │    │
│  │ USER#123       │ POST#001        │ content, created_at │    │
│  │ USER#123       │ POST#002        │ content, created_at │    │
│  │ USER#123       │ FOLLOWER#456    │ since               │    │
│  │ POST#001       │ COMMENT#001     │ text, user_id       │    │
│  │ POST#001       │ LIKE#USER#456   │ timestamp           │    │
│  └────────────────┴─────────────────┴─────────────────────┘    │
│                                                                 │
│  Access Patterns:                                               │
│  • Get user profile: PK=USER#123, SK=PROFILE                    │
│  • List user posts: PK=USER#123, SK begins_with POST#           │
│  • Get post comments: PK=POST#001, SK begins_with COMMENT#      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Relationship Modeling

### One-to-One Relationship

```
Option 1: Same table (embed in parent)
─────────────────────────────────────────────
Users: id, username, email, profile_bio, profile_avatar

Option 2: Separate tables
─────────────────────────────────────────────
Users: id, username, email
Profiles: user_id (PK, FK), bio, avatar

Use Option 1 when: Data always accessed together
Use Option 2 when: Profile is optional or large
```

### One-to-Many Relationship

```
Standard approach: Foreign key in child table
─────────────────────────────────────────────
Users: id, username
Posts: id, user_id (FK), content

Getting user's posts: SELECT * FROM posts WHERE user_id = ?

In NoSQL: 
- Embed if bounded (user has max 10 addresses)
- Reference if unbounded (user has many posts)
```

### Many-to-Many Relationship

```
SQL: Junction table
─────────────────────────────────────────────
Users: id, username
Groups: id, name
User_Groups: user_id (FK), group_id (FK), joined_at

Get user's groups: 
SELECT g.* FROM groups g 
JOIN user_groups ug ON g.id = ug.group_id 
WHERE ug.user_id = ?

NoSQL: Denormalize or use adjacency lists
─────────────────────────────────────────────
// Store both directions
User document: { groups: ["group1", "group2"] }
Group document: { members: ["user1", "user2", "user3"] }
```

---

## 📊 Common Schema Examples

### E-Commerce Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                    E-COMMERCE SCHEMA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Users                    Products                              │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │ id              │     │ id              │                   │
│  │ email           │     │ name            │                   │
│  │ password_hash   │     │ description     │                   │
│  │ created_at      │     │ price_cents     │                   │
│  └────────┬────────┘     │ stock_quantity  │                   │
│           │              │ category_id (FK)│                   │
│           │              └────────┬────────┘                   │
│           │                       │                             │
│           ▼                       ▼                             │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │ Orders          │     │ Order_Items     │                   │
│  ├─────────────────┤     ├─────────────────┤                   │
│  │ id              │◄────│ order_id (FK)   │                   │
│  │ user_id (FK)    │     │ product_id (FK) │────────────────►  │
│  │ status          │     │ quantity        │                   │
│  │ total_cents     │     │ unit_price_cents│                   │
│  │ created_at      │     └─────────────────┘                   │
│  └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Social Network Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOCIAL NETWORK SCHEMA                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Users                                                          │
│  ┌─────────────────┐                                           │
│  │ id              │◄──────────────────────────┐               │
│  │ username        │                           │               │
│  │ display_name    │◄────────────────┐         │               │
│  │ bio             │                 │         │               │
│  │ follower_count  │  (denormalized) │         │               │
│  │ following_count │  (denormalized) │         │               │
│  └────────┬────────┘                 │         │               │
│           │                          │         │               │
│           ▼                          │         │               │
│  ┌─────────────────┐     ┌───────────┴─────────┴───┐           │
│  │ Posts           │     │ Follows                  │           │
│  ├─────────────────┤     ├─────────────────────────┤           │
│  │ id              │     │ follower_id (FK)        │           │
│  │ user_id (FK)    │     │ followee_id (FK)        │           │
│  │ content         │     │ created_at              │           │
│  │ like_count      │     └─────────────────────────┘           │
│  │ comment_count   │                                           │
│  │ created_at      │                                           │
│  └─────────────────┘                                           │
│                                                                 │
│  Likes              Comments                                    │
│  ┌───────────────┐  ┌───────────────┐                          │
│  │ user_id (FK)  │  │ id            │                          │
│  │ post_id (FK)  │  │ post_id (FK)  │                          │
│  │ created_at    │  │ user_id (FK)  │                          │
│  └───────────────┘  │ content       │                          │
│                     └───────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Design Decisions

### ID Generation Strategies

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| Auto-increment | 1, 2, 3... | Simple, compact | Not distributed-friendly |
| UUID v4 | `550e8400-e29b-...` | Globally unique | Large, random (bad for indexes) |
| ULID | `01ARZ3NDEKTSV...` | Sortable, unique | Less widely supported |
| Snowflake ID | `1234567890123456789` | Sortable, compact | Requires coordination |
| NanoID | `V1StGXR8_Z5jdHi` | Short, URL-safe | Collision possible at scale |

### Timestamp Handling

```
Best Practices:
─────────────────────────────────────────────
✅ Store as UTC timestamp (no timezone ambiguity)
✅ Use appropriate precision (seconds, milliseconds)
✅ Include created_at and updated_at on most tables
✅ Use database-level defaults when possible

CREATE TABLE posts (
    id UUID PRIMARY KEY,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Soft Delete vs Hard Delete

```
Hard Delete:
─────────────────────────────────────────────
DELETE FROM posts WHERE id = 123;
✅ Data actually removed
❌ Cannot recover, breaks foreign keys

Soft Delete:
─────────────────────────────────────────────
UPDATE posts SET deleted_at = NOW() WHERE id = 123;
✅ Recoverable, audit trail
❌ Must filter in all queries, storage overhead

Query with soft delete:
SELECT * FROM posts WHERE deleted_at IS NULL;
```

---

## ⚠️ Common Mistakes

| Mistake | Impact | Solution |
|---------|--------|----------|
| Over-normalization | Too many JOINs, slow reads | Denormalize hot paths |
| Under-normalization | Update anomalies, inconsistency | Normalize critical data |
| Ignoring access patterns | Poor query performance | Design for queries first |
| Wrong data types | Storage waste, precision issues | Use appropriate types |
| Missing indexes | Slow queries | Index query patterns |
| Unbounded growth | Document too large | Split into multiple records |

---

## ✅ Key Takeaways

1. **Design for access patterns** - Know your queries before schema
2. **Normalize for writes, denormalize for reads** - Trade-off based on workload
3. **Choose IDs carefully** - Consider distribution and sortability
4. **Model relationships explicitly** - Understand 1:1, 1:N, N:M
5. **Consider scale** - What works at 1K rows may fail at 1B
6. **Plan for evolution** - Schemas change, design for flexibility
7. **Document your model** - ERD diagrams are essential

---

## 📚 Related Topics

- [Databases](/system-design/fundamentals/06-databases.md) - SQL vs NoSQL deep dive
- [Database Scaling](/system-design/fundamentals/11-database-scaling.md) - Sharding and replication
- [API Design](/system-design/fundamentals/04-api-design.md) - Exposing your data model
