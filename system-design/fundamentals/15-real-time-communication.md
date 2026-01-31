# Real-Time Communication

[← Back to Fundamentals](00-index.md)

---

## Overview

Real-time communication enables instant data delivery between clients and servers. This guide covers WebSockets, Server-Sent Events, long polling, and when to use each approach. Essential for chat applications, live feeds, collaborative editing, and gaming.

---

## 📊 Communication Approaches Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│              REAL-TIME COMMUNICATION OPTIONS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HTTP Polling          Long Polling          SSE                │
│  ────────────          ────────────          ───                │
│                                                                 │
│  Client  Server        Client  Server       Client  Server      │
│    │       │             │       │            │       │         │
│    │──req──►│             │──req──►│            │───────►│       │
│    │◄──res──│             │       │            │◄──────│        │
│    │       │             │  wait │            │◄──────│        │
│    │──req──►│             │       │            │◄──────│        │
│    │◄──res──│             │◄──res──│            │       │        │
│    │       │             │──req──►│            │◄──────│        │
│                          │       │            (continues)       │
│                                                                 │
│  WebSocket             gRPC Streaming       WebRTC              │
│  ─────────             ──────────────       ──────              │
│                                                                 │
│  Client  Server        Client  Server       Peer    Peer        │
│    │       │             │       │            │       │         │
│    │◄═════►│             │───────►│            │◄══════►│        │
│    │◄═════►│             │◄──────│            │◄══════►│        │
│    │◄═════►│             │◄──────│            │◄══════►│        │
│    (bi-dir)             (streaming)          (P2P)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Comparison

| Approach | Direction | Latency | Complexity | Use Case |
|----------|-----------|---------|------------|----------|
| **HTTP Polling** | Client→Server | High | Simple | Legacy, low frequency |
| **Long Polling** | Client→Server | Medium | Medium | Chat, notifications |
| **SSE** | Server→Client | Low | Simple | Live feeds, dashboards |
| **WebSocket** | Bidirectional | Low | Medium | Chat, gaming, trading |
| **gRPC Stream** | Both/Either | Low | Complex | Microservices |
| **WebRTC** | P2P | Very Low | Complex | Video, audio, gaming |

---

## 🔌 WebSockets

### How WebSockets Work

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBSOCKET HANDSHAKE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. HTTP Upgrade Request:                                       │
│  ───────────────────────                                        │
│  GET /chat HTTP/1.1                                             │
│  Host: server.example.com                                       │
│  Upgrade: websocket                                             │
│  Connection: Upgrade                                            │
│  Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==                   │
│  Sec-WebSocket-Version: 13                                      │
│                                                                 │
│  2. Server Upgrade Response:                                    │
│  ───────────────────────────                                    │
│  HTTP/1.1 101 Switching Protocols                               │
│  Upgrade: websocket                                             │
│  Connection: Upgrade                                            │
│  Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=             │
│                                                                 │
│  3. Full-duplex communication:                                  │
│  ─────────────────────────────                                  │
│  Client ◄══════════════════════► Server                         │
│         Binary or text frames                                   │
│         Ping/pong for keepalive                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### WebSocket Server Example

```javascript
// Node.js with ws library
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Track connected clients
const clients = new Map();

wss.on('connection', (ws, req) => {
    const userId = req.url.split('?userId=')[1];
    clients.set(userId, ws);
    
    console.log(`User ${userId} connected`);
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        handleMessage(userId, message);
    });
    
    ws.on('close', () => {
        clients.delete(userId);
        console.log(`User ${userId} disconnected`);
    });
    
    // Send ping every 30 seconds
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
        }
    }, 30000);
    
    ws.on('close', () => clearInterval(pingInterval));
});

function handleMessage(senderId, message) {
    switch (message.type) {
        case 'chat':
            // Send to recipient
            const recipient = clients.get(message.recipientId);
            if (recipient?.readyState === WebSocket.OPEN) {
                recipient.send(JSON.stringify({
                    type: 'chat',
                    from: senderId,
                    content: message.content,
                    timestamp: Date.now()
                }));
            }
            break;
            
        case 'broadcast':
            // Send to all clients
            clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(message));
                }
            });
            break;
    }
}
```

### WebSocket Client Example

```javascript
class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
            console.log('Connected');
            this.reconnectAttempts = 0;
        };
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected');
            this.reconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.pow(2, this.reconnectAttempts) * 1000;
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect();
            }, delay);
        }
    }
    
    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}
```

---

## 📤 Server-Sent Events (SSE)

