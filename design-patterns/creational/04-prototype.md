# Prototype Pattern

[← Back to Creational Patterns](00-index.md) | [← Back to Main Index](../00-index.md)

---

## Intent

**Prototype** is a creational design pattern that lets you copy existing objects without making your code dependent on their classes.

---

## Problem

Say you have an object, and you want to create an exact copy of it. How would you do it? First, you have to create a new object of the same class. Then you have to go through all the fields of the original object and copy their values.

But there's a catch! Not all objects can be copied that way because some fields may be private and not visible from outside the object. There's also a problem with dependencies: your code becomes dependent on that specific class.

---

## Solution

The Prototype pattern delegates the cloning process to the actual objects that are being cloned. The pattern declares a common interface for all objects that support cloning. This interface lets you clone an object without coupling your code to the class of that object.

```
┌───────────────────────────────────────────────────────────────────────┐
│                        &lt;&lt;interface>>                                   │
│                         ICloneable                                     │
│  ───────────────────────────────────────────────────────────────────  │
│  + Clone(): ICloneable                                                 │
└───────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ ConcreteProto1  │    │ ConcreteProto2  │    │ ConcreteProto3  │
│ ─────────────── │    │ ─────────────── │    │ ─────────────── │
│ - field1        │    │ - fieldA        │    │ - fieldX        │
│ - field2        │    │ - fieldB        │    │ - fieldY        │
│ + Clone()       │    │ + Clone()       │    │ + Clone()       │
└─────────────────┘    └─────────────────┘    └─────────────────┘

    ┌──────────┐  Clone()  ┌──────────┐
    │ Original │ ────────► │   Copy   │
    │  Object  │           │  Object  │
    └──────────┘           └──────────┘
```

---

## Structure

1. **Prototype Interface** - Declares the cloning method (usually a single `Clone` method)
2. **Concrete Prototypes** - Implement the cloning method, handling their own cloning logic
3. **Client** - Creates new objects by asking a prototype to clone itself

---

## Shallow vs Deep Copy

| Type | Description | When to Use |
|------|-------------|-------------|
| **Shallow Copy** | Copies field values; reference types share the same objects | Simple objects, immutable references |
| **Deep Copy** | Recursively clones all referenced objects | Complex objects with mutable nested objects |

---

## C# Implementation

### Full Console Example: Document Cloning System

