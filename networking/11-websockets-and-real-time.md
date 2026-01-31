# WebSockets & Real-Time Communication

[← Back to Index](00-index.md)

---

## Overview

Real-time communication enables instant data exchange between clients and servers without the client constantly polling. WebSockets, Server-Sent Events, and other protocols power features like chat, notifications, live dashboards, and multiplayer games.

### When This Matters Most
- Building chat applications
- Live notifications and alerts
- Real-time dashboards and analytics
- Multiplayer games
- Collaborative editing (Google Docs-style)

---

## Real-Time Communication Patterns

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 REAL-TIME COMMUNICATION PATTERNS                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. SHORT POLLING                                                       │
│   ────────────────                                                       │
│   Client ──GET──► Server                                                │
│   Client ◄──200── Server (data or empty)                                │
│   ... wait 5 seconds ...                                                │
│   Client ──GET──► Server                                                │
│   Client ◄──200── Server                                                │
│                                                                          │
│   Pros: Simple, works everywhere                                        │
│   Cons: Latency (up to poll interval), wasteful requests               │
│                                                                          │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                          │
│   2. LONG POLLING                                                        │
│   ─────────────────                                                      │
│   Client ──GET──► Server                                                │
│                   │ (holds connection open)                             │
│                   │ ... waits for data ...                              │
│   Client ◄──200── Server (data available!)                              │
│   Client ──GET──► Server (immediately reconnects)                       │
│                                                                          │
│   Pros: Lower latency than short polling                                │
│   Cons: Connection overhead, timeouts, complex                          │
│                                                                          │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                          │
│   3. SERVER-SENT EVENTS (SSE)                                            │
│   ───────────────────────────                                            │
│   Client ──GET──► Server                                                │
│   Client ◄─────── Server (event stream, keeps open)                     │
│   Client ◄──data─ Server (push anytime)                                 │
│   Client ◄──data─ Server                                                │
│                                                                          │
│   Pros: Simple, auto-reconnect, built-in                                │
│   Cons: One-way only (server→client), no binary                        │
│                                                                          │
│   ─────────────────────────────────────────────────────────────────     │
│                                                                          │
│   4. WEBSOCKETS                                                          │
│   ─────────────                                                          │
│   Client ══════════════════════════════════ Server                      │
│          ◄──────── bidirectional ────────►                              │
│   Client ──data──► Server                                               │
│   Client ◄──data── Server                                               │
│   Client ──data──► Server                                               │
│                                                                          │
│   Pros: Full-duplex, low latency, binary support                        │
│   Cons: More complex, stateful connections                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comparison Table

| Feature | Short Polling | Long Polling | SSE | WebSocket |
|---------|--------------|--------------|-----|-----------|
| **Direction** | Client→Server | Client→Server | Server→Client | Bidirectional |
| **Latency** | High (poll interval) | Medium | Low | Very Low |
| **Overhead** | High (many requests) | Medium | Low | Very Low |
| **Binary data** | ✅ (base64) | ✅ (base64) | ❌ | ✅ |
| **Auto-reconnect** | N/A | Manual | Built-in | Manual |
| **Browser support** | All | All | Most | All modern |
| **Firewall friendly** | ✅ | ✅ | ✅ | Sometimes issues |

---

