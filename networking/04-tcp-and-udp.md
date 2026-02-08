# TCP & UDP

[← Back to Index](/networking/00-index.md)

---

## Overview

TCP and UDP are the two primary transport layer protocols. TCP provides reliable, ordered delivery with congestion control. UDP provides fast, connectionless delivery with no guarantees. Choosing the right protocol—and understanding their behavior—is crucial for backend performance.

### When This Matters Most
- Designing real-time vs reliable systems
- Debugging connection issues
- Optimizing network performance
- Understanding WebSocket, HTTP/3, and other protocols

---

## TCP vs UDP at a Glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TCP vs UDP COMPARISON                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Feature              TCP                     UDP                        │
│  ─────────────────────────────────────────────────────────────────────  │
│  Connection           Connection-oriented     Connectionless             │
│  Reliability          Guaranteed delivery     Best effort (may lose)     │
│  Ordering             In-order delivery       No ordering                │
│  Flow Control         Yes (window-based)      No                         │
│  Congestion Control   Yes (slow start, etc)   No                         │
│  Speed                Slower (overhead)       Faster (minimal overhead)  │
│  Header Size          20-60 bytes             8 bytes                    │
│  Use Cases            HTTP, SSH, DB, Email    DNS, Video, Gaming, VoIP   │
│                                                                          │
│  Think of TCP as:     Registered mail with tracking                     │
│  Think of UDP as:     Postcards - fast but no guarantees                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TCP Deep Dive

