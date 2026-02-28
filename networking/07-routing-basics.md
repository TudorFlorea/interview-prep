# Routing Basics

[← Back to Index](/networking/00-index.md)

---

## Overview

Routing is the process of selecting paths for network traffic. Understanding how routers make decisions helps you design networks, troubleshoot connectivity, and configure cloud infrastructure effectively.

### When This Matters Most
- Debugging "no route to host" errors
- Configuring VPC route tables
- Understanding multi-region architectures
- Setting up VPNs and hybrid cloud

---

## How Routing Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ROUTING DECISION PROCESS                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Packet arrives with destination: 10.0.2.100                           │
│                                                                          │
│   Router checks routing table:                                           │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Destination      Gateway        Interface    Metric            │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ 10.0.1.0/24      0.0.0.0        eth0         0     (directly   │   │
│   │                                               connected)       │   │
│   │ 10.0.2.0/24      10.0.1.1       eth0         0     ← MATCH!   │   │
│   │ 10.0.3.0/24      10.0.1.2       eth0         0                 │   │
│   │ 0.0.0.0/0        10.0.1.254     eth0         100   (default)   │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Process:                                                               │
│   1. Find all matching routes (destination contains target IP)          │
│   2. Select most specific match (longest prefix)                        │
│   3. If tie, use lowest metric                                          │
│   4. Forward packet to gateway via interface                            │
│                                                                          │
│   Result: Send to 10.0.1.1 via eth0                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Routing Table Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ROUTING TABLE ANATOMY                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   DESTINATION (Network/Prefix)                                           │
│   └── Target network in CIDR notation                                   │
│       Examples: 10.0.0.0/8, 192.168.1.0/24, 0.0.0.0/0                   │
│                                                                          │
│   GATEWAY (Next Hop)                                                     │
│   └── IP address to forward packets to                                  │
│       0.0.0.0 or "on-link" = directly connected                         │
│                                                                          │
│   INTERFACE                                                              │
│   └── Network interface to use (eth0, ens5, etc.)                       │
│                                                                          │
│   METRIC (Cost/Priority)                                                 │
│   └── Lower is preferred; used to choose between equal routes          │
│                                                                          │
│   FLAGS (Linux specific)                                                 │
│   └── U=Up, G=Gateway, H=Host, D=Dynamic                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Viewing and Configuring Routes

### Linux

```bash
# View routing table
ip route show
# or older command
route -n
netstat -rn

# Example output:
default via 10.0.0.1 dev eth0 proto dhcp metric 100
10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.50
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1

# Add a route
sudo ip route add 192.168.100.0/24 via 10.0.0.254 dev eth0

# Delete a route
sudo ip route del 192.168.100.0/24

# Add default gateway
sudo ip route add default via 10.0.0.1

# View route for specific destination
ip route get 8.8.8.8
```

### Windows

```powershell
# View routing table
route print
netstat -rn

# Add a route
route add 192.168.100.0 mask 255.255.255.0 10.0.0.254

# Delete a route
route delete 192.168.100.0

# Add persistent route (survives reboot)
route -p add 192.168.100.0 mask 255.255.255.0 10.0.0.254
```

---

