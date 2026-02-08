# Network Debugging & Tools

[← Back to Index](/networking/00-index.md)

---

## Overview

Network debugging tools help diagnose connectivity issues, measure performance, and analyze traffic. Mastering these tools is essential for troubleshooting production systems and understanding network behavior.

### When This Matters Most
- Debugging "it works on my machine" issues
- Diagnosing slow API responses
- Investigating connection failures
- Analyzing security incidents

---

## Essential Tools Overview

| Tool | Purpose | Layer |
|------|---------|-------|
| `ping` | Test basic connectivity | L3 (ICMP) |
| `traceroute`/`tracert` | Show network path | L3 |
| `mtr` | Combined ping + traceroute | L3 |
| `dig`/`nslookup` | DNS queries | L7 (DNS) |
| `curl` | HTTP requests | L7 |
| `netstat`/`ss` | Connection state | L4 |
| `tcpdump` | Packet capture | L2-L7 |
| `Wireshark` | Packet analysis (GUI) | L2-L7 |
| `netcat` (`nc`) | TCP/UDP testing | L4 |
| `telnet` | Port connectivity | L4 |
| `nmap` | Port scanning | L4 |
| `openssl` | TLS/SSL testing | L6 |

---

## Connectivity Testing

### ping

```bash
# Basic ping
$ ping google.com
PING google.com (142.250.80.46): 56 data bytes
64 bytes from 142.250.80.46: icmp_seq=0 ttl=117 time=12.3 ms
64 bytes from 142.250.80.46: icmp_seq=1 ttl=117 time=11.8 ms
^C
--- google.com ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss
round-trip min/avg/max/stddev = 11.8/12.0/12.3/0.3 ms

# Useful options
$ ping -c 5 google.com        # Only 5 pings
$ ping -i 0.5 google.com      # 0.5 second interval
$ ping -s 1000 google.com     # Larger packet size
$ ping -W 2 10.0.0.1          # 2 second timeout

# What ping tells you:
# ✓ DNS resolution works (if using hostname)
# ✓ Route to host exists
# ✓ Host is responding to ICMP
# ✓ Round-trip latency

# Common issues:
# - "Request timeout" = host unreachable or blocking ICMP
# - "Network unreachable" = routing problem
# - High latency = congestion or distance
```

### traceroute / tracert

```bash
# Linux/macOS
$ traceroute google.com

# Windows
> tracert google.com

# Output example:
traceroute to google.com (142.250.80.46), 30 hops max
 1  router.local (192.168.1.1)  1.234 ms  1.123 ms  1.089 ms
 2  isp-gateway (10.0.0.1)  12.345 ms  12.234 ms  12.567 ms
 3  * * *                          # No response (firewall)
 4  core-router (72.14.215.81)  15.678 ms  15.789 ms  15.890 ms
 5  google.com (142.250.80.46)  16.123 ms  16.234 ms  16.345 ms

# Useful options (Linux)
$ traceroute -n google.com      # Don't resolve hostnames (faster)
$ traceroute -T -p 443 host     # Use TCP instead of UDP
$ traceroute -I google.com      # Use ICMP (like ping)

# What each column means:
# Hop number | Host | RTT attempt 1 | RTT attempt 2 | RTT attempt 3

# * * * means:
# - Router doesn't respond to traceroute
# - Firewall blocking
# - Rate limiting
# (Not necessarily a problem!)
```

### mtr (My Traceroute)

```bash
# Combines ping + traceroute, runs continuously
$ mtr google.com

# Example output:
                             My traceroute  [v0.95]
Host: mypc                   Loss%   Snt   Last   Avg  Best  Wrst StDev
 1. router.local              0.0%    50    1.2   1.3   0.9   2.1   0.3
 2. isp-gateway               0.0%    50   12.3  12.5  11.8  14.2   0.5
 3. ???                      100.0    50    0.0   0.0   0.0   0.0   0.0
 4. core-router               0.0%    50   15.6  15.8  15.2  17.1   0.4
 5. google.com                0.0%    50   16.1  16.3  15.9  17.5   0.3

# Useful options
$ mtr -n google.com           # No DNS resolution
$ mtr -r -c 100 google.com    # Report mode (100 pings, then exit)
$ mtr -T -P 443 google.com    # TCP mode on port 443
$ mtr -u google.com           # UDP mode

# Reading the output:
# Loss% - Packet loss at each hop
# Snt   - Packets sent
# Last  - Last ping time
# Avg   - Average latency
# Best  - Best (lowest) latency
# Wrst  - Worst (highest) latency
# StDev - Standard deviation (consistency)

# Tip: Packet loss at intermediate hops is often normal
#      (routers deprioritize ICMP). Only final hop loss matters.
```

