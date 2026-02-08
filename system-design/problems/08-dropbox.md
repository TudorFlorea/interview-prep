# Design Dropbox

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a cloud file storage and synchronization service like Dropbox that allows users to upload, store, sync files across devices, and share with others.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Upload files** - Upload files from any device
2. **Download files** - Download files to any device
3. **Sync across devices** - Automatic synchronization
4. **File versioning** - Maintain file history
5. **Share files/folders** - Share with links or users
6. **Offline access** - Work offline, sync when online
7. **Conflict resolution** - Handle simultaneous edits
8. **Notifications** - Alert on file changes

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | 99.99% availability, 11 9s durability |
| **CAP** | CP - Consistency for file state |
| **Compliance** | SOC2, GDPR, HIPAA |
| **Scalability** | 500M users, 1B files uploaded/day |
| **Latency** | Upload/Download: Near bandwidth limit |
| **Environment** | Global, all platforms |
| **Durability** | Never lose user data |
| **Security** | Encryption at rest and in transit |

---

## 2. Back of Envelope Calculations

### Scale Estimation

```
Users:
- Total users: 500 million
- DAU: 100 million
- Average files per user: 200
- Total files: 100 billion

File Operations:
- Uploads: 1 billion files/day
- Downloads: 2 billion files/day
- Sync events: 10 billion/day

Concurrent Users:
- Peak concurrent: 20 million
```

### Storage Estimation

```
File Storage:
- Average file size: 1 MB
- Total storage: 100B files × 1 MB = 100 PB
- Daily new storage: 1B × 1 MB = 1 PB/day

Metadata:
- Per file: 1 KB
- Total: 100B × 1 KB = 100 TB

Deduplication Savings:
- ~50% reduction (typical)
- Effective storage: ~50 PB
```

---

## 3. Core Entities

```sql
-- Users
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100),
    storage_quota_bytes BIGINT DEFAULT 2147483648,  -- 2GB
    storage_used_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP
);

-- Files (metadata only, content in blob storage)
CREATE TABLE files (
    file_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    parent_folder_id BIGINT,  -- NULL for root
    name VARCHAR(255) NOT NULL,
    is_folder BOOLEAN DEFAULT FALSE,
    size_bytes BIGINT,
    content_hash VARCHAR(64),  -- SHA-256 for dedup
    storage_path VARCHAR(500),
    mime_type VARCHAR(100),
    current_version INT DEFAULT 1,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    UNIQUE (user_id, parent_folder_id, name),
    INDEX idx_user_parent (user_id, parent_folder_id),
    INDEX idx_hash (content_hash)
);

-- File Versions
CREATE TABLE file_versions (
    version_id BIGINT PRIMARY KEY,
    file_id BIGINT NOT NULL,
    version_number INT,
    size_bytes BIGINT,
    content_hash VARCHAR(64),
    storage_path VARCHAR(500),
    created_at TIMESTAMP,
    created_by BIGINT,
    
    UNIQUE (file_id, version_number),
    INDEX idx_file (file_id)
);

-- File Chunks (for large files)
CREATE TABLE file_chunks (
    chunk_id BIGINT PRIMARY KEY,
    chunk_hash VARCHAR(64) UNIQUE,  -- SHA-256
    size_bytes INT,
    storage_path VARCHAR(500),
    reference_count INT DEFAULT 1
);

-- File to Chunk mapping
CREATE TABLE file_chunk_map (
    file_id BIGINT,
    version_number INT,
    chunk_index INT,
    chunk_id BIGINT,
    
    PRIMARY KEY (file_id, version_number, chunk_index)
);

-- Sharing
CREATE TABLE shares (
    share_id BIGINT PRIMARY KEY,
    file_id BIGINT NOT NULL,
    shared_by BIGINT NOT NULL,
    shared_with BIGINT,  -- NULL for public link
    permission ENUM('view', 'edit'),
    link_token VARCHAR(64) UNIQUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP
);
```

---

## 4. API Design

### File Operations

