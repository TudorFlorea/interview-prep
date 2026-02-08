# API Design

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

API design defines the contract between your system and its clients. Good API design makes systems intuitive to use, maintainable, and evolvable. In system design interviews, demonstrating strong API design skills shows you understand how components communicate and can think about the developer experience.

---

## 🌐 API Paradigms Comparison

### REST vs GraphQL vs gRPC

```
┌─────────────────────────────────────────────────────────────────┐
│                    API PARADIGMS COMPARISON                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  REST (Representational State Transfer)                         │
│  ───────────────────────────────────────                        │
│  • Resource-based URLs: /users/123/posts                        │
│  • HTTP methods: GET, POST, PUT, DELETE                         │
│  • Stateless                                                    │
│  • Best for: CRUD operations, public APIs, web services         │
│                                                                 │
│  GraphQL                                                        │
│  ───────────────────────────────────────                        │
│  • Single endpoint: /graphql                                    │
│  • Client specifies exact data needed                           │
│  • Reduces over/under-fetching                                  │
│  • Best for: Complex data requirements, mobile apps             │
│                                                                 │
│  gRPC (Google Remote Procedure Call)                            │
│  ───────────────────────────────────────                        │
│  • Binary protocol (Protocol Buffers)                           │
│  • Strongly typed schemas                                       │
│  • Bidirectional streaming                                      │
│  • Best for: Microservices, low latency, internal APIs          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### When to Use Each

| Paradigm | Use When | Avoid When |
|----------|----------|------------|
| **REST** | Public APIs, simple CRUD, browser clients | Complex nested data, real-time needs |
| **GraphQL** | Mobile apps, complex queries, multiple data sources | Simple APIs, caching is critical |
| **gRPC** | Microservices, streaming, performance-critical | Browser clients, simple integrations |

---

## 🔧 REST API Design

### Resource Naming Conventions

```
Good:
─────────────────────────────────────────────
GET    /users                    List users
GET    /users/123                Get user 123
POST   /users                    Create user
PUT    /users/123                Update user 123
DELETE /users/123                Delete user 123
GET    /users/123/posts          Get user's posts
POST   /users/123/posts          Create post for user

Bad:
─────────────────────────────────────────────
GET    /getUsers                 ❌ Verb in URL
POST   /createUser               ❌ Redundant with method
GET    /user/123                 ❌ Singular (use plural)
GET    /users/123/getPostsList   ❌ Unnecessary suffix
```

### HTTP Methods

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| GET | Retrieve resource | Yes | Yes |
| POST | Create resource | No | No |
| PUT | Replace resource | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Remove resource | Yes | No |

### HTTP Status Codes

```
┌─────────────────────────────────────────────────────────────────┐
│                    HTTP STATUS CODES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  2xx Success                                                    │
│  ─────────────────────────────────────────                      │
│  200 OK              Request succeeded                          │
│  201 Created         Resource created (POST)                    │
│  204 No Content      Success with no body (DELETE)              │
│                                                                 │
│  3xx Redirection                                                │
│  ─────────────────────────────────────────                      │
│  301 Moved           Permanent redirect                         │
│  302 Found           Temporary redirect                         │
│  304 Not Modified    Cache still valid                          │
│                                                                 │
│  4xx Client Error                                               │
│  ─────────────────────────────────────────                      │
│  400 Bad Request     Invalid request syntax                     │
│  401 Unauthorized    Authentication required                    │
│  403 Forbidden       Authenticated but not allowed              │
│  404 Not Found       Resource doesn't exist                     │
│  409 Conflict        State conflict (duplicate)                 │
│  422 Unprocessable   Validation failed                          │
│  429 Too Many        Rate limit exceeded                        │
│                                                                 │
│  5xx Server Error                                               │
│  ─────────────────────────────────────────                      │
│  500 Internal Error  Server-side failure                        │
│  502 Bad Gateway     Upstream server error                      │
│  503 Unavailable     Server overloaded/maintenance              │
│  504 Gateway Timeout Upstream timeout                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📄 Pagination

### Offset-Based Pagination

