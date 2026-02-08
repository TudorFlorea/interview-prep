# DNS (Domain Name System)

[← Back to Index](/networking/00-index.md)

---

## Overview

DNS translates human-readable domain names (like `api.github.com`) into IP addresses (like `140.82.121.6`). It's the Internet's phone book—and understanding it is crucial for debugging connectivity issues and designing resilient systems.

### When This Matters Most
- Debugging "host not found" errors
- Setting up custom domains
- Configuring CDNs and load balancers
- Understanding propagation delays

---

## How DNS Resolution Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DNS RESOLUTION PROCESS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   You type: www.example.com                                              │
│                                                                          │
│   Step 1: Browser Cache                                                  │
│   ┌──────────┐                                                          │
│   │ Browser  │──► Check local cache ──► Found? Return IP                │
│   └──────────┘                                                          │
│        │ Not found                                                       │
│        ▼                                                                 │
│   Step 2: OS Cache                                                       │
│   ┌──────────┐                                                          │
│   │    OS    │──► Check /etc/hosts, OS DNS cache                        │
│   └──────────┘                                                          │
│        │ Not found                                                       │
│        ▼                                                                 │
│   Step 3: Recursive Resolver (Your ISP or 8.8.8.8)                      │
│   ┌──────────┐                                                          │
│   │ Resolver │──► Check resolver cache                                  │
│   └──────────┘                                                          │
│        │ Not found - Start recursive lookup                              │
│        ▼                                                                 │
│   Step 4: Root Nameserver                                                │
│   ┌──────────┐                                                          │
│   │   Root   │──► "For .com, ask these TLD servers"                     │
│   └──────────┘    (Returns NS records for .com)                         │
│        │                                                                 │
│        ▼                                                                 │
│   Step 5: TLD Nameserver (.com)                                          │
│   ┌──────────┐                                                          │
│   │   .com   │──► "For example.com, ask these nameservers"              │
│   └──────────┘    (Returns NS records for example.com)                  │
│        │                                                                 │
│        ▼                                                                 │
│   Step 6: Authoritative Nameserver                                       │
│   ┌──────────┐                                                          │
│   │example's │──► "www.example.com = 93.184.216.34"                     │
│   │   NS     │    (Returns A record with IP)                            │
│   └──────────┘                                                          │
│        │                                                                 │
│        ▼                                                                 │
│   Result cached at each level with TTL                                   │
│   Browser connects to 93.184.216.34                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## DNS Hierarchy

```
                           ┌─────────────┐
                           │    Root     │
                           │     .       │
                           └──────┬──────┘
                                  │
        ┌─────────────┬───────────┼───────────┬─────────────┐
        │             │           │           │             │
   ┌────┴────┐  ┌─────┴────┐ ┌────┴────┐ ┌────┴────┐  ┌─────┴────┐
   │  .com   │  │   .org   │ │  .net   │ │  .io    │  │  .dev    │
   │  TLD    │  │   TLD    │ │  TLD    │ │  TLD    │  │  TLD     │
   └────┬────┘  └──────────┘ └─────────┘ └─────────┘  └──────────┘
        │
   ┌────┴────────────────────────────┐
   │                                 │
┌──┴──────────┐              ┌───────┴──────┐
│example.com  │              │ github.com   │
│Authoritative│              │ Authoritative│
└──────┬──────┘              └──────────────┘
       │
  ┌────┴───────────────┐
  │                    │
┌─┴───┐           ┌────┴───┐
│ www │           │  api   │
│     │           │        │
└─────┘           └────────┘

www.example.com    api.example.com
```

**Root Servers**: 13 logical root servers (a.root-servers.net through m.root-servers.net), actually hundreds of physical servers via anycast.

---

## DNS Record Types

