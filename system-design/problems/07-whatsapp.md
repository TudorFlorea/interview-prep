# Design WhatsApp

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a real-time messaging application like WhatsApp that supports 1-on-1 and group messaging with end-to-end encryption, message delivery guarantees, and offline support.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **1-on-1 messaging** - Send text, images, videos, files
2. **Group messaging** - Up to 1024 members per group
3. **Delivery receipts** - Sent, delivered, read indicators
4. **Online status** - Last seen, currently online
5. **End-to-end encryption** - Messages encrypted client-side
6. **Offline support** - Receive messages when back online
7. **Push notifications** - Alert users of new messages
8. **Media sharing** - Photos, videos, documents, voice messages

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | 99.99% availability |
| **CAP** | AP - Eventual consistency, strong ordering per chat |
| **Compliance** | GDPR, data residency |
| **Scalability** | 2B users, 100B messages/day |
| **Latency** | Message delivery < 500ms |
| **Environment** | Global, mobile-first |
| **Durability** | Messages stored until delivered |
| **Security** | E2E encryption, no server-side access |

---

## 2. Back of Envelope Calculations

### Scale Estimation

```
Users:
- Total users: 2 billion
- DAU: 500 million
- Concurrent connections: 100 million (peak)

Messages:
- 100 billion messages/day
- 100B / 86400 ≈ 1.16 million messages/second
- Peak: ~3 million messages/second

Groups:
- Average groups per user: 20
- Average group size: 50 members
```

### Storage Estimation

```
Message Storage:
- Average message size: 100 bytes (encrypted)
- Media message pointer: 200 bytes
- 100B messages × 100 bytes = 10 TB/day
- Keep messages for 30 days = 300 TB

Media Storage:
- 10% of messages have media
- Average media: 500 KB
- 10B media/day × 500 KB = 5 PB/day

Connection State:
- 100M connections × 1 KB = 100 GB in memory
```

---

## 3. Core Entities

```sql
-- Users
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    profile_picture_url VARCHAR(500),
    public_key BLOB,  -- For E2E encryption
    last_seen TIMESTAMP,
    created_at TIMESTAMP
);

-- Conversations (1-on-1 and Groups)
CREATE TABLE conversations (
    conversation_id BIGINT PRIMARY KEY,
    type ENUM('direct', 'group'),
    group_name VARCHAR(100),
    group_picture_url VARCHAR(500),
    created_by BIGINT,
    created_at TIMESTAMP
);

-- Conversation Participants
CREATE TABLE participants (
    conversation_id BIGINT,
    user_id BIGINT,
    role ENUM('member', 'admin'),
    joined_at TIMESTAMP,
    muted_until TIMESTAMP,
    
    PRIMARY KEY (conversation_id, user_id),
    INDEX idx_user (user_id)
);

-- Messages
CREATE TABLE messages (
    message_id BIGINT,
    conversation_id BIGINT,
    sender_id BIGINT NOT NULL,
    content_encrypted BLOB,  -- E2E encrypted
    message_type ENUM('text', 'image', 'video', 'audio', 'file'),
    media_url VARCHAR(500),
    reply_to_message_id BIGINT,
    created_at TIMESTAMP,
    
    PRIMARY KEY (conversation_id, message_id),
    INDEX idx_created (created_at)
) PARTITION BY HASH(conversation_id);

-- Message Delivery Status (per recipient)
CREATE TABLE message_status (
    message_id BIGINT,
    user_id BIGINT,
    status ENUM('sent', 'delivered', 'read'),
    updated_at TIMESTAMP,
    
    PRIMARY KEY (message_id, user_id)
);
```

---

## 4. API Design

### WebSocket Protocol

```
# Connection handshake
CONNECT wss://chat.whatsapp.com/ws
Headers:
    Authorization: Bearer <token>

# Send message
{
    "type": "message",
    "id": "msg_123",
    "conversation_id": "conv_456",
    "content_encrypted": "<base64_encrypted>",
    "message_type": "text"
}

# Receive message
{
    "type": "message",
    "id": "msg_789",
    "conversation_id": "conv_456",
    "sender_id": "user_111",
    "content_encrypted": "<base64_encrypted>",
    "timestamp": 1706745600000
}

# Delivery acknowledgment
{
    "type": "ack",
    "message_id": "msg_123",
    "status": "delivered"
}

# Read receipt
{
    "type": "read",
    "conversation_id": "conv_456",
    "last_read_message_id": "msg_789"
}

# Typing indicator
{
    "type": "typing",
    "conversation_id": "conv_456",
    "is_typing": true
}
```

### REST APIs (for non-real-time operations)

