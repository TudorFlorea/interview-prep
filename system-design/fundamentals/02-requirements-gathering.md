# Requirements Gathering

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

The first 5 minutes of a system design interview are crucial. Gathering requirements properly ensures you're solving the right problem and demonstrates your ability to scope complex projects. This phase separates senior engineers (who ask the right questions) from junior ones (who make assumptions).

---

## 🎯 Why Requirements Matter

### The Cost of Skipping Requirements

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE REQUIREMENTS GAP                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   What Interviewer Said:     What You Might Assume:             │
│   "Design a chat app"        "Like WhatsApp"                    │
│                                                                 │
│   But They Might Mean:                                          │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ • Slack (channels, threads, integrations)               │  │
│   │ • Discord (voice chat, servers, roles)                  │  │
│   │ • iMessage (simple 1:1, E2E encryption)                 │  │
│   │ • Intercom (customer support, chatbots)                 │  │
│   │ • Twitch chat (one-to-many, high volume)                │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   Without clarification, you might design the wrong system!     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What Good Requirements Gathering Signals

| Signal | What It Shows |
|--------|--------------|
| Asking about users | You think about who uses the system |
| Asking about scale | You understand infrastructure matters |
| Asking about edge cases | You've built production systems |
| Prioritizing features | You can make product decisions |
| Confirming assumptions | You communicate proactively |

---

## 📋 Functional Requirements

Functional requirements describe **what the system should do**.

### The CRUD Framework

For most systems, start with basic operations:

| Operation | Questions to Ask |
|-----------|-----------------|
| **Create** | What can users create? Any validation? Size limits? |
| **Read** | How do users retrieve data? Search? Filtering? |
| **Update** | Can users edit? Who can edit? Versioning? |
| **Delete** | Soft delete or hard delete? Who can delete? |

### Feature Prioritization

Ask the interviewer to help prioritize:

```
"I've identified these potential features:
1. User registration and authentication
2. Creating and viewing posts
3. Following other users
4. News feed
5. Search
6. Notifications
7. Direct messages

Which are must-haves for our 45-minute design?"
```

### Example Questions by Domain

#### Social Media
- Can users post text, images, videos, or all three?
- Is there a character/size limit on posts?
- Can users edit or delete posts?
- Are there privacy settings (public, private, friends-only)?
- Do we need hashtags or mentions?

#### E-Commerce
- How many products in the catalog?
- Do we need real-time inventory tracking?
- What payment methods are supported?
- Do we need reviews and ratings?
- Is there a recommendation engine?

#### Messaging
- 1:1 only, or group chats?
- Maximum group size?
- Media support (images, files, voice)?
- Read receipts and typing indicators?
- Message history retention?

#### Streaming
- Live streaming, on-demand, or both?
- What video quality levels?
- Do we need adaptive bitrate?
- Offline viewing?
- Simultaneous streams per account?

---

## ⚙️ Non-Functional Requirements

Non-functional requirements describe **how well the system should perform**.

### The FCC-SLEDS Framework

