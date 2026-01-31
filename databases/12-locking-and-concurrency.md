# Locking and Concurrency

[← Back to Index](00-index.md)

---

## Overview

When multiple transactions access the same data simultaneously, the database must coordinate them to prevent conflicts. Locking mechanisms ensure data integrity while balancing concurrency. Understanding locks helps you write efficient concurrent applications and debug contention issues.

### When This Matters Most
- High-concurrency applications
- Debugging performance bottlenecks
- Designing scalable systems
- Understanding deadlocks and contention

---

## Lock Types

### Lock Granularity

| Level | Scope | Concurrency | Overhead |
|-------|-------|-------------|----------|
| **Database** | Entire database | Very Low | Very Low |
| **Table** | All rows in table | Low | Low |
| **Page** | Database page (~8KB) | Medium | Medium |
| **Row** | Single row | High | High |

Most modern databases use **row-level locking** for maximum concurrency.

### Lock Modes

| Mode | Also Called | Allows | Blocks |
|------|-------------|--------|--------|
| **Shared (S)** | Read Lock | Other S locks | X locks |
| **Exclusive (X)** | Write Lock | Nothing | All locks |
| **Update (U)** | | S locks | U and X locks |
| **Intent** | IS, IX, SIX | Depends | Depends |

```
Lock Compatibility Matrix:

         │ Shared (S) │ Exclusive (X)
─────────┼────────────┼──────────────
Shared   │     ✅     │      ❌
─────────┼────────────┼──────────────
Exclusive│     ❌     │      ❌

S + S = OK (multiple readers)
S + X = BLOCK
X + X = BLOCK
```

---

## Row-Level Locking

### Implicit Locking

```sql
-- SELECT: Usually no locks (MVCC snapshot) or Shared lock
SELECT * FROM accounts WHERE id = 1;

-- UPDATE/DELETE: Exclusive lock on affected rows
UPDATE accounts SET balance = 500 WHERE id = 1;
-- ↑ Row locked until transaction commits/rollbacks

-- INSERT: Exclusive lock on new row
INSERT INTO accounts (id, balance) VALUES (3, 1000);
```

### Explicit Locking

```sql
-- FOR UPDATE: Exclusive lock
BEGIN;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- Row is now locked, other transactions wait
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- FOR SHARE: Shared lock (allows other readers)
SELECT * FROM products WHERE id = 5 FOR SHARE;
-- Others can read, but cannot update/delete

-- FOR NO KEY UPDATE: Weaker exclusive (doesn't block FK checks)
SELECT * FROM orders WHERE id = 100 FOR NO KEY UPDATE;

-- FOR KEY SHARE: Weakest (only blocks FOR UPDATE)
SELECT * FROM products WHERE id = 5 FOR KEY SHARE;
```

### Lock Modifiers

```sql
-- NOWAIT: Fail immediately if locked
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
-- ERROR: could not obtain lock on row in relation "accounts"

-- SKIP LOCKED: Skip locked rows (for queue processing)
SELECT * FROM job_queue 
WHERE status = 'pending' 
ORDER BY created_at 
LIMIT 5 
FOR UPDATE SKIP LOCKED;
-- Returns only unlocked rows
```

---

## Table-Level Locking

Rarely needed but available for specific scenarios.

```sql
-- PostgreSQL: Various table lock modes
LOCK TABLE orders IN ACCESS SHARE MODE;      -- Weakest, SELECT
LOCK TABLE orders IN ROW SHARE MODE;         -- SELECT FOR UPDATE
LOCK TABLE orders IN ROW EXCLUSIVE MODE;     -- UPDATE/DELETE
LOCK TABLE orders IN SHARE MODE;             -- Block writes, allow reads
LOCK TABLE orders IN EXCLUSIVE MODE;         -- Block most operations
LOCK TABLE orders IN ACCESS EXCLUSIVE MODE;  -- Block everything (DDL)

-- MySQL
LOCK TABLES orders READ;   -- Shared lock
LOCK TABLES orders WRITE;  -- Exclusive lock
UNLOCK TABLES;

-- SQL Server
SELECT * FROM orders WITH (TABLOCKX);  -- Exclusive table lock
```