```
# Get conversation history
GET /api/v1/conversations/{conv_id}/messages?before={msg_id}&limit=50

# Upload media (returns media_id for message)
POST /api/v1/media/upload
Content-Type: multipart/form-data

# Create group
POST /api/v1/groups
{
    "name": "Family Group",
    "participants": ["user_1", "user_2", "user_3"]
}
```

---

## 5. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         WHATSAPP ARCHITECTURE                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                            ┌─────────────┐                                 │
│                            │   Clients   │                                 │
│                            │(iOS/Android)│                                 │
│                            └──────┬──────┘                                 │
│                                   │                                        │
│                        ┌──────────┴──────────┐                            │
│                        │   Load Balancers    │                            │
│                        │  (L4 - TCP/WSS)     │                            │
│                        └──────────┬──────────┘                            │
│                                   │                                        │
│    ┌──────────────────────────────┼──────────────────────────────┐        │
│    │                   Connection Servers                         │        │
│    │              (Stateful WebSocket handlers)                   │        │
│    │   ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐   │        │
│    │   │Conn 1 │  │Conn 2 │  │Conn 3 │  │Conn 4 │  │Conn N │   │        │
│    │   └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘   │        │
│    │       │          │          │          │          │        │        │
│    └───────┼──────────┼──────────┼──────────┼──────────┼────────┘        │
│            │          │          │          │          │                  │
│            └──────────┴──────────┼──────────┴──────────┘                  │
│                                  │                                        │
│                         ┌────────┴────────┐                              │
│                         │   Message Queue │                              │
│                         │     (Kafka)     │                              │
│                         └────────┬────────┘                              │
│                                  │                                        │
│         ┌────────────────────────┼────────────────────────┐              │
│         │                        │                        │               │
│         ▼                        ▼                        ▼               │
│    ┌─────────┐             ┌──────────┐            ┌──────────┐         │
│    │ Message │             │  Group   │            │  Push    │         │
│    │ Service │             │ Service  │            │ Service  │         │
│    └────┬────┘             └────┬─────┘            └────┬─────┘         │
│         │                       │                       │                │
│    ┌────┴────────────────────────┴───────────────────────┴────┐          │
│    │                                                          │          │
│    ▼                                                          ▼          │
│ ┌──────────────────┐                                  ┌──────────────┐  │
│ │   Message Store  │                                  │  Connection  │  │
│ │   (Cassandra)    │                                  │   Registry   │  │
│ │                  │                                  │   (Redis)    │  │
│ └──────────────────┘                                  └──────────────┘  │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │                         MEDIA PIPELINE                              │  │
│ │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │  │
│ │  │  Upload  │───►│ Process  │───►│   CDN    │───►│ Deliver  │    │  │
│ │  │  (S3)    │    │ (Lambda) │    │          │    │          │    │  │
│ │  └──────────┘    └──────────┘    └──────────┘    └──────────┘    │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Deep Dive: Message Delivery

### Message Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   MESSAGE DELIVERY FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Sender (Alice) → Receiver (Bob)                                │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  Alice's Phone                                              ││
│  │       │                                                     ││
│  │       │ 1. Encrypt message with Bob's public key           ││
│  │       │                                                     ││
│  │       ▼                                                     ││
│  │  ┌─────────┐                                               ││
│  │  │ WebSocket│ 2. Send encrypted message                    ││
│  │  └────┬────┘                                               ││
│  │       │                                                     ││
│  │       ▼                                                     ││
│  │  ┌─────────────────┐                                       ││
│  │  │ Connection      │ 3. Look up Bob's connection           ││
│  │  │ Server          │                                       ││
│  │  └────┬────────────┘                                       ││
│  │       │                                                     ││
│  │       │ 4. Bob online? ──► Yes: Forward directly           ││
│  │       │                 └─► No: Store for later            ││
│  │       ▼                                                     ││
│  │  ┌─────────────────┐                                       ││
│  │  │ Bob's Connection│ 5. Deliver to Bob's device            ││
│  │  │ Server          │                                       ││
│  │  └────┬────────────┘                                       ││
│  │       │                                                     ││
│  │       ▼                                                     ││
│  │  Bob's Phone                                                ││
│  │       │                                                     ││
│  │       │ 6. Decrypt with private key                        ││
│  │       │ 7. Send delivery ACK                               ││
│  │       │ 8. Send read receipt (when viewed)                 ││
│  │                                                             ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Connection Registry

