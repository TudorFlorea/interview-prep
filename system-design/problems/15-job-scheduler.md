# Design Job Scheduler

[← Back to Problems](00-index.md)

---

## 🎯 Problem Statement

Design a distributed job scheduling system that can execute millions of scheduled tasks with support for cron expressions, retries, and exactly-once execution guarantees.

**Difficulty**: 🔴 Hard (Tier 1)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Schedule jobs** - One-time or recurring (cron)
2. **Execute reliably** - At-least-once, ideally exactly-once
3. **Handle failures** - Retry with backoff
4. **Priority support** - Urgent jobs run first
5. **Job management** - Pause, cancel, view status
6. **Distributed execution** - Scale across workers

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | No missed executions |
| **CAP** | CP - Consistency for job state |
| **Scalability** | 10M jobs/day |
| **Latency** | Within 1s of scheduled time |
| **Durability** | Jobs survive crashes |

---

## 2. Back of Envelope Calculations

```
Jobs:
- 10 million jobs/day
- 10M / 86400 ≈ 115 jobs/second
- Peak: 500 jobs/second

Job Distribution:
- One-time jobs: 60%
- Recurring jobs: 40%
- Average execution time: 10 seconds

Workers Needed:
- 500 jobs/sec × 10 sec = 5000 concurrent jobs
- 100 jobs per worker = 50 workers
```

---

## 3. Core Entities

```sql
-- Job Definitions
CREATE TABLE jobs (
    job_id UUID PRIMARY KEY,
    name VARCHAR(255),
    type ENUM('one_time', 'recurring'),
    handler VARCHAR(255),  -- Function/endpoint to call
    payload JSON,
    cron_expression VARCHAR(100),
    next_run_at TIMESTAMP,
    priority INT DEFAULT 5,
    max_retries INT DEFAULT 3,
    retry_delay_seconds INT DEFAULT 60,
    timeout_seconds INT DEFAULT 300,
    status ENUM('active', 'paused', 'completed', 'cancelled'),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX idx_next_run (next_run_at, status, priority)
);

-- Job Executions (history)
CREATE TABLE job_executions (
    execution_id UUID PRIMARY KEY,
    job_id UUID NOT NULL,
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status ENUM('pending', 'running', 'succeeded', 'failed', 'timeout'),
    attempt INT DEFAULT 1,
    worker_id VARCHAR(100),
    result JSON,
    error TEXT,
    
    INDEX idx_job (job_id),
    INDEX idx_status (status)
);

-- Worker Registry
CREATE TABLE workers (
    worker_id VARCHAR(100) PRIMARY KEY,
    hostname VARCHAR(255),
    status ENUM('active', 'draining', 'offline'),
    last_heartbeat TIMESTAMP,
    current_jobs INT DEFAULT 0,
    max_jobs INT DEFAULT 100
);
```

---

## 4. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      JOB SCHEDULER ARCHITECTURE                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                            ┌─────────────┐                                 │
│                            │   Clients   │                                 │
│                            └──────┬──────┘                                 │
│                                   │                                        │
│                        ┌──────────┴──────────┐                            │
│                        │    API Gateway      │                            │
│                        └──────────┬──────────┘                            │
│                                   │                                        │
│         ┌─────────────────────────┼─────────────────────────┐             │
│         │                         │                         │              │
│         ▼                         ▼                         ▼              │
│    ┌─────────┐             ┌──────────┐             ┌──────────┐          │
│    │   Job   │             │Scheduler │             │  Worker  │          │
│    │ Service │             │ Service  │             │ Manager  │          │
│    │ (CRUD)  │             │          │             │          │          │
│    └────┬────┘             └────┬─────┘             └────┬─────┘          │
│         │                       │                        │                 │
│         └───────────────────────┼────────────────────────┘                 │
│                                 │                                          │
│                    ┌────────────┴────────────┐                            │
│                    │                         │                             │
│                    ▼                         ▼                             │
│              ┌──────────┐              ┌──────────┐                       │
│              │  Job DB  │              │  Queue   │                       │
│              │(Postgres)│              │ (Redis)  │                       │
│              └──────────┘              └────┬─────┘                       │
│                                             │                              │
│                    ┌────────────────────────┼────────────────────────┐    │
│                    │                        │                        │     │
│                    ▼                        ▼                        ▼     │
│              ┌──────────┐            ┌──────────┐            ┌──────────┐ │
│              │ Worker 1 │            │ Worker 2 │            │ Worker N │ │
│              │          │            │          │            │          │ │
│              └──────────┘            └──────────┘            └──────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Deep Dive: Job Scheduling

