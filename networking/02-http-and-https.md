# HTTP & HTTPS

[← Back to Index](/networking/00-index.md)

---

## Overview

HTTP (Hypertext Transfer Protocol) is the foundation of web communication. As a backend developer, you'll work with HTTP daily—designing APIs, debugging requests, and optimizing performance. Understanding HTTP deeply is essential.

### When This Matters Most
- Building REST/GraphQL APIs
- Debugging request/response issues
- Implementing authentication
- Optimizing web performance

---

## HTTP Request/Response Cycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    HTTP REQUEST/RESPONSE CYCLE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   CLIENT                                              SERVER             │
│   ┌──────┐                                           ┌──────┐           │
│   │      │  ──── HTTP Request ────────────────────►  │      │           │
│   │      │       POST /api/users HTTP/1.1            │      │           │
│   │      │       Host: api.example.com               │      │           │
│   │      │       Content-Type: application/json      │      │           │
│   │      │       Authorization: Bearer xyz           │      │           │
│   │      │                                           │      │           │
│   │      │       {"name": "Alice", "email": "..."}   │      │           │
│   │      │                                           │      │           │
│   │      │  ◄─── HTTP Response ───────────────────   │      │           │
│   │      │       HTTP/1.1 201 Created                │      │           │
│   │      │       Content-Type: application/json      │      │           │
│   │      │       Location: /api/users/123            │      │           │
│   │      │                                           │      │           │
│   │      │       {"id": 123, "name": "Alice"}        │      │           │
│   └──────┘                                           └──────┘           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## HTTP Methods

| Method | Purpose | Idempotent | Safe | Request Body |
|--------|---------|------------|------|--------------|
| **GET** | Retrieve resource | ✅ Yes | ✅ Yes | ❌ No |
| **POST** | Create resource | ❌ No | ❌ No | ✅ Yes |
| **PUT** | Replace resource | ✅ Yes | ❌ No | ✅ Yes |
| **PATCH** | Partial update | ❌ No* | ❌ No | ✅ Yes |
| **DELETE** | Remove resource | ✅ Yes | ❌ No | ❌ Usually |
| **HEAD** | GET without body | ✅ Yes | ✅ Yes | ❌ No |
| **OPTIONS** | Get allowed methods | ✅ Yes | ✅ Yes | ❌ No |

**Idempotent**: Multiple identical requests have same effect as one.
**Safe**: Doesn't modify server state.

```bash
# Examples with curl
curl -X GET https://api.example.com/users/123
curl -X POST https://api.example.com/users -d '{"name":"Alice"}' -H "Content-Type: application/json"
curl -X PUT https://api.example.com/users/123 -d '{"name":"Alice","email":"a@b.com"}'
curl -X PATCH https://api.example.com/users/123 -d '{"email":"new@b.com"}'
curl -X DELETE https://api.example.com/users/123
```

---

## Status Codes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HTTP STATUS CODES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1xx - Informational (rarely used)                                       │
│  ├── 100 Continue                                                        │
│  └── 101 Switching Protocols (WebSocket upgrade)                         │
│                                                                          │
│  2xx - Success ✅                                                        │
│  ├── 200 OK                  General success                             │
│  ├── 201 Created             Resource created (POST)                     │
│  ├── 202 Accepted            Request accepted, processing async          │
│  └── 204 No Content          Success, no body (DELETE)                   │
│                                                                          │
│  3xx - Redirection ↪️                                                    │
│  ├── 301 Moved Permanently   URL changed forever (cacheable)             │
│  ├── 302 Found               Temporary redirect (legacy)                 │
│  ├── 304 Not Modified        Use cached version                          │
│  └── 307 Temporary Redirect  Keep method (POST stays POST)               │
│                                                                          │
│  4xx - Client Error ❌                                                   │
│  ├── 400 Bad Request         Malformed request                           │
│  ├── 401 Unauthorized        Authentication required                     │
│  ├── 403 Forbidden           Authenticated but not authorized            │
│  ├── 404 Not Found           Resource doesn't exist                      │
│  ├── 405 Method Not Allowed  Wrong HTTP method                           │
│  ├── 409 Conflict            State conflict (duplicate, etc.)            │
│  ├── 422 Unprocessable       Validation failed                           │
│  └── 429 Too Many Requests   Rate limited                                │
│                                                                          │
│  5xx - Server Error 💥                                                   │
│  ├── 500 Internal Server     Unhandled exception                         │
│  ├── 502 Bad Gateway         Upstream server error                       │
│  ├── 503 Service Unavailable Server overloaded/maintenance               │
│  └── 504 Gateway Timeout     Upstream server timeout                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## HTTP Headers