```
# Upload file (small files < 10MB)
POST /api/v1/files
Content-Type: multipart/form-data
{
    file: <binary>,
    path: "/Documents/report.pdf"
}

# Upload file (chunked for large files)
# Step 1: Initialize upload
POST /api/v1/files/upload/init
{
    "path": "/Videos/movie.mp4",
    "size": 1073741824,
    "chunk_hashes": ["abc123...", "def456..."]
}
Response:
{
    "upload_id": "upl_123",
    "chunks_needed": [0, 2, 5],  -- Chunks not already stored (dedup)
    "upload_urls": {...}
}

# Step 2: Upload each needed chunk
PUT /api/v1/files/upload/{upload_id}/chunks/{index}
Body: <binary chunk data>

# Step 3: Complete upload
POST /api/v1/files/upload/{upload_id}/complete

# Download file
GET /api/v1/files/{file_id}/content
Response: Redirect to signed S3 URL

# Get file metadata
GET /api/v1/files/{file_id}

# List folder contents
GET /api/v1/files?path=/Documents

# Delete file
DELETE /api/v1/files/{file_id}

# Get sync delta (what changed since last sync)
GET /api/v1/sync/delta?cursor={last_cursor}
Response:
{
    "entries": [
        {"path": "/doc.txt", "action": "modified", "file": {...}},
        {"path": "/old.txt", "action": "deleted"}
    ],
    "cursor": "new_cursor_123",
    "has_more": false
}
```

---

## 5. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         DROPBOX ARCHITECTURE                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                            ┌─────────────┐                                 │
│                            │   Clients   │                                 │
│                            │(Desktop/Web/│                                 │
│                            │   Mobile)   │                                 │
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
│    │ Upload  │             │ Metadata │             │   Sync   │          │
│    │ Service │             │ Service  │             │ Service  │          │
│    └────┬────┘             └────┬─────┘             └────┬─────┘          │
│         │                       │                        │                 │
│         │    ┌──────────────────┴────────────────────────┘                 │
│         │    │                                                             │
│         │    ▼                                                             │
│         │ ┌──────────────────────────────────────────────────────────┐    │
│         │ │                    Message Queue (Kafka)                  │    │
│         │ └──────────────────────────┬───────────────────────────────┘    │
│         │                            │                                     │
│         │              ┌─────────────┼─────────────┐                      │
│         │              ▼             ▼             ▼                      │
│         │         ┌─────────┐  ┌──────────┐  ┌──────────┐                │
│         │         │ Chunk   │  │ Notif.   │  │ Index    │                │
│         │         │ Worker  │  │ Worker   │  │ Worker   │                │
│         │         └────┬────┘  └────┬─────┘  └────┬─────┘                │
│         │              │            │             │                       │
│         │              ▼            ▼             ▼                       │
│         │         ┌─────────┐  ┌──────────┐  ┌──────────┐                │
│         │         │ Dedup   │  │   Push   │  │  Search  │                │
│         │         │ Service │  │ (WebSocket)│ │  Index   │                │
│         │         └────┬────┘  └──────────┘  └──────────┘                │
│         │              │                                                  │
│         └──────────────┼──────────────────────────────────────────────────┤
│                        │                                                  │
│    ┌───────────────────┴────────────────────────────────────────────────┐│
│    │                           DATA STORES                               ││
│    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           ││
│    │  │ Postgres │  │  Redis   │  │   S3     │  │  Elastic │           ││
│    │  │(Metadata)│  │ (Cache/  │  │ (Files)  │  │ (Search) │           ││
│    │  │          │  │  Locks)  │  │          │  │          │           ││
│    │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           ││
│    └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Deep Dive: Chunking and Deduplication

### File Chunking

```
┌─────────────────────────────────────────────────────────────────┐
│                   FILE CHUNKING                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Why Chunk Files?                                               │
│  ──────────────────                                             │
│  • Resume interrupted uploads                                   │
│  • Parallel upload/download                                     │
│  • Efficient delta sync (only changed chunks)                  │
│  • Deduplication across files                                  │
│                                                                 │
│  Chunking Strategy:                                             │
│  ───────────────────                                            │
│                                                                 │
│  Fixed-Size Chunking (Simple):                                 │
│  ┌────┬────┬────┬────┬────┬────┐                              │
│  │ 4MB│ 4MB│ 4MB│ 4MB│ 4MB│2MB │                              │
│  └────┴────┴────┴────┴────┴────┘                              │
│  Problem: Insert at beginning shifts all chunks                │
│                                                                 │
│  Content-Defined Chunking (Better - Dropbox uses this):        │
│  ┌───────┬────┬──────┬───┬────────┐                           │
│  │ 3.2MB │4.1M│ 2.8MB│5MB│  4.9MB │                           │
│  └───────┴────┴──────┴───┴────────┘                           │
│  • Use rolling hash (Rabin fingerprint)                        │
│  • Split when hash matches pattern                             │
│  • Boundaries shift with content, not position                 │
│                                                                 │
│  Chunk Size: 4 MB average (min 2MB, max 8MB)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Deduplication

```
┌─────────────────────────────────────────────────────────────────┐
│                   DEDUPLICATION                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  How It Works:                                                  │
│  ───────────────                                                │
│  1. Client computes SHA-256 hash of each chunk                 │
│  2. Sends list of chunk hashes to server                       │
│  3. Server responds with which chunks already exist            │
│  4. Client only uploads new chunks                             │
│                                                                 │
│  Example:                                                       │
│  ─────────                                                      │
│  User A uploads file with chunks: [A, B, C, D]                 │
│  User B uploads file with chunks: [A, B, E, F]                 │
│                                                                 │
│  Chunk Storage:                                                │
│  ┌─────────────────────────────────────────┐                   │
│  │  Chunk Store                            │                   │
│  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ │                   │
│  │  │ A │ │ B │ │ C │ │ D │ │ E │ │ F │ │                   │
│  │  │ref│ │ref│ │ref│ │ref│ │ref│ │ref│ │                   │
│  │  │=2 │ │=2 │ │=1 │ │=1 │ │=1 │ │=1 │ │                   │
│  │  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  User B only uploads chunks E, F (50% savings)                 │
│                                                                 │
│  Dedup Ratio: Typically 30-60% for enterprise users           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

