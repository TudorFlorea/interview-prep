# Design YouTube

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a video sharing platform like YouTube that allows users to upload, transcode, store, and stream videos at scale with adaptive bitrate streaming.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Upload videos** - Support large file uploads (up to 256GB)
2. **Transcode videos** - Convert to multiple resolutions/formats
3. **Stream videos** - Adaptive bitrate streaming
4. **Search videos** - Find content by title, tags, description
5. **View analytics** - Watch counts, engagement metrics
6. **Subscribe to channels** - Follow creators
7. **Like/Comment** - Engage with content
8. **Recommendations** - Personalized video suggestions (optional)

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | 99.9% availability |
| **CAP** | AP - Eventual consistency acceptable |
| **Compliance** | DMCA, COPPA, regional content restrictions |
| **Scalability** | 2B users, 1B videos, 500M DAU |
| **Latency** | Video start < 2s, search < 200ms |
| **Environment** | Global, multi-device |
| **Durability** | Never lose uploaded content |
| **Security** | DRM, content protection |

---

## 2. Back of Envelope Calculations

### Scale Estimation

```
Users:
- Total users: 2 billion
- DAU: 500 million
- Average watch time: 40 minutes/day

Videos:
- Total videos: 1 billion
- New uploads: 500,000 videos/day
- 500K / 86400 ≈ 6 uploads/second
- Peak: ~20 uploads/second

Streaming:
- Concurrent viewers: 50 million (peak)
- Average video bitrate: 5 Mbps
- Peak bandwidth: 50M × 5 Mbps = 250 Pbps
```

### Storage Estimation

```
Video Storage (per video):
- Original: 1 GB average
- Transcoded versions: 5 GB (all resolutions)
- Total per video: 6 GB

Daily new storage:
- 500K videos × 6 GB = 3 PB/day
- Per year: ~1 EB

Existing library:
- 1B videos × 6 GB = 6 EB total
```

---

## 3. Core Entities

```sql
-- Videos
CREATE TABLE videos (
    video_id BIGINT PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    duration_seconds INT,
    status ENUM('processing', 'ready', 'failed', 'blocked'),
    visibility ENUM('public', 'private', 'unlisted'),
    upload_time TIMESTAMP,
    published_time TIMESTAMP,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    thumbnail_url VARCHAR(500),
    
    INDEX idx_channel (channel_id),
    INDEX idx_status (status),
    INDEX idx_published (published_time DESC)
);

-- Video Files (multiple resolutions)
CREATE TABLE video_files (
    file_id BIGINT PRIMARY KEY,
    video_id BIGINT NOT NULL,
    resolution ENUM('144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '4k'),
    codec VARCHAR(20),
    bitrate_kbps INT,
    file_size_bytes BIGINT,
    storage_path VARCHAR(500),
    cdn_url VARCHAR(500),
    
    INDEX idx_video (video_id)
);

-- Channels
CREATE TABLE channels (
    channel_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100),
    description TEXT,
    subscriber_count BIGINT DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    created_at TIMESTAMP
);

-- Subscriptions
CREATE TABLE subscriptions (
    user_id BIGINT,
    channel_id BIGINT,
    subscribed_at TIMESTAMP,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    
    PRIMARY KEY (user_id, channel_id),
    INDEX idx_channel (channel_id)
);
```

---

## 4. API Design

### Upload API

```
# Request upload URL (resumable upload)
POST /api/v1/videos/upload/init
Request:
{
    "filename": "my_video.mp4",
    "file_size": 1073741824,
    "content_type": "video/mp4"
}
Response:
{
    "upload_id": "abc123",
    "upload_url": "https://upload.youtube.com/...",
    "chunk_size": 8388608
}

# Upload chunk
PUT /api/v1/videos/upload/{upload_id}
Headers:
    Content-Range: bytes 0-8388607/1073741824
Body: <binary chunk data>

# Complete upload and create video
POST /api/v1/videos
{
    "upload_id": "abc123",
    "title": "My Video",
    "description": "...",
    "visibility": "public",
    "tags": ["music", "tutorial"]
}
```

### Streaming API

```
# Get video manifest (HLS)
GET /api/v1/videos/{video_id}/manifest.m3u8

# Get video segment
GET /api/v1/videos/{video_id}/segments/{resolution}/{segment_id}.ts

# Record view/progress
POST /api/v1/videos/{video_id}/views
{
    "watch_time_seconds": 120,
    "quality": "1080p"
}
```

---

