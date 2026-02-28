# Design Google Docs

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a real-time collaborative document editing system like Google Docs where multiple users can simultaneously edit the same document with changes synced in real-time.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Create/edit documents** - Rich text editing
2. **Real-time collaboration** - Multiple users edit simultaneously
3. **Conflict resolution** - Handle concurrent edits
4. **Version history** - View and restore previous versions
5. **Comments** - Add and resolve comments
6. **Sharing** - Share with specific users or links
7. **Offline support** - Edit offline, sync when online
8. **Cursor presence** - See where others are editing

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | 99.99% availability |
| **CAP** | AP with conflict resolution |
| **Compliance** | GDPR, data residency |
| **Scalability** | 100M documents, 10M DAU |
| **Latency** | &lt; 100ms for local edits, &lt; 500ms for sync |
| **Environment** | Global, multi-platform |
| **Durability** | Never lose user content |
| **Security** | Fine-grained access control |

---

## 2. Back of Envelope Calculations

```
Documents:
- Total documents: 100 million
- Average document size: 100 KB
- Total storage: 100M × 100 KB = 10 TB

Active Sessions:
- DAU: 10 million
- Concurrent editing sessions: 500,000
- Average collaborators per doc: 3

Operations:
- Average typing speed: 5 characters/second
- 500K sessions × 5 ops/sec = 2.5M ops/second
- With batching (100ms): 250K batched ops/second
```

---

## 3. Core Entities

```sql
-- Documents
CREATE TABLE documents (
    document_id UUID PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    title VARCHAR(255),
    current_version BIGINT DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_owner (owner_id)
);

-- Document Content (current state)
CREATE TABLE document_content (
    document_id UUID PRIMARY KEY,
    content JSONB,  -- Structured document representation
    version BIGINT,
    updated_at TIMESTAMP
);

-- Operation Log (for sync and history)
CREATE TABLE operations (
    operation_id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    user_id BIGINT,
    version BIGINT,
    operation JSONB,  -- The operation data
    created_at TIMESTAMP,
    
    INDEX idx_doc_version (document_id, version)
);

-- Document Sharing
CREATE TABLE document_shares (
    document_id UUID,
    user_id BIGINT,
    permission ENUM('view', 'comment', 'edit'),
    
    PRIMARY KEY (document_id, user_id)
);

-- Active Sessions
CREATE TABLE active_sessions (
    session_id UUID PRIMARY KEY,
    document_id UUID,
    user_id BIGINT,
    cursor_position JSONB,
    last_seen TIMESTAMP
);
```

---

