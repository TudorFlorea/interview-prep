# Consistent Hashing

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

Consistent hashing is a distributed hashing technique that minimizes key redistribution when nodes are added or removed. It's fundamental to distributed caches, databases, and load balancers. Understanding this concept is essential for scaling distributed systems.

---

## 🎯 The Problem with Simple Hashing

### Traditional Hash-Based Distribution

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIMPLE MODULO HASHING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Formula: server = hash(key) % N                                │
│                                                                 │
│  With 3 servers:                                                │
│  hash("user_123") = 7  →  7 % 3 = 1  →  Server 1               │
│  hash("user_456") = 12 →  12 % 3 = 0 →  Server 0               │
│  hash("user_789") = 5  →  5 % 3 = 2  →  Server 2               │
│                                                                 │
│  Distribution is even. Looks good!                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Problem: Adding/Removing Nodes

```
┌─────────────────────────────────────────────────────────────────┐
│                    CATASTROPHIC REDISTRIBUTION                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Now with 4 servers (added one):                                │
│                                                                 │
│  hash("user_123") = 7  →  7 % 4 = 3  →  Server 3  (was 1!)     │
│  hash("user_456") = 12 →  12 % 4 = 0 →  Server 0  (same)       │
│  hash("user_789") = 5  →  5 % 4 = 1  →  Server 1  (was 2!)     │
│                                                                 │
│  ~75% of keys moved to different servers!                       │
│                                                                 │
│  For a cache:                                                   │
│  - Most keys now map to wrong server                            │
│  - Cache miss storm → database overwhelmed                      │
│  - System failure cascade                                       │
│                                                                 │
│  For a database:                                                │
│  - Massive data migration required                              │
│  - Long downtime                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💡 Consistent Hashing Solution

### The Hash Ring

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE HASH RING                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Imagine a ring of numbers from 0 to 2^32-1                     │
│                                                                 │
│                          0 / 2^32                               │
│                           │                                     │
│                    ┌──────┴──────┐                              │
│                   ╱               ╲                             │
│                  │    Hash Ring   │                             │
│          270°   │                 │   90°                       │
│       ─────────●│                 │●─────────                   │
│                 │                 │                             │
│                  ╲               ╱                              │
│                   └──────┬──────┘                               │
│                          │                                      │
│                         180°                                    │
│                                                                 │
│  Both servers AND keys are hashed onto this ring               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Placing Servers on the Ring

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVERS ON THE RING                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  hash("Server A") = position on ring                            │
│  hash("Server B") = position on ring                            │
│  hash("Server C") = position on ring                            │
│                                                                 │
│                           0°                                    │
│                           │                                     │
│                    ┌──────┴──────┐                              │
│                   ╱       ●       ╲   Server A (45°)            │
│                  │                 │                            │
│   Server C (270°)●                 │                            │
│                  │                 │                            │
│                  ╲       ●        ╱                             │
│                   └──────┴──────┘                               │
│                          │                                      │
│                    Server B (180°)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Assignment: Walk Clockwise

```
┌─────────────────────────────────────────────────────────────────┐
│                    KEY ASSIGNMENT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Rule: A key is stored on the first server encountered          │
│        when walking CLOCKWISE from the key's position           │
│                                                                 │
│                           0°                                    │
│                    ┌──────┴──────┐                              │
│                   ╱       ●       ╲   Server A                  │
│                  │    ○           │   ← Key 1 (30°) → Server A │
│   Server C      ●   ○             │   ← Key 2 (60°) → Server B │
│                  │        ○       │   ← Key 3 (120°) → Server B│
│                  ╲       ●        ╱                             │
│                   └──────┴──────┘     Server B                  │
│                          │                                      │
│                   ○ Key 4 (200°) → Server C                     │
│                                                                 │
│  Key range ownership:                                           │
│  Server A: 270° → 45° (wraps around)                           │
│  Server B: 45° → 180°                                           │
│  Server C: 180° → 270°                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ➕ Adding a Node

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADDING SERVER D                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Before: 3 servers (A, B, C)                                    │
│  After: 4 servers (A, B, C, D at position 135°)                 │
│                                                                 │
│                           0°                                    │
│                    ┌──────┴──────┐                              │
│                   ╱       ●       ╲   A (45°)                   │
│                  │                 │                            │
│   C (270°)      ●           ● NEW │   D (135°)                  │
│                  │                 │                            │
│                  ╲       ●        ╱                             │
│                   └──────┴──────┘                               │
│                          B (180°)                               │
│                                                                 │
│  What moves:                                                    │
│  - Keys between 90° and 135°: B → D                             │
│  - Only ~12.5% of keys affected!                                │
│                                                                 │
│  Keys on A? Still on A. ✅                                      │
│  Keys on C? Still on C. ✅                                      │
│  Most keys on B? Still on B. ✅                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ➖ Removing a Node