### TCP Header

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TCP HEADER (20-60 bytes)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   0                   1                   2                   3          │
│   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1       │
│  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+       │
│  |          Source Port          |       Destination Port        |       │
│  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+       │
│  |                        Sequence Number                        |       │
│  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+       │
│  |                    Acknowledgment Number                      |       │
│  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+       │
│  | Offset| Res |N|C|E|U|A|P|R|S|F|           Window              |       │
│  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+       │
│  |           Checksum            |         Urgent Pointer        |       │
│  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+       │
│  |                    Options (if any)                           |       │
│  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+       │
│                                                                          │
│  Key Flags:                                                              │
│  SYN - Synchronize (start connection)                                   │
│  ACK - Acknowledgment                                                    │
│  FIN - Finish (close connection)                                         │
│  RST - Reset (abort connection)                                          │
│  PSH - Push (deliver immediately)                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### TCP Three-Way Handshake

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TCP CONNECTION ESTABLISHMENT                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Client                                              Server             │
│   (CLOSED)                                           (LISTEN)            │
│      │                                                  │                │
│      │──────── SYN (seq=100) ──────────────────────────►│                │
│      │         "Hey, let's talk"                        │                │
│   (SYN_SENT)                                        (SYN_RCVD)           │
│      │                                                  │                │
│      │◄─────── SYN-ACK (seq=300, ack=101) ──────────────│                │
│      │         "OK, I hear you, talk to me"             │                │
│      │                                                  │                │
│      │──────── ACK (ack=301) ──────────────────────────►│                │
│      │         "Great, connection established"          │                │
│   (ESTABLISHED)                                    (ESTABLISHED)         │
│      │                                                  │                │
│      │◄═══════════ Data Transfer ══════════════════════►│                │
│      │                                                  │                │
│                                                                          │
│   Why 3 steps?                                                           │
│   - Both sides confirm they can send AND receive                        │
│   - Establishes initial sequence numbers                                 │
│   - Prevents old duplicate connections                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### TCP Connection Termination

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TCP CONNECTION TERMINATION                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Client                                              Server             │
│   (ESTABLISHED)                                      (ESTABLISHED)       │
│      │                                                  │                │
│      │──────── FIN ────────────────────────────────────►│                │
│   (FIN_WAIT_1)                                      (CLOSE_WAIT)         │
│      │                                                  │                │
│      │◄─────── ACK ─────────────────────────────────────│                │
│   (FIN_WAIT_2)                                          │                │
│      │                                                  │                │
│      │◄─────── FIN ─────────────────────────────────────│                │
│      │                                                (LAST_ACK)         │
│      │──────── ACK ────────────────────────────────────►│                │
│   (TIME_WAIT)                                        (CLOSED)            │
│      │                                                  │                │
│   [Wait 2×MSL]  ← Ensures all packets are gone                          │
│      │                                                                   │
│   (CLOSED)                                                               │
│                                                                          │
│   TIME_WAIT: Client waits ~2 minutes before fully closing               │
│   This is why you see "address already in use" after restart            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### TCP Reliability Mechanisms

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SEQUENCE NUMBERS & ACKNOWLEDGMENTS                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Sender                                             Receiver            │
│      │                                                  │                │
│      │─── Segment 1 (seq=1, 100 bytes) ────────────────►│                │
│      │─── Segment 2 (seq=101, 100 bytes) ──────────────►│                │
│      │─── Segment 3 (seq=201, 100 bytes) ───────X (lost)│                │
│      │─── Segment 4 (seq=301, 100 bytes) ──────────────►│                │
│      │                                                  │                │
│      │◄── ACK 201 (I have up to byte 200) ──────────────│                │
│      │◄── ACK 201 (still waiting for 201) ──────────────│ Duplicate ACK │
│      │◄── ACK 201 (still waiting for 201) ──────────────│ Duplicate ACK │
│      │                                                  │                │
│   [Sender detects loss via duplicate ACKs or timeout]                   │
│      │                                                  │                │
│      │─── Segment 3 (seq=201) ─────────────────────────►│ Retransmit    │
│      │                                                  │                │
│      │◄── ACK 401 (now I have everything) ──────────────│                │
│      │                                                  │                │
└─────────────────────────────────────────────────────────────────────────┘
```

### TCP Flow Control (Sliding Window)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TCP SLIDING WINDOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Receiver advertises: "I have space for 4000 bytes"                    │
│                                                                          │
│   Sender's View:                                                         │
│   ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐        │
│   │Sent │Sent │Sent │Can  │Can  │Can  │Can  │Can't│Can't│Can't│        │
│   │ACKd │ACKd │ ??? │Send │Send │Send │Send │Send │Send │Send │        │
│   └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘        │
│   ◄─────────────────────►◄──────────────────────►                        │
│          Sent            Available Window (4000)                         │
│                                                                          │
│   As receiver processes data:                                            │
│   - Sends ACK with new window size                                       │
│   - Window "slides" forward                                              │
│                                                                          │
│   If receiver overwhelmed (window = 0):                                  │
│   - Sender stops until window opens                                      │
│   - "Zero Window" situation                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### TCP Congestion Control

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TCP CONGESTION CONTROL                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Throughput                                                             │
│      ▲                                                                   │
│      │                    ┌──────────────────── Congestion Avoidance    │
│      │                   ╱                      (linear increase)        │
│      │                  ╱                                                │
│      │                 ╱                                                 │
│      │           ╔════╝     ← ssthresh (slow start threshold)           │
│      │          ╱                                                        │
│      │         ╱   Slow Start                                            │
│      │        ╱    (exponential)                                         │
│      │       ╱                                                           │
│      │      ╱                                                            │
│      │     ╱                                                             │
│      │    ╱                                                              │
│      └───╱──────────────────────────────────────────────────► Time       │
│         Start                                                            │
│                                                                          │
│   1. Slow Start: Double window each RTT (exponential growth)            │
│   2. Congestion Avoidance: Add 1 MSS per RTT (linear growth)            │
│   3. On packet loss: Halve window (multiplicative decrease)             │
│                                                                          │
│   Algorithms: Reno, Cubic (Linux default), BBR (Google)                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## UDP Deep Dive

### UDP Header

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UDP HEADER (8 bytes only!)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   0                   1                   2                   3          │
│   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1       │
│  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+       │
│  |          Source Port          |       Destination Port        |       │
│  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+       │
│  |            Length             |           Checksum            |       │
│  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+       │
│                                                                          │
│   That's it! No sequence numbers, no ACKs, no window.                   │
│   Minimal overhead = maximum speed                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### UDP Characteristics

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         UDP BEHAVIOR                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ✅ Advantages:                                                         │
│   ├── No connection setup delay (no handshake)                          │
│   ├── No head-of-line blocking                                          │
│   ├── Supports broadcast and multicast                                   │
│   ├── Smaller header = less overhead                                     │
│   └── Application controls reliability/timing                            │
│                                                                          │
│   ❌ Disadvantages:                                                      │
│   ├── Packets may be lost                                                │
│   ├── Packets may arrive out of order                                    │
│   ├── Packets may be duplicated                                          │
│   ├── No congestion control (can flood network)                          │
│   └── Application must handle reliability if needed                      │
│                                                                          │
│   Perfect for:                                                           │
│   ├── Real-time: Video streaming, VoIP, gaming                          │
│   ├── Simple query/response: DNS, NTP                                   │
│   ├── Broadcast: Service discovery, mDNS                                 │
│   └── When loss is acceptable but latency isn't                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## When to Use What

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROTOCOL SELECTION GUIDE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                           Need reliability?                              │
│                                 │                                        │
│                    ┌────────────┴────────────┐                          │
│                   Yes                        No                          │
│                    │                          │                          │
│                    ▼                          ▼                          │
│              ┌─────────┐              ┌─────────────┐                   │
│              │   TCP   │              │    UDP      │                   │
│              └─────────┘              └─────────────┘                   │
│                    │                          │                          │
│     ┌──────────────┼──────────────┐    ┌─────┴─────┐                    │
│     │              │              │    │           │                    │
│   HTTP/S        Email        Databases  Real-time  Discovery            │
│   REST API      SMTP         MySQL      Video      DNS                  │
│   GraphQL       IMAP         PostgreSQL VoIP       DHCP                 │
│   WebSocket*    POP3         Redis*     Gaming     NTP                  │
│   SSH                                   IoT                             │
│   FTP                                                                    │
│                                                                          │
│   * WebSocket runs over TCP but provides message framing                │
│   * Redis uses TCP for reliability                                       │
│                                                                          │
│   Modern Hybrid: QUIC (HTTP/3)                                          │
│   ├── Runs over UDP                                                     │
│   ├── Implements reliability in user space                              │
│   ├── Gets UDP's speed with TCP's reliability                           │
│   └── Avoids TCP's head-of-line blocking                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Connection States

```bash
# View TCP connection states
$ netstat -an | grep -E "ESTABLISHED|TIME_WAIT|CLOSE_WAIT"
# or
$ ss -tan state established
$ ss -tan state time-wait
```

### Common States and Their Meaning

| State | Meaning | Common Issues |
|-------|---------|---------------|
| `LISTEN` | Waiting for connections | Normal for servers |
| `ESTABLISHED` | Active connection | Normal data transfer |
| `TIME_WAIT` | Waiting after close | Many = port exhaustion |
| `CLOSE_WAIT` | Remote closed, local hasn't | App not closing sockets! |
| `FIN_WAIT_1/2` | Closing in progress | Normal, briefly |
| `SYN_SENT` | Connection attempt | Timeout = unreachable |
| `SYN_RECV` | SYN received | Many = SYN flood attack |

---

## TCP Tuning (Linux)

```bash
# View current settings
sysctl net.ipv4.tcp_max_syn_backlog      # SYN queue size
sysctl net.core.somaxconn                 # Listen backlog
sysctl net.ipv4.tcp_fin_timeout           # TIME_WAIT duration
sysctl net.ipv4.tcp_tw_reuse              # Reuse TIME_WAIT

