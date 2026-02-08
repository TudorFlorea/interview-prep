# Internet & Protocols

[← Back to Index](/networking/00-index.md)

---

## Overview

The Internet is a global network of interconnected networks, all speaking common protocols. Understanding how data travels from your application to a server on the other side of the world—and back—is foundational for backend development.

### When This Matters Most
- Debugging connectivity issues
- Understanding latency and performance
- Designing distributed systems
- Working with APIs and microservices

---

## What is the Internet?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        THE INTERNET STRUCTURE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Your Device                                                            │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────────┐                                                   │
│   │  Home Router    │  Your local network (LAN)                         │
│   └────────┬────────┘                                                   │
│            │                                                             │
│            ▼                                                             │
│   ┌─────────────────┐                                                   │
│   │      ISP        │  Internet Service Provider                        │
│   │  (Comcast, etc) │  Connects you to the Internet backbone            │
│   └────────┬────────┘                                                   │
│            │                                                             │
│            ▼                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    INTERNET BACKBONE                             │   │
│   │  ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐                       │   │
│   │  │ IXP │────│Tier1│────│Tier1│────│ IXP │  (Internet Exchange   │   │
│   │  └─────┘    └─────┘    └─────┘    └─────┘   Points, Tier-1 ISPs) │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│            │                                                             │
│            ▼                                                             │
│   ┌─────────────────┐                                                   │
│   │  Destination    │  Cloud provider, data center, etc.               │
│   │  ISP / Network  │                                                   │
│   └────────┬────────┘                                                   │
│            │                                                             │
│            ▼                                                             │
│   ┌─────────────────┐                                                   │
│   │  Target Server  │  The API or website you're accessing             │
│   └─────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Concept**: The Internet is a "network of networks" connected through:
- **ISPs** (Internet Service Providers) - Connect end users
- **IXPs** (Internet Exchange Points) - Where networks peer/exchange traffic
- **Tier-1 Networks** - Global backbone providers (no one charges them for transit)

---

## Protocols: The Language of the Internet

A **protocol** is an agreed-upon set of rules for communication.

### Protocol Layering

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATA ENCAPSULATION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Application Layer (HTTP)                                               │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ GET /api/users HTTP/1.1                                          │   │
│   │ Host: example.com                                                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼ Wrap in TCP segment                       │
│   Transport Layer (TCP)                                                  │
│   ┌──────────┬─────────────────────────────────────────────────────┐   │
│   │ TCP HDR  │ HTTP Data                                            │   │
│   │ Src:4532 │ GET /api/users HTTP/1.1...                           │   │
│   │ Dst:80   │                                                       │   │
│   └──────────┴─────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼ Wrap in IP packet                         │
│   Network Layer (IP)                                                     │
│   ┌──────────┬──────────┬──────────────────────────────────────────┐   │
│   │  IP HDR  │ TCP HDR  │ HTTP Data                                 │   │
│   │ Src IP   │          │                                           │   │
│   │ Dst IP   │          │                                           │   │
│   └──────────┴──────────┴──────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼ Wrap in Ethernet frame                    │
│   Link Layer (Ethernet)                                                  │
│   ┌──────────┬──────────┬──────────┬─────────────────────────┬─────┐   │
│   │ ETH HDR  │  IP HDR  │ TCP HDR  │ HTTP Data               │ CRC │   │
│   │ MAC Addr │          │          │                         │     │   │
│   └──────────┴──────────┴──────────┴─────────────────────────┴─────┘   │
│                                                                          │
│   Each layer adds its header, creating nested "envelopes"                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Common Protocols by Layer

| Layer | Protocols | Purpose |
|-------|-----------|---------|
| **Application** | HTTP, HTTPS, DNS, FTP, SMTP, SSH, WebSocket | User-facing services |
| **Transport** | TCP, UDP, QUIC | Reliable/unreliable delivery |
| **Network** | IP, ICMP, ARP | Addressing and routing |
| **Link** | Ethernet, WiFi (802.11), PPP | Physical transmission |

---

## Packet Switching vs Circuit Switching

```
┌─────────────────────────────────────────────────────────────────────────┐
│               CIRCUIT SWITCHING (Old Phone Networks)                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   A ════════════════════════════════════════════════════════════════ B  │
│     Dedicated circuit for entire call duration                           │
│     Resources reserved even during silence                               │
│                                                                          │
│   ✅ Guaranteed bandwidth                                                │
│   ❌ Wasteful, doesn't scale                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│               PACKET SWITCHING (The Internet)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   A ──[pkt1]──►┌─────┐──[pkt1]──►┌─────┐──[pkt1]──► B                   │
│   A ──[pkt2]──►│ R1  │──[pkt2]──►│ R2  │──[pkt2]──► B                   │
│   A ──[pkt3]──►└─────┘──[pkt3]──►└─────┘──[pkt3]──► B                   │
│                                                                          │
│   Data split into packets, each routed independently                     │
│   Packets may take different paths, arrive out of order                  │
│                                                                          │
│   ✅ Efficient sharing of network resources                              │
│   ✅ Resilient to failures (packets reroute)                             │
│   ❌ No guaranteed delivery/timing (best effort)                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Client-Server vs Peer-to-Peer

### Client-Server Model

```
                    ┌─────────────────┐
                    │     SERVER      │
                    │  Always on      │
                    │  Fixed address  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │ Client  │         │ Client  │         │ Client  │
    │   A     │         │   B     │         │   C     │
    └─────────┘         └─────────┘         └─────────┘

    - Server has permanent IP, clients initiate connections
    - Clients don't communicate directly with each other
    - Examples: Web, Email, APIs
