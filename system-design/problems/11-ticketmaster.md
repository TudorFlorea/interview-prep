# Design Ticketmaster

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a ticket booking system like Ticketmaster that handles high-concurrency ticket sales for popular events with seat selection, inventory management, and payment processing.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **View events** - Browse and search events
2. **View seat map** - See available seats
3. **Reserve seats** - Temporarily hold seats
4. **Purchase tickets** - Complete payment
5. **Prevent double-booking** - Each seat sold once
6. **Handle high concurrency** - Flash sales
7. **Waiting room** - Queue for popular events
8. **Refunds/cancellations** - Release tickets back

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | 99.99% during sales |
| **CAP** | CP - No double-booking ever |
| **Compliance** | PCI-DSS for payments |
| **Scalability** | 10M concurrent users for hot events |
| **Latency** | Seat selection < 200ms |
| **Environment** | Global |
| **Durability** | Never lose confirmed bookings |
| **Security** | Bot protection, fraud prevention |

---

## 2. Back of Envelope Calculations

```
Events:
- 100,000 events/year
- Average venue: 20,000 seats
- Hot events: 100,000+ seats

Flash Sale Scenario:
- 100,000 tickets available
- 10M users trying to buy
- Sale opens: 10:00:00 AM
- Spike: 1M requests/second in first 10 seconds

Booking Rate:
- Normal: 100 bookings/second
- Flash sale peak: 10,000 bookings/second
```

---

## 3. Core Entities

```sql
-- Events
CREATE TABLE events (
    event_id BIGINT PRIMARY KEY,
    name VARCHAR(255),
    venue_id BIGINT,
    event_time TIMESTAMP,
    sale_start_time TIMESTAMP,
    status ENUM('draft', 'on_sale', 'sold_out', 'completed'),
    created_at TIMESTAMP
);

-- Venues
CREATE TABLE venues (
    venue_id BIGINT PRIMARY KEY,
    name VARCHAR(255),
    capacity INT,
    seat_map JSON  -- Section/row/seat layout
);

-- Tickets (Inventory)
CREATE TABLE tickets (
    ticket_id BIGINT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    section VARCHAR(50),
    row VARCHAR(10),
    seat_number VARCHAR(10),
    price_cents INT,
    status ENUM('available', 'reserved', 'sold', 'cancelled'),
    reserved_until TIMESTAMP,
    reserved_by BIGINT,
    sold_to BIGINT,
    version INT DEFAULT 0,  -- Optimistic locking
    
    UNIQUE (event_id, section, row, seat_number),
    INDEX idx_event_status (event_id, status)
);

-- Reservations
CREATE TABLE reservations (
    reservation_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    status ENUM('pending', 'completed', 'expired', 'cancelled'),
    total_cents INT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at, status)
);

-- Reservation Items
CREATE TABLE reservation_items (
    reservation_id BIGINT,
    ticket_id BIGINT,
    
    PRIMARY KEY (reservation_id, ticket_id)
);

-- Orders (after payment)
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    reservation_id BIGINT UNIQUE,
    user_id BIGINT,
    payment_id VARCHAR(100),
    total_cents INT,
    status ENUM('pending', 'completed', 'refunded'),
    created_at TIMESTAMP
);
```

---

