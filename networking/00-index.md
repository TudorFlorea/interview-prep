# Networking for Backend & Full-Stack Engineers

[← Back to Main](/index.md)

> A practical guide to computer networking concepts essential for backend and full-stack development.

---

## 📊 Progress Dashboard

### Phase 1: Foundations
| Topic | Status | Difficulty |
|-------|--------|------------|
| [Internet & Protocols](/networking/01-internet-and-protocols.md) | ⬜ Not Started | 🟢 Foundational |
| [HTTP & HTTPS](/networking/02-http-and-https.md) | ⬜ Not Started | 🟢 Foundational |
| [DNS Resolution](/networking/03-dns.md) | ⬜ Not Started | 🟢 Foundational |

### Phase 2: Transport & Security
| Topic | Status | Difficulty |
|-------|--------|------------|
| [TCP & UDP](/networking/04-tcp-and-udp.md) | ⬜ Not Started | 🟡 Intermediate |
| [TLS & Security](/networking/05-tls-and-security.md) | ⬜ Not Started | 🟡 Intermediate |
| [IP Addressing & Subnets](/networking/06-ip-addressing-and-subnets.md) | ⬜ Not Started | 🟡 Intermediate |

### Phase 3: Infrastructure
| Topic | Status | Difficulty |
|-------|--------|------------|
| [Routing Basics](/networking/07-routing-basics.md) | ⬜ Not Started | 🟡 Intermediate |
| [Load Balancing](/networking/08-load-balancing.md) | ⬜ Not Started | 🟡 Intermediate |
| [Proxies & Gateways](/networking/09-proxies-and-gateways.md) | ⬜ Not Started | 🟡 Intermediate |
| [Firewalls & Security Groups](/networking/10-firewalls-and-security-groups.md) | ⬜ Not Started | 🟡 Intermediate |

### Phase 4: Modern Patterns
| Topic | Status | Difficulty |
|-------|--------|------------|
| [WebSockets & Real-Time](/networking/11-websockets-and-real-time.md) | ⬜ Not Started | 🟡 Intermediate |
| [Physical & Link Layer](/networking/12-physical-and-link-layer.md) | ⬜ Not Started | 🟢 Foundational |
| [Debugging & Tools](/networking/13-debugging-and-tools.md) | ⬜ Not Started | 🟡 Intermediate |
| [Cloud Networking](/networking/14-cloud-networking.md) | ⬜ Not Started | 🔴 Advanced |

---

## 🗺️ Study Roadmap

### Week 1: Foundations (How the Web Works)
- **Goal**: Understand what happens when you type a URL
- **Topics**: Internet basics, HTTP request/response, DNS resolution
- **Practice**: Use curl, browser dev tools, dig/nslookup

### Week 2: Transport & Security
- **Goal**: Understand reliable delivery and encryption
- **Topics**: TCP handshakes, UDP use cases, TLS certificates, IP addressing
- **Practice**: Analyze TCP connections, inspect certificates, calculate subnets

### Week 3: Infrastructure
- **Goal**: Understand how traffic flows through infrastructure
- **Topics**: Routing, load balancers, proxies, firewalls
- **Practice**: Configure nginx, set up firewall rules, trace routes

### Week 4: Modern Patterns
- **Goal**: Understand real-time communication and cloud networking
- **Topics**: WebSockets, debugging tools, VPCs, service mesh
- **Practice**: Build WebSocket server, use tcpdump/wireshark, design VPC

---

