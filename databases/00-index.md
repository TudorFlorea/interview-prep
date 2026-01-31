# Relational Databases - Advanced Concepts

> A comprehensive guide to mastering relational databases beyond the basics

[← Back to Main](../README.md)

---

## 📊 Progress Dashboard

### Foundations & Design
| Topic | Status | Difficulty |
|-------|--------|------------|
| [Database Design Principles](01-database-design-principles.md) | ⬜ Not Started | 🟡 Intermediate |
| [Normalization](02-normalization.md) | ⬜ Not Started | 🟡 Intermediate |
| [Keys and Constraints](03-keys-and-constraints.md) | ⬜ Not Started | 🟢 Foundational |

### Querying
| Topic | Status | Difficulty |
|-------|--------|------------|
| [Multi-Table Queries](04-multi-table-queries.md) | ⬜ Not Started | 🟡 Intermediate |
| [Subqueries and CTEs](05-subqueries-and-ctes.md) | ⬜ Not Started | 🟡 Intermediate |
| [Advanced SQL Patterns](06-advanced-sql-patterns.md) | ⬜ Not Started | 🔴 Advanced |

### Performance & Optimization
| Topic | Status | Difficulty |
|-------|--------|------------|
| [Indexing Deep Dive](07-indexing-deep-dive.md) | ⬜ Not Started | 🟡 Intermediate |
| [Query Execution Internals](08-query-execution-internals.md) | ⬜ Not Started | 🔴 Advanced |
| [Query Optimization](09-query-optimization.md) | ⬜ Not Started | 🔴 Advanced |
| [Performance Tuning](10-performance-tuning.md) | ⬜ Not Started | 🔴 Advanced |

### Transactions & Concurrency
| Topic | Status | Difficulty |
|-------|--------|------------|
| [Transactions and ACID](11-transactions-and-acid.md) | ⬜ Not Started | 🟡 Intermediate |
| [Locking and Concurrency](12-locking-and-concurrency.md) | ⬜ Not Started | 🔴 Advanced |

### Architecture & Scaling
| Topic | Status | Difficulty |
|-------|--------|------------|
| [Partitioning and Sharding](13-partitioning-and-sharding.md) | ⬜ Not Started | 🔴 Advanced |
| [Replication and Consistency](14-replication-and-consistency.md) | ⬜ Not Started | 🔴 Advanced |
| [Database Internals](15-database-internals.md) | ⬜ Not Started | 🔴 Advanced |

### Practical Topics
| Topic | Status | Difficulty |
|-------|--------|------------|
| [JSON and Document Storage](16-json-and-document-storage.md) | ⬜ Not Started | 🟡 Intermediate |
| [Full-Text Search](17-full-text-search.md) | ⬜ Not Started | 🟡 Intermediate |
| [Stored Procedures & Triggers](18-stored-procedures-triggers.md) | ⬜ Not Started | 🟡 Intermediate |
| [Security and Access Control](19-security-and-access-control.md) | ⬜ Not Started | 🟡 Intermediate |
| [Migrations and Versioning](20-migrations-and-versioning.md) | ⬜ Not Started | 🟡 Intermediate |
| [ORM vs Raw SQL](21-orm-vs-raw-sql.md) | ⬜ Not Started | 🟡 Intermediate |

---

## 🗺️ Study Roadmap

### Phase 1: Design Foundations (Week 1-2)
1. **Database Design Principles** - Entity relationships, schema modeling
2. **Normalization** - Normal forms, when to denormalize
3. **Keys and Constraints** - Referential integrity, data validation

### Phase 2: Query Mastery (Week 3-4)
4. **Multi-Table Queries** - All JOIN types, set operations
5. **Subqueries and CTEs** - Correlated queries, recursive patterns
6. **Advanced SQL Patterns** - Window functions, pivots, advanced aggregations

### Phase 3: Performance (Week 5-6)
7. **Indexing Deep Dive** - Index types, strategies, maintenance
8. **Query Execution Internals** - How databases execute queries
9. **Query Optimization** - Rewriting for performance
10. **Performance Tuning** - Profiling, caching, connection management

### Phase 4: Transactions & Concurrency (Week 7)
11. **Transactions and ACID** - Isolation levels, consistency guarantees
12. **Locking and Concurrency** - Deadlocks, concurrency patterns