### Request Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `Host` | Target hostname (required in HTTP/1.1) | `api.example.com` |
| `Authorization` | Credentials | `Bearer eyJhbGc...` |
| `Content-Type` | Body format | `application/json` |
| `Accept` | Desired response format | `application/json` |
| `User-Agent` | Client identifier | `Mozilla/5.0...` |
| `Cookie` | Session data | `session=abc123` |
| `If-None-Match` | Conditional (caching) | `"etag-value"` |
| `If-Modified-Since` | Conditional (caching) | `Wed, 21 Oct 2024...` |

### Response Headers

| Header | Purpose | Example |
|--------|---------|---------|
| `Content-Type` | Body format | `application/json; charset=utf-8` |
| `Content-Length` | Body size in bytes | `1234` |
| `Set-Cookie` | Set client cookie | `session=xyz; HttpOnly; Secure` |
| `Cache-Control` | Caching directives | `max-age=3600, public` |
| `ETag` | Resource version | `"abc123"` |
| `Location` | Redirect target | `/api/users/123` |
| `Access-Control-Allow-Origin` | CORS | `https://example.com` |

---

## HTTP Versions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      HTTP VERSION EVOLUTION                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  HTTP/1.0 (1996)                                                         │
│  ├── One request per TCP connection                                      │
│  └── Connection closed after each response                               │
│                                                                          │
│  HTTP/1.1 (1997) - Still widely used                                     │
│  ├── Persistent connections (keep-alive)                                 │
│  ├── Pipelining (rarely used due to head-of-line blocking)              │
│  ├── Host header required (virtual hosting)                              │
│  └── Chunked transfer encoding                                           │
│                                                                          │
│  HTTP/2 (2015) - Modern standard                                         │
│  ├── Binary protocol (not text)                                          │
│  ├── Multiplexing (multiple requests on one connection)                  │
│  ├── Header compression (HPACK)                                          │
│  ├── Server push                                                         │
│  └── Stream prioritization                                               │
│                                                                          │
│  HTTP/3 (2022) - Cutting edge                                            │
│  ├── Based on QUIC (UDP, not TCP)                                        │
│  ├── 0-RTT connection establishment                                      │
│  ├── Improved multiplexing (no head-of-line blocking)                    │
│  └── Built-in encryption                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### HTTP/1.1 vs HTTP/2 Comparison

```
HTTP/1.1: Head-of-line blocking
┌────────────────────────────────────────────────────────────────┐
│ Connection 1: ──[Req1]──[Resp1]──[Req2]──[Resp2]──[Req3]──    │
│ Connection 2: ──[Req4]──[Resp4]──[Req5]──[Resp5]──            │
│ Connection 3: ──[Req6]──[Resp6]──                              │
│                                                                 │
│ Browsers open 6+ connections to parallelize                    │
└────────────────────────────────────────────────────────────────┘

HTTP/2: Multiplexed streams
┌────────────────────────────────────────────────────────────────┐
│ Single connection:                                              │
│ ──[R1]─[R2]─[R3]─[R4]─[Resp2]─[Resp1]─[R5]─[Resp4]─[Resp3]──  │
│                                                                 │
│ All requests/responses interleaved on one connection           │
└────────────────────────────────────────────────────────────────┘
```

---

## HTTPS and TLS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HTTPS = HTTP + TLS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   HTTP (plaintext)              HTTPS (encrypted)                        │
│   ┌─────────────────┐          ┌─────────────────┐                      │
│   │ GET /api/users  │          │ 3k#j$9f@2!xP... │                      │
│   │ Auth: Bearer xyz│   vs     │ (encrypted)     │                      │
│   └─────────────────┘          └─────────────────┘                      │
│                                                                          │
│   Anyone can read ❌            Only endpoints can read ✅               │
│                                                                          │
│   HTTPS provides:                                                        │
│   1. Encryption    - Data unreadable to eavesdroppers                   │
│   2. Integrity     - Data not modified in transit                        │
│   3. Authentication - Server is who it claims to be                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### TLS Handshake (Simplified)

```
Client                                           Server
   │                                                │
   │──── ClientHello ─────────────────────────────►│
   │     (supported ciphers, TLS version)          │
   │                                                │
   │◄─── ServerHello ──────────────────────────────│
   │     (chosen cipher, certificate)              │
   │                                                │
   │     [Client verifies certificate]             │
   │                                                │
   │──── Key Exchange ────────────────────────────►│
   │     (pre-master secret, encrypted)            │
   │                                                │
   │     [Both derive session keys]                │
   │                                                │
   │──── Finished ────────────────────────────────►│
   │◄─── Finished ─────────────────────────────────│
   │                                                │
   │◄═══ Encrypted HTTP Traffic ══════════════════►│
   │                                                │
```

