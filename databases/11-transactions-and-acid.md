# Transactions and ACID

[← Back to Index](/databases/00-index.md)

---

## Overview

Transactions are the fundamental unit of work in a database. They group multiple operations into a single logical unit that either completely succeeds or completely fails. Understanding transactions is crucial for writing correct, reliable database applications.

### When This Matters Most
- Financial systems and ledgers
- Inventory management
- Multi-step business processes
- Any operation that must be "all or nothing"

---

## ACID Properties

The guarantees that make transactions reliable:

```
┌────────────────────────────────────────────────────────────────────────┐
│                           A.C.I.D.                                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ATOMICITY       - All or nothing. If any part fails, everything       │
│                    rolls back to the original state.                   │
│                                                                         │
│  CONSISTENCY     - Transaction moves database from one valid state     │
│                    to another. All constraints remain satisfied.       │
│                                                                         │
│  ISOLATION       - Concurrent transactions don't interfere with        │
│                    each other. Each sees a consistent view.            │
│                                                                         │
│  DURABILITY      - Once committed, changes survive crashes,            │
│                    power failures, and system failures.                │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Transaction Basics

### Syntax

```sql
-- Start a transaction
BEGIN;  -- or START TRANSACTION

-- Do work
INSERT INTO accounts (id, balance) VALUES (1, 1000);
INSERT INTO accounts (id, balance) VALUES (2, 2000);

-- Finish: commit (save changes) or rollback (undo)
COMMIT;  -- Changes are permanent
-- or
ROLLBACK;  -- Undo all changes since BEGIN
```

### Real-World Example: Money Transfer

```sql
-- Transfer $100 from account 1 to account 2
BEGIN;

-- Debit source account
UPDATE accounts SET balance = balance - 100 WHERE id = 1;

-- Credit destination account  
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- If both succeed, commit
COMMIT;

-- If anything fails, the application should ROLLBACK
-- so money isn't lost or created out of thin air
```

### Savepoints

Partial rollback within a transaction:

```sql
BEGIN;

INSERT INTO orders (id, customer_id) VALUES (100, 1);

SAVEPOINT before_items;

INSERT INTO order_items (order_id, product_id, qty) VALUES (100, 1, 5);
INSERT INTO order_items (order_id, product_id, qty) VALUES (100, 2, -3);  -- Error: negative quantity!

-- Rollback just the items, keep the order
ROLLBACK TO SAVEPOINT before_items;

-- Try again with correct data
INSERT INTO order_items (order_id, product_id, qty) VALUES (100, 1, 5);
INSERT INTO order_items (order_id, product_id, qty) VALUES (100, 3, 2);

COMMIT;  -- Order and correct items are saved
```

---

## Isolation Levels

Isolation levels control what data a transaction can "see" from other concurrent transactions.

### The Problems (Phenomena)

| Problem | Description | Example |
|---------|-------------|---------|
| **Dirty Read** | Read uncommitted data from another transaction | See balance change that might be rolled back |
| **Non-Repeatable Read** | Same query returns different values | Balance is 100, then 200 in same transaction |
| **Phantom Read** | Same query returns different rows | Count was 10, then 11 in same transaction |
| **Serialization Anomaly** | Result differs from any serial execution | Two transactions conflict in unpredictable ways |

### Isolation Levels vs. Phenomena

| Level | Dirty Read | Non-Repeatable | Phantom | Performance |
|-------|------------|----------------|---------|-------------|
| **Read Uncommitted** | ❌ Possible | ❌ Possible | ❌ Possible | Fastest |
| **Read Committed** | ✅ Prevented | ❌ Possible | ❌ Possible | Fast |
| **Repeatable Read** | ✅ Prevented | ✅ Prevented | ❌/✅* | Medium |
| **Serializable** | ✅ Prevented | ✅ Prevented | ✅ Prevented | Slowest |

*PostgreSQL's Repeatable Read prevents phantoms; standard SQL doesn't guarantee this.

### Setting Isolation Levels

```sql
-- PostgreSQL
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Session-level default
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- MySQL
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;  -- MySQL default
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- SQL Server  
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;  -- Default
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;  -- PostgreSQL-like MVCC
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### Isolation Level Examples