## WebSocket Protocol Deep Dive

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      WEBSOCKET HANDSHAKE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Step 1: HTTP Upgrade Request                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ GET /chat HTTP/1.1                                              │   │
│   │ Host: server.example.com                                        │   │
│   │ Upgrade: websocket                                              │   │
│   │ Connection: Upgrade                                             │   │
│   │ Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==                    │   │
│   │ Sec-WebSocket-Version: 13                                       │   │
│   │ Sec-WebSocket-Protocol: chat, superchat                        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Step 2: Server Upgrade Response                                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ HTTP/1.1 101 Switching Protocols                                │   │
│   │ Upgrade: websocket                                              │   │
│   │ Connection: Upgrade                                             │   │
│   │ Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=             │   │
│   │ Sec-WebSocket-Protocol: chat                                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Step 3: WebSocket Connection Established!                              │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Client ◄═══════ Binary frames ═══════► Server                  │   │
│   │         (text, binary, ping, pong, close)                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Key points:                                                            │
│   - Starts as HTTP, upgrades to WebSocket                               │
│   - Uses same TCP connection                                            │
│   - wss:// for secure (like https://)                                   │
│   - Connection is persistent until closed                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### WebSocket Frame Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      WEBSOCKET FRAME                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│    0                   1                   2                   3        │
│    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1     │
│   +-+-+-+-+-------+-+-------------+-------------------------------+     │
│   |F|R|R|R| opcode|M| Payload len |    Extended payload length    |     │
│   |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |     │
│   |N|V|V|V|       |S|             |   (if payload len==126/127)   |     │
│   | |1|2|3|       |K|             |                               |     │
│   +-+-+-+-+-------+-+-------------+-------------------------------+     │
│   |     Masking-key (if MASK set, 4 bytes)                        |     │
│   +---------------------------------------------------------------+     │
│   |                     Payload Data                               |     │
│   +---------------------------------------------------------------+     │
│                                                                          │
│   Opcodes:                                                               │
│   0x0 = Continuation frame                                              │
│   0x1 = Text frame (UTF-8)                                              │
│   0x2 = Binary frame                                                    │
│   0x8 = Connection close                                                │
│   0x9 = Ping                                                            │
│   0xA = Pong                                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Examples

### Node.js WebSocket Server (ws library)

```javascript
const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('WebSocket server running');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Track connected clients
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = generateId();
  clients.set(clientId, ws);
  
  console.log(`Client ${clientId} connected from ${req.socket.remoteAddress}`);
  
  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'welcome', 
    clientId,
    message: 'Connected to chat server' 
  }));
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(clientId, message);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });
  
  // Handle ping/pong for keepalive
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  
  // Handle disconnect
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
    broadcast({ type: 'user_left', clientId });
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`Client ${clientId} error:`, error);
  });
});

// Broadcast to all clients
function broadcast(message, excludeId = null) {
  const data = JSON.stringify(message);
  clients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

// Handle different message types
function handleMessage(clientId, message) {
  switch (message.type) {
    case 'chat':
      broadcast({
        type: 'chat',
        from: clientId,
        text: message.text,
        timestamp: Date.now()
      });
      break;
      
    case 'typing':
      broadcast({ type: 'typing', clientId }, clientId);
      break;
  }
}

// Heartbeat to detect dead connections
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

server.listen(8080, () => {
  console.log('Server running on ws://localhost:8080');
});
```

### Browser Client

```javascript
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.handlers = new Map();
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.emit(message.type, message);
      } catch (e) {
        console.error('Invalid message:', event.data);
      }
    };
    
    this.ws.onclose = (event) => {
      console.log('Disconnected:', event.code, event.reason);
      this.emit('disconnected');
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }
  
  send(type, data = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    } else {
      console.warn('WebSocket not connected');
    }
  }
  
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
  }
  
  emit(event, data) {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
  
  close() {
    this.ws?.close(1000, 'Client closing');
  }
}

// Usage
const client = new WebSocketClient('wss://api.example.com/ws');

client.on('connected', () => {
  console.log('Ready to chat!');
});

client.on('chat', (message) => {
  console.log(`${message.from}: ${message.text}`);
});

client.connect();

// Send a message
client.send('chat', { text: 'Hello everyone!' });
```

---

## Server-Sent Events (SSE)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SERVER-SENT EVENTS                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   HTTP Request:                                                          │
│   GET /events HTTP/1.1                                                  │
│   Accept: text/event-stream                                             │
│                                                                          │
│   HTTP Response (stays open):                                            │
│   HTTP/1.1 200 OK                                                       │
│   Content-Type: text/event-stream                                       │
│   Cache-Control: no-cache                                               │
│   Connection: keep-alive                                                │
│                                                                          │
│   Event format:                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ event: message                                                  │   │
│   │ id: 12345                                                       │   │
│   │ retry: 5000                                                     │   │
│   │ data: {"user": "alice", "text": "Hello!"}                      │   │
│   │                                                                 │   │
│   │ event: notification                                             │   │
│   │ data: {"type": "alert", "message": "New order"}                │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Features:                                                              │
│   - Automatic reconnection (browser handles it)                         │
│   - Last-Event-ID sent on reconnect                                     │
│   - Simple text protocol                                                │
│   - Works over HTTP/2                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### SSE Server (Node.js)