---

## DNS Debugging

### dig

```bash
# Basic query
$ dig example.com
;; ANSWER SECTION:
example.com.        3600    IN    A    93.184.216.34

# Query specific record types
$ dig example.com MX          # Mail servers
$ dig example.com NS          # Name servers
$ dig example.com TXT         # TXT records (SPF, DKIM)
$ dig example.com AAAA        # IPv6 address
$ dig example.com CNAME       # Canonical name
$ dig example.com ANY         # All records

# Use specific DNS server
$ dig @8.8.8.8 example.com    # Query Google DNS
$ dig @1.1.1.1 example.com    # Query Cloudflare DNS

# Trace DNS resolution (follow the chain)
$ dig +trace example.com
.                       518400  IN  NS  a.root-servers.net.
com.                    172800  IN  NS  a.gtld-servers.net.
example.com.            172800  IN  NS  ns1.example.com.
example.com.            3600    IN  A   93.184.216.34

# Short output
$ dig +short example.com
93.184.216.34

# Show all sections
$ dig +noall +answer +authority example.com

# Check TTL (caching time)
$ dig example.com | grep -E "^example"
example.com.        3600    IN    A    93.184.216.34
#                   ^^^^ TTL in seconds

# Reverse DNS lookup
$ dig -x 8.8.8.8
;; ANSWER SECTION:
8.8.8.8.in-addr.arpa.  86400  IN  PTR  dns.google.
```

### nslookup

```bash
# Basic lookup
$ nslookup example.com
Server:     8.8.8.8
Address:    8.8.8.8#53

Non-authoritative answer:
Name:   example.com
Address: 93.184.216.34

# Use specific DNS server
$ nslookup example.com 1.1.1.1

# Query specific record type
$ nslookup -type=MX example.com
$ nslookup -type=TXT example.com

# Interactive mode
$ nslookup
> set type=MX
> example.com
> exit
```

---

## HTTP Debugging with curl

```bash
# Basic GET request
$ curl https://api.example.com/users

# Show response headers
$ curl -I https://api.example.com      # HEAD request (headers only)
$ curl -i https://api.example.com      # Include headers with body

# Verbose output (see everything!)
$ curl -v https://api.example.com
* Trying 93.184.216.34:443...
* Connected to api.example.com (93.184.216.34) port 443
* TLS 1.3 connection using TLS_AES_256_GCM_SHA384
> GET / HTTP/2
> Host: api.example.com
> User-Agent: curl/7.88.1
>
&lt; HTTP/2 200
&lt; content-type: application/json
&lt; cache-control: max-age=3600

# POST request with JSON
$ curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com"}'

# POST with form data
$ curl -X POST https://api.example.com/login \
  -d "username=admin&password=secret"

# Follow redirects
$ curl -L http://example.com           # Follow 301/302 redirects

# Custom headers
$ curl -H "Authorization: Bearer token123" \
       -H "X-Custom-Header: value" \
       https://api.example.com

# Save response to file
$ curl -o output.json https://api.example.com/data

# Timing information
$ curl -w "\nTime: %{time_total}s\n" https://api.example.com

# Detailed timing breakdown
$ curl -w @- -o /dev/null -s https://api.example.com &lt;&lt; 'EOF'
    time_namelookup:  %{time_namelookup}s\n
   time_connect:  %{time_connect}s\n
   time_appconnect:  %{time_appconnect}s\n
   time_pretransfer:  %{time_pretransfer}s\n
   time_redirect:  %{time_redirect}s\n
   time_starttransfer:  %{time_starttransfer}s\n
   ----------\n
   time_total:  %{time_total}s\n
EOF

# Ignore SSL certificate errors (testing only!)
$ curl -k https://self-signed.example.com

# Use specific TLS version
$ curl --tlsv1.2 https://api.example.com

# Show only HTTP status code
$ curl -s -o /dev/null -w "%{http_code}" https://api.example.com
```