**Read Committed (Default in PostgreSQL, SQL Server):**
```sql
-- Transaction 1                    -- Transaction 2
BEGIN;                              
SELECT balance FROM accounts        
WHERE id = 1;  -- Returns 100      
                                    BEGIN;
                                    UPDATE accounts SET balance = 200 WHERE id = 1;
                                    COMMIT;
SELECT balance FROM accounts        
WHERE id = 1;  -- Returns 200 (different!)
COMMIT;
```

**Repeatable Read:**
```sql
-- Transaction 1                    -- Transaction 2
BEGIN;                              
SET TRANSACTION ISOLATION LEVEL     
REPEATABLE READ;                    
SELECT balance FROM accounts        
WHERE id = 1;  -- Returns 100      
                                    BEGIN;
                                    UPDATE accounts SET balance = 200 WHERE id = 1;
                                    COMMIT;
SELECT balance FROM accounts        
WHERE id = 1;  -- Still 100! (snapshot)
COMMIT;
```

**Serializable:**
```sql
-- Prevents all anomalies but may require retries
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- If conflict detected...
-- ERROR: could not serialize access due to concurrent update
-- Application must retry the transaction
```

---

## MVCC (Multi-Version Concurrency Control)

PostgreSQL and MySQL (InnoDB) use MVCC to provide isolation without locking readers.

```
┌──────────────────────────────────────────────────────────────────────┐
│  How MVCC Works                                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Instead of locking: Database keeps multiple versions of each row    │
│                                                                       │
│  Row in accounts table (id=1):                                       │
│  ┌─────────┬─────────┬───────────┬───────────┐                       │
│  │ Version │ Balance │ Created   │ Expired   │                       │
│  ├─────────┼─────────┼───────────┼───────────┤                       │
│  │ v1      │ 100     │ txn 1000  │ txn 1500  │                       │
│  │ v2      │ 150     │ txn 1500  │ txn 1800  │                       │
│  │ v3      │ 200     │ txn 1800  │ -         │ ← Current             │
│  └─────────┴─────────┴───────────┴───────────┘                       │
│                                                                       │
│  Transaction 1600 sees v2 (150) - the version valid at its start    │
│  Transaction 1900 sees v3 (200) - the current version               │
│                                                                       │
│  Benefits:                                                            │
│  - Readers never block writers                                        │
│  - Writers never block readers                                        │
│  - Consistent snapshots without locks                                 │
│                                                                       │
│  Trade-off:                                                           │
│  - Old versions need cleanup (VACUUM in PostgreSQL)                   │
│  - More storage for version history                                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Deadlocks

When two transactions wait for each other, creating a cycle.

```sql
-- Transaction 1                    -- Transaction 2
BEGIN;                              BEGIN;
UPDATE accounts                     UPDATE accounts
SET balance = balance - 100         SET balance = balance - 50
WHERE id = 1;                       WHERE id = 2;
-- Holds lock on account 1          -- Holds lock on account 2

UPDATE accounts                     UPDATE accounts
SET balance = balance + 100         SET balance = balance + 50
WHERE id = 2;                       WHERE id = 1;
-- Waiting for account 2...         -- Waiting for account 1...
-- DEADLOCK!                        -- DEADLOCK!
```

**Deadlock Resolution:**
```
Database detects the cycle and kills one transaction:
ERROR: deadlock detected
DETAIL: Process 12345 waits for ShareLock on transaction 67890;
        Process 67890 waits for ShareLock on transaction 12345.
HINT: See server log for query details.

The killed transaction must be retried by the application.
```

**Preventing Deadlocks:**

```sql
-- 1. Consistent lock order: Always lock resources in the same order
-- Sort by account ID before updating
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- Lower ID first
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- Higher ID second
COMMIT;

-- 2. Lock timeout: Fail fast instead of waiting forever
SET lock_timeout = '5s';