# Common optimizations (in /etc/sysctl.conf)
net.core.somaxconn = 65535                # Increase listen backlog
net.ipv4.tcp_max_syn_backlog = 65535      # Increase SYN queue
net.ipv4.tcp_fin_timeout = 30             # Reduce TIME_WAIT (default 60)
net.ipv4.tcp_tw_reuse = 1                 # Reuse TIME_WAIT sockets
net.ipv4.tcp_keepalive_time = 600         # Keepalive interval
net.ipv4.tcp_keepalive_probes = 3         # Keepalive probes
net.ipv4.tcp_keepalive_intvl = 15         # Probe interval

# Apply changes
sysctl -p
```

---

## Exercises

### Exercise 1: Analyze TCP Handshake 🟢

**Scenario:** Use tcpdump or Wireshark to capture a TCP handshake to google.com:

```bash
# Linux/Mac
sudo tcpdump -i any -c 10 host google.com and port 443

# Or with netcat to see handshake
nc -zv google.com 443
```

Identify the SYN, SYN-ACK, and ACK packets.

<details>
<summary>💡 Hints</summary>

- Look for flags: S (SYN), S. (SYN-ACK), . (ACK)
- Sequence numbers increase
- The handshake happens before any data

</details>

<details>
<summary>✅ Solution</summary>

```bash
$ sudo tcpdump -i any -c 10 'host google.com and port 443' -nn

# Output interpretation:
15:30:01.123 IP 192.168.1.10.54321 > 142.250.80.46.443: 
    Flags [S], seq 1234567890, win 65535, ...
# ^ SYN: Client initiates, sends initial sequence number

15:30:01.145 IP 142.250.80.46.443 > 192.168.1.10.54321: 
    Flags [S.], seq 987654321, ack 1234567891, win 65535, ...
# ^ SYN-ACK: Server responds, ACKs client's seq+1, sends own seq

15:30:01.146 IP 192.168.1.10.54321 > 142.250.80.46.443: 
    Flags [.], ack 987654322, win 65535, ...