```python
class ChunkService:
    CHUNK_SIZE_TARGET = 4 * 1024 * 1024  # 4 MB
    
    def chunk_file(self, file_path: str) -> List[Chunk]:
        """Split file into content-defined chunks using Rabin fingerprinting"""
        chunks = []
        
        with open(file_path, 'rb') as f:
            buffer = b''
            while True:
                data = f.read(1024 * 1024)  # Read 1MB at a time
                if not data:
                    break
                buffer += data
                
                # Find chunk boundaries using rolling hash
                while len(buffer) >= self.CHUNK_SIZE_TARGET:
                    boundary = self.find_boundary(buffer)
                    chunk_data = buffer[:boundary]
                    buffer = buffer[boundary:]
                    
                    chunk_hash = hashlib.sha256(chunk_data).hexdigest()
                    chunks.append(Chunk(hash=chunk_hash, data=chunk_data))
            
            # Handle remaining data as final chunk
            if buffer:
                chunk_hash = hashlib.sha256(buffer).hexdigest()
                chunks.append(Chunk(hash=chunk_hash, data=buffer))
        
        return chunks
    
    def upload_with_dedup(self, file_id: str, chunks: List[Chunk]):
        """Upload only chunks that don't already exist"""
        
        # Check which chunks already exist
        chunk_hashes = [c.hash for c in chunks]
        existing = self.chunk_store.get_existing(chunk_hashes)
        
        # Upload only new chunks
        for chunk in chunks:
            if chunk.hash not in existing:
                storage_path = self.blob_store.upload(chunk.data)
                self.chunk_store.save(chunk.hash, storage_path)
            else:
                # Increment reference count
                self.chunk_store.increment_ref(chunk.hash)
        
        # Map file to chunks
        self.file_chunk_map.save(file_id, chunks)
```

---