-- 3. Use SELECT FOR UPDATE to lock all needed rows upfront
BEGIN;
SELECT * FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
-- Now both rows are locked, proceed with updates
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

---

## SELECT FOR UPDATE

Explicitly lock rows to prevent concurrent modifications.

```sql
-- Pessimistic locking: Lock row before update
BEGIN;

-- Lock the account row
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- Other transactions trying to update this row will wait

-- Check and update
-- (Application logic: verify balance >= 100)
UPDATE accounts SET balance = balance - 100 WHERE id = 1;

COMMIT;
```

**Variants:**

```sql
-- FOR UPDATE: Exclusive lock (blocks other FOR UPDATE and UPDATE/DELETE)
SELECT * FROM orders WHERE id = 100 FOR UPDATE;

-- FOR SHARE: Shared lock (blocks UPDATE/DELETE but allows other FOR SHARE)
SELECT * FROM products WHERE id = 5 FOR SHARE;

-- SKIP LOCKED: Skip rows locked by other transactions (for queue processing)
SELECT * FROM job_queue WHERE status = 'pending' 
ORDER BY created_at 
LIMIT 1 
FOR UPDATE SKIP LOCKED;

-- NOWAIT: Fail immediately if row is locked
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
-- ERROR: could not obtain lock on row (if locked)
```

---

## Transaction Patterns

### Pattern 1: Retry on Serialization Failure

```python
# Application code for handling serialization errors
MAX_RETRIES = 3

def transfer_money(from_id, to_id, amount):
    for attempt in range(MAX_RETRIES):
        try:
            with db.transaction(isolation='serializable'):
                from_balance = db.query("SELECT balance FROM accounts WHERE id = %s", from_id)
                if from_balance &lt; amount:
                    raise InsufficientFunds()
                db.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", amount, from_id)
                db.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", amount, to_id)
            return  # Success
        except SerializationFailure:
            if attempt == MAX_RETRIES - 1:
                raise
            time.sleep(random.uniform(0.01, 0.1))  # Jitter before retry
```

### Pattern 2: Optimistic Locking (Version Column)

```sql
-- Add version column
ALTER TABLE products ADD COLUMN version INT DEFAULT 0;

-- Read with version
SELECT id, name, price, version FROM products WHERE id = 1;
-- Returns: id=1, name='Widget', price=9.99, version=5

-- Update only if version matches
UPDATE products 
SET price = 10.99, version = version + 1 
WHERE id = 1 AND version = 5;

-- Check affected rows: 
-- 1 = success
-- 0 = someone else modified it, reload and retry
```

### Pattern 3: Idempotency Keys

```sql
-- Prevent duplicate operations with idempotency keys
CREATE TABLE processed_requests (
    idempotency_key VARCHAR(100) PRIMARY KEY,
    result JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Before processing:
BEGIN;

-- Try to insert idempotency key
INSERT INTO processed_requests (idempotency_key) 
VALUES ('payment-12345')
ON CONFLICT (idempotency_key) DO NOTHING;

-- Check if we inserted (new request) or not (duplicate)
IF ROW_COUNT() > 0 THEN
    -- Process the payment
    -- Store result
    UPDATE processed_requests 
    SET result = '{"status": "success", "transaction_id": "xyz"}'
    WHERE idempotency_key = 'payment-12345';
ELSE
    -- Return cached result
    SELECT result FROM processed_requests WHERE idempotency_key = 'payment-12345';
END IF;

COMMIT;
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Keep transactions short**: Long transactions hold locks and block others
- **Handle failures with retry**: Serialization failures are normal, not exceptional
- **Use appropriate isolation level**: Read Committed is fine for most cases
- **Lock in consistent order**: Prevents deadlocks
- **Use FOR UPDATE for critical sections**: When you need guaranteed exclusive access

### ❌ Avoid:
- **Transactions spanning user input**: Never wait for user while holding locks
- **Unnecessary Serializable isolation**: Performance overhead is significant
- **Ignoring deadlock possibility**: Always code for retry
- **Very long transactions**: Keep under a few seconds if possible

---

## Exercises

### Exercise 1: Transaction Basics 🟢

**Scenario:** Write SQL for a bank transfer that:
1. Checks source account has sufficient funds
2. Debits source account
3. Credits destination account
4. Records the transfer in a log table

Handle the case where source has insufficient funds.

<details>
<summary>✅ Solution</summary>

```sql
BEGIN;

