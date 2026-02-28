# Design Instagram

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a photo and video sharing social network like Instagram that allows users to upload content, follow other users, and view a personalized feed.

**Difficulty**: 🟡 Intermediate (Tier 2)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Upload photos/videos** - Post media with captions, filters, tags
2. **Follow/Unfollow users** - Build social graph
3. **Home feed** - View posts from followed users
4. **Like and Comment** - Engage with content
5. **Stories** - Ephemeral 24-hour content
6. **Explore page** - Discover new content (optional)
7. **Direct messaging** - Private conversations (optional)

### Non-Functional Requirements (FCC-SLEDS)

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | 99.99% availability |
| **CAP** | AP - Eventual consistency for feeds |
| **Compliance** | Content moderation, COPPA, GDPR |
| **Scalability** | 2B users, 500M DAU, 100M posts/day |
| **Latency** | Feed load &lt; 300ms, Upload &lt; 2s |
| **Environment** | Global, mobile-first |
| **Durability** | Never lose user media |
| **Security** | Private accounts, content encryption |

---

## 2. Back of Envelope Calculations

### Scale Estimation

```
Users:
- Total users: 2 billion
- DAU: 500 million
- Average follows: 300 per user

Posts:
- 100 million posts/day
- 100M / 86400 ≈ 1200 posts/second
- Peak: ~4000 posts/second

Feed reads:
- Average user opens app 5 times/day
- 500M × 5 = 2.5 billion feed reads/day
- 2.5B / 86400 ≈ 29000 reads/second
- Peak: ~90000 reads/second

Stories:
- 500M stories/day (ephemeral, higher volume)
- 6000 stories/second
```

### Storage Estimation

```
Photo Storage:
- Average photo: 2 MB (with multiple resolutions)
- 100M posts × 70% photos = 70M photos/day
- 70M × 2 MB = 140 TB/day
- Per year: 51 PB

Video Storage:
- Average video: 50 MB (with compression)
- 100M posts × 30% videos = 30M videos/day
- 30M × 50 MB = 1.5 PB/day
- Per year: 547 PB

Stories (24h retention):
- 500M stories × 5 MB = 2.5 PB (max at any time)

Metadata:
- 100M posts × 1 KB = 100 GB/day
```

---

## 3. Data Model

### Core Entities

```sql
-- Users
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    profile_picture_url VARCHAR(500),
    is_private BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    follower_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    post_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Posts
CREATE TABLE posts (
    post_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    caption TEXT,
    location_id BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    is_comments_disabled BOOLEAN DEFAULT FALSE,
    
    INDEX idx_user_created (user_id, created_at DESC)
);

-- Post Media (support multiple images/videos per post)
CREATE TABLE post_media (
    media_id BIGINT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    media_type ENUM('photo', 'video') NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    width INT,
    height INT,
    duration_seconds INT,  -- for videos
    order_index INT DEFAULT 0,
    
    INDEX idx_post_id (post_id)
);

-- Stories (24h ephemeral)
CREATE TABLE stories (
    story_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    media_type ENUM('photo', 'video') NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,  -- created_at + 24h
    view_count INT DEFAULT 0,
    
    INDEX idx_user_expires (user_id, expires_at)
);

-- Follows
CREATE TABLE follows (
    follower_id BIGINT NOT NULL,
    followee_id BIGINT NOT NULL,
    status ENUM('pending', 'accepted') DEFAULT 'accepted',
    created_at TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (follower_id, followee_id),
    INDEX idx_followee_status (followee_id, status)
);

-- Likes
CREATE TABLE likes (
    user_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (user_id, post_id),
    INDEX idx_post_id (post_id)
);

-- Comments
CREATE TABLE comments (
    comment_id BIGINT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_comment_id BIGINT,  -- for replies
    content TEXT NOT NULL,
    like_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_post_created (post_id, created_at)
);
```

---

