# Design Uber

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a ride-sharing platform like Uber that matches riders with nearby drivers in real-time, handles location tracking, and manages trip lifecycle.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Request a ride** - Rider requests pickup from location A to B
2. **Match with driver** - Find and assign nearest available driver
3. **Real-time tracking** - Track driver location during trip
4. **ETA calculation** - Estimated time of arrival
5. **Pricing** - Calculate fare with surge pricing
6. **Payments** - Process ride payments
7. **Ratings** - Rate drivers and riders
8. **Trip history** - View past rides

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | 99.99% availability |
| **CAP** | AP for location, CP for payments |
| **Compliance** | PCI-DSS, local transportation laws |
| **Scalability** | 100M users, 20M trips/day |
| **Latency** | Match < 5s, location update < 1s |
| **Environment** | Global, mobile-first |
| **Durability** | Never lose trip/payment data |
| **Security** | Rider/driver safety features |

---

## 2. Back of Envelope Calculations

### Scale Estimation

```
Users:
- Total users: 100 million
- Active drivers: 5 million
- DAU riders: 20 million
- Trips per day: 20 million

Location Updates:
- Active drivers: 1 million (at peak)
- Update frequency: Every 4 seconds
- Location updates/sec: 1M / 4 = 250,000/sec

Ride Requests:
- 20M trips / 86400 sec ≈ 230 requests/sec
- Peak (rush hour): ~1000 requests/sec
```

### Storage Estimation

```
Location Data (ephemeral):
- 1M drivers × 1 update/4s × 100 bytes = 25 MB/sec
- Keep last 1 hour = 90 GB in memory

Trip Data:
- 20M trips × 5 KB = 100 GB/day
- Per year: 36 TB

Historical Locations (for analytics):
- 250K updates/sec × 100 bytes × 86400 = 2 TB/day
```

---

## 3. Core Entities

```sql
-- Users (Riders and Drivers)
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    type ENUM('rider', 'driver'),
    name VARCHAR(100),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100),
    rating DECIMAL(3,2),
    created_at TIMESTAMP
);

-- Driver Profiles
CREATE TABLE drivers (
    driver_id BIGINT PRIMARY KEY REFERENCES users(user_id),
    license_number VARCHAR(50),
    vehicle_id BIGINT,
    status ENUM('offline', 'available', 'busy'),
    current_lat DECIMAL(10,7),
    current_lng DECIMAL(10,7),
    last_location_update TIMESTAMP
);

-- Vehicles
CREATE TABLE vehicles (
    vehicle_id BIGINT PRIMARY KEY,
    driver_id BIGINT,
    make VARCHAR(50),
    model VARCHAR(50),
    year INT,
    license_plate VARCHAR(20),
    vehicle_type ENUM('uberx', 'comfort', 'xl', 'black')
);

-- Trips
CREATE TABLE trips (
    trip_id BIGINT PRIMARY KEY,
    rider_id BIGINT NOT NULL,
    driver_id BIGINT,
    status ENUM('requested', 'matched', 'driver_arriving', 
                'in_progress', 'completed', 'cancelled'),
    pickup_lat DECIMAL(10,7),
    pickup_lng DECIMAL(10,7),
    dropoff_lat DECIMAL(10,7),
    dropoff_lng DECIMAL(10,7),
    pickup_address TEXT,
    dropoff_address TEXT,
    requested_at TIMESTAMP,
    matched_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    fare_cents INT,
    surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
    distance_meters INT,
    duration_seconds INT,
    
    INDEX idx_rider (rider_id),
    INDEX idx_driver (driver_id),
    INDEX idx_status (status)
);
```

---

## 4. API Design

### Ride Request APIs

```
# Request a ride
POST /api/v1/rides
{
    "pickup": {"lat": 37.7749, "lng": -122.4194},
    "dropoff": {"lat": 37.7849, "lng": -122.4094},
    "vehicle_type": "uberx"
}
Response:
{
    "ride_id": "abc123",
    "status": "matching",
    "estimated_fare": {"min": 1200, "max": 1500, "currency": "USD"},
    "surge_multiplier": 1.2
}

# Get ride status
GET /api/v1/rides/{ride_id}
Response:
{
    "ride_id": "abc123",
    "status": "driver_arriving",
    "driver": {"name": "John", "rating": 4.9, "vehicle": {...}},
    "eta_seconds": 180,
    "driver_location": {"lat": 37.7739, "lng": -122.4184}
}

# Cancel ride
DELETE /api/v1/rides/{ride_id}
```