```

### Peer-to-Peer Model

```
    ┌─────────┐◄────────►┌─────────┐
    │  Peer   │          │  Peer   │
    │   A     │◄──┐  ┌──►│   B     │
    └─────────┘   │  │   └─────────┘
         ▲        │  │        ▲
         │        │  │        │
         └────────┼──┼────────┘
                  │  │
              ┌───┴──┴───┐
              │   Peer   │
              │    C     │
              └──────────┘

    - All nodes are equal, can be client and server
    - No central server required
    - Examples: BitTorrent, IPFS, WebRTC
```

---

## IP Addresses and Ports

### IP Address
A unique identifier for a device on a network.

```
IPv4: 192.168.1.100        (32 bits, ~4 billion addresses)
IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334 (128 bits, virtually unlimited)
```

### Ports
A number (0-65535) identifying a specific service on a host.

```
┌────────────────────────────────────────────────────────────┐
│  IP Address = Street Address (which building)              │
│  Port       = Apartment Number (which service inside)      │
└────────────────────────────────────────────────────────────┘

Common Well-Known Ports:
┌────────┬────────────┬────────────────────────────────────┐
│  Port  │  Protocol  │  Description                       │
├────────┼────────────┼────────────────────────────────────┤
│   20   │  FTP-Data  │  File transfer data                │
│   21   │  FTP       │  File transfer control             │
│   22   │  SSH       │  Secure shell                      │
│   25   │  SMTP      │  Email sending                     │
│   53   │  DNS       │  Domain name resolution            │
│   80   │  HTTP      │  Web traffic                       │
│  443   │  HTTPS     │  Secure web traffic                │
│ 3306   │  MySQL     │  MySQL database                    │
│ 5432   │  PostgreSQL│  PostgreSQL database               │
│ 6379   │  Redis     │  Redis cache                       │
└────────┴────────────┴────────────────────────────────────┘
```

### Socket = IP + Port

```
Socket: 192.168.1.100:8080
        └─ IP ─────┘ └─ Port

A connection is uniquely identified by:
(Source IP, Source Port, Dest IP, Dest Port, Protocol)
```

---

## Latency and Bandwidth

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LATENCY vs BANDWIDTH                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LATENCY: How long until first byte arrives (delay)                      │
│  ─────────────────────────────────────────────────────────────────────  │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  0ms                                              100ms                  │
│           └── "Time to first byte" ──┘                                  │
│                                                                          │
│  BANDWIDTH: How many bytes per second (throughput)                       │
│  ─────────────────────────────────────────────────────────────────────  │
│  │████████████████████████████████████████│  100 Mbps                   │
│  │████████████│                             25 Mbps                     │
│           └── "Data transfer rate" ──┘                                  │
│                                                                          │
│  Analogy:                                                                │
│  - Latency = How long until water starts flowing from the tap           │
│  - Bandwidth = How much water flows per second once it starts           │
│                                                                          │
│  Types of Latency:                                                       │
│  - Propagation: Distance / Speed of light (~5ms per 1000km)             │
│  - Transmission: Packet size / Bandwidth                                 │
│  - Processing: Router/switch processing time                             │
│  - Queuing: Wait time in router buffers                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**RTT (Round-Trip Time)**: Time for packet to go and response to come back.
```bash
# Measure RTT with ping
$ ping google.com
64 bytes from 142.250.80.46: icmp_seq=1 ttl=117 time=14.3 ms
                                                    └── RTT