## 4. High-Level Design

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         INSTAGRAM ARCHITECTURE                                 │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│                              ┌─────────────┐                                   │
│                              │   Clients   │                                   │
│                              │ (iOS/Android)│                                  │
│                              └──────┬──────┘                                   │
│                                     │                                          │
│                    ┌────────────────┴────────────────┐                        │
│                    │              CDN                 │                        │
│                    │  (CloudFront/Akamai/Fastly)      │                        │
│                    │  - Photos/Videos                 │                        │
│                    │  - Static assets                 │                        │
│                    └────────────────┬────────────────┘                        │
│                                     │                                          │
│                          ┌──────────┴──────────┐                              │
│                          │   Load Balancers    │                              │
│                          └──────────┬──────────┘                              │
│                                     │                                          │
│  ┌──────────────────────────────────┼──────────────────────────────────────┐  │
│  │                           API Gateway                                    │  │
│  └──────────────────────────────────┼──────────────────────────────────────┘  │
│                                     │                                          │
│     ┌───────────────────────────────┼───────────────────────────────┐         │
│     │              │                │                │              │          │
│     ▼              ▼                ▼                ▼              ▼          │
│ ┌────────┐   ┌──────────┐    ┌──────────┐    ┌──────────┐   ┌──────────┐     │
│ │ Post   │   │ Feed     │    │ User     │    │ Story    │   │ Media    │     │
│ │Service │   │ Service  │    │ Service  │    │ Service  │   │ Service  │     │
│ └───┬────┘   └────┬─────┘    └────┬─────┘    └────┬─────┘   └────┬─────┘     │
│     │             │               │               │              │            │
│     │    ┌────────┴───────────────┴───────────────┴────────┐     │            │
│     │    │                                                  │     │            │
│     │    ▼                                                  ▼     │            │
│     │ ┌─────────────┐                              ┌─────────────┐│            │
│     │ │   Redis     │                              │   Graph     ││            │
│     │ │   Cache     │                              │   Service   ││            │
│     │ └─────────────┘                              └─────────────┘│            │
│     │                                                             │            │
│     └─────────────────────────┬───────────────────────────────────┘            │
│                               │                                                │
│                         ┌─────┴─────┐                                          │
│                         │   Kafka   │                                          │
│                         └─────┬─────┘                                          │
│                               │                                                │
│     ┌─────────────────────────┼─────────────────────────┐                     │
│     │                         │                         │                      │
│     ▼                         ▼                         ▼                      │
│ ┌──────────┐           ┌──────────┐            ┌──────────────┐               │
│ │ Fanout   │           │  Search  │            │ Notification │               │
│ │ Workers  │           │ Indexer  │            │   Workers    │               │
│ └──────────┘           └──────────┘            └──────────────┘               │
│                                                                                │
│ ┌────────────────────────────────────────────────────────────────────────────┐│
│ │                           DATA STORES                                       ││
│ │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    ││
│ │  │ Posts DB │  │ Users DB │  │ Graph DB │  │   S3     │  │Analytics │    ││
│ │  │(Cassandra│  │(Postgres)│  │ (Redis/  │  │ (Media)  │  │(ClickHse)│    ││
│ │  │          │  │          │  │  TAO)    │  │          │  │          │    ││
│ │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘    ││
│ └────────────────────────────────────────────────────────────────────────────┘│
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deep Dive: Media Upload Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEDIA UPLOAD FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Client requests upload URL                                  │
│  ────────────────────────────                                   │
│  POST /api/v1/media/upload-url                                  │
│  → Returns presigned S3 URL                                     │
│                                                                 │
│  2. Client uploads directly to S3                               │
│  ──────────────────────────────                                 │
│  PUT {presigned_url}                                            │
│  → Upload bypasses our servers                                  │
│                                                                 │
│  3. S3 triggers processing pipeline                             │
│  ─────────────────────────────────                              │
│  S3 Event → Lambda/Worker                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   PROCESSING PIPELINE                    │   │
│  │                                                          │   │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐            │   │
│  │  │ Content  │──►│  Image   │──►│  Store   │            │   │
│  │  │ Safety   │   │Processing│   │ Variants │            │   │
│  │  │  Check   │   │          │   │          │            │   │
│  │  └──────────┘   └──────────┘   └──────────┘            │   │
│  │       │              │              │                   │   │
│  │       ▼              ▼              ▼                   │   │
│  │  - NSFW check   - Resize       - Original (S3)         │   │
│  │  - Banned hash  - Compress     - Large (1080x1080)     │   │
│  │  - Face detect  - Thumbnail    - Medium (640x640)      │   │
│  │                 - Strip EXIF   - Small (320x320)       │   │
│  │                 - Apply filter - Thumbnail (150x150)   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  4. Client creates post with processed media                    │
│  ───────────────────────────────────────────                    │
│  POST /api/v1/posts                                             │
│  {media_ids: [...], caption: "...", location: {...}}           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Image Processing Service

```python
class MediaProcessor:
    VARIANTS = [
        {'name': 'large', 'max_size': 1080, 'quality': 85},
        {'name': 'medium', 'max_size': 640, 'quality': 80},
        {'name': 'small', 'max_size': 320, 'quality': 75},
        {'name': 'thumbnail', 'max_size': 150, 'quality': 70}
    ]
    
    async def process_image(self, s3_key: str) -> ProcessingResult:
        # Download original
        original = await self.s3.download(s3_key)
        
        # Content safety check
        if not await self.safety_check(original):
            return ProcessingResult(status='rejected', reason='content_violation')
        
        # Generate all variants
        variants = {}
        for variant in self.VARIANTS:
            processed = self.resize_and_compress(
                original,
                max_size=variant['max_size'],
                quality=variant['quality']
            )
            
            variant_key = f"processed/{variant['name']}/{s3_key}"
            await self.s3.upload(variant_key, processed)
            variants[variant['name']] = variant_key
        
        return ProcessingResult(
            status='success',
            variants=variants,
            metadata={
                'width': original.width,
                'height': original.height,
                'format': original.format
            }
        )
    
    def resize_and_compress(self, image: Image, max_size: int, quality: int) -> bytes:
        # Maintain aspect ratio
        ratio = min(max_size / image.width, max_size / image.height)
        if ratio < 1:
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.LANCZOS)
        
        # Strip EXIF data for privacy
        data = list(image.getdata())
        clean_image = Image.new(image.mode, image.size)
        clean_image.putdata(data)
        
        # Compress
        buffer = io.BytesIO()
        clean_image.save(buffer, format='JPEG', quality=quality, optimize=True)
        return buffer.getvalue()
```

---

## 6. Feed Generation

### Feed Algorithm Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEED GENERATION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Instagram moved from chronological to ranked feed              │
│                                                                 │
│  Ranking Signals:                                               │
│  ─────────────────                                              │
│  1. Interest: How likely you'll engage (ML prediction)          │
│  2. Recency: Newer posts ranked higher                          │
│  3. Relationship: Posts from close friends rank higher          │
│  4. Frequency: How often you open app (affects pool size)       │
│  5. Following: Total accounts followed (affects diversity)      │
│  6. Session time: How long you typically browse                 │
│                                                                 │
│  Ranking Formula (simplified):                                  │
│  ──────────────────────────────                                 │
│  Score = (Interest × 0.4) +                                     │
│          (Recency × 0.3) +                                      │
│          (Relationship × 0.2) +                                 │
│          (Engagement × 0.1)                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Feed Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEED GENERATION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User opens app                                              │
│  ───────────────────                                            │
│                                                                 │
│  2. Get candidate posts                                         │
│  ──────────────────────                                         │
│  • Pre-computed feed from cache (last 500 post IDs)            │
│  • If expired/missing, regenerate:                              │
│    - Get followees                                              │
│    - For each: get recent posts (last 7 days)                  │
│    - Add celebrity posts (pull model)                          │
│                                                                 │
│  3. Rank candidates                                             │
│  ──────────────────                                             │
│  • ML model predicts engagement probability                     │
│  • Apply ranking formula                                        │
│  • Inject ads (every ~4-5 posts)                               │
│  • Apply diversity rules (no 3+ posts from same user)          │
│                                                                 │
│  4. Return top N posts                                          │
│  ──────────────────────                                         │
│  • Hydrate with full post data                                 │
│  • Include user info, like counts, etc.                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

```python
class FeedService:
    def __init__(self):
        self.cache = Redis()
        self.post_db = PostDatabase()
        self.ranking_model = FeedRankingModel()
    
    async def get_feed(
        self, 
        user_id: int, 
        cursor: str = None,
        limit: int = 20
    ) -> FeedResponse:
        
        # 1. Get candidate post IDs from cache
        cached_feed = await self.cache.zrevrange(
            f"feed:{user_id}",
            0, 500  # Keep 500 candidates
        )
        
        if not cached_feed:
            # Regenerate feed
            cached_feed = await self.regenerate_feed(user_id)
        
        # 2. Apply cursor (pagination)
        start_idx = 0
        if cursor:
            start_idx = self.decode_cursor(cursor)
        
        candidates = cached_feed[start_idx:start_idx + limit * 3]  # Over-fetch for ranking
        
        # 3. Rank candidates
        post_data = await self.post_db.get_posts(candidates)
        ranked = self.ranking_model.rank(user_id, post_data)
        
        # 4. Apply diversity rules
        diversified = self.apply_diversity(ranked)
        
        # 5. Return top N
        result_posts = diversified[:limit]
        next_cursor = self.encode_cursor(start_idx + limit)
        
        return FeedResponse(
            posts=result_posts,
            next_cursor=next_cursor,
            has_more=len(diversified) > limit
        )
    
    def apply_diversity(self, posts: List[Post]) -> List[Post]:
        """Ensure no more than 2 consecutive posts from same user"""
        result = []
        user_streak = {}
        
        for post in posts:
            streak = user_streak.get(post.user_id, 0)
            if streak < 2:
                result.append(post)
                user_streak[post.user_id] = streak + 1
                # Reset other users
                for uid in user_streak:
                    if uid != post.user_id:
                        user_streak[uid] = 0
        
        return result
```

---

## 7. Stories Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    STORIES SYSTEM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Key Differences from Posts:                                    │
│  ────────────────────────────                                   │
│  • Ephemeral: Auto-delete after 24 hours                        │
│  • Higher volume: More stories than posts                       │
│  • Different consumption: Horizontal scroll, auto-advance       │
│  • Viewers list: Track who viewed each story                    │
│                                                                 │
│  Storage Strategy:                                              │
│  ─────────────────                                              │
│  • Use TTL-based storage (Redis with expiry)                    │
│  • Hot storage for active stories                               │
│  • Archive to S3 for "Highlights"                               │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   STORIES TRAY                             │ │
│  │                                                            │ │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐             │ │
│  │  │User│ │User│ │User│ │User│ │User│ │User│  ...         │ │
│  │  │ A  │ │ B  │ │ C  │ │ D  │ │ E  │ │ F  │             │ │
│  │  │(3) │ │(1) │ │(5) │ │(2) │ │(1) │ │(4) │             │ │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘             │ │
│  │   New    New   Seen   Seen   Seen   Seen                │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Ordering: Unseen first, then by recency + relationship        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Stories Data Model (Redis)

```python
class StoriesService:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.STORY_TTL = 86400  # 24 hours
    
    async def add_story(self, user_id: int, story: Story):
        # Store story data
        story_key = f"story:{story.id}"
        await self.redis.hset(story_key, mapping={
            'user_id': user_id,
            'media_url': story.media_url,
            'media_type': story.media_type,
            'created_at': story.created_at.timestamp()
        })
        await self.redis.expire(story_key, self.STORY_TTL)
        
        # Add to user's story list
        user_stories_key = f"user_stories:{user_id}"
        await self.redis.zadd(
            user_stories_key,
            {story.id: story.created_at.timestamp()}
        )
        await self.redis.expire(user_stories_key, self.STORY_TTL)
        
        # Notify followers (fanout)
        await self.fanout_story_notification(user_id, story.id)
    
    async def get_stories_tray(self, user_id: int) -> List[StoryTray]:
        # Get followed users with active stories
        following = await self.get_following(user_id)
        
        tray = []
        for followee_id in following:
            stories = await self.redis.zrevrange(
                f"user_stories:{followee_id}",
                0, -1
            )
            
            if stories:
                # Check if user has seen all stories
                seen = await self.redis.sismember(
                    f"story_seen:{user_id}:{followee_id}",
                    stories[0]  # Check latest
                )
                
                tray.append(StoryTray(
                    user_id=followee_id,
                    story_count=len(stories),
                    has_unseen=not seen,
                    latest_story_at=await self.redis.zscore(
                        f"user_stories:{followee_id}",
                        stories[0]
                    )
                ))
        
        # Sort: unseen first, then by recency
        tray.sort(key=lambda x: (not x.has_unseen, -x.latest_story_at))
        
        return tray
```

---

## 8. Social Graph (Facebook TAO-like)

```
┌─────────────────────────────────────────────────────────────────┐
│                    GRAPH STORAGE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Instagram uses TAO (The Associations and Objects)              │
│  Similar to Facebook's graph storage                            │
│                                                                 │
│  Objects:                                                       │
│  ─────────                                                      │
│  • Users, Posts, Comments, Locations                            │
│                                                                 │
│  Associations (Edges):                                          │
│  ─────────────────────                                          │
│  • User → FOLLOWS → User                                        │
│  • User → LIKES → Post                                          │
│  • User → AUTHORED → Post                                       │
│  • Post → TAGGED → User                                         │
│  • Post → AT → Location                                         │
│                                                                 │
│  API:                                                           │
│  ─────                                                          │
│  • assoc_get(user_id, 'FOLLOWS') → List of followees           │
│  • assoc_count(user_id, 'FOLLOWS') → Number of followees       │
│  • assoc_range(user_id, 'FOLLOWS', 0, 100) → Paginated list    │
│  • assoc_add(user_id, 'FOLLOWS', target_id) → Create edge      │
│                                                                 │
│  Storage:                                                       │
│  ─────────                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TAO Cache (Memcached/Redis)                 │   │
│  │  - Caches both objects and associations                  │   │
│  │  - Write-through cache                                    │   │
│  │  - Sharded by object ID                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MySQL (Persistent Storage)                  │   │
│  │  - Sharded by source object ID                           │   │
│  │  - Indexes for both directions                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. CDN & Media Delivery

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEDIA DELIVERY                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Multi-tier CDN Strategy:                                       │
│  ─────────────────────────                                      │
│                                                                 │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐               │
│  │  Client  │────►│   CDN    │────►│  Origin  │               │
│  │          │     │  (Edge)  │     │   (S3)   │               │
│  └──────────┘     └──────────┘     └──────────┘               │
│                                                                 │
│  CDN Configuration:                                             │
│  ───────────────────                                            │
│  • Multiple CDN providers (Cloudflare, Fastly, Akamai)          │
│  • Global PoPs (Points of Presence)                             │
│  • Aggressive caching for images (TTL: 1 year)                  │
│  • URL includes hash for cache busting                          │
│                                                                 │
│  URL Pattern:                                                   │
│  https://cdn.instagram.com/{quality}/{hash}.jpg                │
│                                                                 │
│  Adaptive Quality:                                              │
│  ─────────────────                                              │
│  • Detect client connection (WiFi/4G/3G)                        │
│  • Serve appropriate variant                                     │
│  • Progressive loading (blur-up)                                │
│                                                                 │
│  Video Streaming:                                               │
│  ─────────────────                                              │
│  • HLS/DASH for adaptive bitrate                                │
│  • Pre-generated segments                                        │
│  • Edge caching for segments                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Explore Page / Discovery

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPLORE PAGE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Goal: Show interesting content from accounts you don't follow  │
│                                                                 │
│  Candidate Generation:                                          │
│  ─────────────────────                                          │
│  1. Topic modeling (what interests does user have?)             │
│  2. Collaborative filtering (what do similar users like?)       │
│  3. Content-based (similar to posts user liked)                 │
│  4. Trending (viral content globally/locally)                   │
│  5. Graph-based (friends of friends)                            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   CANDIDATE SOURCES                        │ │
│  │                                                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   Similar    │  │   Trending   │  │   Topic     │    │ │
│  │  │    Users     │  │    Posts     │  │   Model     │    │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │ │
│  │         │                 │                 │             │ │
│  │         └─────────────────┼─────────────────┘             │ │
│  │                           │                               │ │
│  │                    ┌──────▼──────┐                       │ │
│  │                    │   Ranker    │                       │ │
│  │                    │   (ML)      │                       │ │
│  │                    └──────┬──────┘                       │ │
│  │                           │                               │ │
│  │                    ┌──────▼──────┐                       │ │
│  │                    │   Filter    │                       │ │
│  │                    │ (Safety,    │                       │ │
│  │                    │  Diversity) │                       │ │
│  │                    └──────┬──────┘                       │ │
│  │                           ▼                               │ │
│  │                      Explore Feed                         │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Notifications System

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICATIONS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Notification Types:                                            │
│  ────────────────────                                           │
│  • Like: "user liked your photo"                               │
│  • Comment: "user commented on your post"                      │
│  • Follow: "user started following you"                        │
│  • Mention: "user mentioned you in a comment"                  │
│  • Story: "user posted a story" (for close friends)            │
│  • Live: "user started a live video"                           │
│                                                                 │
│  Pipeline:                                                      │
│  ─────────                                                      │
│  Event (like, comment, etc.)                                    │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────┐                                              │
│  │    Kafka     │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                              │
│  │ Notification │                                              │
│  │   Service    │                                              │
│  │ • Aggregate  │ (combine multiple likes into one notif)      │
│  │ • Filter     │ (respect mute settings)                      │
│  │ • Priority   │ (urgent vs batched)                          │
│  └──────┬───────┘                                              │
│         │                                                       │
│    ┌────┴────┐                                                 │
│    │         │                                                  │
│    ▼         ▼                                                  │
│ ┌──────┐ ┌──────────┐                                          │
│ │ Push │ │ In-App   │                                          │
│ │(APNs/│ │ Notifs   │                                          │
│ │ FCM) │ │ (Redis)  │                                          │
│ └──────┘ └──────────┘                                          │
│                                                                 │
│  Aggregation Example:                                           │
│  ─────────────────────                                          │
│  Instead of: "A liked", "B liked", "C liked"                   │
│  Show: "A, B, C and 47 others liked your photo"                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Complete Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE INSTAGRAM ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│                               ┌───────────┐                                    │
│                               │  Mobile   │                                    │
│                               │  Clients  │                                    │
│                               └─────┬─────┘                                    │
│                                     │                                          │
│        ┌────────────────────────────┴────────────────────────────┐            │
│        │                          CDN                             │            │
│        │  (Cloudflare / Fastly / Akamai) - Photos, Videos, Static │            │
│        └────────────────────────────┬────────────────────────────┘            │
│                                     │                                          │
│                     ┌───────────────┴───────────────┐                         │
│                     │      Global Load Balancer      │                         │
│                     └───────────────┬───────────────┘                         │
│                                     │                                          │
│   ┌─────────────────────────────────┼─────────────────────────────────────┐   │
│   │                          API Gateway                                   │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │   │
│   │  │  Auth   │ │  Rate   │ │ Routing │ │  Logs   │ │ Metrics │        │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │   │
│   └─────────────────────────────────┬─────────────────────────────────────┘   │
│                                     │                                          │
│   ┌────────┬────────┬───────────────┼────────────────┬─────────┬────────┐    │
│   │        │        │               │                │         │        │     │
│   ▼        ▼        ▼               ▼                ▼         ▼        ▼     │
│ ┌──────┐┌──────┐┌──────┐       ┌──────┐        ┌──────┐┌──────┐┌──────┐     │
│ │Post  ││Feed  ││User  │       │Story │        │Media ││Search││Notif │     │
│ │Svc   ││Svc   ││Svc   │       │Svc   │        │Svc   ││Svc   ││Svc   │     │
│ └──┬───┘└──┬───┘└──┬───┘       └──┬───┘        └──┬───┘└──┬───┘└──┬───┘     │
│    │       │       │              │               │       │       │          │
│    └───────┴───────┴──────────────┼───────────────┴───────┴───────┘          │
│                                   │                                           │
│    ┌──────────────────────────────┴──────────────────────────────┐           │
│    │                        Kafka Cluster                         │           │
│    │  (Events: posts, likes, comments, follows, views)            │           │
│    └──────────────────────────────┬──────────────────────────────┘           │
│                                   │                                           │
│    ┌──────────────────────────────┴──────────────────────────────┐           │
│    │                     Async Consumers                          │           │
│    │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │           │
│    │  │ Fanout  │ │ Indexer │ │Analytics│ │ Notify  │           │           │
│    │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │           │
│    └─────────────────────────────────────────────────────────────┘           │
│                                                                               │
│    ┌─────────────────────────────────────────────────────────────────────┐   │
│    │                          CACHE LAYER                                 │   │
│    │  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐      │   │
│    │  │  Redis Cluster │   │   TAO Cache    │   │  Local Cache   │      │   │
│    │  │  (Feeds,       │   │  (Graph)       │   │  (Hot data)    │      │   │
│    │  │   Stories,     │   │                │   │                │      │   │
│    │  │   Sessions)    │   │                │   │                │      │   │
│    │  └────────────────┘   └────────────────┘   └────────────────┘      │   │
│    └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│    ┌─────────────────────────────────────────────────────────────────────┐   │
│    │                          DATA LAYER                                  │   │
│    │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │   │
│    │  │ Cassandra │ │ PostgreSQL│ │  MySQL    │ │ Elastic-  │           │   │
│    │  │ (Posts)   │ │ (Users)   │ │ (Graph/   │ │ search    │           │   │
│    │  │           │ │           │ │  TAO)     │ │           │           │   │
│    │  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │   │
│    │                                                                      │   │
│    │  ┌───────────────────────────────────────────────────────────────┐  │   │
│    │  │                    S3 (Media Storage)                          │  │   │
│    │  │  - Original photos/videos                                      │  │   │
│    │  │  - Processed variants                                          │  │   │
│    │  │  - Stories                                                     │  │   │
│    │  └───────────────────────────────────────────────────────────────┘  │   │
│    └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Interview Tips

### Common Follow-up Questions

1. **How do you handle image processing at scale?**
   - Presigned URLs for direct upload to S3
   - Async processing pipeline
   - Multiple image variants
   - Content safety checks

2. **How do stories differ from posts architecturally?**
   - TTL-based storage
   - Higher write volume
   - Viewer tracking
   - Different caching strategy

3. **How do you handle private accounts?**
   - Follow requests instead of instant follow
   - Check privacy on every content access
   - Exclude from explore/search
   - Encrypted DMs

4. **How do you prevent spam?**
   - Rate limiting
   - ML-based content moderation
   - Account age/verification requirements
   - CAPTCHA for suspicious activity

5. **How do you implement hashtag search efficiently?**
   - Inverted index in Elasticsearch
   - Trending hashtags cached in Redis
   - Separate index for recent vs all-time

---

## ✅ Key Takeaways

1. **Media is king** - Efficient upload, processing, and CDN delivery
2. **Presigned URLs** - Let clients upload directly to S3
3. **Hybrid feed** - Push for regular users, pull for celebrities
4. **Stories are ephemeral** - Use TTL-based storage
5. **TAO for social graph** - Object/association model scales well
6. **Ranked feeds** - ML-based personalization

---

## 📚 Related Topics

- [Blob Storage & CDN](/system-design/fundamentals/17-blob-storage-and-cdn.md) - Media delivery
- [Message Queues](/system-design/fundamentals/09-message-queues.md) - Async processing
- [Twitter Feed](/system-design/problems/03-twitter-feed.md) - Similar feed patterns
- [YouTube](/system-design/problems/05-youtube.md) - Video processing at scale