### Driver APIs

```
# Update driver location (called every 4 seconds)
PUT /api/v1/drivers/location
{
    "lat": 37.7749,
    "lng": -122.4194,
    "heading": 45,
    "speed": 25
}

# Accept/reject ride request
POST /api/v1/drivers/rides/{ride_id}/accept
POST /api/v1/drivers/rides/{ride_id}/reject

# Update ride status
PUT /api/v1/drivers/rides/{ride_id}/status
{
    "status": "in_progress"  // arrived, in_progress, completed
}
```

---

## 5. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           UBER ARCHITECTURE                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│              ┌─────────────┐              ┌─────────────┐                 │
│              │   Rider     │              │   Driver    │                 │
│              │    App      │              │    App      │                 │
│              └──────┬──────┘              └──────┬──────┘                 │
│                     │                           │                         │
│                     └─────────────┬─────────────┘                         │
│                                   │                                        │
│                        ┌──────────┴──────────┐                            │
│                        │   Load Balancers    │                            │
│                        └──────────┬──────────┘                            │
│                                   │                                        │
│    ┌──────────────────────────────┼──────────────────────────────┐        │
│    │                       API Gateway                            │        │
│    └──────────────────────────────┼──────────────────────────────┘        │
│                                   │                                        │
│    ┌────────┬─────────────────────┼─────────────────────┬────────┐        │
│    ▼        ▼                     ▼                     ▼        ▼        │
│ ┌──────┐ ┌──────┐           ┌──────────┐          ┌──────┐ ┌──────────┐  │
│ │ Ride │ │Location          │ Matching │          │ Price│ │ Payment  │  │
│ │ Svc  │ │ Svc  │           │   Svc    │          │ Svc  │ │   Svc    │  │
│ └──┬───┘ └──┬───┘           └────┬─────┘          └──┬───┘ └────┬─────┘  │
│    │        │                    │                   │          │         │
│    │        │               ┌────┴────┐              │          │         │
│    │        │               │         │              │          │         │
│    │        ▼               ▼         ▼              │          │         │
│    │   ┌─────────┐    ┌─────────┐ ┌──────────┐       │          │         │
│    │   │ Redis   │    │ Supply  │ │ Demand   │       │          │         │
│    │   │GeoIndex │    │ Service │ │ Service  │       │          │         │
│    │   └─────────┘    └─────────┘ └──────────┘       │          │         │
│    │        │                                        │          │         │
│    │        │         ┌──────────────────────────────┘          │         │
│    │        │         │                                         │         │
│    │        ▼         ▼                                         ▼         │
│    │   ┌──────────────────┐                           ┌──────────────┐   │
│    │   │    Kafka         │                           │   Stripe/    │   │
│    │   │(Events/Location) │                           │   Payment GW │   │
│    │   └────────┬─────────┘                           └──────────────┘   │
│    │            │                                                         │
│    │     ┌──────┴──────┐                                                 │
│    │     ▼             ▼                                                 │
│    │ ┌───────┐   ┌──────────┐                                           │
│    │ │ ETA   │   │Analytics │                                           │
│    │ │Service│   │ Pipeline │                                           │
│    │ └───────┘   └──────────┘                                           │
│    │                                                                      │
│    └──────────────────────────────────────────────────────────────────────┤
│                                                                            │
│    ┌───────────────────────────────────────────────────────────────────┐  │
│    │                         DATA STORES                                │  │
│    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│    │  │ Postgres │  │  Redis   │  │ Cassandra│  │   S3     │          │  │
│    │  │ (Trips)  │  │(Location)│  │(Location │  │ (Maps)   │          │  │
│    │  │          │  │          │  │ History) │  │          │          │  │
│    │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │  │
│    └───────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Deep Dive: Geospatial Indexing

### The Challenge

Finding nearby drivers requires efficient spatial queries. With millions of drivers updating locations every 4 seconds, traditional database queries won't scale.