## 4. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       GOOGLE DOCS ARCHITECTURE                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                            ┌─────────────┐                                 │
│                            │   Clients   │                                 │
│                            │(Browser/App)│                                 │
│                            └──────┬──────┘                                 │
│                                   │                                        │
│                        ┌──────────┴──────────┐                            │
│                        │   Load Balancers    │                            │
│                        └──────────┬──────────┘                            │
│                                   │                                        │
│         ┌─────────────────────────┼─────────────────────────┐             │
│         │                         │                         │              │
│         ▼                         ▼                         ▼              │
│    ┌─────────┐             ┌──────────┐             ┌──────────┐          │
│    │Document │             │Collab    │             │  Auth    │          │
│    │ Service │             │ Service  │             │ Service  │          │
│    │ (REST)  │             │(WebSocket│             │          │          │
│    └────┬────┘             └────┬─────┘             └──────────┘          │
│         │                       │                                          │
│         │    ┌──────────────────┘                                          │
│         │    │                                                             │
│         │    ▼                                                             │
│         │ ┌──────────────────────────────────────────────────────────┐    │
│         │ │                  COLLABORATION ENGINE                     │    │
│         │ │                                                           │    │
│         │ │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │    │
│         │ │  │   OT/CRDT  │  │  Session   │  │  Presence  │         │    │
│         │ │  │   Engine   │  │  Manager   │  │  Manager   │         │    │
│         │ │  └────────────┘  └────────────┘  └────────────┘         │    │
│         │ │                                                           │    │
│         │ └─────────────────────────┬────────────────────────────────┘    │
│         │                           │                                      │
│         └───────────────────────────┼──────────────────────────────────────┤
│                                     │                                      │
│    ┌────────────────────────────────┴───────────────────────────────────┐ │
│    │                           DATA LAYER                                │ │
│    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │ │
│    │  │ Postgres │  │  Redis   │  │Operation │  │   S3     │           │ │
│    │  │  (Docs)  │  │(Sessions)│  │   Log    │  │(Versions)│           │ │
│    │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │ │
│    └────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deep Dive: Conflict Resolution

### The Problem

```
┌─────────────────────────────────────────────────────────────────┐
│                   CONCURRENT EDIT PROBLEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Initial Document: "Hello"                                      │
│                                                                 │
│  User A                    User B                               │
│     │                         │                                 │
│     │ Insert " World" at 5    │                                 │
│     │ Result: "Hello World"   │ Insert "!" at 5                │
│     │                         │ Result: "Hello!"               │
│     │                         │                                 │
│                                                                 │
│  Without coordination:                                          │
│  User A sees: "Hello World"                                     │
│  User B sees: "Hello!"                                          │
│  Server has: ??? (inconsistent)                                │
│                                                                 │
│  Desired outcome: "Hello World!" or "Hello! World"             │
│  Both users converge to same state                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Solution 1: Operational Transformation (OT)

```
┌─────────────────────────────────────────────────────────────────┐
│                   OPERATIONAL TRANSFORMATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Core Idea: Transform operations based on concurrent ops       │
│                                                                 │
│  Operations:                                                    │
│  ────────────                                                   │
│  • Insert(position, character)                                 │
│  • Delete(position)                                            │
│  • Retain(count) - skip characters                             │
│                                                                 │
│  Transformation Example:                                        │
│  ────────────────────────                                       │
│  Document: "Hello" (version 1)                                 │
│                                                                 │
│  Op A: Insert(" World", pos=5)                                 │
│  Op B: Insert("!", pos=5)                                      │
│                                                                 │
│  Server receives A first, applies it:                          │
│  Document: "Hello World" (version 2)                           │
│                                                                 │
│  Server receives B (based on version 1):                       │
│  B must be transformed against A:                              │
│  • A inserted 6 chars at pos 5                                 │
│  • B's position 5 becomes 5 + 6 = 11                          │
│  • B' = Insert("!", pos=11)                                    │
│                                                                 │
│  Apply B':                                                      │
│  Document: "Hello World!" (version 3)                          │
│                                                                 │
│  Transform Function:                                            │
│  ───────────────────                                            │
│  transform(op_a, op_b) → (op_a', op_b')                        │
│  Where: apply(apply(doc, op_a), op_b') =                       │
│         apply(apply(doc, op_b), op_a')                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Solution 2: CRDT (Conflict-free Replicated Data Types)

```
┌─────────────────────────────────────────────────────────────────┐
│                   CRDT APPROACH                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Core Idea: Design data structure that merges automatically    │
│                                                                 │
│  Types of CRDTs:                                                │
│  ────────────────                                               │
│  • RGA (Replicated Growable Array) - for sequences            │
│  • YATA (Yet Another Transformation Approach)                  │
│  • Logoot/LSEQ - position-based                               │
│                                                                 │
│  RGA Example:                                                   │
│  ──────────────                                                 │
│  Each character has unique ID: (timestamp, nodeId)            │
│                                                                 │
│  Insert "H": { id: (1, A), char: 'H', after: ROOT }           │
│  Insert "i": { id: (2, A), char: 'i', after: (1, A) }         │
│                                                                 │
│  User B inserts "!" after "H":                                 │
│  { id: (2, B), char: '!', after: (1, A) }                     │
│                                                                 │
│  Merge: Compare timestamps, B's "!" comes before A's "i"      │
│  Result: "H!i" or "Hi!" depending on tie-breaker             │
│                                                                 │
│  Advantages over OT:                                           │
│  ─────────────────────                                          │
│  • No central server needed                                   │
│  • Better for offline/P2P                                     │
│  • Simpler implementation                                     │
│                                                                 │
│  Disadvantages:                                                │
│  ───────────────                                                │
│  • Larger metadata per character                              │
│  • Tombstones for deletions                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation (OT-based)

```python
class CollaborationEngine:
    def __init__(self):
        self.documents = {}  # doc_id -> Document
        
    def apply_operation(self, doc_id: str, op: Operation, 
                        client_version: int) -> List[Operation]:
        """Apply client operation and return operations to broadcast"""
        
        doc = self.documents[doc_id]
        
        # Get operations that happened since client's version
        concurrent_ops = doc.get_ops_since(client_version)
        
        # Transform incoming op against concurrent ops
        transformed_op = op
        for concurrent_op in concurrent_ops:
            transformed_op = self.transform(transformed_op, concurrent_op)
        
        # Apply transformed operation
        doc.apply(transformed_op)
        doc.add_to_log(transformed_op)
        
        # Return transformed op to broadcast to other clients
        return [transformed_op]
    
    def transform(self, op_a: Operation, op_b: Operation) -> Operation:
        """Transform op_a against op_b"""
        
        if op_a.type == 'insert' and op_b.type == 'insert':
            if op_a.position <= op_b.position:
                return op_a
            else:
                return Operation(
                    type='insert',
                    position=op_a.position + len(op_b.text),
                    text=op_a.text
                )
                
        elif op_a.type == 'insert' and op_b.type == 'delete':
            if op_a.position <= op_b.position:
                return op_a
            else:
                return Operation(
                    type='insert',
                    position=op_a.position - 1,
                    text=op_a.text
                )
        
        # ... handle other cases
```

---

## 6. Deep Dive: Real-time Sync

```
┌─────────────────────────────────────────────────────────────────┐
│                   REAL-TIME SYNC PROTOCOL                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Connection:                                                    │
│  ────────────                                                   │
│  1. Client opens WebSocket to Collab Service                   │
│  2. Join document room                                         │
│  3. Receive current document state + version                   │
│  4. Subscribe to updates                                       │
│                                                                 │
│  Message Types:                                                 │
│  ───────────────                                                │
│                                                                 │
│  Client → Server:                                               │
│  {                                                              │
│    "type": "operation",                                         │
│    "doc_id": "doc123",                                          │
│    "version": 42,                                               │
│    "ops": [                                                     │
│      {"type": "retain", "count": 10},                          │
│      {"type": "insert", "text": "hello"},                      │
│      {"type": "retain", "count": 50}                           │
│    ]                                                            │
│  }                                                              │
│                                                                 │
│  Server → Client:                                               │
│  {                                                              │
│    "type": "operation",                                         │
│    "doc_id": "doc123",                                          │
│    "version": 43,                                               │
│    "user_id": "user456",                                        │
│    "ops": [...]                                                 │
│  }                                                              │
│                                                                 │
│  Acknowledgment:                                                │
│  ────────────────                                               │
│  {                                                              │
│    "type": "ack",                                               │
│    "version": 43                                                │
│  }                                                              │
│                                                                 │
│  Client State Machine:                                          │
│  ──────────────────────                                         │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                                                        │     │
│  │  [Synchronized] ──user types──► [AwaitingAck]        │     │
│  │        ▲                              │               │     │
│  │        │                              │               │     │
│  │    receive ack                   receive ack         │     │
│  │        │                              │               │     │
│  │        └──────────────────────────────┘               │     │
│  │                                                        │     │
│  │  If user types while AwaitingAck:                    │     │
│  │  Buffer operations, send after ack received          │     │
│  │                                                        │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Presence System

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRESENCE SYSTEM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Features:                                                      │
│  ───────────                                                    │
│  • Show who's viewing the document                             │
│  • Show cursor positions of other users                        │
│  • Show selections                                             │
│  • User colors for identification                              │
│                                                                 │
│  Implementation:                                                │
│  ─────────────────                                              │
│  1. Client sends cursor position on every move                 │
│  2. Throttle updates (max 10/second)                          │
│  3. Server broadcasts to other clients in document            │
│  4. Client renders colored cursors                             │
│                                                                 │
│  Message:                                                       │
│  {                                                              │
│    "type": "cursor",                                            │
│    "user_id": "user123",                                        │
│    "user_name": "Alice",                                        │
│    "color": "#FF5733",                                          │
│    "position": {"line": 10, "column": 25},                     │
│    "selection": {"start": {...}, "end": {...}}                 │
│  }                                                              │
│                                                                 │
│  Storage (Redis):                                               │
│  ──────────────────                                             │
│  HSET presence:doc123 user456 '{"position":...}'              │
│  EXPIRE presence:doc123 60  # Clean up stale                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Version History

```
┌─────────────────────────────────────────────────────────────────┐
│                   VERSION HISTORY                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Requirements:                                                  │
│  ──────────────                                                 │
│  • View document at any point in time                          │
│  • Restore to previous version                                 │
│  • See who made what changes                                   │
│                                                                 │
│  Storage Strategy:                                              │
│  ──────────────────                                             │
│                                                                 │
│  1. Operation Log (Fine-grained)                               │
│     ────────────────────────────                                │
│     Store every operation with timestamp and user              │
│     Can reconstruct any version by replaying ops               │
│     Pro: Precise history                                       │
│     Con: Storage intensive for active docs                     │
│                                                                 │
│  2. Periodic Snapshots                                         │
│     ──────────────────────                                      │
│     Save full document state every N operations or M minutes  │
│     To restore: Load nearest snapshot + replay ops            │
│                                                                 │
│  Combined Approach:                                             │
│  ───────────────────                                            │
│  ┌────────────────────────────────────────────────────┐        │
│  │                                                     │        │
│  │  Snapshot v100 ─┬─ Op 101                          │        │
│  │                 ├─ Op 102                          │        │
│  │                 ├─ Op 103                          │        │
│  │                 └─ ...                             │        │
│  │  Snapshot v200 ─┬─ Op 201                          │        │
│  │                 ├─ Op 202                          │        │
│  │                 └─ ...                             │        │
│  │                                                     │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                 │
│  Snapshot to S3, ops to Cassandra/DynamoDB                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Real-time | WebSocket | Bidirectional, low latency |
| Sessions | Redis | Fast presence, pub/sub |
| Documents | PostgreSQL | Consistency, relations |
| Operations | Cassandra | Write-heavy append log |
| Snapshots | S3 | Cheap, durable storage |
| OT Library | ShareDB / Yjs | Battle-tested |

---

## 10. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. OT VS CRDT                                                  │
│     OT: Centralized, transforms operations                     │
│     CRDT: Decentralized, designed for merge                   │
│     Both achieve convergence                                   │
│                                                                 │
│  2. VERSION VECTOR                                              │
│     Track version for conflict detection                       │
│     Transform against concurrent operations                    │
│                                                                 │
│  3. OPTIMISTIC LOCAL APPLY                                      │
│     Apply changes locally immediately                          │
│     Server confirms or corrects                                │
│                                                                 │
│  4. PRESENCE IS EPHEMERAL                                       │
│     Short TTL, stored in Redis                                │
│     Broadcast frequently, accept some lag                     │
│                                                                 │
│  5. SNAPSHOTS + OPERATION LOG                                   │
│     Balance storage cost and reconstruction time              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. References

- [15-real-time-communication.md](/system-design/fundamentals/15-real-time-communication.md) - WebSockets
- [14-distributed-patterns.md](/system-design/fundamentals/14-distributed-patterns.md) - Consistency
- [13-cap-theorem.md](/system-design/fundamentals/13-cap-theorem.md) - CAP tradeoffs

---

[← Back to Problems](/system-design/problems/00-index.md) | [Next: Search Autocomplete →](/system-design/problems/13-search-autocomplete.md)