```csharp
using System;
using System.Collections.Generic;
using System.Text.Json;

namespace PrototypePattern
{
    // ═══════════════════════════════════════════════════════════════
    // PROTOTYPE INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Prototype interface with a cloning method.
    /// </summary>
    public interface IDocumentPrototype
    {
        IDocumentPrototype Clone();
        IDocumentPrototype DeepClone();
        void Display();
    }

    // ═══════════════════════════════════════════════════════════════
    // SUPPORTING CLASSES (for demonstrating deep copy)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Author information - a reference type to demonstrate shallow vs deep copy.
    /// </summary>
    public class Author
    {
        public string Name { get; set; }
        public string Email { get; set; }

        public Author(string name, string email)
        {
            Name = name;
            Email = email;
        }

        public Author Clone()
        {
            return new Author(Name, Email);
        }

        public override string ToString() => $"{Name} &lt;{Email}>";
    }

    /// <summary>
    /// Document metadata.
    /// </summary>
    public class Metadata
    {
        public DateTime CreatedAt { get; set; }
        public DateTime ModifiedAt { get; set; }
        public string Version { get; set; }
        public List&lt;string> Tags { get; set; }

        public Metadata()
        {
            CreatedAt = DateTime.Now;
            ModifiedAt = DateTime.Now;
            Version = "1.0";
            Tags = new List&lt;string>();
        }

        public Metadata Clone()
        {
            return new Metadata
            {
                CreatedAt = CreatedAt,
                ModifiedAt = DateTime.Now,  // Update modified time on clone
                Version = Version,
                Tags = new List&lt;string>(Tags)  // Create new list with same items
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE PROTOTYPES
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Report Document - a complex document with nested objects.
    /// </summary>
    public class ReportDocument : IDocumentPrototype
    {
        public string Title { get; set; }
        public string Content { get; set; }
        public Author Author { get; set; }
        public Metadata Metadata { get; set; }
        public List&lt;string> Sections { get; set; }
        public Dictionary&lt;string, string> Variables { get; set; }

        public ReportDocument()
        {
            Title = "";
            Content = "";
            Author = new Author("Unknown", "unknown@example.com");
            Metadata = new Metadata();
            Sections = new List&lt;string>();
            Variables = new Dictionary&lt;string, string>();
        }

        /// <summary>
        /// Shallow Clone - shares references with original.
        /// </summary>
        public IDocumentPrototype Clone()
        {
            Console.WriteLine("    📋 Performing SHALLOW clone...");
            // MemberwiseClone creates a shallow copy
            return (ReportDocument)this.MemberwiseClone();
        }

        /// <summary>
        /// Deep Clone - creates independent copy of all nested objects.
        /// </summary>
        public IDocumentPrototype DeepClone()
        {
            Console.WriteLine("    📋 Performing DEEP clone...");
            
            var clone = new ReportDocument
            {
                Title = this.Title + " (Copy)",
                Content = this.Content,
                Author = this.Author.Clone(),  // Clone nested object
                Metadata = this.Metadata.Clone(),  // Clone nested object
                Sections = new List&lt;string>(this.Sections),  // New list
                Variables = new Dictionary&lt;string, string>(this.Variables)  // New dict
            };

            return clone;
        }

        public void Display()
        {
            Console.WriteLine("\n  ┌────────────────────────────────────────────┐");
            Console.WriteLine($"  │ 📄 {Title,-38} │");
            Console.WriteLine("  ├────────────────────────────────────────────┤");
            Console.WriteLine($"  │ Author:   {Author,-31} │");
            Console.WriteLine($"  │ Created:  {Metadata.CreatedAt:yyyy-MM-dd HH:mm:ss,-20} │");
            Console.WriteLine($"  │ Modified: {Metadata.ModifiedAt:yyyy-MM-dd HH:mm:ss,-20} │");
            Console.WriteLine($"  │ Version:  {Metadata.Version,-31} │");
            Console.WriteLine("  ├────────────────────────────────────────────┤");
            Console.WriteLine($"  │ Content: {Content.Substring(0, Math.Min(32, Content.Length)),-32} │");
            Console.WriteLine("  ├────────────────────────────────────────────┤");
            Console.WriteLine("  │ Sections:                                  │");
            foreach (var section in Sections)
            {
                Console.WriteLine($"  │   • {section,-37} │");
            }
            Console.WriteLine("  ├────────────────────────────────────────────┤");
            Console.WriteLine($"  │ Object HashCode: {GetHashCode(),-24} │");
            Console.WriteLine($"  │ Author HashCode: {Author.GetHashCode(),-24} │");
            Console.WriteLine("  └────────────────────────────────────────────┘");
        }
    }

    /// <summary>
    /// Spreadsheet Document - demonstrates another prototype type.
    /// </summary>
    public class SpreadsheetDocument : IDocumentPrototype
    {
        public string Name { get; set; }
        public int Rows { get; set; }
        public int Columns { get; set; }
        public string[,] Data { get; set; }
        public Author Author { get; set; }
        public List&lt;string> Formulas { get; set; }

        public SpreadsheetDocument(int rows, int columns)
        {
            Name = "Untitled Spreadsheet";
            Rows = rows;
            Columns = columns;
            Data = new string[rows, columns];
            Author = new Author("Unknown", "unknown@example.com");
            Formulas = new List&lt;string>();
            
            // Initialize with empty cells
            for (int i = 0; i &lt; rows; i++)
                for (int j = 0; j &lt; columns; j++)
                    Data[i, j] = "";
        }

        public IDocumentPrototype Clone()
        {
            Console.WriteLine("    📊 Performing SHALLOW clone of spreadsheet...");
            return (SpreadsheetDocument)this.MemberwiseClone();
        }

        public IDocumentPrototype DeepClone()
        {
            Console.WriteLine("    📊 Performing DEEP clone of spreadsheet...");
            
            var clone = new SpreadsheetDocument(Rows, Columns)
            {
                Name = this.Name + " (Copy)",
                Author = this.Author.Clone(),
                Formulas = new List&lt;string>(this.Formulas)
            };

            // Deep copy the 2D array
            for (int i = 0; i &lt; Rows; i++)
                for (int j = 0; j &lt; Columns; j++)
                    clone.Data[i, j] = this.Data[i, j];

            return clone;
        }

        public void Display()
        {
            Console.WriteLine($"\n  📊 Spreadsheet: {Name}");
            Console.WriteLine($"     Size: {Rows}x{Columns}, Author: {Author}");
            Console.WriteLine($"     Formulas: {Formulas.Count}");
            Console.WriteLine($"     Object HashCode: {GetHashCode()}");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PROTOTYPE REGISTRY (Optional - caches prototypes)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// A registry that stores pre-configured prototypes for quick cloning.
    /// </summary>
    public class DocumentRegistry
    {
        private readonly Dictionary&lt;string, IDocumentPrototype> _prototypes = new();

        public void RegisterPrototype(string key, IDocumentPrototype prototype)
        {
            _prototypes[key] = prototype;
            Console.WriteLine($"  ✅ Registered prototype: '{key}'");
        }

        public IDocumentPrototype CreateClone(string key, bool deep = true)
        {
            if (!_prototypes.ContainsKey(key))
            {
                throw new ArgumentException($"Prototype '{key}' not found");
            }

            Console.WriteLine($"\n  🔄 Creating clone from prototype '{key}':");
            return deep ? _prototypes[key].DeepClone() : _prototypes[key].Clone();
        }

        public void ListPrototypes()
        {
            Console.WriteLine("\n  📚 Registered Prototypes:");
            foreach (var key in _prototypes.Keys)
            {
                Console.WriteLine($"     • {key}");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT CODE
    // ═══════════════════════════════════════════════════════════════
    
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("╔════════════════════════════════════════════╗");
            Console.WriteLine("║        PROTOTYPE PATTERN DEMO              ║");
            Console.WriteLine("║        Document Cloning System             ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Shallow vs Deep Clone
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DEMO 1: Shallow vs Deep Clone");
            Console.WriteLine("═══════════════════════════════════════════════");

            // Create original document
            var original = new ReportDocument
            {
                Title = "Q4 Financial Report",
                Content = "This report covers financial performance for Q4 2025...",
                Author = new Author("Jane Smith", "jane@company.com"),
                Sections = { "Executive Summary", "Revenue Analysis", "Expenses", "Projections" },
                Variables = { { "year", "2025" }, { "quarter", "Q4" } }
            };
            original.Metadata.Tags.AddRange(new[] { "finance", "quarterly", "confidential" });

            Console.WriteLine("\n  📄 ORIGINAL DOCUMENT:");
            original.Display();

            // Create shallow clone
            Console.WriteLine("\n  ─────────────────────────────────────────────");
            Console.WriteLine("  Creating SHALLOW clone...");
            var shallowClone = (ReportDocument)original.Clone();
            shallowClone.Title = "Shallow Clone Title";
            
            Console.WriteLine("\n  📄 SHALLOW CLONE (after changing title):");
            shallowClone.Display();

            // Modify the author in shallow clone - affects original!
            shallowClone.Author.Name = "MODIFIED AUTHOR";
            Console.WriteLine("\n  ⚠️  Modified Author.Name in shallow clone...");
            Console.WriteLine("\n  📄 ORIGINAL (notice Author changed!):");
            original.Display();

            // Reset for deep clone demo
            original.Author.Name = "Jane Smith";

            // Create deep clone
            Console.WriteLine("\n  ─────────────────────────────────────────────");
            Console.WriteLine("  Creating DEEP clone...");
            var deepClone = (ReportDocument)original.DeepClone();
            
            Console.WriteLine("\n  📄 DEEP CLONE:");
            deepClone.Display();

            // Modify the author in deep clone - does NOT affect original
            deepClone.Author.Name = "MODIFIED AUTHOR";
            Console.WriteLine("\n  ✅ Modified Author.Name in deep clone...");
            Console.WriteLine("\n  📄 ORIGINAL (Author unchanged!):");
            original.Display();

            // ─────────────────────────────────────────────
            // Demo 2: Prototype Registry
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DEMO 2: Prototype Registry");
            Console.WriteLine("═══════════════════════════════════════════════");

            var registry = new DocumentRegistry();

            // Create and register template prototypes
            var monthlyReportTemplate = new ReportDocument
            {
                Title = "Monthly Report Template",
                Content = "[Month] [Year] Performance Report",
                Author = new Author("Report System", "reports@company.com"),
                Sections = { "Summary", "KPIs", "Highlights", "Action Items" }
            };

            var budgetTemplate = new SpreadsheetDocument(100, 20)
            {
                Name = "Budget Template",
                Author = new Author("Finance Dept", "finance@company.com")
            };
            budgetTemplate.Formulas.Add("=SUM(B2:B100)");
            budgetTemplate.Formulas.Add("=AVERAGE(C2:C100)");
            budgetTemplate.Data[0, 0] = "Category";
            budgetTemplate.Data[0, 1] = "Budget";
            budgetTemplate.Data[0, 2] = "Actual";

            registry.RegisterPrototype("monthly-report", monthlyReportTemplate);
            registry.RegisterPrototype("budget-spreadsheet", budgetTemplate);
            registry.ListPrototypes();

            // Clone from registry
            var januaryReport = (ReportDocument)registry.CreateClone("monthly-report");
            januaryReport.Title = "January 2026 Report";
            januaryReport.Display();

            var q1Budget = (SpreadsheetDocument)registry.CreateClone("budget-spreadsheet");
            q1Budget.Name = "Q1 2026 Budget";
            q1Budget.Display();

            // ─────────────────────────────────────────────
            // Demo 3: Performance Comparison
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DEMO 3: Clone vs New (Performance Concept)");
            Console.WriteLine("═══════════════════════════════════════════════");

            var expensivePrototype = new SpreadsheetDocument(1000, 50)
            {
                Name = "Large Data Template"
            };
            
            // Simulate expensive initialization
            for (int i = 0; i &lt; 1000; i++)
                for (int j = 0; j &lt; 50; j++)
                    expensivePrototype.Data[i, j] = $"Data_{i}_{j}";

            Console.WriteLine("\n  💡 Instead of creating new complex objects,");
            Console.WriteLine("     we clone pre-configured prototypes:");
            
            var clone1 = expensivePrototype.DeepClone();
            var clone2 = expensivePrototype.DeepClone();
            
            Console.WriteLine("\n  ✅ Created 2 clones from expensive prototype");
            Console.WriteLine($"     Each clone has {1000 * 50:N0} pre-filled cells!");

            Console.WriteLine("\n✨ Demo completed! Press any key to exit...");
            Console.ReadKey();
        }
    }
}
```