```python
class ConnectionRegistry:
    """Track which server each user is connected to"""
    
    def __init__(self):
        self.redis = Redis()
        
    def register_connection(self, user_id: str, server_id: str):
        """Called when user connects to a WebSocket server"""
        self.redis.hset(f"connections:{user_id}", mapping={
            "server_id": server_id,
            "connected_at": time.time()
        })
        
    def unregister_connection(self, user_id: str):
        """Called when user disconnects"""
        self.redis.delete(f"connections:{user_id}")
        
    def get_user_server(self, user_id: str) -> Optional[str]:
        """Get which server the user is connected to"""
        data = self.redis.hgetall(f"connections:{user_id}")
        return data.get("server_id") if data else None
        
    def is_online(self, user_id: str) -> bool:
        return self.redis.exists(f"connections:{user_id}")
```

### Offline Message Queue

```
┌─────────────────────────────────────────────────────────────────┐
│                   OFFLINE MESSAGE HANDLING                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  When recipient is offline:                                    │
│  ───────────────────────────                                    │
│                                                                 │
│  1. Store message in Cassandra with user_id as partition key   │
│  2. Send push notification via APNs/FCM                        │
│  3. When user comes online:                                    │
│     a. Client sends "sync" request                             │
│     b. Server fetches pending messages                         │
│     c. Deliver messages in order                               │
│     d. Client acknowledges receipt                             │
│     e. Delete from offline queue                               │
│                                                                 │
│  Message Storage Schema (Cassandra):                           │
│  ─────────────────────────────────────                          │
│  CREATE TABLE pending_messages (                               │
│      recipient_id BIGINT,                                      │
│      message_id TIMEUUID,                                      │
│      conversation_id BIGINT,                                   │
│      sender_id BIGINT,                                         │
│      content_encrypted BLOB,                                   │
│      created_at TIMESTAMP,                                     │
│      PRIMARY KEY (recipient_id, message_id)                    │
│  ) WITH CLUSTERING ORDER BY (message_id ASC);                  │
│                                                                 │
│  TTL: 30 days (messages expire if not delivered)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Deep Dive: End-to-End Encryption

```
┌─────────────────────────────────────────────────────────────────┐
│                   E2E ENCRYPTION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  WhatsApp uses Signal Protocol:                                │
│  ───────────────────────────────                                │
│                                                                 │
│  Key Components:                                                │
│  ─────────────────                                              │
│  • Identity Key Pair (long-term)                               │
│  • Signed Pre-Key (medium-term)                                │
│  • One-Time Pre-Keys (single use)                              │
│  • Session Keys (per conversation)                             │
│                                                                 │
│  Key Exchange (X3DH):                                          │
│  ─────────────────────                                          │
│  ┌────────┐                              ┌────────┐            │
│  │ Alice  │                              │  Bob   │            │
│  └───┬────┘                              └───┬────┘            │
│      │                                       │                  │
│      │  1. Fetch Bob's public keys           │                  │
│      │◄──────────────────────────────────────│                  │
│      │     (Identity + Signed Pre + One-Time)│                  │
│      │                                       │                  │
│      │  2. Generate shared secret using:     │                  │
│      │     - Alice's identity key            │                  │
│      │     - Bob's signed pre-key            │                  │
│      │     - Bob's one-time pre-key          │                  │
│      │                                       │                  │
│      │  3. Send encrypted message + key info │                  │
│      │──────────────────────────────────────►│                  │
│      │                                       │                  │
│      │  4. Bob derives same shared secret    │                  │
│      │     and decrypts                      │                  │
│                                                                 │
│  Double Ratchet (Forward Secrecy):                             │
│  ──────────────────────────────────                             │
│  • New encryption key for each message                         │
│  • Compromised key doesn't expose past messages                │
│  • Symmetric ratchet + Diffie-Hellman ratchet                  │
│                                                                 │
│  Server Never Has Access:                                      │
│  ─────────────────────────                                      │
│  • Server only sees encrypted blobs                            │
│  • No ability to decrypt content                               │
│  • Metadata (who, when) is visible                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Deep Dive: Group Messaging