---

## Connection State Tools

### netstat / ss

```bash
# ss is the modern replacement for netstat

# Show all TCP connections
$ ss -t
State    Recv-Q    Send-Q    Local Address:Port    Peer Address:Port
ESTAB    0         0         192.168.1.10:43256    142.250.80.46:443

# Show all listening ports
$ ss -tln
State    Recv-Q    Send-Q    Local Address:Port    Peer Address:Port
LISTEN   0         128       0.0.0.0:22             0.0.0.0:*
LISTEN   0         128       0.0.0.0:80             0.0.0.0:*
LISTEN   0         128       0.0.0.0:443            0.0.0.0:*

# Show process using each port
$ ss -tlnp
LISTEN  0  128  0.0.0.0:80  0.0.0.0:*  users:(("nginx",pid=1234,fd=6))

# Filter by state
$ ss -t state established
$ ss -t state time-wait
$ ss -t state close-wait    # Often indicates connection leak!

# Filter by port
$ ss -t 'sport = :443'      # Source port 443
$ ss -t 'dport = :443'      # Destination port 443

# Count connections by state
$ ss -t | awk '{print $1}' | sort | uniq -c
    1 ESTAB
    3 CLOSE-WAIT
   15 TIME-WAIT

# netstat equivalents (older systems)
$ netstat -an                # All connections
$ netstat -tlnp              # Listening TCP with process
$ netstat -s                 # Statistics
```

### Common connection states

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TCP CONNECTION STATES                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   LISTEN      - Waiting for incoming connections                        │
│   ESTABLISHED - Active connection                                       │
│   TIME_WAIT   - Connection closed, waiting (normal, 2*MSL ~60s)        │
│   CLOSE_WAIT  - Remote closed, waiting for local close (PROBLEM!)      │
│   FIN_WAIT_1  - Local initiated close, waiting for ACK                 │
│   FIN_WAIT_2  - Received ACK, waiting for remote FIN                   │
│   CLOSING     - Both sides closing simultaneously                       │
│   LAST_ACK    - Waiting for final ACK                                  │
│                                                                          │
│   ⚠️ Many CLOSE_WAIT = Application not closing connections!            │
│   ⚠️ Many TIME_WAIT = High connection churn (may need tuning)          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Packet Capture

### tcpdump

```bash
# Capture all traffic on interface
$ sudo tcpdump -i eth0

# Capture specific host
$ sudo tcpdump host 10.0.0.50

# Capture specific port
$ sudo tcpdump port 443
$ sudo tcpdump port 80 or port 443

# Capture HTTP traffic
$ sudo tcpdump -i any port 80 -A   # -A shows ASCII content

# Capture to file for Wireshark analysis
$ sudo tcpdump -i eth0 -w capture.pcap

# Read from capture file
$ sudo tcpdump -r capture.pcap

# Show packet contents in hex and ASCII
$ sudo tcpdump -XX -i eth0 port 80

# Filter by source/destination
$ sudo tcpdump src 192.168.1.10
$ sudo tcpdump dst 10.0.0.50

# Complex filters
$ sudo tcpdump 'tcp port 80 and (host 10.0.0.1 or host 10.0.0.2)'

# Show only SYN packets (new connections)
$ sudo tcpdump 'tcp[tcpflags] & tcp-syn != 0'

# Capture DNS queries
$ sudo tcpdump -i any port 53

# Useful options
$ sudo tcpdump -n             # Don't resolve hostnames
$ sudo tcpdump -nn            # Don't resolve hostnames or ports
$ sudo tcpdump -c 100         # Capture only 100 packets
$ sudo tcpdump -s 0           # Capture full packet (no truncation)

# Example: Debug slow API
$ sudo tcpdump -i any port 443 -w api_debug.pcap
# Then analyze in Wireshark
```

