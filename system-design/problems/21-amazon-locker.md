# Design Amazon Locker

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design an Amazon Locker system that allows customers to pick up and return packages from self-service kiosks with optimal locker allocation based on package sizes.

**Difficulty**: 🟡 Medium (Tier 2)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Allocate locker** - Assign locker for package delivery
2. **Package drop-off** - Delivery driver deposits package
3. **Package pickup** - Customer retrieves with code
4. **Returns** - Customer returns packages
5. **Size matching** - Fit package to appropriate locker
6. **Expiration** - Handle unclaimed packages

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Availability** | 99.9% |
| **Latency** | < 100ms for allocation |
| **Consistency** | Strong (no double allocation) |
| **Scale** | 100K locker locations |
| **Concurrency** | Handle rush periods |

---

## 2. Back of Envelope Calculations

```
Locker Locations:
- 100,000 locations
- 50 lockers per location average
- 5 million total lockers

Daily Volume:
- 10 packages per locker per day
- 50 million package deliveries/day

Allocation Requests:
- Peak: 5 million/hour = 1,400/second
- Average: 500/second

Storage:
- Package record: 500 bytes
- 50M × 500 = 25 GB/day
- Retention: 30 days = 750 GB
```

---

## 3. Core Entities

```sql
-- Locker Locations
CREATE TABLE locker_locations (
    location_id UUID PRIMARY KEY,
    name VARCHAR(255),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    operating_hours JSON,  -- {open: "06:00", close: "22:00"}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP
);

-- Individual Lockers
CREATE TABLE lockers (
    locker_id UUID PRIMARY KEY,
    location_id UUID NOT NULL,
    locker_number VARCHAR(10),  -- "A1", "B5"
    size ENUM('small', 'medium', 'large', 'xlarge'),
    status ENUM('available', 'reserved', 'occupied', 'maintenance'),
    dimensions JSON,  -- {height: 10, width: 12, depth: 18}
    updated_at TIMESTAMP,
    
    INDEX idx_location_size (location_id, size, status),
    UNIQUE INDEX idx_location_number (location_id, locker_number)
);

-- Package Allocations
CREATE TABLE package_allocations (
    allocation_id UUID PRIMARY KEY,
    locker_id UUID NOT NULL,
    package_id VARCHAR(100) NOT NULL,
    order_id VARCHAR(100),
    customer_id UUID NOT NULL,
    pickup_code VARCHAR(6),  -- One-time code
    size ENUM('small', 'medium', 'large', 'xlarge'),
    status ENUM('reserved', 'deposited', 'picked_up', 'returned', 'expired'),
    reserved_at TIMESTAMP,
    deposited_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    UNIQUE INDEX idx_pickup_code (pickup_code),
    INDEX idx_package (package_id),
    INDEX idx_locker (locker_id),
    INDEX idx_customer (customer_id),
    INDEX idx_expiration (expires_at, status)
);

-- Returns
CREATE TABLE locker_returns (
    return_id UUID PRIMARY KEY,
    locker_id UUID NOT NULL,
    order_id VARCHAR(100),
    customer_id UUID NOT NULL,
    return_code VARCHAR(6),
    status ENUM('pending', 'deposited', 'collected'),
    created_at TIMESTAMP,
    deposited_at TIMESTAMP,
    collected_at TIMESTAMP
);
```

---

## 4. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   AMAZON LOCKER ARCHITECTURE                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                     │
│  │  Customer   │   │  Delivery   │   │   Locker    │                     │
│  │    App      │   │   Driver    │   │   Kiosk     │                     │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘                     │
│         │                 │                 │                             │
│         └─────────────────┼─────────────────┘                             │
│                           │                                                │
│                           ▼                                                │
│                    ┌─────────────┐                                        │
│                    │    API      │                                        │
│                    │   Gateway   │                                        │
│                    └──────┬──────┘                                        │
│                           │                                                │
│         ┌─────────────────┼─────────────────┐                             │
│         │                 │                 │                              │
│         ▼                 ▼                 ▼                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                     │
│  │ Allocation  │   │  Locker     │   │   Pickup    │                     │
│  │  Service    │   │  Service    │   │   Service   │                     │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘                     │
│         │                 │                 │                              │
│         └─────────────────┼─────────────────┘                             │
│                           │                                                │
│                           ▼                                                │
│                    ┌─────────────┐                                        │
│                    │  Database   │                                        │
│                    │ (PostgreSQL)│                                        │
│                    └──────┬──────┘                                        │
│                           │                                                │
│                    ┌──────┴──────┐                                        │
│                    ▼             ▼                                        │
│             ┌──────────┐  ┌───────────┐                                  │
│             │  Cache   │  │Notification│                                  │
│             │ (Redis)  │  │  Service   │                                  │
│             └──────────┘  └───────────┘                                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deep Dive: Locker Allocation

