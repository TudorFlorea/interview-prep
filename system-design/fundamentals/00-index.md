# System Design Fundamentals

> Master the core concepts and building blocks for designing distributed systems

[← Back to System Design](/system-design/00-index.md)

---

## 📊 Progress Dashboard

| # | Topic | Status | Difficulty | Key Concepts |
|---|-------|--------|------------|--------------|
| 01 | [Introduction & Framework](/system-design/fundamentals/01-introduction-and-framework.md) | ⬜ Not Started | 🟢 Foundational | Interview structure, RESHADED, assessment criteria |
| 02 | [Requirements Gathering](/system-design/fundamentals/02-requirements-gathering.md) | ⬜ Not Started | 🟢 Foundational | Functional/non-functional, scope definition |
| 03 | [Back-of-Envelope Calculations](/system-design/fundamentals/03-back-of-envelope-calculations.md) | ⬜ Not Started | 🟢 Foundational | Capacity estimation, latency numbers, QPS |
| 04 | [API Design](/system-design/fundamentals/04-api-design.md) | ⬜ Not Started | 🟢 Foundational | REST, GraphQL, gRPC, pagination, idempotency |
| 05 | [Data Modeling](/system-design/fundamentals/05-data-modeling.md) | ⬜ Not Started | 🟢 Foundational | Entities, relationships, normalization |
| 06 | [Databases](/system-design/fundamentals/06-databases.md) | ⬜ Not Started | 🟡 Intermediate | SQL vs NoSQL, ACID vs BASE, selection criteria |
| 07 | [Caching](/system-design/fundamentals/07-caching.md) | ⬜ Not Started | 🟡 Intermediate | Cache-aside, write-through, Redis, invalidation |
| 08 | [Load Balancing](/system-design/fundamentals/08-load-balancing.md) | ⬜ Not Started | 🟡 Intermediate | L4/L7, algorithms, health checks, sticky sessions |
| 09 | [Message Queues](/system-design/fundamentals/09-message-queues.md) | ⬜ Not Started | 🟡 Intermediate | Kafka, SQS, pub/sub, event sourcing |
| 10 | [Scaling Strategies](/system-design/fundamentals/10-scaling-strategies.md) | ⬜ Not Started | 🟡 Intermediate | Horizontal/vertical, stateless, auto-scaling |
| 11 | [Database Scaling](/system-design/fundamentals/11-database-scaling.md) | ⬜ Not Started | 🟡 Intermediate | Replication, sharding, read replicas |
| 12 | [Consistent Hashing](/system-design/fundamentals/12-consistent-hashing.md) | ⬜ Not Started | 🔴 Advanced | Hash rings, virtual nodes, rebalancing |
| 13 | [CAP Theorem](/system-design/fundamentals/13-cap-theorem.md) | ⬜ Not Started | 🔴 Advanced | Consistency models, partition tolerance |
| 14 | [Distributed Patterns](/system-design/fundamentals/14-distributed-patterns.md) | ⬜ Not Started | 🔴 Advanced | Leader election, consensus, sagas, locks |
| 15 | [Real-Time Communication](/system-design/fundamentals/15-real-time-communication.md) | ⬜ Not Started | 🟡 Intermediate | WebSockets, SSE, long polling, presence |
| 16 | [Search & Indexing](/system-design/fundamentals/16-search-and-indexing.md) | ⬜ Not Started | 🟡 Intermediate | Elasticsearch, inverted indexes, ranking |
| 17 | [Blob Storage & CDN](/system-design/fundamentals/17-blob-storage-cdn.md) | ⬜ Not Started | 🟡 Intermediate | S3, presigned URLs, edge caching |
| 18 | [Rate Limiting](/system-design/fundamentals/18-rate-limiting.md) | ⬜ Not Started | 🟡 Intermediate | Token bucket, sliding window, distributed |
| 19 | [Monitoring & Observability](/system-design/fundamentals/19-monitoring-observability.md) | ⬜ Not Started | 🟡 Intermediate | Metrics, logging, tracing, SLOs |
| 20 | [Fault Tolerance](/system-design/fundamentals/20-fault-tolerance.md) | ⬜ Not Started | 🔴 Advanced | Circuit breakers, retries, bulkheads |
| 21 | [Security](/system-design/fundamentals/21-security.md) | ⬜ Not Started | 🟡 Intermediate | AuthN/AuthZ, OAuth, encryption, API security |

