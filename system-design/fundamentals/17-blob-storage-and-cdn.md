# Blob Storage and CDN

[← Back to Fundamentals](00-index.md)

---

## Overview

Blob (Binary Large Object) storage and Content Delivery Networks are essential for handling files, images, videos, and static assets at scale. This guide covers cloud storage services, presigned URLs, CDN architecture, and best practices for media-heavy applications.

---

## 📦 Blob Storage Fundamentals

### What is Blob Storage?

```
┌─────────────────────────────────────────────────────────────────┐
│                    BLOB STORAGE CONCEPT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Blob = Binary Large Object                                     │
│                                                                 │
│  Examples:                                                      │
│  ─────────                                                      │
│  • Images (profile photos, product images)                      │
│  • Videos (user uploads, streaming content)                     │
│  • Documents (PDFs, spreadsheets)                               │
│  • Backups and archives                                         │
│  • Log files                                                    │
│  • Static website assets (JS, CSS, HTML)                        │
│                                                                 │
│  Why not database?                                              │
│  ─────────────────                                              │
│  ❌ Databases are not optimized for large files                 │
│  ❌ Expensive storage                                           │
│  ❌ Slow retrieval                                              │
│  ❌ Database size bloat                                         │
│                                                                 │
│  Why blob storage?                                              │
│  ─────────────────                                              │
│  ✅ Cheap ($0.02/GB/month)                                      │
│  ✅ Infinitely scalable                                         │
│  ✅ CDN integration                                             │
│  ✅ HTTP access                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Major Cloud Storage Services

| Service | Provider | Key Features |
|---------|----------|--------------|
| **S3** | AWS | Industry standard, extensive features |
| **GCS** | Google Cloud | Strong consistency, analytics integration |
| **Azure Blob** | Microsoft | Tiered storage, AD integration |
| **Cloudflare R2** | Cloudflare | S3-compatible, no egress fees |
| **MinIO** | Self-hosted | S3-compatible, on-premise |

### Storage Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                    S3 STORAGE CLASSES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Class              │ Latency │ Cost/GB │ Use Case       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ S3 Standard        │ ms      │ $0.023  │ Frequent access│   │
│  │ S3 Intelligent     │ ms      │ $0.023  │ Varying access │   │
│  │ S3 Standard-IA     │ ms      │ $0.0125 │ Infrequent     │   │
│  │ S3 One Zone-IA     │ ms      │ $0.01   │ Reproducible   │   │
│  │ S3 Glacier Instant │ ms      │ $0.004  │ Archive, quick │   │
│  │ S3 Glacier Flex    │ min-hrs │ $0.0036 │ Archive        │   │
│  │ S3 Glacier Deep    │ hours   │ $0.00099│ Long archive   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Lifecycle policies can automatically transition objects:       │
│                                                                 │
│  Day 0     → Standard (frequently accessed)                    │
│  Day 30    → Standard-IA (accessed occasionally)               │
│  Day 90    → Glacier Instant (rarely accessed)                 │
│  Day 365   → Glacier Deep (compliance/archival)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Presigned URLs

### Why Presigned URLs?

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE UPLOAD/DOWNLOAD PROBLEM                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ Bad: Upload through your server                             │
│  ─────────────────────────────────                              │
│                                                                 │
│  Client ──[100MB file]──► Your Server ──[100MB]──► S3          │
│                              │                                  │
│                     Bandwidth cost                              │
│                     Server resources                            │
│                     Timeout risk                                │
│                                                                 │
│  ✅ Good: Upload directly to S3                                 │
│  ─────────────────────────────────                              │
│                                                                 │
│  Client ──[get presigned URL]──► Your Server                    │
│         ◄──[presigned URL]──                                    │
│                                                                 │
│  Client ──[100MB file]──────────────────────────► S3           │
│                        (direct upload)                          │
│                                                                 │
│  Your server only handles small metadata request!               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Generating Presigned URLs

```python
import boto3
from botocore.config import Config

s3_client = boto3.client(
    's3',
    config=Config(signature_version='s3v4'),
    region_name='us-east-1'
)