```

---

## Standards Organizations

| Organization | Full Name | What They Standardize |
|--------------|-----------|----------------------|
| **IETF** | Internet Engineering Task Force | TCP/IP, HTTP, DNS (via RFCs) |
| **IEEE** | Institute of Electrical and Electronics Engineers | Ethernet (802.3), WiFi (802.11) |
| **W3C** | World Wide Web Consortium | HTML, CSS, WebSocket |
| **ICANN** | Internet Corporation for Assigned Names and Numbers | Domain names, IP allocation |

**RFC (Request for Comments)**: The specification documents for Internet protocols.
- RFC 791: IP
- RFC 793: TCP
- RFC 2616: HTTP/1.1
- RFC 7540: HTTP/2

---

## Exercises

### Exercise 1: Trace a Packet's Journey 🟢

**Scenario:** You make an API request from your laptop to `api.github.com`. List the steps and protocols involved.

<details>
<summary>💡 Hints</summary>

- Think about each layer: Application, Transport, Network, Link
- What happens before the HTTP request can even be sent?
- How does your laptop know where `api.github.com` is?

</details>

<details>
<summary>✅ Solution</summary>

**Step-by-step journey:**

1. **DNS Resolution (Application Layer - DNS/UDP)**
   - Browser/app queries DNS for `api.github.com`
   - DNS resolver returns IP: `140.82.113.6`

2. **TCP Connection (Transport Layer - TCP)**
   - 3-way handshake: SYN → SYN-ACK → ACK
   - Establishes reliable connection to port 443

3. **TLS Handshake (Application Layer - TLS)**
   - Client Hello → Server Hello
   - Certificate exchange, key negotiation
   - Encrypted channel established

4. **HTTP Request (Application Layer - HTTP)**
   ```
   GET /users/octocat HTTP/2
   Host: api.github.com
   Authorization: Bearer xxx
   ```

5. **IP Routing (Network Layer - IP)**
   - Packet addressed to 140.82.113.6
   - Routers forward based on destination IP

6. **Link Layer (Ethernet/WiFi)**
   - Frames sent to next hop (your router's MAC address)
   - Then to ISP, through Internet, to GitHub's datacenter

7. **Response returns** through same layers in reverse

</details>

---

### Exercise 2: Port Investigation 🟡

**Scenario:** Run these commands and explain what you see:

```bash
# Linux/Mac
netstat -tuln | head -20
# or
ss -tuln

# Windows
netstat -an | findstr LISTENING
```

<details>
<summary>💡 Hints</summary>

- `t` = TCP, `u` = UDP, `l` = listening, `n` = numeric (don't resolve names)
- Look for common ports: 22, 80, 443, 3306, 5432
- What does `0.0.0.0` vs `127.0.0.1` mean?

</details>

<details>
<summary>✅ Solution</summary>

**Sample output explained:**

```
Proto  Local Address          State
tcp    0.0.0.0:22             LISTEN    # SSH - accepts connections from any IP
tcp    127.0.0.1:5432         LISTEN    # PostgreSQL - only localhost
tcp    0.0.0.0:80             LISTEN    # HTTP - accepts from any IP
tcp    0.0.0.0:443            LISTEN    # HTTPS - accepts from any IP
udp    0.0.0.0:53             LISTEN    # DNS server
```

**Key observations:**
- `0.0.0.0:port` - Listening on all network interfaces (accessible externally)
- `127.0.0.1:port` - Listening only on localhost (local access only)
- `:::port` - Same as 0.0.0.0 but for IPv6
- Services like databases often bind to 127.0.0.1 for security

</details>

---

### Exercise 3: Latency Analysis 🔴

**Scenario:** Your users in Australia complain your US-based API is slow. Calculate the minimum possible latency and suggest improvements.

Given:
- Distance: ~15,000 km
- Speed of light in fiber: ~200,000 km/s
- Current response time: 350ms

<details>
<summary>💡 Hints</summary>

- Calculate propagation delay (one way and round trip)
- What makes up the remaining latency?
- Think about caching, CDNs, edge computing

</details>

<details>
<summary>✅ Solution</summary>

**Latency calculation:**

```
Propagation delay (one way) = Distance / Speed
                            = 15,000 km / 200,000 km/s
                            = 75 ms

Round-trip propagation = 75 ms × 2 = 150 ms (theoretical minimum)

Current RTT: 350 ms
Extra latency: 350 - 150 = 200 ms

That 200ms comes from:
- Multiple router hops (processing + queuing)
- TCP handshake (1 RTT = 150ms)
- TLS handshake (1-2 RTT = 150-300ms for new connections)
- Server processing time
- Serialization/transmission delays
```

**Improvements:**

1. **CDN / Edge Servers**
   - Deploy API servers in Australian region
   - Reduces propagation delay to ~10-20ms

2. **Connection Reuse**
   - HTTP/2 multiplexing (one connection, many requests)
   - Keep-alive connections (skip TCP/TLS handshake)

3. **Caching**
   - CDN caching for cacheable responses
   - Redis/Memcached for hot data

4. **Protocol Optimization**
   - HTTP/3 (QUIC) - 0-RTT connection establishment
   - TLS 1.3 - Faster handshake

5. **Reduce Payload**
   - Compression (gzip, brotli)
   - GraphQL to fetch only needed fields

</details>

---

## Key Takeaways

- 🌐 **Internet = Network of Networks**: Connected via ISPs, IXPs, and backbone providers
- 📦 **Packet Switching**: Data split into packets, routed independently, best-effort delivery
- 🧅 **Protocol Layering**: Each layer adds headers, creating nested encapsulation
- 🔌 **Socket = IP + Port**: Uniquely identifies a service endpoint
- ⏱️ **Latency vs Bandwidth**: Delay vs throughput—both matter for performance
- 📋 **Standards (RFCs)**: Protocols are formally specified for interoperability

---

## Related Topics

- [HTTP & HTTPS](/networking/02-http-and-https.md) - Application layer protocol deep dive
- [TCP & UDP](/networking/04-tcp-and-udp.md) - Transport layer details
- [DNS](/networking/03-dns.md) - How names become IP addresses