---

## 🗺️ Topic Roadmap

### Phase 1: Interview Foundations (Week 1)
Build the essential skills to structure your system design interviews.

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTERVIEW FOUNDATIONS                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Introduction│──│ Requirements│──│ Back-of-Envelope Calcs │  │
│  │ & Framework │  │  Gathering  │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  How to structure   What to ask          Quick math for        │
│  45-60 min          and clarify          capacity estimates    │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Core Building Blocks (Week 2-3)
Master the fundamental components used in every system.

```
┌─────────────────────────────────────────────────────────────────┐
│                     CORE BUILDING BLOCKS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐    ┌───────────┐    ┌───────────────────────┐   │
│  │    API    │    │   Data    │    │      Databases        │   │
│  │   Design  │    │ Modeling  │    │   (SQL vs NoSQL)      │   │
│  └─────┬─────┘    └─────┬─────┘    └───────────┬───────────┘   │
│        │                │                      │               │
│        └────────────────┼──────────────────────┘               │
│                         ▼                                       │
│  ┌───────────┐    ┌───────────┐    ┌───────────────────────┐   │
│  │  Caching  │    │   Load    │    │    Message Queues     │   │
│  │           │◄───│ Balancing │───►│                       │   │
│  └───────────┘    └───────────┘    └───────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 3: Scaling Techniques (Week 4-5)
Learn how to scale from thousands to millions of users.

```
┌─────────────────────────────────────────────────────────────────┐
│                     SCALING TECHNIQUES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scaling Strategies          Database Scaling                   │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │   Horizontal    │         │   Replication   │               │
│  │   vs Vertical   │────────►│   & Sharding    │               │
│  └─────────────────┘         └────────┬────────┘               │
│                                       │                         │
│                                       ▼                         │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │    Consistent   │◄────────│   CAP Theorem   │               │
│  │     Hashing     │         │                 │               │
│  └─────────────────┘         └─────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 4: Advanced Distributed Systems (Week 6-7)
Deep dive into complex distributed system patterns.

```
┌─────────────────────────────────────────────────────────────────┐
│                   ADVANCED DISTRIBUTED SYSTEMS                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   Distributed   │    │    Real-Time    │                    │
│  │    Patterns     │    │  Communication  │                    │
│  └────────┬────────┘    └────────┬────────┘                    │
│           │                      │                              │
│           ▼                      ▼                              │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   Search &      │    │  Blob Storage   │                    │
│  │   Indexing      │    │     & CDN       │                    │
│  └─────────────────┘    └─────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 5: Operations & Reliability (Week 8)
Ensure your systems are production-ready.

```
┌─────────────────────────────────────────────────────────────────┐
│                   OPERATIONS & RELIABILITY                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐  ┌───────────────┐  ┌───────────┐  ┌─────────┐  │
│  │   Rate    │  │  Monitoring & │  │   Fault   │  │Security │  │
│  │ Limiting  │  │ Observability │  │ Tolerance │  │         │  │
│  └───────────┘  └───────────────┘  └───────────┘  └─────────┘  │
│        │               │                 │             │        │
│        └───────────────┴─────────────────┴─────────────┘        │
│                              │                                  │
│                              ▼                                  │
│                   Production-Ready Systems                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Concept Dependencies

Understanding how fundamentals connect helps you navigate complex problems:

```
                    ┌─────────────────────┐
                    │   Requirements &    │
                    │    Calculations     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌──────────┐     ┌───────────┐    ┌───────────┐
       │   API    │     │   Data    │    │  Database │
       │  Design  │     │ Modeling  │    │  Choice   │
       └────┬─────┘     └─────┬─────┘    └─────┬─────┘
            │                 │                │
            └─────────────────┼────────────────┘
                              ▼
       ┌──────────────────────┴──────────────────────┐
       │                                             │
       ▼                                             ▼
┌─────────────┐                              ┌─────────────┐
│   Caching   │                              │   Message   │
│             │                              │   Queues    │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       ▼                                            ▼
┌─────────────┐    ┌─────────────┐          ┌─────────────┐
│    Load     │───►│   Scaling   │◄─────────│  Database   │
│  Balancing  │    │ Strategies  │          │   Scaling   │
└─────────────┘    └──────┬──────┘          └─────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
       ┌───────────┐ ┌─────────┐ ┌───────────┐
       │ Consistent│ │   CAP   │ │Distributed│
       │  Hashing  │ │ Theorem │ │ Patterns  │
       └───────────┘ └─────────┘ └───────────┘
```

---

## 🎯 How to Use These Docs

### Study Approach
1. **Read actively** - Don't just read, sketch diagrams as you go
2. **Understand tradeoffs** - Every technology choice has pros and cons
3. **Connect concepts** - See how fundamentals apply to real problems
4. **Build intuition** - Know when to use which component

### For Each Topic
- Start with the **Overview** to understand the "why"
- Study the **Core Concepts** section thoroughly
- Review **Real-World Examples** for practical context
- Note the **Tradeoffs** and when to use alternatives
- Test yourself with the **Key Takeaways**

---

## 📚 Quick Reference by Use Case

| When You Need To... | Study These Topics |
|--------------------|-------------------|
| Structure your interview | [Introduction & Framework](/system-design/fundamentals/01-introduction-and-framework.md) |
| Estimate capacity | [Back-of-Envelope](/system-design/fundamentals/03-back-of-envelope-calculations.md) |
| Design API contracts | [API Design](/system-design/fundamentals/04-api-design.md) |
| Choose a database | [Databases](/system-design/fundamentals/06-databases.md), [Data Modeling](/system-design/fundamentals/05-data-modeling.md) |
| Speed up reads | [Caching](/system-design/fundamentals/07-caching.md), [CDN](/system-design/fundamentals/17-blob-storage-cdn.md) |
| Handle high traffic | [Load Balancing](/system-design/fundamentals/08-load-balancing.md), [Scaling](/system-design/fundamentals/10-scaling-strategies.md) |
| Decouple services | [Message Queues](/system-design/fundamentals/09-message-queues.md) |
| Scale your database | [Database Scaling](/system-design/fundamentals/11-database-scaling.md) |
| Distribute data evenly | [Consistent Hashing](/system-design/fundamentals/12-consistent-hashing.md) |
| Understand consistency | [CAP Theorem](/system-design/fundamentals/13-cap-theorem.md) |
| Coordinate services | [Distributed Patterns](/system-design/fundamentals/14-distributed-patterns.md) |
| Build real-time features | [Real-Time Communication](/system-design/fundamentals/15-real-time-communication.md) |
| Implement search | [Search & Indexing](/system-design/fundamentals/16-search-and-indexing.md) |
| Store files/media | [Blob Storage & CDN](/system-design/fundamentals/17-blob-storage-cdn.md) |
| Protect from abuse | [Rate Limiting](/system-design/fundamentals/18-rate-limiting.md) |
| Monitor production | [Observability](/system-design/fundamentals/19-monitoring-observability.md) |
| Handle failures | [Fault Tolerance](/system-design/fundamentals/20-fault-tolerance.md) |
| Secure the system | [Security](/system-design/fundamentals/21-security.md) |

---

## 📖 Related Sections

- [Design Problems](/system-design/problems/00-index.md) - Apply fundamentals to real systems
- [Databases Deep Dive](/databases/00-index.md) - Detailed database concepts
- [Networking](/networking/00-index.md) - Protocol and infrastructure details