## 🌐 The Journey of a Web Request

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                     WHAT HAPPENS WHEN YOU VISIT example.com                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

  👤 User types: https://example.com/api/users
       │
       ▼
  ┌─────────────┐    1. DNS LOOKUP
  │   Browser   │────────────────────────► DNS Resolver ──► "93.184.216.34"
  └─────────────┘
       │
       │ 2. TCP HANDSHAKE (SYN → SYN-ACK → ACK)
       ▼
  ┌─────────────┐    3. TLS HANDSHAKE
  │   Client    │────────────────────────► Negotiate encryption, verify certificate
  └─────────────┘
       │
       │ 4. HTTP REQUEST (encrypted)
       │    GET /api/users HTTP/2
       │    Host: example.com
       ▼
  ┌─────────────┐    5. ROUTING
  │   Router    │────────────────────────► Find best path across networks
  └─────────────┘
       │
       ▼
  ┌─────────────┐    6. LOAD BALANCER
  │     LB      │────────────────────────► Distribute to healthy server
  └─────────────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
  ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ Server1 │    │ Server2 │    │ Server3 │
  └─────────┘    └─────────┘    └─────────┘
       │
       │ 7. HTTP RESPONSE
       │    HTTP/2 200 OK
       │    Content-Type: application/json
       │    [{"id": 1, "name": "Alice"}, ...]
       ▼
  ┌─────────────┐
  │   Browser   │◄─────────────────────── Response rendered
  └─────────────┘

```

---

## 📚 The OSI & TCP/IP Models

```
┌────────────────────────────────────────────────────────────────────────┐
│                    NETWORK LAYER MODELS                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   OSI Model (7 Layers)          TCP/IP Model (4 Layers)                │
│   ════════════════════          ═══════════════════════                │
│                                                                         │
│   ┌─────────────────┐                                                  │
│   │ 7. Application  │ ─┐                                               │
│   ├─────────────────┤  │        ┌─────────────────┐                    │
│   │ 6. Presentation │  ├──────► │   Application   │  HTTP, DNS, FTP   │
│   ├─────────────────┤  │        └─────────────────┘                    │
│   │ 5. Session      │ ─┘                                               │
│   ├─────────────────┤           ┌─────────────────┐                    │
│   │ 4. Transport    │ ────────► │    Transport    │  TCP, UDP         │
│   ├─────────────────┤           └─────────────────┘                    │
│   │ 3. Network      │ ────────► ┌─────────────────┐                    │
│   ├─────────────────┤           │     Network     │  IP, ICMP         │
│   │ 2. Data Link    │ ─┐        └─────────────────┘                    │
│   ├─────────────────┤  ├──────► ┌─────────────────┐                    │
│   │ 1. Physical     │ ─┘        │  Network Access │  Ethernet, WiFi   │
│   └─────────────────┘           └─────────────────┘                    │
│                                                                         │
│   Backend Focus: Primarily Layers 4-7 (Transport & Application)        │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Essential Tools Reference

| Tool | Purpose | Example |
|------|---------|---------|
| `curl` | HTTP requests | `curl -v https://api.example.com` |
| `dig` / `nslookup` | DNS queries | `dig example.com` |
| `ping` | ICMP connectivity | `ping -c 4 google.com` |
| `traceroute` / `tracert` | Path tracing | `traceroute google.com` |
| `netstat` / `ss` | Connection status | `ss -tuln` |
| `tcpdump` | Packet capture | `tcpdump -i eth0 port 80` |
| `wireshark` | GUI packet analysis | Visual protocol inspection |
| `openssl` | TLS/certificate tools | `openssl s_client -connect example.com:443` |
| `nc` (netcat) | TCP/UDP testing | `nc -zv host.com 80` |

---

## 📖 Recommended Resources

### Primary Reference
- **Computer Networking: A Top-Down Approach** - Kurose & Ross
  - Comprehensive but academic; these notes extract practical concepts

### Online Resources
- [Cloudflare Learning Center](https://www.cloudflare.com/learning/) - Excellent explanations
- [High Performance Browser Networking](https://hpbn.co/) - Free online book
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/) - Socket programming

### Practice Platforms
- [sadservers.com](https://sadservers.com/) - Linux troubleshooting (includes networking)
- Docker-based labs (included in exercises marked 🐳)

---

## 🎯 Learning Objectives

By completing these resources, you will be able to:

1. **Explain** what happens from URL to rendered page
2. **Debug** common networking issues (DNS, connectivity, TLS)
3. **Configure** load balancers, proxies, and firewalls
4. **Design** cloud network architectures (VPCs, subnets, security groups)
5. **Optimize** application performance (HTTP/2, connection pooling, caching)
6. **Secure** network communication (TLS, mTLS, firewall rules)
7. **Troubleshoot** using tcpdump, curl, dig, and other tools
