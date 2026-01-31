# Load Balancing

[← Back to Fundamentals](00-index.md)

---

## Overview

Load balancing distributes incoming traffic across multiple servers to ensure high availability, reliability, and performance. It's a fundamental component in any scalable system architecture, preventing any single server from becoming overwhelmed while providing redundancy if servers fail.

---

## 🎯 Why Load Balancing?

### Benefits

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOAD BALANCING BENEFITS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Without Load Balancer:          With Load Balancer:            │
│  ─────────────────────           ───────────────────            │
│                                                                 │
│  ┌──────────┐                    ┌──────────┐                  │
│  │  Client  │                    │  Client  │                  │
│  └────┬─────┘                    └────┬─────┘                  │
│       │                               │                        │
│       │                               ▼                        │
│       │                        ┌──────────────┐                │
│       │                        │    Load      │                │
│       │                        │   Balancer   │                │
│       │                        └──────┬───────┘                │
│       │                          ┌────┼────┐                   │
│       ▼                          ▼    ▼    ▼                   │
│  ┌──────────┐               ┌────┐ ┌────┐ ┌────┐              │
│  │ Server 1 │               │ S1 │ │ S2 │ │ S3 │              │
│  └──────────┘               └────┘ └────┘ └────┘              │
│                                                                 │
│  ❌ Single point of failure   ✅ High availability              │
│  ❌ Limited capacity           ✅ Horizontal scaling             │
│  ❌ No redundancy              ✅ Automatic failover             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Functions

| Function | Description |
|----------|-------------|
| **Traffic Distribution** | Spread requests across servers |
| **Health Checking** | Detect and remove failed servers |
| **SSL Termination** | Handle HTTPS encryption |
| **Session Persistence** | Route user to same server |
| **Rate Limiting** | Protect backends from overload |

---

## 🔀 Load Balancing Algorithms

### Round Robin

Distributes requests sequentially to each server in turn.

```
Request 1 → Server A
Request 2 → Server B
Request 3 → Server C
Request 4 → Server A (cycle repeats)
```

**Pros:** Simple, even distribution
**Cons:** Ignores server capacity and current load
**Use when:** Servers are identical, requests are similar size

### Weighted Round Robin

Like round robin, but servers with higher weights get more requests.

```
Server A (weight: 3) → Gets 3 out of every 6 requests
Server B (weight: 2) → Gets 2 out of every 6 requests
Server C (weight: 1) → Gets 1 out of every 6 requests
```

**Pros:** Accounts for server capacity differences
**Cons:** Still ignores current load
**Use when:** Servers have different capacities

### Least Connections

Routes to server with fewest active connections.

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEAST CONNECTIONS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current State:                                                 │
│  Server A: 15 connections                                       │
│  Server B: 8 connections  ← Next request goes here              │
│  Server C: 12 connections                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pros:** Considers actual load
**Cons:** Doesn't account for request complexity
**Use when:** Requests have varying processing times

### Least Response Time

Routes to server with lowest latency and fewest connections.

**Pros:** Optimizes for user experience
**Cons:** Requires constant latency monitoring
**Use when:** Response time is critical

### IP Hash

Routes based on client IP, ensuring same client always hits same server.

```
hash(client_ip) % number_of_servers = target_server

Client 192.168.1.100 → always goes to Server B
Client 192.168.1.101 → always goes to Server A
```

**Pros:** Session persistence without cookies
**Cons:** Uneven distribution if IPs clustered
**Use when:** Stateful applications, session affinity needed

### Consistent Hashing

Advanced algorithm that minimizes redistribution when servers change.

**Pros:** Minimal disruption on server add/remove
**Cons:** More complex to implement
**Use when:** Distributed caches, adding/removing servers frequently

---

## 📊 Layer 4 vs Layer 7 Load Balancing

### OSI Model Context

