# Design Payment System

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a payment system that handles credit card transactions, maintains ACID guarantees, and integrates with payment gateways like Stripe/PayPal with exactly-once processing.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Process payments** - Credit cards, wallets, bank transfers
2. **Idempotency** - Handle duplicates gracefully
3. **Refunds** - Full and partial
4. **Transaction history** - Complete audit trail
5. **Webhooks** - Notify merchants of status changes
6. **Multi-currency** - Support international transactions

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Reliability** | 99.999% (financial) |
| **Consistency** | Strong (money) |
| **Security** | PCI DSS compliant |
| **Latency** | &lt; 2s for payment |
| **Durability** | Never lose transaction |

---

## 2. Back of Envelope Calculations

```
Transactions:
- 1 million transactions/day
- 1M / 86400 ≈ 12 TPS average
- Peak: 100 TPS (flash sales)

Storage:
- Transaction record: 500 bytes
- 1M × 500 bytes = 500 MB/day
- 182 GB/year

Financial Volume:
- Average transaction: $50
- Daily: $50M
- Annual: $18B
```

---

## 3. Core Entities

```sql
-- Payment Methods
CREATE TABLE payment_methods (
    payment_method_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    type ENUM('card', 'bank_account', 'wallet'),
    provider_token VARCHAR(255),  -- Tokenized by Stripe/etc
    last_four VARCHAR(4),
    expiry_month INT,
    expiry_year INT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    
    INDEX idx_user (user_id)
);

-- Payments
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY,
    idempotency_key VARCHAR(255) UNIQUE,
    user_id UUID NOT NULL,
    merchant_id UUID NOT NULL,
    payment_method_id UUID,
    amount DECIMAL(19,4) NOT NULL,
    currency CHAR(3) NOT NULL,
    status ENUM('pending', 'processing', 'succeeded', 'failed', 'refunded'),
    provider VARCHAR(50),  -- stripe, paypal, etc
    provider_transaction_id VARCHAR(255),
    error_code VARCHAR(50),
    error_message TEXT,
    metadata JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_idempotency (idempotency_key),
    INDEX idx_user (user_id),
    INDEX idx_merchant (merchant_id)
);

-- Ledger Entries (Double-entry bookkeeping)
CREATE TABLE ledger_entries (
    entry_id UUID PRIMARY KEY,
    payment_id UUID NOT NULL,
    account_id UUID NOT NULL,
    entry_type ENUM('debit', 'credit'),
    amount DECIMAL(19,4) NOT NULL,
    currency CHAR(3) NOT NULL,
    balance_after DECIMAL(19,4),
    created_at TIMESTAMP,
    
    INDEX idx_payment (payment_id),
    INDEX idx_account (account_id, created_at)
);

-- Refunds
CREATE TABLE refunds (
    refund_id UUID PRIMARY KEY,
    payment_id UUID NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE,
    amount DECIMAL(19,4) NOT NULL,
    reason VARCHAR(255),
    status ENUM('pending', 'processing', 'succeeded', 'failed'),
    provider_refund_id VARCHAR(255),
    created_at TIMESTAMP,
    
    INDEX idx_payment (payment_id)
);
```

---

## 4. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     PAYMENT SYSTEM ARCHITECTURE                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│      ┌──────────┐                                     ┌─────────────┐     │
│      │ Merchant │                                     │  Merchant   │     │
│      │   App    │                                     │  Webhooks   │     │
│      └────┬─────┘                                     └──────▲──────┘     │
│           │                                                  │            │
│           ▼                                                  │            │
│    ┌────────────┐                                    ┌───────┴──────┐    │
│    │    API     │───────────────────────────────────▶│   Webhook    │    │
│    │  Gateway   │                                    │   Service    │    │
│    └─────┬──────┘                                    └──────────────┘    │
│          │                                                                │
│          ▼                                                                │
│    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐      │
│    │  Payment    │────────▶│   Ledger    │────────▶│   Wallet    │      │
│    │  Service    │         │  Service    │         │  Service    │      │
│    └──────┬──────┘         └──────┬──────┘         └─────────────┘      │
│           │                       │                                       │
│           │                       ▼                                       │
│           │                ┌─────────────┐                               │
│           │                │  Postgres   │                               │
│           │                │   (ACID)    │                               │
│           │                └─────────────┘                               │
│           │                                                               │
│           ▼                                                               │
│    ┌──────────────────────────────────────────────┐                     │
│    │            Payment Gateway Adapter            │                     │
│    ├───────────┬───────────┬───────────┬─────────┤                     │
│    │  Stripe   │  PayPal   │  Adyen    │  ...    │                     │
│    └───────────┴───────────┴───────────┴─────────┘                     │
│                                                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deep Dive: Idempotency

