# Introduction & Framework

[← Back to Fundamentals](00-index.md)

---

## Overview

System design interviews assess your ability to design large-scale distributed systems. Unlike coding interviews that test algorithmic problem-solving, system design interviews evaluate your ability to make architectural decisions, communicate tradeoffs, and think about systems holistically.

This guide provides a structured framework for approaching any system design interview, regardless of the specific problem.

---

## 🎯 What Interviewers Are Looking For

### Assessment Criteria

| Dimension | What They Evaluate | Signs of Strength |
|-----------|-------------------|-------------------|
| **Problem Exploration** | Do you ask clarifying questions? | Identifies ambiguity, confirms scope |
| **Technical Breadth** | Do you know the building blocks? | References appropriate technologies |
| **Technical Depth** | Can you go deep on components? | Explains internals, handles edge cases |
| **System Thinking** | Do you see the big picture? | Considers scalability, reliability, cost |
| **Communication** | Can you explain clearly? | Structured approach, uses diagrams |
| **Tradeoff Analysis** | Do you understand pros/cons? | Discusses alternatives, justifies choices |

### Common Reasons Candidates Fail

| Mistake | Impact |
|---------|--------|
| ❌ Jumping to solutions without requirements | Solving the wrong problem |
| ❌ Ignoring non-functional requirements | Missing scalability, reliability |
| ❌ Not drawing diagrams | Confusing explanation |
| ❌ Staying too high-level | Appears superficial |
| ❌ Going too deep too early | Running out of time |
| ❌ Not discussing tradeoffs | Appears inexperienced |

---

## 📐 The RESHADED Framework

A systematic approach to structure your 45-60 minute interview:

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE RESHADED FRAMEWORK                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   R ──► Requirements        (5 min)   What are we building?    │
│   E ──► Entities            (2 min)   Core data models         │
│   S ──► System API          (5 min)   Interface contracts      │
│   H ──► High-Level Design   (15 min)  Architecture diagram     │
│   A ──► Articulate          (10 min)  Deep dive components     │
│   D ──► Decisions           (ongoing) Tradeoff discussions     │
│   E ──► Edge Cases          (5 min)   Failure scenarios        │
│   D ──► Discuss             (3 min)   Bottlenecks & next steps │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Requirements (5 minutes)

### Functional Requirements

These describe **what** the system should do. Ask about:

- **Core features**: What are the must-have functionalities?
- **User actions**: What can users do? (create, read, update, delete)
- **User types**: Are there different roles? (admin, regular user, guest)
- **Input/Output**: What data goes in and comes out?

**Example Questions:**
```
"Should users be able to edit their posts after publishing?"
"Do we need to support comments, or just the main content?"
"Should this work for both mobile and web clients?"
```

### Non-Functional Requirements

These describe **how well** the system should perform. Use the **FCC-SLEDS** mnemonic:

| Letter | Requirement | Key Questions |
|--------|-------------|---------------|
| **F** | Fault Tolerance | What happens when components fail? |
| **C** | CAP | Do we prioritize consistency or availability? |
| **C** | Compliance | Any regulatory requirements (GDPR, HIPAA, PCI)? |
| **S** | Scalability | How many users? Read/write ratio? |
| **L** | Latency | What response times are acceptable? |
| **E** | Environment | Cloud vs on-prem? Geographic distribution? |
| **D** | Durability | How important is data persistence? |
| **S** | Security | Authentication, authorization, encryption? |

### Capacity Estimation

Quick back-of-envelope math to understand scale:

```
Example: Twitter-like service

Users:
- 500M total users
- 100M daily active users (DAU)
- 10% of DAU post daily = 10M posts/day

Traffic:
- Posts: 10M / 86,400 = ~115 posts/second
- Reads: 100M users × 100 reads/day = 10B reads/day
- Read QPS: 10B / 86,400 = ~115,000 reads/second

Storage:
- Average post: 300 bytes text + metadata
- Daily: 10M × 300B = 3GB/day
- Yearly: 3GB × 365 = ~1TB/year (just text)
```

---

## Phase 2: Entities (2 minutes)

Define the core data models before designing the system:

