# Behavioral Design Patterns

[← Back to Main Index](/design-patterns/00-index.md)

---

## Overview

Behavioral design patterns are concerned with algorithms and the assignment of responsibilities between objects. They describe not just patterns of objects or classes but also the patterns of communication between them. These patterns characterize complex control flow that's difficult to follow at runtime.

---

## When to Use Behavioral Patterns

- **Complex control flow** - When algorithms involve multiple objects communicating
- **Need to vary algorithms** - Encapsulating different behaviors for flexibility
- **Loose coupling** - Reducing direct dependencies between communicating objects
- **State-dependent behavior** - Objects that change behavior based on internal state
- **Request handling** - Processing requests through chains or command queues
- **Collection traversal** - Providing uniform access to aggregate elements

---

## Patterns in This Category

| # | Pattern | Intent | Complexity |
|---|---------|--------|------------|
| 1 | [Chain of Responsibility](/design-patterns/behavioral/01-chain-of-responsibility.md) | Pass requests along a chain of handlers until one handles it | 🟡 Medium |
| 2 | [Command](/design-patterns/behavioral/02-command.md) | Encapsulate a request as an object, enabling parameterization and queuing | 🟡 Medium |
| 3 | [Iterator](/design-patterns/behavioral/03-iterator.md) | Provide a way to access elements of a collection sequentially | 🟢 Low |
| 4 | [Mediator](/design-patterns/behavioral/04-mediator.md) | Define an object that encapsulates how objects interact | 🟡 Medium |
| 5 | [Memento](/design-patterns/behavioral/05-memento.md) | Capture and externalize an object's internal state for later restoration | 🟡 Medium |
| 6 | [Observer](/design-patterns/behavioral/06-observer.md) | Define a subscription mechanism to notify multiple objects about events | 🟡 Medium |
| 7 | [State](/design-patterns/behavioral/07-state.md) | Allow an object to alter its behavior when its internal state changes | 🟡 Medium |
| 8 | [Strategy](/design-patterns/behavioral/08-strategy.md) | Define a family of algorithms, encapsulate each one, and make them interchangeable | 🟢 Low |
| 9 | [Template Method](/design-patterns/behavioral/09-template-method.md) | Define the skeleton of an algorithm, deferring some steps to subclasses | 🟢 Low |
| 10 | [Visitor](/design-patterns/behavioral/10-visitor.md) | Separate algorithms from the objects on which they operate | 🔴 High |

---

## Pattern Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     BEHAVIORAL PATTERNS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Chain of Responsibility ←── Can use ──→ Command               │
│            │                                 │                  │
│            ▼                                 ▼                  │
│   Mediator ←──── Centralizes ────→ Observer                     │
│       │          communication        │                         │
│       │                               │                         │
│       ▼                               ▼                         │
│   State ←──── Object changes ────→ Strategy                     │
│       │       behavior at runtime     │                         │
│       │                               │                         │
│       ▼                               ▼                         │
│   Memento ←──── Stores state ────→ Command (undo)               │
│                                                                 │
│   Iterator ←──── Traverses ────→ Composite                      │
│                                                                 │
│   Template Method ←── Uses inheritance ──→ Strategy (composition)│
│                                                                 │
│   Visitor ←──── Double dispatch ────→ Composite                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Comparison

| Pattern | Purpose | Key Mechanism | Typical Use Case |
|---------|---------|---------------|------------------|
| **Chain of Responsibility** | Decouple sender/receiver | Handler chain | Middleware, logging |
| **Command** | Encapsulate requests | Command objects | Undo/redo, queues |
| **Iterator** | Sequential access | Iterator interface | Collection traversal |
| **Mediator** | Centralize communication | Mediator object | Chat rooms, dialogs |
| **Memento** | Capture/restore state | Memento objects | Undo, snapshots |
| **Observer** | Event notification | Subject/observer | Event systems, MVC |
| **State** | State-based behavior | State objects | Workflows, games |
| **Strategy** | Interchangeable algorithms | Strategy interface | Sorting, validation |
| **Template Method** | Algorithm skeleton | Abstract methods | Frameworks, hooks |
| **Visitor** | Operations on structures | Double dispatch | Compilers, exporters |

---

## State vs Strategy

These patterns are structurally similar but have different intents:

| Aspect | State | Strategy |
|--------|-------|----------|
| **Intent** | Change behavior based on state | Select algorithm at runtime |
| **State Awareness** | States know about each other | Strategies are independent |
| **Transitions** | States can trigger transitions | Client selects strategy |
| **Example** | Order status (Pending→Shipped→Delivered) | Payment methods (Card/PayPal/Crypto) |

---

## Command vs Strategy

| Aspect | Command | Strategy |
|--------|---------|----------|
| **Purpose** | Encapsulate a request | Encapsulate an algorithm |
| **Contains** | Action + parameters + receiver | Algorithm implementation |
| **Use Case** | Queuing, undo/redo, logging | Choosing how to do something |
| **Lifetime** | Usually short (one execution) | Usually longer (policy) |

---

## C# Language Features Used

- **Delegates & Events** - Observer pattern (built-in support)
- **IEnumerable&lt;T> & IEnumerator&lt;T>** - Iterator pattern (built-in support)
- **Func&lt;T> & Action&lt;T>** - Strategy and Command patterns
- **Abstract Classes** - Template Method, State
- **Interfaces** - All behavioral patterns
- **LINQ** - Often replaces explicit Iterator
- **async/await** - Can be combined with Command pattern