```
┌─────────────────────────────────────────────────────────────────┐
│                   IDEMPOTENT PAYMENTS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Problem: Client retries can cause double charges              │
│                                                                 │
│  Solution: Idempotency Keys                                     │
│  ─────────────────────────────                                  │
│  • Client generates unique key per payment intent              │
│  • Server stores key → result mapping                          │
│  • Duplicate requests return cached result                     │
│                                                                 │
│  Request:                                                       │
│  ─────────                                                      │
│  POST /payments                                                │
│  Idempotency-Key: "ord_12345_pay_attempt_1"                   │
│  {                                                              │
│    "amount": 5000,                                             │
│    "currency": "USD",                                          │
│    "payment_method": "pm_xxx"                                  │
│  }                                                              │
│                                                                 │
│  Flow:                                                          │
│  ──────                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  1. Check if idempotency_key exists in DB               │   │
│  │                                                          │   │
│  │  2. If exists AND completed:                            │   │
│  │     → Return cached response                            │   │
│  │                                                          │   │
│  │  3. If exists AND processing:                           │   │
│  │     → Return 409 Conflict (retry later)                 │   │
│  │                                                          │   │
│  │  4. If not exists:                                      │   │
│  │     → Insert with status='processing'                   │   │
│  │     → Process payment                                   │   │
│  │     → Update with result                                │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Implementation:                                                │
│  ─────────────────                                              │
│  def process_payment(idempotency_key, request):                │
│      # Try to insert with advisory lock                        │
│      with db.advisory_lock(hash(idempotency_key)):            │
│          existing = db.get_payment(idempotency_key)           │
│          if existing:                                          │
│              if existing.status == 'succeeded':               │
│                  return existing  # Cached result             │
│              if existing.status == 'processing':              │
│                  raise Conflict("Payment in progress")        │
│                                                                 │
│          # Create new payment                                  │
│          payment = db.create_payment(                         │
│              idempotency_key=idempotency_key,                 │
│              status='processing',                             │
│              **request                                        │
│          )                                                      │
│                                                                 │
│      # Process outside lock                                    │
│      result = gateway.charge(payment)                         │
│      db.update_payment(payment.id, result)                    │
│      return payment                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Deep Dive: Double-Entry Ledger

```
┌─────────────────────────────────────────────────────────────────┐
│                   DOUBLE-ENTRY BOOKKEEPING                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Principle: Every transaction has equal debits and credits    │
│                                                                 │
│  Accounts:                                                      │
│  ──────────                                                     │
│  • User wallets (liability)                                   │
│  • Merchant accounts (liability)                              │
│  • Company cash (asset)                                       │
│  • Revenue (income)                                           │
│                                                                 │
│  Example: $100 payment, 2.9% fee                               │
│  ──────────────────────────────                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Account          │  Debit   │  Credit  │  Balance    │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │  User Wallet      │  $100    │          │  -$100      │    │
│  │  Company Cash     │          │  $100    │  +$100      │    │
│  │  Company Cash     │  $97.10  │          │  +$97.10    │    │
│  │  Merchant Account │          │  $97.10  │  +$97.10    │    │
│  │  Company Cash     │  $2.90   │          │  +$2.90     │    │
│  │  Fee Revenue      │          │  $2.90   │  +$2.90     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Balance = SUM(credits) - SUM(debits) must equal 0            │
│                                                                 │
│  Benefits:                                                      │
│  ──────────                                                     │
│  • Complete audit trail                                        │
│  • Easy reconciliation                                         │
│  • Detect errors (imbalanced entries)                         │
│  • Historical balance at any point                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   PAYMENT PROCESSING FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │  Client  │──▶│  Server  │──▶│  Stripe  │──▶│  Bank    │   │
│  └──────────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   │
│                      │              │              │          │
│  1. Create Payment   │              │              │          │
│  ─────────────────▶  │              │              │          │
│                      │              │              │          │
│  2. Validate         │              │              │          │
│     ┌───────────┐    │              │              │          │
│     │ Check     │    │              │              │          │
│     │ Balance,  │    │              │              │          │
│     │ Limits    │    │              │              │          │
│     └───────────┘    │              │              │          │
│                      │              │              │          │
│  3. Create pending   │              │              │          │
│     payment record   │              │              │          │
│                      │              │              │          │
│  4. Call Gateway     │──────────────▶              │          │
│                      │              │              │          │
│  5. Gateway calls    │              │──────────────▶          │
│     card network     │              │              │          │
│                      │              │              │          │
│  6. Bank authorizes  │              │◀─────────────           │
│                      │              │              │          │
│  7. Gateway confirms │◀─────────────               │          │
│                      │              │              │          │
│  8. Update payment   │              │              │          │
│     status           │              │              │          │
│                      │              │              │          │
│  9. Create ledger    │              │              │          │
│     entries          │              │              │          │
│                      │              │              │          │
│  10. Return result   │              │              │          │
│  ◀─────────────────  │              │              │          │
│                      │              │              │          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Handling Gateway Timeouts

