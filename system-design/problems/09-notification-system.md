# Design Notification System

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a scalable notification system that delivers messages across multiple channels (push, SMS, email) with high reliability and low latency.

**Difficulty**: 🟡 Intermediate (Tier 2)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Multi-channel delivery** - Push, SMS, Email, In-app
2. **Prioritization** - Urgent vs. marketing notifications
3. **User preferences** - Opt-in/out per channel and type
4. **Rate limiting** - Prevent notification fatigue
5. **Scheduling** - Send at specific times
6. **Templating** - Dynamic content with variables
7. **Analytics** - Delivery rates, open rates, clicks
8. **Retry logic** - Handle delivery failures

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | 99.9% delivery success |
| **CAP** | AP - Eventual delivery |
| **Compliance** | CAN-SPAM, GDPR, TCPA |
| **Scalability** | 1B notifications/day |
| **Latency** | &lt; 1s for urgent, &lt; 1min for normal |
| **Environment** | Global |
| **Durability** | At-least-once delivery |
| **Security** | PII protection |

---

## 2. Back of Envelope Calculations

```
Notifications:
- 1 billion notifications/day
- 1B / 86400 ≈ 11,500 notifications/second
- Peak: ~50,000/second

Channel Distribution:
- Push: 60% (600M/day)
- Email: 30% (300M/day)
- SMS: 5% (50M/day)
- In-app: 5% (50M/day)

Storage:
- Notification record: 1 KB
- Keep 30 days: 1B × 30 × 1 KB = 30 TB
```

---

## 3. Core Entities

```sql
-- Notification Templates
CREATE TABLE templates (
    template_id BIGINT PRIMARY KEY,
    name VARCHAR(100),
    channel ENUM('push', 'email', 'sms', 'in_app'),
    subject_template TEXT,
    body_template TEXT,
    created_at TIMESTAMP
);

-- Notification Requests
CREATE TABLE notifications (
    notification_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    template_id BIGINT,
    channel ENUM('push', 'email', 'sms', 'in_app'),
    priority ENUM('urgent', 'high', 'normal', 'low'),
    status ENUM('pending', 'sent', 'delivered', 'failed'),
    payload JSON,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_at)
);

-- User Preferences
CREATE TABLE user_preferences (
    user_id BIGINT,
    channel ENUM('push', 'email', 'sms'),
    notification_type VARCHAR(50),  -- 'marketing', 'transactional', etc.
    enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    PRIMARY KEY (user_id, channel, notification_type)
);

-- Device Tokens (for push)
CREATE TABLE device_tokens (
    token_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    platform ENUM('ios', 'android', 'web'),
    token VARCHAR(500),
    active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP,
    
    INDEX idx_user (user_id)
);
```

---