| Type | Purpose | Example |
|------|---------|---------|
| **A** | IPv4 address | `example.com. 300 IN A 93.184.216.34` |
| **AAAA** | IPv6 address | `example.com. 300 IN AAAA 2606:2800:220:1::` |
| **CNAME** | Canonical name (alias) | `www.example.com. 300 IN CNAME example.com.` |
| **MX** | Mail exchange | `example.com. 300 IN MX 10 mail.example.com.` |
| **TXT** | Text data (SPF, verification) | `example.com. 300 IN TXT "v=spf1 include:_spf.google.com ~all"` |
| **NS** | Nameserver | `example.com. 86400 IN NS ns1.example.com.` |
| **SOA** | Start of authority | Zone metadata, refresh intervals |
| **SRV** | Service location | `_http._tcp.example.com. 300 IN SRV 10 5 80 www.example.com.` |
| **CAA** | Certificate Authority Authorization | `example.com. 300 IN CAA 0 issue "letsencrypt.org"` |
| **PTR** | Reverse DNS (IP → name) | `34.216.184.93.in-addr.arpa. 300 IN PTR example.com.` |

### Record Anatomy

```
example.com.    300    IN    A    93.184.216.34
└── Name ──┘    └TTL┘  └Class └Type  └── Value ──┘

TTL (Time To Live): How long to cache (seconds)
Class: IN = Internet (almost always)
```

---

## Common DNS Patterns

### CNAME for Subdomains

```
┌─────────────────────────────────────────────────────────────────┐
│  CNAME chains - Useful for CDNs and cloud services              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  www.example.com    CNAME   example.com                          │
│  example.com        A       93.184.216.34                        │
│                                                                  │
│  OR with CDN:                                                    │
│                                                                  │
│  www.example.com    CNAME   example.com.cdn.cloudflare.net      │
│  example.com.cdn... A       104.21.234.56                        │
│                                                                  │
│  ⚠️  CNAME at apex (example.com) not allowed!                    │
│      Use ALIAS/ANAME (provider-specific) or A record            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Multiple A Records (Round-Robin DNS)

```
api.example.com    A    10.0.0.1
api.example.com    A    10.0.0.2
api.example.com    A    10.0.0.3

Each DNS query returns all IPs in rotating order
Basic load distribution (not true load balancing)
```

### GeoDNS

```
┌─────────────────────────────────────────────────────────────────┐
│  Query from US:    api.example.com → 10.0.1.1 (US server)       │
│  Query from EU:    api.example.com → 10.0.2.1 (EU server)       │
│  Query from Asia:  api.example.com → 10.0.3.1 (Asia server)     │
│                                                                  │
│  Based on resolver's IP location                                 │
│  Used by CDNs and global services                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## TTL and Propagation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TTL CONSIDERATIONS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Short TTL (60-300 seconds):                                             │
│  ├── ✅ Fast propagation of changes                                      │
│  ├── ✅ Quick failover                                                   │
│  ├── ❌ More DNS queries (higher load)                                   │
│  └── ❌ Slightly higher latency (more lookups)                           │
│                                                                          │
│  Long TTL (3600-86400 seconds):                                          │
│  ├── ✅ Fewer DNS queries                                                │
│  ├── ✅ Better performance (cached)                                      │
│  ├── ❌ Slow propagation of changes                                      │
│  └── ❌ Harder to recover from misconfigurations                         │
│                                                                          │
│  Best Practices:                                                         │
│  ├── Normal operations: 300-3600 seconds                                 │
│  ├── Before migration: Lower TTL days in advance                         │
│  ├── During migration: Keep low until stable                             │
│  └── After migration: Raise back to normal                               │
│                                                                          │
│  "Propagation" is really just waiting for caches to expire               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## DNS Tools

### dig (Linux/Mac)

```bash
# Basic query
$ dig example.com

# Query specific record type
$ dig example.com A
$ dig example.com MX
$ dig example.com TXT

# Query specific nameserver
$ dig @8.8.8.8 example.com

# Short output
$ dig +short example.com
93.184.216.34

# Trace full resolution path
$ dig +trace example.com

# Reverse lookup
$ dig -x 93.184.216.34
```

### nslookup (Windows/Cross-platform)