### Wireshark

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WIRESHARK TIPS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Common display filters:                                                │
│   ─────────────────────                                                  │
│   ip.addr == 10.0.0.1                     # IP address                  │
│   tcp.port == 443                          # TCP port                    │
│   http.request.method == "POST"            # HTTP POST requests         │
│   http.response.code == 500                # HTTP 500 errors            │
│   tcp.analysis.retransmission              # Retransmissions            │
│   tcp.flags.syn == 1 && tcp.flags.ack == 0 # SYN packets (new conn)    │
│   dns                                      # All DNS traffic            │
│   tls.handshake.type == 1                  # TLS Client Hello          │
│                                                                          │
│   Useful features:                                                       │
│   ────────────────                                                       │
│   - Follow TCP Stream: See full conversation                            │
│   - Statistics → Conversations: Top talkers                             │
│   - Statistics → IO Graph: Traffic over time                            │
│   - Analyze → Expert Info: Issues summary                               │
│   - Decryption: Can decrypt TLS with private key                        │
│                                                                          │
│   Finding problems:                                                      │
│   ─────────────────                                                      │
│   - Red/Black packets often indicate issues                             │
│   - "TCP Retransmission" = packet loss                                  │
│   - "TCP Dup ACK" = possible congestion                                 │
│   - High delta time = latency issue                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Port Testing

### netcat (nc)

```bash
# Test if port is open
$ nc -zv api.example.com 443
Connection to api.example.com port 443 [tcp/https] succeeded!

# Scan multiple ports
$ nc -zv api.example.com 80 443 8080

# Simple TCP server (listen on port)
$ nc -l 8080

# Simple TCP client (connect)
$ nc api.example.com 8080

# Send data
$ echo "Hello" | nc api.example.com 8080

# Test UDP port
$ nc -u -zv 8.8.8.8 53

# Transfer file
# Receiver:
$ nc -l 9999 > received_file.txt
# Sender:
$ nc destination.com 9999 &lt; file.txt

# HTTP request manually
$ echo -e "GET / HTTP/1.1\r\nHost: example.com\r\n\r\n" | nc example.com 80
```

### telnet

```bash
# Test port connectivity
$ telnet api.example.com 443
Trying 93.184.216.34...
Connected to api.example.com.
Escape character is '^]'.

# Manual HTTP request
$ telnet example.com 80
GET / HTTP/1.1
Host: example.com

# Exit: Ctrl+] then type 'quit'
```

### nmap

```bash
# Scan common ports
$ nmap example.com

# Scan specific ports
$ nmap -p 80,443,8080 example.com

# Scan port range
$ nmap -p 1-1000 example.com

# Scan all ports
$ nmap -p- example.com

# Service version detection
$ nmap -sV example.com

# OS detection
$ nmap -O example.com

# Fast scan (top 100 ports)
$ nmap -F example.com

# UDP scan
$ nmap -sU -p 53,123 example.com

# Output formats
$ nmap -oN output.txt example.com    # Normal
$ nmap -oX output.xml example.com    # XML
$ nmap -oG output.grep example.com   # Grepable
```

---

## TLS/SSL Testing

### openssl

```bash
# Test SSL connection
$ openssl s_client -connect api.example.com:443
CONNECTED(00000003)
depth=2 C = US, O = DigiCert Inc, CN = DigiCert Global Root CA
...
---
Certificate chain
 0 s:CN = api.example.com
   i:C = US, O = Let's Encrypt, CN = R3
---
SSL handshake has read 4567 bytes and written 392 bytes
---
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
...

# Show certificate details
$ openssl s_client -connect api.example.com:443 2>/dev/null | \
  openssl x509 -noout -text

# Check certificate expiration
$ openssl s_client -connect api.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates
notBefore=Jan  1 00:00:00 2024 GMT
notAfter=Apr  1 00:00:00 2024 GMT

# Test specific TLS version
$ openssl s_client -connect api.example.com:443 -tls1_2
$ openssl s_client -connect api.example.com:443 -tls1_3

# Show supported ciphers
$ openssl s_client -connect api.example.com:443 -cipher 'ALL' 2>&1 | \
  grep "Cipher is"

# Check certificate chain
$ openssl s_client -connect api.example.com:443 -showcerts

# Verify certificate
$ openssl verify -CAfile ca-bundle.crt certificate.pem
```

---

