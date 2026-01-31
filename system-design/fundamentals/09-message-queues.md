# Message Queues

[← Back to Fundamentals](00-index.md)

---

## Overview

Message queues enable asynchronous communication between services, allowing systems to be decoupled, scalable, and resilient. Instead of services calling each other directly, they communicate through a queue, which acts as a buffer and ensures messages are delivered even when consumers are temporarily unavailable.

---

## 🎯 Why Use Message Queues?

### Synchronous vs Asynchronous Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYNC vs ASYNC                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Synchronous (Direct Call):                                     │
│  ───────────────────────────────────────                        │
│                                                                 │
│  Order Service ──HTTP──► Email Service                          │
│       │                      │                                  │
│       │                      │ (Order Service waits)            │
│       │◄─────────────────────┘                                  │
│                                                                 │
│  ❌ Tightly coupled                                             │
│  ❌ Blocked waiting for response                                │
│  ❌ If Email Service is down, order fails                       │
│                                                                 │
│  Asynchronous (Queue):                                          │
│  ───────────────────────────────────────                        │
│                                                                 │
│  Order Service ──► Queue ──► Email Service                      │
│       │              │                                          │
│       │ (continues)  │ (processes when ready)                   │
│       ▼              ▼                                          │
│                                                                 │
│  ✅ Loosely coupled                                             │
│  ✅ Non-blocking                                                │
│  ✅ Resilient to downstream failures                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Decoupling** | Producer and consumer don't need to know about each other |
| **Scalability** | Add more consumers to handle load |
| **Resilience** | Messages persist if consumers fail |
| **Load Leveling** | Queue buffers traffic spikes |
| **Async Processing** | Long-running tasks don't block users |

---

## 📦 Core Concepts

### Queue Terminology

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE QUEUE COMPONENTS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Producer          Queue/Topic           Consumer               │
│  ┌────────┐       ┌───────────┐         ┌────────┐             │
│  │ Order  │──────►│  ░░░░░░░  │────────►│ Email  │             │
│  │Service │       │  Messages │         │Worker  │             │
│  └────────┘       └───────────┘         └────────┘             │
│                                                                 │
│  Producer: Creates and sends messages                           │
│  Queue: Stores messages until consumed                          │
│  Consumer: Receives and processes messages                      │
│  Message: Data being transferred                                │
│  Broker: Server managing queues (Kafka, RabbitMQ)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Message Structure

```json
{
  "id": "msg_123abc",
  "timestamp": "2024-01-15T10:30:00Z",
  "type": "order.created",
  "version": "1.0",
  "payload": {
    "order_id": "ord_456",
    "customer_id": "cust_789",
    "total": 99.99,
    "items": [...]
  },
  "metadata": {
    "correlation_id": "req_xyz",
    "retry_count": 0
  }
}
```

---

## 🔄 Messaging Patterns

### Point-to-Point (Queue)

One message is consumed by exactly one consumer.