```powershell
# Basic query
> nslookup example.com

# Query specific type
> nslookup -type=MX example.com

# Use specific DNS server
> nslookup example.com 8.8.8.8

# Interactive mode
> nslookup
> set type=A
> example.com
```

### host (Linux/Mac - simple)

```bash
$ host example.com
example.com has address 93.184.216.34

$ host -t MX example.com
example.com mail is handled by 0 .
```

---

## DNS Security

### Common Attacks

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DNS SECURITY THREATS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  DNS Cache Poisoning:                                                    │
│  ┌────────┐      Fake response     ┌──────────┐                         │
│  │Attacker│ ─────────────────────► │ Resolver │                         │
│  └────────┘  "example.com=6.6.6.6" └──────────┘                         │
│                                         │                                │
│  Resolver caches bad IP, serves to all users                            │
│                                                                          │
│  DNS Spoofing:                                                           │
│  Attacker intercepts DNS query and returns fake response                │
│                                                                          │
│  DDoS via DNS Amplification:                                             │
│  Attacker sends queries with spoofed source IP                          │
│  Large responses flood the victim                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### DNSSEC (DNS Security Extensions)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            DNSSEC                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Adds cryptographic signatures to DNS records                            │
│                                                                          │
│  Chain of Trust:                                                         │
│  ┌──────┐     ┌──────┐     ┌───────────┐     ┌──────────────┐          │
│  │ Root │────►│ .com │────►│example.com│────►│ DNS Record   │          │
│  │ Key  │     │ Key  │     │   Key     │     │ + Signature  │          │
│  └──────┘     └──────┘     └───────────┘     └──────────────┘          │
│                                                                          │
│  Each level signs the keys of the level below                           │
│  Resolver validates signatures up the chain                             │
│                                                                          │
│  Check DNSSEC:                                                           │
│  $ dig +dnssec example.com                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### DNS over HTTPS (DoH) / DNS over TLS (DoT)

```
Traditional DNS:  UDP port 53, plaintext, no privacy
DNS over TLS:     TCP port 853, encrypted
DNS over HTTPS:   HTTPS on port 443, encrypted, bypasses blocks

Providers:
- Cloudflare: 1.1.1.1 (DoH: https://cloudflare-dns.com/dns-query)
- Google: 8.8.8.8 (DoH: https://dns.google/dns-query)
- Quad9: 9.9.9.9 (DoH: https://dns.quad9.net/dns-query)
```

---

## DNS for Backend Developers

### Service Discovery

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DNS-BASED SERVICE DISCOVERY                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Internal DNS for microservices:                                         │
│                                                                          │
│  user-service.internal.company.com     → 10.0.1.10                      │
│  payment-service.internal.company.com  → 10.0.2.20                      │
│  database.internal.company.com         → 10.0.3.30                      │
│                                                                          │
│  Kubernetes DNS:                                                         │
│  &lt;service>.&lt;namespace>.svc.cluster.local                                │
│                                                                          │
│  my-api.default.svc.cluster.local      → ClusterIP                      │
│  postgres.database.svc.cluster.local   → ClusterIP                      │
│                                                                          │
│  SRV records for port discovery:                                         │
│  _http._tcp.my-api.default.svc.cluster.local SRV 0 100 8080 my-api...  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Health Checks and Failover

```
┌────────────────────────────────────────────────────────────────┐
│  DNS-based failover with health checks                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Route 53 / Cloud DNS health checks:                           │
│                                                                 │
│  api.example.com ──┬── Primary: 10.0.0.1 (healthy)   ✅        │
│                    └── Secondary: 10.0.0.2 (standby)           │
│                                                                 │
│  If primary fails health check:                                 │
│                                                                 │
│  api.example.com ──┬── Primary: 10.0.0.1 (unhealthy) ❌        │
│                    └── Secondary: 10.0.0.2 (active)  ✅        │
│                                                                 │
│  Automatic failover based on health checks                      │
│  TTL determines failover speed                                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Exercises

### Exercise 1: DNS Lookup 🟢

**Scenario:** Investigate the DNS configuration for `github.com`:
1. Find all A records
2. Find the mail servers (MX records)
3. Find any TXT records (often contain SPF, verification)

<details>
<summary>💡 Hints</summary>

- Use `dig` or `nslookup` with different record types
- MX records show mail server priority (lower = higher priority)
- TXT records often contain email security info

</details>

<details>
<summary>✅ Solution</summary>

```bash
# A records
$ dig github.com A +short
140.82.121.3