```javascript
const express = require('express');
const app = express();

// Store connected clients
const clients = new Map();

app.get('/events', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial connection event
  const clientId = Date.now();
  res.write(`event: connected\ndata: {"clientId": ${clientId}}\n\n`);
  
  // Store client
  clients.set(clientId, res);
  
  // Handle client disconnect
  req.on('close', () => {
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
});

// Send event to all clients
function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((res) => {
    res.write(message);
  });
}

// Example: Send notifications
setInterval(() => {
  broadcast('heartbeat', { timestamp: Date.now() });
}, 30000);

app.listen(3000);
```

### SSE Client (Browser)

```javascript
const eventSource = new EventSource('/events');

eventSource.onopen = () => {
  console.log('SSE connected');
};

eventSource.onmessage = (event) => {
  // Default event type
  console.log('Message:', JSON.parse(event.data));
};

eventSource.addEventListener('notification', (event) => {
  // Custom event type
  const data = JSON.parse(event.data);
  showNotification(data);
});

eventSource.addEventListener('connected', (event) => {
  const { clientId } = JSON.parse(event.data);
  console.log('Connected with ID:', clientId);
});

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  // Browser will automatically reconnect
};

// Close connection
// eventSource.close();
```

---

## Scaling WebSockets

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   SCALING WEBSOCKET SERVERS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Challenge: WebSocket connections are stateful!                        │
│   Client connects to Server A, must always talk to Server A             │
│                                                                          │
│   Solution 1: Sticky Sessions                                            │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Client ──► Load Balancer ──► Server A (always same server)     │   │
│   │            (IP hash or cookie)                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│   Problem: Server failure loses all its connections                     │
│                                                                          │
│   Solution 2: Pub/Sub Backend (Redis)                                    │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                 │   │
│   │   ┌──────────┐    ┌──────────┐    ┌──────────┐                │   │
│   │   │ Server A │    │ Server B │    │ Server C │                │   │
│   │   │ (WS)     │    │ (WS)     │    │ (WS)     │                │   │
│   │   └────┬─────┘    └────┬─────┘    └────┬─────┘                │   │
│   │        │               │               │                       │   │
│   │        └───────────────┼───────────────┘                       │   │
│   │                        ▼                                       │   │
│   │                 ┌────────────┐                                 │   │
│   │                 │   Redis    │                                 │   │
│   │                 │  Pub/Sub   │                                 │   │
│   │                 └────────────┘                                 │   │
│   │                                                                 │   │
│   │ Message flow:                                                   │   │
│   │ 1. Client on Server A sends message                            │   │
│   │ 2. Server A publishes to Redis                                 │   │
│   │ 3. All servers receive via Redis subscription                  │   │
│   │ 4. Each server broadcasts to its connected clients             │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Solution 3: Managed Services                                           │
│   - AWS API Gateway WebSocket                                           │
│   - Pusher, Ably, PubNub                                                │
│   - Socket.io with Redis adapter                                        │
│   - Firebase Realtime Database                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Socket.io with Redis Adapter

```javascript
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const io = new Server(3000);

// Create Redis clients
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  // Use Redis adapter for multi-server support
  io.adapter(createAdapter(pubClient, subClient));
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join a room
    socket.on('join', (room) => {
      socket.join(room);
      io.to(room).emit('user_joined', { userId: socket.id, room });
    });
    
    // Send message to room
    socket.on('message', ({ room, text }) => {
      io.to(room).emit('message', { 
        from: socket.id, 
        text, 
        timestamp: Date.now() 
      });
    });
  });
});
```

---