### Console Output

```
╔════════════════════════════════════════════╗
║        PROTOTYPE PATTERN DEMO              ║
║        Document Cloning System             ║
╚════════════════════════════════════════════╝

═══════════════════════════════════════════════
  DEMO 1: Shallow vs Deep Clone
═══════════════════════════════════════════════

  📄 ORIGINAL DOCUMENT:

  ┌────────────────────────────────────────────┐
  │ 📄 Q4 Financial Report                     │
  ├────────────────────────────────────────────┤
  │ Author:   Jane Smith &lt;jane@company.com>    │
  │ Created:  2026-01-30 10:30:00              │
  │ Modified: 2026-01-30 10:30:00              │
  │ Version:  1.0                              │
  ├────────────────────────────────────────────┤
  │ Content: This report covers financial per  │
  ├────────────────────────────────────────────┤
  │ Sections:                                  │
  │   • Executive Summary                      │
  │   • Revenue Analysis                       │
  │   • Expenses                               │
  │   • Projections                            │
  ├────────────────────────────────────────────┤
  │ Object HashCode: 43942917                  │
  │ Author HashCode: 59941933                  │
  └────────────────────────────────────────────┘

  ─────────────────────────────────────────────
  Creating SHALLOW clone...
    📋 Performing SHALLOW clone...

  ⚠️  Modified Author.Name in shallow clone...

  📄 ORIGINAL (notice Author changed!):
  ...
  │ Author:   MODIFIED AUTHOR &lt;jane@company.com>   │  ← Changed!
  ...
```

