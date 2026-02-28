# Databases

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

Database selection is one of the most critical decisions in system design. The right choice depends on your data model, access patterns, scale requirements, and consistency needs. This guide covers the major database categories and when to use each.

---

## 🗄️ Database Categories

### Overview of Database Types

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LANDSCAPE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Relational (SQL)                                               │
│  ─────────────────────────────────────────                      │
│  PostgreSQL, MySQL, SQL Server, Oracle                          │
│  → Structured data, ACID, complex queries                       │
│                                                                 │
│  Key-Value                                                      │
│  ─────────────────────────────────────────                      │
│  Redis, Memcached, DynamoDB, etcd                               │
│  → Simple lookups, caching, sessions                            │
│                                                                 │
│  Document                                                       │
│  ─────────────────────────────────────────                      │
│  MongoDB, Couchbase, Firestore                                  │
│  → Flexible schemas, content management                         │
│                                                                 │
│  Wide-Column                                                    │
│  ─────────────────────────────────────────                      │
│  Cassandra, HBase, ScyllaDB, Bigtable                           │
│  → High write throughput, time-series                           │
│                                                                 │
│  Graph                                                          │
│  ─────────────────────────────────────────                      │
│  Neo4j, Amazon Neptune, JanusGraph                              │
│  → Relationships, social networks, recommendations              │
│                                                                 │
│  Time-Series                                                    │
│  ─────────────────────────────────────────                      │
│  InfluxDB, TimescaleDB, Prometheus                              │
│  → Metrics, IoT, monitoring                                     │
│                                                                 │
│  Search                                                         │
│  ─────────────────────────────────────────                      │
│  Elasticsearch, Solr, Meilisearch                               │
│  → Full-text search, analytics                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ ACID vs BASE

### ACID Properties (SQL Databases)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACID PROPERTIES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  A - Atomicity                                                  │
│  ─────────────────────────────────────────                      │
│  All operations in a transaction succeed or all fail            │
│  Example: Transfer money - debit AND credit must both happen    │
│                                                                 │
│  C - Consistency                                                │
│  ─────────────────────────────────────────                      │
│  Database moves from one valid state to another                 │
│  Example: Foreign keys, unique constraints always enforced      │
│                                                                 │
│  I - Isolation                                                  │
│  ─────────────────────────────────────────                      │
│  Concurrent transactions don't interfere                        │
│  Example: Two users buying last item - only one succeeds        │
│                                                                 │
│  D - Durability                                                 │
│  ─────────────────────────────────────────                      │
│  Committed transactions survive system failures                 │
│  Example: Data persists even after server crash                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### BASE Properties (NoSQL Databases)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BASE PROPERTIES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BA - Basically Available                                       │
│  ─────────────────────────────────────────                      │
│  System guarantees availability (may return stale data)         │
│                                                                 │
│  S - Soft state                                                 │
│  ─────────────────────────────────────────                      │
│  State may change over time due to eventual consistency         │
│                                                                 │
│  E - Eventually consistent                                      │
│  ─────────────────────────────────────────                      │
│  Given enough time, all replicas converge to same state         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ACID vs BASE Comparison

| Property | ACID | BASE |
|----------|------|------|
| Consistency | Strong | Eventual |
| Availability | May sacrifice for consistency | Prioritized |
| Scalability | Harder to scale horizontally | Designed to scale |
| Use Cases | Financial, inventory, bookings | Social media, analytics, caching |

---

## 🐘 Relational Databases (SQL)

### When to Use

- Complex queries with JOINs
- ACID transactions required
- Well-defined schema
- Data integrity is critical
- Moderate scale (millions of rows)

### Popular Options

| Database | Strengths | Best For |
|----------|-----------|----------|
| **PostgreSQL** | Feature-rich, extensible, JSONB | General purpose, complex apps |
| **MySQL** | Fast reads, mature, replication | Web applications, read-heavy |
| **SQL Server** | Enterprise features, .NET integration | Enterprise, Windows environments |
| **SQLite** | Embedded, zero-config | Mobile apps, small projects |

### PostgreSQL Example Schema