### How SSE Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER-SENT EVENTS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  One-way: Server → Client only                                  │
│  Uses standard HTTP                                             │
│  Auto-reconnect built-in                                        │
│                                                                 │
│  Request:                                                       │
│  GET /events HTTP/1.1                                           │
│  Accept: text/event-stream                                      │
│                                                                 │
│  Response:                                                      │
│  HTTP/1.1 200 OK                                                │
│  Content-Type: text/event-stream                                │
│  Cache-Control: no-cache                                        │
│  Connection: keep-alive                                         │
│                                                                 │
│  data: {"message": "Hello"}                                     │
│                                                                 │
│  data: {"message": "World"}                                     │
│                                                                 │
│  event: notification                                            │
│  data: {"type": "alert"}                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### SSE Server Example

```javascript
// Express.js SSE endpoint
app.get('/events', (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
    // Keep-alive every 30 seconds
    const keepAlive = setInterval(() => {
        res.write(': keepalive\n\n');
    }, 30000);
    
    // Subscribe to updates
    const subscriber = (message) => {
        res.write(`data: ${JSON.stringify(message)}\n\n`);
    };
    eventEmitter.on('update', subscriber);
    
    // Cleanup on disconnect
    req.on('close', () => {
        clearInterval(keepAlive);
        eventEmitter.off('update', subscriber);
    });
});
```

### SSE Client Example

```javascript
const eventSource = new EventSource('/events');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Message:', data);
};

eventSource.addEventListener('notification', (event) => {
    const data = JSON.parse(event.data);
    showNotification(data);
});

eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    // EventSource auto-reconnects
};

// To close
eventSource.close();
```

---

## ⏳ Long Polling

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    LONG POLLING                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client              Server                                     │
│     │                   │                                       │
│     │───GET /poll──────►│                                       │
│     │                   │ (holds request open)                  │
│     │                   │                                       │
│     │                   │ ...waiting for data...                │
│     │                   │                                       │
│     │                   │ Data arrives!                         │
│     │◄──Response────────│                                       │
│     │                   │                                       │
│     │───GET /poll──────►│ (immediately reconnect)               │
│     │                   │                                       │
│                                                                 │
│  Timeout handling:                                              │
│  - Server returns empty after ~30 seconds                       │
│  - Client immediately reconnects                                │
│  - Prevents connection timeout issues                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Long Polling Implementation

```javascript
// Server
app.get('/poll', async (req, res) => {
    const userId = req.query.userId;
    const timeout = 30000; // 30 seconds
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        const messages = await checkForNewMessages(userId);
        
        if (messages.length > 0) {
            return res.json({ messages });
        }
        
        // Wait 100ms before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Timeout - return empty
    res.json({ messages: [] });
});

// Client
async function longPoll() {
    while (true) {
        try {
            const response = await fetch('/poll?userId=123');
            const data = await response.json();
            
            if (data.messages.length > 0) {
                handleMessages(data.messages);
            }
        } catch (error) {
            console.error('Poll error:', error);
            await new Promise(r => setTimeout(r, 1000)); // Wait before retry
        }
    }
}
```

---

## 🏗️ Scaling Real-Time Systems

### The Challenge

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCALING CHALLENGE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Problem: Users connected to different servers                  │
│                                                                 │
│           ┌──────────┐         ┌──────────┐                    │
│           │ Server 1 │         │ Server 2 │                    │
│           │          │         │          │                    │
│           │ User A   │         │ User B   │                    │
│           │ User C   │         │ User D   │                    │
│           └──────────┘         └──────────┘                    │
│                                                                 │
│  User A wants to message User B                                 │
│  But A is on Server 1, B is on Server 2!                       │
│                                                                 │
│  Solution: Pub/Sub backbone                                     │
│                                                                 │
│           ┌──────────┐         ┌──────────┐                    │
│           │ Server 1 │         │ Server 2 │                    │
│           └────┬─────┘         └────┬─────┘                    │
│                │                    │                          │
│                └───────┬────────────┘                          │
│                        │                                        │
│                   ┌────┴────┐                                  │
│                   │  Redis  │                                  │
│                   │  Pub/Sub│                                  │
│                   └─────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Redis Pub/Sub for WebSocket Scaling

```javascript
const redis = require('redis');
const WebSocket = require('ws');

// Create pub/sub clients
const subscriber = redis.createClient();
const publisher = redis.createClient();

// Each server subscribes to channels
subscriber.subscribe('chat:global');
subscriber.subscribe(`chat:server:${SERVER_ID}`);

subscriber.on('message', (channel, message) => {
    const data = JSON.parse(message);
    
    // Find target user on this server
    const targetClient = clients.get(data.targetUserId);
    if (targetClient) {
        targetClient.send(JSON.stringify(data.message));
    }
});

// When user sends a message
function handleChatMessage(senderId, recipientId, content) {
    const message = {
        targetUserId: recipientId,
        message: {
            from: senderId,
            content,
            timestamp: Date.now()
        }
    };
    
    // Check if recipient is on this server
    const localClient = clients.get(recipientId);
    if (localClient) {
        localClient.send(JSON.stringify(message.message));
    } else {
        // Publish to Redis - other servers will receive
        publisher.publish('chat:global', JSON.stringify(message));
    }
}
```