---

## Real-World Use Cases

| Domain | Example |
|--------|---------|
| **Game Development** | Cloning enemy units, projectiles, terrain objects |
| **Document Editors** | Copying slides, pages, or formatting |
| **CAD Applications** | Duplicating shapes, components, assemblies |
| **Database Records** | Creating variations of template records |
| **Configuration** | Cloning default settings as starting point |
| **Testing** | Creating test fixtures from prototype objects |

---

## When to Use

✅ **Use Prototype when:**

- Object creation is more expensive than cloning
- You need to avoid subclasses of factories (unlike Factory Method)
- Classes to instantiate are specified at runtime
- Objects have only a few different combinations of state
- You want to keep configurations as prototypes

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Simple Objects** - If objects are cheap to create, cloning adds overhead

2. **Circular References** - Deep cloning with circular references requires special handling

3. **Objects with External Resources** - File handles, network connections can't be cloned directly

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Using MemberwiseClone for objects with reference types
public object Clone()
{
    return MemberwiseClone();  // Shares references!
}

// ✅ GOOD: Implement proper deep clone
public object DeepClone()
{
    var clone = (MyClass)MemberwiseClone();
    clone.NestedObject = NestedObject.Clone();  // Clone references too
    clone.List = new List&lt;string>(List);
    return clone;
}
```

```csharp
// ❌ BAD: Forgetting to clone collections
clone.Items = original.Items;  // Both point to same list!