```sql
-- Users table with proper types and constraints
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts with foreign key relationship
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for common query pattern
    CONSTRAINT content_length CHECK (char_length(content) <= 280)
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

---

## 📦 Key-Value Stores

### When to Use

- Simple key → value lookups
- Caching layer
- Session storage
- Rate limiting counters
- Pub/sub messaging

### Popular Options

| Database | Strengths | Best For |
|----------|-----------|----------|
| **Redis** | In-memory, data structures, pub/sub | Caching, real-time features |
| **Memcached** | Simple, multi-threaded | Pure caching |
| **DynamoDB** | Managed, scalable, durable | Serverless, key-value at scale |
| **etcd** | Distributed, consistent | Configuration, service discovery |

### Redis Data Structures

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDIS DATA STRUCTURES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Strings                                                        │
│  SET user:123:session "abc123" EX 3600                          │
│  GET user:123:session → "abc123"                                │
│                                                                 │
│  Hashes (like a row/document)                                   │
│  HSET user:123 name "Alice" email "alice@example.com"           │
│  HGET user:123 name → "Alice"                                   │
│  HGETALL user:123 → {name: "Alice", email: "..."}               │
│                                                                 │
│  Lists (ordered collection)                                     │
│  LPUSH notifications:123 "New follower"                         │
│  LRANGE notifications:123 0 10 → [...latest 10...]              │
│                                                                 │
│  Sets (unique collection)                                       │
│  SADD user:123:followers 456 789                                │
│  SISMEMBER user:123:followers 456 → 1 (true)                    │
│                                                                 │
│  Sorted Sets (ranked collection)                                │
│  ZADD leaderboard 100 "player1" 95 "player2"                    │
│  ZRANGE leaderboard 0 10 WITHSCORES → top 10 players            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📄 Document Databases

### When to Use

- Flexible, evolving schema
- Hierarchical data
- Content management
- Catalog/inventory systems
- Rapid prototyping

### Popular Options

| Database | Strengths | Best For |
|----------|-----------|----------|
| **MongoDB** | Flexible, mature, aggregation pipeline | General purpose document store |
| **Couchbase** | Mobile sync, caching | Mobile-first applications |
| **Firestore** | Real-time sync, serverless | Mobile/web apps with sync |

### MongoDB Example

```javascript
// Document structure - flexible schema
{
  _id: ObjectId("..."),
  username: "alice",
  email: "alice@example.com",
  profile: {
    bio: "Software engineer",
    location: "San Francisco",
    social_links: {
      twitter: "@alice",
      github: "alice"
    }
  },
  posts: [
    {
      content: "Hello world!",
      created_at: ISODate("2024-01-15"),
      likes: 42
    }
  ],
  tags: ["developer", "writer"],
  created_at: ISODate("2024-01-01")
}

// Query with nested fields
db.users.find({
  "profile.location": "San Francisco",
  tags: "developer"
})

// Aggregation pipeline
db.users.aggregate([
  { $unwind: "$posts" },
  { $group: { _id: "$username", total_likes: { $sum: "$posts.likes" } } },
  { $sort: { total_likes: -1 } },
  { $limit: 10 }
])
```

---

## 📊 Wide-Column Stores

### When to Use

- Very high write throughput
- Time-series data
- Data with known query patterns
- Horizontal scalability critical
- Eventual consistency acceptable

### Popular Options

| Database | Strengths | Best For |
|----------|-----------|----------|
| **Cassandra** | High write throughput, no single point of failure | IoT, time-series, messaging |
| **HBase** | Hadoop integration, strong consistency | Analytics, data lake |
| **ScyllaDB** | Cassandra-compatible, faster | Drop-in Cassandra replacement |

### Cassandra Data Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    CASSANDRA DATA MODEL                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Table: user_activity                                           │
│  Partition Key: user_id (distributes data)                      │
│  Clustering Key: timestamp (sorts within partition)             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ user_id (PK) │ timestamp (CK) │ activity │ details      │   │
│  ├──────────────┼────────────────┼──────────┼──────────────┤   │
│  │ user_123     │ 2024-01-15 10:00│ login   │ {...}        │   │
│  │ user_123     │ 2024-01-15 10:05│ post    │ {...}        │   │
│  │ user_123     │ 2024-01-15 10:10│ comment │ {...}        │   │
│  └──────────────┴────────────────┴──────────┴──────────────┘   │
│                                                                 │
│  Query: Get user's activity for a day                           │
│  SELECT * FROM user_activity                                    │
│  WHERE user_id = 'user_123'                                     │
│  AND timestamp >= '2024-01-15'                                  │
│  AND timestamp < '2024-01-16';                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Graph Databases

### When to Use

- Complex relationships
- Social networks
- Recommendation engines
- Fraud detection
- Knowledge graphs

### Popular Options

| Database | Strengths | Best For |
|----------|-----------|----------|
| **Neo4j** | Mature, Cypher query language | General graph problems |
| **Amazon Neptune** | Managed, supports Gremlin and SPARQL | AWS-native graphs |
| **JanusGraph** | Distributed, pluggable backend | Large-scale graphs |

### Neo4j Example

```cypher
// Create nodes and relationships
CREATE (alice:User {name: 'Alice', id: '123'})
CREATE (bob:User {name: 'Bob', id: '456'})
CREATE (post:Post {content: 'Hello!', id: 'p1'})

CREATE (alice)-[:FOLLOWS]->(bob)
CREATE (alice)-[:POSTED]->(post)
CREATE (bob)-[:LIKED]->(post)

// Find mutual friends
MATCH (alice:User {name: 'Alice'})-[:FOLLOWS]->(friend)<-[:FOLLOWS]-(bob:User {name: 'Bob'})
RETURN friend.name