-- Lock the accounts to prevent concurrent modifications
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;

-- Check balance (application would do this check)
DO $$
DECLARE
    source_balance DECIMAL;
    transfer_amount DECIMAL := 100.00;
BEGIN
    SELECT balance INTO source_balance FROM accounts WHERE id = 1;
    
    IF source_balance &lt; transfer_amount THEN
        RAISE EXCEPTION 'Insufficient funds: balance is %, need %', 
            source_balance, transfer_amount;
    END IF;
    
    -- Debit source
    UPDATE accounts SET balance = balance - transfer_amount WHERE id = 1;
    
    -- Credit destination
    UPDATE accounts SET balance = balance + transfer_amount WHERE id = 2;
    
    -- Log the transfer
    INSERT INTO transfer_log (from_account, to_account, amount, transferred_at)
    VALUES (1, 2, transfer_amount, NOW());
END $$;

COMMIT;

-- If insufficient funds, the exception causes rollback
-- Application should catch the exception and inform user
```

</details>

---

### Exercise 2: Isolation Level Impact 🟡

**Scenario:** Two transactions run concurrently:

```sql
-- Transaction A
BEGIN;
SELECT SUM(balance) FROM accounts;  -- Query 1
-- (some processing)
SELECT SUM(balance) FROM accounts;  -- Query 2
COMMIT;

-- Transaction B (runs between Query 1 and Query 2)
BEGIN;
UPDATE accounts SET balance = balance + 100 WHERE id = 5;
COMMIT;
```

**Questions:**
1. Under Read Committed, will Query 1 and Query 2 return the same value?
2. Under Repeatable Read, will they return the same value?
3. What if Transaction B does an INSERT instead of UPDATE?

<details>
<summary>✅ Answers</summary>

**1. Read Committed:**
- Query 1 and Query 2 will return **different values**
- Query 2 will include Transaction B's +100 change
- This is a "non-repeatable read"

**2. Repeatable Read:**
- Query 1 and Query 2 will return the **same value**
- Transaction A sees a consistent snapshot from its start
- Transaction B's change is invisible to Transaction A

**3. INSERT instead of UPDATE:**
- **Read Committed**: Query 2 will include the new row (phantom)
- **Repeatable Read (PostgreSQL)**: Same value (PostgreSQL prevents phantoms)
- **Repeatable Read (MySQL/Standard)**: May see the new row (phantom possible)
- **Serializable**: Same value (phantoms prevented)

```sql
-- Demonstrate this:
-- Terminal 1
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT SUM(balance) FROM accounts;  -- 1000

-- Terminal 2
BEGIN;
INSERT INTO accounts (id, balance) VALUES (999, 500);
COMMIT;

-- Terminal 1
SELECT SUM(balance) FROM accounts;  -- Still 1000 in PostgreSQL
COMMIT;
```

</details>

---

### Exercise 3: Deadlock Prevention 🔴

**Scenario:** A trading system processes buy and sell orders. Each trade:
1. Debits cash from buyer
2. Credits cash to seller
3. Transfers shares from seller to buyer

Currently experiencing frequent deadlocks.

**Current code:**
```sql
BEGIN;
UPDATE accounts SET cash = cash - 1000 WHERE user_id = @buyer_id;
UPDATE accounts SET cash = cash + 1000 WHERE user_id = @seller_id;
UPDATE portfolios SET shares = shares - 10 WHERE user_id = @seller_id AND stock = 'AAPL';
UPDATE portfolios SET shares = shares + 10 WHERE user_id = @buyer_id AND stock = 'AAPL';
COMMIT;
```

**Task:** Redesign to prevent deadlocks while maintaining correctness.

<details>
<summary>✅ Solution</summary>

**Problem Analysis:**
- Trade A: Buyer=1, Seller=2 → Locks: accounts(1), accounts(2), portfolios(2), portfolios(1)
- Trade B: Buyer=2, Seller=1 → Locks: accounts(2), accounts(1), portfolios(1), portfolios(2)
- If A locks accounts(1) while B locks accounts(2), then each waits for the other = deadlock

**Solution 1: Consistent Lock Order**
```sql
BEGIN;

