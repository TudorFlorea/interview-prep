# CAP Theorem and Consistency Models

[← Back to Fundamentals](00-index.md)

---

## Overview

The CAP theorem states that distributed systems can only guarantee two of three properties: Consistency, Availability, and Partition Tolerance. Understanding CAP and consistency models is crucial for making informed trade-offs in system design.

---

## 📐 The CAP Theorem

### The Three Properties

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAP THEOREM                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                     Consistency (C)                             │
│                          ╱╲                                     │
│                         ╱  ╲                                    │
│                        ╱    ╲                                   │
│                       ╱ Pick ╲                                  │
│                      ╱  Two   ╲                                 │
│                     ╱          ╲                                │
│                    ╱            ╲                               │
│    Availability (A)──────────────Partition                      │
│                                   Tolerance (P)                 │
│                                                                 │
│  C: Every read receives the most recent write or an error       │
│  A: Every request receives a response (no timeout/error)        │
│  P: System operates despite network partitions                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why Only Two?

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARTITION SCENARIO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Network partition occurs between Node 1 and Node 2:            │
│                                                                 │
│  ┌──────────┐      ╳ ╳ ╳ ╳ ╳      ┌──────────┐                 │
│  │  Node 1  │      ╳ NETWORK╳     │  Node 2  │                 │
│  │  Data: A │      ╳ PARTITION    │  Data: A │                 │
│  └────┬─────┘      ╳ ╳ ╳ ╳ ╳      └────┬─────┘                 │
│       │                                │                        │
│    Write B                          Read?                       │
│       │                                │                        │
│       ▼                                ▼                        │
│  ┌──────────┐                     ┌──────────┐                 │
│  │ Data: B  │                     │ Data: A  │                 │
│  └──────────┘                     └──────────┘                 │
│                                                                 │
│  Now what? The system must choose:                              │
│                                                                 │
│  Option 1 - Consistency (CP):                                   │
│    Node 2 returns ERROR - "I can't verify latest data"          │
│    ✓ Consistent  ✗ Available                                    │
│                                                                 │
│  Option 2 - Availability (AP):                                  │
│    Node 2 returns A - "Here's what I have"                      │
│    ✗ Consistent  ✓ Available                                    │
│                                                                 │
│  You cannot have both during a partition!                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ CP vs AP Systems

### CP Systems (Consistency + Partition Tolerance)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CP SYSTEMS                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Behavior during partition:                                     │
│  - Refuse to serve requests if uncertain about consistency      │
│  - May return errors or timeouts                                │
│  - Guarantees you never see stale data                          │
│                                                                 │
│  Examples:                                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Database       │ Notes                                  │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ MongoDB        │ With majority write concern            │    │
│  │ Redis Cluster  │ During master election                 │    │
│  │ HBase          │ Strong consistency for row ops         │    │
│  │ Zookeeper      │ Leader-based, CP design                │    │
│  │ etcd           │ Raft consensus                         │    │
│  │ Spanner        │ TrueTime, strong consistency           │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Best for:                                                      │
│  - Financial transactions                                       │
│  - Inventory management                                         │
│  - Booking systems (avoid double-booking)                       │
│  - Leader election                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### AP Systems (Availability + Partition Tolerance)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AP SYSTEMS                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Behavior during partition:                                     │
│  - Always respond, even with potentially stale data             │
│  - Accept writes on either side of partition                    │
│  - Resolve conflicts after partition heals                      │
│                                                                 │
│  Examples:                                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Database       │ Notes                                  │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ Cassandra      │ Tunable consistency, often used AP     │    │
│  │ DynamoDB       │ Eventually consistent reads            │    │
│  │ CouchDB        │ Multi-master, conflict resolution      │    │
│  │ Riak           │ Vector clocks for conflicts            │    │
│  │ DNS            │ Eventual consistency by design         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Best for:                                                      │
│  - Social media feeds                                           │
│  - Shopping carts                                               │
│  - User preferences                                             │
│  - Analytics/metrics                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What About CA?