### Geohash-Based Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                   GEOHASH INDEXING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Geohash: Encodes lat/lng into a string                        │
│  ─────────────────────────────────────                          │
│  (37.7749, -122.4194) → "9q8yy9"                               │
│                                                                 │
│  Precision:                                                     │
│  ───────────                                                    │
│  │ Length │ Cell Size    │ Use Case              │             │
│  │ 4      │ ~40 km       │ Regional clustering   │             │
│  │ 5      │ ~5 km        │ Neighborhood          │             │
│  │ 6      │ ~1 km        │ City block            │             │
│  │ 7      │ ~150 m       │ Street-level          │             │
│                                                                 │
│  ┌────────────────────────────────────────────┐                │
│  │              City Grid                      │                │
│  │  ┌──────┬──────┬──────┬──────┬──────┐     │                │
│  │  │9q8yy8│9q8yy9│9q8yyb│9q8yyc│9q8yyd│     │                │
│  │  │  D   │ D D  │      │  D   │      │     │                │
│  │  ├──────┼──────┼──────┼──────┼──────┤     │                │
│  │  │9q8yy2│9q8yy3│9q8yy6│9q8yy7│9q8yyk│     │                │
│  │  │      │  D   │ [R]  │ D D D│      │     │                │
│  │  ├──────┼──────┼──────┼──────┼──────┤     │                │
│  │  │9q8yy0│9q8yy1│9q8yy4│9q8yy5│9q8yyh│     │                │
│  │  │  D   │      │  D   │      │  D   │     │                │
│  │  └──────┴──────┴──────┴──────┴──────┘     │                │
│  │                                            │                │
│  │  [R] = Rider, D = Driver                   │                │
│  └────────────────────────────────────────────┘                │
│                                                                 │
│  Finding Nearby Drivers:                                       │
│  ────────────────────────                                       │
│  1. Get rider's geohash: "9q8yy6"                              │
│  2. Get 8 neighboring cells: 9q8yy3, 9q8yy7, 9q8yy4, etc.     │
│  3. Query drivers in all 9 cells                               │
│  4. Calculate exact distances, sort by closest                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Redis Geo Implementation

```python
class LocationService:
    def __init__(self):
        self.redis = Redis()
        
    def update_driver_location(self, driver_id: str, lat: float, lng: float):
        """Update driver location in Redis Geo index"""
        # GEOADD drivers:<city> <lng> <lat> <driver_id>
        self.redis.geoadd(f"drivers:{city}", lng, lat, driver_id)
        
        # Also store in hash for quick lookup
        self.redis.hset(f"driver:{driver_id}", mapping={
            "lat": lat,
            "lng": lng,
            "updated_at": time.time()
        })
        
    def find_nearby_drivers(self, lat: float, lng: float, 
                           radius_km: float = 5, limit: int = 10):
        """Find available drivers within radius"""
        # GEORADIUS drivers:<city> <lng> <lat> <radius> km
        # Returns drivers with distances
        nearby = self.redis.georadius(
            f"drivers:{city}",
            lng, lat,
            radius_km, unit='km',
            withdist=True,
            sort='ASC',
            count=limit * 2  # Get extra to filter unavailable
        )
        
        # Filter to only available drivers
        available = []
        for driver_id, distance in nearby:
            status = self.redis.hget(f"driver:{driver_id}", "status")
            if status == "available":
                available.append((driver_id, distance))
                if len(available) >= limit:
                    break
                    
        return available
```

---

## 7. Deep Dive: Matching Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│                   MATCHING FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Rider Requests Ride                                         │
│  ────────────────────────                                       │
│  POST /rides → Ride Service → Matching Service                 │
│                                                                 │
│  2. Find Candidate Drivers                                      │
│  ──────────────────────────                                     │
│  • Query nearby drivers (5km radius)                           │
│  • Filter by vehicle type, rating, status                      │
│  • Rank by: distance, ETA, acceptance rate                     │
│                                                                 │
│  3. Dispatch to Best Driver                                     │
│  ───────────────────────────                                    │
│  ┌──────────────────────────────────────────────────┐          │
│  │                                                   │          │
│  │   Rider ──────► Matching ──────► Driver 1        │          │
│  │   Request       Service          (Best match)    │          │
│  │                    │                  │          │          │
│  │                    │              Accept?        │          │
│  │                    │                  │          │          │
│  │                    │◄─────YES─────────┘          │          │
│  │                    │                             │          │
│  │                 Matched!                         │          │
│  │                                                   │          │
│  │   If Driver 1 rejects/times out:                │          │
│  │   Retry with Driver 2, Driver 3...              │          │
│  │                                                   │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  4. Driver Assignment Timeout                                   │
│  ─────────────────────────────                                  │
│  • Driver has 15 seconds to accept                             │
│  • 3 retries before failing ride request                       │
│  • Expand search radius if needed                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Matching Service Implementation