```
┌─────────────────────────────────────────────────────────────────┐
│                   GROUP MESSAGING                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Challenge: Deliver message to N members efficiently           │
│                                                                 │
│  Approach 1: Fan-out on Server                                 │
│  ──────────────────────────────                                 │
│  • Sender sends one message                                    │
│  • Server copies to each member's queue                        │
│  • Pro: Simple client logic                                    │
│  • Con: Server load, storage multiplication                    │
│                                                                 │
│  Approach 2: Fan-out on Client (WhatsApp uses this)            │
│  ────────────────────────────────────────────────               │
│  • Sender encrypts message once with group key                 │
│  • Server broadcasts to all connected members                  │
│  • Pro: Less server storage, E2E encryption works             │
│  • Con: Sender must be online longer                          │
│                                                                 │
│  Group Key Management:                                         │
│  ──────────────────────                                         │
│  ┌────────────────────────────────────────────────────┐        │
│  │                                                     │        │
│  │  Group Key Distribution:                           │        │
│  │  • Each group has a symmetric group key            │        │
│  │  • Group key encrypted with each member's pub key  │        │
│  │  • When member joins: send them encrypted group key│        │
│  │  • When member leaves: rotate group key            │        │
│  │                                                     │        │
│  │  Message Encryption:                               │        │
│  │  • Encrypt message with group key (AES)           │        │
│  │  • All members can decrypt                        │        │
│  │                                                     │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                 │
│  Delivery Tracking:                                             │
│  ───────────────────                                            │
│  • Track delivery status per member                            │
│  • Show "1 ✓" when server receives                             │
│  • Show "2 ✓" when all members receive                         │
│  • Blue ticks when all read                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Group Message Service

```python
class GroupMessageService:
    def send_group_message(self, sender_id: str, group_id: str, 
                           encrypted_content: bytes):
        """Send message to all group members"""
        
        # Get group members
        members = self.get_group_members(group_id)
        
        # Store message once
        message_id = self.message_store.save(
            conversation_id=group_id,
            sender_id=sender_id,
            content=encrypted_content
        )
        
        # Fanout to members
        online_count = 0
        for member_id in members:
            if member_id == sender_id:
                continue
                
            server_id = self.connection_registry.get_user_server(member_id)
            
            if server_id:
                # Member online - send via their connection server
                self.send_to_server(server_id, {
                    "type": "group_message",
                    "message_id": message_id,
                    "group_id": group_id,
                    "sender_id": sender_id,
                    "content": encrypted_content
                })
                online_count += 1
            else:
                # Member offline - queue for later
                self.queue_offline_message(member_id, message_id)
                self.push_service.send_notification(member_id, 
                    f"New message in {group_name}")
        
        return message_id, online_count
```

---

## 9. Presence System

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRESENCE SYSTEM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Online Status:                                                 │
│  ───────────────                                                │
│  • "Online" - Currently connected                              │
│  • "Last seen X ago" - Last disconnect time                    │
│  • Privacy settings control visibility                         │
│                                                                 │
│  Implementation:                                                │
│  ─────────────────                                              │
│  ┌────────────────────────────────────────────────────┐        │
│  │                                                     │        │
│  │  On Connect:                                       │        │
│  │  1. Update Redis: SET presence:{user} "online"    │        │
│  │  2. Notify subscribed users (contacts who care)   │        │
│  │                                                     │        │
│  │  On Disconnect:                                    │        │
│  │  1. Update Redis: SET presence:{user} {timestamp} │        │
│  │  2. Notify subscribed users                       │        │
│  │                                                     │        │
│  │  Subscription Model:                               │        │
│  │  • Only notify users viewing your chat            │        │
│  │  • Reduces notification fanout                    │        │
│  │                                                     │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                 │
│  Typing Indicator:                                              │
│  ──────────────────                                             │
│  • Ephemeral - not stored                                      │
│  • Send to conversation participants only                      │
│  • Auto-expire after 5 seconds                                 │
│  • Throttle: max 1 update per 3 seconds                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Real-time | WebSocket (Erlang/Elixir) | Millions of connections |
| Message Store | Cassandra | Write-heavy, partitioned by conversation |
| Connection Registry | Redis Cluster | Fast lookups |
| Queue | Kafka | High throughput, durability |
| Media Storage | S3 + CDN | Scalable blob storage |
| Push | FCM + APNs | Mobile notifications |
| Encryption | libsignal | Signal Protocol implementation |

---

## 11. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. WEBSOCKET CONNECTIONS                                       │
│     Persistent connections for real-time delivery              │
│     Need connection registry to route messages                 │
│                                                                 │
│  2. E2E ENCRYPTION                                              │
│     Server never sees plaintext                                 │
│     Signal Protocol for security                               │
│                                                                 │
│  3. OFFLINE HANDLING                                            │
│     Queue messages for offline users                           │
│     Sync on reconnect                                          │
│                                                                 │
│  4. DELIVERY GUARANTEES                                         │
│     At-least-once with deduplication                           │
│     Message ordering within conversation                       │
│                                                                 │
│  5. GROUP FANOUT                                                │
│     Balance between server and client fanout                   │
│     Group key rotation on membership changes                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. References

- [15-real-time-communication.md](/system-design/fundamentals/15-real-time-communication.md) - WebSockets
- [21-security.md](/system-design/fundamentals/21-security.md) - Encryption
- [09-message-queues.md](/system-design/fundamentals/09-message-queues.md) - Async processing

---

[← Back to Problems](/system-design/problems/00-index.md) | [Next: Dropbox →](/system-design/problems/08-dropbox.md)