```
GET /posts?offset=20&limit=10

Response:
{
  "data": [...],
  "pagination": {
    "offset": 20,
    "limit": 10,
    "total": 1000
  }
}
```

**Pros:**
- Simple to implement
- Can jump to any page
- Easy to understand

**Cons:**
- Inconsistent results if data changes
- Slow for large offsets (DB must skip rows)
- Can miss or duplicate items

### Cursor-Based Pagination

```
GET /posts?cursor=eyJpZCI6MTAwfQ&limit=10

Response:
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTEwfQ",
    "prev_cursor": "eyJpZCI6OTB9",
    "has_more": true
  }
}
```

**Pros:**
- Consistent results even with changes
- Efficient for any page (uses indexes)
- Works well for infinite scroll

**Cons:**
- Can't jump to arbitrary page
- More complex to implement
- Cursor can become invalid

### Pagination Comparison

| Factor | Offset-Based | Cursor-Based |
|--------|--------------|--------------|
| Performance | Degrades with offset | Constant time |
| Consistency | May miss/duplicate | Consistent |
| Random access | Yes | No |
| Implementation | Simple | Moderate |
| Best for | Small datasets, admin UIs | Feeds, infinite scroll |

---

## 🔐 Authentication & Authorization

### Common Authentication Methods

```
┌─────────────────────────────────────────────────────────────────┐
│                  AUTHENTICATION METHODS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  API Keys                                                       │
│  ─────────────────────────────────────────                      │
│  Header: X-API-Key: sk_live_abc123                              │
│  Best for: Server-to-server, third-party integrations           │
│  Pros: Simple, easy to rotate                                   │
│  Cons: No user context, must be kept secret                     │
│                                                                 │
│  JWT (JSON Web Tokens)                                          │
│  ─────────────────────────────────────────                      │
│  Header: Authorization: Bearer eyJhbGci...                      │
│  Best for: User authentication, stateless sessions              │
│  Pros: Self-contained, scalable                                 │
│  Cons: Can't invalidate without blacklist                       │
│                                                                 │
│  OAuth 2.0                                                      │
│  ─────────────────────────────────────────                      │
│  Flow: Authorization code → Access token → API calls            │
│  Best for: Third-party access, social login                     │
│  Pros: Delegated access, standardized                           │
│  Cons: Complex implementation                                   │
│                                                                 │
│  Session Cookies                                                │
│  ─────────────────────────────────────────                      │
│  Header: Cookie: session_id=abc123                              │
│  Best for: Traditional web apps                                 │
│  Pros: Built-in browser support, secure                         │
│  Cons: Requires server state, CSRF concerns                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Authorization Models

| Model | Description | Use Case |
|-------|-------------|----------|
| RBAC (Role-Based) | Permissions assigned to roles | Enterprise apps |
| ABAC (Attribute-Based) | Permissions based on attributes | Complex policies |
| ACL (Access Control List) | Per-resource permissions | File systems |
| ReBAC (Relationship-Based) | Permissions based on relationships | Social networks |

---

## 🔄 API Versioning

### Versioning Strategies

```
┌─────────────────────────────────────────────────────────────────┐
│                  API VERSIONING STRATEGIES                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  URL Path Versioning (Most Common)                              │
│  ─────────────────────────────────────────                      │
│  GET /api/v1/users                                              │
│  GET /api/v2/users                                              │
│  ✅ Clear and visible                                           │
│  ❌ Requires URL changes for version bump                       │
│                                                                 │
│  Query Parameter Versioning                                     │
│  ─────────────────────────────────────────                      │
│  GET /api/users?version=1                                       │
│  GET /api/users?version=2                                       │
│  ✅ Easy to add                                                 │
│  ❌ Easy to forget, less discoverable                           │
│                                                                 │
│  Header Versioning                                              │
│  ─────────────────────────────────────────                      │
│  GET /api/users                                                 │
│  Header: Accept: application/vnd.api.v1+json                    │
│  ✅ Clean URLs                                                  │
│  ❌ Hidden, harder to test                                      │
│                                                                 │
│  Date-Based Versioning (Stripe style)                           │
│  ─────────────────────────────────────────                      │
│  Header: Stripe-Version: 2024-01-15                             │
│  ✅ Granular control, automatic upgrades                        │
│  ❌ Complex version management                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Version Deprecation Strategy