## 4. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      NOTIFICATION SYSTEM ARCHITECTURE                      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                         INGESTION LAYER                               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │ │
│  │  │   API    │  │  Events  │  │ Scheduled│  │  Batch   │             │ │
│  │  │ Trigger  │  │ (Kafka)  │  │  (Cron)  │  │  Import  │             │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘             │ │
│  │       └──────────────┴────────────┴──────────────┘                   │ │
│  └────────────────────────────────────┬─────────────────────────────────┘ │
│                                       │                                    │
│                                       ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                        PROCESSING LAYER                               │ │
│  │                                                                        │ │
│  │  ┌────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    Notification Service                         │  │ │
│  │  │  • Validate request                                            │  │ │
│  │  │  • Check user preferences                                      │  │ │
│  │  │  • Apply rate limiting                                         │  │ │
│  │  │  • Render template                                             │  │ │
│  │  │  • Route to channel                                            │  │ │
│  │  └────────────────────────────────────────────────────────────────┘  │ │
│  │                                │                                      │ │
│  └────────────────────────────────┼──────────────────────────────────────┘ │
│                                   │                                        │
│            ┌──────────────────────┼──────────────────────┐                │
│            │                      │                      │                 │
│            ▼                      ▼                      ▼                 │
│       ┌─────────┐           ┌─────────┐           ┌─────────┐            │
│       │  Push   │           │  Email  │           │   SMS   │            │
│       │  Queue  │           │  Queue  │           │  Queue  │            │
│       └────┬────┘           └────┬────┘           └────┬────┘            │
│            │                     │                     │                  │
│            ▼                     ▼                     ▼                  │
│       ┌─────────┐           ┌─────────┐           ┌─────────┐            │
│       │  Push   │           │  Email  │           │   SMS   │            │
│       │ Workers │           │ Workers │           │ Workers │            │
│       └────┬────┘           └────┬────┘           └────┬────┘            │
│            │                     │                     │                  │
│            ▼                     ▼                     ▼                  │
│       ┌─────────┐           ┌─────────┐           ┌─────────┐            │
│       │  APNs/  │           │SendGrid/│           │ Twilio/ │            │
│       │   FCM   │           │   SES   │           │  Nexmo  │            │
│       └─────────┘           └─────────┘           └─────────┘            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deep Dive: Message Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   NOTIFICATION FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Request Received                                            │
│  ────────────────────                                           │
│  POST /api/v1/notifications                                     │
│  {                                                              │
│    "user_id": "user_123",                                       │
│    "template": "order_shipped",                                 │
│    "channels": ["push", "email"],                               │
│    "data": {"order_id": "ORD123", "tracking": "..."}           │
│  }                                                              │
│                                                                 │
│  2. Validation & Preference Check                               │
│  ─────────────────────────────────                              │
│  • User exists?                                                │
│  • User opted in for this channel + type?                      │
│  • Within quiet hours?                                         │
│  • Rate limit exceeded?                                        │
│                                                                 │
│  3. Template Rendering                                          │
│  ──────────────────────                                         │
│  Template: "Your order {{order_id}} has shipped!"              │
│  Rendered: "Your order ORD123 has shipped!"                    │
│                                                                 │
│  4. Queue by Channel                                            │
│  ────────────────────                                           │
│  push_queue  ← {user_id, rendered_message, priority}           │
│  email_queue ← {user_id, subject, body, priority}              │
│                                                                 │
│  5. Worker Processing                                           │
│  ─────────────────────                                          │
│  • Fetch user's device tokens / email address                  │
│  • Call external provider (FCM/APNs/SendGrid)                  │
│  • Handle response                                             │
│  • Update delivery status                                      │
│                                                                 │
│  6. Retry on Failure                                            │
│  ─────────────────────                                          │
│  • Exponential backoff (1s, 2s, 4s, 8s...)                    │
│  • Max 3 retries                                               │
│  • Move to DLQ after max retries                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Channel-Specific Details

### Push Notifications

```
┌─────────────────────────────────────────────────────────────────┐
│                   PUSH NOTIFICATION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  iOS (APNs):                                                    │
│  ────────────                                                   │
│  • HTTP/2 connection to Apple servers                          │
│  • JWT or certificate authentication                           │
│  • Device token from app registration                          │
│  • Payload limit: 4 KB                                         │
│                                                                 │
│  Android (FCM):                                                 │
│  ──────────────                                                 │
│  • HTTP API to Firebase                                        │
│  • Server key authentication                                   │
│  • Registration token from app                                 │
│  • Payload limit: 4 KB                                         │
│                                                                 │
│  Token Management:                                              │
│  ──────────────────                                             │
│  • Tokens can become invalid (app uninstall, token refresh)   │
│  • APNs/FCM return error codes for invalid tokens             │
│  • Remove invalid tokens from database                        │
│                                                                 │
│  Batching:                                                      │
│  ──────────                                                     │
│  • FCM supports up to 500 tokens per request                  │
│  • Batch notifications for efficiency                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Email

```
┌─────────────────────────────────────────────────────────────────┐
│                   EMAIL DELIVERY                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Providers:                                                     │
│  ───────────                                                    │
│  • SendGrid, SES, Mailgun, Postmark                            │
│  • Multiple providers for redundancy                           │
│                                                                 │
│  Deliverability Factors:                                       │
│  ─────────────────────────                                      │
│  • SPF, DKIM, DMARC records                                    │
│  • Sender reputation (IP, domain)                              │
│  • Bounce handling                                             │
│  • Complaint handling                                          │
│                                                                 │
│  Types:                                                         │
│  ───────                                                        │
│  • Transactional: Order confirmations (high priority)          │
│  • Marketing: Promotions (respect rate limits)                 │
│                                                                 │
│  Webhooks for Status:                                          │
│  ─────────────────────                                          │
│  • Delivered, Opened, Clicked, Bounced, Complained            │
│  • Update notification status based on webhooks               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Rate Limiting & Anti-Fatigue