### Phase 5: Scaling & Architecture (Week 8)
13. **Partitioning and Sharding** - Data distribution strategies
14. **Replication and Consistency** - High availability patterns
15. **Database Internals** - Storage engines, WAL, buffer management

### Phase 6: Practical Skills (Week 9-10)
16. **JSON and Document Storage** - Semi-structured data in RDBMS
17. **Full-Text Search** - Text indexing and search
18. **Stored Procedures & Triggers** - Server-side logic
19. **Security and Access Control** - Roles, permissions, encryption
20. **Migrations and Versioning** - Schema evolution
21. **ORM vs Raw SQL** - When to use each approach

---

## 🎯 Sample Database

Most examples use an **e-commerce database** with the following core tables:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    customers    │       │     orders      │       │   order_items   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ customer_id (PK)│───┐   │ order_id (PK)   │───┐   │ item_id (PK)    │
│ email           │   └──►│ customer_id (FK)│   └──►│ order_id (FK)   │
│ name            │       │ order_date      │       │ product_id (FK) │
│ created_at      │       │ status          │       │ quantity        │
│ tier            │       │ total_amount    │       │ unit_price      │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                            │
┌─────────────────┐       ┌─────────────────┐               │
│    products     │       │   categories    │               │
├─────────────────┤       ├─────────────────┤               │
│ product_id (PK) │◄──────│ category_id (PK)│               │
│ category_id (FK)│       │ name            │◄──────────────┘
│ name            │       │ parent_id (FK)  │ (self-referential)
│ price           │       └─────────────────┘
│ stock_quantity  │
│ created_at      │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│    reviews      │       │   inventory_log │
├─────────────────┤       ├─────────────────┤
│ review_id (PK)  │       │ log_id (PK)     │
│ product_id (FK) │       │ product_id (FK) │
│ customer_id (FK)│       │ change_qty      │
│ rating          │       │ change_type     │
│ comment         │       │ logged_at       │
│ created_at      │       └─────────────────┘
└─────────────────┘
```

### Quick Setup Script
```sql
-- Schema available in each topic file as needed
-- Full setup script: exercises/setup-ecommerce-db.sql
```

---

## 📚 Resources

### Books
- *Designing Data-Intensive Applications* - Martin Kleppmann
- *SQL Performance Explained* - Markus Winand
- *Database Internals* - Alex Petrov
- *High Performance MySQL* - Schwartz, Zaitsev, Tkachenko

### Online
- [Use The Index, Luke](https://use-the-index-luke.com/) - Indexing guide
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Excellent reference
- [SQL Style Guide](https://www.sqlstyle.guide/) - Consistent formatting

### Tools
- **EXPLAIN visualizers**: explain.depesz.com, explain.dalibo.com
- **Query formatters**: sqlformat.org, poorsql.com
- **Practice platforms**: SQLZoo, LeetCode Database, HackerRank SQL

---

## 🔧 Dialect Notes

This guide is **dialect-agnostic** but notes differences where relevant:

| Feature | PostgreSQL | MySQL | SQL Server | SQLite |
|---------|------------|-------|------------|--------|
| **CTE Syntax** | ✅ Full | ✅ 8.0+ | ✅ Full | ✅ 3.8+ |
| **Window Functions** | ✅ Full | ✅ 8.0+ | ✅ Full | ✅ 3.25+ |
| **JSON Support** | ✅ JSONB | ✅ JSON | ✅ JSON | ✅ JSON1 |
| **UPSERT** | `ON CONFLICT` | `ON DUPLICATE KEY` | `MERGE` | `ON CONFLICT` |
| **LIMIT/OFFSET** | `LIMIT n OFFSET m` | `LIMIT m, n` | `OFFSET FETCH` | `LIMIT n OFFSET m` |

---

## ✅ How to Use This Guide

### For Each Topic:
1. **Read** the conceptual overview
2. **Study** the query examples
3. **Complete** exercises (🟢 → 🟡 → 🔴)
4. **Review** key takeaways
5. **Practice** on a real database

### Symbols Used:
- ⬜ Not Started | 🔄 In Progress | ✅ Completed
- 🟢 Easy | 🟡 Medium | 🔴 Hard
- 💡 Tip | ⚠️ Warning | 📝 Note