```
┌─────────────────────────────────────────────────────────────────┐
│                    REMOVING SERVER B                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Before: A (45°), B (180°), C (270°)                           │
│  After: A (45°), C (270°)                                       │
│                                                                 │
│                           0°                                    │
│                    ┌──────┴──────┐                              │
│                   ╱       ●       ╲   A (45°)                   │
│                  │                 │                            │
│   C (270°)      ●                  │                            │
│                  │                 │                            │
│                  ╲       ✗        ╱   B removed                 │
│                   └──────┴──────┘                               │
│                                                                 │
│  What moves:                                                    │
│  - Keys from B (45° - 180°) → C                                 │
│  - Only B's keys affected!                                      │
│                                                                 │
│  Keys on A? Still on A. ✅                                      │
│  Keys on C? Still on C, plus B's former keys                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Virtual Nodes (VNodes)

### The Problem with Basic Consistent Hashing

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNEVEN DISTRIBUTION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  With only 3 physical nodes:                                    │
│                                                                 │
│                           0°                                    │
│                    ┌──────┴──────┐                              │
│                   ╱       ●       ╲   A (30°)                   │
│                  │        ●        │  B (60°)                   │
│                 ●│                 │                            │
│    C (270°)     │                 │                            │
│                  ╲               ╱                              │
│                   └─────────────┘                               │
│                                                                 │
│  A handles: 270° → 30° = 120° of range                         │
│  B handles: 30° → 60° = 30° of range                           │
│  C handles: 60° → 270° = 210° of range                         │
│                                                                 │
│  C gets 7x more load than B! Not balanced!                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Solution: Virtual Nodes

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIRTUAL NODES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Give each physical server multiple positions on the ring       │
│                                                                 │
│  Physical Server A → Virtual nodes A1, A2, A3, A4              │
│  Physical Server B → Virtual nodes B1, B2, B3, B4              │
│  Physical Server C → Virtual nodes C1, C2, C3, C4              │
│                                                                 │
│                           0°                                    │
│                    ┌──────┴──────┐                              │
│                   ╱   A1  B2  A3  ╲                             │
│                  │ C1          B1  │                            │
│                  │      Ring       │                            │
│                  │ B3          A2  │                            │
│                  ╲   C3  A4  C2  ╱                              │
│                   └─────────────┘                               │
│                                                                 │
│  With 100-200 virtual nodes per server:                         │
│  - Load distributed much more evenly                            │
│  - Adding server: smaller chunks move from many servers         │
│  - Standard deviation of load: ~10% vs 100%+ without vnodes    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Virtual Nodes Implementation

```python
class ConsistentHash:
    def __init__(self, nodes=None, virtual_nodes=150):
        self.virtual_nodes = virtual_nodes
        self.ring = {}           # position -> physical node
        self.sorted_keys = []    # sorted positions for binary search
        
        if nodes:
            for node in nodes:
                self.add_node(node)
    
    def _hash(self, key):
        """Generate hash position on ring (0 to 2^32-1)"""
        return int(hashlib.md5(key.encode()).hexdigest(), 16) % (2**32)
    
    def add_node(self, node):
        """Add physical node with multiple virtual nodes"""
        for i in range(self.virtual_nodes):
            virtual_key = f"{node}:vnode{i}"
            position = self._hash(virtual_key)
            self.ring[position] = node
            self.sorted_keys.append(position)
        
        self.sorted_keys.sort()
    
    def remove_node(self, node):
        """Remove all virtual nodes for a physical node"""
        for i in range(self.virtual_nodes):
            virtual_key = f"{node}:vnode{i}"
            position = self._hash(virtual_key)
            del self.ring[position]
            self.sorted_keys.remove(position)
    
    def get_node(self, key):
        """Find which node should handle this key"""
        if not self.ring:
            return None
        
        position = self._hash(key)
        
        # Binary search for first node clockwise from position
        idx = bisect.bisect_right(self.sorted_keys, position)
        
        # Wrap around to first node if past the end
        if idx == len(self.sorted_keys):
            idx = 0
        
        return self.ring[self.sorted_keys[idx]]


# Usage
ch = ConsistentHash(['ServerA', 'ServerB', 'ServerC'])
print(ch.get_node('user_123'))  # → ServerB
print(ch.get_node('user_456'))  # → ServerA