```
┌─────────────────────────────────────────────────────────────────┐
│                   LOCKER ALLOCATION ALGORITHM                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Goal: Assign smallest available locker that fits package      │
│                                                                 │
│  Size Hierarchy:                                                │
│  ─────────────────                                              │
│  Small:  6" × 8" × 12"   (fits small items)                   │
│  Medium: 10" × 12" × 18" (fits most packages)                 │
│  Large:  18" × 18" × 24" (fits large boxes)                   │
│  XLarge: 24" × 24" × 36" (fits oversized items)               │
│                                                                 │
│  Allocation Strategy:                                           │
│  ─────────────────────                                          │
│  1. Determine minimum locker size for package                  │
│  2. Try to allocate exact size                                 │
│  3. If unavailable, try next larger size                      │
│  4. Repeat until allocation or failure                        │
│                                                                 │
│  def allocate_locker(location_id, package_size):               │
│      sizes = get_valid_sizes(package_size)  # [medium, large, xlarge]
│                                                                 │
│      for size in sizes:                                        │
│          locker = try_allocate(location_id, size)             │
│          if locker:                                            │
│              return locker                                     │
│                                                                 │
│      return None  # No locker available                       │
│                                                                 │
│  Atomic Allocation (prevent double booking):                   │
│  ─────────────────────────────────────────────                  │
│  UPDATE lockers                                                │
│  SET status = 'reserved'                                       │
│  WHERE location_id = :location_id                             │
│    AND size = :size                                           │
│    AND status = 'available'                                   │
│  LIMIT 1                                                       │
│  RETURNING locker_id;                                          │
│                                                                 │
│  Or with FOR UPDATE:                                           │
│                                                                 │
│  BEGIN;                                                         │
│  SELECT locker_id FROM lockers                                │
│  WHERE location_id = :loc AND size = :size AND status = 'available'
│  ORDER BY locker_number                                        │
│  LIMIT 1                                                       │
│  FOR UPDATE SKIP LOCKED;                                       │
│                                                                 │
│  UPDATE lockers SET status = 'reserved' WHERE locker_id = :id;│
│  COMMIT;                                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Locker State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                   LOCKER STATE MACHINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────┐                             │
│                    │  AVAILABLE  │                             │
│                    └──────┬──────┘                             │
│                           │                                     │
│              Allocate for │ package                            │
│                           ▼                                     │
│                    ┌─────────────┐                             │
│                    │  RESERVED   │──── Reservation timeout    │
│                    └──────┬──────┘     (24h) ──────┐          │
│                           │                        │           │
│               Driver      │ deposits               │           │
│                           ▼                        │           │
│                    ┌─────────────┐                │           │
│                    │  OCCUPIED   │                │           │
│                    └──────┬──────┘                │           │
│                           │                        │           │
│                    ┌──────┴──────┐                │           │
│                    │             │                │           │
│         Customer   ▼   Expires   ▼                │           │
│          picks up  │    (3 days) │                │           │
│                    │             │                │           │
│                    ▼             ▼                ▼           │
│              ┌──────────┐  ┌──────────┐   ┌──────────┐       │
│              │ AVAILABLE│  │ EXPIRED  │   │ AVAILABLE│       │
│              └──────────┘  └────┬─────┘   └──────────┘       │
│                                 │                              │
│                     Staff       │ collects                    │
│                                 ▼                              │
│                          ┌──────────┐                         │
│                          │ AVAILABLE│                         │
│                          └──────────┘                         │
│                                                                 │
│  Maintenance State:                                             │
│  ───────────────────                                            │
│  Any state can transition to MAINTENANCE                      │
│  MAINTENANCE returns to AVAILABLE after repair                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Pickup Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   PICKUP PROCESS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Customer arrives at kiosk                                  │
│  2. Enters 6-digit pickup code                                 │
│  3. System validates code                                      │
│  4. Locker door opens                                          │
│  5. Customer retrieves package                                 │
│  6. Door closes, locker marked available                      │
│                                                                 │
│  Code Generation:                                               │
│  ─────────────────                                              │
│  • 6 alphanumeric characters (base 36)                        │
│  • 36^6 = 2 billion combinations                              │
│  • Valid for 3 days                                            │
│  • One-time use                                                │
│                                                                 │
│  def generate_pickup_code():                                   │
│      while True:                                               │
│          code = ''.join(random.choices(                       │
│              string.ascii_uppercase + string.digits, k=6))    │
│          if not code_exists(code):                            │
│              return code                                       │
│                                                                 │
│  Validation:                                                    │
│  ────────────                                                   │
│  def validate_pickup(location_id, code):                       │
│      allocation = db.get_allocation(code)                     │
│                                                                 │
│      if not allocation:                                        │
│          return error("Invalid code")                         │
│                                                                 │
│      if allocation.status != 'deposited':                     │
│          return error("Package not available")                │
│                                                                 │
│      if allocation.expires_at < now():                        │
│          return error("Code expired")                         │
│                                                                 │
│      locker = db.get_locker(allocation.locker_id)            │
│      if locker.location_id != location_id:                   │
│          return error("Wrong location")                       │
│                                                                 │
│      # Open locker                                             │
│      open_locker(locker.locker_number)                        │
│      mark_picked_up(allocation)                               │
│      return success(locker.locker_number)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Location Finding

```
┌─────────────────────────────────────────────────────────────────┐
│                   NEARBY LOCKER LOCATIONS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Find locations near customer:                                  │
│  ──────────────────────────────                                 │
│  SELECT                                                         │
│      location_id,                                              │
│      name,                                                     │
│      address,                                                  │
│      ST_Distance(                                              │
│          ST_Point(longitude, latitude),                       │
│          ST_Point(:user_lng, :user_lat)                       │
│      ) as distance                                             │
│  FROM locker_locations                                         │
│  WHERE is_active = true                                        │
│  ORDER BY distance                                             │
│  LIMIT 10;                                                     │
│                                                                 │
│  With Availability:                                             │
│  ───────────────────                                            │
│  SELECT                                                         │
│      ll.location_id,                                           │
│      ll.name,                                                  │
│      SUM(CASE WHEN l.size = 'small' AND l.status = 'available'│
│          THEN 1 ELSE 0 END) as small_available,               │
│      SUM(CASE WHEN l.size = 'medium' AND l.status = 'available'│
│          THEN 1 ELSE 0 END) as medium_available,              │
│      SUM(CASE WHEN l.size = 'large' AND l.status = 'available'│
│          THEN 1 ELSE 0 END) as large_available                │
│  FROM locker_locations ll                                      │
│  JOIN lockers l ON ll.location_id = l.location_id             │
│  WHERE ll.is_active = true                                     │
│  GROUP BY ll.location_id                                       │
│  HAVING SUM(CASE WHEN l.status = 'available' THEN 1 ELSE 0 END) > 0
│  ORDER BY distance                                             │
│  LIMIT 10;                                                     │
│                                                                 │
│  Caching Strategy:                                              │
│  ──────────────────                                             │
│  • Cache availability counts (TTL: 1 minute)                  │
│  • Invalidate on allocation/release                           │
│  • Slightly stale is acceptable                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Expiration Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                   EXPIRATION HANDLING                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Expiration Policy:                                             │
│  ───────────────────                                            │
│  • Packages expire after 3 days                               │
│  • Reminder notifications sent                                │
│  • Expired packages returned to warehouse                     │
│                                                                 │
│  Notification Schedule:                                         │
│  ───────────────────────                                        │
│  • On deposit: Pickup code sent                               │
│  • Day 2: "Package waiting" reminder                          │
│  • Day 3 (8am): "Expires today" warning                       │
│  • Expiration: "Package expired" notice                       │
│                                                                 │
│  Expiration Job (runs every hour):                             │
│  ───────────────────────────────────                            │
│  def process_expirations():                                    │
│      expired = db.query("""                                   │
│          SELECT * FROM package_allocations                    │
│          WHERE status = 'deposited'                           │
│          AND expires_at < NOW()                               │
│          FOR UPDATE SKIP LOCKED                               │
│      """)                                                       │
│                                                                 │
│      for allocation in expired:                               │
│          # Update allocation status                           │
│          allocation.status = 'expired'                        │
│          db.save(allocation)                                  │
│                                                                 │
│          # Free up locker                                      │
│          locker = db.get_locker(allocation.locker_id)        │
│          locker.status = 'available'                         │
│          db.save(locker)                                      │
│                                                                 │
│          # Create return shipment                             │
│          create_return_to_warehouse(allocation)               │
│                                                                 │
│          # Notify customer                                     │
│          notify_customer_expired(allocation.customer_id)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Concurrency Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                   CONCURRENCY HANDLING                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Problem: Multiple requests trying to allocate same locker    │
│                                                                 │
│  Solution 1: Database Locking                                   │
│  ─────────────────────────────                                  │
│  FOR UPDATE SKIP LOCKED                                        │
│  • Locks row during transaction                               │
│  • SKIP LOCKED avoids waiting (tries next row)               │
│                                                                 │
│  Solution 2: Optimistic Locking                                 │
│  ───────────────────────────────                                │
│  UPDATE lockers                                                │
│  SET status = 'reserved', version = version + 1              │
│  WHERE locker_id = :id                                        │
│    AND status = 'available'                                   │
│    AND version = :expected_version;                          │
│                                                                 │
│  If affected_rows = 0, retry with different locker            │
│                                                                 │
│  Solution 3: Redis Distributed Lock                            │
│  ────────────────────────────────────                           │
│  def allocate_with_lock(location_id, size):                   │
│      lock_key = f"allocation:{location_id}"                   │
│      if redis.set(lock_key, "1", nx=True, ex=5):             │
│          try:                                                  │
│              return allocate_locker(location_id, size)        │
│          finally:                                              │
│              redis.delete(lock_key)                           │
│      else:                                                      │
│          raise RetryLater()                                   │
│                                                                 │
│  Best Practice for Lockers:                                     │
│  ───────────────────────────                                    │
│  Use FOR UPDATE SKIP LOCKED - simple and effective            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. API Design