```
Timeline Example:
─────────────────────────────────────────────
v1 Released:     Jan 2023
v2 Released:     Jan 2024
v1 Deprecated:   Apr 2024 (warn in responses)
v1 Sunset:       Jan 2025 (stop serving)

Deprecation Header:
Deprecation: true
Sunset: Sat, 01 Jan 2025 00:00:00 GMT
Link: <https://docs.api.com/v2>; rel="successor-version"
```

---

## 🔑 Idempotency

### Why Idempotency Matters

```
Without idempotency:
─────────────────────────────────────────────
Client: POST /payments {amount: 100}
Server: Creates payment, returns 200
Network: Response lost
Client: Retries POST /payments {amount: 100}
Server: Creates ANOTHER payment ❌ Double charge!

With idempotency:
─────────────────────────────────────────────
Client: POST /payments {amount: 100}
        Header: Idempotency-Key: abc123
Server: Creates payment, stores key, returns 200
Network: Response lost
Client: Retries with same Idempotency-Key: abc123
Server: Finds existing result, returns same 200 ✅
```

### Implementation Pattern

```csharp
public async Task<PaymentResult> ProcessPayment(
    PaymentRequest request, 
    string idempotencyKey)
{
    // Check if we've seen this key before
    var existing = await _cache.GetAsync(idempotencyKey);
    if (existing != null)
    {
        return existing; // Return cached result
    }
    
    // Process the payment
    var result = await _paymentService.Charge(request);
    
    // Store result with idempotency key (TTL: 24 hours)
    await _cache.SetAsync(idempotencyKey, result, TimeSpan.FromHours(24));
    
    return result;
}
```

### Idempotency Best Practices

| Practice | Description |
|----------|-------------|
| Client-generated keys | Use UUIDs, client controls uniqueness |
| Store for 24-48 hours | Enough for retry windows |
| Include in POST/PATCH | GET/PUT/DELETE are already idempotent |
| Return same status code | Identical response for identical request |

---

## ⚡ Rate Limiting

### Rate Limit Headers

```
Response Headers:
─────────────────────────────────────────────
X-RateLimit-Limit: 100          Max requests per window
X-RateLimit-Remaining: 45       Requests left
X-RateLimit-Reset: 1640000000   Unix timestamp of reset

On limit exceeded (429):
─────────────────────────────────────────────
HTTP/1.1 429 Too Many Requests
Retry-After: 60                 Seconds until retry OK

{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please retry after 60 seconds.",
  "retry_after": 60
}
```

### Rate Limit Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| Per user | Limit by user ID | Authenticated APIs |
| Per IP | Limit by IP address | Public APIs, login |
| Per API key | Limit by key | Third-party integrations |
| Tiered | Different limits by plan | SaaS products |

---

## 📦 Request/Response Design

### Request Body Best Practices

```json
// Good: Clear, typed, documented
POST /api/v1/orders
{
  "customer_id": "cust_123",
  "items": [
    {
      "product_id": "prod_456",
      "quantity": 2,
      "unit_price_cents": 1999
    }
  ],
  "shipping_address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "US"
  },
  "payment_method_id": "pm_789"
}

// Bad: Ambiguous, untyped
POST /api/v1/orders
{
  "customer": "123",           // ID or name?
  "items": "prod_456,prod_789", // String instead of array?
  "price": 19.99,              // Float precision issues
  "address": "123 Main St, SF" // Unstructured
}
```

### Response Envelope Pattern

```json
// Standard response structure
{
  "success": true,
  "data": {
    "id": "order_123",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "request_id": "req_abc123",
    "processing_time_ms": 45
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  },
  "meta": {
    "request_id": "req_abc123"
  }
}
```

### Date/Time Format

```
Always use ISO 8601 format with timezone:
─────────────────────────────────────────────
✅ "2024-01-15T10:30:00Z"        UTC
✅ "2024-01-15T10:30:00+05:30"   With offset

❌ "01/15/2024"                   Ambiguous
❌ "1705312200"                   Unix timestamp (not human readable)
❌ "January 15, 2024"             Not parseable
```