```
┌─────────────────────────────────────────────────────────────────┐
│                     FCC-SLEDS FRAMEWORK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   F ─── Fault Tolerance                                         │
│   C ─── CAP Considerations                                      │
│   C ─── Compliance                                              │
│   ─────────────────────────                                     │
│   S ─── Scalability                                             │
│   L ─── Latency                                                 │
│   E ─── Environment                                             │
│   D ─── Durability                                              │
│   S ─── Security                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Breakdown

#### Fault Tolerance
- What's the acceptable downtime? (99.9% = 8.7 hours/year)
- What happens when a component fails?
- Do we need multi-region deployment?

```
Availability Levels:
┌────────────┬──────────────────┬────────────────────┐
│   Level    │  Downtime/Year   │     Use Case       │
├────────────┼──────────────────┼────────────────────┤
│   99%      │   3.65 days      │ Internal tools     │
│   99.9%    │   8.7 hours      │ Business apps      │
│   99.99%   │   52.6 minutes   │ E-commerce         │
│   99.999%  │   5.26 minutes   │ Financial systems  │
└────────────┴──────────────────┴────────────────────┘
```

#### CAP Considerations
- Is consistency or availability more important?
- Can we tolerate eventual consistency?
- What's the acceptable staleness of data?

```
CAP Decision Matrix:
┌─────────────────────┬─────────────────────────────────┐
│     Consistency     │         Availability            │
├─────────────────────┼─────────────────────────────────┤
│ • Banking           │ • Social media feeds            │
│ • Inventory         │ • Analytics                     │
│ • Reservations      │ • Content delivery              │
│ • Payment           │ • Shopping carts                │
└─────────────────────┴─────────────────────────────────┘
```

#### Compliance
- Any regulatory requirements (GDPR, HIPAA, PCI-DSS, SOC2)?
- Data residency requirements?
- Audit logging needs?

#### Scalability
- How many users total? Daily active?
- What's the read/write ratio?
- Are there traffic spikes to handle?

#### Latency
- What response time is acceptable?
- P50 vs P99 requirements?
- Are there SLAs to meet?

```
Latency Expectations by Use Case:
┌─────────────────────┬─────────────┬─────────────────┐
│     Operation       │    P50      │      P99        │
├─────────────────────┼─────────────┼─────────────────┤
│ Web page load       │ < 200ms     │ < 1s            │
│ API response        │ < 100ms     │ < 500ms         │
│ Search query        │ < 200ms     │ < 1s            │
│ Real-time message   │ < 100ms     │ < 300ms         │
│ Video start         │ < 2s        │ < 5s            │
│ Batch processing    │ Minutes     │ Hours           │
└─────────────────────┴─────────────┴─────────────────┘
```

#### Environment
- Cloud or on-premise?
- Specific cloud provider requirements?
- Geographic distribution?

#### Durability
- Can we lose any data?
- Backup and recovery requirements?
- How long to retain data?

#### Security
- Authentication requirements?
- Authorization model (RBAC, ABAC)?
- Encryption (at rest, in transit)?
- API security (rate limiting, API keys)?

---

## 📊 Capacity Estimation

### The Quick Math Approach

After understanding scale, do quick estimates:

```
Step 1: Establish user numbers
─────────────────────────────────────────────
Total users:        100M
Daily active users: 10M (10% of total)
Concurrent users:   1M (10% of DAU at peak)

Step 2: Estimate operations per user
─────────────────────────────────────────────
Reads per user per day:  50
Writes per user per day: 2

Step 3: Calculate QPS
─────────────────────────────────────────────
Daily reads:  10M × 50 = 500M
Daily writes: 10M × 2 = 20M

Read QPS:  500M / 86,400 ≈ 5,800 QPS
Write QPS: 20M / 86,400 ≈ 230 QPS

Peak (assume 3x average):
Peak read QPS:  ~17,400
Peak write QPS: ~700

Step 4: Estimate storage
─────────────────────────────────────────────
Average record size: 1KB
Daily new data: 20M × 1KB = 20GB
Yearly: 20GB × 365 = 7.3TB
5 years: ~37TB
```

### Storage Estimation Cheat Sheet

| Data Type | Size |
|-----------|------|
| UUID | 16 bytes |
| Timestamp | 8 bytes |
| Integer | 4-8 bytes |
| Short string (name) | 50-100 bytes |
| Long string (post) | 200-500 bytes |
| Compressed image | 200KB - 2MB |
| Video (per minute) | 100-200MB |

### Bandwidth Estimation

```
Incoming (uploads):
─────────────────────────────────────────────
Writes/second × Average size = Bandwidth

Example: 700 writes/s × 10KB = 7 MB/s incoming

Outgoing (downloads):
─────────────────────────────────────────────
Reads/second × Average size = Bandwidth

Example: 17,400 reads/s × 10KB = 174 MB/s outgoing
```

---

## 🗣️ The Art of Asking Questions

### Opening the Conversation

Good:
```
"Before I start designing, I'd like to understand the scope better.
Can I ask a few clarifying questions?"
```

Bad:
```
"So it's like Twitter, right? I'll design that."
```

### Question Categories

#### 1. User Questions
- Who are the users? (consumers, businesses, internal?)
- How many users? (thousands, millions, billions?)
- Geographic distribution? (single region, global?)

#### 2. Scale Questions
- What's the expected read/write ratio?
- Are there traffic patterns? (peak hours, events?)
- What's the growth expectation?

#### 3. Feature Questions
- Which features are must-have vs nice-to-have?
- Are there existing systems to integrate with?
- What's the timeline/phase approach?

#### 4. Constraint Questions
- Any technology constraints?
- Budget considerations?
- Team size and expertise?

### Validating Your Understanding

After gathering requirements, summarize:

```
"Let me make sure I understand correctly:

Functional Requirements:
- Users can create short posts (max 280 chars)
- Users can follow other users
- Users see a feed of posts from people they follow
- No editing posts, but can delete

Non-Functional Requirements:
- 100M DAU, read-heavy (100:1 ratio)
- Low latency (<200ms for feed)
- High availability (99.9%)
- Eventual consistency acceptable for feed

Out of scope for now:
- Direct messages
- Search
- Trending topics

Does this align with what you're looking for?"
```

---

## 📝 Requirements Documentation Template

Use this template to organize your notes during the interview:

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUIREMENTS SUMMARY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FUNCTIONAL REQUIREMENTS                                        │
│  ──────────────────────                                         │
│  Core Features:                                                 │
│  □ Feature 1: _______________________                           │
│  □ Feature 2: _______________________                           │
│  □ Feature 3: _______________________                           │
│                                                                 │
│  Out of Scope:                                                  │
│  □ _______________________                                      │
│  □ _______________________                                      │
│                                                                 │
│  NON-FUNCTIONAL REQUIREMENTS                                    │
│  ────────────────────────────                                   │
│  Scale:                                                         │
│  • Users: _______ total, _______ DAU                            │
│  • Read QPS: _______ Write QPS: _______                         │
│                                                                 │
│  Performance:                                                   │
│  • Latency target: _______                                      │
│  • Availability: _______                                        │
│                                                                 │
│  Storage:                                                       │
│  • Estimated: _______/day, _______/year                         │
│                                                                 │
│  Special Considerations:                                        │
│  • Compliance: _______                                          │
│  • Consistency model: _______                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Common Mistakes

### Mistake 1: Making Assumptions

❌ **Wrong**: "I'll assume we need 1 billion users"
✅ **Right**: "What's the expected user base? Are we designing for startup scale or FAANG scale?"

### Mistake 2: Going Too Broad

❌ **Wrong**: "Let me design all features of Facebook"
✅ **Right**: "Given our 45 minutes, which 3 features should I focus on?"

### Mistake 3: Ignoring Non-Functional Requirements

❌ **Wrong**: Only discussing features
✅ **Right**: Asking about scale, latency, availability, consistency

### Mistake 4: Not Confirming Understanding

❌ **Wrong**: Silently starting to design
✅ **Right**: Summarizing requirements before proceeding

### Mistake 5: Spending Too Long on Requirements

❌ **Wrong**: 15 minutes of questions
✅ **Right**: 5 minutes of focused questions, then confirm and proceed

---

## 🎯 Practice Scenarios

### Scenario 1: URL Shortener
**Key questions to ask:**
- What's the expected URL volume? (how many URLs created per day?)
- What's the URL length requirement?
- Do URLs expire?
- Do we need analytics (click tracking)?
- Custom aliases allowed?

### Scenario 2: Chat Application
**Key questions to ask:**
- 1:1 or group chats? Max group size?
- Message types (text, media, files)?
- Message persistence (how long to keep)?
- Read receipts? Typing indicators?
- End-to-end encryption required?

### Scenario 3: Video Streaming
**Key questions to ask:**
- Live streaming, on-demand, or both?
- Upload or just viewing?
- Video quality levels needed?
- Geographic distribution of viewers?
- Content moderation requirements?

---

## ✅ Key Takeaways

1. **Never skip requirements** - First 5 minutes are critical
2. **Use frameworks** - FCC-SLEDS for non-functional requirements
3. **Prioritize features** - Not everything needs to be in scope
4. **Do quick math** - Back-of-envelope calculations build credibility
5. **Confirm understanding** - Summarize before designing
6. **Document as you go** - Write down requirements visibly
7. **Time-box yourself** - 5 minutes max, then move on

---

## 📚 Related Topics

- [Back-of-Envelope Calculations](/system-design/fundamentals/03-back-of-envelope-calculations.md) - Detailed capacity math
- [Introduction & Framework](/system-design/fundamentals/01-introduction-and-framework.md) - Overall interview approach
- [API Design](/system-design/fundamentals/04-api-design.md) - Translating requirements to APIs
