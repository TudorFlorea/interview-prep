# Load Balancing

[← Back to Index](/networking/00-index.md)

---

## Overview

Load balancers distribute incoming traffic across multiple servers to improve availability, scalability, and performance. Understanding load balancing is essential for designing resilient backend systems.

### When This Matters Most
- Scaling applications horizontally
- Achieving high availability
- Implementing zero-downtime deployments
- Optimizing response times

---

## Why Load Balancing?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WITHOUT vs WITH LOAD BALANCER                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   WITHOUT:                           WITH:                               │
│                                                                          │
│   ┌──────────┐                      ┌──────────┐                        │
│   │  Users   │                      │  Users   │                        │
│   └────┬─────┘                      └────┬─────┘                        │
│        │                                 │                               │
│        │ All traffic                     │                               │
│        │ to one server                   ▼                               │
│        │                           ┌───────────┐                        │
│        │                           │   Load    │                        │
│        │                           │ Balancer  │                        │
│        ▼                           └─────┬─────┘                        │
│   ┌──────────┐                      ┌────┴────────────┐                 │
│   │ Server   │                      │        │        │                 │
│   │ (SPOF!)  │                      ▼        ▼        ▼                 │
│   └──────────┘                  ┌──────┐ ┌──────┐ ┌──────┐             │
│                                 │ Srv1 │ │ Srv2 │ │ Srv3 │             │
│   Problems:                     └──────┘ └──────┘ └──────┘             │
│   - Single point of failure                                             │
│   - Can't scale                  Benefits:                              │
│   - No redundancy                - High availability                    │
│                                  - Horizontal scaling                   │
│                                  - Health checks                        │
│                                  - Zero-downtime deploys               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Load Balancing Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      L4 vs L7 LOAD BALANCING                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   LAYER 4 (Transport Layer - TCP/UDP)                                    │
│   ──────────────────────────────────                                     │
│   ┌────────────┐                                                        │
│   │ TCP Packet │                                                        │
│   │ Src: 1.2.3.4:45678          Decision based on:                      │
│   │ Dst: 5.6.7.8:443    ───────► - Source IP:Port                       │
│   └────────────┘                 - Destination IP:Port                  │
│                                  - Protocol (TCP/UDP)                   │
│   Pros: Fast, low overhead                                               │
│   Cons: No content awareness                                             │
│   Use: Database connections, non-HTTP protocols                         │
│                                                                          │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                          │
│   LAYER 7 (Application Layer - HTTP/HTTPS)                               │
│   ─────────────────────────────────────────                              │
│   ┌────────────────────────────┐                                        │
│   │ GET /api/users HTTP/1.1   │                                         │
│   │ Host: api.example.com     │  Decision based on:                     │
│   │ Cookie: session=abc123    │──► - URL path (/api/*)                  │
│   │ X-Custom: value           │    - Host header                        │
│   └────────────────────────────┘   - HTTP method                        │
│                                     - Headers, cookies                   │
│                                     - Request body (sometimes)          │
│   Pros: Content-based routing, SSL termination                          │
│   Cons: Higher overhead, more complex                                    │
│   Use: Web apps, APIs, microservices                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Load Balancing Algorithms

### Round Robin

```
Request 1 ──► Server A
Request 2 ──► Server B
Request 3 ──► Server C
Request 4 ──► Server A  (cycles back)
...

Pros: Simple, even distribution
Cons: Ignores server capacity and current load
```

### Weighted Round Robin

```
Server A (weight: 3) ──► Gets 3x more traffic
Server B (weight: 1) ──► Gets baseline traffic

Distribution: A, A, A, B, A, A, A, B, ...

Use: When servers have different capacities
```

### Least Connections

```
┌──────────────────────────────────────────────────────────────┐
│ Server A: 10 active connections                              │
│ Server B: 5 active connections   ◄── New request goes here  │
│ Server C: 8 active connections                               │
└──────────────────────────────────────────────────────────────┘

Pros: Adapts to actual load
Cons: Doesn't account for connection "weight" (some are heavier)
```

### Weighted Least Connections

```
Score = Active Connections / Weight

Server A: 10 connections, weight 5 ──► Score: 2.0
Server B: 5 connections, weight 2  ──► Score: 2.5
Server C: 8 connections, weight 4  ──► Score: 2.0

Lowest score wins (tie-break: first in list)
```

### IP Hash

```
hash(client_ip) % number_of_servers = server_index

Client 1.2.3.4 ──► Always goes to Server A
Client 5.6.7.8 ──► Always goes to Server B

Pros: Session affinity without cookies
Cons: Uneven distribution if many clients behind same NAT
```

### Least Response Time

```
Route to server with:
- Fewest active connections AND
- Lowest average response time

Pros: Optimal for user experience
Cons: Requires continuous monitoring
```

---

## Health Checks

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HEALTH CHECK TYPES                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   TCP Health Check:                                                      │
│   LB ──► Connect to server:port ──► Success = healthy                  │
│   Simple, just checks if port is open                                   │
│                                                                          │
│   HTTP Health Check:                                                     │
│   LB ──► GET /health ──► 200 OK = healthy                              │
│   Can check application logic                                            │
│                                                                          │
│   Example health endpoint:                                               │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ GET /health                                                      │   │
│   │                                                                  │   │
│   │ Response (200 OK):                                               │   │
│   │ {                                                                │   │
│   │   "status": "healthy",                                          │   │
│   │   "database": "connected",                                      │   │
│   │   "cache": "connected",                                         │   │
│   │   "version": "1.2.3"                                            │   │
│   │ }                                                                │   │
│   │                                                                  │   │
│   │ Response (503 Service Unavailable):                              │   │
│   │ {                                                                │   │
│   │   "status": "unhealthy",                                        │   │
│   │   "database": "disconnected"                                    │   │
│   │ }                                                                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Health Check Parameters:                                               │
│   - Interval: How often to check (e.g., every 30s)                      │
│   - Timeout: Max wait for response (e.g., 5s)                           │
│   - Unhealthy threshold: Failures before marking unhealthy (e.g., 2)   │
│   - Healthy threshold: Successes to mark healthy again (e.g., 3)       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Session Persistence (Sticky Sessions)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SESSION PERSISTENCE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Problem: Stateful applications need requests from same user           │
│            to go to same server                                          │
│                                                                          │
│   Solutions:                                                             │
│                                                                          │
│   1. Cookie-based (recommended)                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ First request:                                                   │   │
│   │ LB assigns Server A, sets cookie: SERVERID=srv-a                │   │
│   │                                                                  │   │
│   │ Subsequent requests:                                             │   │
│   │ LB reads cookie, routes to Server A                             │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   2. Source IP affinity                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ hash(client_ip) → always same server                            │   │
│   │ Problem: Multiple users behind same NAT get same server         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   3. Application-level session ID (header)                              │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ X-Session-ID: abc123 → LB routes based on this                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Better approach: Make your app stateless!                             │
│   Store session in Redis/Memcached, any server can handle any request  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## SSL/TLS Termination

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SSL TERMINATION OPTIONS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. SSL Termination at Load Balancer (most common)                     │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Client ══HTTPS══► LB ──HTTP──► Backend                         │   │
│   │                   │                                             │   │
│   │                   ├── SSL certificate installed here           │   │
│   │                   ├── Decrypts traffic                         │   │
│   │                   └── Sends plain HTTP to backends             │   │
│   │                                                                 │   │
│   │ Pros: Offloads CPU from backends, centralized cert management  │   │
│   │ Cons: Traffic unencrypted internally                           │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   2. SSL Passthrough                                                     │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Client ══HTTPS══► LB ══HTTPS══► Backend                        │   │
│   │                   │                                             │   │
│   │                   ├── LB doesn't decrypt                        │   │
│   │                   ├── L4 load balancing only                    │   │
│   │                   └── Backend handles SSL                       │   │
│   │                                                                 │   │
│   │ Pros: End-to-end encryption                                    │   │
│   │ Cons: No L7 features, cert per backend                         │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   3. SSL Re-encryption                                                   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Client ══HTTPS══► LB ══HTTPS══► Backend                        │   │
│   │                   │                                             │   │
│   │                   ├── LB decrypts, inspects, re-encrypts       │   │
│   │                   ├── Full L7 features                         │   │
│   │                   └── End-to-end encryption                    │   │
│   │                                                                 │   │
│   │ Pros: Security + L7 features                                   │   │
│   │ Cons: Most CPU-intensive                                       │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cloud Load Balancers

### AWS

| Service | Layer | Use Case |
|---------|-------|----------|
| **ALB** (Application) | L7 | HTTP/HTTPS, path-based routing, WebSocket |
| **NLB** (Network) | L4 | TCP/UDP, ultra-low latency, static IP |
| **CLB** (Classic) | L4/L7 | Legacy, avoid for new projects |
| **GWLB** (Gateway) | L3 | Firewalls, intrusion detection |

### GCP

| Service | Layer | Use Case |
|---------|-------|----------|
| **HTTP(S) LB** | L7 | Global, HTTP/HTTPS, Cloud CDN |
| **TCP/SSL Proxy** | L4 | Global TCP, SSL termination |
| **Network LB** | L4 | Regional, high performance |
| **Internal LB** | L4/L7 | Private, within VPC |

### Azure

| Service | Layer | Use Case |
|---------|-------|----------|
| **Application Gateway** | L7 | HTTP/HTTPS, WAF |
| **Load Balancer** | L4 | TCP/UDP, high performance |
| **Front Door** | L7 | Global, CDN, WAF |
| **Traffic Manager** | DNS | DNS-based global routing |

---

## Nginx as Load Balancer

```nginx
# /etc/nginx/nginx.conf

http {
    # Define upstream servers
    upstream backend {
        # Load balancing method (default: round-robin)
        # least_conn;  # Least connections
        # ip_hash;     # IP-based sticky sessions
        
        server 10.0.1.1:8080 weight=3;  # Higher weight
        server 10.0.1.2:8080 weight=1;
        server 10.0.1.3:8080 backup;    # Only used if others fail
        
        # Health checks (nginx plus or custom)
        # health_check interval=5s fails=2 passes=3;
    }
    
    server {
        listen 80;
        listen 443 ssl;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            
            # Headers for backend
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 5s;
            proxy_read_timeout 60s;
            
            # Sticky sessions via cookie
            # sticky cookie srv_id expires=1h;
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
        }
    }
}
```

---

## Exercises

### Exercise 1: Choose the Right Algorithm 🟢

**Scenario:** Match each situation to the best load balancing algorithm:

1. E-commerce site with varying server capacities
2. Real-time gaming server (session state on server)
3. Stateless microservices with equal servers
4. API gateway with long-running requests

Options: Round Robin, Weighted Round Robin, IP Hash, Least Connections

<details>
<summary>✅ Solution</summary>

```
1. E-commerce site with varying server capacities
   → Weighted Round Robin
   Servers have different specs, distribute proportionally

2. Real-time gaming server (session state on server)
   → IP Hash
   Same player always connects to same server
   (Or use sticky sessions with cookies)

3. Stateless microservices with equal servers
   → Round Robin
   Simple, even distribution, no session requirements

4. API gateway with long-running requests
   → Least Connections
   Prevents overloading servers with many active requests
   Adapts to actual load, not just request count
```

</details>

---

### Exercise 2: Design Health Check 🟡

**Scenario:** Design a health check endpoint for a service that depends on:
- PostgreSQL database
- Redis cache
- External payment API

What should it check? What status codes should it return?

<details>
<summary>💡 Hints</summary>

- Consider which dependencies are critical vs optional
- Think about timeout handling
- Should checking external API be part of health check?

</details>

<details>
<summary>✅ Solution</summary>

```javascript
// Express.js health check endpoint

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  // Check database (CRITICAL)
  try {
    await db.query('SELECT 1');
    health.checks.database = { status: 'healthy' };
  } catch (error) {
    health.checks.database = { status: 'unhealthy', error: error.message };
    health.status = 'unhealthy';
  }
  
  // Check Redis (CRITICAL for sessions)
  try {
    await redis.ping();
    health.checks.redis = { status: 'healthy' };
  } catch (error) {
    health.checks.redis = { status: 'unhealthy', error: error.message };
    health.status = 'unhealthy';
  }
  
  // External payment API (NOT checked in health - not our dependency)
  // Checking external APIs can cause cascading failures
  // Instead, use circuit breaker pattern at runtime
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Separate endpoint for deep health check (not for LB)
app.get('/health/deep', async (req, res) => {
  // Include external service checks here
  // Use longer timeouts
  // Don't use for load balancer health checks!
});
```

**Best practices:**

```
1. Critical dependencies only
   - Database, cache, message queue
   - NOT external APIs (use circuit breakers instead)

2. Fast checks
   - Simple query (SELECT 1), PING
   - Timeout: 2-5 seconds max

3. Status codes
   - 200: All critical dependencies healthy
   - 503: Any critical dependency unhealthy
   
4. Separate endpoints
   - /health - For load balancer (fast, critical only)
   - /health/ready - For Kubernetes readiness
   - /health/live - For Kubernetes liveness
   - /health/deep - For monitoring (includes externals)
```

</details>

---

### Exercise 3: Troubleshoot Load Balancer 🔴

**Scenario:** Users report intermittent 502 Bad Gateway errors. Your setup:
- ALB → 3 EC2 instances running Node.js on port 3000
- Health checks: HTTP GET /health, interval 30s, threshold 2

Logs show some instances becoming unhealthy then healthy again.

Debug and propose fixes.

<details>
<summary>💡 Hints</summary>

- What causes 502? (Backend not responding)
- Why intermittent? (Sometimes works, sometimes fails)
- Health check interval vs app behavior?

</details>

<details>
<summary>✅ Solution</summary>

**Possible causes:**

```
1. Health check timeout too short
   ─────────────────────────────
   Problem: Health endpoint takes >5s during GC or load spikes
   
   Fix:
   - Increase health check timeout (5s → 10s)
   - Optimize health check endpoint
   - health check endpoint should be fast and simple

2. App crashes and restarts
   ────────────────────────
   Problem: Unhandled exceptions crash Node.js
   
   Investigate:
   $ journalctl -u myapp -f
   $ tail -f /var/log/myapp/error.log
   
   Fix:
   - Add proper error handling
   - Use PM2 or systemd for restarts
   - Implement graceful shutdown

3. Connection/socket exhaustion
   ───────────────────────────
   Problem: Too many open connections, can't accept new ones
   
   Check:
   $ ss -tuln | grep 3000
   $ lsof -i :3000 | wc -l
   
   Fix:
   - Increase ulimit
   - Add connection pooling
   - Check for connection leaks

4. Event loop blocking
   ────────────────────
   Problem: Synchronous operations block health check response
   
   Fix:
   - Use async operations
   - Move CPU-intensive work to worker threads
   - Profile with Node.js --inspect

5. Health check vs actual service mismatch
   ────────────────────────────────────────
   Problem: /health returns 200 but app can't serve real requests
   
   Fix:
   - Health check should verify critical dependencies
   - Use /ready endpoint for "ready to serve"
   - Separate liveness from readiness
```

**Recommended changes:**

```yaml
# ALB Health Check Settings
HealthCheckPath: /health
HealthCheckIntervalSeconds: 10       # More frequent
HealthCheckTimeoutSeconds: 5
HealthyThresholdCount: 2
UnhealthyThresholdCount: 2

# Also add:
# - Connection draining (deregistration delay): 30s
# - Slow start duration: 60s (gradually increase traffic)
```

**Enhanced health check:**

```javascript
// Fast, reliable health check
app.get('/health', (req, res) => {
  // Don't do database checks here for liveness
  res.status(200).send('OK');
});

// Readiness check (for k8s or detailed health)
app.get('/ready', async (req, res) => {
  try {
    await Promise.race([
      db.query('SELECT 1'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 2000)
      )
    ]);
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, draining connections...');
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
  
  // Force exit after 30s
  setTimeout(() => process.exit(1), 30000);
});
```

**Monitoring additions:**
```bash
# CloudWatch metrics to watch:
# - HealthyHostCount / UnhealthyHostCount
# - TargetResponseTime
# - RequestCount vs RejectedConnectionCount
# - HTTP 5XX errors
```

</details>

---

## Key Takeaways

- ⚖️ **Load balancers distribute traffic**: Improve availability and scalability
- 📊 **L4 vs L7**: TCP-level routing vs HTTP-aware routing
- 🔄 **Algorithms matter**: Round robin, least connections, IP hash for different needs
- 💓 **Health checks**: Automatically remove unhealthy backends
- 🔐 **SSL termination**: Offload encryption to load balancer
- 🍪 **Session persistence**: Sticky sessions vs stateless design (prefer stateless)

---

## Related Topics

- [Proxies & Gateways](/networking/09-proxies-and-gateways.md) - Reverse proxies and CDNs
- Cloud Networking - Cloud load balancer services
- [HTTP & HTTPS](/networking/02-http-and-https.md) - HTTP protocol details