# MX records
$ dig github.com MX +short
10 alt1.aspmx.l.google.com.
10 alt2.aspmx.l.google.com.
5 alt3.aspmx.l.google.com.
5 alt4.aspmx.l.google.com.
1 aspmx.l.google.com.
# Priority 1 is primary mail server (Google)

# TXT records
$ dig github.com TXT +short
"v=spf1 ip4:192.30.252.0/22 include:_netblocks.google.com ..."
"MS=ms58704441"
"docusign=..."
# SPF record, Microsoft verification, DocuSign verification

# All records summary
$ dig github.com ANY +short
# May not work (many servers disable ANY queries)
```

**On Windows:**
```powershell
nslookup -type=A github.com
nslookup -type=MX github.com
nslookup -type=TXT github.com
```

</details>

---

### Exercise 2: TTL Migration Strategy 🟡

**Scenario:** You're migrating `api.example.com` from old server (10.0.0.1) to new server (10.0.1.1). Current TTL is 3600 seconds (1 hour).

Design a migration plan to minimize downtime and ensure smooth transition.

<details>
<summary>💡 Hints</summary>

- Consider when to lower TTL (before migration)
- Think about running both servers in parallel
- How long to wait before raising TTL again?

</details>

<details>
<summary>✅ Solution</summary>

**Migration Timeline:**

```
Day -3 (72 hours before):
┌───────────────────────────────────────────────────────────────┐
│ Lower TTL from 3600 to 300 seconds                            │
│ api.example.com  300  A  10.0.0.1                             │
│                                                                │
│ Wait for old TTL to expire (up to 1 hour for all caches)      │
│ Now all clients will refresh every 5 minutes                  │
└───────────────────────────────────────────────────────────────┘

Day 0 (Migration):
┌───────────────────────────────────────────────────────────────┐
│ 1. Deploy and test new server (10.0.1.1)                      │
│ 2. Run both servers in parallel                               │
│ 3. Update DNS:                                                │
│    api.example.com  300  A  10.0.1.1                          │
│                                                                │
│ Within 5 minutes, all traffic shifts to new server            │
│ Old server still running as fallback                          │
└───────────────────────────────────────────────────────────────┘

Day 0 + 1 hour (Validation):
┌───────────────────────────────────────────────────────────────┐
│ Monitor new server for errors                                 │
│ Check logs on old server - should show no traffic             │
│ If issues: can quickly revert DNS                             │
└───────────────────────────────────────────────────────────────┘

Day +1 (Stabilization):
┌───────────────────────────────────────────────────────────────┐
│ Increase TTL back to normal:                                  │
│ api.example.com  3600  A  10.0.1.1                            │
│                                                                │
│ Decommission old server after 24-48 hours                     │
└───────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Lower TTL **before** migration to ensure fast propagation
- Keep old server running during transition for quick rollback
- Monitor both servers during cutover
- Only raise TTL after confirming stability

</details>

---

### Exercise 3: Debug DNS Resolution Failure 🔴

**Scenario:** Your application can't resolve `api.internal.company.com`. Users report "host not found" errors intermittently.

Debug systematically using DNS tools.

<details>
<summary>💡 Hints</summary>

- Check from different locations (local machine, server, container)
- Compare with known-good DNS servers (8.8.8.8)
- Look at TTL - could be caching issue
- Check if it's internal-only DNS

</details>

<details>
<summary>✅ Solution</summary>

**Systematic Debugging:**