# ^ ACK: Client confirms, ACKs server's seq+1

15:30:01.147 IP 192.168.1.10.54321 > 142.250.80.46.443: 
    Flags [P.], seq 1234567891:1234567999, ack 987654322, ...
# ^ PSH+ACK: Client sends TLS Client Hello

# Flag meanings:
# S = SYN
# . = ACK
# F = FIN
# R = RST
# P = PSH (push data immediately)
```

**Wireshark filter:** `tcp.flags.syn == 1`

</details>

---

### Exercise 2: Diagnose TIME_WAIT Accumulation 🟡

**Scenario:** Your server shows thousands of TIME_WAIT connections:

```bash
$ ss -tan state time-wait | wc -l
15234
```

Explain why this happens and how to address it.

<details>
<summary>💡 Hints</summary>

- TIME_WAIT is on the side that initiates close
- Default timeout is 60 seconds (Linux)
- Think about connection patterns (many short-lived?)

</details>

<details>
<summary>✅ Solution</summary>

**Why TIME_WAIT happens:**

1. TIME_WAIT is on the side that sends FIN first (initiates close)
2. Lasts 2×MSL (Maximum Segment Lifetime), typically 60 seconds
3. Prevents old packets from confusing new connections

**Common causes of accumulation:**

```
Scenario 1: Backend making many outbound requests
┌─────────┐     HTTP request      ┌─────────┐
│ Your    │ ────────────────────► │External │
│ Server  │ ◄──────────────────── │  API    │
└─────────┘                       └─────────┘
    │
    └── If your server closes first → TIME_WAIT on your server

Scenario 2: Short-lived connections from clients
Many clients connect, make one request, disconnect
If server closes connection → TIME_WAIT accumulates
```

**Solutions:**

```bash
# 1. Enable TIME_WAIT reuse (Linux)
sysctl -w net.ipv4.tcp_tw_reuse=1

# 2. Reduce TIME_WAIT timeout (Linux)
sysctl -w net.ipv4.tcp_fin_timeout=30

# 3. Increase local port range
sysctl -w net.ipv4.ip_local_port_range="1024 65535"
```

**Application-level fixes:**

```
# 1. Connection pooling (reuse connections)
- Use HTTP keep-alive
- Use database connection pools
- Use HTTP client with connection reuse

# 2. Let client close connection
- Server waits for client to close
- TIME_WAIT moves to client side

# 3. HTTP/2 or HTTP/3
- Single connection, multiplexed requests
- Fewer connections = fewer TIME_WAITs
```

**Check your connections:**
```bash
# See which ports are in TIME_WAIT
ss -tan state time-wait | awk '{print $4}' | cut -d: -f2 | sort | uniq -c | sort -rn | head

# Check if it's outbound connections
ss -tan state time-wait | awk '{print $5}' | sort | uniq -c | sort -rn | head
```

</details>

---

### Exercise 3: Design a Reliable Protocol over UDP 🔴

**Scenario:** You're building a game server that needs:
- Low latency (UDP-like)
- Reliable delivery for critical messages (player actions)
- Unreliable delivery for frequent updates (positions)

Design a protocol that achieves this.

<details>
<summary>💡 Hints</summary>

- Different message types can have different reliability
- Sequence numbers help detect loss
- Selective acknowledgments for reliability
- Don't implement congestion control for gaming (usually)

</details>

<details>
<summary>✅ Solution</summary>

**Hybrid Reliable UDP Protocol Design:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GAME PROTOCOL HEADER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────┬────────┬────────┬────────┬────────┬────────────────────┐   │
│  │ Type   │ Flags  │ Seq#   │ Ack#   │ AckBits│ Payload            │   │
│  │ 1 byte │ 1 byte │ 2 bytes│ 2 bytes│ 4 bytes│ Variable           │   │
│  └────────┴────────┴────────┴────────┴────────┴────────────────────┘   │
│                                                                          │
│  Type:                                                                   │
│  0x01 = Unreliable (position updates)                                   │
│  0x02 = Reliable (player actions)                                        │
│  0x03 = Reliable-Ordered (chat, game state)                              │
│                                                                          │
│  Flags:                                                                  │
│  Bit 0 = Has ACK                                                         │
│  Bit 1 = Request ACK                                                     │
│                                                                          │
│  AckBits = Bitmap of last 32 sequence numbers received                  │
│            Enables selective acknowledgment                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Message Types:**

```
UNRELIABLE (Position updates - 60 Hz):
┌──────────────────────────────────────────────────────────────────┐
│ - No sequence number needed (or just for ordering)               │
│ - No ACK expected                                                 │
│ - If lost, next update replaces it                               │
│ - Minimal overhead, maximum speed                                 │
│                                                                   │
│ Example: Player position {x, y, z, rotation, velocity}           │
└──────────────────────────────────────────────────────────────────┘