```
┌─────────────────────────────────────────────────────────────────┐
│                   API DESIGN                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Allocate Locker:                                               │
│  ─────────────────                                              │
│  POST /api/v1/allocations                                      │
│  {                                                              │
│    "location_id": "loc_123",                                  │
│    "package_id": "pkg_456",                                   │
│    "order_id": "ord_789",                                     │
│    "customer_id": "cust_012",                                 │
│    "package_size": "medium"                                   │
│  }                                                              │
│                                                                 │
│  Response:                                                      │
│  {                                                              │
│    "allocation_id": "alloc_999",                              │
│    "locker_number": "B5",                                     │
│    "location": "123 Main St",                                 │
│    "pickup_code": "AB12CD",                                   │
│    "expires_at": "2024-01-18T10:00:00Z"                       │
│  }                                                              │
│                                                                 │
│  Deposit Package (Driver):                                      │
│  ──────────────────────────                                     │
│  POST /api/v1/allocations/{allocation_id}/deposit             │
│  {                                                              │
│    "driver_id": "drv_555",                                    │
│    "scan_code": "pkg_456_barcode"                             │
│  }                                                              │
│                                                                 │
│  Pickup Package (Customer):                                     │
│  ───────────────────────────                                    │
│  POST /api/v1/pickup                                           │
│  {                                                              │
│    "location_id": "loc_123",                                  │
│    "pickup_code": "AB12CD"                                    │
│  }                                                              │
│                                                                 │
│  Response:                                                      │
│  {                                                              │
│    "success": true,                                            │
│    "locker_number": "B5",                                     │
│    "message": "Locker B5 is now open"                        │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Database | PostgreSQL | ACID, geospatial |
| Cache | Redis | Availability counts |
| Geo Search | PostGIS | Location queries |
| Notifications | SNS/SQS | Reliable delivery |
| Kiosk Communication | MQTT | IoT protocol |
| API | REST | Simple, stateless |

---

## 13. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SIZE-BASED ALLOCATION                                       │
│     Smallest fit first, fallback to larger                     │
│                                                                 │
│  2. ATOMIC ALLOCATION                                           │
│     FOR UPDATE SKIP LOCKED prevents double booking            │
│                                                                 │
│  3. STATE MACHINE                                               │
│     Clear transitions: available → reserved → occupied        │
│                                                                 │
│  4. ONE-TIME CODES                                              │
│     6-digit alphanumeric, 3-day expiry                        │
│                                                                 │
│  5. EXPIRATION HANDLING                                         │
│     Automated cleanup with notifications                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 14. References

- [11-databases.md](/system-design/fundamentals/11-database-scaling.md) - Locking strategies
- [14-distributed-patterns.md](/system-design/fundamentals/14-distributed-patterns.md) - State machines
- [05-caching.md](/system-design/fundamentals/07-caching.md) - Availability caching

---

[← Back to Problems](/system-design/problems/00-index.md)