### Presence and Connection Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENCE SYSTEM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Track which users are online and where they're connected       │
│                                                                 │
│  Redis Hash: user_presence                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  user_123  →  {"server": "ws-1", "last_seen": 1699...}  │   │
│  │  user_456  →  {"server": "ws-2", "last_seen": 1699...}  │   │
│  │  user_789  →  {"server": "ws-1", "last_seen": 1699...}  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Redis Sorted Set: online_users                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Score: timestamp, Member: userId                        │   │
│  │  Use ZRANGEBYSCORE to find stale connections             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Heartbeat:                                                     │
│  - Client sends ping every 30 seconds                          │
│  - Server updates last_seen in Redis                           │
│  - Background job removes stale entries                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Connection Authentication

### Token-Based WebSocket Auth

```javascript
// Client: Connect with token in query string
const ws = new WebSocket(`wss://api.example.com/ws?token=${authToken}`);

// Server: Verify token on connection
wss.on('connection', async (ws, req) => {
    const token = new URL(req.url, 'http://localhost').searchParams.get('token');
    
    try {
        const user = await verifyJWT(token);
        ws.userId = user.id;
        ws.isAuthenticated = true;
        
        clients.set(user.id, ws);
    } catch (error) {
        ws.close(4001, 'Unauthorized');
        return;
    }
});

// Alternative: Auth after connection
wss.on('connection', (ws) => {
    ws.isAuthenticated = false;
    
    // Set auth timeout
    const authTimeout = setTimeout(() => {
        if (!ws.isAuthenticated) {
            ws.close(4001, 'Auth timeout');
        }
    }, 5000);
    
    ws.on('message', async (data) => {
        const message = JSON.parse(data);
        
        if (!ws.isAuthenticated) {
            if (message.type === 'auth') {
                const user = await verifyToken(message.token);
                if (user) {
                    ws.isAuthenticated = true;
                    ws.userId = user.id;
                    clearTimeout(authTimeout);
                    ws.send(JSON.stringify({ type: 'auth_success' }));
                } else {
                    ws.close(4001, 'Invalid token');
                }
            }
            return;
        }
        
        // Handle authenticated messages
        handleMessage(ws, message);
    });
});
```

---

## 🎯 When to Use What

```
┌─────────────────────────────────────────────────────────────────┐
│                    DECISION GUIDE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Use WebSocket when:                                            │
│  ✓ Bidirectional communication needed                           │
│  ✓ Low latency critical (gaming, trading)                       │
│  ✓ High message frequency                                       │
│  ✓ Chat applications                                            │
│                                                                 │
│  Use SSE when:                                                  │
│  ✓ Server-to-client only                                        │
│  ✓ Live feeds, notifications                                    │
│  ✓ Dashboard updates                                            │
│  ✓ Want simpler implementation                                  │
│  ✓ Auto-reconnect important                                     │
│                                                                 │
│  Use Long Polling when:                                         │
│  ✓ Need to support old browsers                                 │
│  ✓ Behind restrictive firewalls                                 │
│  ✓ Low message frequency                                        │
│  ✓ Simple fallback needed                                       │
│                                                                 │
│  Use WebRTC when:                                               │
│  ✓ Peer-to-peer needed                                          │
│  ✓ Video/audio streaming                                        │
│  ✓ Lowest possible latency                                      │
│  ✓ Want to reduce server load                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Key Takeaways

1. **WebSocket for bidirectional** - Chat, gaming, collaborative editing
2. **SSE for server push** - Simpler, auto-reconnect, HTTP-based
3. **Scale with Pub/Sub** - Redis for cross-server communication
4. **Handle reconnection** - Clients will disconnect, plan for it
5. **Authenticate connections** - Token validation on connect
6. **Heartbeat for health** - Detect dead connections
7. **Consider fallbacks** - Long polling as backup

---

## 📚 Related Topics

- [API Design](04-api-design.md) - REST and GraphQL alternatives
- [Message Queues](09-message-queues.md) - Async messaging
- [Load Balancing](08-load-balancing.md) - Sticky sessions for WebSockets
- [Caching](07-caching.md) - Redis for presence/pub-sub