```
┌─────────────────────────────────────────────────────────────────┐
│                    POINT-TO-POINT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Producer                                                       │
│     │                                                           │
│     ▼                                                           │
│  ┌─────────────────────────────────┐                           │
│  │  Queue  [M1] [M2] [M3] [M4]     │                           │
│  └─────────────────────────────────┘                           │
│     │                                                           │
│     ├──► Consumer A (gets M1, M3)                               │
│     └──► Consumer B (gets M2, M4)                               │
│                                                                 │
│  Load is distributed across consumers                           │
│  Each message processed exactly once                            │
│                                                                 │
│  Use cases: Task queues, job processing                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Publish-Subscribe (Topic)

One message is delivered to all subscribers.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PUBLISH-SUBSCRIBE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Publisher                                                      │
│     │                                                           │
│     ▼                                                           │
│  ┌─────────────────────────────────┐                           │
│  │  Topic: order.created           │                           │
│  └─────────────────────────────────┘                           │
│     │         │          │                                      │
│     ▼         ▼          ▼                                      │
│  Email     Inventory   Analytics                                │
│  Service   Service     Service                                  │
│                                                                 │
│  All subscribers receive every message                          │
│                                                                 │
│  Use cases: Event broadcasting, notifications                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Request-Reply

Synchronous-style communication over async infrastructure.

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST-REPLY                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Requester                              Responder               │
│     │                                      │                    │
│     │──[Request]──► Request Queue ────────►│                    │
│     │                                      │                    │
│     │◄──[Reply]─── Reply Queue ◄───────────│                    │
│     │                                      │                    │
│  correlation_id links request to response                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Message Queue Technologies

### Comparison

| Feature | Kafka | RabbitMQ | SQS | Redis Pub/Sub |
|---------|-------|----------|-----|---------------|
| **Type** | Log-based | Traditional queue | Cloud queue | In-memory |
| **Ordering** | Per partition | Per queue | Best effort (FIFO avail) | No guarantee |
| **Persistence** | Yes | Yes | Yes | No |
| **Replay** | Yes | No | No | No |
| **Throughput** | Very high | High | High | Very high |
| **Latency** | Low | Very low | Medium | Very low |
| **Best for** | Event streaming | Task queues | Cloud-native | Real-time |

### When to Use Each

```
┌─────────────────────────────────────────────────────────────────┐
│                    TECHNOLOGY SELECTION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Use Kafka when:                                                │
│  • Need message replay                                          │
│  • Event sourcing / event streaming                             │
│  • Very high throughput (millions/sec)                          │
│  • Need to keep messages long-term                              │
│                                                                 │
│  Use RabbitMQ when:                                             │
│  • Need complex routing (topic, headers)                        │
│  • Traditional task queue patterns                              │
│  • Low latency is critical                                      │
│  • Need flexible acknowledgment                                 │
│                                                                 │
│  Use SQS when:                                                  │
│  • AWS-native, serverless                                       │
│  • Simple queue needs                                           │
│  • Don't want to manage infrastructure                          │
│                                                                 │
│  Use Redis Pub/Sub when:                                        │
│  • Real-time, ephemeral messages                                │
│  • Already using Redis                                          │
│  • Message loss acceptable                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Apache Kafka Deep Dive

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    KAFKA ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Producers                    Kafka Cluster                     │
│  ┌──────┐                    ┌────────────────────────────────┐ │
│  │ App1 │──────┐             │  Broker 1     Broker 2         │ │
│  └──────┘      │             │  ┌────────┐   ┌────────┐       │ │
│  ┌──────┐      ▼             │  │Topic A │   │Topic A │       │ │
│  │ App2 │────────────────────│  │ Part 0 │   │ Part 1 │       │ │
│  └──────┘                    │  │ Part 2 │   │ Part 3 │       │ │
│                              │  └────────┘   └────────┘       │ │
│                              │                                 │ │
│  Consumers                   │  ZooKeeper / KRaft              │ │
│  ┌──────────────────┐        │  (Cluster coordination)         │ │
│  │ Consumer Group A │◄───────│                                 │ │
│  │ ┌────┐ ┌────┐    │        └────────────────────────────────┘ │
│  │ │ C1 │ │ C2 │    │                                           │
│  │ └────┘ └────┘    │                                           │
│  └──────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Concepts

```
Topic: Category/stream name (e.g., "orders", "user-events")
Partition: Topic subdivision for parallelism
Offset: Position of message within partition
Consumer Group: Consumers sharing a subscription
Broker: Kafka server node

Partition Distribution:
─────────────────────────────────────────────

Topic: orders (4 partitions)

Partition 0: [msg1] [msg4] [msg7] ...
Partition 1: [msg2] [msg5] [msg8] ...
Partition 2: [msg3] [msg6] [msg9] ...
Partition 3: [msg10] [msg11] ...

Consumer Group with 2 consumers:
- Consumer 1: reads Partition 0, 1
- Consumer 2: reads Partition 2, 3
```

### Kafka Producer Example