**When to use table locks:**
- Bulk operations on most of the table
- Schema changes
- Preventing all concurrent access temporarily

---

## Intent Locks

Intent locks indicate that a transaction intends to acquire a finer-grained lock.

```
                    Table Level
                         │
            ┌────────────┼────────────┐
            │            │            │
     Intent Shared  Intent Excl  Shared/Excl
         (IS)          (IX)        (S/X)
            │            │
            ▼            ▼
       Row Shared   Row Exclusive
          (S)           (X)
```

**Why intent locks exist:**
- Without: To check if any row is locked, scan all rows
- With: Just check table's intent lock (O(1) instead of O(n))

```sql
-- Transaction A
BEGIN;
UPDATE orders SET status = 'shipped' WHERE id = 1;
-- Acquires: IX lock on table, X lock on row 1

-- Transaction B  
BEGIN;
LOCK TABLE orders IN EXCLUSIVE MODE;
-- Blocked! Table has IX lock from Transaction A

-- Transaction C
BEGIN;
UPDATE orders SET status = 'shipped' WHERE id = 2;
-- Succeeds! IX + IX are compatible, row 2 is free
```

---

## Locking in MVCC Databases

PostgreSQL and MySQL (InnoDB) combine MVCC with locking:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MVCC + Locking                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  READS (SELECT without FOR UPDATE):                                      │
│  - No locks acquired                                                     │
│  - Read from snapshot (MVCC)                                            │
│  - Never blocked by writers                                              │
│                                                                          │
│  WRITES (UPDATE/DELETE/INSERT):                                          │
│  - Acquire exclusive row locks                                           │
│  - Create new row versions (MVCC)                                        │
│  - Block other writers to same row                                       │
│                                                                          │
│  Result: Readers and writers don't block each other                      │
│          Only writers block other writers (on same rows)                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Lock Contention

### Diagnosing Lock Waits

```sql
-- PostgreSQL: View current locks
SELECT 
    pg_locks.pid,
    pg_stat_activity.query,
    pg_locks.mode,
    pg_locks.granted,
    pg_class.relname
FROM pg_locks
JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
LEFT JOIN pg_class ON pg_locks.relation = pg_class.oid
WHERE NOT pg_locks.granted;  -- Waiting locks

-- PostgreSQL: Blocking queries (who blocks whom)
SELECT 
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks 
    ON blocked_locks.locktype = blocking_locks.locktype
    AND blocked_locks.database IS NOT DISTINCT FROM blocking_locks.database
    AND blocked_locks.relation IS NOT DISTINCT FROM blocking_locks.relation
    AND blocked_locks.page IS NOT DISTINCT FROM blocking_locks.page
    AND blocked_locks.tuple IS NOT DISTINCT FROM blocking_locks.tuple
    AND blocked_locks.pid != blocking_locks.pid
JOIN pg_stat_activity blocking ON blocking_locks.pid = blocking.pid
WHERE blocked_locks.granted = false AND blocking_locks.granted = true;

-- MySQL: Show locks
SHOW ENGINE INNODB STATUS;  -- Look for TRANSACTIONS section
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;

-- SQL Server
SELECT * FROM sys.dm_tran_locks WHERE request_status = 'WAIT';
```

### Reducing Contention

```sql
-- 1. Keep transactions short
BEGIN;
-- ❌ Bad: Long-running transaction
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- ... user thinks for 5 minutes ...
UPDATE accounts SET balance = 500 WHERE id = 1;
COMMIT;

-- ✅ Good: Quick in-and-out
BEGIN;
UPDATE accounts SET balance = 500 WHERE id = 1;
COMMIT;

-- 2. Access rows in consistent order (prevents deadlocks)
BEGIN;
-- Always sort by primary key before locking
SELECT * FROM accounts WHERE id IN (1, 5, 3) ORDER BY id FOR UPDATE;
COMMIT;

-- 3. Use appropriate isolation level
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- Lower = less locking

-- 4. Consider optimistic locking for low-conflict scenarios
```