## 5. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         YOUTUBE ARCHITECTURE                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                            ┌─────────────┐                                 │
│                            │   Clients   │                                 │
│                            │(Web/Mobile/TV)                                │
│                            └──────┬──────┘                                 │
│                                   │                                        │
│              ┌────────────────────┴────────────────────┐                  │
│              │                  CDN                     │                  │
│              │   (Edge servers for video streaming)     │                  │
│              └────────────────────┬────────────────────┘                  │
│                                   │                                        │
│                        ┌──────────┴──────────┐                            │
│                        │   Load Balancers    │                            │
│                        └──────────┬──────────┘                            │
│                                   │                                        │
│    ┌──────────────────────────────┼──────────────────────────────┐        │
│    │                       API Gateway                            │        │
│    └──────────────────────────────┼──────────────────────────────┘        │
│                                   │                                        │
│    ┌──────────┬───────────────────┼───────────────────┬──────────┐        │
│    ▼          ▼                   ▼                   ▼          ▼        │
│ ┌──────┐  ┌──────┐          ┌──────────┐        ┌──────┐  ┌──────────┐   │
│ │Upload│  │Video │          │ Streaming│        │Search│  │   User   │   │
│ │ Svc  │  │ Svc  │          │   Svc    │        │ Svc  │  │   Svc    │   │
│ └──┬───┘  └──┬───┘          └────┬─────┘        └──┬───┘  └────┬─────┘   │
│    │         │                   │                 │           │          │
│    │    ┌────┴───────────────────┴─────────────────┴───────────┘          │
│    │    │                                                                  │
│    │    ▼                                                                  │
│    │ ┌─────────────────────────────────────────────────────────────┐      │
│    │ │                      Message Queue (Kafka)                   │      │
│    │ └─────────────────────────────┬───────────────────────────────┘      │
│    │                               │                                       │
│    │         ┌─────────────────────┼─────────────────────┐                │
│    │         ▼                     ▼                     ▼                │
│    │    ┌─────────┐          ┌──────────┐          ┌──────────┐          │
│    │    │Transcode│          │ Indexer  │          │Analytics │          │
│    │    │ Workers │          │ Workers  │          │ Workers  │          │
│    │    └────┬────┘          └────┬─────┘          └────┬─────┘          │
│    │         │                    │                     │                 │
│    │         ▼                    ▼                     ▼                 │
│    │    ┌─────────┐          ┌──────────┐          ┌──────────┐          │
│    │    │   S3    │          │Elastic   │          │ClickHouse│          │
│    │    │ (Video) │          │Search    │          │(Analytics)│          │
│    │    └─────────┘          └──────────┘          └──────────┘          │
│    │                                                                       │
│    └───────────────────────────────────────────────────────────────────────┤
│                                                                            │
│    ┌───────────────────────────────────────────────────────────────────┐  │
│    │                         DATA STORES                                │  │
│    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│    │  │ Postgres │  │  Redis   │  │   S3     │  │Cassandra │          │  │
│    │  │(Metadata)│  │ (Cache)  │  │ (Videos) │  │ (Views)  │          │  │
│    │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │  │
│    └───────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Deep Dive: Video Upload & Transcoding

### Chunked Upload Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHUNKED UPLOAD FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Initialize Upload                                           │
│  ────────────────────                                           │
│  Client → Upload Service: Request upload session                │
│  Upload Service → Client: upload_id + presigned URLs            │
│                                                                 │
│  2. Upload Chunks (Resumable)                                   │
│  ─────────────────────────────                                  │
│  ┌────────┐                    ┌────────┐                      │
│  │ Client │ ──── Chunk 1 ────► │   S3   │                      │
│  │        │ ──── Chunk 2 ────► │(Staging)│                      │
│  │        │ ──── Chunk N ────► │        │                      │
│  └────────┘                    └────────┘                      │
│                                                                 │
│  Features:                                                      │
│  • Resume from last successful chunk on failure                 │
│  • Parallel chunk uploads (faster)                              │
│  • Checksum validation per chunk                                │
│                                                                 │
│  3. Complete Upload                                             │
│  ──────────────────                                             │
│  Client → Upload Service: Complete upload with metadata         │
│  Upload Service: Assemble chunks, validate, enqueue transcoding │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Transcoding Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                   TRANSCODING PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Original Video                                                 │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐                                               │
│  │   Splitter  │  Split into segments (2-10 seconds each)      │
│  └──────┬──────┘                                               │
│         │                                                       │
│    ┌────┴────┬────────┬────────┬────────┐                      │
│    ▼         ▼        ▼        ▼        ▼                      │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│ │Seg 1 │ │Seg 2 │ │Seg 3 │ │Seg 4 │ │Seg N │  Parallel        │
│ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘  Processing       │
│    │        │        │        │        │                        │
│    ▼        ▼        ▼        ▼        ▼                        │
│  Transcode each segment to multiple resolutions:               │
│  • 144p  (256×144)   - 100 kbps                                │
│  • 240p  (426×240)   - 300 kbps                                │
│  • 360p  (640×360)   - 700 kbps                                │
│  • 480p  (854×480)   - 1.5 Mbps                                │
│  • 720p  (1280×720)  - 3 Mbps                                  │
│  • 1080p (1920×1080) - 6 Mbps                                  │
│  • 1440p (2560×1440) - 13 Mbps                                 │
│  • 4K    (3840×2160) - 25 Mbps                                 │
│                                                                 │
│  Output: HLS/DASH segments + manifest files                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Transcoding Worker