```python
class MatchingService:
    DRIVER_ACCEPT_TIMEOUT = 15  # seconds
    MAX_RETRIES = 3
    
    async def match_ride(self, ride_id: str, pickup: Location, 
                         vehicle_type: str) -> Optional[str]:
        """Match ride request with best available driver"""
        
        for attempt in range(self.MAX_RETRIES):
            radius = 5 + (attempt * 2)  # Expand radius on retries
            
            # Find candidate drivers
            candidates = await self.location_service.find_nearby_drivers(
                pickup.lat, pickup.lng,
                radius_km=radius,
                vehicle_type=vehicle_type
            )
            
            # Sort by score (distance, rating, acceptance rate)
            candidates = self.rank_candidates(candidates, pickup)
            
            for driver_id, score in candidates:
                # Try to dispatch to this driver
                accepted = await self.dispatch_to_driver(
                    ride_id, driver_id, pickup
                )
                
                if accepted:
                    await self.assign_driver(ride_id, driver_id)
                    return driver_id
                    
        # No driver found after all retries
        return None
    
    async def dispatch_to_driver(self, ride_id: str, driver_id: str, 
                                  pickup: Location) -> bool:
        """Send ride request to driver and wait for response"""
        
        # Send push notification to driver
        await self.push_service.send(driver_id, {
            "type": "ride_request",
            "ride_id": ride_id,
            "pickup": pickup,
            "timeout": self.DRIVER_ACCEPT_TIMEOUT
        })
        
        # Wait for driver response (with timeout)
        try:
            response = await asyncio.wait_for(
                self.wait_for_driver_response(driver_id, ride_id),
                timeout=self.DRIVER_ACCEPT_TIMEOUT
            )
            return response == "accepted"
        except asyncio.TimeoutError:
            return False
```

---

## 8. Deep Dive: ETA Calculation

```
┌─────────────────────────────────────────────────────────────────┐
│                   ETA CALCULATION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Components:                                                    │
│  ────────────                                                   │
│  1. Road network graph (from OpenStreetMap or HERE)            │
│  2. Real-time traffic data                                     │
│  3. Historical patterns                                        │
│  4. ML-based predictions                                       │
│                                                                 │
│  Architecture:                                                  │
│  ──────────────                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │                   ETA Service                       │        │
│  │                                                     │        │
│  │  ┌─────────────┐   ┌─────────────┐   ┌──────────┐ │        │
│  │  │   Routing   │   │   Traffic   │   │    ML    │ │        │
│  │  │   Engine    │ + │    Data     │ + │  Model   │ │        │
│  │  │  (OSRM/    │   │  (Real-time)│   │(Historical│ │        │
│  │  │   Valhalla) │   │             │   │ patterns)│ │        │
│  │  └─────────────┘   └─────────────┘   └──────────┘ │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                 │
│  Real-time Traffic Sources:                                    │
│  ───────────────────────────                                    │
│  • Driver location updates → Aggregate speed per road segment  │
│  • Partner APIs (Waze, Google Maps)                            │
│  • Historical patterns for time of day                         │
│                                                                 │
│  Caching Strategy:                                              │
│  ──────────────────                                             │
│  • Pre-compute routes between popular zones                    │
│  • Cache ETAs with short TTL (30 seconds)                      │
│  • Partition by city for locality                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Deep Dive: Surge Pricing

```
┌─────────────────────────────────────────────────────────────────┐
│                   SURGE PRICING                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Goal: Balance supply (drivers) and demand (riders)            │
│                                                                 │
│  Calculation:                                                   │
│  ─────────────                                                  │
│  Surge Multiplier = f(demand / supply)                         │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │   Demand/Supply Ratio    │   Surge Multiplier     │        │
│  │─────────────────────────────────────────────────────│        │
│  │   < 1.0                   │   1.0x (no surge)     │        │
│  │   1.0 - 1.5               │   1.0x - 1.5x         │        │
│  │   1.5 - 2.0               │   1.5x - 2.0x         │        │
│  │   2.0 - 3.0               │   2.0x - 2.5x         │        │
│  │   > 3.0                   │   2.5x - 3.0x (cap)   │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                 │
│  Architecture:                                                  │
│  ──────────────                                                 │
│  • Divide city into hexagonal zones (H3)                       │
│  • Calculate supply/demand per zone every 30 seconds           │
│  • Smooth transitions (no sudden jumps)                        │
│  • Notify drivers of high-surge areas                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │                 City Surge Map                    │          │
│  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                  │          │
│  │  │1.0│ │1.2│ │2.0│ │1.5│ │1.0│                  │          │
│  │  └───┘ └───┘ └───┘ └───┘ └───┘                  │          │
│  │   ┌───┐ ┌───┐ ┌───┐ ┌───┐                       │          │
│  │   │1.5│ │2.5│ │1.8│ │1.0│                       │          │
│  │   └───┘ └───┘ └───┘ └───┘                       │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Real-Time Location Streaming