---

## 🔗 HATEOAS (Hypermedia)

### Hypermedia-Driven API

```json
GET /api/v1/orders/123

{
  "id": "order_123",
  "status": "pending",
  "total_cents": 5999,
  "_links": {
    "self": { "href": "/api/v1/orders/123" },
    "customer": { "href": "/api/v1/customers/456" },
    "cancel": { "href": "/api/v1/orders/123/cancel", "method": "POST" },
    "pay": { "href": "/api/v1/orders/123/pay", "method": "POST" }
  }
}
```

**Benefits:**
- Self-documenting
- Clients discover available actions
- Server controls valid transitions

**Drawbacks:**
- More verbose responses
- Rarely fully implemented
- Clients often ignore links

---

## 📋 API Design Checklist

### Before Designing

- [ ] Define the resources and their relationships
- [ ] Identify the main use cases
- [ ] Choose the right paradigm (REST, GraphQL, gRPC)
- [ ] Plan for versioning from day one

### For Each Endpoint

- [ ] Use appropriate HTTP method
- [ ] Use plural nouns for resources
- [ ] Return appropriate status codes
- [ ] Include pagination for lists
- [ ] Add rate limiting headers
- [ ] Support filtering and sorting where needed

### For the Overall API

- [ ] Consistent naming conventions
- [ ] Consistent error format
- [ ] Comprehensive documentation
- [ ] Authentication and authorization
- [ ] Request validation
- [ ] Idempotency for mutations

---

## 🛠️ Example API Design: Twitter-like Service

```
┌─────────────────────────────────────────────────────────────────┐
│                    TWITTER API DESIGN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Posts (Tweets)                                                 │
│  ─────────────────────────────────────────                      │
│  POST   /api/v1/posts              Create a post                │
│  GET    /api/v1/posts/:id          Get a post                   │
│  DELETE /api/v1/posts/:id          Delete a post                │
│  GET    /api/v1/posts/:id/likes    Get users who liked          │
│  POST   /api/v1/posts/:id/like     Like a post                  │
│  DELETE /api/v1/posts/:id/like     Unlike a post                │
│  POST   /api/v1/posts/:id/repost   Repost                       │
│                                                                 │
│  Users                                                          │
│  ─────────────────────────────────────────                      │
│  GET    /api/v1/users/:id          Get user profile             │
│  PATCH  /api/v1/users/:id          Update profile               │
│  GET    /api/v1/users/:id/posts    Get user's posts             │
│  GET    /api/v1/users/:id/followers   Get followers             │
│  GET    /api/v1/users/:id/following   Get following             │
│  POST   /api/v1/users/:id/follow      Follow user               │
│  DELETE /api/v1/users/:id/follow      Unfollow user             │
│                                                                 │
│  Feed                                                           │
│  ─────────────────────────────────────────                      │
│  GET    /api/v1/feed               Get home timeline            │
│         ?cursor=xyz&limit=20                                    │
│                                                                 │
│  Search                                                         │
│  ─────────────────────────────────────────                      │
│  GET    /api/v1/search/posts       Search posts                 │
│         ?q=keyword&cursor=xyz                                   │
│  GET    /api/v1/search/users       Search users                 │
│         ?q=username&cursor=xyz                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Key Takeaways

1. **Choose the right paradigm** - REST for most cases, gRPC for microservices
2. **Use cursor pagination** - For any list that can grow
3. **Always version your API** - Preferably in the URL path
4. **Implement idempotency** - Essential for financial operations
5. **Return proper status codes** - 4xx for client errors, 5xx for server errors
6. **Include rate limiting** - Protect your services
7. **Use ISO 8601 for dates** - Avoid ambiguity
8. **Be consistent** - Same patterns throughout the API

---

## 📚 Related Topics

- [Data Modeling](/system-design/fundamentals/05-data-modeling.md) - What resources to expose
- [Rate Limiting](/system-design/fundamentals/18-rate-limiting.md) - Detailed rate limiting strategies
- [Security](/system-design/fundamentals/21-security.md) - Authentication and authorization deep dive