```bash
# 1. Basic resolution test
$ dig api.internal.company.com
;; Got answer:
;; ->>HEADER&lt;&lt;- opcode: QUERY, status: NXDOMAIN
# NXDOMAIN = domain doesn't exist (in this DNS server's view)

# 2. Check what DNS server you're using
$ cat /etc/resolv.conf
nameserver 192.168.1.1  # Local router
nameserver 8.8.8.8      # Google

# 3. Try internal DNS server directly
$ dig @10.0.0.53 api.internal.company.com
;; Got answer:
;; ->>HEADER&lt;&lt;- opcode: QUERY, status: NOERROR
api.internal.company.com. 300 IN A 10.0.5.100
# Works with internal DNS!

# 4. The issue: Your machine uses wrong DNS for internal domains
# Fix Option 1: Add internal DNS server to resolv.conf
# Fix Option 2: Configure split DNS (internal domains use internal DNS)

# 5. Check for caching issues
$ dig api.internal.company.com +trace
# Shows full resolution path, identifies where it fails

# 6. Check from container (might have different DNS)
$ docker run --rm alpine nslookup api.internal.company.com
# Containers often have different DNS config

# 7. Test intermittent issues - multiple queries
$ for i in {1..10}; do dig +short api.internal.company.com; sleep 1; done
# If results vary, might be round-robin or caching issue
```

**Common Causes of Intermittent DNS Failures:**

1. **Split DNS misconfiguration**: Internal names not routing to internal DNS
2. **DNS server overload**: Timeouts under load
3. **TTL expiration**: Negative caching (NXDOMAIN cached)
4. **Container DNS**: Different resolv.conf in containers
5. **VPN issues**: DNS routing changes when VPN connects/disconnects

**Kubernetes-specific:**
```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Test from within a pod
kubectl run -it --rm debug --image=alpine -- nslookup kubernetes.default
```

</details>

---

### 🐳 Docker Lab: Run Your Own DNS Server (Optional)

<details>
<summary>Click to expand Docker lab</summary>

**Set up a local DNS server with custom records:**

```bash
# Create dnsmasq configuration
mkdir -p dns-lab && cd dns-lab

cat > dnsmasq.conf &lt;&lt; 'EOF'
# Don't use /etc/resolv.conf
no-resolv

# Upstream DNS servers
server=8.8.8.8
server=8.8.4.4

# Custom local records
address=/myapp.local/192.168.1.100
address=/api.myapp.local/192.168.1.101
address=/db.myapp.local/192.168.1.102

# Log queries for learning
log-queries

# Listen on all interfaces
listen-address=0.0.0.0
EOF

# Run dnsmasq in Docker
docker run -d \
  --name local-dns \
  -p 5353:53/udp \
  -p 5353:53/tcp \
  -v $(pwd)/dnsmasq.conf:/etc/dnsmasq.conf \
  --cap-add=NET_ADMIN \
  andyshinn/dnsmasq -C /etc/dnsmasq.conf

# Test custom resolution
dig @localhost -p 5353 myapp.local
# Should return 192.168.1.100

dig @localhost -p 5353 api.myapp.local
# Should return 192.168.1.101

# Watch query logs
docker logs -f local-dns

# Clean up
docker stop local-dns && docker rm local-dns
```

**Learning outcomes:**
- Understand how DNS servers resolve queries
- See query logging in action
- Practice adding custom DNS records

</details>

---

## Key Takeaways

- 📖 **DNS is the Internet's phonebook**: Translates names to IP addresses
- 🔄 **Hierarchical resolution**: Root → TLD → Authoritative nameserver
- ⏱️ **TTL controls caching**: Lower for changes, higher for performance
- 📝 **Record types matter**: A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail)
- 🔒 **DNS security**: DNSSEC for integrity, DoH/DoT for privacy
- 🔧 **Debugging tools**: `dig`, `nslookup`, `host` are essential

---

## Related Topics

- [Internet & Protocols](/networking/01-internet-and-protocols.md) - How DNS fits in the stack
- [Load Balancing](/networking/08-load-balancing.md) - DNS-based load balancing
- Cloud Networking - Cloud DNS services
