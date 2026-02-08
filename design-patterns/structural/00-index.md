# Structural Design Patterns

[← Back to Main Index](/design-patterns/00-index.md)

---

## Overview

Structural design patterns explain how to assemble objects and classes into larger structures while keeping these structures flexible and efficient. They focus on how classes and objects are composed to form larger structures, emphasizing the composition of interfaces and the ways objects can be combined.

---

## When to Use Structural Patterns

- **Need to adapt incompatible interfaces** - Making existing classes work together
- **Adding responsibilities dynamically** - Extending behavior without subclassing
- **Simplifying complex subsystems** - Providing unified interfaces
- **Optimizing memory usage** - Sharing state between many objects
- **Controlling object access** - Adding security, caching, or lazy loading
- **Building hierarchical structures** - Tree-like object compositions

---

## Patterns in This Category

| # | Pattern | Intent | Complexity |
|---|---------|--------|------------|
| 1 | [Adapter](/design-patterns/structural/01-adapter.md) | Convert interface of a class into another interface clients expect | 🟢 Low |
| 2 | [Bridge](/design-patterns/structural/02-bridge.md) | Separate abstraction from implementation so both can vary independently | 🟡 Medium |
| 3 | [Composite](/design-patterns/structural/03-composite.md) | Compose objects into tree structures to represent part-whole hierarchies | 🟡 Medium |
| 4 | [Decorator](/design-patterns/structural/04-decorator.md) | Attach additional responsibilities to objects dynamically | 🟡 Medium |
| 5 | [Facade](/design-patterns/structural/05-facade.md) | Provide a unified interface to a set of interfaces in a subsystem | 🟢 Low |
| 6 | [Flyweight](/design-patterns/structural/06-flyweight.md) | Use sharing to support large numbers of fine-grained objects efficiently | 🔴 High |
| 7 | [Proxy](/design-patterns/structural/07-proxy.md) | Provide a surrogate or placeholder for another object to control access | 🟡 Medium |

---

## Pattern Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     STRUCTURAL PATTERNS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Adapter ←──── Similar structure ────→ Bridge                  │
│       │         (different intent)          │                   │
│       │                                     │                   │
│       ▼                                     ▼                   │
│   Facade ←──── Simplifies ────→ Complex Subsystems              │
│                                                                 │
│   Decorator ←──── Similar to ────→ Composite                    │
│       │         (recursive composition)     │                   │
│       │                                     │                   │
│       ▼                                     ▼                   │
│   Proxy ←──── Same interface ────→ Real Subject                 │
│                                                                 │
│   Flyweight ←──── Often used with ────→ Composite               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Comparison

| Pattern | Purpose | Key Mechanism | Typical Use Case |
|---------|---------|---------------|------------------|
| **Adapter** | Interface conversion | Wraps one interface | Legacy system integration |
| **Bridge** | Decouple abstraction | Composition over inheritance | Platform independence |
| **Composite** | Tree structures | Uniform interface | File systems, UI trees |
| **Decorator** | Add behavior | Recursive wrapping | Stream processing, UI |
| **Facade** | Simplify interface | Unified entry point | Library/API wrappers |
| **Flyweight** | Memory optimization | Shared intrinsic state | Text editors, games |
| **Proxy** | Control access | Same interface | Caching, security, lazy load |

---

## Adapter vs Bridge vs Decorator vs Proxy

These patterns are often confused because they all use composition and wrapping:

| Aspect | Adapter | Bridge | Decorator | Proxy |
|--------|---------|--------|-----------|-------|
| **Intent** | Make incompatible interfaces work | Separate abstraction from implementation | Add responsibilities | Control access |
| **Interface** | Changes interface | Both sides can vary | Same interface | Same interface |
| **When Applied** | After design (fix) | During design (prevent) | Runtime (extend) | Anytime (control) |
| **Relationship** | Adapts one to another | Connects two hierarchies | Wraps to enhance | Wraps to control |

---

## C# Language Features Used

- **Interface Implementation** - Adapter, Bridge, Decorator, Proxy
- **Composition** - All structural patterns favor composition over inheritance
- **Abstract Classes** - Common base for Composite, Decorator
- **Indexers** - Composite pattern for child access
- **Extension Methods** - Can complement Decorator pattern
- **Lazy&lt;T>** - Proxy pattern for lazy initialization
- **Dictionary&lt;K,V>** - Flyweight pattern for caching