## Default Gateway

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEFAULT GATEWAY                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   The default gateway is the "catch-all" route (0.0.0.0/0)              │
│   Used when no other route matches                                       │
│                                                                          │
│   ┌──────────────────┐                                                  │
│   │   Your Computer  │                                                  │
│   │   10.0.0.50      │                                                  │
│   └────────┬─────────┘                                                  │
│            │                                                             │
│            │ Destination: 142.250.80.46 (google.com)                    │
│            │                                                             │
│            │ Route table check:                                          │
│            │ - 10.0.0.0/24? No match                                    │
│            │ - 0.0.0.0/0? Match! → Use default gateway                  │
│            │                                                             │
│            ▼                                                             │
│   ┌──────────────────┐                                                  │
│   │  Default Gateway │                                                  │
│   │     (Router)     │                                                  │
│   │    10.0.0.1      │────────────► Internet                            │
│   └──────────────────┘                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Longest Prefix Match

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LONGEST PREFIX MATCH RULE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Destination: 10.0.1.50                                                 │
│                                                                          │
│   Routing Table:                                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 10.0.0.0/8       via 10.0.0.1    ← Matches (8 bits)            │   │
│   │ 10.0.0.0/16      via 10.0.0.2    ← Matches (16 bits)           │   │
│   │ 10.0.1.0/24      via 10.0.0.3    ← Matches (24 bits) WINNER!   │   │
│   │ 0.0.0.0/0        via 10.0.0.254  ← Matches (0 bits)            │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Most specific (longest prefix) wins: /24 > /16 > /8 > /0             │
│                                                                          │
│   This allows:                                                           │
│   - General routes for large networks                                    │
│   - Specific routes for exceptions                                       │
│   - Default route as last resort                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Static vs Dynamic Routing

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STATIC vs DYNAMIC ROUTING                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   STATIC ROUTING                                                         │
│   ├── Manually configured routes                                         │
│   ├── Simple, predictable                                                │
│   ├── Doesn't adapt to failures                                          │
│   └── Good for: Small networks, specific paths                          │
│                                                                          │
│   Example: ip route add 10.0.2.0/24 via 10.0.1.1                        │
│                                                                          │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                          │
│   DYNAMIC ROUTING                                                        │
│   ├── Routes learned automatically via protocols                        │
│   ├── Adapts to network changes                                          │
│   ├── More complex, requires protocol                                    │
│   └── Good for: Large networks, redundancy                              │
│                                                                          │
│   Protocols:                                                             │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ IGP (Interior Gateway Protocols) - Within an organization        │  │
│   │ ├── RIP  - Simple, distance-vector, max 15 hops                  │  │
│   │ ├── OSPF - Link-state, scales well, common in enterprises       │  │
│   │ └── EIGRP - Cisco proprietary, hybrid                            │  │
│   │                                                                   │  │
│   │ EGP (Exterior Gateway Protocols) - Between organizations         │  │
│   │ └── BGP - The Internet's routing protocol                        │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## BGP: The Internet's Routing Protocol

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BGP (Border Gateway Protocol)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   BGP connects autonomous systems (AS) - independent networks           │
│                                                                          │
│   ┌───────────────┐         ┌───────────────┐         ┌───────────────┐│
│   │    AS 64500   │         │    AS 64501   │         │    AS 64502   ││
│   │   (Your ISP)  │◄──BGP──►│  (Transit)    │◄──BGP──►│   (Google)    ││
│   │               │         │               │         │               ││
│   └───────────────┘         └───────────────┘         └───────────────┘│
│                                                                          │
│   BGP advertises: "I can reach 142.250.0.0/16 (Google's IPs)"           │
│   Other ASes learn paths to reach any network                           │
│                                                                          │
│   Key concepts:                                                          │
│   - AS Number: Unique identifier (e.g., AS15169 = Google)              │
│   - Peering: Direct BGP connection between ASes                        │
│   - Transit: Paying another AS to reach the Internet                   │
│   - Prefix: Network range advertised (e.g., 8.8.8.0/24)               │
│                                                                          │
│   Cloud relevance:                                                       │
│   - AWS/Azure/GCP have their own AS numbers                             │
│   - Direct Connect / ExpressRoute use BGP                               │
│   - Understanding BGP helps debug cloud connectivity                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Cloud Route Tables (AWS Example)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       AWS VPC ROUTE TABLE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Public Subnet Route Table:                                             │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Destination      Target                                        │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ 10.0.0.0/16      local          (VPC internal)                 │   │
│   │ 0.0.0.0/0        igw-123abc     (Internet Gateway)             │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Private Subnet Route Table:                                            │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Destination      Target                                        │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ 10.0.0.0/16      local          (VPC internal)                 │   │
│   │ 0.0.0.0/0        nat-456def     (NAT Gateway - for outbound)   │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   VPN/DirectConnect Route Table:                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Destination      Target                                        │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ 10.0.0.0/16      local          (VPC internal)                 │   │
│   │ 192.168.0.0/16   vgw-789ghi     (On-prem via VPN)              │   │
│   │ 0.0.0.0/0        igw-123abc     (Internet Gateway)             │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Key targets:                                                           │
│   - local: VPC internal routing (automatic)                             │
│   - igw-*: Internet Gateway (public access)                             │
│   - nat-*: NAT Gateway (private subnet outbound)                        │
│   - vgw-*: Virtual Private Gateway (VPN)                                │
│   - pcx-*: VPC Peering Connection                                       │
│   - tgw-*: Transit Gateway                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Traceroute: Following the Path

```bash
# Linux/Mac
traceroute google.com

# Windows
tracert google.com

# Example output:
$ traceroute 8.8.8.8
 1  10.0.0.1 (10.0.0.1)  1.234 ms    # Your router
 2  192.168.1.1 (192.168.1.1)  5.678 ms    # ISP first hop
 3  10.255.255.1 (10.255.255.1)  10.123 ms  # ISP internal
 4  72.14.215.85 (72.14.215.85)  15.456 ms  # ISP edge
 5  108.170.252.129 (108.170.252.129)  20.789 ms  # Google edge
 6  8.8.8.8 (8.8.8.8)  21.012 ms    # Destination

# How it works:
# Sends packets with TTL=1, 2, 3, etc.
# Each router decrements TTL, sends ICMP Time Exceeded when TTL=0
# This reveals each hop along the path
```