---

## Deadlock Handling

### Deadlock Detection

Databases automatically detect deadlocks (cycle in wait graph):

```
   Transaction A                 Transaction B
        │                             │
        ▼                             ▼
   Lock Row 1 ───────────────────────────────┐
        │                             │      │
        │                        Lock Row 2  │
        │                             │      │
   Wait for Row 2 ◄───────────────────┤      │
        │                             │      │
        │                    Wait for Row 1 ◄┘
        │                             │
        └────────── DEADLOCK! ────────┘

Database picks a "victim" transaction to abort.
```

### Deadlock Prevention Strategies

```sql
-- Strategy 1: Lock ordering (always lock in same order)
BEGIN;
-- Sort resource IDs: if updating accounts 5 and 3, lock 3 first
SELECT * FROM accounts WHERE id = 3 FOR UPDATE;
SELECT * FROM accounts WHERE id = 5 FOR UPDATE;
-- Now safe to update both
COMMIT;

-- Strategy 2: Lock timeout
SET lock_timeout = '5s';  -- Fail if can't acquire lock in 5 seconds

-- Strategy 3: Acquire all locks upfront
BEGIN;
SELECT * FROM accounts WHERE id IN (1, 2, 3) FOR UPDATE;
-- All or nothing - won't partially lock and wait
COMMIT;

-- Strategy 4: Use advisory locks for application-level locking
SELECT pg_advisory_lock(12345);  -- Acquire
-- Do work...
SELECT pg_advisory_unlock(12345);  -- Release
```

---

## Advisory Locks

Application-controlled locks (not tied to specific rows/tables):

```sql
-- PostgreSQL Advisory Locks

-- Session-level (held until session ends or explicitly released)
SELECT pg_advisory_lock(key);         -- Block until acquired
SELECT pg_try_advisory_lock(key);     -- Non-blocking, returns true/false
SELECT pg_advisory_unlock(key);       -- Release

-- Transaction-level (automatically released at commit/rollback)
SELECT pg_advisory_xact_lock(key);
SELECT pg_try_advisory_xact_lock(key);

-- Use cases:
-- 1. Prevent concurrent execution of a job
SELECT pg_try_advisory_lock(hashtext('daily-report-job'));
-- Returns false if another process is running the job

-- 2. Lock on a custom resource
SELECT pg_advisory_lock(hashtext('user:' || user_id::text));
-- Lock specific to a user (for rate limiting, etc.)
```

---

## Gap Locking and Next-Key Locking (MySQL)

InnoDB uses special locks to prevent phantom reads:

```sql
-- Gap Lock: Locks the gap between index records
-- Prevents inserts into that range

-- Example: Table has id values 1, 5, 10
-- Query locks id > 3 AND id &lt; 7
-- Gap lock covers (5, 10) - prevents insert of id=7, 8, 9

-- Next-Key Lock = Gap Lock + Record Lock
-- Locks the record AND the gap before it

-- Example transaction:
BEGIN;
SELECT * FROM orders WHERE order_id BETWEEN 5 AND 10 FOR UPDATE;
-- Locks: records 5-10 AND gap before each

-- Another transaction:
INSERT INTO orders (order_id) VALUES (7);  -- Blocked!
-- Can't insert into the locked gap
COMMIT;
```

---

## Optimistic vs Pessimistic Locking

| Approach | How It Works | Best For |
|----------|--------------|----------|
| **Pessimistic** | Lock before reading | High contention, short transactions |
| **Optimistic** | Check at update time | Low contention, longer operations |

### Pessimistic Locking

```sql
-- Lock row before modification
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- Check balance >= 100 (application logic)
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

### Optimistic Locking

```sql
-- Use version column to detect conflicts
ALTER TABLE accounts ADD COLUMN version INT DEFAULT 0;

-- Read without locking
SELECT id, balance, version FROM accounts WHERE id = 1;
-- Returns: balance=500, version=3