## WebSocket Security

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      WEBSOCKET SECURITY                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. USE WSS (WebSocket Secure)                                          │
│   ─────────────────────────────                                          │
│   Always use wss:// in production (TLS encrypted)                       │
│   Never use ws:// over public internet                                  │
│                                                                          │
│   2. AUTHENTICATION                                                      │
│   ─────────────────                                                      │
│   Option A: Token in URL (simple but logged)                            │
│   wss://api.example.com/ws?token=jwt_token_here                         │
│                                                                          │
│   Option B: First message authentication (better)                       │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ 1. Connect to WebSocket                                         │   │
│   │ 2. Send: { type: 'auth', token: 'jwt_token' }                   │   │
│   │ 3. Server validates, responds with success/failure             │   │
│   │ 4. Server disconnects if auth fails                            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Option C: Cookie-based (best for browsers)                            │
│   - Use HTTP-only cookie with session ID                                │
│   - Cookie sent automatically with handshake                            │
│                                                                          │
│   3. VALIDATE ORIGIN                                                     │
│   ──────────────────                                                     │
│   Check Origin header during handshake                                  │
│   Reject connections from unexpected origins                            │
│                                                                          │
│   4. RATE LIMITING                                                       │
│   ────────────────                                                       │
│   - Limit connections per IP                                            │
│   - Limit messages per second per client                                │
│   - Limit payload size                                                   │
│                                                                          │
│   5. INPUT VALIDATION                                                    │
│   ───────────────────                                                    │
│   - Validate all incoming messages                                      │
│   - Sanitize before broadcasting                                        │
│   - Use JSON schema validation                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Exercises

### Exercise 1: Choose the Right Protocol 🟢

**Scenario:** Which real-time technology would you use for:

1. Live stock ticker (server pushes price updates)
2. Multi-player browser game (player movements)
3. Notification bell (occasional alerts)
4. Collaborative document editing

<details>
<summary>✅ Solution</summary>

```
1. Live stock ticker
   → Server-Sent Events (SSE)
   - Server-to-client only
   - Simple, reliable, auto-reconnect
   - High frequency updates work well
   - Alternative: WebSocket if client needs to subscribe/unsubscribe

2. Multi-player browser game
   → WebSocket
   - Bidirectional (player sends input, receives game state)
   - Low latency critical
   - Binary data support for efficiency
   - Need fast message exchange

3. Notification bell
   → Server-Sent Events (SSE) or Long Polling
   - Occasional updates (low frequency)
   - One-way communication
   - SSE simpler, auto-reconnect
   - Long polling if SSE not supported

4. Collaborative document editing
   → WebSocket
   - Bidirectional (send changes, receive others' changes)
   - Low latency for real-time feel
   - Need reliable ordering (OT/CRDT)
   - Complex sync requires full-duplex
```

</details>

---

### Exercise 2: Implement Heartbeat 🟡

**Scenario:** Your WebSocket connections are being dropped after 60 seconds of inactivity (proxy timeout). Implement a heartbeat mechanism.

Requirements:
- Server sends ping every 30 seconds
- Client responds with pong
- Server closes dead connections

<details>
<summary>💡 Hints</summary>

- WebSocket protocol has built-in ping/pong frames
- Track last pong time per connection
- Consider what happens if client doesn't respond

</details>

<details>
<summary>✅ Solution</summary>

```javascript
// Server-side heartbeat implementation
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Track connection health
function heartbeat() {
  this.isAlive = true;
  this.lastPong = Date.now();
}

wss.on('connection', (ws) => {
  // Initialize health tracking
  ws.isAlive = true;
  ws.lastPong = Date.now();
  
  // Handle pong responses
  ws.on('pong', heartbeat);
  
  // Handle application-level ping (for browsers that can't send ping frames)
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (e) {
      // Not JSON, handle as regular message
    }
  });
});

// Heartbeat interval
const HEARTBEAT_INTERVAL = 30000;  // 30 seconds
const HEARTBEAT_TIMEOUT = 35000;   // 35 seconds (grace period)

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    // Check if connection is dead
    if (!ws.isAlive) {
      console.log('Terminating dead connection');
      return ws.terminate();
    }
    
    // Check for stale connections
    if (Date.now() - ws.lastPong > HEARTBEAT_TIMEOUT) {
      console.log('Connection timed out');
      return ws.terminate();
    }
    
    // Send ping
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

// Cleanup on server close
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// -------------------------------------------
// Client-side (browser)
// -------------------------------------------

class WebSocketWithHeartbeat {
  constructor(url) {
    this.url = url;
    this.pingInterval = null;
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Connected');
      this.startHeartbeat();
    };
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'pong') {
        console.log('Received pong, latency:', Date.now() - msg.timestamp);
      }
    };
    
    this.ws.onclose = () => {
      this.stopHeartbeat();
      // Reconnect logic...
    };
  }
  
  startHeartbeat() {
    // Send application-level ping every 25 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 25000);
  }
  
  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
```