```
┌─────────────────────────────────────────────────────────────────┐
│                   TIMEOUT HANDLING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scenario: Gateway call times out - did it succeed or not?    │
│                                                                 │
│  Never:                                                         │
│  ───────                                                        │
│  • Assume success (could double charge)                        │
│  • Assume failure (could lose payment)                         │
│                                                                 │
│  Solution: Reconciliation                                       │
│  ─────────────────────────                                      │
│  1. Mark payment as 'unknown'                                  │
│  2. Query gateway for status                                   │
│  3. Reconcile based on response                                │
│                                                                 │
│  def handle_timeout(payment):                                  │
│      payment.status = 'unknown'                                │
│      db.save(payment)                                          │
│                                                                 │
│      # Background job will reconcile                           │
│      enqueue_reconciliation(payment.id)                        │
│                                                                 │
│      return {"status": "pending", "message": "Processing"}    │
│                                                                 │
│  Reconciliation Job:                                            │
│  ────────────────────                                           │
│  def reconcile(payment_id):                                    │
│      payment = db.get_payment(payment_id)                     │
│                                                                 │
│      # Query gateway                                           │
│      result = gateway.get_payment(payment.provider_tx_id)     │
│                                                                 │
│      if result.found:                                          │
│          payment.status = result.status                       │
│          if result.status == 'succeeded':                     │
│              create_ledger_entries(payment)                   │
│      else:                                                      │
│          # Payment never processed                             │
│          payment.status = 'failed'                            │
│          payment.error = 'Gateway timeout'                    │
│                                                                 │
│      db.save(payment)                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Refund Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                   REFUND FLOW                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Validation:                                                    │
│  ────────────                                                   │
│  • Payment must be 'succeeded'                                 │
│  • Refund amount ≤ (payment amount - already refunded)        │
│  • Within refund window (e.g., 180 days)                      │
│                                                                 │
│  def create_refund(payment_id, amount, idempotency_key):       │
│      with db.transaction():                                    │
│          payment = db.get_payment_for_update(payment_id)      │
│                                                                 │
│          # Validate                                            │
│          total_refunded = sum(r.amount for r in payment.refunds│
│                              if r.status == 'succeeded')      │
│          if amount > payment.amount - total_refunded:         │
│              raise InvalidAmount("Exceeds refundable amount") │
│                                                                 │
│          # Create refund record                                │
│          refund = db.create_refund(                           │
│              payment_id=payment_id,                           │
│              amount=amount,                                   │
│              idempotency_key=idempotency_key,                 │
│              status='processing'                              │
│          )                                                      │
│                                                                 │
│      # Call gateway (outside transaction)                      │
│      result = gateway.refund(                                  │
│          transaction_id=payment.provider_tx_id,               │
│          amount=amount                                        │
│      )                                                          │
│                                                                 │
│      # Update refund status                                    │
│      refund.status = result.status                            │
│      refund.provider_refund_id = result.refund_id            │
│                                                                 │
│      # Create reverse ledger entries                          │
│      if result.status == 'succeeded':                         │
│          create_refund_ledger_entries(payment, refund)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. PCI Compliance

```
┌─────────────────────────────────────────────────────────────────┐
│                   PCI DSS COMPLIANCE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Never Store:                                                   │
│  ─────────────                                                  │
│  • Full card numbers (only last 4)                            │
│  • CVV/CVC (never, ever)                                      │
│  • Magnetic stripe data                                        │
│                                                                 │
│  Tokenization:                                                  │
│  ─────────────                                                  │
│  Client → Stripe.js → Stripe servers → Returns token          │
│                                                                 │
│  Our server only sees token (pm_xxx), never card numbers      │
│                                                                 │
│  Network Isolation:                                             │
│  ───────────────────                                            │
│  • Payment services in isolated network                        │
│  • Encrypted at rest and in transit                           │
│  • Access logging and monitoring                               │
│  • Regular security audits                                     │
│                                                                 │
│  Scope Reduction:                                               │
│  ─────────────────                                              │
│  By using Stripe/PayPal, we reduce PCI scope to SAQ-A         │
│  (self-assessment questionnaire, simplest level)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Database | PostgreSQL | ACID, serializable isolation |
| Payment Gateway | Stripe | Best API, PCI compliant |
| Idempotency Store | PostgreSQL | Durability |
| Queue | Kafka | Audit trail, exactly-once |
| Encryption | AWS KMS | Key management |
| Monitoring | Datadog | PCI-compliant logging |

---

## 12. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. IDEMPOTENCY KEYS                                            │
│     Prevent duplicate charges on retries                       │
│                                                                 │
│  2. DOUBLE-ENTRY LEDGER                                         │
│     Complete audit trail, easy reconciliation                  │
│                                                                 │
│  3. TOKENIZATION                                                │
│     Never store card numbers, use tokens                       │
│                                                                 │
│  4. RECONCILIATION                                              │
│     Handle gateway timeouts by querying status                 │
│                                                                 │
│  5. ACID TRANSACTIONS                                           │
│     Money operations require strong consistency                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. References

- [11-databases.md](/system-design/fundamentals/11-database-scaling.md) - ACID
- [14-distributed-patterns.md](/system-design/fundamentals/14-distributed-patterns.md) - Idempotency
- [17-security.md](/system-design/fundamentals/21-security.md) - PCI compliance

---

[← Back to Problems](/system-design/problems/00-index.md) | [Next: Metrics System →](/system-design/problems/17-metrics-system.md)
