# Composite Pattern

[← Back to Structural Patterns](/design-patterns/structural/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Composite** is a structural design pattern that lets you compose objects into tree structures and then work with these structures as if they were individual objects.

---

## Problem

Imagine you're building an ordering system where orders can contain products and boxes. A box can contain products and smaller boxes. How do you calculate the total price?

You could try direct approach: unwrap all boxes, go over all products and calculate the total. But this requires knowing the types of objects and nesting levels beforehand.

---

## Solution

The Composite pattern suggests working with products and boxes through a common interface that declares a method for calculating the total price.

For a product, it returns the product's price. For a box, it goes over each item, asks its price, and returns the total.

```
                    ┌─────────────────┐
                    │  &lt;&lt;interface>>  │
                    │   IComponent    │
                    │─────────────────│
                    │ + Operation()   │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                                 │
     ┌──────┴──────┐                  ┌───────┴───────┐
     │    Leaf     │                  │   Composite   │
     │─────────────│                  │───────────────│
     │+ Operation()│                  │- children[]   │
     └─────────────┘                  │+ Operation()  │
                                      │+ Add(IComponent)
                                      │+ Remove(IComponent)
                                      └───────────────┘
                                             │
                                             │ contains
                                             ▼
                                      [IComponent...]
```

---

## Structure

1. **Component** - Declares interface for objects in the composition
2. **Leaf** - Represents end objects with no children (does actual work)
3. **Composite** - Stores child components and implements child-related operations
4. **Client** - Works with all elements through component interface

---

## C# Implementation

### Full Console Example: File System Structure

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

namespace CompositePattern
{
    // ═══════════════════════════════════════════════════════════════
    // COMPONENT INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The base Component interface declares common operations for both
    /// simple and complex objects of a composition.
    /// </summary>
    public interface IFileSystemItem
    {
        string Name { get; }
        long GetSize();
        void Display(string indent = "");
        int GetItemCount();
        IFileSystemItem? Find(string name);
    }

    // ═══════════════════════════════════════════════════════════════
    // LEAF - File
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Leaf represents end objects. A leaf can't have any children.
    /// Usually, Leaf objects do the actual work.
    /// </summary>
    public class File : IFileSystemItem
    {
        public string Name { get; }
        public long Size { get; }
        public string Extension { get; }

        public File(string name, long sizeInBytes)
        {
            Name = name;
            Size = sizeInBytes;
            Extension = System.IO.Path.GetExtension(name);
        }

        public long GetSize() => Size;

        public void Display(string indent = "")
        {
            string icon = Extension switch
            {
                ".txt" => "📄",
                ".pdf" => "📕",
                ".doc" or ".docx" => "📘",
                ".xls" or ".xlsx" => "📗",
                ".jpg" or ".png" or ".gif" => "🖼️",
                ".mp3" or ".wav" => "🎵",
                ".mp4" or ".avi" => "🎬",
                ".zip" or ".rar" => "📦",
                ".exe" => "⚙️",
                ".cs" => "💻",
                _ => "📄"
            };
            Console.WriteLine($"{indent}{icon} {Name} ({FormatSize(Size)})");
        }

        public int GetItemCount() => 1;

        public IFileSystemItem? Find(string name)
        {
            return Name.Equals(name, StringComparison.OrdinalIgnoreCase) ? this : null;
        }

        private string FormatSize(long bytes)
        {
            string[] sizes = { "B", "KB", "MB", "GB", "TB" };
            double len = bytes;
            int order = 0;
            while (len >= 1024 && order &lt; sizes.Length - 1)
            {
                order++;
                len /= 1024;
            }
            return $"{len:0.##} {sizes[order]}";
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPOSITE - Folder
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Composite represents complex components that may have children.
    /// It delegates work to children and aggregates results.
    /// </summary>
    public class Folder : IFileSystemItem
    {
        public string Name { get; }
        private readonly List&lt;IFileSystemItem> _children = new();

        public Folder(string name)
        {
            Name = name;
        }

        public void Add(IFileSystemItem item)
        {
            _children.Add(item);
        }

        public void Remove(IFileSystemItem item)
        {
            _children.Remove(item);
        }

        public IReadOnlyList&lt;IFileSystemItem> Children => _children.AsReadOnly();

        public long GetSize()
        {
            // Recursively calculates size of all children
            return _children.Sum(child => child.GetSize());
        }

        public void Display(string indent = "")
        {
            Console.WriteLine($"{indent}📁 {Name}/ ({FormatSize(GetSize())}, {GetItemCount()} items)");
            foreach (var child in _children)
            {
                child.Display(indent + "  ");
            }
        }

        public int GetItemCount()
        {
            // Count this folder plus all children
            return 1 + _children.Sum(child => child.GetItemCount());
        }

        public IFileSystemItem? Find(string name)
        {
            if (Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                return this;

            foreach (var child in _children)
            {
                var found = child.Find(name);
                if (found != null) return found;
            }
            return null;
        }

        private string FormatSize(long bytes)
        {
            string[] sizes = { "B", "KB", "MB", "GB", "TB" };
            double len = bytes;
            int order = 0;
            while (len >= 1024 && order &lt; sizes.Length - 1)
            {
                order++;
                len /= 1024;
            }
            return $"{len:0.##} {sizes[order]}";
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EXTENDED EXAMPLE: Organization Hierarchy
    // ═══════════════════════════════════════════════════════════════
    
    public interface IEmployee
    {
        string Name { get; }
        string Title { get; }
        decimal Salary { get; }
        decimal GetTotalSalary();
        void Display(string indent = "");
    }

    public class IndividualContributor : IEmployee
    {
        public string Name { get; }
        public string Title { get; }
        public decimal Salary { get; }

        public IndividualContributor(string name, string title, decimal salary)
        {
            Name = name;
            Title = title;
            Salary = salary;
        }

        public decimal GetTotalSalary() => Salary;

        public void Display(string indent = "")
        {
            Console.WriteLine($"{indent}👤 {Name} - {Title} (${Salary:N0})");
        }
    }

    public class Manager : IEmployee
    {
        public string Name { get; }
        public string Title { get; }
        public decimal Salary { get; }
        private readonly List&lt;IEmployee> _subordinates = new();

        public Manager(string name, string title, decimal salary)
        {
            Name = name;
            Title = title;
            Salary = salary;
        }

        public void AddSubordinate(IEmployee employee) => _subordinates.Add(employee);
        public void RemoveSubordinate(IEmployee employee) => _subordinates.Remove(employee);

        public decimal GetTotalSalary()
        {
            return Salary + _subordinates.Sum(s => s.GetTotalSalary());
        }

        public void Display(string indent = "")
        {
            Console.WriteLine($"{indent}👔 {Name} - {Title} (${Salary:N0}) [Team cost: ${GetTotalSalary():N0}]");
            foreach (var sub in _subordinates)
            {
                sub.Display(indent + "  ");
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
            Console.WriteLine("║        COMPOSITE PATTERN DEMO              ║");
            Console.WriteLine("║        Tree Structures                     ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: File System
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  FILE SYSTEM STRUCTURE");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            // Create file system structure
            var root = new Folder("MyProject");
            
            var src = new Folder("src");
            src.Add(new File("Program.cs", 2048));
            src.Add(new File("Utils.cs", 1536));
            
            var models = new Folder("Models");
            models.Add(new File("User.cs", 512));
            models.Add(new File("Product.cs", 768));
            src.Add(models);

            var docs = new Folder("docs");
            docs.Add(new File("README.md", 4096));
            docs.Add(new File("API.pdf", 1048576));

            var images = new Folder("images");
            images.Add(new File("logo.png", 51200));
            images.Add(new File("banner.jpg", 204800));

            root.Add(src);
            root.Add(docs);
            root.Add(images);
            root.Add(new File("project.sln", 1024));
            root.Add(new File(".gitignore", 256));

            // Display the entire structure
            root.Display();

            Console.WriteLine($"\n  📊 Total size: {root.GetSize():N0} bytes");
            Console.WriteLine($"  📊 Total items: {root.GetItemCount()}");

            // Search for a file
            Console.WriteLine("\n  🔍 Searching for 'User.cs'...");
            var found = root.Find("User.cs");
            if (found != null)
            {
                Console.WriteLine($"     Found: ");
                found.Display("     ");
            }

            // ─────────────────────────────────────────────
            // Demo 2: Organization Hierarchy
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  ORGANIZATION HIERARCHY");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            var ceo = new Manager("Alice Johnson", "CEO", 500000);

            var cto = new Manager("Bob Smith", "CTO", 300000);
            cto.AddSubordinate(new Manager("Carol Williams", "Engineering Manager", 180000));
            var engManager = (Manager)cto.GetType().GetMethod("AddSubordinate") != null ? cto : null;
            
            var devTeamLead = new Manager("David Brown", "Team Lead", 150000);
            devTeamLead.AddSubordinate(new IndividualContributor("Eve Davis", "Senior Developer", 120000));
            devTeamLead.AddSubordinate(new IndividualContributor("Frank Miller", "Developer", 90000));
            devTeamLead.AddSubordinate(new IndividualContributor("Grace Wilson", "Junior Developer", 70000));
            cto.AddSubordinate(devTeamLead);

            var cfo = new Manager("Henry Taylor", "CFO", 280000);
            cfo.AddSubordinate(new IndividualContributor("Ivy Anderson", "Accountant", 75000));
            cfo.AddSubordinate(new IndividualContributor("Jack Thomas", "Financial Analyst", 85000));

            ceo.AddSubordinate(cto);
            ceo.AddSubordinate(cfo);

            ceo.Display();

            Console.WriteLine($"\n  💰 Total company salary cost: ${ceo.GetTotalSalary():N0}");

            // ─────────────────────────────────────────────
            // Demo 3: Uniform treatment
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  UNIFORM TREATMENT (Key Benefit)");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            // Client code doesn't need to know if it's a file or folder
            var items = new List&lt;IFileSystemItem>
            {
                new File("single_file.txt", 1024),
                src,  // This is a folder with nested content
                new File("another_file.pdf", 2048)
            };

            Console.WriteLine("  Processing items uniformly (no type checking!):\n");
            foreach (var item in items)
            {
                Console.WriteLine($"  • {item.Name}: {item.GetSize()} bytes, {item.GetItemCount()} item(s)");
            }

            Console.WriteLine("\n✨ Demo completed! Press any key to exit...");
            Console.ReadKey();
        }
    }
}
```

---

## Real-World Use Cases

| Domain | Example |
|--------|---------|
| **File Systems** | Files and directories |
| **UI Components** | Panels containing buttons, other panels |
| **Graphics** | Shapes containing other shapes |
| **Organization Charts** | Employees and departments |
| **Menu Systems** | Menu items and submenus |
| **HTML/XML DOM** | Elements containing other elements |

---

## When to Use

✅ **Use Composite when:**

- You want to represent part-whole hierarchies
- You want clients to treat individual objects and compositions uniformly
- The structure can be represented as a tree

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Flat Structures** - No hierarchical relationship exists
2. **Different Operations** - Leaves and composites need very different interfaces

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Checking types in client code
void Process(IComponent component)
{
    if (component is Leaf leaf)
        leaf.LeafSpecificMethod();
    else if (component is Composite composite)
        foreach (var child in composite.Children)
            Process(child);
}

// ✅ GOOD: Uniform interface
void Process(IComponent component)
{
    component.Operation();  // Works for both leaf and composite
}
```

---

## Key Takeaways

- 🌳 **Tree Structure**: Represents hierarchies naturally
- 🎭 **Uniform Interface**: Treats leaves and composites the same way
- 🔄 **Recursive**: Operations naturally recurse through the tree
- ➕ **Open/Closed**: Add new component types without changing client code

---

## Related Patterns

- [Decorator](/design-patterns/structural/04-decorator.md) - Similar structure, different purpose
- [Iterator](/design-patterns/behavioral/03-iterator.md) - Traverse composite structures
- [Visitor](/design-patterns/behavioral/10-visitor.md) - Apply operations across composite
- [Flyweight](/design-patterns/structural/06-flyweight.md) - Share leaf nodes