-- Later, attempt update with version check
UPDATE accounts 
SET balance = 400, version = version + 1 
WHERE id = 1 AND version = 3;

-- If affected_rows = 1: Success
-- If affected_rows = 0: Conflict! Reload and retry
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Keep transactions short**: Minimize lock hold time
- **Use consistent lock ordering**: Prevent deadlocks
- **Choose appropriate isolation level**: Lower = less locking
- **Use SKIP LOCKED for queues**: Enables parallel processing
- **Monitor lock waits**: Identify contention hotspots

### ❌ Avoid:
- **Long-running transactions**: Hold locks too long
- **Locking in arbitrary order**: Causes deadlocks
- **Ignoring deadlock handling**: Always code for retry
- **Excessive SELECT FOR UPDATE**: Use only when necessary

---

## Exercises

### Exercise 1: Lock Identification 🟢

**Scenario:** Identify what locks are acquired:

```sql
-- Query 1
SELECT balance FROM accounts WHERE id = 1;

-- Query 2
UPDATE accounts SET balance = 200 WHERE id = 1;

-- Query 3
SELECT * FROM orders WHERE customer_id = 5 FOR SHARE;

-- Query 4
DELETE FROM old_logs WHERE created_at &lt; '2020-01-01';
```

<details>
<summary>✅ Solution</summary>

**Query 1: SELECT (no FOR UPDATE)**
- **PostgreSQL/MySQL InnoDB**: No locks (MVCC snapshot read)
- **SQL Server Read Committed**: Shared lock, released immediately

**Query 2: UPDATE**
- Exclusive (X) lock on the row with id = 1
- Intent Exclusive (IX) lock on the table
- Held until transaction commits/rollbacks

**Query 3: SELECT FOR SHARE**
- Shared (S) lock on all matching rows (customer_id = 5)
- Intent Shared (IS) lock on the table
- Other transactions can read but not update/delete

**Query 4: DELETE**
- Exclusive (X) lock on each row matching the condition
- Intent Exclusive (IX) lock on the table
- If many rows match, could lock significant portion of table

</details>

---

### Exercise 2: Deadlock Analysis 🟡

**Scenario:** Analyze this deadlock:

```sql
-- Transaction A (started at 10:00:00)
BEGIN;
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 100;
-- Running...

-- Transaction B (started at 10:00:01)
BEGIN;
UPDATE inventory SET quantity = quantity + 5 WHERE product_id = 200;
UPDATE inventory SET quantity = quantity - 2 WHERE product_id = 100;  -- Waiting...

-- Transaction A (10:00:02)
UPDATE inventory SET quantity = quantity + 3 WHERE product_id = 200;  -- DEADLOCK!
```

**Questions:**
1. Draw the wait graph
2. Which transaction will be aborted?
3. How to prevent this deadlock?

<details>
<summary>✅ Solution</summary>

**1. Wait Graph:**
```
    Transaction A                Transaction B
         │                            │
         ▼                            ▼
    Holds: Row 100              Holds: Row 200
         │                            │
         │                            ▼
         │                     Waits for: Row 100
         │                            │
         ▼                            │
    Waits for: Row 200 ◄──────────────┘
         
    Cycle detected: A → B → A
```

**2. Which is aborted?**
- Database chooses based on cost (work done, locks held)
- Typically the younger transaction or the one with less work
- In this case, likely Transaction B (started later)
- The aborted transaction receives: `ERROR: deadlock detected`

**3. Prevention:**
```sql
-- Solution 1: Consistent lock order (always lock lower product_id first)
BEGIN;
-- Both transactions sort their updates by product_id
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 100;
UPDATE inventory SET quantity = quantity + 3 WHERE product_id = 200;
COMMIT;

-- Solution 2: Lock all needed rows upfront
BEGIN;
SELECT * FROM inventory WHERE product_id IN (100, 200) ORDER BY product_id FOR UPDATE;
-- Now safe to update in any order
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 100;
UPDATE inventory SET quantity = quantity + 3 WHERE product_id = 200;
COMMIT;

-- Solution 3: Use lock timeout
SET lock_timeout = '1s';
-- Transaction will fail fast instead of deadlocking
```

