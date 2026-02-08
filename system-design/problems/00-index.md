# System Design Problems

> Practice designing real-world systems from scratch

[← Back to System Design](/system-design/00-index.md)

---

## 📊 Progress Dashboard

| # | Problem | Status | Difficulty | Key Concepts |
|---|---------|--------|------------|--------------|
| 01 | [URL Shortener](/system-design/problems/01-url-shortener.md) | ⬜ Not Started | 🟢 Foundational | Hashing, base62, read-heavy, database design |
| 02 | [Rate Limiter](/system-design/problems/02-rate-limiter.md) | ⬜ Not Started | 🟢 Foundational | Token bucket, sliding window, distributed |
| 03 | [Twitter Feed](/system-design/problems/03-twitter-feed.md) | ⬜ Not Started | 🟡 Intermediate | Fan-out, timeline caching, pub/sub |
| 04 | [Instagram](/system-design/problems/04-instagram.md) | ⬜ Not Started | 🟡 Intermediate | Photo storage, CDN, feed ranking, social graph |
| 05 | [YouTube](/system-design/problems/05-youtube.md) | ⬜ Not Started | 🟡 Intermediate | Video transcoding, adaptive streaming, chunked upload |
| 06 | [Uber](/system-design/problems/06-uber.md) | ⬜ Not Started | 🟡 Intermediate | Geospatial indexing, matching, real-time location |
| 07 | [WhatsApp](/system-design/problems/07-whatsapp.md) | ⬜ Not Started | 🟡 Intermediate | WebSockets, message delivery, E2E encryption |
| 08 | [Dropbox](/system-design/problems/08-dropbox.md) | ⬜ Not Started | 🟡 Intermediate | File sync, chunking, deduplication, conflict resolution |
| 09 | [Notification System](/system-design/problems/09-notification-system.md) | ⬜ Not Started | 🟡 Intermediate | Multi-channel delivery, push infrastructure |
| 10 | [Web Crawler](/system-design/problems/10-web-crawler.md) | ⬜ Not Started | 🟡 Intermediate | Distributed crawling, URL frontier, politeness |
| 11 | [Ticketmaster](/system-design/problems/11-ticketmaster.md) | ⬜ Not Started | 🔴 Advanced | Distributed locks, inventory, high contention |
| 12 | [Google Docs](/system-design/problems/12-google-docs.md) | ⬜ Not Started | 🔴 Advanced | OT/CRDT, real-time collaboration, versioning |
| 13 | [Search Autocomplete](/system-design/problems/13-search-autocomplete.md) | ⬜ Not Started | 🟡 Intermediate | Trie structures, prefix matching, ranking |
| 14 | [Distributed Cache](/system-design/problems/14-distributed-cache.md) | ⬜ Not Started | 🔴 Advanced | Consistent hashing, eviction, replication |
| 15 | [Job Scheduler](/system-design/problems/15-job-scheduler.md) | ⬜ Not Started | 🔴 Advanced | Task queues, distributed cron, exactly-once |
| 16 | [Payment System](/system-design/problems/16-payment-system.md) | ⬜ Not Started | 🔴 Advanced | ACID, idempotency, reconciliation, PCI |
| 17 | [Metrics System](/system-design/problems/17-metrics-system.md) | ⬜ Not Started | 🔴 Advanced | Time-series DB, aggregation pipelines |
| 18 | [Ad Click Aggregator](/system-design/problems/18-ad-click-aggregator.md) | ⬜ Not Started | 🔴 Advanced | Stream processing, deduplication |
| 19 | [Key-Value Store](/system-design/problems/19-key-value-store.md) | ⬜ Not Started | 🔴 Advanced | Consensus, partitioning, replication |
| 20 | [News Feed Ranking](/system-design/problems/20-news-feed-ranking.md) | ⬜ Not Started | 🔴 Advanced | ML integration, personalization, A/B testing |
| 21 | [Amazon Locker](/system-design/problems/21-amazon-locker.md) | ⬜ Not Started | 🟡 Intermediate | Locker allocation, reservation system, size matching |

---

## 🗺️ Problem Categories

### Tier 1: Must-Know Problems 🎯
Start here. These problems cover the most common patterns and are frequently asked in interviews.

| Problem | Why It's Important |
|---------|-------------------|
| [URL Shortener](/system-design/problems/01-url-shortener.md) | Classic intro problem. Covers hashing, database design, read-heavy systems |
| [Rate Limiter](/system-design/problems/02-rate-limiter.md) | Fundamental pattern. Often appears as a component in larger systems |
| [Twitter Feed](/system-design/problems/03-twitter-feed.md) | Fan-out problem. Teaches timeline generation and caching strategies |

### Tier 2: Core Interview Problems 📋
These are the bread-and-butter problems you'll encounter at most companies.