// Friend of friend recommendations (2 hops)
MATCH (me:User {id: '123'})-[:FOLLOWS]->()-[:FOLLOWS]->(recommendation)
WHERE NOT (me)-[:FOLLOWS]->(recommendation)
AND me <> recommendation
RETURN DISTINCT recommendation.name, COUNT(*) as mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10
```

---

## ⏱️ Time-Series Databases

### When to Use

- Metrics and monitoring
- IoT sensor data
- Financial tick data
- Event logging
- Anomaly detection

### Popular Options

| Database | Strengths | Best For |
|----------|-----------|----------|
| **InfluxDB** | Purpose-built, InfluxQL/Flux | Metrics, monitoring |
| **TimescaleDB** | PostgreSQL extension, SQL | Time-series with SQL |
| **Prometheus** | Pull-based, alerting | Kubernetes monitoring |
| **QuestDB** | Very fast ingestion | High-throughput time-series |

### TimescaleDB Example

```sql
-- Create hypertable (time-partitioned table)
CREATE TABLE metrics (
    time        TIMESTAMPTZ NOT NULL,
    sensor_id   VARCHAR(50) NOT NULL,
    temperature DOUBLE PRECISION,
    humidity    DOUBLE PRECISION
);

SELECT create_hypertable('metrics', 'time');

-- Insert data
INSERT INTO metrics VALUES 
    (NOW(), 'sensor_1', 72.5, 45.2),
    (NOW(), 'sensor_2', 71.8, 46.1);

-- Query with time bucket aggregation
SELECT 
    time_bucket('1 hour', time) AS hour,
    sensor_id,
    AVG(temperature) as avg_temp,
    MAX(temperature) as max_temp
FROM metrics
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY hour, sensor_id
ORDER BY hour DESC;
```

---

## 🔍 Search Databases

### When to Use

- Full-text search
- Log analysis
- Autocomplete/typeahead
- Faceted navigation
- Analytics on text data

### Elasticsearch Example

```json
// Index a document
PUT /posts/_doc/1
{
  "title": "Introduction to System Design",
  "content": "System design is the process of defining...",
  "author": "alice",
  "tags": ["engineering", "architecture"],
  "created_at": "2024-01-15T10:00:00Z"
}

// Full-text search
GET /posts/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "content": "system design" } }
      ],
      "filter": [
        { "term": { "author": "alice" } },
        { "range": { "created_at": { "gte": "2024-01-01" } } }
      ]
    }
  },
  "highlight": {
    "fields": { "content": {} }
  }
}

// Autocomplete with prefix matching
GET /posts/_search
{
  "suggest": {
    "title-suggest": {
      "prefix": "sys",
      "completion": { "field": "title.suggest" }
    }
  }
}
```

---

## 🎯 Database Selection Guide

### Decision Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE SELECTION MATRIX                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  What's your primary need?                                      │
│                                                                 │
│  Complex queries with JOINs?                                    │
│  └── Yes → PostgreSQL/MySQL                                     │
│                                                                 │
│  Simple key-value lookups?                                      │
│  └── Yes → Redis (in-memory) or DynamoDB (persistent)           │
│                                                                 │
│  Flexible schema, document storage?                             │
│  └── Yes → MongoDB                                              │
│                                                                 │
│  High write throughput, time-series?                            │
│  └── Yes → Cassandra or TimescaleDB                             │
│                                                                 │
│  Complex relationships, traversals?                             │
│  └── Yes → Neo4j                                                │
│                                                                 │
│  Full-text search, analytics?                                   │
│  └── Yes → Elasticsearch                                        │
│                                                                 │
│  Caching layer needed?                                          │
│  └── Yes → Redis                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Common Combinations

| Use Case | Primary DB | Cache | Search |
|----------|-----------|-------|--------|
| E-commerce | PostgreSQL | Redis | Elasticsearch |
| Social Network | PostgreSQL + Cassandra | Redis | Elasticsearch |
| IoT Platform | TimescaleDB | Redis | - |
| Chat Application | Cassandra | Redis | - |
| Content Management | MongoDB | Redis | Elasticsearch |

---

## 📊 Performance Comparison

### Read/Write Performance (Approximate)

| Database | Read QPS | Write QPS | Latency |
|----------|----------|-----------|---------|
| PostgreSQL | 10K-50K | 5K-20K | 1-10ms |
| Redis | 100K+ | 100K+ | &lt;1ms |
| MongoDB | 10K-100K | 10K-50K | 1-10ms |
| Cassandra | 10K-50K/node | 10K-50K/node | 1-10ms |
| Elasticsearch | 1K-10K | 1K-10K | 10-100ms |

---

## ✅ Key Takeaways

1. **No single best database** - Choose based on requirements
2. **SQL for complex queries** - JOINs, transactions, strong consistency
3. **NoSQL for scale** - Horizontal scaling, flexible schemas
4. **Use multiple databases** - Polyglot persistence is common
5. **Cache aggressively** - Redis in front of almost everything
6. **Consider managed services** - RDS, DynamoDB, Atlas reduce ops burden
7. **Plan for growth** - What works at 1K rows may fail at 1B

---

## 📚 Related Topics

- [Data Modeling](/system-design/fundamentals/05-data-modeling.md) - Designing schemas
- [Caching](/system-design/fundamentals/07-caching.md) - Cache strategies and Redis
- [Database Scaling](/system-design/fundamentals/11-database-scaling.md) - Replication and sharding
- [CAP Theorem](/system-design/fundamentals/13-cap-theorem.md) - Consistency vs availability