```python
class TranscodeWorker:
    def __init__(self):
        self.s3 = S3Client()
        self.queue = KafkaConsumer('transcode-jobs')
        
    def process_job(self, job):
        video_id = job['video_id']
        source_path = job['source_path']
        
        # Download original
        local_path = self.s3.download(source_path)
        
        # Split into segments
        segments = self.split_video(local_path, segment_duration=4)
        
        # Transcode each segment to all resolutions
        for resolution in ['144p', '240p', '360p', '480p', '720p', '1080p']:
            for segment in segments:
                output = self.transcode_segment(segment, resolution)
                self.s3.upload(output, f"videos/{video_id}/{resolution}/")
        
        # Generate manifest
        manifest = self.generate_hls_manifest(video_id)
        self.s3.upload(manifest, f"videos/{video_id}/manifest.m3u8")
        
        # Update status
        self.update_video_status(video_id, 'ready')
    
    def transcode_segment(self, segment_path, resolution):
        """Use FFmpeg for transcoding"""
        settings = RESOLUTION_SETTINGS[resolution]
        cmd = f"""
            ffmpeg -i {segment_path} 
            -vf scale={settings['width']}:{settings['height']}
            -c:v h264 -b:v {settings['bitrate']}
            -c:a aac -b:a 128k
            {output_path}
        """
        subprocess.run(cmd, shell=True)
        return output_path
```

---

## 7. Deep Dive: Adaptive Bitrate Streaming

### HLS (HTTP Live Streaming)

```
┌─────────────────────────────────────────────────────────────────┐
│                   ADAPTIVE STREAMING                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Master Playlist (manifest.m3u8):                              │
│  ─────────────────────────────────                              │
│  #EXTM3U                                                        │
│  #EXT-X-STREAM-INF:BANDWIDTH=300000,RESOLUTION=426x240         │
│  240p/playlist.m3u8                                             │
│  #EXT-X-STREAM-INF:BANDWIDTH=700000,RESOLUTION=640x360         │
│  360p/playlist.m3u8                                             │
│  #EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480        │
│  480p/playlist.m3u8                                             │
│  #EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720       │
│  720p/playlist.m3u8                                             │
│  #EXT-X-STREAM-INF:BANDWIDTH=6000000,RESOLUTION=1920x1080      │
│  1080p/playlist.m3u8                                            │
│                                                                 │
│  Resolution Playlist (720p/playlist.m3u8):                     │
│  ──────────────────────────────────────                         │
│  #EXTM3U                                                        │
│  #EXT-X-TARGETDURATION:4                                        │
│  #EXTINF:4.0,                                                   │
│  segment_001.ts                                                 │
│  #EXTINF:4.0,                                                   │
│  segment_002.ts                                                 │
│  ...                                                            │
│                                                                 │
│  Client Behavior:                                               │
│  ─────────────────                                              │
│  1. Fetch master playlist                                       │
│  2. Select quality based on bandwidth                           │
│  3. Fetch segments from selected quality                        │
│  4. Monitor buffer & bandwidth                                  │
│  5. Switch quality if needed (up/down)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CDN Architecture for Video

```
┌─────────────────────────────────────────────────────────────────┐
│                   VIDEO CDN ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────┐     ┌────────────┐     ┌────────────┐     ┌─────┐ │
│  │ Client │────►│ Edge PoP   │────►│ Regional   │────►│ S3  │ │
│  │        │     │ (Closest)  │     │ Cache      │     │     │ │
│  └────────┘     └────────────┘     └────────────┘     └─────┘ │
│                                                                 │
│  Caching Strategy:                                              │
│  ──────────────────                                             │
│  • Popular videos: Cached at edge (1000+ PoPs globally)        │
│  • Medium popularity: Regional cache (50 locations)            │
│  • Long tail: Origin (S3)                                      │
│                                                                 │
│  Cache Hit Ratios:                                              │
│  ──────────────────                                             │
│  • First segment: 95%+ (always in cache)                       │
│  • Overall: 90%+ for popular content                           │
│  • Long tail: 60-70%                                           │
│                                                                 │
│  Prefetching:                                                   │
│  ─────────────                                                  │
│  • Predictively push next segments to edge                     │
│  • Based on viewer position + typical watch patterns           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. View Counting System