```
┌─────────────────────────────────────────────────────────────────┐
│                   SCHEDULER SERVICE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Responsibilities:                                              │
│  ─────────────────                                              │
│  1. Poll for jobs where next_run_at <= now                     │
│  2. Enqueue jobs to execution queue                            │
│  3. Update next_run_at for recurring jobs                     │
│  4. Handle job claiming (avoid duplicates)                     │
│                                                                 │
│  Polling Loop:                                                  │
│  ───────────────                                                │
│  Every 1 second:                                                │
│    jobs = SELECT * FROM jobs                                   │
│            WHERE next_run_at <= NOW()                          │
│            AND status = 'active'                               │
│            ORDER BY priority DESC, next_run_at                 │
│            LIMIT 1000                                          │
│            FOR UPDATE SKIP LOCKED;                             │
│                                                                 │
│    for job in jobs:                                            │
│      enqueue_to_redis(job)                                     │
│      if job.type == 'recurring':                               │
│        job.next_run_at = calculate_next(job.cron)             │
│      else:                                                      │
│        job.status = 'completed'                                │
│                                                                 │
│  FOR UPDATE SKIP LOCKED:                                       │
│  ─────────────────────────                                      │
│  • Locks selected rows                                         │
│  • Other schedulers skip locked rows                          │
│  • Prevents duplicate execution                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Scheduler Implementation

```python
class SchedulerService:
    def __init__(self):
        self.db = Database()
        self.queue = Redis()
        self.running = True
        
    def run(self):
        while self.running:
            try:
                self.poll_and_enqueue()
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            time.sleep(1)
    
    def poll_and_enqueue(self):
        with self.db.transaction() as tx:
            # Fetch due jobs with row locking
            jobs = tx.execute("""
                SELECT * FROM jobs
                WHERE next_run_at <= NOW()
                AND status = 'active'
                ORDER BY priority DESC, next_run_at
                LIMIT 100
                FOR UPDATE SKIP LOCKED
            """)
            
            for job in jobs:
                # Create execution record
                execution_id = uuid4()
                tx.execute("""
                    INSERT INTO job_executions 
                    (execution_id, job_id, scheduled_at, status)
                    VALUES (%s, %s, %s, 'pending')
                """, (execution_id, job.id, job.next_run_at))
                
                # Enqueue to Redis
                self.queue.rpush("job_queue", json.dumps({
                    "execution_id": str(execution_id),
                    "job_id": str(job.id),
                    "handler": job.handler,
                    "payload": job.payload,
                    "timeout": job.timeout_seconds
                }))
                
                # Update next run time
                if job.type == 'recurring':
                    next_run = self.calculate_next_run(job.cron_expression)
                    tx.execute("""
                        UPDATE jobs 
                        SET next_run_at = %s 
                        WHERE job_id = %s
                    """, (next_run, job.id))
                else:
                    tx.execute("""
                        UPDATE jobs 
                        SET status = 'completed' 
                        WHERE job_id = %s
                    """, (job.id,))