RELIABLE (Player actions):
┌──────────────────────────────────────────────────────────────────┐
│ - Sequence number required                                        │
│ - Requires ACK (via AckBits)                                     │
│ - Retransmit if no ACK within RTT × 1.5                          │
│ - Can arrive out of order, processed immediately                 │
│                                                                   │
│ Example: Fire weapon, pickup item, jump                          │
└──────────────────────────────────────────────────────────────────┘

RELIABLE-ORDERED (Chat, game state):
┌──────────────────────────────────────────────────────────────────┐
│ - Sequence number required                                        │
│ - Requires ACK                                                    │
│ - Must be processed in order (buffer if out of order)            │
│ - Has head-of-line blocking (like TCP) but only for this type   │
│                                                                   │
│ Example: Chat messages, game state changes                        │
└──────────────────────────────────────────────────────────────────┘
```

**Acknowledgment Strategy:**

```
Sender                                           Receiver
   │                                                  │
   │─── Reliable [seq=1] ───────────────────────────►│
   │─── Reliable [seq=2] ───────────────────────────►│
   │─── Reliable [seq=3] ────────────────X (lost)    │
   │─── Reliable [seq=4] ───────────────────────────►│
   │                                                  │
   │◄── Any packet with ACK: ack=2, bits=0b1101 ─────│
   │    (bits: seq 4,3,1,0 received; 3 missing)      │
   │                                                  │
   │    Sender sees seq=3 not acked                   │
   │                                                  │
   │─── Reliable [seq=3] (retransmit) ──────────────►│
   │                                                  │
   │◄── ack=4, bits=0b1111 (all received) ───────────│

ACK is piggy-backed on any outgoing packet
Reduces separate ACK packets
```

**Implementation Pseudocode:**

```python
class ReliableUDP:
    def send_reliable(self, data):
        pkt = Packet(
            type=RELIABLE,
            seq=self.next_seq++,
            payload=data
        )
        self.pending_acks[pkt.seq] = (pkt, time.now())
        self.socket.send(pkt)
    
    def send_unreliable(self, data):
        pkt = Packet(type=UNRELIABLE, payload=data)
        self.socket.send(pkt)
    
    def on_receive(self, pkt):
        # Process ACKs
        if pkt.has_ack:
            for seq in decode_ack_bits(pkt.ack, pkt.ack_bits):
                self.pending_acks.pop(seq, None)
        
        # Handle message
        if pkt.type == UNRELIABLE:
            self.on_message(pkt.payload)
        elif pkt.type == RELIABLE:
            self.received_seqs.add(pkt.seq)
            self.on_message(pkt.payload)
        elif pkt.type == RELIABLE_ORDERED:
            self.order_buffer[pkt.seq] = pkt.payload
            self.deliver_ordered()
    
    def tick(self):
        # Retransmit unacked packets
        now = time.now()
        for seq, (pkt, sent_time) in self.pending_acks.items():
            if now - sent_time > self.rtt * 1.5:
                self.socket.send(pkt)
                self.pending_acks[seq] = (pkt, now)
```

**Real-world examples:**
- **ENet**: Used in many games, similar design
- **Raknet**: Popular game networking library
- **QUIC**: HTTP/3's underlying protocol

</details>

---

## Key Takeaways

- 🤝 **TCP = Reliable**: Connection-oriented, guaranteed delivery, ordered
- 🚀 **UDP = Fast**: Connectionless, best-effort, minimal overhead
- 🔄 **Three-way handshake**: SYN → SYN-ACK → ACK establishes TCP
- 🪟 **Flow control**: Receiver advertises window size
- 📉 **Congestion control**: Slow start, congestion avoidance, loss detection
- ⏰ **TIME_WAIT**: Normal but can accumulate; tune or pool connections
- 🎮 **Modern hybrid**: QUIC provides UDP speed with reliability

---

## Related Topics

- [HTTP & HTTPS](/networking/02-http-and-https.md) - Application layer over TCP
- [WebSockets & Real-Time](/networking/11-websockets-and-real-time.md) - Persistent TCP connections
- [Debugging & Tools](/networking/13-debugging-and-tools.md) - tcpdump, Wireshark analysis