```
┌─────────────────────────────────────────────────────────────────┐
│                   RATE LIMITING                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User-Level Limits:                                             │
│  ───────────────────                                            │
│  • Max 5 push notifications per hour                           │
│  • Max 3 emails per day (marketing)                            │
│  • No limit for transactional                                  │
│                                                                 │
│  Global Limits:                                                 │
│  ───────────────                                                │
│  • Provider rate limits (FCM: 240msg/min per device)          │
│  • Budget controls (SMS costs money)                           │
│                                                                 │
│  Implementation:                                                │
│  ─────────────────                                              │
│  Redis sliding window counter:                                 │
│  INCR user:{id}:push:count                                     │
│  EXPIRE user:{id}:push:count 3600                              │
│                                                                 │
│  Quiet Hours:                                                   │
│  ─────────────                                                  │
│  • Check user timezone                                         │
│  • Defer notifications during 10pm-8am                         │
│  • Urgent bypasses quiet hours                                 │
│                                                                 │
│  Aggregation:                                                   │
│  ─────────────                                                  │
│  • Group multiple events into one notification                │
│  • "You have 5 new messages" vs 5 separate notifications      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Reliability & Retry Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                   RELIABILITY                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  At-Least-Once Delivery:                                       │
│  ─────────────────────────                                      │
│  • Persist notification before sending                         │
│  • Acknowledge only after provider confirms                   │
│  • Retry on failure                                            │
│                                                                 │
│  Retry Strategy:                                                │
│  ─────────────────                                              │
│  ┌─────────────────────────────────────────────────────┐       │
│  │  Attempt 1 → Fail → Wait 1s                        │       │
│  │  Attempt 2 → Fail → Wait 4s                        │       │
│  │  Attempt 3 → Fail → Wait 16s                       │       │
│  │  Attempt 4 → Fail → Move to DLQ                    │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  Dead Letter Queue:                                             │
│  ───────────────────                                            │
│  • Failed notifications for investigation                      │
│  • Alert on DLQ growth                                         │
│  • Manual retry capability                                     │
│                                                                 │
│  Fallback Channels:                                             │
│  ───────────────────                                            │
│  • If push fails, try email                                    │
│  • If email fails, try SMS (for critical)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Analytics & Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│                   ANALYTICS                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Metrics to Track:                                              │
│  ──────────────────                                             │
│  • Send rate (notifications/second)                            │
│  • Delivery rate (delivered/sent)                              │
│  • Open rate (opened/delivered)                                │
│  • Click rate (clicked/opened)                                 │
│  • Bounce rate                                                 │
│  • Unsubscribe rate                                            │
│                                                                 │
│  Implementation:                                                │
│  ─────────────────                                              │
│  • Tracking pixel for email opens                              │
│  • Redirect links for click tracking                          │
│  • Push: Delivery receipts from APNs/FCM                      │
│                                                                 │
│  Dashboard:                                                     │
│  ───────────                                                    │
│  • Real-time send volume                                       │
│  • Delivery success by channel                                │
│  • Top performing templates                                    │
│  • Error rates by provider                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Queue | Kafka / SQS | Reliability, ordering |
| Workers | Kubernetes | Auto-scaling |
| Push | FCM + APNs | Native |
| Email | SendGrid + SES | Redundancy |
| SMS | Twilio | Global coverage |
| Rate Limiting | Redis | Fast counters |
| Analytics | ClickHouse | Time-series |

---

## 11. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PRIORITIZE BY URGENCY                                       │
│     Separate queues for urgent vs marketing                    │
│                                                                 │
│  2. RESPECT USER PREFERENCES                                    │
│     Check opt-in before sending                                │
│     Honor quiet hours                                          │
│                                                                 │
│  3. RETRY WITH BACKOFF                                          │
│     Exponential backoff for failures                           │
│     Dead letter queue for investigation                        │
│                                                                 │
│  4. MULTI-PROVIDER REDUNDANCY                                   │
│     Fallback providers per channel                             │
│                                                                 │
│  5. RATE LIMIT AGGRESSIVELY                                     │
│     Prevent notification fatigue                               │
│     Aggregate where possible                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. References

- [09-message-queues.md](/system-design/fundamentals/09-message-queues.md) - Queue patterns
- [18-rate-limiting.md](/system-design/fundamentals/18-rate-limiting.md) - Rate limiting
- [20-fault-tolerance.md](/system-design/fundamentals/20-fault-tolerance.md) - Retry logic

---

[← Back to Problems](/system-design/problems/00-index.md) | [Next: Web Crawler →](/system-design/problems/10-web-crawler.md)