```csharp
// Producer configuration
var config = new ProducerConfig
{
    BootstrapServers = "kafka:9092",
    Acks = Acks.All,  // Wait for all replicas
    EnableIdempotence = true  // Exactly-once semantics
};

using var producer = new ProducerBuilder<string, string>(config).Build();

// Send message with key for partitioning
var message = new Message<string, string>
{
    Key = orderId,  // Messages with same key go to same partition
    Value = JsonSerializer.Serialize(orderEvent)
};

var result = await producer.ProduceAsync("orders", message);
Console.WriteLine($"Delivered to partition {result.Partition}, offset {result.Offset}");
```

---

## 📥 Message Delivery Guarantees

### Delivery Semantics

```
┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY GUARANTEES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  At-Most-Once                                                   │
│  ─────────────────────────────────────────                      │
│  Message may be lost, never delivered twice                     │
│  • Fire and forget                                              │
│  • Good for: Metrics, logs where loss is okay                   │
│                                                                 │
│  At-Least-Once                                                  │
│  ─────────────────────────────────────────                      │
│  Message delivered at least once, may be duplicated             │
│  • Ack after processing                                         │
│  • Retry on failure                                             │
│  • Good for: Most use cases (with idempotency)                  │
│                                                                 │
│  Exactly-Once                                                   │
│  ─────────────────────────────────────────                      │
│  Message delivered exactly once, no loss, no duplicates         │
│  • Requires transactions or idempotency                         │
│  • More complex, higher latency                                 │
│  • Good for: Financial transactions                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Acknowledgment Patterns

```csharp
// At-Least-Once: Ack after successful processing
public async Task ProcessMessageAsync(Message message)
{
    try
    {
        await _orderService.ProcessOrder(message.Payload);
        await _queue.AckAsync(message);  // Acknowledge success
    }
    catch (Exception ex)
    {
        await _queue.NackAsync(message);  // Negative ack, will retry
        throw;
    }
}

