# Decorator Pattern

[← Back to Structural Patterns](/design-patterns/structural/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Decorator** is a structural design pattern that lets you attach new behaviors to objects by placing these objects inside special wrapper objects that contain the behaviors.

---

## Problem

You're working on a notification library. You start with a `Notifier` class that sends emails. Later, users want SMS, Facebook, and Slack notifications too. Then they want combinations: SMS + Slack, Email + Facebook, etc.

Creating subclasses for each combination leads to exponential growth of classes.

---

## Solution

The Decorator pattern suggests wrapping objects in special wrapper objects. The wrapper contains the same interface and delegates work to the wrapped object, but can execute something before or after.

```
        ┌─────────────────┐
        │  &lt;&lt;interface>>  │
        │   IComponent    │
        │─────────────────│
        │ + Operation()   │
        └────────┬────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
┌────┴─────┐          ┌──────┴──────┐
│Concrete  │          │  Decorator  │
│Component │          │─────────────│
└──────────┘          │- wrapped    │──────► IComponent
                      │+ Operation()│
                      └──────┬──────┘
                             │
               ┌─────────────┼─────────────┐
               │             │             │
          ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
          │DecoratorA   │DecoratorB   │DecoratorC
          └─────────┘   └─────────┘   └─────────┘
```

---

## Structure

1. **Component** - Declares the common interface
2. **Concrete Component** - Class being wrapped
3. **Base Decorator** - Has reference to wrapped object, delegates to it
4. **Concrete Decorators** - Add behaviors before/after delegating

---

## C# Implementation

### Full Console Example: Coffee Shop Order System

```csharp
using System;
using System.Collections.Generic;

namespace DecoratorPattern
{
    // ═══════════════════════════════════════════════════════════════
    // COMPONENT INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    public interface ICoffee
    {
        string GetDescription();
        decimal GetCost();
        int GetCalories();
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE COMPONENTS (Base coffees)
    // ═══════════════════════════════════════════════════════════════
    
    public class Espresso : ICoffee
    {
        public string GetDescription() => "Espresso";
        public decimal GetCost() => 2.00m;
        public int GetCalories() => 5;
    }

    public class Americano : ICoffee
    {
        public string GetDescription() => "Americano";
        public decimal GetCost() => 2.50m;
        public int GetCalories() => 10;
    }

    public class Latte : ICoffee
    {
        public string GetDescription() => "Latte";
        public decimal GetCost() => 3.50m;
        public int GetCalories() => 120;
    }

    public class Cappuccino : ICoffee
    {
        public string GetDescription() => "Cappuccino";
        public decimal GetCost() => 3.75m;
        public int GetCalories() => 100;
    }

    // ═══════════════════════════════════════════════════════════════
    // BASE DECORATOR
    // ═══════════════════════════════════════════════════════════════
    
    public abstract class CoffeeDecorator : ICoffee
    {
        protected readonly ICoffee _coffee;

        protected CoffeeDecorator(ICoffee coffee)
        {
            _coffee = coffee;
        }

        public virtual string GetDescription() => _coffee.GetDescription();
        public virtual decimal GetCost() => _coffee.GetCost();
        public virtual int GetCalories() => _coffee.GetCalories();
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE DECORATORS (Add-ons)
    // ═══════════════════════════════════════════════════════════════
    
    public class MilkDecorator : CoffeeDecorator
    {
        public MilkDecorator(ICoffee coffee) : base(coffee) { }

        public override string GetDescription() => _coffee.GetDescription() + ", Milk";
        public override decimal GetCost() => _coffee.GetCost() + 0.50m;
        public override int GetCalories() => _coffee.GetCalories() + 60;
    }

    public class WhippedCreamDecorator : CoffeeDecorator
    {
        public WhippedCreamDecorator(ICoffee coffee) : base(coffee) { }

        public override string GetDescription() => _coffee.GetDescription() + ", Whipped Cream";
        public override decimal GetCost() => _coffee.GetCost() + 0.75m;
        public override int GetCalories() => _coffee.GetCalories() + 100;
    }

    public class CaramelDecorator : CoffeeDecorator
    {
        public CaramelDecorator(ICoffee coffee) : base(coffee) { }

        public override string GetDescription() => _coffee.GetDescription() + ", Caramel";
        public override decimal GetCost() => _coffee.GetCost() + 0.60m;
        public override int GetCalories() => _coffee.GetCalories() + 50;
    }

    public class VanillaDecorator : CoffeeDecorator
    {
        public VanillaDecorator(ICoffee coffee) : base(coffee) { }

        public override string GetDescription() => _coffee.GetDescription() + ", Vanilla";
        public override decimal GetCost() => _coffee.GetCost() + 0.55m;
        public override int GetCalories() => _coffee.GetCalories() + 30;
    }

    public class ExtraShotDecorator : CoffeeDecorator
    {
        public ExtraShotDecorator(ICoffee coffee) : base(coffee) { }

        public override string GetDescription() => _coffee.GetDescription() + ", Extra Shot";
        public override decimal GetCost() => _coffee.GetCost() + 0.80m;
        public override int GetCalories() => _coffee.GetCalories() + 5;
    }

    public class OatMilkDecorator : CoffeeDecorator
    {
        public OatMilkDecorator(ICoffee coffee) : base(coffee) { }

        public override string GetDescription() => _coffee.GetDescription() + ", Oat Milk";
        public override decimal GetCost() => _coffee.GetCost() + 0.70m;
        public override int GetCalories() => _coffee.GetCalories() + 45;
    }

    // ═══════════════════════════════════════════════════════════════
    // EXTENDED EXAMPLE: Stream Decorators (Real-world C# pattern)
    // ═══════════════════════════════════════════════════════════════
    
    public interface IDataSource
    {
        void WriteData(string data);
        string ReadData();
    }

    public class FileDataSource : IDataSource
    {
        private readonly string _filename;
        private string _content = "";

        public FileDataSource(string filename)
        {
            _filename = filename;
        }

        public void WriteData(string data)
        {
            _content = data;
            Console.WriteLine($"    [File] Writing to {_filename}: {data.Length} chars");
        }

        public string ReadData()
        {
            Console.WriteLine($"    [File] Reading from {_filename}");
            return _content;
        }
    }

    public abstract class DataSourceDecorator : IDataSource
    {
        protected readonly IDataSource _wrappee;

        protected DataSourceDecorator(IDataSource source)
        {
            _wrappee = source;
        }

        public virtual void WriteData(string data) => _wrappee.WriteData(data);
        public virtual string ReadData() => _wrappee.ReadData();
    }

    public class EncryptionDecorator : DataSourceDecorator
    {
        public EncryptionDecorator(IDataSource source) : base(source) { }

        public override void WriteData(string data)
        {
            // Simple "encryption" for demo (reverse + shift)
            var encrypted = Encrypt(data);
            Console.WriteLine($"    [Encryption] Encrypted data: {encrypted}");
            _wrappee.WriteData(encrypted);
        }

        public override string ReadData()
        {
            var data = _wrappee.ReadData();
            var decrypted = Decrypt(data);
            Console.WriteLine($"    [Encryption] Decrypted data: {decrypted}");
            return decrypted;
        }

        private string Encrypt(string data) => Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(data));
        private string Decrypt(string data) => System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(data));
    }

    public class CompressionDecorator : DataSourceDecorator
    {
        public CompressionDecorator(IDataSource source) : base(source) { }

        public override void WriteData(string data)
        {
            Console.WriteLine($"    [Compression] Original size: {data.Length} chars");
            // Simulated compression (in real code, use GZip)
            var compressed = $"[COMPRESSED:{data.Length}]{data[..Math.Min(10, data.Length)]}...";
            Console.WriteLine($"    [Compression] Compressed representation");
            _wrappee.WriteData(data); // Store original for demo
        }

        public override string ReadData()
        {
            var data = _wrappee.ReadData();
            Console.WriteLine($"    [Compression] Decompressed data");
            return data;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT CODE
    // ═══════════════════════════════════════════════════════════════
    
    class Program
    {
        static void PrintOrder(ICoffee coffee, int orderNum)
        {
            Console.WriteLine($"\n  Order #{orderNum}:");
            Console.WriteLine($"  ┌──────────────────────────────────────────┐");
            Console.WriteLine($"  │ ☕ {coffee.GetDescription(),-38} │");
            Console.WriteLine($"  ├──────────────────────────────────────────┤");
            Console.WriteLine($"  │ Price:    ${coffee.GetCost(),-30:F2} │");
            Console.WriteLine($"  │ Calories: {coffee.GetCalories(),-31} │");
            Console.WriteLine($"  └──────────────────────────────────────────┘");
        }

        static void Main(string[] args)
        {
            Console.WriteLine("╔════════════════════════════════════════════╗");
            Console.WriteLine("║        DECORATOR PATTERN DEMO              ║");
            Console.WriteLine("║        Coffee Shop & Data Streams          ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Simple Coffee Orders
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  COFFEE SHOP ORDERS");
            Console.WriteLine("═══════════════════════════════════════════════");

            // Plain espresso
            ICoffee order1 = new Espresso();
            PrintOrder(order1, 1);

            // Latte with vanilla
            ICoffee order2 = new Latte();
            order2 = new VanillaDecorator(order2);
            PrintOrder(order2, 2);

            // Cappuccino with caramel and whipped cream
            ICoffee order3 = new Cappuccino();
            order3 = new CaramelDecorator(order3);
            order3 = new WhippedCreamDecorator(order3);
            PrintOrder(order3, 3);

            // Complex order: Americano with double shot, oat milk, caramel
            ICoffee order4 = new Americano();
            order4 = new ExtraShotDecorator(order4);
            order4 = new ExtraShotDecorator(order4);  // Double shot!
            order4 = new OatMilkDecorator(order4);
            order4 = new CaramelDecorator(order4);
            PrintOrder(order4, 4);

            // ─────────────────────────────────────────────
            // Demo 2: Data Source Decorators
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DATA SOURCE WITH ENCRYPTION & COMPRESSION");
            Console.WriteLine("═══════════════════════════════════════════════");

            Console.WriteLine("\n  📝 Writing data with decorators:\n");
            
            IDataSource source = new FileDataSource("data.txt");
            source = new CompressionDecorator(source);
            source = new EncryptionDecorator(source);

            source.WriteData("This is sensitive data that needs protection!");

            Console.WriteLine("\n  📖 Reading data with decorators:\n");
            string result = source.ReadData();
            Console.WriteLine($"\n  Final result: {result}");

            // ─────────────────────────────────────────────
            // Demo 3: Benefits visualization
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DECORATOR PATTERN BENEFITS");
            Console.WriteLine("═══════════════════════════════════════════════");

            Console.WriteLine(@"
  Without Decorator (Class Explosion):
  ────────────────────────────────────
  • EspressoWithMilk
  • EspressoWithMilkAndCaramel
  • EspressoWithMilkAndCaramelAndWhippedCream
  • LatteWithVanilla
  • LatteWithVanillaAndExtraShot
  ... (dozens more combinations!)

  With Decorator (Composition):
  ────────────────────────────────────
  • 4 base coffees
  • 6 decorators
  = Unlimited combinations!

  new WhippedCreamDecorator(
      new CaramelDecorator(
          new ExtraShotDecorator(
              new Espresso())));
");

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
| **C# Streams** | BufferedStream, GZipStream wrapping FileStream |
| **UI Components** | ScrollableDecorator, BorderDecorator |
| **Middleware** | Logging, authentication, caching wrappers |
| **Data Processing** | Encryption, compression, validation |
| **E-commerce** | Discount decorators, gift wrapping |

---

## When to Use

✅ **Use Decorator when:**

- You need to add responsibilities dynamically and transparently
- You can't extend via inheritance (sealed class, too many combinations)
- You want to avoid subclass explosion from combinations

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Order Matters Significantly** - Decorator order affects behavior; can be confusing
2. **Simple Single Extension** - If only one extension needed, inheritance might be simpler

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Decorator knows concrete type
public class BadDecorator : CoffeeDecorator
{
    public override decimal GetCost()
    {
        if (_coffee is Espresso)  // Breaks Open/Closed principle!
            return _coffee.GetCost() + 0.25m;
        return _coffee.GetCost() + 0.50m;
    }
}
```

---

## Key Takeaways

- 🎁 **Wrapping**: Decorators wrap objects to add behavior
- 📐 **Same Interface**: Decorator and component share interface
- 🔗 **Stackable**: Multiple decorators can be combined
- 🏃 **Runtime Flexibility**: Add/remove behaviors at runtime

---

## Related Patterns

- [Composite](/design-patterns/structural/03-composite.md) - Similar recursive structure
- [Adapter](/design-patterns/structural/01-adapter.md) - Changes interface; Decorator adds behavior
- [Proxy](/design-patterns/structural/07-proxy.md) - Controls access; Decorator adds features
- [Strategy](/design-patterns/behavioral/08-strategy.md) - Changes internals; Decorator wraps externally