**Key considerations:**
- Server uses protocol-level ping (efficient, 2 bytes)
- Client uses application-level ping (browsers can't send ws ping)
- 30s interval &lt; 60s proxy timeout
- Grace period for slow responses
- Clean termination for dead connections

</details>

---

### Exercise 3: Design Chat Room Architecture 🔴

**Scenario:** Design a scalable chat system supporting:
- 100,000 concurrent users
- 1,000 chat rooms
- Message history (last 100 messages per room)
- User presence (online/offline status)
- Typing indicators

Describe the architecture and data flow.

<details>
<summary>💡 Hints</summary>

- Consider horizontal scaling (multiple WS servers)
- How do messages reach users on different servers?
- Where to store message history?
- How to efficiently broadcast presence updates?

</details>

<details>
<summary>✅ Solution</summary>

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CHAT SYSTEM ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                      CLIENTS (100K users)                         │  │
│   └────────────────────────────┬─────────────────────────────────────┘  │
│                                │                                         │
│                                ▼                                         │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ Load Balancer (ALB/NLB with sticky sessions or IP hash)         │  │
│   └────────────────────────────┬─────────────────────────────────────┘  │
│            ┌───────────────────┼───────────────────┐                    │
│            ▼                   ▼                   ▼                    │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐          │
│   │  WS Server 1    │ │  WS Server 2    │ │  WS Server N    │          │
│   │  (10K conns)    │ │  (10K conns)    │ │  (10K conns)    │          │
│   └────────┬────────┘ └────────┬────────┘ └────────┬────────┘          │
│            └───────────────────┼───────────────────┘                    │
│                                ▼                                         │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                   Redis Cluster (Pub/Sub)                        │  │
│   │  ┌────────────┬────────────┬────────────┬────────────┐          │  │
│   │  │ rooms:*    │ presence:* │ typing:*   │ sessions:* │          │  │
│   │  │ (pub/sub)  │ (sorted    │ (pub/sub)  │ (hash)     │          │  │
│   │  │            │  set + TTL)│            │            │          │  │
│   │  └────────────┴────────────┴────────────┴────────────┘          │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                │                                         │
│   ┌────────────────────────────┼────────────────────────────────────┐   │
│   │                            ▼                                     │   │
│   │   ┌────────────────────────────────────────────────────────┐    │   │
│   │   │     PostgreSQL / MongoDB (persistent storage)          │    │   │
│   │   │  ┌─────────────┬─────────────┬─────────────────────┐   │    │   │
│   │   │  │  messages   │    users    │      rooms          │   │    │   │
│   │   │  │  (capped)   │             │                     │   │    │   │
│   │   │  └─────────────┴─────────────┴─────────────────────┘   │    │   │
│   │   └────────────────────────────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data Flow - Sending Message:**

```javascript
// 1. Client sends message
ws.send({ type: 'message', room: 'room123', text: 'Hello!' });

// 2. Server receives, validates
async function handleMessage(userId, { room, text }) {
  // Validate user is in room
  const isMember = await redis.sismember(`room:${room}:members`, userId);
  if (!isMember) throw new Error('Not a member');
  
  // Create message
  const message = {
    id: generateId(),
    room,
    userId,
    text,
    timestamp: Date.now()
  };
  
  // 3. Persist to database (async, don't wait)
  messageQueue.add('save_message', message);
  
  // 4. Publish to Redis for all servers
  await redis.publish(`room:${room}`, JSON.stringify(message));
}

// 5. All servers subscribed, broadcast to local clients
redis.subscribe(`room:${roomId}`, (message) => {
  const data = JSON.parse(message);
  
  // Find local clients in this room
  const roomClients = localRooms.get(data.room) || [];
  roomClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'message', ...data }));
    }
  });
});
```

**Presence System:**

```javascript
// User connects
async function userConnected(userId) {
  // Add to sorted set with timestamp (for "last seen")
  await redis.zadd('presence:online', Date.now(), userId);
  
  // Publish presence change
  await redis.publish('presence:changes', JSON.stringify({
    userId,
    status: 'online',
    timestamp: Date.now()
  }));
}

// User disconnects
async function userDisconnected(userId) {
  await redis.zrem('presence:online', userId);
  await redis.publish('presence:changes', JSON.stringify({
    userId,
    status: 'offline',
    timestamp: Date.now()
  }));
}

// Cleanup stale presence (heartbeat based)
setInterval(async () => {
  const staleThreshold = Date.now() - 60000; // 60s
  const staleUsers = await redis.zrangebyscore('presence:online', 0, staleThreshold);
  
  for (const userId of staleUsers) {
    await userDisconnected(userId);
  }
}, 30000);
```

**Typing Indicators:**

```javascript
// Typing - ephemeral, high frequency
// Don't persist, use pub/sub only
async function userTyping(userId, room) {
  // Publish with short TTL concept
  await redis.publish(`typing:${room}`, JSON.stringify({
    userId,
    timestamp: Date.now(),
    expiresIn: 3000  // 3 seconds
  }));
}

// Client side - debounce typing events
const typingDebounce = debounce(() => {
  ws.send({ type: 'typing', room: currentRoom });
}, 300);

// Client side - show/hide indicator
let typingTimeouts = new Map();

function handleTyping(userId) {
  showTypingIndicator(userId);
  
  // Clear existing timeout
  if (typingTimeouts.has(userId)) {
    clearTimeout(typingTimeouts.get(userId));
  }
  
  // Hide after 3 seconds
  typingTimeouts.set(userId, setTimeout(() => {
    hideTypingIndicator(userId);
    typingTimeouts.delete(userId);
  }, 3000));
}
```

**Message History:**

```javascript
// Load history when joining room
async function getMessageHistory(room, limit = 100) {
  // Try cache first
  const cached = await redis.lrange(`history:${room}`, 0, limit - 1);
  if (cached.length > 0) {
    return cached.map(JSON.parse);
  }
  
  // Fallback to database
  const messages = await db.messages
    .find({ room })
    .sort({ timestamp: -1 })
    .limit(limit);
  
  // Cache for next request
  await redis.lpush(`history:${room}`, ...messages.map(JSON.stringify));
  await redis.ltrim(`history:${room}`, 0, 99);  // Keep last 100
  await redis.expire(`history:${room}`, 3600);  // 1 hour TTL
  
  return messages.reverse();
}
```

**Scaling numbers:**
- 10 WS servers, 10K connections each = 100K users
- Redis Cluster for high availability
- Database sharded by room ID for write scaling
- CDN for static assets
- Separate presence service if needed (high traffic)

</details>

---

## Key Takeaways

- 🔌 **WebSocket = Full duplex**: Bidirectional, persistent connection
- 📡 **SSE = Simple server push**: One-way, auto-reconnect, easier to implement
- 🔄 **Polling still works**: For simple cases or fallback
- 🏗️ **Scaling is hard**: Use pub/sub (Redis) for multi-server
- 🔐 **Secure connections**: Always use wss://, validate origin
- 💓 **Heartbeat is essential**: Detect dead connections, prevent proxy timeouts

---

## Related Topics

- [HTTP & HTTPS](02-http-and-https.md) - HTTP/2 server push, upgrade mechanism
- [TCP & UDP](04-tcp-and-udp.md) - Underlying transport
- [Load Balancing](08-load-balancing.md) - Sticky sessions for WebSocket