```
┌─────────────────────────────────────────────────────────────────┐
│                   VIEW COUNTING                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Challenge: Billions of views/day with deduplication           │
│                                                                 │
│  Architecture:                                                  │
│  ──────────────                                                 │
│  ┌────────┐    ┌───────┐    ┌────────────┐    ┌───────────┐   │
│  │ Client │───►│ Kafka │───►│ View       │───►│ Cassandra │   │
│  │ (View) │    │       │    │ Processor  │    │ (Storage) │   │
│  └────────┘    └───────┘    └────────────┘    └───────────┘   │
│                                   │                             │
│                                   ▼                             │
│                            ┌────────────┐                      │
│                            │   Redis    │                      │
│                            │ (Dedup/    │                      │
│                            │  Counter)  │                      │
│                            └────────────┘                      │
│                                                                 │
│  Deduplication Rules:                                          │
│  ─────────────────────                                          │
│  • Same user watching same video within 30s = 1 view           │
│  • Minimum watch time (30 seconds) required                    │
│  • Bot detection (unusual patterns)                            │
│                                                                 │
│  Counter Strategy:                                              │
│  ──────────────────                                             │
│  • Real-time: Redis INCR (approximate)                         │
│  • Hourly: Batch reconciliation with Cassandra                 │
│  • Public count may lag real count by minutes                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Search & Discovery

```
┌─────────────────────────────────────────────────────────────────┐
│                   VIDEO SEARCH                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Indexing Pipeline:                                             │
│  ───────────────────                                            │
│  Video Published → Kafka → Indexer → Elasticsearch              │
│                                                                 │
│  Search Document:                                               │
│  ─────────────────                                              │
│  {                                                              │
│    "video_id": "abc123",                                        │
│    "title": "How to cook pasta",                                │
│    "description": "Step by step guide...",                      │
│    "tags": ["cooking", "pasta", "italian"],                     │
│    "channel_name": "Chef John",                                 │
│    "channel_subscribers": 5000000,                              │
│    "view_count": 1234567,                                       │
│    "like_ratio": 0.95,                                          │
│    "duration": 600,                                             │
│    "published_date": "2025-01-15",                              │
│    "captions": "full transcript...",                            │
│    "category": "howto"                                          │
│  }                                                              │
│                                                                 │
│  Ranking Signals:                                               │
│  ─────────────────                                              │
│  1. Text relevance (title, description, captions)              │
│  2. Engagement (views, likes, comments, watch time)            │
│  3. Freshness (recent videos boosted)                          │
│  4. Channel authority (subscriber count, history)              │
│  5. Personalization (user's watch history)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Video Storage | S3 + Glacier | Durability, cost tiers |
| CDN | Multi-CDN (Akamai, Cloudflare) | Global coverage, redundancy |
| Metadata DB | PostgreSQL (sharded) | ACID for critical data |
| View Counts | Cassandra | Write-heavy, high availability |
| Cache | Redis Cluster | Hot video metadata |
| Queue | Kafka | High throughput events |
| Search | Elasticsearch | Full-text + ranking |
| Transcoding | FFmpeg on Kubernetes | Scalable compute |
| Analytics | ClickHouse | Time-series aggregations |

---

## 11. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CHUNKED UPLOAD                                              │
│     Resumable uploads essential for large files                 │
│     Direct-to-S3 with presigned URLs                           │
│                                                                 │
│  2. PARALLEL TRANSCODING                                        │
│     Split video into segments for parallel processing           │
│     Generate multiple resolutions + codecs                      │
│                                                                 │
│  3. ADAPTIVE STREAMING                                          │
│     HLS/DASH for quality adaptation                            │
│     Client monitors bandwidth and switches                      │
│                                                                 │
│  4. CDN IS CRITICAL                                             │
│     95%+ of bandwidth from CDN edge                            │
│     Multi-CDN for reliability                                   │
│                                                                 │
│  5. EVENTUAL CONSISTENCY                                        │
│     View counts can lag                                         │
│     Search index updates async                                  │
│                                                                 │
│  6. STORAGE OPTIMIZATION                                        │
│     Hot/warm/cold tiers                                         │
│     Long-tail videos to cheaper storage                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. References

- [17-blob-storage-and-cdn.md](/system-design/fundamentals/17-blob-storage-and-cdn.md) - CDN & storage patterns
- [07-caching.md](/system-design/fundamentals/07-caching.md) - Caching strategies
- [09-message-queues.md](/system-design/fundamentals/09-message-queues.md) - Async processing

---

[← Back to Problems](/system-design/problems/00-index.md) | [Next: Uber →](/system-design/problems/06-uber.md)