-- Always lock in consistent order (by user_id)
-- Sort users: ensure lower ID is locked first
-- If buyer=5, seller=3 → lock user 3 first, then 5

-- Calculate the lock order
SET @first_user = LEAST(@buyer_id, @seller_id);
SET @second_user = GREATEST(@buyer_id, @seller_id);

-- Lock accounts in order
SELECT * FROM accounts WHERE user_id = @first_user FOR UPDATE;
SELECT * FROM accounts WHERE user_id = @second_user FOR UPDATE;

-- Lock portfolios in same order
SELECT * FROM portfolios WHERE user_id = @first_user AND stock = 'AAPL' FOR UPDATE;
SELECT * FROM portfolios WHERE user_id = @second_user AND stock = 'AAPL' FOR UPDATE;

-- Now proceed with updates (order doesn't matter, we have all locks)
UPDATE accounts SET cash = cash - 1000 WHERE user_id = @buyer_id;
UPDATE accounts SET cash = cash + 1000 WHERE user_id = @seller_id;
UPDATE portfolios SET shares = shares - 10 WHERE user_id = @seller_id AND stock = 'AAPL';
UPDATE portfolios SET shares = shares + 10 WHERE user_id = @buyer_id AND stock = 'AAPL';

COMMIT;
```

**Solution 2: Trade-Level Locking**
```sql
-- Alternative: Lock at a higher level (trade matching engine)
BEGIN;

-- Acquire advisory lock on trading pair
SELECT pg_advisory_xact_lock(hashtext('AAPL'));

-- Now only one trade on AAPL can proceed at a time
UPDATE accounts SET cash = cash - 1000 WHERE user_id = @buyer_id;
UPDATE accounts SET cash = cash + 1000 WHERE user_id = @seller_id;
UPDATE portfolios SET shares = shares - 10 WHERE user_id = @seller_id AND stock = 'AAPL';
UPDATE portfolios SET shares = shares + 10 WHERE user_id = @buyer_id AND stock = 'AAPL';

COMMIT;
-- Advisory lock automatically released
```

**Solution 3: Optimistic Locking + Retry**
```sql
-- Add version columns and retry on conflict
BEGIN;

-- Fetch current versions
SELECT version INTO @buyer_acc_ver FROM accounts WHERE user_id = @buyer_id;
SELECT version INTO @seller_acc_ver FROM accounts WHERE user_id = @seller_id;

-- Attempt updates with version check
UPDATE accounts 
SET cash = cash - 1000, version = version + 1 
WHERE user_id = @buyer_id AND version = @buyer_acc_ver;

IF ROW_COUNT() = 0 THEN
    ROLLBACK;
    -- Retry the transaction
END IF;

-- ... similar for other updates

COMMIT;
```

</details>

---

## Key Takeaways

- 💎 **ACID guarantees** reliability: Atomicity, Consistency, Isolation, Durability
- 🔒 **Isolation levels** trade correctness for performance
- 👀 **MVCC** enables high concurrency with consistent snapshots
- 🔄 **Deadlocks happen**: Code for detection and retry
- ⚡ **Keep transactions short**: Long transactions hurt concurrency
- 🎯 **Consistent lock ordering** prevents deadlocks

---

## Related Topics

- [Locking and Concurrency](/databases/12-locking-and-concurrency.md) - Deeper dive into locks
- [Performance Tuning](/databases/10-performance-tuning.md) - Transaction performance
- [Database Internals](/databases/15-database-internals.md) - How MVCC works under the hood
