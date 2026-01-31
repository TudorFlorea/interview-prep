# Design Patterns

A comprehensive guide to the 22 Gang of Four (GoF) design patterns with C# implementations.

---

## 📊 Progress Dashboard

| Category | Patterns | Completed | Progress |
|----------|----------|-----------|----------|
| [Creational](creational/00-index.md) | 5 | 0 | ⬜⬜⬜⬜⬜ |
| [Structural](structural/00-index.md) | 7 | 0 | ⬜⬜⬜⬜⬜⬜⬜ |
| [Behavioral](behavioral/00-index.md) | 10 | 0 | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ |
| **Total** | **22** | **0** | **0%** |

---

## 🏗️ Creational Patterns

*Provide various object creation mechanisms, which increase flexibility and reuse of existing code.*

| # | Pattern | Description | Status |
|---|---------|-------------|--------|
| 1 | [Factory Method](creational/01-factory-method.md) | Provides an interface for creating objects in a superclass, but allows subclasses to alter the type of objects | ⬜ |
| 2 | [Abstract Factory](creational/02-abstract-factory.md) | Produces families of related objects without specifying their concrete classes | ⬜ |
| 3 | [Builder](creational/03-builder.md) | Constructs complex objects step by step | ⬜ |
| 4 | [Prototype](creational/04-prototype.md) | Copies existing objects without making code dependent on their classes | ⬜ |
| 5 | [Singleton](creational/05-singleton.md) | Ensures a class has only one instance while providing global access point | ⬜ |

---

## 🔧 Structural Patterns

*Explain how to assemble objects and classes into larger structures while keeping structures flexible and efficient.*

| # | Pattern | Description | Status |
|---|---------|-------------|--------|
| 1 | [Adapter](structural/01-adapter.md) | Allows objects with incompatible interfaces to collaborate | ⬜ |
| 2 | [Bridge](structural/02-bridge.md) | Splits a large class or related classes into separate hierarchies | ⬜ |
| 3 | [Composite](structural/03-composite.md) | Composes objects into tree structures and works with them as individual objects | ⬜ |
| 4 | [Decorator](structural/04-decorator.md) | Attaches new behaviors to objects by placing them inside wrapper objects | ⬜ |
| 5 | [Facade](structural/05-facade.md) | Provides a simplified interface to a library, framework, or complex set of classes | ⬜ |
| 6 | [Flyweight](structural/06-flyweight.md) | Fits more objects into available RAM by sharing common state between objects | ⬜ |
| 7 | [Proxy](structural/07-proxy.md) | Provides a substitute or placeholder for another object | ⬜ |

---

## 🎭 Behavioral Patterns

*Concerned with algorithms and the assignment of responsibilities between objects.*

| # | Pattern | Description | Status |
|---|---------|-------------|--------|
| 1 | [Chain of Responsibility](behavioral/01-chain-of-responsibility.md) | Passes requests along a chain of handlers | ⬜ |
| 2 | [Command](behavioral/02-command.md) | Turns a request into a stand-alone object containing all request information | ⬜ |
| 3 | [Iterator](behavioral/03-iterator.md) | Traverses elements of a collection without exposing its underlying representation | ⬜ |
| 4 | [Mediator](behavioral/04-mediator.md) | Reduces chaotic dependencies between objects | ⬜ |
| 5 | [Memento](behavioral/05-memento.md) | Saves and restores the previous state of an object | ⬜ |
| 6 | [Observer](behavioral/06-observer.md) | Defines a subscription mechanism to notify multiple objects about events | ⬜ |
| 7 | [State](behavioral/07-state.md) | Alters object behavior when its internal state changes | ⬜ |
| 8 | [Strategy](behavioral/08-strategy.md) | Defines a family of algorithms and makes them interchangeable | ⬜ |
| 9 | [Template Method](behavioral/09-template-method.md) | Defines skeleton of an algorithm, deferring some steps to subclasses | ⬜ |
| 10 | [Visitor](behavioral/10-visitor.md) | Separates algorithms from the objects on which they operate | ⬜ |

---

## 📚 Study Roadmap

### Phase 1: Foundation (Week 1)
Start with the most commonly used patterns:
1. **Singleton** - Understand single instance management
2. **Factory Method** - Learn basic object creation delegation
3. **Strategy** - Grasp algorithm encapsulation
4. **Observer** - Master event-driven programming

### Phase 2: Intermediate (Week 2)
Build on foundations with structural patterns:
1. **Adapter** - Interface compatibility
2. **Decorator** - Dynamic behavior extension
3. **Facade** - Simplifying complex systems
4. **Builder** - Complex object construction

### Phase 3: Advanced (Week 3)
Tackle more complex behavioral patterns:
1. **Command** - Request encapsulation and undo
2. **State** - State machine implementation
3. **Template Method** - Algorithm skeleton
4. **Chain of Responsibility** - Request handling chains

### Phase 4: Mastery (Week 4)
Complete understanding with remaining patterns:
1. **Abstract Factory**, **Prototype**
2. **Bridge**, **Composite**, **Flyweight**, **Proxy**
3. **Iterator**, **Mediator**, **Memento**, **Visitor**

---

## 🎯 How to Use This Guide

1. **Read the Intent** - Understand what problem the pattern solves
2. **Study the Problem** - See the real-world scenario
3. **Analyze the Structure** - Understand the components and relationships
4. **Run the Code** - Execute the C# console examples
5. **Review Anti-Patterns** - Learn when NOT to use the pattern
6. **Practice** - Apply to your own projects

---

## 📖 Resources

- [Refactoring.Guru - Design Patterns](https://refactoring.guru/design-patterns)
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612) (Gang of Four Book)
- [Head First Design Patterns](https://www.amazon.com/Head-First-Design-Patterns-Brain-Friendly/dp/0596007124)
- [C# Design Patterns - Pluralsight](https://www.pluralsight.com/paths/design-patterns-in-c)