```
┌─────────────────────────────────────────────────────────────────┐
│                    OSI LAYERS                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 7: Application    HTTP, HTTPS, WebSocket                │
│  Layer 6: Presentation   SSL/TLS, Compression                  │
│  Layer 5: Session        Session management                    │
│  Layer 4: Transport      TCP, UDP                               │
│  Layer 3: Network        IP addresses, routing                 │
│  Layer 2: Data Link      MAC addresses, Ethernet               │
│  Layer 1: Physical       Cables, signals                       │
│                                                                 │
│  Load balancers typically operate at Layer 4 or Layer 7         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 4 (Transport Layer)

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 4 LOAD BALANCING                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Decision based on:                                             │
│  • Source/Destination IP                                        │
│  • Source/Destination Port                                      │
│  • Protocol (TCP/UDP)                                           │
│                                                                 │
│  Cannot see:                                                    │
│  • HTTP headers, cookies                                        │
│  • URL paths                                                    │
│  • Request content                                              │
│                                                                 │
│  ✅ Very fast (no content inspection)                           │
│  ✅ Protocol agnostic                                           │
│  ❌ Limited routing options                                     │
│  ❌ No content-based decisions                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 7 (Application Layer)

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 7 LOAD BALANCING                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Decision based on:                                             │
│  • URL path (/api/users → user-service)                         │
│  • HTTP headers (Accept, Authorization)                         │
│  • Cookies (session affinity)                                   │
│  • Query parameters                                             │
│  • Request body (sometimes)                                     │
│                                                                 │
│  ✅ Content-based routing                                       │
│  ✅ SSL termination                                             │
│  ✅ Request manipulation                                        │
│  ❌ Slightly higher latency                                     │
│  ❌ More compute intensive                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Comparison

| Feature | Layer 4 | Layer 7 |
|---------|---------|---------|
| Speed | Faster | Slightly slower |
| Routing options | Limited (IP/port) | Rich (URL, headers, cookies) |
| SSL termination | No | Yes |
| Content caching | No | Yes |
| WebSocket support | Basic | Full |
| Use case | Simple TCP/UDP | HTTP/HTTPS applications |

---

## 🏥 Health Checks

### Types of Health Checks

```
┌─────────────────────────────────────────────────────────────────┐
│                    HEALTH CHECK TYPES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. TCP Check (Layer 4)                                         │
│  ─────────────────────────────────────────                      │
│  Can we establish TCP connection?                               │
│  → Simple but doesn't verify application health                 │
│                                                                 │
│  2. HTTP Check (Layer 7)                                        │
│  ─────────────────────────────────────────                      │
│  GET /health returns 200?                                       │
│  → Verifies application is responding                           │
│                                                                 │
│  3. Deep Health Check                                           │
│  ─────────────────────────────────────────                      │
│  GET /health/deep - checks DB, cache, dependencies              │
│  → Most thorough but can be slow                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Health Check Configuration

```yaml
# NGINX health check example
upstream backend {
    server 192.168.1.1:8080;
    server 192.168.1.2:8080;
    server 192.168.1.3:8080;
    
    # Check every 5 seconds
    # Mark unhealthy after 3 failures
    # Mark healthy after 2 successes
    health_check interval=5s fails=3 passes=2;
}

# AWS ALB health check
health_check {
    path                = "/health"
    port                = "8080"
    protocol            = "HTTP"
    timeout             = 5
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-299"
}
```

### Graceful Degradation

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER STATE TRANSITIONS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Healthy ──[health check fails]──► Unhealthy                   │
│     ▲                                    │                      │
│     │                                    │                      │
│     └────[health check passes]───────────┘                      │
│                                                                 │
│  Draining State:                                                │
│  ─────────────────────────────────────────                      │
│  Stop sending new requests                                      │
│  Wait for existing requests to complete                         │
│  Then mark as unhealthy                                         │
│                                                                 │
│  Useful for: Deployments, maintenance                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 SSL/TLS Termination