## Quick Reference: Debugging Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NETWORK DEBUGGING WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   "Can't connect to service"                                             │
│   ────────────────────────────                                           │
│   1. DNS resolving?      → dig / nslookup                               │
│   2. Port open?          → nc -zv / telnet                              │
│   3. Route exists?       → ping / traceroute                            │
│   4. Firewall blocking?  → Check security groups / iptables            │
│   5. Service running?    → ss -tlnp / netstat                           │
│   6. TLS issue?          → openssl s_client                             │
│                                                                          │
│   "Service is slow"                                                      │
│   ─────────────────                                                      │
│   1. Where's the latency? → mtr / traceroute                            │
│   2. DNS slow?            → dig (check query time)                      │
│   3. TLS handshake slow?  → curl timing breakdown                       │
│   4. Server processing?   → curl -w time_starttransfer                  │
│   5. Packet loss?         → mtr / tcpdump for retransmissions          │
│   6. Connection reuse?    → Check Connection: keep-alive               │
│                                                                          │
│   "Intermittent failures"                                                │
│   ───────────────────────                                                │
│   1. Capture traffic      → tcpdump -w capture.pcap                     │
│   2. Check connection states → ss -t state close-wait                   │
│   3. Look for patterns    → time-based? load-based?                     │
│   4. Check DNS TTL        → dig (low TTL = frequent lookups)            │
│   5. Monitor continuously → mtr report mode                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Exercises

### Exercise 1: Diagnose Connection Failure 🟢

**Scenario:** Your app can't connect to `api.example.com:443`. Walk through the debugging steps.

<details>
<summary>✅ Solution</summary>

```bash
# Step 1: Check DNS resolution
$ dig api.example.com
# or
$ nslookup api.example.com

# If no answer: DNS issue
# Try different DNS server:
$ dig @8.8.8.8 api.example.com


# Step 2: Check basic connectivity (ICMP)
$ ping -c 3 api.example.com

# If timeout: host down, or ICMP blocked, or routing issue


# Step 3: Check route
$ traceroute api.example.com
# or
$ mtr -r -c 10 api.example.com

# Look for where packets stop


# Step 4: Check if port is reachable
$ nc -zv api.example.com 443
# or
$ telnet api.example.com 443

# If timeout: firewall blocking the port
# If refused: service not running on that port


# Step 5: Check TLS/SSL if port is open
$ openssl s_client -connect api.example.com:443

# Look for:
# - Certificate errors
# - TLS version mismatch
# - Cipher suite issues


# Step 6: Full HTTP test
$ curl -v https://api.example.com

# Verbose output shows exactly where it fails:
# - DNS? (Trying IP)
# - Connect? (Connected to)
# - TLS? (SSL connection)
# - HTTP? (GET request)


# Step 7: Check from different locations
# - Is it just your network?
# - Try from cloud VM, different office, etc.
```

</details>

---

### Exercise 2: Debug Slow API Response 🟡

**Scenario:** API calls to `https://api.example.com/data` take 3+ seconds. The page itself loads fast. Find where the time is spent.

<details>
<summary>💡 Hints</summary>

- Use curl timing breakdown
- Is it DNS? TLS? Server processing?
- Check connection reuse

</details>

<details>
<summary>✅ Solution</summary>

```bash
# Step 1: Get timing breakdown
$ curl -w "\
   namelookup:  %{time_namelookup}s\n\
      connect:  %{time_connect}s\n\
   appconnect:  %{time_appconnect}s\n\
  pretransfer:  %{time_pretransfer}s\n\
     redirect:  %{time_redirect}s\n\
starttransfer:  %{time_starttransfer}s\n\
        total:  %{time_total}s\n" \
   -o /dev/null -s https://api.example.com/data

# Example output:
   namelookup:  0.012s      # DNS lookup
      connect:  0.045s      # TCP connect
   appconnect:  0.156s      # TLS handshake
  pretransfer:  0.157s      # Ready to send
     redirect:  0.000s      # Redirects
starttransfer:  2.891s      # First byte received  ← PROBLEM!
        total:  2.934s      # Total time

# Analysis:
# starttransfer - pretransfer = Server processing time
# 2.891 - 0.157 = 2.734 seconds on server!


# Step 2: Check if it's network or server
$ mtr -r -c 20 api.example.com
# Low latency = server problem, not network


# Step 3: Check for connection reuse issues
$ curl -v --keepalive -o /dev/null https://api.example.com/data 2>&1 | \
  grep -E "Re-using|Connected"

# "Re-using existing connection" = good
# New connection each time = overhead


# Step 4: Check for DNS issues
$ dig api.example.com
# Look at "Query time"
# High query time + low TTL = repeated DNS lookups


# Step 5: Check server-side
# If you have access:
# - Check application logs
# - Database query times
# - External API calls
# - Resource utilization (CPU, memory)


# Possible causes:
# - Slow database queries
# - Synchronous external API calls
# - No connection pooling
# - Cold start (serverless)
# - High server load
```