```
┌─────────────────────────────────────────────────────────────────┐
│                   LOCATION STREAMING                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  During Active Trip:                                            │
│  ────────────────────                                           │
│  Driver App → WebSocket → Location Service → Rider App         │
│                                                                 │
│  WebSocket Connection:                                          │
│  ──────────────────────                                         │
│  • Driver app maintains persistent connection                   │
│  • Sends location every 1-4 seconds during trip                │
│  • Rider receives updates in real-time                         │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │                                                     │        │
│  │  Driver ──WSS──► Location ──Kafka──► Rider         │        │
│  │   App            Service           Connection      │        │
│  │                     │              Manager         │        │
│  │                     │                 │            │        │
│  │                     ▼                 ▼            │        │
│  │              ┌───────────┐      ┌─────────┐       │        │
│  │              │   Redis   │      │  WSS    │       │        │
│  │              │  (Latest) │      │ Server  │       │        │
│  │              └───────────┘      └─────────┘       │        │
│  │                                       │           │        │
│  │                                       ▼           │        │
│  │                                   Rider App       │        │
│  │                                                     │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                 │
│  Optimizations:                                                 │
│  ───────────────                                                │
│  • Batch location updates (reduce message count)               │
│  • Dead reckoning on client (interpolate between updates)     │
│  • Compress location payloads                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Geo Index | Redis GEOADD | Fast spatial queries |
| Trip Data | PostgreSQL | ACID for critical data |
| Location History | Cassandra | High write throughput |
| Real-time | WebSocket + Kafka | Live updates |
| ETA/Routing | OSRM / Valhalla | Open-source routing |
| Maps | Mapbox / Google Maps | Rendering |
| Payments | Stripe | PCI compliance |
| Push | FCM + APNs | Mobile notifications |

---

## 12. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. GEOSPATIAL INDEXING                                         │
│     Redis Geo or Geohash for efficient nearby queries          │
│     Partition by city for scalability                          │
│                                                                 │
│  2. REAL-TIME UPDATES                                           │
│     WebSockets for live tracking                                │
│     High-frequency location updates (every 4s)                 │
│                                                                 │
│  3. MATCHING IS CRITICAL                                        │
│     Fast matching = good user experience                       │
│     Balance supply/demand with surge pricing                   │
│                                                                 │
│  4. DIFFERENT CONSISTENCY MODELS                                │
│     AP for locations (eventual consistency OK)                 │
│     CP for payments/trips (strong consistency)                 │
│                                                                 │
│  5. ETA ACCURACY                                                │
│     Combine routing engine + traffic + ML                      │
│     Pre-compute popular routes                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. References

- [15-real-time-communication.md](/system-design/fundamentals/15-real-time-communication.md) - WebSockets
- [12-consistent-hashing.md](/system-design/fundamentals/12-consistent-hashing.md) - Partitioning
- [18-rate-limiting.md](/system-design/fundamentals/18-rate-limiting.md) - API protection

---

[← Back to Problems](/system-design/problems/00-index.md) | [Next: WhatsApp →](/system-design/problems/07-whatsapp.md)