### Termination Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    SSL TERMINATION OPTIONS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Option 1: Terminate at Load Balancer                           │
│  ─────────────────────────────────────────                      │
│                                                                 │
│  Client ──HTTPS──► LB ──HTTP──► Servers                         │
│                                                                 │
│  ✅ Offloads CPU from app servers                               │
│  ✅ Centralized certificate management                          │
│  ❌ Traffic unencrypted in internal network                     │
│                                                                 │
│  Option 2: SSL Passthrough                                      │
│  ─────────────────────────────────────────                      │
│                                                                 │
│  Client ──HTTPS──► LB ──HTTPS──► Servers                        │
│                                                                 │
│  ✅ End-to-end encryption                                       │
│  ❌ LB can't inspect traffic (Layer 4 only)                     │
│  ❌ Each server needs certificates                              │
│                                                                 │
│  Option 3: Re-encryption                                        │
│  ─────────────────────────────────────────                      │
│                                                                 │
│  Client ──HTTPS──► LB ──HTTPS──► Servers                        │
│         (public cert)  (internal cert)                          │
│                                                                 │
│  ✅ End-to-end encryption                                       │
│  ✅ LB can inspect traffic (Layer 7)                            │
│  ❌ Double encryption overhead                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📍 Session Persistence (Sticky Sessions)

### Why Needed?

Some applications store state on the server (sessions, local cache). These need requests from same user to hit same server.

### Implementation Methods

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION PERSISTENCE METHODS                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Cookie-Based                                                │
│  ─────────────────────────────────────────                      │
│  LB sets cookie: SERVERID=server2                               │
│  Subsequent requests routed to server2                          │
│  ✅ Works across restarts                                       │
│                                                                 │
│  2. Source IP Affinity                                          │
│  ─────────────────────────────────────────                      │
│  hash(client_ip) → server                                       │
│  ❌ Breaks with proxies, NAT                                    │
│                                                                 │
│  3. Application Cookie                                          │
│  ─────────────────────────────────────────                      │
│  App sets session cookie, LB reads it                           │
│  ✅ Application controls routing                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Better Alternative: Stateless Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    STATELESS ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Instead of server-side sessions:                               │
│                                                                 │
│  ┌──────────┐     ┌──────┐     ┌─────────────────┐             │
│  │  Client  │────►│  LB  │────►│  Any Server     │             │
│  └──────────┘     └──────┘     └────────┬────────┘             │
│       │                                  │                      │
│       │ JWT Token                        ▼                      │
│       │                        ┌─────────────────┐             │
│       │                        │  Shared Cache   │             │
│       │                        │    (Redis)      │             │
│       │                        └─────────────────┘             │
│                                                                 │
│  ✅ Any server can handle any request                           │
│  ✅ Easy horizontal scaling                                     │
│  ✅ Server failures don't lose sessions                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Load Balancer Architectures

### Single Load Balancer

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     ▼
┌──────────┐     ← Single point of failure!
│    LB    │
└────┬─────┘
     │
 ┌───┼───┐
 ▼   ▼   ▼
┌─┐ ┌─┐ ┌─┐
│S│ │S│ │S│
└─┘ └─┘ └─┘
```

### Active-Passive (HA Pair)

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     ▼
┌──────────┐  heartbeat  ┌──────────┐
│ Active   │◄───────────►│ Passive  │
│   LB     │             │   LB     │
└────┬─────┘             └──────────┘
     │                        │
     │ (passive takes over    │
     │  if active fails)      │
 ┌───┼───┐
 ▼   ▼   ▼
┌─┐ ┌─┐ ┌─┐
│S│ │S│ │S│
└─┘ └─┘ └─┘
```

### Active-Active

```
                     ┌──────────┐
                     │   DNS    │
                     └────┬─────┘
                ┌─────────┴─────────┐
                ▼                   ▼
          ┌──────────┐        ┌──────────┐
          │   LB1    │        │   LB2    │
          └────┬─────┘        └────┬─────┘
               │                   │
               └─────────┬─────────┘
                    ┌────┼────┐
                    ▼    ▼    ▼
                   ┌─┐  ┌─┐  ┌─┐
                   │S│  │S│  │S│
                   └─┘  └─┘  └─┘
```