---

## Common Routing Issues

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMMON ROUTING PROBLEMS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. No route to host                                                    │
│      Symptom: "Network is unreachable"                                  │
│      Causes:                                                             │
│      - Missing route in routing table                                   │
│      - No default gateway configured                                     │
│      Fix: Add appropriate route                                          │
│                                                                          │
│   2. Asymmetric routing                                                  │
│      Symptom: Packets take different paths out and back                 │
│      Causes:                                                             │
│      - Multiple paths with different costs                              │
│      - Firewalls may drop unexpected return traffic                     │
│      Fix: Ensure symmetric routes or stateful firewalls                 │
│                                                                          │
│   3. Routing loops                                                       │
│      Symptom: TTL exceeded, packets never arrive                        │
│      Causes:                                                             │
│      - Misconfigured routes pointing at each other                      │
│      Fix: Check routes, use traceroute to detect loop                   │
│                                                                          │
│   4. Black hole                                                          │
│      Symptom: Packets disappear silently                                │
│      Causes:                                                             │
│      - Route points to null/down interface                              │
│      - Firewall drops without ICMP response                             │
│      Fix: Check route targets, firewall logs                            │
│                                                                          │
│   5. MTU issues                                                          │
│      Symptom: Large packets fail, small ones work                       │
│      Causes:                                                             │
│      - Path MTU smaller than packet size                                │
│      - ICMP "fragmentation needed" blocked                              │
│      Fix: Enable PMTUD, adjust MTU, or reduce packet size               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Exercises

### Exercise 1: Read a Routing Table 🟢

**Scenario:** Given this routing table, determine the next hop for each destination:
```
Destination      Gateway         Interface   Metric
10.0.0.0/8       0.0.0.0         eth0        0
172.16.0.0/16    10.0.0.1        eth0        10
192.168.1.0/24   10.0.0.2        eth0        10
192.168.1.128/25 10.0.0.3        eth0        10
0.0.0.0/0        10.0.0.254      eth0        100
```

Destinations to test:
1. 172.16.5.100
2. 192.168.1.200
3. 8.8.8.8
4. 10.5.5.5

<details>
<summary>✅ Solution</summary>

```
1. 172.16.5.100
   Matches: 172.16.0.0/16, 0.0.0.0/0
   Winner: 172.16.0.0/16 (longer prefix: /16 > /0)
   Next hop: 10.0.0.1

2. 192.168.1.200
   Matches: 192.168.1.0/24, 192.168.1.128/25, 0.0.0.0/0
   
   Check 192.168.1.128/25:
   - Range: 192.168.1.128 - 192.168.1.255
   - 192.168.1.200 is in this range!
   
   Winner: 192.168.1.128/25 (longer prefix: /25 > /24)
   Next hop: 10.0.0.3

3. 8.8.8.8
   Matches: 0.0.0.0/0 (default route only)
   Winner: 0.0.0.0/0
   Next hop: 10.0.0.254

4. 10.5.5.5
   Matches: 10.0.0.0/8, 0.0.0.0/0
   Winner: 10.0.0.0/8 (longer prefix: /8 > /0)
   Next hop: 0.0.0.0 (directly connected, no gateway)
   Delivered directly via eth0
```

</details>

---

### Exercise 2: Design Multi-Tier Routing 🟡

**Scenario:** Design route tables for a 3-tier VPC architecture:
- Public subnet: 10.0.1.0/24 (web servers, need Internet access)
- Private subnet: 10.0.2.0/24 (app servers, need outbound Internet only)
- Database subnet: 10.0.3.0/24 (databases, no Internet access)

You have: Internet Gateway (igw-123), NAT Gateway in public subnet (nat-456)

<details>
<summary>💡 Hints</summary>

- Public subnets route to Internet Gateway for inbound/outbound
- Private subnets use NAT Gateway for outbound only
- Database subnets have no route to Internet

</details>

<details>
<summary>✅ Solution</summary>