</details>

---

### Exercise 3: Find the Connection Leak 🔴

**Scenario:** Your Node.js server has increasing CLOSE_WAIT connections over time, eventually running out of file descriptors.

```bash
$ ss -t state close-wait | wc -l
5432
```

Diagnose and explain how to fix.

<details>
<summary>💡 Hints</summary>

- CLOSE_WAIT means remote closed but local hasn't
- Application isn't closing connections
- Look at database pools, HTTP clients

</details>

<details>
<summary>✅ Solution</summary>

```bash
# Step 1: Understand CLOSE_WAIT
# Remote side sent FIN (closed their end)
# Local side hasn't called close() yet
# = Application bug!

# Step 2: Find what's not being closed
$ ss -tp state close-wait
# Shows which process has these connections

# Look at destination to identify what kind of connection:
$ ss -tn state close-wait | awk '{print $4}' | sort | uniq -c | sort -rn
   3000 10.0.1.5:5432      # PostgreSQL connections!
   2000 10.0.2.10:6379     # Redis connections!
    432 external.api.com:443


# Step 3: Common causes in Node.js

# Cause 1: Not closing database connections
// BAD: Connection never released back to pool
const client = await pool.connect();
const result = await client.query('SELECT * FROM users');
// Missing: client.release()

// GOOD: Always release in finally block
const client = await pool.connect();
try {
  const result = await client.query('SELECT * FROM users');
  return result;
} finally {
  client.release();  // Always release!
}

// BETTER: Use pool.query() for automatic release
const result = await pool.query('SELECT * FROM users');


# Cause 2: HTTP client not consuming response
// BAD: Response body not consumed
const response = await fetch('http://api.example.com');
if (!response.ok) {
  throw new Error('Failed');  // Body not read!
}

// GOOD: Always consume or abort
const response = await fetch('http://api.example.com');
if (!response.ok) {
  await response.body?.cancel();  // Consume/cancel body
  throw new Error('Failed');
}


# Cause 3: Event listeners keeping connections
// BAD: Error handler missing
const client = redis.createClient();
// If connection errors, it's never cleaned up

// GOOD: Handle all events
client.on('error', (err) => {
  console.error('Redis error:', err);
  client.quit();
});


# Step 4: Temporary mitigation
# Reduce TCP keepalive to kill stale connections faster
$ sudo sysctl net.ipv4.tcp_keepalive_time=300
$ sudo sysctl net.ipv4.tcp_keepalive_intvl=60
$ sudo sysctl net.ipv4.tcp_keepalive_probes=3


# Step 5: Monitoring
# Add connection pool metrics
# Alert on high CLOSE_WAIT count
# Regularly check: ss -t state close-wait | wc -l
```

**Root cause summary:**
- Application receives data from remote
- Remote closes connection (sends FIN)
- Application should call close() but doesn't
- Connection stays in CLOSE_WAIT forever
- Eventually hits file descriptor limit

**Fix:**
1. Always release database connections (use `finally` blocks)
2. Always consume or cancel HTTP response bodies
3. Use connection pools with proper error handling
4. Add health checks that monitor connection states

</details>

---

## Key Takeaways

- 🔍 **Start simple**: ping → traceroute → port test → deep dive
- 📊 **curl timing**: Pinpoints exactly where latency occurs
- 🔌 **ss over netstat**: Modern, faster, more features
- 📦 **tcpdump + Wireshark**: Ultimate debugging for complex issues
- ⚠️ **CLOSE_WAIT**: Almost always an application bug
- 🔐 **openssl s_client**: Essential for TLS troubleshooting

---

## Related Topics

- [TCP & UDP](/networking/04-tcp-and-udp.md) - Understanding connection states
- [DNS](/networking/03-dns.md) - DNS resolution details
- [TLS & Security](/networking/05-tls-and-security.md) - Certificate troubleshooting