## 4. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      TICKETMASTER ARCHITECTURE                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                            ┌─────────────┐                                 │
│                            │   Clients   │                                 │
│                            └──────┬──────┘                                 │
│                                   │                                        │
│                        ┌──────────┴──────────┐                            │
│                        │        CDN          │                            │
│                        │  (Static + Waiting) │                            │
│                        └──────────┬──────────┘                            │
│                                   │                                        │
│                        ┌──────────┴──────────┐                            │
│                        │   Load Balancers    │                            │
│                        └──────────┬──────────┘                            │
│                                   │                                        │
│  ┌────────────────────────────────┼────────────────────────────────────┐  │
│  │                         API Gateway                                  │  │
│  │           (Rate Limiting, Bot Detection, Auth)                      │  │
│  └────────────────────────────────┼────────────────────────────────────┘  │
│                                   │                                        │
│    ┌───────────┬──────────────────┼──────────────────┬───────────┐        │
│    ▼           ▼                  ▼                  ▼           ▼        │
│ ┌──────┐  ┌──────────┐      ┌──────────┐      ┌──────────┐ ┌──────────┐ │
│ │Event │  │Inventory │      │ Booking  │      │ Payment  │ │ Waiting  │ │
│ │ Svc  │  │  Svc     │      │  Svc     │      │   Svc    │ │Room Svc  │ │
│ └──┬───┘  └────┬─────┘      └────┬─────┘      └────┬─────┘ └────┬─────┘ │
│    │           │                 │                 │            │        │
│    │           │         ┌───────┴───────┐         │            │        │
│    │           │         │               │         │            │        │
│    │           ▼         ▼               ▼         │            │        │
│    │      ┌─────────┐ ┌─────────┐  ┌─────────┐    │            │        │
│    │      │ Redis   │ │ Ticket  │  │  Order  │    │            │        │
│    │      │ (Locks) │ │   DB    │  │   DB    │    │            │        │
│    │      └─────────┘ └─────────┘  └─────────┘    │            │        │
│    │                                               │            │        │
│    │           ┌───────────────────────────────────┘            │        │
│    │           │                                                │        │
│    │           ▼                                                ▼        │
│    │      ┌─────────┐                                     ┌─────────┐   │
│    │      │ Stripe  │                                     │  Redis  │   │
│    │      │   API   │                                     │ (Queue) │   │
│    │      └─────────┘                                     └─────────┘   │
│    │                                                                     │
│    ▼                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                         READ REPLICAS                                │ │
│ │         (Event details, seat maps - cached heavily)                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deep Dive: Seat Reservation

### The Double-Booking Problem

```
┌─────────────────────────────────────────────────────────────────┐
│                   PREVENTING DOUBLE-BOOKING                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Problem: Two users select same seat at nearly the same time   │
│                                                                 │
│  User A                     User B                              │
│     │                          │                                │
│     │ Check seat → Available   │                                │
│     │                          │ Check seat → Available         │
│     │ Reserve seat             │                                │
│     │                          │ Reserve seat                   │
│     │                          │                                │
│     │     BOTH THINK THEY HAVE THE SEAT! 💥                    │
│                                                                 │
│  Solution: Pessimistic or Optimistic Locking                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Option 1: Pessimistic Locking (Database)

```sql
-- Start transaction
BEGIN;

-- Lock the row
SELECT * FROM tickets 
WHERE ticket_id = 123 
AND status = 'available'
FOR UPDATE;

-- If row returned, update it
UPDATE tickets 
SET status = 'reserved',
    reserved_by = @user_id,
    reserved_until = NOW() + INTERVAL 10 MINUTE
WHERE ticket_id = 123;

COMMIT;
```

**Pros**: Simple, guaranteed consistency  
**Cons**: Lock contention, doesn't scale for hot events

### Option 2: Optimistic Locking (Recommended)

```sql
-- Read current version
SELECT ticket_id, version FROM tickets 
WHERE ticket_id = 123 AND status = 'available';

-- Try to update with version check
UPDATE tickets 
SET status = 'reserved',
    reserved_by = @user_id,
    reserved_until = NOW() + INTERVAL 10 MINUTE,
    version = version + 1
WHERE ticket_id = 123 
AND version = @current_version
AND status = 'available';

-- Check rows affected
-- If 0: Someone else got it, retry with different seat
-- If 1: Success!
```

### Option 3: Distributed Lock (Redis)

```python
class TicketReservationService:
    RESERVATION_TTL = 600  # 10 minutes
    
    def reserve_tickets(self, user_id: str, ticket_ids: List[int]) -> Reservation:
        # Sort ticket IDs to prevent deadlock
        ticket_ids = sorted(ticket_ids)
        
        locks = []
        try:
            # Acquire locks for all tickets
            for ticket_id in ticket_ids:
                lock_key = f"ticket:lock:{ticket_id}"
                lock = self.redis.set(lock_key, user_id, 
                                      nx=True, ex=self.RESERVATION_TTL)
                if not lock:
                    raise TicketUnavailableError(f"Ticket {ticket_id} unavailable")
                locks.append(lock_key)
            
            # All locks acquired - create reservation
            reservation = self.create_reservation(user_id, ticket_ids)
            
            # Update ticket status in database
            self.db.update_tickets(ticket_ids, 
                                   status='reserved',
                                   reserved_by=user_id,
                                   reserved_until=datetime.now() + timedelta(minutes=10))
            
            return reservation
            
        except Exception as e:
            # Release any acquired locks
            for lock_key in locks:
                self.redis.delete(lock_key)
            raise