// ✅ GOOD: Create new collections
clone.Items = new List&lt;Item>(original.Items.Select(i => i.Clone()));
```

```csharp
// ❌ BAD: Not updating metadata on clone
public IPrototype Clone()
{
    var clone = DeepClone();
    // Clone still has original's CreatedAt timestamp
    return clone;
}

// ✅ GOOD: Update relevant metadata
public IPrototype Clone()
{
    var clone = DeepClone();
    clone.CreatedAt = DateTime.Now;
    clone.Id = Guid.NewGuid();  // New unique ID
    return clone;
}
```

---

## C# Cloning Options

| Method | Type | Notes |
|--------|------|-------|
| `MemberwiseClone()` | Shallow | Built-in, protected method |
| `ICloneable.Clone()` | Ambiguous | .NET interface, unclear if shallow/deep |
| Manual Copy | Deep | Full control, most work |
| Serialization | Deep | Works with `[Serializable]`, slower |
| JSON/Binary | Deep | Using JsonSerializer or BinaryFormatter |

### Serialization-Based Deep Clone

```csharp
public T DeepClone&lt;T>(T obj)
{
    var json = JsonSerializer.Serialize(obj);
    return JsonSerializer.Deserialize&lt;T>(json)!;
}
```

---

## Key Takeaways

- 🎯 **Independence from Classes**: Clone without knowing concrete types
- ⚡ **Performance**: Cloning can be faster than construction
- 📋 **Prototype Registry**: Store and retrieve pre-built configurations
- ⚠️ **Shallow vs Deep**: Understand the difference for correct behavior
- 🔄 **Alternative to Subclassing**: Reduce factory hierarchies

---

## Related Patterns

- [Factory Method](01-factory-method.md) - Alternative creational pattern
- [Abstract Factory](02-abstract-factory.md) - Can store prototypes
- [Composite](../structural/03-composite.md) - Cloning complex trees
- [Memento](../behavioral/05-memento.md) - Can use cloning for state snapshots