| Problem | Key Learning |
|---------|-------------|
| [Instagram](/system-design/problems/04-instagram.md) | Media storage, CDN, social features |
| [YouTube](/system-design/problems/05-youtube.md) | Video processing, streaming, massive scale |
| [Uber](/system-design/problems/06-uber.md) | Geospatial systems, real-time matching |
| [WhatsApp](/system-design/problems/07-whatsapp.md) | Real-time messaging, delivery guarantees |
| [Dropbox](/system-design/problems/08-dropbox.md) | File sync, conflict resolution |
| [Notification System](/system-design/problems/09-notification-system.md) | Multi-channel delivery, reliability |
| [Web Crawler](/system-design/problems/10-web-crawler.md) | Distributed processing, politeness |
| [Search Autocomplete](/system-design/problems/13-search-autocomplete.md) | Trie structures, low-latency |
| [Amazon Locker](/system-design/problems/21-amazon-locker.md) | Physical resource allocation, reservations |

### Tier 3: Advanced Problems 🔥
These require deeper knowledge of distributed systems. Great for senior roles.

| Problem | Advanced Concepts |
|---------|------------------|
| [Ticketmaster](/system-design/problems/11-ticketmaster.md) | High contention, distributed locking |
| [Google Docs](/system-design/problems/12-google-docs.md) | CRDTs, operational transformation |
| [Distributed Cache](/system-design/problems/14-distributed-cache.md) | Consistent hashing, cache coherence |
| [Job Scheduler](/system-design/problems/15-job-scheduler.md) | Exactly-once execution, coordination |
| [Payment System](/system-design/problems/16-payment-system.md) | ACID guarantees, idempotency |
| [Key-Value Store](/system-design/problems/19-key-value-store.md) | Consensus protocols, replication |

### Tier 4: Specialized Problems 📊
These focus on specific domains like analytics, ML, or advertising.

| Problem | Domain |
|---------|--------|
| [Metrics System](/system-design/problems/17-metrics-system.md) | Time-series data, aggregation |
| [Ad Click Aggregator](/system-design/problems/18-ad-click-aggregator.md) | Stream processing, deduplication |
| [News Feed Ranking](/system-design/problems/20-news-feed-ranking.md) | ML integration, personalization |

---

## 🔗 Problems by Fundamental Concept

Use this to find problems that practice specific concepts:

### Databases & Data Modeling
| Problem | Database Focus |
|---------|---------------|
| [URL Shortener](/system-design/problems/01-url-shortener.md) | Read-heavy, simple schema |
| [Twitter Feed](/system-design/problems/03-twitter-feed.md) | Denormalization for reads |
| [Payment System](/system-design/problems/16-payment-system.md) | ACID, transactions |
| [Key-Value Store](/system-design/problems/19-key-value-store.md) | Building a database from scratch |

### Caching
| Problem | Caching Focus |
|---------|--------------|
| [Twitter Feed](/system-design/problems/03-twitter-feed.md) | Timeline caching, cache invalidation |
| [Instagram](/system-design/problems/04-instagram.md) | CDN for media, feed caching |
| [YouTube](/system-design/problems/05-youtube.md) | Video CDN, metadata caching |
| [Distributed Cache](/system-design/problems/14-distributed-cache.md) | Building a cache from scratch |

### Message Queues & Async Processing
| Problem | Async Focus |
|---------|------------|
| [Notification System](/system-design/problems/09-notification-system.md) | Queue-based delivery |
| [YouTube](/system-design/problems/05-youtube.md) | Video processing pipeline |
| [Web Crawler](/system-design/problems/10-web-crawler.md) | URL frontier queue |
| [Job Scheduler](/system-design/problems/15-job-scheduler.md) | Delayed execution |

### Real-Time Systems
| Problem | Real-Time Focus |
|---------|----------------|
| [WhatsApp](/system-design/problems/07-whatsapp.md) | WebSocket messaging |
| [Uber](/system-design/problems/06-uber.md) | Real-time location tracking |
| [Google Docs](/system-design/problems/12-google-docs.md) | Collaborative editing |
| [Ticketmaster](/system-design/problems/11-ticketmaster.md) | Real-time inventory |

### Distributed Systems
| Problem | Distributed Focus |
|---------|------------------|
| [Rate Limiter](/system-design/problems/02-rate-limiter.md) | Distributed rate limiting |
| [Distributed Cache](/system-design/problems/14-distributed-cache.md) | Partitioning, replication |
| [Key-Value Store](/system-design/problems/19-key-value-store.md) | Consensus, consistency |
| [Job Scheduler](/system-design/problems/15-job-scheduler.md) | Exactly-once execution |

### Search & Indexing
| Problem | Search Focus |
|---------|-------------|
| [Search Autocomplete](/system-design/problems/13-search-autocomplete.md) | Prefix matching, ranking |
| [Web Crawler](/system-design/problems/10-web-crawler.md) | Building a search index |
| [Instagram](/system-design/problems/04-instagram.md) | Hashtag search |

### Scale & Performance
| Problem | Scale Focus |
|---------|------------|
| [YouTube](/system-design/problems/05-youtube.md) | Massive read traffic |
| [Twitter Feed](/system-design/problems/03-twitter-feed.md) | Celebrity problem, fan-out |
| [Ad Click Aggregator](/system-design/problems/18-ad-click-aggregator.md) | High write throughput |
| [Metrics System](/system-design/problems/17-metrics-system.md) | Time-series at scale |