</details>

---

### Exercise 3: Queue Processing Design 🔴

**Scenario:** Design a job queue table and processing logic that:
1. Allows multiple workers to process jobs concurrently
2. Ensures each job is processed exactly once
3. Handles worker crashes (jobs don't get stuck)
4. Maintains job priority

<details>
<summary>✅ Solution</summary>

**Table Design:**
```sql
CREATE TABLE job_queue (
    job_id SERIAL PRIMARY KEY,
    payload JSONB NOT NULL,
    priority INT DEFAULT 0,  -- Higher = more urgent
    status VARCHAR(20) DEFAULT 'pending',
    worker_id VARCHAR(100),  -- Which worker claimed it
    claimed_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error_message TEXT
);

CREATE INDEX idx_job_queue_pending 
ON job_queue (priority DESC, created_at) 
WHERE status = 'pending';

CREATE INDEX idx_job_queue_processing 
ON job_queue (claimed_at) 
WHERE status = 'processing';
```

**Claim a Job:**
```sql
-- Worker claims next available job
UPDATE job_queue
SET 
    status = 'processing',
    worker_id = 'worker-123',
    claimed_at = NOW(),
    attempts = attempts + 1
WHERE job_id = (
    SELECT job_id 
    FROM job_queue 
    WHERE status = 'pending' 
      AND attempts &lt; max_attempts
    ORDER BY priority DESC, created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED  -- Key: Skip jobs other workers are claiming
)
RETURNING *;
```

**Complete a Job:**
```sql
UPDATE job_queue
SET 
    status = 'completed',
    completed_at = NOW()
WHERE job_id = 123 AND worker_id = 'worker-123';
```

**Handle Failures:**
```sql
-- On error, return to pending (if retries left)
UPDATE job_queue
SET 
    status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
    worker_id = NULL,
    claimed_at = NULL,
    error_message = 'Connection timeout'
WHERE job_id = 123;

-- Scheduled job to reclaim stuck jobs (worker crashed)
UPDATE job_queue
SET 
    status = 'pending',
    worker_id = NULL,
    claimed_at = NULL
WHERE status = 'processing'
  AND claimed_at &lt; NOW() - INTERVAL '5 minutes';  -- Stuck for 5+ minutes
```

**Complete Worker Loop (Pseudocode):**
```python
def worker_loop():
    worker_id = generate_unique_worker_id()
    
    while True:
        # Claim a job
        job = db.execute("""
            UPDATE job_queue SET status = 'processing', worker_id = %s, ...
            WHERE job_id = (SELECT ... FOR UPDATE SKIP LOCKED)
            RETURNING *
        """, worker_id).fetchone()
        
        if not job:
            time.sleep(1)  # No jobs, wait
            continue
        
        try:
            process_job(job.payload)
            db.execute("UPDATE job_queue SET status = 'completed' WHERE job_id = %s", job.id)
        except Exception as e:
            db.execute("""
                UPDATE job_queue SET 
                    status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
                    error_message = %s
                WHERE job_id = %s
            """, str(e), job.id)
```

</details>

---

## Key Takeaways

- 🔒 **Lock modes**: Shared (readers), Exclusive (writers)
- 📏 **Lock granularity**: Row-level preferred for concurrency
- 👁️ **MVCC magic**: Readers don't block writers, writers don't block readers
- 💀 **Deadlocks**: Prevented by consistent ordering, detected by database
- ⏭️ **SKIP LOCKED**: Essential for concurrent queue processing
- ⚡ **Keep transactions short**: Minimize contention window

---

## Related Topics

- [Transactions and ACID](11-transactions-and-acid.md) - Transaction fundamentals
- [Performance Tuning](10-performance-tuning.md) - Connection and lock tuning
- [Database Internals](15-database-internals.md) - How locks are implemented