## 7. Deep Dive: Sync Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│                   SYNC PROTOCOL                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Desktop Client Architecture:                                  │
│  ─────────────────────────────                                  │
│  ┌───────────────────────────────────────────────┐             │
│  │                Desktop Client                  │             │
│  │                                                │             │
│  │  ┌─────────────┐    ┌─────────────┐          │             │
│  │  │ File System │    │   Local     │          │             │
│  │  │   Watcher   │    │   Database  │          │             │
│  │  └──────┬──────┘    └─────────────┘          │             │
│  │         │                                     │             │
│  │         ▼                                     │             │
│  │  ┌─────────────┐    ┌─────────────┐          │             │
│  │  │    Sync     │◄──►│   Server    │          │             │
│  │  │   Engine    │    │   Comms     │          │             │
│  │  └─────────────┘    └─────────────┘          │             │
│  │                                                │             │
│  └───────────────────────────────────────────────┘             │
│                                                                 │
│  Sync Flow:                                                     │
│  ───────────                                                    │
│  1. File System Watcher detects local change                   │
│  2. Compute file hash and chunk hashes                         │
│  3. Upload changed chunks                                       │
│  4. Update metadata on server                                  │
│  5. Server notifies other devices via WebSocket               │
│  6. Other devices pull changes                                 │
│                                                                 │
│  Delta Sync API:                                                │
│  ────────────────                                               │
│  GET /sync/delta?cursor=abc123                                 │
│                                                                 │
│  Response:                                                      │
│  {                                                              │
│    "entries": [                                                 │
│      {                                                          │
│        "path": "/docs/file.txt",                               │
│        "action": "modified",                                    │
│        "server_modified": "2025-01-15T10:00:00Z",              │
│        "content_hash": "abc123...",                            │
│        "size": 1024                                            │
│      }                                                          │
│    ],                                                           │
│    "cursor": "def456",                                         │
│    "has_more": false                                           │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Deep Dive: Conflict Resolution

```
┌─────────────────────────────────────────────────────────────────┐
│                   CONFLICT RESOLUTION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scenario: Two devices edit same file offline                  │
│  ──────────────────────────────────────────────                  │
│                                                                 │
│  Device A               Server                Device B          │
│     │                     │                      │              │
│     │◄── v1: "hello" ────►│◄── v1: "hello" ────►│              │
│     │                     │                      │              │
│     │   [Goes offline]    │    [Goes offline]   │              │
│     │                     │                      │              │
│     │   Edit: "hello A"   │    Edit: "hello B"  │              │
│     │                     │                      │              │
│     │   [Comes online]    │                      │              │
│     │── Upload v2 ───────►│                      │              │
│     │                     │   [Comes online]     │              │
│     │                     │◄── Upload v2 ────────│              │
│     │                     │                      │              │
│     │   CONFLICT!         │                      │              │
│                                                                 │
│  Resolution Strategy (Dropbox approach):                       │
│  ─────────────────────────────────────────                      │
│  • First sync wins - becomes the "real" file                  │
│  • Second sync creates conflict copy:                          │
│    "file (Device B's conflicted copy 2025-01-15).txt"         │
│  • User manually resolves                                      │
│                                                                 │
│  Implementation:                                                │
│  ─────────────────                                              │
│  1. Client sends: {path, content_hash, parent_revision}        │
│  2. Server checks if parent_revision matches current           │
│  3. If match: Update normally                                  │
│  4. If mismatch: Return conflict, client creates copy         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Notification System

```
┌─────────────────────────────────────────────────────────────────┐
│                   REAL-TIME NOTIFICATIONS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Architecture:                                                  │
│  ──────────────                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                                                       │      │
│  │  File Change ──► Kafka ──► Notification Worker       │      │
│  │                                │                      │      │
│  │                      ┌─────────┴─────────┐           │      │
│  │                      ▼                   ▼           │      │
│  │               ┌───────────┐       ┌───────────┐     │      │
│  │               │ WebSocket │       │   Push    │     │      │
│  │               │  Server   │       │ (FCM/APNs)│     │      │
│  │               └─────┬─────┘       └───────────┘     │      │
│  │                     │                                │      │
│  │                     ▼                                │      │
│  │              Desktop Clients                        │      │
│  │              (Long polling / WebSocket)             │      │
│  │                                                       │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  Long Polling (Fallback):                                      │
│  ─────────────────────────                                      │
│  GET /notifications/longpoll?timeout=60                        │
│  • Server holds request until:                                 │
│    - Change occurs → Return immediately                        │
│    - Timeout → Return empty, client retries                    │
│  • Reduces connections vs constant polling                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| File Storage | S3 (multi-region) | Durability, scalability |
| Metadata | PostgreSQL (sharded) | ACID, complex queries |
| Cache | Redis Cluster | Hot metadata |
| Queue | Kafka | Event streaming |
| Real-time | WebSocket + Long polling | Desktop sync |
| Chunking | Custom (Rabin) | Content-defined |
| Search | Elasticsearch | Full-text search |
| CDN | CloudFront | Download acceleration |

---

## 11. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CHUNKING FOR EFFICIENCY                                     │
│     Content-defined chunking enables delta sync                │
│     Only transfer changed portions                             │
│                                                                 │
│  2. DEDUPLICATION                                               │
│     Hash-based dedup saves 30-60% storage                      │
│     Client-side hash computation                               │
│                                                                 │
│  3. CONFLICT RESOLUTION                                         │
│     Last-write-wins with conflict copies                       │
│     Let user resolve manually                                  │
│                                                                 │
│  4. CURSOR-BASED SYNC                                           │
│     Delta API with cursor for efficient sync                   │
│     Only fetch what changed                                    │
│                                                                 │
│  5. VERSIONING                                                  │
│     Keep file history for recovery                             │
│     Storage efficient with dedup                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. References

- [17-blob-storage-and-cdn.md](/system-design/fundamentals/17-blob-storage-and-cdn.md) - Storage
- [15-real-time-communication.md](/system-design/fundamentals/15-real-time-communication.md) - Sync
- [20-fault-tolerance.md](/system-design/fundamentals/20-fault-tolerance.md) - Durability

---

[← Back to Problems](/system-design/problems/00-index.md) | [Next: Notification System →](/system-design/problems/09-notification-system.md)