# Generate upload URL
def get_upload_url(bucket, key, content_type, expires_in=3600):
    """Generate presigned URL for uploading"""
    return s3_client.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': bucket,
            'Key': key,
            'ContentType': content_type
        },
        ExpiresIn=expires_in
    )

# Generate download URL
def get_download_url(bucket, key, expires_in=3600):
    """Generate presigned URL for downloading"""
    return s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': bucket,
            'Key': key
        },
        ExpiresIn=expires_in
    )

# Usage
upload_url = get_upload_url(
    bucket='my-uploads',
    key='users/123/profile.jpg',
    content_type='image/jpeg'
)

# Returns something like:
# https://my-uploads.s3.amazonaws.com/users/123/profile.jpg?
#   X-Amz-Algorithm=AWS4-HMAC-SHA256&
#   X-Amz-Credential=...&
#   X-Amz-Date=20231101T000000Z&
#   X-Amz-Expires=3600&
#   X-Amz-Signature=...
```

### Client-Side Upload

```javascript
// Get presigned URL from your API
const response = await fetch('/api/upload-url', {
    method: 'POST',
    body: JSON.stringify({
        filename: 'photo.jpg',
        contentType: 'image/jpeg'
    })
});
const { uploadUrl, fileUrl } = await response.json();

// Upload directly to S3
await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
        'Content-Type': 'image/jpeg'
    }
});

// File is now available at fileUrl
console.log('Uploaded to:', fileUrl);
```

### Multipart Upload for Large Files

```python
# For files > 100MB, use multipart upload
def create_multipart_upload_urls(bucket, key, num_parts, expires_in=3600):
    # Create multipart upload
    response = s3_client.create_multipart_upload(
        Bucket=bucket,
        Key=key
    )
    upload_id = response['UploadId']
    
    # Generate presigned URL for each part
    part_urls = []
    for part_number in range(1, num_parts + 1):
        url = s3_client.generate_presigned_url(
            'upload_part',
            Params={
                'Bucket': bucket,
                'Key': key,
                'UploadId': upload_id,
                'PartNumber': part_number
            },
            ExpiresIn=expires_in
        )
        part_urls.append({
            'part_number': part_number,
            'url': url
        })
    
    return {
        'upload_id': upload_id,
        'parts': part_urls
    }

# Client uploads each part, then calls complete
def complete_multipart_upload(bucket, key, upload_id, parts):
    s3_client.complete_multipart_upload(
        Bucket=bucket,
        Key=key,
        UploadId=upload_id,
        MultipartUpload={'Parts': parts}
    )
```

---

## 🌐 CDN Architecture

### How CDNs Work

```
┌─────────────────────────────────────────────────────────────────┐
│                    CDN ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Without CDN:                                                   │
│  ─────────────                                                  │
│                                                                 │
│  User (Tokyo) ──────────────────────────► Origin (US)          │
│       │                                      │                  │
│       └──────── 200ms round trip ────────────┘                  │
│                                                                 │
│  With CDN:                                                      │
│  ──────────                                                     │
│                                                                 │
│                        ┌─────────────┐                         │
│                        │   Origin    │                         │
│                        │  (US-East)  │                         │
│                        └──────┬──────┘                         │
│                               │                                 │
│              ┌────────────────┼────────────────┐               │
│              │                │                │               │
│         ┌────┴────┐     ┌────┴────┐     ┌────┴────┐           │
│         │  Edge   │     │  Edge   │     │  Edge   │           │
│         │ (Tokyo) │     │(London) │     │(Sydney) │           │
│         └────┬────┘     └─────────┘     └─────────┘           │
│              │                                                  │
│  User (Tokyo)│                                                  │
│       │      │                                                  │
│       └──────┘  20ms (cached at edge)                          │
│                                                                 │
│  Benefits:                                                      │
│  ✅ Reduced latency (content closer to users)                   │
│  ✅ Reduced origin load                                         │
│  ✅ DDoS protection                                             │
│  ✅ HTTPS termination at edge                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CDN Caching Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CDN CACHE FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Request: GET /images/hero.jpg                                  │
│                                                                 │
│  1. User → Edge (cache MISS)                                    │
│     Edge checks cache: Not found                                │
│                                                                 │
│  2. Edge → Origin                                               │
│     Edge fetches from origin                                    │
│                                                                 │
│  3. Origin → Edge                                               │
│     Response with headers:                                      │
│     Cache-Control: public, max-age=86400                        │
│     ETag: "abc123"                                              │
│                                                                 │
│  4. Edge → User                                                 │
│     Edge caches and returns to user                             │
│                                                                 │
│  5. Next request (cache HIT)                                    │
│     User → Edge → Cache → User                                  │
│     (Origin not contacted)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Headers