```

---

## 6. Deep Dive: Worker Execution

```
┌─────────────────────────────────────────────────────────────────┐
│                   WORKER EXECUTION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Worker Loop:                                                   │
│  ─────────────                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  while running:                                        │    │
│  │    job = BLPOP job_queue (blocking pop)               │    │
│  │                                                         │    │
│  │    # Mark as running                                   │    │
│  │    UPDATE job_executions                               │    │
│  │    SET status = 'running',                            │    │
│  │        started_at = NOW(),                            │    │
│  │        worker_id = self.id                            │    │
│  │    WHERE execution_id = job.execution_id              │    │
│  │                                                         │    │
│  │    try:                                                │    │
│  │      result = execute_with_timeout(job)               │    │
│  │      mark_succeeded(job, result)                      │    │
│  │    except Timeout:                                     │    │
│  │      mark_failed(job, "timeout")                      │    │
│  │    except Exception as e:                              │    │
│  │      maybe_retry(job, e)                              │    │
│  │                                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Execution Types:                                               │
│  ─────────────────                                              │
│  • HTTP webhook: POST to endpoint with payload                 │
│  • gRPC call: Invoke remote procedure                         │
│  • In-process: Call registered handler function               │
│  • Shell command: Execute script                              │
│                                                                 │
│  Timeout Handling:                                              │
│  ──────────────────                                             │
│  • Set alarm/signal for job timeout                           │
│  • Kill job if exceeds timeout                                │
│  • Mark execution as 'timeout'                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Deep Dive: Exactly-Once Execution

```
┌─────────────────────────────────────────────────────────────────┐
│                   EXACTLY-ONCE SEMANTICS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Challenge: Ensure job runs exactly once, even with failures  │
│                                                                 │
│  Problems:                                                      │
│  ──────────                                                     │
│  1. Scheduler crashes after enqueue, before DB update          │
│  2. Worker crashes mid-execution                               │
│  3. Network partitions                                         │
│                                                                 │
│  Solutions:                                                     │
│  ───────────                                                    │
│                                                                 │
│  1. Idempotent Jobs                                            │
│     ─────────────────                                           │
│     • Design jobs to be safely re-executed                    │
│     • Use idempotency keys in job payload                     │
│     • Job itself checks if already processed                  │
│                                                                 │
│  2. Claim-based Locking                                        │
│     ────────────────────                                        │
│     • Worker "claims" job with unique execution_id            │
│     • Only claimer can complete/fail the job                  │
│     • Prevents concurrent execution                           │
│                                                                 │
│  3. Heartbeat + Lease                                          │
│     ─────────────────────                                       │
│     • Worker holds lease on job                               │
│     • Must heartbeat to maintain lease                        │
│     • Lease expires → Job can be reclaimed                    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Lease-based Execution:                                │    │
│  │                                                         │    │
│  │  1. Worker acquires lease:                             │    │
│  │     SET job:123:lease {worker_id} EX 30 NX             │    │
│  │                                                         │    │
│  │  2. While executing, renew lease:                      │    │
│  │     EXPIRE job:123:lease 30 (every 10 seconds)        │    │
│  │                                                         │    │
│  │  3. On completion, release lease:                      │    │
│  │     DEL job:123:lease                                  │    │
│  │                                                         │    │
│  │  4. If worker dies, lease expires:                     │    │
│  │     Another worker can claim after 30 seconds         │    │
│  │                                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Retry Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                   RETRY HANDLING                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Retry Strategy:                                                │
│  ─────────────────                                              │
│  • Exponential backoff: delay × 2^attempt                      │
│  • With jitter: delay × (1 + random(0, 0.5))                  │
│  • Max retries: 3 (configurable per job)                      │
│                                                                 │
│  Example:                                                       │
│  ──────────                                                     │
│  Attempt 1: Immediate                                          │
│  Attempt 2: After 60 seconds (+ jitter)                       │
│  Attempt 3: After 120 seconds (+ jitter)                      │
│  Attempt 4: After 240 seconds (+ jitter)                      │
│  Give up → Move to Dead Letter Queue                          │
│                                                                 │
│  Implementation:                                                │
│  ─────────────────                                              │
│  def handle_failure(execution, error):                         │
│      if execution.attempt < job.max_retries:                  │
│          # Schedule retry                                      │
│          delay = job.retry_delay * (2 ** execution.attempt)   │
│          delay *= (1 + random.uniform(0, 0.5))                │
│                                                                 │
│          schedule_at = now() + timedelta(seconds=delay)       │
│                                                                 │
│          create_execution(                                     │
│              job_id=job.id,                                   │
│              scheduled_at=schedule_at,                        │
│              attempt=execution.attempt + 1                    │
│          )                                                      │
│      else:                                                      │
│          # Move to DLQ                                         │
│          move_to_dlq(execution)                               │
│          notify_failure(job, execution)                       │
│                                                                 │
│  Dead Letter Queue:                                             │
│  ───────────────────                                            │
│  • Failed jobs after max retries                              │
│  • Manual review and replay                                   │
│  • Alerting on DLQ growth                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Cron Expression Parsing

```
┌─────────────────────────────────────────────────────────────────┐
│                   CRON EXPRESSIONS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Format: minute hour day-of-month month day-of-week            │
│                                                                 │
│  Examples:                                                      │
│  ───────────                                                    │
│  "0 9 * * *"     → Every day at 9:00 AM                       │
│  "*/15 * * * *"  → Every 15 minutes                           │
│  "0 0 1 * *"     → First day of every month                   │
│  "0 0 * * 0"     → Every Sunday at midnight                   │
│                                                                 │
│  Calculating Next Run:                                          │
│  ──────────────────────                                         │
│  from croniter import croniter                                 │
│                                                                 │
│  def calculate_next_run(cron_expr: str) -> datetime:          │
│      cron = croniter(cron_expr, datetime.now())               │
│      return cron.get_next(datetime)                           │
│                                                                 │
│  Timezone Handling:                                             │
│  ───────────────────                                            │
│  • Store timezone with job definition                          │
│  • Convert to UTC for storage                                  │
│  • Handle DST transitions                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. High Availability