```

---

## 6. Deep Dive: Reservation Expiry

```
┌─────────────────────────────────────────────────────────────────┐
│                   RESERVATION EXPIRY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Problem: User reserves but never pays                         │
│  Solution: Time-limited reservations (typically 10 minutes)    │
│                                                                 │
│  Implementation Options:                                        │
│  ─────────────────────────                                      │
│                                                                 │
│  1. Background Worker (Polling)                                │
│  ───────────────────────────────                                │
│  Every 30 seconds:                                             │
│    UPDATE tickets                                               │
│    SET status = 'available', reserved_by = NULL                │
│    WHERE status = 'reserved'                                   │
│    AND reserved_until < NOW();                                 │
│                                                                 │
│  2. Redis TTL + Keyspace Notifications                         │
│  ─────────────────────────────────────                          │
│  • Set reservation key with TTL                                │
│  • Subscribe to key expiry events                              │
│  • On expiry: release tickets                                  │
│                                                                 │
│  3. Delayed Queue (Recommended)                                │
│  ──────────────────────────────                                 │
│  • When reserving, enqueue message with delay                  │
│  • After 10 min, worker checks if paid                        │
│  • If not paid, release tickets                               │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Reserve → Queue "check_reservation:123" delay=10min   │    │
│  │                                                        │    │
│  │  10 minutes later...                                  │    │
│  │  Worker processes message:                            │    │
│  │    if reservation.status == 'pending':                │    │
│  │      release_tickets(reservation.ticket_ids)          │    │
│  │      reservation.status = 'expired'                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Deep Dive: Waiting Room / Queue