// Exactly-Once with idempotency key
public async Task ProcessMessageIdempotent(Message message)
{
    var idempotencyKey = message.Id;
    
    // Check if already processed
    if (await _cache.ExistsAsync($"processed:{idempotencyKey}"))
    {
        await _queue.AckAsync(message);  // Already done
        return;
    }
    
    // Process with transaction
    using var transaction = await _db.BeginTransactionAsync();
    try
    {
        await _orderService.ProcessOrder(message.Payload);
        await _cache.SetAsync($"processed:{idempotencyKey}", "1", TimeSpan.FromDays(7));
        await transaction.CommitAsync();
        await _queue.AckAsync(message);
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

---

## ☠️ Dead Letter Queues (DLQ)

### Purpose

Messages that can't be processed after multiple retries are moved to a DLQ for investigation.

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEAD LETTER QUEUE FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Producer ──► Main Queue ──► Consumer                           │
│                   │              │                              │
│                   │              ├── Success ──► Done           │
│                   │              │                              │
│                   │              ├── Fail (retry 1)             │
│                   │              ├── Fail (retry 2)             │
│                   │              ├── Fail (retry 3)             │
│                   │              │                              │
│                   │              └── Max retries exceeded       │
│                   │                         │                   │
│                   ▼                         ▼                   │
│              Dead Letter Queue ◄────────────┘                   │
│                   │                                             │
│                   ▼                                             │
│              Alert + Manual investigation                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### DLQ Best Practices

| Practice | Description |
|----------|-------------|
| Set max retries | 3-5 attempts before DLQ |
| Exponential backoff | Increasing delay between retries |
| Preserve context | Keep original message + error info |
| Monitor DLQ | Alert on DLQ messages |
| Reprocessing mechanism | Way to replay DLQ messages |

---

## ⚡ Backpressure Handling

When consumers can't keep up with producers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKPRESSURE STRATEGIES                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Buffer (Queue grows)                                        │
│  ─────────────────────────────────────────                      │
│  Let queue buffer messages until consumers catch up             │
│  ⚠️ Risk: Queue overflow, memory issues                        │
│                                                                 │
│  2. Drop                                                        │
│  ─────────────────────────────────────────                      │
│  Discard new messages when queue is full                        │
│  ✅ Protects system                                             │
│  ❌ Data loss                                                   │
│                                                                 │
│  3. Block Producer                                              │
│  ─────────────────────────────────────────                      │
│  Producer waits until queue has space                           │
│  ✅ No data loss                                                │
│  ❌ Cascading slowdown                                          │
│                                                                 │
│  4. Scale Consumers                                             │
│  ─────────────────────────────────────────                      │
│  Auto-scale consumer count based on queue depth                 │
│  ✅ Best long-term solution                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📐 Event-Driven Architecture

### Event Sourcing

Store all changes as a sequence of events.

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT SOURCING                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Traditional CRUD:         Event Sourcing:                      │
│  ─────────────────         ───────────────                      │
│                                                                 │
│  ┌────────────────┐        ┌────────────────────────────┐      │
│  │ Account: $500  │        │ Event 1: AccountCreated    │      │
│  └────────────────┘        │ Event 2: Deposited $100    │      │
│   (only final state)       │ Event 3: Withdrew $50      │      │
│                            │ Event 4: Deposited $450    │      │
│                            │ = Current balance: $500    │      │
│                            └────────────────────────────┘      │
│                             (complete history)                  │
│                                                                 │
│  Benefits:                                                      │
│  ✅ Complete audit trail                                        │
│  ✅ Can rebuild state at any point                              │
│  ✅ Supports temporal queries                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CQRS (Command Query Responsibility Segregation)

Separate models for reads and writes.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CQRS PATTERN                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              Commands (Write)           Queries (Read)          │
│                   │                          │                  │
│                   ▼                          ▼                  │
│          ┌───────────────┐          ┌───────────────┐          │
│          │ Command Model │          │  Query Model  │          │
│          │ (normalized)  │          │(denormalized) │          │
│          └───────┬───────┘          └───────┬───────┘          │
│                  │                          │                  │
│                  ▼                          ▼                  │
│          ┌───────────────┐          ┌───────────────┐          │
│          │  Write DB     │──Event──►│   Read DB     │          │
│          │ (PostgreSQL)  │   Bus    │(Elasticsearch)│          │
│          └───────────────┘          └───────────────┘          │
│                                                                 │
│  Benefits:                                                      │
│  ✅ Optimize each side independently                            │
│  ✅ Scale reads and writes separately                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 AWS SQS Example

```python
import boto3
import json

sqs = boto3.client('sqs')
queue_url = 'https://sqs.us-east-1.amazonaws.com/123456789/orders'

# Send message
response = sqs.send_message(
    QueueUrl=queue_url,
    MessageBody=json.dumps({
        'order_id': 'ord_123',
        'action': 'process'
    }),
    MessageGroupId='order-processing',  # For FIFO queues
    MessageDeduplicationId='unique-id-123'  # Prevent duplicates
)

# Receive and process messages
while True:
    response = sqs.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=10,
        WaitTimeSeconds=20,  # Long polling
        VisibilityTimeout=30  # Time to process before redelivery
    )
    
    for message in response.get('Messages', []):
        try:
            body = json.loads(message['Body'])
            process_order(body)
            
            # Delete after successful processing
            sqs.delete_message(
                QueueUrl=queue_url,
                ReceiptHandle=message['ReceiptHandle']
            )
        except Exception as e:
            # Message returns to queue after visibility timeout
            print(f"Error processing: {e}")
```

---

## ✅ Key Takeaways

1. **Use queues for decoupling** - Producers and consumers evolve independently
2. **Choose the right tool** - Kafka for streaming, RabbitMQ for tasks, SQS for cloud
3. **Design for at-least-once** - Combine with idempotency
4. **Implement DLQ** - Don't lose failed messages
5. **Handle backpressure** - Scale consumers or implement flow control
6. **Monitor queue depth** - Growing queues indicate problems
7. **Consider event sourcing** - For audit trails and complex domains

---

## 📚 Related Topics

- [Distributed Patterns](14-distributed-patterns.md) - Saga pattern, event choreography
- [Fault Tolerance](20-fault-tolerance.md) - Retry strategies
- [Scaling Strategies](10-scaling-strategies.md) - Scaling consumers
