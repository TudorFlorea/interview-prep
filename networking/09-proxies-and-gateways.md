# Proxies & Gateways

[← Back to Index](/networking/00-index.md)

---

## Overview

Proxies, CDNs, and API gateways are intermediaries that sit between clients and servers. They provide caching, security, routing, and optimization. Understanding these components is essential for designing scalable and secure architectures.

### When This Matters Most
- Optimizing global content delivery
- Implementing API management
- Adding security layers
- Reducing backend load

---

## Types of Proxies

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FORWARD vs REVERSE PROXY                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   FORWARD PROXY (Client-side)                                            │
│   ────────────────────────────                                           │
│                                                                          │
│   ┌────────┐     ┌─────────────┐     ┌──────────┐                       │
│   │ Client │────►│Forward Proxy│────►│ Internet │                       │
│   └────────┘     └─────────────┘     └──────────┘                       │
│                        │                                                 │
│                        ├── Hides client identity                        │
│                        ├── Can filter/block content                     │
│                        ├── Caching for clients                          │
│                        └── Corporate network control                    │
│                                                                          │
│   Examples: Squid, corporate proxies, VPNs                              │
│                                                                          │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                          │
│   REVERSE PROXY (Server-side)                                            │
│   ───────────────────────────                                            │
│                                                                          │
│   ┌──────────┐     ┌──────────────┐     ┌─────────┐                     │
│   │ Internet │────►│Reverse Proxy │────►│ Backend │                     │
│   └──────────┘     └──────────────┘     └─────────┘                     │
│                          │                                               │
│                          ├── Hides backend servers                      │
│                          ├── Load balancing                             │
│                          ├── SSL termination                            │
│                          ├── Caching                                    │
│                          ├── Compression                                │
│                          └── Security (WAF)                             │
│                                                                          │
│   Examples: Nginx, HAProxy, Cloudflare, AWS ALB                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Reverse Proxy Deep Dive