```
┌─────────────────────────────────────────────────────────────────┐
│                   HIGH AVAILABILITY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scheduler HA:                                                  │
│  ──────────────                                                 │
│  • Multiple scheduler instances                                │
│  • FOR UPDATE SKIP LOCKED prevents duplicates                  │
│  • Or: Single active scheduler with leader election           │
│                                                                 │
│  Worker HA:                                                     │
│  ────────────                                                   │
│  • Stateless workers, easy to scale                           │
│  • Heartbeat to detect failures                               │
│  • Lease expiration recovers stuck jobs                       │
│                                                                 │
│  Database HA:                                                   │
│  ─────────────                                                  │
│  • PostgreSQL with streaming replication                      │
│  • Automatic failover                                          │
│                                                                 │
│  Queue HA:                                                      │
│  ──────────                                                     │
│  • Redis Cluster or Redis Sentinel                            │
│  • Fallback to DB-based queue if Redis down                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Job Store | PostgreSQL | ACID, FOR UPDATE SKIP LOCKED |
| Queue | Redis | Fast, reliable |
| Scheduler | Custom service | Control over behavior |
| Workers | Kubernetes Jobs | Auto-scaling |
| Cron Parser | croniter | Standard library |
| Monitoring | Prometheus | Metrics, alerting |

---

## 12. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. FOR UPDATE SKIP LOCKED                                      │
│     Prevents duplicate execution by schedulers                 │
│                                                                 │
│  2. LEASE-BASED EXECUTION                                       │
│     Workers hold lease, recover on failure                     │
│                                                                 │
│  3. IDEMPOTENT JOBS                                             │
│     Design jobs to handle re-execution                         │
│                                                                 │
│  4. EXPONENTIAL BACKOFF                                         │
│     Retry with increasing delays                               │
│                                                                 │
│  5. DEAD LETTER QUEUE                                           │
│     Capture failed jobs for investigation                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. References

- [09-message-queues.md](../fundamentals/09-message-queues.md) - Queue patterns
- [14-distributed-patterns.md](../fundamentals/14-distributed-patterns.md) - Leader election
- [20-fault-tolerance.md](../fundamentals/20-fault-tolerance.md) - Retry patterns

---

[← Back to Problems](00-index.md) | [Next: Payment System →](16-payment-system.md)