---

## Caching

### Cache-Control Header

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CACHE-CONTROL DIRECTIVES                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Cacheability:                                                           │
│  ├── public      - Any cache can store (CDN, browser)                   │
│  ├── private     - Only browser can cache (user-specific data)          │
│  └── no-store    - Never cache (sensitive data)                          │
│                                                                          │
│  Expiration:                                                             │
│  ├── max-age=3600         - Fresh for 3600 seconds                       │
│  ├── s-maxage=3600        - For shared caches (CDN)                      │
│  └── no-cache             - Must revalidate before using                 │
│                                                                          │
│  Revalidation:                                                           │
│  ├── must-revalidate      - Must check if stale                          │
│  └── stale-while-revalidate=60 - Serve stale, refresh in background     │
│                                                                          │
│  Examples:                                                               │
│  Cache-Control: public, max-age=31536000    # Static assets (1 year)    │
│  Cache-Control: private, max-age=0          # User data, always fresh   │
│  Cache-Control: no-store                     # Never cache               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### ETag Validation

```
First Request:
Client ──► GET /api/users/123
Server ◄── 200 OK
           ETag: "abc123"
           {"name": "Alice"}

Subsequent Request:
Client ──► GET /api/users/123
           If-None-Match: "abc123"

If unchanged:
Server ◄── 304 Not Modified (no body, use cached)

If changed:
Server ◄── 200 OK
           ETag: "def456"
           {"name": "Alicia"}
```

---

## CORS (Cross-Origin Resource Sharing)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CORS FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Browser at https://app.example.com                                      │
│  wants to call https://api.different.com                                │
│                                                                          │
│  SIMPLE REQUEST (GET/POST with simple headers):                          │
│  ┌────────┐     GET /data                    ┌────────┐                 │
│  │Browser │ ──────────────────────────────►  │  API   │                 │
│  │        │ ◄──────────────────────────────  │        │                 │
│  └────────┘     Access-Control-Allow-Origin: │        │                 │
│                 https://app.example.com      └────────┘                 │
│                                                                          │
│  PREFLIGHT REQUEST (PUT/DELETE, custom headers):                         │
│  ┌────────┐     OPTIONS /data                ┌────────┐                 │
│  │Browser │ ────────────────────────────────►│  API   │                 │
│  │        │     Origin: https://app.example  │        │                 │
│  │        │ ◄────────────────────────────────│        │                 │
│  │        │     Access-Control-Allow-Origin  │        │                 │
│  │        │     Access-Control-Allow-Methods │        │                 │
│  │        │                                  │        │                 │
│  │        │     PUT /data (actual request)   │        │                 │
│  │        │ ────────────────────────────────►│        │                 │
│  └────────┘                                  └────────┘                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### CORS Headers

```http
# Server response headers
Access-Control-Allow-Origin: https://app.example.com  # or *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true  # Allow cookies
Access-Control-Max-Age: 86400  # Cache preflight for 24h
```

---

## Common Patterns

### Content Negotiation

```http
# Client requests specific format
GET /api/users/123
Accept: application/json

# Server responds with matching format
HTTP/1.1 200 OK
Content-Type: application/json

# Or indicates it can't
HTTP/1.1 406 Not Acceptable
```

### Compression

```http
# Client indicates supported compression
GET /api/large-data
Accept-Encoding: gzip, deflate, br

# Server compresses response
HTTP/1.1 200 OK
Content-Encoding: gzip
Content-Length: 1234  # Compressed size
```

### Range Requests (Partial Content)

```http
# Request specific bytes (resumable downloads, video streaming)
GET /video.mp4
Range: bytes=0-999999

# Server returns partial content
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-999999/5000000
Content-Length: 1000000
```

---

## Exercises

### Exercise 1: Debug an API Request 🟢

**Scenario:** Use curl to debug this failing request:
```bash
curl https://api.github.com/users/octocat
```

Add verbose output and identify: protocol version, status code, relevant headers.

<details>
<summary>💡 Hints</summary>

- Use `-v` for verbose output
- Use `-I` for headers only
- Look for HTTP version, status, content-type, rate-limit headers

</details>

<details>
<summary>✅ Solution</summary>

