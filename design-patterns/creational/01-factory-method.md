# Factory Method Pattern

[← Back to Creational Patterns](/design-patterns/creational/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Factory Method** is a creational design pattern that provides an interface for creating objects in a superclass, but allows subclasses to alter the type of objects that will be created.

---

## Problem

Imagine you're building a logistics management application. The first version of your app can only handle transportation by trucks, so most of your code lives inside the `Truck` class.

Later, your app becomes popular and you receive requests to incorporate sea logistics. Great news, right? But the code is already coupled to the `Truck` class. Adding `Ship` would require changes throughout the entire codebase. Moreover, adding another transportation type later would require all these changes again.

---

## Solution

The Factory Method pattern suggests replacing direct object construction calls (using `new`) with calls to a special *factory method*. Objects are still created via `new`, but it's called from within the factory method.

Objects returned by a factory method are often referred to as *products*.

```
┌───────────────────────────────────────────────────────────────┐
│                        Creator                                │
│  ─────────────────────────────────────────────────────────   │
│  + SomeOperation()                                            │
│  + CreateProduct(): IProduct  ◄── Factory Method (abstract)   │
└───────────────────────────────────────────────────────────────┘
                              ▲
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
┌─────────────────────┐             ┌─────────────────────┐
│  ConcreteCreatorA   │             │  ConcreteCreatorB   │
│  ─────────────────  │             │  ─────────────────  │
│  + CreateProduct()  │             │  + CreateProduct()  │
│    returns          │             │    returns          │
│    ConcreteProductA │             │    ConcreteProductB │
└─────────────────────┘             └─────────────────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────┐             ┌─────────────────────┐
│ ConcreteProductA    │             │ ConcreteProductB    │
│ implements IProduct │             │ implements IProduct │
└─────────────────────┘             └─────────────────────┘
```

---

## Structure

1. **Product (IProduct)** - Declares the interface common to all objects that can be produced by the creator
2. **Concrete Products** - Different implementations of the product interface
3. **Creator** - Declares the factory method that returns new product objects
4. **Concrete Creators** - Override the base factory method to return a different type of product

---

## C# Implementation

### Full Console Example: Document Creation System

```csharp
using System;

namespace FactoryMethodPattern
{
    // ═══════════════════════════════════════════════════════════════
    // PRODUCT INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Product interface declares operations that all concrete products must implement.
    /// </summary>
    public interface IDocument
    {
        string GetDocumentType();
        void Open();
        void Save();
        string GetContent();
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE PRODUCTS
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// PDF Document - A concrete implementation of IDocument.
    /// </summary>
    public class PdfDocument : IDocument
    {
        private string _content = "";

        public string GetDocumentType() => "PDF Document";

        public void Open()
        {
            Console.WriteLine("  📄 Opening PDF document with Adobe Reader...");
            _content = "PDF content loaded from file";
        }

        public void Save()
        {
            Console.WriteLine("  💾 Saving PDF with compression and encryption...");
        }

        public string GetContent() => _content;
    }

    /// <summary>
    /// Word Document - A concrete implementation of IDocument.
    /// </summary>
    public class WordDocument : IDocument
    {
        private string _content = "";

        public string GetDocumentType() => "Word Document";

        public void Open()
        {
            Console.WriteLine("  📝 Opening Word document with Microsoft Word...");
            _content = "Word content loaded from .docx file";
        }

        public void Save()
        {
            Console.WriteLine("  💾 Saving Word document with formatting preserved...");
        }

        public string GetContent() => _content;
    }

    /// <summary>
    /// Excel Spreadsheet - A concrete implementation of IDocument.
    /// </summary>
    public class ExcelDocument : IDocument
    {
        private string _content = "";

        public string GetDocumentType() => "Excel Spreadsheet";

        public void Open()
        {
            Console.WriteLine("  📊 Opening Excel spreadsheet with formulas...");
            _content = "Excel data loaded with 1000 rows";
        }

        public void Save()
        {
            Console.WriteLine("  💾 Saving Excel with recalculated formulas...");
        }

        public string GetContent() => _content;
    }

    // ═══════════════════════════════════════════════════════════════
    // CREATOR (ABSTRACT)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Creator class declares the factory method that returns an IDocument object.
    /// The Creator may also provide a default implementation of the factory method.
    /// </summary>
    public abstract class DocumentCreator
    {
        // Factory Method - subclasses will override this
        public abstract IDocument CreateDocument();

        /// <summary>
        /// The Creator's primary responsibility is NOT creating products.
        /// It usually contains core business logic that relies on Product objects.
        /// </summary>
        public void ProcessDocument()
        {
            // Call the factory method to create a Product object
            IDocument document = CreateDocument();

            // Now use the product
            Console.WriteLine($"\n📋 Processing: {document.GetDocumentType()}");
            Console.WriteLine("─────────────────────────────────────");
            
            document.Open();
            Console.WriteLine($"  📖 Content: {document.GetContent()}");
            document.Save();
            
            Console.WriteLine("─────────────────────────────────────");
            Console.WriteLine("✅ Document processed successfully!\n");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE CREATORS
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Concrete Creator for PDF documents.
    /// </summary>
    public class PdfDocumentCreator : DocumentCreator
    {
        public override IDocument CreateDocument()
        {
            return new PdfDocument();
        }
    }

    /// <summary>
    /// Concrete Creator for Word documents.
    /// </summary>
    public class WordDocumentCreator : DocumentCreator
    {
        public override IDocument CreateDocument()
        {
            return new WordDocument();
        }
    }

    /// <summary>
    /// Concrete Creator for Excel documents.
    /// </summary>
    public class ExcelDocumentCreator : DocumentCreator
    {
        public override IDocument CreateDocument()
        {
            return new ExcelDocument();
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
            Console.WriteLine("║     FACTORY METHOD PATTERN DEMO            ║");
            Console.WriteLine("║     Document Processing System             ║");
            Console.WriteLine("╚════════════════════════════════════════════╝\n");

            // The client code works with creators through the base interface.
            // It doesn't know which concrete creator it's using.
            
            Console.WriteLine("🔹 Processing with PDF Creator:");
            ProcessWithCreator(new PdfDocumentCreator());

            Console.WriteLine("🔹 Processing with Word Creator:");
            ProcessWithCreator(new WordDocumentCreator());

            Console.WriteLine("🔹 Processing with Excel Creator:");
            ProcessWithCreator(new ExcelDocumentCreator());

            // Demonstrate runtime selection
            Console.WriteLine("\n🎯 Runtime Selection Demo:");
            Console.WriteLine("Enter document type (pdf/word/excel): ");
            string? input = Console.ReadLine()?.ToLower() ?? "pdf";
            
            DocumentCreator creator = GetCreatorByType(input);
            creator.ProcessDocument();

            Console.WriteLine("\n✨ Demo completed! Press any key to exit...");
            Console.ReadKey();
        }

        /// <summary>
        /// Client method that works with any creator.
        /// </summary>
        static void ProcessWithCreator(DocumentCreator creator)
        {
            creator.ProcessDocument();
        }

        /// <summary>
        /// Factory of factories - returns appropriate creator based on type.
        /// </summary>
        static DocumentCreator GetCreatorByType(string type)
        {
            return type switch
            {
                "word" => new WordDocumentCreator(),
                "excel" => new ExcelDocumentCreator(),
                _ => new PdfDocumentCreator()
            };
        }
    }
}
```

### Console Output

```
╔════════════════════════════════════════════╗
║     FACTORY METHOD PATTERN DEMO            ║
║     Document Processing System             ║
╚════════════════════════════════════════════╝

🔹 Processing with PDF Creator:

📋 Processing: PDF Document
─────────────────────────────────────
  📄 Opening PDF document with Adobe Reader...
  📖 Content: PDF content loaded from file
  💾 Saving PDF with compression and encryption...
─────────────────────────────────────
✅ Document processed successfully!

🔹 Processing with Word Creator:

📋 Processing: Word Document
─────────────────────────────────────
  📝 Opening Word document with Microsoft Word...
  📖 Content: Word content loaded from .docx file
  💾 Saving Word document with formatting preserved...
─────────────────────────────────────
✅ Document processed successfully!

🔹 Processing with Excel Creator:

📋 Processing: Excel Spreadsheet
─────────────────────────────────────
  📊 Opening Excel spreadsheet with formulas...
  📖 Content: Excel data loaded with 1000 rows
  💾 Saving Excel with recalculated formulas...
─────────────────────────────────────
✅ Document processed successfully!
```

---

## Real-World Use Cases

| Domain | Example |
|--------|---------|
| **UI Frameworks** | Creating platform-specific UI elements (Windows/Mac/Linux buttons) |
| **Logging** | Creating different logger types (File, Console, Database, Cloud) |
| **Database Access** | Creating connections for different databases (SQL Server, PostgreSQL, MongoDB) |
| **Payment Processing** | Creating payment handlers (Credit Card, PayPal, Crypto) |
| **Serialization** | Creating serializers (JSON, XML, Binary, YAML) |
| **Game Development** | Creating different enemy types, weapons, or power-ups |

---

## When to Use

✅ **Use Factory Method when:**

- You don't know beforehand the exact types of objects your code will work with
- You want to provide users of your library/framework a way to extend its internal components
- You want to save system resources by reusing existing objects instead of rebuilding them
- You need to decouple the creation of objects from their usage

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Simple Object Creation** - If you only have one type of product and it won't change, using Factory Method adds unnecessary complexity

2. **No Polymorphism Needed** - If products don't share a common interface or base class, Factory Method provides no benefit

3. **Overengineering** - Creating a factory for every single class leads to class explosion

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Factory method that requires type parameter defeats the purpose
public IDocument CreateDocument(string type)
{
    return type switch
    {
        "pdf" => new PdfDocument(),
        "word" => new WordDocument(),
        _ => throw new ArgumentException()
    };
}

// ✅ GOOD: Each creator handles one product type
public class PdfCreator : DocumentCreator
{
    public override IDocument CreateDocument() => new PdfDocument();
}
```

```csharp
// ❌ BAD: Exposing concrete types to clients
PdfDocument doc = (PdfDocument)creator.CreateDocument();
doc.PdfSpecificMethod(); // Tight coupling!

// ✅ GOOD: Working with abstractions
IDocument doc = creator.CreateDocument();
doc.Open(); // Works with any document type
```

---

## Comparison with Other Patterns

| Pattern | Difference |
|---------|------------|
| **Abstract Factory** | Creates families of related products; Factory Method creates one product |
| **Prototype** | Uses cloning; Factory Method uses inheritance |
| **Builder** | Constructs complex objects step-by-step; Factory Method creates in one step |

---

## Key Takeaways

- 🎯 **Single Responsibility**: Creation logic is moved to a specific class
- 🔌 **Open/Closed Principle**: New product types can be added without modifying existing code
- 🔗 **Loose Coupling**: Client code works with the creator interface, not concrete classes
- 📦 **Encapsulation**: Object creation is encapsulated in factory methods
- ⚡ **Flexibility**: The actual product type is determined at runtime

---

## Related Patterns

- [Abstract Factory](/design-patterns/creational/02-abstract-factory.md) - Often implemented with Factory Methods
- [Prototype](/design-patterns/creational/04-prototype.md) - Alternative creational pattern
- [Template Method](/design-patterns/behavioral/09-template-method.md) - Factory Method is often called within a Template Method