```
┌─────────────────────────────────────────────────────────────────┐
│                    CA SYSTEMS?                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CA = Consistency + Availability (no Partition Tolerance)       │
│                                                                 │
│  In theory: Possible if you never have network partitions       │
│  In practice: Network is ALWAYS unreliable                      │
│                                                                 │
│  Traditional single-node databases (PostgreSQL, MySQL):         │
│  - CA when running on single node                               │
│  - But then you have no fault tolerance                         │
│  - Network partitions don't apply to single node                │
│                                                                 │
│  Reality check:                                                 │
│  - Networks WILL partition (CAP is about distributed systems)   │
│  - You MUST handle partitions                                   │
│  - Therefore: Choose between CP and AP                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Consistency Models

### Consistency Spectrum

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONSISTENCY SPECTRUM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Strong ◄────────────────────────────────────────────► Weak     │
│                                                                 │
│  ┌──────────────┬──────────────┬──────────────┬─────────────┐  │
│  │  Lineariz-   │   Sequential │   Causal     │  Eventual   │  │
│  │  ability     │   Consistency│   Consistency│  Consistency│  │
│  └──────────────┴──────────────┴──────────────┴─────────────┘  │
│                                                                 │
│  Strongest                                          Weakest     │
│  Most latency                                    Least latency  │
│  Least available                              Most available   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Strong Consistency (Linearizability)

```
┌─────────────────────────────────────────────────────────────────┐
│                    LINEARIZABILITY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Definition: All operations appear to execute atomically        │
│  in some sequential order consistent with real-time ordering    │
│                                                                 │
│  Timeline:                                                      │
│  ────────────────────────────────────────────►                  │
│                                                                 │
│  Client 1:  ─────[Write X=5]──────────────────                  │
│                          │                                      │
│  Client 2:  ─────────────│────[Read X]────────                  │
│                          │        │                             │
│                          ▼        ▼                             │
│                    Write complete  MUST return 5                │
│                                                                 │
│  If read starts after write completes, read MUST see write      │
│                                                                 │
│  Examples: Spanner, CockroachDB, Zookeeper                     │
│  Cost: High latency (coordination required)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Sequential Consistency

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEQUENTIAL CONSISTENCY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Definition: All operations appear in some sequential order,    │
│  and each client's operations appear in program order           │
│                                                                 │
│  Difference from linearizability:                               │
│  - Real-time ordering NOT required                              │
│  - Just needs consistent global order                           │
│                                                                 │
│  Client 1: Write A, Write B (must appear in this order)         │
│  Client 2: Read A, Read B                                       │
│                                                                 │
│  Valid orderings:                                               │
│  - Write A → Write B → Read A → Read B ✓                        │
│  - Write A → Read A → Write B → Read B ✓                        │
│  - Read A → Write A → ... ✗ (can't read before write)           │
│                                                                 │
│  Examples: Memory models in many programming languages          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Causal Consistency

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAUSAL CONSISTENCY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Definition: Operations that are causally related must be       │
│  seen in the same order by all. Concurrent operations may       │
│  be seen in different orders.                                   │
│                                                                 │
│  Example - Social Media:                                        │
│  ─────────────────────────────────────────                      │
│  Alice posts: "I got the job!"                                  │
│  Bob replies: "Congratulations!"                                │
│                                                                 │
│  Causal relationship: Reply depends on post                     │
│  Everyone MUST see post before reply                            │
│                                                                 │
│  Concurrent (no causal relationship):                           │
│  Alice changes profile photo                                    │
│  Charlie posts about weather                                    │
│  → These can appear in any order to different users            │
│                                                                 │
│  Examples: MongoDB read concern "majority"                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Eventual Consistency

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENTUAL CONSISTENCY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Definition: If no new updates, all replicas will               │
│  eventually converge to the same value                          │
│                                                                 │
│  Timeline:                                                      │
│  ────────────────────────────────────────────►                  │
│                                                                 │
│  Write X=5                                                      │
│      │                                                          │
│      ▼                                                          │
│  Replica 1: ●─[X=5]───────────────────[X=5]                    │
│  Replica 2: ●───────[X=5]─────────────[X=5]                    │
│  Replica 3: ●─────────────[X=5]───────[X=5]                    │
│             │    │    │    │    │                               │
│             │    │    │    └ Eventual convergence               │
│             │    │    └ Stale read possible                     │
│             │    └ Stale read possible                          │
│             └ Write                                             │
│                                                                 │
│  Read anytime → May get stale value                             │
│  Wait long enough → Get latest value                            │
│                                                                 │
│  Examples: DNS, S3, DynamoDB (default), Cassandra (ONE)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎛️ Tunable Consistency

Many databases let you choose consistency per operation.

### Cassandra Consistency Levels

```
┌─────────────────────────────────────────────────────────────────┐
│                    CASSANDRA CONSISTENCY                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Replication Factor: 3 (data on 3 nodes)                        │
│                                                                 │
│  Write Consistency Levels:                                      │
│  ┌─────────┬────────────────────────────────────────────────┐  │
│  │ Level   │ Behavior                                       │  │
│  ├─────────┼────────────────────────────────────────────────┤  │
│  │ ONE     │ Wait for 1 replica to acknowledge              │  │
│  │ QUORUM  │ Wait for majority (2 of 3)                     │  │
│  │ ALL     │ Wait for all replicas (3 of 3)                 │  │
│  └─────────┴────────────────────────────────────────────────┘  │
│                                                                 │
│  Read Consistency Levels:                                       │
│  ┌─────────┬────────────────────────────────────────────────┐  │
│  │ Level   │ Behavior                                       │  │
│  ├─────────┼────────────────────────────────────────────────┤  │
│  │ ONE     │ Read from 1 replica (fastest, may be stale)    │  │
│  │ QUORUM  │ Read from majority, return latest              │  │
│  │ ALL     │ Read from all, return latest                   │  │
│  └─────────┴────────────────────────────────────────────────┘  │
│                                                                 │
│  Strong consistency: Write QUORUM + Read QUORUM                 │
│  (W + R > N guarantees overlap)                                 │
│                                                                 │
│  Example: N=3, W=2, R=2                                         │
│  Write touches: 2 nodes                                         │
│  Read touches:  2 nodes                                         │
│  At least 1 node has latest → read sees latest                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Read-Your-Writes Consistency

```csharp
// Problem: User updates profile, then refreshes and sees old data

// Solution 1: Read from primary after write
public async Task<User> UpdateProfile(ProfileUpdate update)
{
    await _database.Write(update);
    return await _database.ReadFromPrimary(update.UserId);
}

// Solution 2: Session token with version
public async Task<User> GetProfile(string userId, long minVersion)
{
    var user = await _database.Read(userId);
    if (user.Version < minVersion)
    {
        // Read from primary to ensure we have latest
        user = await _database.ReadFromPrimary(userId);
    }
    return user;
}

// Solution 3: Sticky sessions to same replica
// Load balancer routes user to same node within session
```

---

## 🔀 PACELC Extension

```
┌─────────────────────────────────────────────────────────────────┐
│                    PACELC THEOREM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CAP only addresses behavior during partitions.                 │
│  PACELC extends to normal operation:                            │
│                                                                 │
│  P: During Partition → choose Availability or Consistency       │
│  E: Else (normal operation) → choose Latency or Consistency     │
│                                                                 │
│  Classification:                                                │
│  ┌────────────────┬──────────────────────────────────────────┐ │
│  │ System         │ Classification                            │ │
│  ├────────────────┼──────────────────────────────────────────┤ │
│  │ DynamoDB       │ PA/EL (Available + Low Latency)           │ │
│  │ Cassandra      │ PA/EL (default), tunable to PC/EC         │ │
│  │ MongoDB        │ PA/EC (default), tunable                  │ │
│  │ Spanner        │ PC/EC (Consistent, accepts latency)       │ │
│  │ CockroachDB    │ PC/EC                                      │ │
│  └────────────────┴──────────────────────────────────────────┘ │
│                                                                 │
│  PA/EL: "Fast always" - social media, caching                   │
│  PC/EC: "Correct always" - banking, inventory                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Choosing Consistency for Your Use Case

### Decision Matrix

| Use Case | Consistency Need | Recommended |
|----------|-----------------|-------------|
| Banking transactions | Strong | CP, Linearizable |
| Inventory counts | Strong | CP, Serializable |
| User sessions | Read-your-writes | Session consistency |
| Social media feeds | Eventual OK | AP, Eventual |
| Shopping cart | Eventual OK | AP, Eventual |
| Analytics/Metrics | Eventual OK | AP, Eventual |
| Leader election | Strong | CP, Linearizable |
| Configuration | Causal minimum | CP preferred |
| DNS | Eventual OK | AP, Eventual |
| Chat messages | Causal | Causal ordering |

### Practical Guidelines

```
Strong Consistency When:
─────────────────────────────────────────────
✓ Financial transactions (money movement)
✓ Inventory (avoid overselling)
✓ Booking/reservations (avoid double-booking)
✓ Primary key generation (uniqueness)
✓ Leader election (only one leader)

Eventual Consistency OK When:
─────────────────────────────────────────────
✓ Likes, view counts (approximate OK)
✓ Feed recommendations 
✓ User preferences
✓ Analytics and logging
✓ Cache content
✓ Read-heavy, low write conflict scenarios
```

---

## ✅ Key Takeaways

1. **CAP is about trade-offs** - During partitions, choose C or A
2. **Partitions WILL happen** - Design assuming network failures
3. **Consistency is a spectrum** - Match model to use case
4. **Tunable consistency** - Many databases let you choose per-operation
5. **PACELC extends CAP** - Consider latency vs consistency tradeoff
6. **Money needs strong** - Financial transactions need linearizability
7. **Social can be eventual** - Likes and feeds tolerate staleness

---

## 📚 Related Topics

- [Databases](06-databases.md) - Database fundamentals
- [Distributed Patterns](14-distributed-patterns.md) - Consensus, leader election
- [Database Scaling](11-database-scaling.md) - Replication and consistency
- [Transactions](../../../databases/11-transactions-and-acid.md) - ACID properties