```
┌─────────────────────────────────────────────────────────────────┐
│                   WAITING ROOM SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Purpose: Control traffic during flash sales                   │
│  ──────────────────────────────────────────                     │
│  • Prevent system overload                                     │
│  • Fair ordering (first come, first served)                    │
│  • Show users their position in queue                          │
│                                                                 │
│  Architecture:                                                  │
│  ──────────────                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  User visits event page                                │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  ┌──────────────┐                                      │    │
│  │  │ Check if     │──► Under capacity ──► Go to site    │    │
│  │  │ queue active │                                      │    │
│  │  └──────────────┘                                      │    │
│  │         │                                               │    │
│  │         ▼ Over capacity                                │    │
│  │  ┌──────────────┐                                      │    │
│  │  │ Assign queue │  Position: 47,832                   │    │
│  │  │ position     │  Wait time: ~12 min                 │    │
│  │  └──────────────┘                                      │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  ┌──────────────┐                                      │    │
│  │  │ Waiting room │  Static page (CDN)                  │    │
│  │  │    page      │  Polls for turn                     │    │
│  │  └──────────────┘                                      │    │
│  │         │                                               │    │
│  │         ▼ Your turn!                                   │    │
│  │  ┌──────────────┐                                      │    │
│  │  │ Issue signed │  Valid for 5 minutes               │    │
│  │  │ access token │                                      │    │
│  │  └──────────────┘                                      │    │
│  │         │                                               │    │
│  │         ▼                                               │    │
│  │  Access to ticket purchase page                        │    │
│  │                                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Implementation:                                                │
│  ─────────────────                                              │
│  • Redis Sorted Set: ZADD queue:{event} {timestamp} {user}    │
│  • Get position: ZRANK queue:{event} {user}                   │
│  • Admit N users/second based on system capacity              │
│  • Signed JWT token for admitted users                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   PAYMENT FLOW                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User completes seat selection                              │
│  2. Create reservation (10 min hold)                           │
│  3. Collect payment info                                       │
│  4. Process payment with Stripe                                │
│  5. If success: Confirm tickets                               │
│  6. If failure: User can retry (reservation still valid)      │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                  Payment Service                        │    │
│  │                                                         │    │
│  │  async def process_payment(reservation_id, payment):   │    │
│  │      reservation = get_reservation(reservation_id)     │    │
│  │                                                         │    │
│  │      # Check not expired                               │    │
│  │      if reservation.expired:                           │    │
│  │          raise ReservationExpired()                    │    │
│  │                                                         │    │
│  │      # Create payment intent                           │    │
│  │      intent = stripe.PaymentIntent.create(             │    │
│  │          amount=reservation.total_cents,               │    │
│  │          currency='usd',                               │    │
│  │          idempotency_key=f"res:{reservation_id}"      │    │
│  │      )                                                  │    │
│  │                                                         │    │
│  │      # Confirm payment                                 │    │
│  │      result = stripe.PaymentIntent.confirm(intent.id)  │    │
│  │                                                         │    │
│  │      if result.status == 'succeeded':                  │    │
│  │          # Mark tickets as sold                        │    │
│  │          confirm_tickets(reservation.ticket_ids)       │    │
│  │          create_order(reservation, result.id)          │    │
│  │          send_confirmation_email()                     │    │
│  │      else:                                              │    │
│  │          raise PaymentFailed()                         │    │
│  │                                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Idempotency:                                                   │
│  ─────────────                                                  │
│  • Use reservation_id as idempotency key                      │
│  • Same reservation can't be charged twice                    │
│  • Safe to retry on network errors                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Bot Protection

```
┌─────────────────────────────────────────────────────────────────┐
│                   BOT PROTECTION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Techniques:                                                    │
│  ────────────                                                   │
│                                                                 │
│  1. CAPTCHA                                                    │
│     • Require before entering queue                           │
│     • Again before payment                                    │
│                                                                 │
│  2. Rate Limiting                                               │
│     • Per IP: 10 requests/second                              │
│     • Per user: 5 reservation attempts/minute                 │
│                                                                 │
│  3. Device Fingerprinting                                       │
│     • Detect multiple accounts from same device               │
│     • Flag suspicious patterns                                │
│                                                                 │
│  4. Proof of Work                                               │
│     • Client must solve computational puzzle                  │
│     • Raises cost for bots                                    │
│                                                                 │
│  5. Queue Randomization                                         │
│     • Don't give exact position initially                     │
│     • Prevents timing attacks                                 │
│                                                                 │
│  6. Verified Fan Program                                        │
│     • Pre-register for events                                 │
│     • Verify identity/phone                                   │
│     • Priority access                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Primary DB | PostgreSQL | ACID, strong consistency |
| Locks | Redis | Fast distributed locks |
| Queue | Redis Sorted Set | Position tracking |
| Cache | Redis Cluster | Seat map caching |
| Payments | Stripe | PCI compliance |
| CDN | CloudFlare | DDoS protection, waiting room |
| Search | Elasticsearch | Event discovery |

---

## 11. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PREVENT DOUBLE-BOOKING                                      │
│     Optimistic locking or distributed locks                    │
│     Never sell same seat twice                                 │
│                                                                 │
│  2. TIME-LIMITED RESERVATIONS                                   │
│     10-minute hold while user pays                             │
│     Automatic expiry releases tickets                          │
│                                                                 │
│  3. WAITING ROOM FOR FLASH SALES                                │
│     Queue users before overwhelming system                     │
│     Fair ordering with signed tokens                          │
│                                                                 │
│  4. IDEMPOTENT PAYMENTS                                         │
│     Safe to retry payment calls                               │
│     Use reservation ID as idempotency key                     │
│                                                                 │
│  5. BOT PROTECTION                                              │
│     Multiple layers of defense                                 │
│     CAPTCHA, rate limiting, fingerprinting                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. References

- [14-distributed-patterns.md](/system-design/fundamentals/14-distributed-patterns.md) - Locking
- [18-rate-limiting.md](/system-design/fundamentals/18-rate-limiting.md) - Rate limiting
- [11-transactions-and-acid.md](/databases/11-transactions-and-acid.md) - ACID

---

[← Back to Problems](/system-design/problems/00-index.md) | [Next: Google Docs →](/system-design/problems/12-google-docs.md)