```
┌─────────────────────────────────────────────────────────────────┐
│                      CORE ENTITIES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User                    Post                   Follow          │
│  ┌─────────────────┐    ┌─────────────────┐   ┌─────────────┐  │
│  │ id: UUID        │    │ id: UUID        │   │ follower_id │  │
│  │ username: str   │    │ user_id: UUID   │   │ followee_id │  │
│  │ email: str      │    │ content: text   │   │ created_at  │  │
│  │ created_at: ts  │    │ created_at: ts  │   └─────────────┘  │
│  └─────────────────┘    │ media_urls: []  │                    │
│                         └─────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Tips:**
- Focus on the 3-5 most important entities
- Note relationships (1:1, 1:N, N:M)
- Consider what fields are needed for core features

---

## Phase 3: System API (5 minutes)

Define the interface between clients and your system:

### REST API Example

```
POST   /api/v1/posts           Create a post
GET    /api/v1/posts/:id       Get a specific post
DELETE /api/v1/posts/:id       Delete a post
GET    /api/v1/users/:id/feed  Get user's feed

POST   /api/v1/users/:id/follow    Follow a user
DELETE /api/v1/users/:id/follow    Unfollow a user
```

### Key API Design Considerations

| Aspect | Consideration |
|--------|--------------|
| **Pagination** | Cursor-based vs offset-based |
| **Rate Limiting** | Requests per minute/hour |
| **Authentication** | JWT, OAuth, API keys |
| **Versioning** | URL path, headers, query params |
| **Idempotency** | Safe to retry? Idempotency keys? |

---

## Phase 4: High-Level Design (15 minutes)

This is the core of your interview. Draw the architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HIGH-LEVEL ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌──────────┐         ┌─────────────┐         ┌─────────────────┐    │
│    │  Client  │────────►│    Load     │────────►│    API          │    │
│    │  (App)   │         │  Balancer   │         │    Gateway      │    │
│    └──────────┘         └─────────────┘         └────────┬────────┘    │
│                                                          │              │
│                              ┌───────────────────────────┼───────┐      │
│                              ▼                           ▼       ▼      │
│                    ┌─────────────────┐         ┌─────────────────┐      │
│                    │   Post Service  │         │  Feed Service   │      │
│                    └────────┬────────┘         └────────┬────────┘      │
│                             │                           │               │
│              ┌──────────────┼───────────────────────────┤               │
│              ▼              ▼                           ▼               │
│    ┌─────────────┐  ┌─────────────┐           ┌─────────────────┐       │
│    │    Cache    │  │   Message   │           │    Database     │       │
│    │   (Redis)   │  │    Queue    │           │   (Postgres)    │       │
│    └─────────────┘  └─────────────┘           └─────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Selection Guidelines

| When You Need... | Consider Using... |
|-----------------|-------------------|
| Request routing | Load Balancer, API Gateway |
| Data storage | SQL (Postgres), NoSQL (DynamoDB, Cassandra) |
| Fast reads | Cache (Redis, Memcached) |
| Async processing | Message Queue (Kafka, SQS, RabbitMQ) |
| File storage | Blob Store (S3, GCS) |
| Fast delivery | CDN (CloudFront, Cloudflare) |
| Search | Elasticsearch, Algolia |
| Real-time | WebSockets, Server-Sent Events |

---

## Phase 5: Articulate Deep Dives (10 minutes)

Pick 2-3 components and go deep. Common deep dive areas:

### Database Design
- Schema design and indexing strategy
- Sharding approach
- Read replicas

### Caching Strategy
- What to cache?
- Cache invalidation approach
- Cache-aside vs write-through

### Scaling Bottlenecks
- Where will you hit limits first?
- How to horizontally scale?

### Failure Handling
- What if this component fails?
- How to ensure data consistency?

**Example Deep Dive: Feed Generation**

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEED GENERATION APPROACHES                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Option A: Pull Model (Read-heavy)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ When user requests feed:                                 │   │
│  │ 1. Get all followees                                     │   │
│  │ 2. Fetch recent posts from each                          │   │
│  │ 3. Merge and sort                                        │   │
│  │ 4. Return top N                                          │   │
│  │                                                          │   │
│  │ ✅ Simple, always fresh                                  │   │
│  │ ❌ Slow for users following many accounts                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Option B: Push Model (Write-heavy) - Fan-out                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ When user posts:                                         │   │
│  │ 1. Write to post table                                   │   │
│  │ 2. Push to all followers' feed caches                    │   │
│  │                                                          │   │
│  │ ✅ Fast reads                                            │   │
│  │ ❌ Celebrity problem (millions of followers)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Option C: Hybrid (Best of both)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ - Regular users: Push model                              │   │
│  │ - Celebrities (>10k followers): Pull model               │   │
│  │ - Merge at read time                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 6: Decisions & Tradeoffs (Ongoing)

Throughout the interview, explicitly discuss tradeoffs:

### The Tradeoff Template

```
"I'm choosing [OPTION A] because [REASON], 
but the tradeoff is [DOWNSIDE]. 
An alternative would be [OPTION B] which would give us [BENEFIT] 
but at the cost of [COST]."
```

### Common Tradeoffs

| Decision | Option A | Option B |
|----------|----------|----------|
| Consistency vs Availability | Strong consistency (CP) | Eventual consistency (AP) |
| Latency vs Throughput | Optimize for speed | Optimize for volume |
| Storage vs Compute | Store pre-computed results | Compute on demand |
| Simplicity vs Performance | Simple architecture | Optimized but complex |
| Cost vs Reliability | Fewer replicas | More redundancy |

---

## Phase 7: Edge Cases (5 minutes)

Demonstrate thoroughness by considering failure scenarios:

### Questions to Ask Yourself

- What if this service goes down?
- What if the database is unavailable?
- What if we get 10x normal traffic?
- What if a user tries to abuse the system?
- What about data consistency during failures?

### Example Edge Case Discussion

```
Scenario: What if the cache goes down?

