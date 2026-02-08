# Builder Pattern

[← Back to Creational Patterns](/design-patterns/creational/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Builder** is a creational design pattern that lets you construct complex objects step by step. The pattern allows you to produce different types and representations of an object using the same construction code.

---

## Problem

Imagine a complex object that requires laborious, step-by-step initialization of many fields and nested objects. Such initialization code is usually buried inside a monstrous constructor with lots of parameters. Or even worse: scattered all over the client code.

For example, building a `House` object. A simple house needs walls, a floor, a door, windows, and a roof. But what if you want a bigger house with a garage, swimming pool, garden, and smart home system?

The simplest solution is to extend the base `House` class and create subclasses for every configuration. But this leads to a class explosion. Another approach is a giant constructor, but most parameters will be unused most of the time.

---

## Solution

The Builder pattern suggests extracting the object construction code into separate objects called *builders*. The pattern organizes object construction into a set of steps. To create an object, you execute a series of these steps on a builder object.

```
┌───────────────────────────────────────────────────────────────────────┐
│                           Director                                     │
│  ───────────────────────────────────────────────────────────────────  │
│  - builder: IBuilder                                                   │
│  + Construct(): void                                                   │
└───────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ uses
                                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        &lt;&lt;interface>>                                   │
│                          IBuilder                                      │
│  ───────────────────────────────────────────────────────────────────  │
│  + BuildStepA(): void                                                  │
│  + BuildStepB(): void                                                  │
│  + BuildStepC(): void                                                  │
│  + GetResult(): Product                                                │
└───────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
    ┌─────────────────────┐          ┌─────────────────────┐
    │  ConcreteBuilder1   │          │  ConcreteBuilder2   │
    │  ─────────────────  │          │  ─────────────────  │
    │  + BuildStepA()     │          │  + BuildStepA()     │
    │  + BuildStepB()     │          │  + BuildStepB()     │
    │  + BuildStepC()     │          │  + BuildStepC()     │
    │  + GetResult()      │          │  + GetResult()      │
    └─────────────────────┘          └─────────────────────┘
                 │                                 │
                 ▼                                 ▼
           Product1                          Product2
```

---

## Structure

1. **Builder Interface** - Declares product construction steps common to all builders
2. **Concrete Builders** - Provide different implementations of construction steps
3. **Products** - Resulting objects, don't have to share a common interface
4. **Director** - Defines the order to call construction steps (optional)
5. **Client** - Associates builder with director and initiates construction

---

## C# Implementation

### Full Console Example: Computer Builder with Fluent Interface

```csharp
using System;
using System.Collections.Generic;
using System.Text;

namespace BuilderPattern
{
    // ═══════════════════════════════════════════════════════════════
    // PRODUCT
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The complex product we want to build.
    /// </summary>
    public class Computer
    {
        public string CPU { get; set; } = "";
        public string GPU { get; set; } = "";
        public int RAMInGB { get; set; }
        public int StorageInGB { get; set; }
        public string StorageType { get; set; } = "";
        public string Motherboard { get; set; } = "";
        public string PowerSupply { get; set; } = "";
        public string Case { get; set; } = "";
        public string CoolingSystem { get; set; } = "";
        public List&lt;string> Peripherals { get; set; } = new();
        public bool HasWifi { get; set; }
        public bool HasBluetooth { get; set; }
        public string OperatingSystem { get; set; } = "";

        public void DisplaySpecs()
        {
            Console.WriteLine("\n  ┌────────────────────────────────────────────┐");
            Console.WriteLine("  │         COMPUTER SPECIFICATIONS            │");
            Console.WriteLine("  ├────────────────────────────────────────────┤");
            Console.WriteLine($"  │ CPU:          {CPU,-28} │");
            Console.WriteLine($"  │ GPU:          {GPU,-28} │");
            Console.WriteLine($"  │ RAM:          {RAMInGB} GB{"",-24} │");
            Console.WriteLine($"  │ Storage:      {StorageInGB} GB {StorageType,-20} │");
            Console.WriteLine($"  │ Motherboard:  {Motherboard,-28} │");
            Console.WriteLine($"  │ PSU:          {PowerSupply,-28} │");
            Console.WriteLine($"  │ Case:         {Case,-28} │");
            Console.WriteLine($"  │ Cooling:      {CoolingSystem,-28} │");
            Console.WriteLine($"  │ WiFi:         {(HasWifi ? "Yes" : "No"),-28} │");
            Console.WriteLine($"  │ Bluetooth:    {(HasBluetooth ? "Yes" : "No"),-28} │");
            Console.WriteLine($"  │ OS:           {OperatingSystem,-28} │");
            Console.WriteLine("  ├────────────────────────────────────────────┤");
            Console.WriteLine("  │ Peripherals:                               │");
            foreach (var peripheral in Peripherals)
            {
                Console.WriteLine($"  │   • {peripheral,-37} │");
            }
            Console.WriteLine("  └────────────────────────────────────────────┘");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BUILDER INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Builder interface specifies methods for creating parts of a Computer.
    /// Uses fluent interface pattern for method chaining.
    /// </summary>
    public interface IComputerBuilder
    {
        IComputerBuilder SetCPU(string cpu);
        IComputerBuilder SetGPU(string gpu);
        IComputerBuilder SetRAM(int sizeInGB);
        IComputerBuilder SetStorage(int sizeInGB, string type);
        IComputerBuilder SetMotherboard(string motherboard);
        IComputerBuilder SetPowerSupply(string psu);
        IComputerBuilder SetCase(string computerCase);
        IComputerBuilder SetCooling(string cooling);
        IComputerBuilder AddPeripheral(string peripheral);
        IComputerBuilder EnableWifi();
        IComputerBuilder EnableBluetooth();
        IComputerBuilder SetOperatingSystem(string os);
        Computer Build();
        void Reset();
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE BUILDERS
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Standard Computer Builder - builds regular desktop computers.
    /// </summary>
    public class StandardComputerBuilder : IComputerBuilder
    {
        private Computer _computer = new();

        public StandardComputerBuilder()
        {
            Reset();
        }

        public void Reset()
        {
            _computer = new Computer();
        }

        public IComputerBuilder SetCPU(string cpu)
        {
            _computer.CPU = cpu;
            return this;
        }

        public IComputerBuilder SetGPU(string gpu)
        {
            _computer.GPU = gpu;
            return this;
        }

        public IComputerBuilder SetRAM(int sizeInGB)
        {
            _computer.RAMInGB = sizeInGB;
            return this;
        }

        public IComputerBuilder SetStorage(int sizeInGB, string type)
        {
            _computer.StorageInGB = sizeInGB;
            _computer.StorageType = type;
            return this;
        }

        public IComputerBuilder SetMotherboard(string motherboard)
        {
            _computer.Motherboard = motherboard;
            return this;
        }

        public IComputerBuilder SetPowerSupply(string psu)
        {
            _computer.PowerSupply = psu;
            return this;
        }

        public IComputerBuilder SetCase(string computerCase)
        {
            _computer.Case = computerCase;
            return this;
        }

        public IComputerBuilder SetCooling(string cooling)
        {
            _computer.CoolingSystem = cooling;
            return this;
        }

        public IComputerBuilder AddPeripheral(string peripheral)
        {
            _computer.Peripherals.Add(peripheral);
            return this;
        }

        public IComputerBuilder EnableWifi()
        {
            _computer.HasWifi = true;
            return this;
        }

        public IComputerBuilder EnableBluetooth()
        {
            _computer.HasBluetooth = true;
            return this;
        }

        public IComputerBuilder SetOperatingSystem(string os)
        {
            _computer.OperatingSystem = os;
            return this;
        }

        public Computer Build()
        {
            Computer result = _computer;
            Reset();
            return result;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DIRECTOR
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Director defines the order of building steps.
    /// It works with any builder instance that follows the interface.
    /// </summary>
    public class ComputerDirector
    {
        private IComputerBuilder _builder;

        public ComputerDirector(IComputerBuilder builder)
        {
            _builder = builder;
        }

        public void ChangeBuilder(IComputerBuilder builder)
        {
            _builder = builder;
        }

        /// <summary>
        /// Builds a basic office computer.
        /// </summary>
        public Computer BuildOfficeComputer()
        {
            Console.WriteLine("\n  🏢 Building Office Computer...");
            return _builder
                .SetCPU("Intel Core i5-12400")
                .SetGPU("Intel UHD Graphics 730")
                .SetRAM(16)
                .SetStorage(512, "SSD")
                .SetMotherboard("ASUS Prime B660M-A")
                .SetPowerSupply("450W Bronze")
                .SetCase("Generic Mid-Tower")
                .SetCooling("Stock Intel Cooler")
                .EnableWifi()
                .AddPeripheral("Logitech Keyboard")
                .AddPeripheral("Logitech Mouse")
                .AddPeripheral("24\" Dell Monitor")
                .SetOperatingSystem("Windows 11 Pro")
                .Build();
        }

        /// <summary>
        /// Builds a high-end gaming computer.
        /// </summary>
        public Computer BuildGamingComputer()
        {
            Console.WriteLine("\n  🎮 Building Gaming Computer...");
            return _builder
                .SetCPU("AMD Ryzen 9 7950X")
                .SetGPU("NVIDIA RTX 4090")
                .SetRAM(64)
                .SetStorage(2000, "NVMe SSD")
                .SetMotherboard("ASUS ROG Crosshair X670E")
                .SetPowerSupply("1000W Platinum")
                .SetCase("Lian Li O11 Dynamic EVO")
                .SetCooling("Custom Water Cooling Loop")
                .EnableWifi()
                .EnableBluetooth()
                .AddPeripheral("Mechanical RGB Keyboard")
                .AddPeripheral("Gaming Mouse 25600 DPI")
                .AddPeripheral("32\" 4K 144Hz Monitor")
                .AddPeripheral("Gaming Headset 7.1")
                .AddPeripheral("Stream Deck")
                .SetOperatingSystem("Windows 11 Pro")
                .Build();
        }

        /// <summary>
        /// Builds a workstation for professional work.
        /// </summary>
        public Computer BuildWorkstation()
        {
            Console.WriteLine("\n  💼 Building Professional Workstation...");
            return _builder
                .SetCPU("Intel Xeon W-3375")
                .SetGPU("NVIDIA RTX A6000")
                .SetRAM(128)
                .SetStorage(4000, "NVMe RAID")
                .SetMotherboard("ASUS Pro WS W680-ACE")
                .SetPowerSupply("1200W Titanium")
                .SetCase("Fractal Design Define 7 XL")
                .SetCooling("Noctua NH-D15 chromax")
                .EnableWifi()
                .EnableBluetooth()
                .AddPeripheral("Ergonomic Keyboard")
                .AddPeripheral("3D Mouse")
                .AddPeripheral("Dual 32\" 4K Color-Accurate Monitors")
                .AddPeripheral("Graphics Tablet")
                .AddPeripheral("UPS Battery Backup")
                .SetOperatingSystem("Windows 11 Pro for Workstations")
                .Build();
        }

        /// <summary>
        /// Builds a minimal server.
        /// </summary>
        public Computer BuildServer()
        {
            Console.WriteLine("\n  🖥️ Building Server...");
            return _builder
                .SetCPU("AMD EPYC 9654")
                .SetGPU("Integrated ASPEED")
                .SetRAM(256)
                .SetStorage(8000, "NVMe RAID 10")
                .SetMotherboard("Supermicro H12SSL-NT")
                .SetPowerSupply("Redundant 1600W")
                .SetCase("4U Rackmount")
                .SetCooling("Enterprise Cooling System")
                .SetOperatingSystem("Ubuntu Server 22.04 LTS")
                .Build();
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
            Console.WriteLine("║        BUILDER PATTERN DEMO                ║");
            Console.WriteLine("║        Computer Manufacturing              ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // Create a builder and director
            var builder = new StandardComputerBuilder();
            var director = new ComputerDirector(builder);

            // Build predefined configurations using the Director
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  PREDEFINED CONFIGURATIONS (via Director)");
            Console.WriteLine("═══════════════════════════════════════════════");

            var officePC = director.BuildOfficeComputer();
            officePC.DisplaySpecs();

            var gamingPC = director.BuildGamingComputer();
            gamingPC.DisplaySpecs();

            // Build custom configuration without Director
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  CUSTOM CONFIGURATION (Fluent Builder)");
            Console.WriteLine("═══════════════════════════════════════════════");

            Console.WriteLine("\n  🔧 Building Custom Computer...");
            var customPC = new StandardComputerBuilder()
                .SetCPU("AMD Ryzen 7 7800X3D")
                .SetGPU("NVIDIA RTX 4070 Ti")
                .SetRAM(32)
                .SetStorage(1000, "NVMe SSD")
                .SetMotherboard("MSI MAG B650 Tomahawk")
                .SetPowerSupply("750W Gold")
                .SetCase("NZXT H7 Flow")
                .SetCooling("Noctua NH-U12S")
                .EnableWifi()
                .EnableBluetooth()
                .AddPeripheral("Custom Mechanical Keyboard")
                .AddPeripheral("Wireless Gaming Mouse")
                .AddPeripheral("27\" 1440p 165Hz Monitor")
                .SetOperatingSystem("Dual Boot: Windows 11 / Arch Linux")
                .Build();
            
            customPC.DisplaySpecs();

            // Show Director building different types
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  WORKSTATION & SERVER BUILDS");
            Console.WriteLine("═══════════════════════════════════════════════");

            var workstation = director.BuildWorkstation();
            workstation.DisplaySpecs();

            var server = director.BuildServer();
            server.DisplaySpecs();

            Console.WriteLine("\n✨ Demo completed! Press any key to exit...");
            Console.ReadKey();
        }
    }
}
```

### Console Output

```
╔════════════════════════════════════════════╗
║        BUILDER PATTERN DEMO                ║
║        Computer Manufacturing              ║
╚════════════════════════════════════════════╝

═══════════════════════════════════════════════
  PREDEFINED CONFIGURATIONS (via Director)
═══════════════════════════════════════════════

  🏢 Building Office Computer...

  ┌────────────────────────────────────────────┐
  │         COMPUTER SPECIFICATIONS            │
  ├────────────────────────────────────────────┤
  │ CPU:          Intel Core i5-12400          │
  │ GPU:          Intel UHD Graphics 730       │
  │ RAM:          16 GB                        │
  │ Storage:      512 GB SSD                   │
  │ Motherboard:  ASUS Prime B660M-A           │
  │ PSU:          450W Bronze                  │
  │ Case:         Generic Mid-Tower            │
  │ Cooling:      Stock Intel Cooler           │
  │ WiFi:         Yes                          │
  │ Bluetooth:    No                           │
  │ OS:           Windows 11 Pro               │
  ├────────────────────────────────────────────┤
  │ Peripherals:                               │
  │   • Logitech Keyboard                      │
  │   • Logitech Mouse                         │
  │   • 24" Dell Monitor                       │
  └────────────────────────────────────────────┘

  🎮 Building Gaming Computer...

  ┌────────────────────────────────────────────┐
  │         COMPUTER SPECIFICATIONS            │
  ...
```

---

## Real-World Use Cases

| Domain | Example |
|--------|---------|
| **StringBuilder** | Building strings efficiently in C# |
| **HTTP Requests** | Building complex HTTP requests (HttpClient) |
| **Query Builders** | SQL query construction (EF Core, Dapper) |
| **UI Frameworks** | Building complex dialogs and forms |
| **Configuration** | Building application configuration objects |
| **Document Generation** | Creating PDF, HTML, or XML documents |
| **Game Development** | Building game entities with many optional components |

---

## When to Use

✅ **Use Builder when:**

- Object has many optional parameters or configurations
- Construction process must allow different representations
- You want to avoid "telescoping constructor" anti-pattern
- Complex objects should be created step by step
- You need to build composite trees or complex graphs

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Simple Objects** - If an object has only a few required parameters, a constructor works fine

2. **Immutable Objects with Few Fields** - Constructor or factory method is simpler

3. **No Variations** - If all objects are constructed the same way

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Mutable builder that doesn't reset
public class BadBuilder
{
    private Product _product = new();
    
    public Product Build()
    {
        return _product;  // Returns same instance every time!
    }
}

// ✅ GOOD: Reset after build
public Product Build()
{
    Product result = _product;
    Reset();  // Create new instance for next build
    return result;
}
```

```csharp
// ❌ BAD: Builder with required parameters mixed with optional
builder.Build();  // Oops, forgot to set CPU - runtime error!

// ✅ GOOD: Validate before building
public Computer Build()
{
    if (string.IsNullOrEmpty(_computer.CPU))
        throw new InvalidOperationException("CPU is required");
    
    return _computer;
}

// ✅ BETTER: Use required constructor for mandatory parts
public ComputerBuilder(string cpu)  // CPU is required
{
    _computer.CPU = cpu;
}
```

```csharp
// ❌ BAD: Returning void from builder methods
public void SetCPU(string cpu) { ... }

// ✅ GOOD: Return builder for fluent interface
public IComputerBuilder SetCPU(string cpu)
{
    _computer.CPU = cpu;
    return this;  // Enables method chaining
}
```

---

## Variations

### 1. Simple Builder (No Director)
```csharp
var product = new ProductBuilder()
    .WithA("valueA")
    .WithB("valueB")
    .Build();
```

### 2. Nested Builder (for inner objects)
```csharp
var order = Order.Builder()
    .WithCustomer(Customer.Builder()
        .WithName("John")
        .Build())
    .WithItem(Item.Builder()
        .WithName("Widget")
        .Build())
    .Build();
```

### 3. Step Builder (enforces order)
```csharp
// Each step returns interface for next step
var car = CarBuilder.Start()
    .WithEngine("V8")      // Returns IWithEngine
    .WithTransmission("Auto") // Returns IWithTransmission
    .WithColor("Red")      // Returns IFinalBuilder
    .Build();              // Only available after all steps
```

---

## Key Takeaways

- 🎯 **Step-by-Step Construction**: Build complex objects incrementally
- 🔄 **Same Process, Different Results**: Same steps can produce different products
- 📦 **Encapsulation**: Hides the internal representation of the product
- ✅ **Validation**: Can validate object before returning it
- 🔗 **Fluent Interface**: Method chaining makes code readable
- 🎭 **Director (Optional)**: Encapsulates common construction routines

---

## Related Patterns

- [Abstract Factory](/design-patterns/creational/02-abstract-factory.md) - Can use Builder for complex product creation
- [Prototype](/design-patterns/creational/04-prototype.md) - Alternative when object variations are minimal
- [Singleton](/design-patterns/creational/05-singleton.md) - Director can be a Singleton
- [Composite](/design-patterns/structural/03-composite.md) - Builder often builds Composite structures
