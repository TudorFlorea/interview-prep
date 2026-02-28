# Creational Design Patterns

[← Back to Main Index](/design-patterns/00-index.md)

---

## Overview

Creational design patterns provide various object creation mechanisms, which increase flexibility and reuse of existing code. They abstract the instantiation process, making a system independent of how its objects are created, composed, and represented.

---

## When to Use Creational Patterns

- **Object creation logic becomes complex** - When simple `new` statements aren't sufficient
- **System should be independent of object creation** - Decoupling client code from concrete classes
- **Need to control object instantiation** - Limiting instances, pooling, or lazy initialization
- **Creating families of related objects** - Ensuring compatibility between created objects
- **Need flexibility in what gets created** - Runtime decisions about object types

---

## Patterns in This Category

| # | Pattern | Intent | Complexity |
|---|---------|--------|------------|
| 1 | [Factory Method](/design-patterns/creational/01-factory-method.md) | Define an interface for creating objects, letting subclasses decide which class to instantiate | 🟢 Low |
| 2 | [Abstract Factory](/design-patterns/creational/02-abstract-factory.md) | Create families of related objects without specifying concrete classes | 🟡 Medium |
| 3 | [Builder](/design-patterns/creational/03-builder.md) | Construct complex objects step by step, allowing different representations | 🟡 Medium |
| 4 | [Prototype](/design-patterns/creational/04-prototype.md) | Clone existing objects without coupling to their concrete classes | 🟢 Low |
| 5 | [Singleton](/design-patterns/creational/05-singleton.md) | Ensure a class has only one instance with a global access point | 🟢 Low |

---

## Pattern Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     CREATIONAL PATTERNS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Singleton ←──── Often used with ────→ Abstract Factory        │
│       │                                      │                  │
│       │                                      │                  │
│       ▼                                      ▼                  │
│   Factory Method ◄─── Can evolve to ───► Abstract Factory       │
│       │                                      │                  │
│       │                                      │                  │
│       ▼                                      ▼                  │
│   Prototype ←──── Alternative to ────→ Factory Method           │
│                                                                 │
│   Builder ←──── Can use ────→ Prototype (for complex parts)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Comparison

| Pattern | Creates | How | When to Use |
|---------|---------|-----|-------------|
| **Factory Method** | Single product | Subclass decides | One product type with variants |
| **Abstract Factory** | Product families | Factory interface | Multiple related products |
| **Builder** | Complex object | Step by step | Many construction steps |
| **Prototype** | Clone of existing | Copy mechanism | Costly object creation |
| **Singleton** | Single instance | Private constructor | Global shared resource |

---

## C# Language Features Used

- **Interfaces & Abstract Classes** - Defining contracts for factories and products
- **Virtual/Override Methods** - Factory Method implementation
- **Static Members** - Singleton instance access
- **ICloneable Interface** - Prototype pattern support
- **Fluent Interfaces** - Builder pattern with method chaining
- **Lazy<T>** - Thread-safe lazy initialization for Singleton