```
┌─────────────────────────────────────────────────────────────────┐
│                    CACHE CONTROL HEADERS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cache-Control directives:                                      │
│  ─────────────────────────                                      │
│                                                                 │
│  max-age=3600      Cache for 1 hour                            │
│  s-maxage=86400    CDN cache for 1 day (overrides max-age)     │
│  public            Can be cached by CDN                        │
│  private           Only browser can cache (user-specific)      │
│  no-cache          Revalidate before using cached version      │
│  no-store          Don't cache at all                          │
│  immutable         Never changes (use with versioned URLs)     │
│                                                                 │
│  Examples:                                                      │
│  ─────────                                                      │
│                                                                 │
│  Static assets (versioned):                                     │
│  Cache-Control: public, max-age=31536000, immutable            │
│  /static/app.a1b2c3.js                                         │
│                                                                 │
│  API responses (short cache):                                   │
│  Cache-Control: public, s-maxage=60, max-age=0                 │
│  (CDN caches 60s, browser always revalidates)                   │
│                                                                 │
│  User-specific:                                                 │
│  Cache-Control: private, max-age=0, no-store                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🖼️ Image Processing

### Image Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMAGE PROCESSING PIPELINE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Upload: Original 5000x3000 12MB JPEG                          │
│                                                                 │
│  Processing:                                                    │
│  ───────────                                                    │
│                                                                 │
│  1. Validate (file type, size limits)                          │
│  2. Strip metadata (EXIF for privacy)                          │
│  3. Generate variants:                                         │
│     • Thumbnail: 150x150 (15KB)                                │
│     • Small: 320x240 (30KB)                                    │
│     • Medium: 800x600 (80KB)                                   │
│     • Large: 1920x1080 (200KB)                                 │
│     • WebP versions of all sizes                               │
│  4. Store all in blob storage                                  │
│                                                                 │
│  Storage structure:                                             │
│  ─────────────────                                              │
│  /images/                                                       │
│    /abc123/                                                     │
│      original.jpg                                               │
│      thumb.jpg, thumb.webp                                     │
│      small.jpg, small.webp                                     │
│      medium.jpg, medium.webp                                   │
│      large.jpg, large.webp                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### On-the-Fly Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                    ON-THE-FLY PROCESSING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Instead of pre-generating, process on demand:                  │
│                                                                 │
│  Request:                                                       │
│  /images/abc123.jpg?width=300&format=webp                      │
│                                                                 │
│  Flow:                                                          │
│  1. CDN cache check (HIT → return cached)                      │
│  2. Image processing service                                    │
│  3. Fetch original from S3                                     │
│  4. Process (resize, format convert)                           │
│  5. Return and cache at CDN                                    │
│                                                                 │
│  Services:                                                      │
│  ─────────                                                      │
│  • Cloudflare Images                                            │
│  • AWS CloudFront + Lambda@Edge                                │
│  • imgproxy (self-hosted)                                      │
│  • Imgix (SaaS)                                                │
│                                                                 │
│  Benefits:                                                      │
│  ✅ No storage for variants                                     │
│  ✅ Flexible sizing                                             │
│  ✅ Format negotiation (WebP if supported)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📹 Video Storage and Streaming

### Video Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIDEO PROCESSING                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Upload                                                         │
│     │                                                           │
│     ▼                                                           │
│  ┌──────────────┐                                              │
│  │ Raw storage  │  (temporary, original file)                  │
│  └──────┬───────┘                                              │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                              │
│  │ Transcode    │  (convert to streaming formats)              │
│  │ Service      │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
│         ├───────────────┬───────────────┐                       │
│         ▼               ▼               ▼                       │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                  │
│   │  1080p   │   │   720p   │   │   480p   │                  │
│   │  H.264   │   │  H.264   │   │  H.264   │                  │
│   └──────────┘   └──────────┘   └──────────┘                  │
│         │               │               │                       │
│         └───────────────┼───────────────┘                       │
│                         ▼                                       │
│                  ┌──────────────┐                               │
│                  │     CDN      │                               │
│                  │   (HLS/DASH) │                               │
│                  └──────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Adaptive Bitrate Streaming

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADAPTIVE STREAMING (HLS)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Master Playlist (master.m3u8):                                 │
│  ──────────────────────────────                                 │
│  #EXTM3U                                                        │
│  #EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360          │
│  360p/playlist.m3u8                                             │
│  #EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720        │
│  720p/playlist.m3u8                                             │
│  #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080       │
│  1080p/playlist.m3u8                                            │
│                                                                 │
│  Quality Playlist (720p/playlist.m3u8):                         │
│  ──────────────────────────────────────                         │
│  #EXTM3U                                                        │
│  #EXT-X-TARGETDURATION:10                                       │
│  #EXTINF:10.0,                                                  │
│  segment_001.ts                                                 │
│  #EXTINF:10.0,                                                  │
│  segment_002.ts                                                 │
│  ...                                                            │
│                                                                 │
│  Player automatically switches quality based on bandwidth       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Patterns

### Media Upload Service

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEDIA UPLOAD ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│  ┌──────────┐   1. Request     ┌──────────────┐                │
│  │  Client  │ ─────────────►   │  API Server  │                │
│  │          │ ◄─────────────   │              │                │
│  └────┬─────┘   2. Presigned   └──────┬───────┘                │
│       │            URL                │                         │
│       │                               │ 3. Save metadata        │
│       │ 4. Direct                     ▼                         │
│       │    upload            ┌──────────────┐                  │
│       │                      │   Database   │                  │
│       │                      │  (metadata)  │                  │
│       │                      └──────────────┘                  │
│       ▼                                                         │
│  ┌──────────────┐     5. Event     ┌──────────────┐            │
│  │     S3       │ ───────────────► │    Queue     │            │
│  │  (uploads)   │    (S3 trigger)  │              │            │
│  └──────────────┘                  └──────┬───────┘            │
│                                           │                     │
│                                           ▼                     │
│                                    ┌──────────────┐            │
│                                    │  Processor   │            │
│                                    │  (Lambda/K8s)│            │
│                                    └──────┬───────┘            │
│                                           │                     │
│                                           ▼                     │
│                                    ┌──────────────┐            │
│                                    │     S3       │            │
│                                    │ (processed)  │            │
│                                    └──────┬───────┘            │
│                                           │                     │
│                                           ▼                     │
│                                    ┌──────────────┐            │
│                                    │     CDN      │            │
│                                    └──────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🆚 CDN Providers Comparison

| Provider | Strengths | Best For |
|----------|-----------|----------|
| **CloudFront** | AWS integration, Lambda@Edge | AWS-native apps |
| **Cloudflare** | Free tier, security features | Global apps, DDoS protection |
| **Fastly** | Real-time purging, VCL | Dynamic content, edge compute |
| **Akamai** | Enterprise, massive network | Large enterprises |
| **Bunny CDN** | Cheap, simple | Cost-conscious projects |

---

## ✅ Key Takeaways

1. **Never store blobs in database** - Use object storage (S3, GCS)
2. **Presigned URLs for direct upload** - Reduce server load
3. **Use CDN for static content** - Lower latency, less origin load
4. **Set proper cache headers** - Control caching behavior
5. **Process images on-the-fly** - More flexible than pre-generation
6. **Adaptive streaming for video** - HLS/DASH for quality switching
7. **Lifecycle policies** - Automatically tier to cheaper storage

---

## 📚 Related Topics

- [Caching](07-caching.md) - Application-level caching
- [Scaling Strategies](10-scaling-strategies.md) - Handling media at scale
- [API Design](04-api-design.md) - Upload/download endpoints
- [Message Queues](09-message-queues.md) - Async processing triggers