1. Detection: Health checks fail, trigger alert
2. Mitigation: 
   - Circuit breaker prevents cascade
   - Requests fall through to database
3. Impact:
   - Higher latency (cache miss)
   - Increased DB load
4. Recovery:
   - Cache restarts, warms up gradually
   - Consider pre-warming popular keys
```

---

## Phase 8: Discuss Bottlenecks (3 minutes)

End by identifying where the system might break:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOTTLENECK ANALYSIS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Design Bottlenecks:                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Database writes - Single primary can handle ~10K QPS  │  │
│  │ 2. Feed generation - Celebrity accounts cause hot spots  │  │
│  │ 3. Image storage - Need CDN for global distribution      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Future Improvements (if we had more time):                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Shard database by user_id                             │  │
│  │ 2. Implement hybrid fan-out for celebrities              │  │
│  │ 3. Add geographic load balancing                         │  │
│  │ 4. Implement rate limiting per user                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Interview Execution Tips

### Before the Interview

1. **Practice with a timer** - 45 minutes goes fast
2. **Have a drawing tool ready** - Excalidraw, whiteboard, paper
3. **Know your numbers** - Latency, storage, throughput benchmarks

### During the Interview

1. **Think out loud** - Let interviewer follow your reasoning
2. **Draw early and often** - Visual communication is clearer
3. **Check in with interviewer** - "Does this level of detail make sense?"
4. **Take notes** - Write down requirements as you clarify them

### Time Management

| Phase | Time | Checkpoint |
|-------|------|------------|
| Requirements | 5 min | "Are these requirements complete?" |
| Entities + API | 7 min | "Should I proceed to high-level design?" |
| High-Level | 15 min | "Which area should I deep dive into?" |
| Deep Dives | 10 min | "Are there other areas you'd like to explore?" |
| Wrap-up | 8 min | "Here are the bottlenecks and next steps" |

---

## 📊 Common System Design Patterns

### Pattern Categories

| Category | Patterns | When to Use |
|----------|----------|-------------|
| **Data** | Sharding, Replication, Partitioning | Scale data layer |
| **Communication** | Sync/Async, Pub/Sub, Event-driven | Decouple services |
| **Reliability** | Circuit Breaker, Retry, Bulkhead | Handle failures |
| **Performance** | Caching, CDN, Pre-computation | Reduce latency |
| **Consistency** | 2PC, Saga, CQRS | Maintain data integrity |

---

## ✅ Key Takeaways

1. **Follow a structured framework** - RESHADED keeps you organized
2. **Start with requirements** - Solve the right problem
3. **Draw diagrams** - Visual communication is essential
4. **Discuss tradeoffs explicitly** - Show engineering maturity
5. **Go deep on 2-3 areas** - Demonstrate depth, not just breadth
6. **Consider failure cases** - Production systems fail
7. **Know your numbers** - Back-of-envelope calculations matter
8. **Practice, practice, practice** - Fluency comes from repetition

---

## 📚 Related Topics

- [Requirements Gathering](02-requirements-gathering.md) - Deep dive on scoping
- [Back-of-Envelope Calculations](03-back-of-envelope-calculations.md) - Capacity estimation
- [API Design](04-api-design.md) - Designing system interfaces