```bash
$ curl -v https://api.github.com/users/octocat

# Key output explained:
* Connected to api.github.com (140.82.121.6) port 443
* SSL connection using TLSv1.3 / TLS_AES_128_GCM_SHA256
> GET /users/octocat HTTP/2           # HTTP/2 protocol
> Host: api.github.com
> User-Agent: curl/8.0.1
> Accept: */*

< HTTP/2 200                           # Status code 200 OK
< content-type: application/json; charset=utf-8
< x-ratelimit-limit: 60               # Rate limiting headers
< x-ratelimit-remaining: 59
< x-ratelimit-reset: 1699900000
< etag: "abc123..."                    # For caching
< cache-control: public, max-age=60   # Cache for 60 seconds

{"login":"octocat","id":583231,...}
```

**Key observations:**
- Using HTTP/2 over TLS 1.3
- Rate limited to 60 requests/hour (unauthenticated)
- Response is cacheable for 60 seconds
- ETag allows conditional requests

</details>

---

### Exercise 2: Design Cache Headers 🟡

**Scenario:** Set appropriate Cache-Control headers for:
1. User profile API response (personalized data)
2. Static JavaScript bundle with hash in filename
3. Real-time stock price API

<details>
<summary>💡 Hints</summary>

- Think about who can cache (browser only vs CDN)
- Consider how often data changes
- Hash in filename = immutable content

</details>

<details>
<summary>✅ Solution</summary>

```http
# 1. User profile (personalized, changes occasionally)
Cache-Control: private, max-age=0, must-revalidate
ETag: "user-123-v5"
# private = only browser caches, not CDN
# max-age=0, must-revalidate = always check with server
# ETag allows 304 Not Modified if unchanged

# 2. Static JS bundle (app.a1b2c3d4.js)
Cache-Control: public, max-age=31536000, immutable
# public = CDN and browser can cache
# max-age=31536000 = 1 year (hash changes = new URL)
# immutable = never revalidate (browser optimization)

# 3. Real-time stock price
Cache-Control: no-store
# no-store = never cache, always fetch fresh
# Stock prices are time-sensitive, stale data is dangerous
```

</details>

---

### Exercise 3: CORS Debugging 🔴

**Scenario:** Your React app at `https://app.mysite.com` fails to call `https://api.mysite.com/data` with:
```
Access to fetch has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present
```

The request includes a custom `X-Request-ID` header.

Debug and fix the issue.

<details>
<summary>💡 Hints</summary>

- Custom headers trigger preflight (OPTIONS request)
- Check if server handles OPTIONS
- What headers must the server return?

</details>

<details>
<summary>✅ Solution</summary>

**Problem Analysis:**

1. Custom header `X-Request-ID` triggers CORS preflight
2. Browser sends OPTIONS request first
3. Server must respond to OPTIONS with correct headers

**Server Configuration Fix (Express.js example):**

```javascript
// Using cors middleware
const cors = require('cors');
app.use(cors({
  origin: 'https://app.mysite.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400  // Cache preflight for 24 hours
}));

// Or manual implementation
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://app.mysite.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://app.mysite.com');
  next();
});
```

**Nginx Configuration:**

```nginx
location /api {
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://app.mysite.com';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE';
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Request-ID';
        add_header 'Access-Control-Max-Age' 86400;
        return 204;
    }
    
    add_header 'Access-Control-Allow-Origin' 'https://app.mysite.com';
    proxy_pass http://backend;
}
```

**Debugging Steps:**
```bash
# Test OPTIONS request
curl -v -X OPTIONS https://api.mysite.com/data \
  -H "Origin: https://app.mysite.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-Request-ID"

# Should return:
# HTTP/2 204
# access-control-allow-origin: https://app.mysite.com
# access-control-allow-methods: GET, POST, PUT, DELETE
# access-control-allow-headers: Content-Type, Authorization, X-Request-ID
```

</details>

---

## Key Takeaways

- 📨 **HTTP is request/response**: Client initiates, server responds
- 🔢 **Status codes matter**: 2xx success, 4xx client error, 5xx server error
- 🔒 **HTTPS everywhere**: TLS provides encryption, integrity, authentication
- ⚡ **HTTP/2 is faster**: Multiplexing, header compression, single connection
- 💾 **Cache wisely**: Use Cache-Control, ETags for performance
- 🌐 **CORS protects users**: Same-origin policy with controlled exceptions

---

## Related Topics

- [TLS & Security](/networking/05-tls-and-security.md) - Deep dive into HTTPS/TLS
- [WebSockets & Real-Time](/networking/11-websockets-and-real-time.md) - Beyond request/response
- [Proxies & Gateways](/networking/09-proxies-and-gateways.md) - CDNs and reverse proxies