### Common Use Cases

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REVERSE PROXY FUNCTIONS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. SSL TERMINATION                                                     │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Client ══HTTPS══► Proxy ──HTTP──► Backend                      │   │
│   │                     │                                           │   │
│   │                     └── Handles certificate, decryption        │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   2. LOAD BALANCING                                                      │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                    ┌──► Backend 1                              │   │
│   │ Client ──► Proxy ──┼──► Backend 2                              │   │
│   │                    └──► Backend 3                              │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   3. CACHING                                                             │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Request 1 ──► Proxy ──► Backend ──► Response (cached)         │   │
│   │ Request 2 ──► Proxy ──► Cached response (no backend hit)      │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   4. COMPRESSION                                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Backend sends 100KB ──► Proxy gzips ──► Client gets 20KB      │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   5. PATH-BASED ROUTING                                                  │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ /api/*     ──► API servers                                     │   │
│   │ /static/*  ──► Static file server / CDN                        │   │
│   │ /          ──► Frontend app                                    │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Nginx Reverse Proxy Configuration

```nginx
# /etc/nginx/conf.d/app.conf

upstream api_servers {
    least_conn;
    server 10.0.1.1:3000;
    server 10.0.1.2:3000;
    server 10.0.1.3:3000;
}

upstream frontend_servers {
    server 10.0.2.1:8080;
    server 10.0.2.2:8080;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1000;

    # API routes
    location /api/ {
        proxy_pass http://api_servers;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Static files with caching
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend
    location / {
        proxy_pass http://frontend_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";  # WebSocket support
    }
}
```

---

## Content Delivery Networks (CDNs)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HOW CDNs WORK                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   WITHOUT CDN:                                                           │
│   ┌────────┐                                              ┌────────┐   │
│   │  User  │═══════════════ 200ms ═══════════════════════│ Origin │   │
│   │ (Tokyo)│                                              │ (NYC)  │   │
│   └────────┘                                              └────────┘   │
│                                                                          │
│   WITH CDN:                                                              │
│   ┌────────┐      ┌───────────┐                          ┌────────┐   │
│   │  User  │══10ms│  CDN Edge │═══════════════════════════│ Origin │   │
│   │ (Tokyo)│══════│  (Tokyo)  │     (cached content)     │ (NYC)  │   │
│   └────────┘      └───────────┘                          └────────┘   │
│                         │                                              │
│                         └── Content cached closer to user             │
│                                                                          │
│   CDN EDGE LOCATIONS (PoPs - Points of Presence)                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                        🌍 GLOBAL CDN                             │  │
│   │                                                                  │  │
│   │     🔵 Tokyo     🔵 Singapore    🔵 Sydney                      │  │
│   │     🔵 London    🔵 Frankfurt    🔵 Mumbai                      │  │
│   │     🔵 NYC       🔵 LA           🔵 São Paulo                   │  │
│   │                          │                                       │  │
│   │                          ▼                                       │  │
│   │                    ┌──────────┐                                 │  │
│   │                    │  Origin  │                                 │  │
│   │                    │  Server  │                                 │  │
│   │                    └──────────┘                                 │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### CDN Features

| Feature | Description |
|---------|-------------|
| **Caching** | Store static content at edge locations |
| **DDoS Protection** | Absorb attack traffic across global network |
| **SSL/TLS** | Terminate SSL at edge, free certificates |
| **Compression** | Gzip/Brotli compression at edge |
| **Image Optimization** | Resize, format conversion (WebP) on-the-fly |
| **Geo-blocking** | Restrict content by country |
| **Analytics** | Request logs, bandwidth, cache hit ratio |

### CDN Cache Headers

```http
# Origin server tells CDN what to cache

# Cache for 1 year (static assets with hash in filename)
Cache-Control: public, max-age=31536000, immutable

# Cache for 1 hour, revalidate after
Cache-Control: public, max-age=3600, must-revalidate

# Don't cache (dynamic content)
Cache-Control: private, no-store

# CDN-specific: Cache for 1 day at edge, but 0 at browser
Cache-Control: public, max-age=0, s-maxage=86400
Surrogate-Control: max-age=86400  # Fastly specific

# Vary by header (different cache per value)
Vary: Accept-Encoding, Accept-Language
```

### Popular CDN Providers

| Provider | Strengths |
|----------|-----------|
| **Cloudflare** | Free tier, DDoS, Workers (edge compute) |
| **AWS CloudFront** | AWS integration, Lambda@Edge |
| **Fastly** | Real-time purging, VCL customization |
| **Akamai** | Enterprise, largest network |
| **Google Cloud CDN** | GCP integration, global load balancing |
| **Azure CDN** | Azure integration, multiple providers |

---

## API Gateways

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY PATTERN                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                           ┌────────────────┐                            │
│                           │   API Gateway  │                            │
│                           │                │                            │
│   ┌──────────┐           │ ┌────────────┐ │           ┌──────────────┐ │
│   │  Mobile  │───────────│►│ Auth       │ │──────────►│ User Service │ │
│   │   App    │           │ │ Rate Limit │ │           └──────────────┘ │
│   └──────────┘           │ │ Routing    │ │                            │
│                          │ │ Transform  │ │           ┌──────────────┐ │
│   ┌──────────┐           │ │ Logging    │ │──────────►│Order Service │ │
│   │   Web    │───────────│►│ Caching    │ │           └──────────────┘ │
│   │   App    │           │ │ Circuit    │ │                            │
│   └──────────┘           │ │ Breaker    │ │           ┌──────────────┐ │
│                          │ └────────────┘ │──────────►│Product Svc   │ │
│   ┌──────────┐           │                │           └──────────────┘ │
│   │  Partner │───────────│►               │                            │
│   │   API    │           │                │           ┌──────────────┐ │
│   └──────────┘           └────────────────┘──────────►│ Inventory    │ │
│                                                       └──────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Gateway Functions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY CAPABILITIES                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   AUTHENTICATION & AUTHORIZATION                                         │
│   ├── API key validation                                                 │
│   ├── JWT verification                                                   │
│   ├── OAuth 2.0 / OpenID Connect                                        │
│   └── mTLS client certificates                                          │
│                                                                          │
│   RATE LIMITING & THROTTLING                                             │
│   ├── Requests per second/minute/hour                                   │
│   ├── Per-user, per-IP, per-API key limits                              │
│   ├── Quota management                                                   │
│   └── Burst handling                                                     │
│                                                                          │
│   REQUEST/RESPONSE TRANSFORMATION                                        │
│   ├── Header manipulation                                                │
│   ├── Body transformation (JSON ↔ XML)                                  │
│   ├── Protocol translation (REST ↔ gRPC)                                │
│   └── Response aggregation                                               │
│                                                                          │
│   TRAFFIC MANAGEMENT                                                     │
│   ├── Load balancing                                                     │
│   ├── Canary deployments                                                 │
│   ├── Blue-green deployments                                            │
│   └── A/B testing                                                        │
│                                                                          │
│   OBSERVABILITY                                                          │
│   ├── Request/response logging                                           │
│   ├── Metrics (latency, errors, throughput)                             │
│   ├── Distributed tracing                                                │
│   └── Alerting                                                           │
│                                                                          │
│   SECURITY                                                               │
│   ├── DDoS protection                                                    │
│   ├── WAF (Web Application Firewall)                                    │
│   ├── IP whitelisting/blacklisting                                      │
│   └── Bot detection                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Rate Limiting Strategies

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      RATE LIMITING ALGORITHMS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   FIXED WINDOW                                                           │
│   ─────────────                                                          │
│   │ Window 1  │ Window 2  │ Window 3  │                                 │
│   │ 100 req   │ 100 req   │ 100 req   │                                 │
│   ├───────────┼───────────┼───────────┤                                 │
│   0          60s        120s        180s                                │
│                                                                          │
│   Problem: 200 requests possible at window boundary                     │
│                                                                          │
│   SLIDING WINDOW LOG                                                     │
│   ──────────────────                                                     │
│   Track timestamp of each request                                        │
│   Count requests in last N seconds                                       │
│   More accurate, but memory-intensive                                    │
│                                                                          │
│   TOKEN BUCKET                                                           │
│   ────────────                                                           │
│   ┌─────────────┐                                                       │
│   │ ●●●●●●●●●●  │ Bucket (capacity: 10 tokens)                         │
│   │   Tokens    │ Refill: 1 token/second                                │
│   └─────────────┘                                                       │
│                                                                          │
│   Request arrives → Take 1 token                                        │
│   Bucket empty → Request rejected (429)                                 │
│   Allows bursts up to bucket capacity                                   │
│                                                                          │
│   LEAKY BUCKET                                                           │
│   ────────────                                                           │
│   Requests enter bucket, processed at fixed rate                        │
│   Smooths out traffic, no bursts                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Gateway Products

| Product | Type | Use Case |
|---------|------|----------|
| **AWS API Gateway** | Managed | Serverless APIs, Lambda integration |
| **Kong** | Open Source | Kubernetes, plugin ecosystem |
| **Apigee** (Google) | Managed | Enterprise API management |
| **Azure API Management** | Managed | Azure integration |
| **Traefik** | Open Source | Kubernetes ingress, auto-discovery |
| **NGINX Plus** | Commercial | High performance, flexibility |
| **Envoy** | Open Source | Service mesh, L7 proxy |

---

## Service Mesh (Brief Overview)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVICE MESH                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Every service gets a sidecar proxy (Envoy)                            │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │   ┌─────────┐    ┌─────────┐    ┌─────────┐                    │   │
│   │   │Service A│    │Service B│    │Service C│                    │   │
│   │   │ ┌─────┐ │    │ ┌─────┐ │    │ ┌─────┐ │                    │   │
│   │   │ │Proxy│◄├────┼►│Proxy│◄├────┼►│Proxy│ │                    │   │
│   │   │ └─────┘ │    │ └─────┘ │    │ └─────┘ │                    │   │
│   │   └─────────┘    └─────────┘    └─────────┘                    │   │
│   │        ▲              ▲              ▲                          │   │
│   │        │              │              │                          │   │
│   │        └──────────────┼──────────────┘                          │   │
│   │                       ▼                                         │   │
│   │                ┌────────────┐                                   │   │
│   │                │Control Plane│ (Istio, Linkerd)                │   │
│   │                └────────────┘                                   │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Provides: mTLS, traffic management, observability, retries           │
│   See: Cloud Networking topic for more details                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Exercises

### Exercise 1: CDN Cache Strategy 🟢

**Scenario:** Design caching strategy for these resources:
1. `app.a1b2c3.js` - JavaScript bundle with content hash
2. `/api/user/profile` - User-specific data
3. `/products` - Product listing, updates every hour
4. `/images/logo.png` - Static logo

What Cache-Control headers would you set?

<details>
<summary>✅ Solution</summary>

```http
# 1. app.a1b2c3.js - Immutable with content hash
Cache-Control: public, max-age=31536000, immutable
# Cache for 1 year, hash changes when content changes
# "immutable" tells browser never to revalidate

# 2. /api/user/profile - User-specific, no caching
Cache-Control: private, no-store
# "private" = only browser, not CDN
# "no-store" = never cache

# 3. /products - Cacheable but needs freshness
Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=60
# Browser: 5 minutes
# CDN: 1 hour
# stale-while-revalidate: serve stale for 60s while fetching fresh

# 4. /images/logo.png - Static, rarely changes
Cache-Control: public, max-age=86400
ETag: "logo-v2"
# Cache 1 day, ETag allows conditional requests
# When logo changes, update ETag or use versioned URL
```

**Best practices:**
- Use content hashes for JS/CSS (immutable caching)
- Never cache user-specific data at CDN
- Use `s-maxage` for CDN-specific cache times
- Add `stale-while-revalidate` for better UX

</details>

---

### Exercise 2: Rate Limiting Design 🟡

**Scenario:** Design rate limiting for a public API:
- Free tier: 100 requests/hour
- Pro tier: 10,000 requests/hour
- Enterprise: custom limits
- All tiers: max 10 requests/second burst

How would you implement this?

<details>
<summary>💡 Hints</summary>

- Need to identify user tier (API key, JWT claim)
- Combine hourly quota with per-second burst limit
- Consider distributed rate limiting (Redis)
- Return appropriate headers (X-RateLimit-*)

</details>

<details>
<summary>✅ Solution</summary>

```javascript
// Rate limiting with Redis + Token Bucket

const Redis = require('ioredis');
const redis = new Redis();

const TIERS = {
  free: { hourlyLimit: 100, burstLimit: 10 },
  pro: { hourlyLimit: 10000, burstLimit: 10 },
  enterprise: { hourlyLimit: Infinity, burstLimit: 50 }
};

async function rateLimit(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const tier = await getUserTier(apiKey);
  const limits = TIERS[tier] || TIERS.free;
  
  const hourKey = `rate:${apiKey}:hour:${Math.floor(Date.now() / 3600000)}`;
  const secondKey = `rate:${apiKey}:second:${Math.floor(Date.now() / 1000)}`;
  
  // Check hourly limit (Fixed Window)
  const hourlyCount = await redis.incr(hourKey);
  if (hourlyCount === 1) {
    await redis.expire(hourKey, 3600);
  }
  
  // Check burst limit (Fixed Window per second)
  const secondCount = await redis.incr(secondKey);
  if (secondCount === 1) {
    await redis.expire(secondKey, 1);
  }
  
  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': limits.hourlyLimit,
    'X-RateLimit-Remaining': Math.max(0, limits.hourlyLimit - hourlyCount),
    'X-RateLimit-Reset': Math.ceil(Date.now() / 3600000) * 3600
  });
  
  // Check limits
  if (hourlyCount > limits.hourlyLimit) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: res.get('X-RateLimit-Reset') - Math.floor(Date.now() / 1000)
    });
  }
  
  if (secondCount > limits.burstLimit) {
    return res.status(429).json({
      error: 'Burst limit exceeded',
      retryAfter: 1
    });
  }
  
  next();
}

// Response headers example:
// X-RateLimit-Limit: 100
// X-RateLimit-Remaining: 87
// X-RateLimit-Reset: 1706745600
// Retry-After: 3600 (if rate limited)
```

**Architecture for scale:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Client ──► API Gateway ──► Rate Limiter ──► Backend           │
│                                   │                              │
│                                   ▼                              │
│                            ┌────────────┐                        │
│                            │   Redis    │ (Cluster for HA)      │
│                            │  Counters  │                        │
│                            └────────────┘                        │
│                                                                  │
│   Use Redis for distributed rate limiting                        │
│   API Gateway handles auth, passes user ID to rate limiter      │
│   Lua scripts for atomic increment + check                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

</details>

---

### Exercise 3: Design Multi-Region CDN Strategy 🔴

**Scenario:** Your app serves:
- Static assets (React app)
- Dynamic API (`/api/*`)
- User-uploaded images (`/uploads/*`)
- Real-time WebSocket connections

Design the CDN/proxy architecture for global users.

<details>
<summary>💡 Hints</summary>

- Different content types need different strategies
- WebSocket needs special handling
- User uploads need origin storage
- Consider cache invalidation

</details>

<details>
<summary>✅ Solution</summary>

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MULTI-REGION ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                          ┌────────────────┐                             │
│                          │   DNS (Route53)│                             │
│                          │   GeoDNS       │                             │
│                          └───────┬────────┘                             │
│                                  │                                       │
│              ┌───────────────────┼───────────────────┐                  │
│              │                   │                   │                  │
│              ▼                   ▼                   ▼                  │
│   ┌──────────────────┐ ┌─────────────────┐ ┌──────────────────┐        │
│   │ CDN Edge (US)    │ │ CDN Edge (EU)   │ │ CDN Edge (Asia)  │        │
│   │ - Static assets  │ │ - Static assets │ │ - Static assets  │        │
│   │ - Cached API     │ │ - Cached API    │ │ - Cached API     │        │
│   │ - Images         │ │ - Images        │ │ - Images         │        │
│   └────────┬─────────┘ └────────┬────────┘ └────────┬─────────┘        │
│            │                    │                    │                  │
│            └────────────────────┼────────────────────┘                  │
│                                 │                                       │
│              ┌──────────────────┴───────────────────┐                  │
│              │                                       │                  │
│              ▼                                       ▼                  │
│   ┌──────────────────────┐             ┌──────────────────────┐        │
│   │   API Gateway (US)   │             │   API Gateway (EU)   │        │
│   │   - Auth             │             │   - Auth             │        │
│   │   - Rate limiting    │             │   - Rate limiting    │        │
│   │   - WebSocket        │             │   - WebSocket        │        │
│   └──────────┬───────────┘             └──────────┬───────────┘        │
│              │                                     │                    │
│              ▼                                     ▼                    │
│   ┌──────────────────────┐             ┌──────────────────────┐        │
│   │ Backend Services (US)│◄───────────►│ Backend Services (EU)│        │
│   └──────────────────────┘  Database   └──────────────────────┘        │
│              │              Replication            │                    │
│              ▼                                     ▼                    │
│   ┌──────────────────────┐             ┌──────────────────────┐        │
│   │ Database Primary     │─────────────│ Database Replica     │        │
│   └──────────────────────┘             └──────────────────────┘        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Configuration by content type:**

```yaml
# CDN Configuration (Cloudflare example)

# 1. Static assets (React app, JS, CSS)
# Path: /static/*, /*.js, /*.css
Cache-Control: public, max-age=31536000, immutable
# Cache at all edge locations
# Purge on deploy via API

# 2. Dynamic API
# Path: /api/*
# Most endpoints:
Cache-Control: private, no-store
# Selected cacheable endpoints (e.g., /api/products):
Cache-Control: public, s-maxage=60, stale-while-revalidate=30
# Use cache keys: URL + Accept-Language + Authorization (hashed)

# 3. User uploads
# Path: /uploads/*
origin: s3-bucket.region.amazonaws.com
Cache-Control: public, max-age=86400
# Stored in S3 with CloudFront distribution
# Use signed URLs for private uploads

# 4. WebSocket
# Path: /ws
# Cannot cache - pass through to regional API gateway
# Use sticky sessions / connection affinity
# Consider: Ably, Pusher, or Socket.io with Redis adapter for multi-region
```

**WebSocket handling:**

```javascript
// WebSocket must connect to specific region
// Use GeoDNS or client-side region detection

// Client code
const region = await detectClosestRegion();
const ws = new WebSocket(`wss://${region}.api.example.com/ws`);

// Server: Redis pub/sub for cross-region messages
const Redis = require('ioredis');
const pub = new Redis(process.env.REDIS_URL);
const sub = new Redis(process.env.REDIS_URL);

sub.subscribe('chat-messages');
sub.on('message', (channel, message) => {
  // Broadcast to all local WebSocket connections
  broadcastToClients(JSON.parse(message));
});

// When receiving message from client
function onClientMessage(data) {
  // Publish to Redis for all regions
  pub.publish('chat-messages', JSON.stringify(data));
}
```

**Cache invalidation strategy:**

```bash
# Purge cache on deploy (Cloudflare API)
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"purge_everything": true}'

# Or selective purge
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"files": ["https://example.com/static/app.js"]}'

# AWS CloudFront invalidation
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/static/*" "/index.html"
```

</details>

---

## Key Takeaways

- 🔀 **Forward vs Reverse Proxy**: Client-side vs server-side intermediaries
- 🌍 **CDNs reduce latency**: Cache content at edge locations globally
- 🚪 **API Gateways centralize concerns**: Auth, rate limiting, routing, observability
- ⏱️ **Rate limiting protects APIs**: Token bucket, fixed/sliding window algorithms
- 📋 **Cache headers matter**: `Cache-Control`, `Vary`, `ETag` for proper caching
- 🔄 **Cache invalidation is hard**: Use content hashing, TTLs, or explicit purging

---

## Related Topics

- [Load Balancing](/networking/08-load-balancing.md) - Traffic distribution
- [HTTP & HTTPS](/networking/02-http-and-https.md) - Cache headers in depth
- Cloud Networking - Cloud CDN and API Gateway services