### Global Load Balancing

```
┌─────────────────────────────────────────────────────────────────┐
│                    GLOBAL LOAD BALANCING                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                      ┌─────────────────┐                        │
│                      │  Global DNS LB  │                        │
│                      │  (GeoDNS/GSLB)  │                        │
│                      └────────┬────────┘                        │
│               ┌───────────────┼───────────────┐                 │
│               ▼               ▼               ▼                 │
│        ┌───────────┐   ┌───────────┐   ┌───────────┐           │
│        │ US-East   │   │ EU-West   │   │ Asia-Pac  │           │
│        │ Region LB │   │ Region LB │   │ Region LB │           │
│        └─────┬─────┘   └─────┬─────┘   └─────┬─────┘           │
│              │               │               │                  │
│              ▼               ▼               ▼                  │
│         ┌────────┐      ┌────────┐      ┌────────┐             │
│         │Servers │      │Servers │      │Servers │             │
│         └────────┘      └────────┘      └────────┘             │
│                                                                 │
│  Routes users to nearest region based on:                       │
│  • Geographic location                                          │
│  • Latency                                                      │
│  • Region health                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Popular Load Balancers

### Software Load Balancers

| Name | Type | Strengths | Use Case |
|------|------|-----------|----------|
| **NGINX** | L7 (L4 possible) | HTTP features, reverse proxy | Web applications |
| **HAProxy** | L4/L7 | High performance, TCP/HTTP | High-throughput |
| **Envoy** | L7 | Service mesh, observability | Microservices |
| **Traefik** | L7 | Docker/K8s native, auto-config | Container environments |

### Cloud Load Balancers

| Provider | Service | Type | Notes |
|----------|---------|------|-------|
| **AWS** | ALB | L7 | Application-focused |
| **AWS** | NLB | L4 | Ultra-low latency |
| **AWS** | GLB | L3 | Gateway, security appliances |
| **GCP** | Cloud Load Balancing | L4/L7 | Global anycast |
| **Azure** | Azure Load Balancer | L4 | Regional |
| **Azure** | Application Gateway | L7 | WAF, SSL |

---

## 📝 NGINX Configuration Example

```nginx
# Layer 7 Load Balancing Configuration
upstream api_servers {
    # Least connections algorithm
    least_conn;
    
    # Server pool
    server 10.0.1.1:8080 weight=5;
    server 10.0.1.2:8080 weight=3;
    server 10.0.1.3:8080 weight=2;
    
    # Backup server (only used if all primary servers fail)
    server 10.0.1.4:8080 backup;
    
    # Health check settings
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;
    
    # SSL termination
    ssl_certificate     /etc/ssl/certs/api.example.com.crt;
    ssl_certificate_key /etc/ssl/private/api.example.com.key;
    
    location / {
        proxy_pass http://api_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint (bypasses backend)
    location /lb-health {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
```

---

## ✅ Key Takeaways

1. **Choose L4 for speed, L7 for features** - Most HTTP apps use L7
2. **Always have HA pairs** - Single LB is a single point of failure
3. **Implement proper health checks** - Prevent routing to dead servers
4. **Consider SSL termination location** - Balance security vs. performance
5. **Prefer stateless architecture** - Avoid sticky sessions when possible
6. **Use global load balancing** - For multi-region deployments
7. **Monitor your load balancers** - They're critical infrastructure

---

## 📚 Related Topics

- [Scaling Strategies](10-scaling-strategies.md) - When to add more servers
- [Fault Tolerance](20-fault-tolerance.md) - Handling failures
- [CDN](17-blob-storage-cdn.md) - Edge load balancing
- [API Gateway](04-api-design.md) - API-level routing