---

## 📐 Problem Complexity Map

```
                        COMPLEXITY
         Low ─────────────────────────────► High
         │
    L    │  URL Shortener    Rate Limiter
    O    │       │                │
    W    │       ▼                ▼
         │  ─────────────────────────────────
         │
    ↓    │  Twitter Feed   Instagram    Uber
         │       │             │          │
    S    │       ▼             ▼          ▼
    C    │  WhatsApp      YouTube    Dropbox
    A    │       │             │          │
    L    │       ▼             ▼          ▼
    E    │  ─────────────────────────────────
         │
    ↓    │  Ticketmaster  Google Docs  Payment
         │       │             │          │
    H    │       ▼             ▼          ▼
    I    │  Job Scheduler  KV Store   Metrics
    G    │
    H    │
         ▼
```

---

## 🎯 How to Approach Each Problem

### The RESHADED Framework (45 min interview)

| Phase | Time | What to Do |
|-------|------|------------|
| **R**equirements | 5 min | Clarify scope, users, scale |
| **E**ntities | 2 min | Define core data models |
| **S**ystem API | 5 min | Design main endpoints |
| **H**igh-Level Design | 15 min | Draw architecture diagram |
| **A**rticulate | 10 min | Deep dive on 2-3 components |
| **D**ecisions | - | Explain tradeoffs throughout |
| **E**dge Cases | 5 min | Handle failure scenarios |
| **D**iscuss | 3 min | Identify bottlenecks |

### For Each Problem Doc

Each problem follows a consistent structure:

1. **Problem Statement** - What are we building?
2. **Requirements** - Functional + non-functional
3. **Capacity Estimation** - Back-of-envelope math
4. **Core Entities** - Data model
5. **API Design** - Main endpoints
6. **High-Level Architecture** - System diagram
7. **Deep Dives** - Detailed component design
8. **Scaling Considerations** - How to handle growth
9. **Tradeoffs & Alternatives** - Other approaches
10. **Key Takeaways** - Summary

---

## 📚 Recommended Study Order

### Week 1-2: Foundations
1. ✅ Study [Introduction & Framework](/system-design/fundamentals/01-introduction-and-framework.md)
2. ✅ Study [Back-of-Envelope Calculations](/system-design/fundamentals/03-back-of-envelope-calculations.md)
3. 🎯 Solve [URL Shortener](/system-design/problems/01-url-shortener.md)
4. 🎯 Solve [Rate Limiter](/system-design/problems/02-rate-limiter.md)

### Week 3-4: Core Patterns
1. ✅ Study [Caching](/system-design/fundamentals/07-caching.md), [Message Queues](/system-design/fundamentals/09-message-queues.md)
2. 🎯 Solve [Twitter Feed](/system-design/problems/03-twitter-feed.md)
3. 🎯 Solve [Instagram](/system-design/problems/04-instagram.md)
4. 🎯 Solve [Notification System](/system-design/problems/09-notification-system.md)

### Week 5-6: Real-Time & Media
1. ✅ Study [Real-Time Communication](/system-design/fundamentals/15-real-time-communication.md), [Blob Storage](/system-design/fundamentals/17-blob-storage-and-cdn.md)
2. 🎯 Solve [YouTube](/system-design/problems/05-youtube.md)
3. 🎯 Solve [WhatsApp](/system-design/problems/07-whatsapp.md)
4. 🎯 Solve [Dropbox](/system-design/problems/08-dropbox.md)

### Week 7-8: Geospatial & Search
1. ✅ Study [Search & Indexing](/system-design/fundamentals/16-search-and-indexing.md)
2. 🎯 Solve [Uber](/system-design/problems/06-uber.md)
3. 🎯 Solve [Search Autocomplete](/system-design/problems/13-search-autocomplete.md)
4. 🎯 Solve [Web Crawler](/system-design/problems/10-web-crawler.md)

### Week 9-10: Advanced Systems
1. ✅ Study [Distributed Patterns](/system-design/fundamentals/14-distributed-patterns.md), [CAP Theorem](/system-design/fundamentals/13-cap-theorem.md)
2. 🎯 Solve [Ticketmaster](/system-design/problems/11-ticketmaster.md)
3. 🎯 Solve [Google Docs](/system-design/problems/12-google-docs.md)
4. 🎯 Solve [Payment System](/system-design/problems/16-payment-system.md)

### Week 11-12: Infrastructure & Analytics
1. 🎯 Solve [Distributed Cache](/system-design/problems/14-distributed-cache.md)
2. 🎯 Solve [Key-Value Store](/system-design/problems/19-key-value-store.md)
3. 🎯 Solve [Job Scheduler](/system-design/problems/15-job-scheduler.md)
4. 🎯 Solve [Metrics System](/system-design/problems/17-metrics-system.md)

---

## 📖 Related Sections

- [System Design Fundamentals](/system-design/fundamentals/00-index.md) - Core concepts
- [Databases](/databases/00-index.md) - Database deep dive
- [Networking](/networking/00-index.md) - Protocol knowledge