# Add new server - only ~25% of keys move
ch.add_node('ServerD')
print(ch.get_node('user_123'))  # Might still be ServerB
```

---

## 🔄 Replication with Consistent Hashing

### Storing Replicas

```
┌─────────────────────────────────────────────────────────────────┐
│                    REPLICATION STRATEGY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  For replication factor N=3:                                    │
│  Store data on the key's node AND the next N-1 nodes clockwise  │
│                                                                 │
│                           0°                                    │
│                    ┌──────┴──────┐                              │
│                   ╱       A       ╲                             │
│                  │                 │                            │
│           D     ●                 ● B                           │
│                  │     ○ Key      │                             │
│                  ╲       C        ╱                             │
│                   └──────┴──────┘                               │
│                                                                 │
│  Key (120°) stored on:                                          │
│  1. Primary: C (first node clockwise)                          │
│  2. Replica 1: D                                                │
│  3. Replica 2: A                                                │
│                                                                 │
│  If C fails, D and A still have the data                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Handling Node Failures

```
┌─────────────────────────────────────────────────────────────────┐
│                    NODE FAILURE HANDLING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Node C fails:                                                  │
│                                                                 │
│  Reads: Route to next replica (D or A)                         │
│  Writes: Use "sloppy quorum" - write to D, A, and B (next)     │
│                                                                 │
│  When C recovers:                                               │
│  - Use hinted handoff: D gives C its missed writes             │
│  - Or anti-entropy: merkle tree comparison                      │
│                                                                 │
│  Key insight:                                                   │
│  - No single point of failure                                   │
│  - Cluster continues operating with degraded redundancy         │
│  - Automatic healing when node returns                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌍 Real-World Usage

### Amazon Dynamo / DynamoDB

```
Uses consistent hashing with virtual nodes for:
- Partition key determines which partition stores data
- Automatic replication across partitions
- Seamless scaling by splitting/moving partitions

Configuration:
- Typically 100-300 virtual nodes per physical node
- Replication factor of 3
```

### Apache Cassandra

```
Token ring architecture:
- Each node owns a range of tokens
- Virtual nodes (vnodes) enabled by default (256 per node)
- Replication across multiple data centers

Example:
  CREATE KEYSPACE my_keyspace WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'dc1': 3,  -- 3 replicas in datacenter 1
    'dc2': 3   -- 3 replicas in datacenter 2
  };
```

### Redis Cluster

```
Hash slots (not traditional consistent hashing):
- 16,384 fixed hash slots
- Each node owns a subset of slots
- CRC16(key) mod 16384 determines slot

Advantages:
- Simpler resharding (move slots, not recalculate)
- Deterministic slot assignment
```

### Load Balancers

```
Consistent hashing for sticky sessions:
- hash(client_ip) determines backend server
- Same client always goes to same server
- Adding servers minimizes session disruption

NGINX example:
  upstream backend {
    hash $remote_addr consistent;
    server backend1.example.com;
    server backend2.example.com;
    server backend3.example.com;
  }
```

---

## ⚖️ Trade-offs and Considerations

| Aspect | Trade-off |
|--------|-----------|
| **Virtual nodes** | More = better balance, but more memory for ring |
| **Hash function** | MD5/SHA for uniformity, but slower than simpler hashes |
| **Replication** | Higher factor = better durability, more storage/network |
| **Ring size** | Larger = finer granularity, more overhead |

---

## 📊 Comparison with Alternatives

| Approach | Key Movement on Scale | Complexity | Use Case |
|----------|----------------------|------------|----------|
| **Modulo hashing** | ~100% keys move | Simple | Fixed server count |
| **Consistent hashing** | ~K/N keys move | Moderate | Distributed caches |
| **Hash slots (Redis)** | Predictable | Moderate | Redis Cluster |
| **Directory service** | Zero (lookup-based) | Complex | Custom sharding |

---

## ✅ Key Takeaways

1. **Minimizes redistribution** - Only K/N keys move on node change
2. **Virtual nodes are essential** - For even distribution
3. **Enables replication** - Next N nodes clockwise hold replicas
4. **Powers major systems** - Dynamo, Cassandra, Memcached
5. **Use 100-200 vnodes** - Good balance of distribution and overhead
6. **Hash both keys and servers** - Onto the same ring space

---

## 📚 Related Topics

- [Database Scaling](/system-design/fundamentals/11-database-scaling.md) - Sharding strategies
- [Caching](/system-design/fundamentals/07-caching.md) - Distributed cache design
- [CAP Theorem](/system-design/fundamentals/13-cap-theorem.md) - Consistency in distribution
- [Distributed Patterns](/system-design/fundamentals/14-distributed-patterns.md) - Related patterns