```
VPC CIDR: 10.0.0.0/16

PUBLIC SUBNET ROUTE TABLE (10.0.1.0/24):
┌─────────────────────────────────────────────────────────────────┐
│ Destination      Target         Notes                          │
├─────────────────────────────────────────────────────────────────┤
│ 10.0.0.0/16      local          VPC internal (automatic)       │
│ 0.0.0.0/0        igw-123        Internet Gateway (public IPs)  │
└─────────────────────────────────────────────────────────────────┘

Web servers have public IPs, receive inbound traffic from Internet


PRIVATE SUBNET ROUTE TABLE (10.0.2.0/24):
┌─────────────────────────────────────────────────────────────────┐
│ Destination      Target         Notes                          │
├─────────────────────────────────────────────────────────────────┤
│ 10.0.0.0/16      local          VPC internal (automatic)       │
│ 0.0.0.0/0        nat-456        NAT Gateway (outbound only)    │
└─────────────────────────────────────────────────────────────────┘

App servers can reach Internet (for updates, APIs) but not reachable


DATABASE SUBNET ROUTE TABLE (10.0.3.0/24):
┌─────────────────────────────────────────────────────────────────┐
│ Destination      Target         Notes                          │
├─────────────────────────────────────────────────────────────────┤
│ 10.0.0.0/16      local          VPC internal only              │
└─────────────────────────────────────────────────────────────────┘

No default route = No Internet access at all (most secure)


Traffic flow:
- Internet → Web (10.0.1.x) via IGW ✅
- Internet → App (10.0.2.x) ❌ (no inbound path)
- App → Internet (outbound) via NAT ✅
- App → Database ✅ (internal)
- Database → Internet ❌ (no route)
```

**Terraform example:**
```hcl
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
}

resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id
  # No additional routes - only local
}
```

</details>

---

### Exercise 3: Troubleshoot Routing 🔴

**Scenario:** Users report they can't reach your application. Traceroute shows:

```
$ traceroute app.example.com
 1  10.0.0.1 (10.0.0.1)  1.234 ms
 2  192.168.1.1 (192.168.1.1)  5.678 ms
 3  10.255.255.1 (10.255.255.1)  10.123 ms
 4  * * *
 5  * * *
 6  * * *
...
```

What could cause this? How do you investigate?

<details>
<summary>💡 Hints</summary>

- `* * *` means no response at that hop
- Could be: dropped packets, ICMP blocked, or routing issue
- Check both directions (forward and return path)

</details>

<details>
<summary>✅ Solution</summary>

**Analysis:**

The traceroute shows packets reaching hop 3 but getting no response after that. Possible causes:

**1. Firewall blocking ICMP**
```
Many routers/firewalls drop ICMP for security
This doesn't mean traffic is blocked - just ICMP

Test: Try TCP-based traceroute
$ traceroute -T -p 443 app.example.com
# Uses TCP SYN instead of ICMP

Or HTTP check:
$ curl -v https://app.example.com
# If this works, ICMP is just filtered
```

**2. Routing black hole**
```
Packets enter a network but there's no return path

Check: Is the destination IP routed correctly?
$ dig app.example.com
# Verify IP is correct

From the destination side:
$ ip route get <source-ip>
# Check if return route exists
```

**3. ACL/Security Group blocking**
```
Traffic is being dropped by network ACL or security group

Check:
- Source → Destination allowed?
- Destination → Source allowed? (for return traffic)
- NACLs are stateless - need both directions

AWS: Check VPC Flow Logs for rejected traffic
```

**4. MTU issues (Path MTU Discovery)**
```
Large packets being dropped, ICMP "fragmentation needed" blocked

Test with different packet sizes:
$ ping -s 1400 app.example.com  # Large packet
$ ping -s 100 app.example.com   # Small packet

If small works but large fails, MTU issue
Fix: Reduce MTU or enable PMTUD
```

**5. The server is actually down**
```
Check from server side:
$ systemctl status nginx
$ ss -tuln | grep 443

Check cloud health checks:
$ aws elbv2 describe-target-health
```

**Systematic debugging:**

```bash
# 1. Verify DNS resolution
dig app.example.com

# 2. Test basic connectivity
ping -c 4 <ip-address>

# 3. Test actual service port
nc -zv <ip-address> 443
curl -v https://app.example.com

# 4. Check from multiple locations
# Use online tools like mtr.guru, looking-glass servers

# 5. Check route tables at each hop
# Cloud: VPC route tables, Transit Gateway routes
# On-prem: Router show ip route

# 6. Check for packet loss pattern
mtr app.example.com
# Shows packet loss % at each hop over time

# 7. Check firewall/security logs
# AWS: VPC Flow Logs
# On-prem: Firewall logs
```

</details>

---

## Key Takeaways

- 🧭 **Routing table**: Maps destinations to next hops
- 📏 **Longest prefix match**: Most specific route wins
- 🌐 **Default gateway**: Catch-all route (0.0.0.0/0)
- 🔄 **Static vs Dynamic**: Manual config vs protocols (OSPF, BGP)
- ☁️ **Cloud routing**: Route tables per subnet, different targets (IGW, NAT, etc.)
- 🔍 **traceroute**: Essential tool for debugging path issues

---

## Related Topics

- [IP Addressing & Subnets](/networking/06-ip-addressing-and-subnets.md) - Understanding CIDR
- [Firewalls & Security Groups](/networking/10-firewalls-and-security-groups.md) - Filtering traffic
- Cloud Networking - VPC routing patterns
