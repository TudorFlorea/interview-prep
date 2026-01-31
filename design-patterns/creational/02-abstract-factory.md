# Abstract Factory Pattern

[← Back to Creational Patterns](00-index.md) | [← Back to Main Index](../00-index.md)

---

## Intent

**Abstract Factory** is a creational design pattern that lets you produce families of related objects without specifying their concrete classes.

---

## Problem

Imagine you're creating a furniture shop simulator. Your code consists of classes that represent:
- A family of related products: `Chair`, `Sofa`, `CoffeeTable`
- Several variants of this family: `Modern`, `Victorian`, `ArtDeco`

You need a way to create individual furniture objects so they match other objects of the same family. Customers get upset when they receive non-matching furniture!

Also, you don't want to change existing code when adding new products or families to the program. Furniture vendors update their catalogs often.

---

## Solution

The Abstract Factory pattern suggests explicitly declaring interfaces for each distinct product of the product family. Then you make all variants of products follow those interfaces.

The next step is to declare the Abstract Factory—an interface with a list of creation methods for all products that are part of the family.

```
┌───────────────────────────────────────────────────────────────────────┐
│                        &lt;&lt;interface>>                                   │
│                        IFurnitureFactory                               │
│  ───────────────────────────────────────────────────────────────────  │
│  + CreateChair(): IChair                                               │
│  + CreateSofa(): ISofa                                                 │
│  + CreateCoffeeTable(): ICoffeeTable                                   │
└───────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ ModernFactory   │    │ VictorianFactory│    │ ArtDecoFactory  │
│ ─────────────── │    │ ─────────────── │    │ ─────────────── │
│ CreateChair()   │    │ CreateChair()   │    │ CreateChair()   │
│ CreateSofa()    │    │ CreateSofa()    │    │ CreateSofa()    │
│ CreateTable()   │    │ CreateTable()   │    │ CreateTable()   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
   ModernChair            VictorianChair           ArtDecoChair
   ModernSofa             VictorianSofa            ArtDecoSofa
   ModernTable            VictorianTable           ArtDecoTable
```

---

## Structure

1. **Abstract Products** - Interfaces for distinct but related products
2. **Concrete Products** - Implementations of abstract products, grouped by variants
3. **Abstract Factory** - Interface declaring creation methods for each abstract product
4. **Concrete Factories** - Implement creation methods for each product variant
5. **Client** - Uses only abstract interfaces, not concrete classes

---

## C# Implementation

### Full Console Example: Cross-Platform UI Factory

```csharp
using System;

namespace AbstractFactoryPattern
{
    // ═══════════════════════════════════════════════════════════════
    // ABSTRACT PRODUCTS
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Abstract Product A - Button
    /// </summary>
    public interface IButton
    {
        void Render();
        void OnClick(Action action);
    }

    /// <summary>
    /// Abstract Product B - Checkbox
    /// </summary>
    public interface ICheckbox
    {
        void Render();
        void Toggle();
        bool IsChecked { get; }
    }

    /// <summary>
    /// Abstract Product C - TextBox
    /// </summary>
    public interface ITextBox
    {
        void Render();
        void SetText(string text);
        string GetText();
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE PRODUCTS - WINDOWS FAMILY
    // ═══════════════════════════════════════════════════════════════
    
    public class WindowsButton : IButton
    {
        public void Render()
        {
            Console.WriteLine("    [====== Windows Button ======]");
        }

        public void OnClick(Action action)
        {
            Console.WriteLine("    → Windows button clicked!");
            action?.Invoke();
        }
    }

    public class WindowsCheckbox : ICheckbox
    {
        public bool IsChecked { get; private set; }

        public void Render()
        {
            string check = IsChecked ? "☑" : "☐";
            Console.WriteLine($"    {check} Windows Checkbox");
        }

        public void Toggle()
        {
            IsChecked = !IsChecked;
            Console.WriteLine($"    → Windows checkbox toggled to: {IsChecked}");
        }
    }

    public class WindowsTextBox : ITextBox
    {
        private string _text = "";

        public void Render()
        {
            Console.WriteLine($"    ┌─────────────────────────────┐");
            Console.WriteLine($"    │ {_text,-27} │");
            Console.WriteLine($"    └─────────────────────────────┘");
        }

        public void SetText(string text) => _text = text;
        public string GetText() => _text;
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE PRODUCTS - MACOS FAMILY
    // ═══════════════════════════════════════════════════════════════
    
    public class MacOSButton : IButton
    {
        public void Render()
        {
            Console.WriteLine("    (  macOS Button  )");
        }

        public void OnClick(Action action)
        {
            Console.WriteLine("    → macOS button clicked with smooth animation!");
            action?.Invoke();
        }
    }

    public class MacOSCheckbox : ICheckbox
    {
        public bool IsChecked { get; private set; }

        public void Render()
        {
            string check = IsChecked ? "●" : "○";
            Console.WriteLine($"    {check} macOS Checkbox");
        }

        public void Toggle()
        {
            IsChecked = !IsChecked;
            Console.WriteLine($"    → macOS checkbox toggled with animation to: {IsChecked}");
        }
    }

    public class MacOSTextBox : ITextBox
    {
        private string _text = "";

        public void Render()
        {
            Console.WriteLine($"    ╭─────────────────────────────╮");
            Console.WriteLine($"    │ {_text,-27} │");
            Console.WriteLine($"    ╰─────────────────────────────╯");
        }

        public void SetText(string text) => _text = text;
        public string GetText() => _text;
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE PRODUCTS - LINUX FAMILY
    // ═══════════════════════════════════════════════════════════════
    
    public class LinuxButton : IButton
    {
        public void Render()
        {
            Console.WriteLine("    &lt; Linux Button >");
        }

        public void OnClick(Action action)
        {
            Console.WriteLine("    → Linux button clicked (GTK style)!");
            action?.Invoke();
        }
    }

    public class LinuxCheckbox : ICheckbox
    {
        public bool IsChecked { get; private set; }

        public void Render()
        {
            string check = IsChecked ? "[X]" : "[ ]";
            Console.WriteLine($"    {check} Linux Checkbox");
        }

        public void Toggle()
        {
            IsChecked = !IsChecked;
            Console.WriteLine($"    → Linux checkbox toggled to: {IsChecked}");
        }
    }

    public class LinuxTextBox : ITextBox
    {
        private string _text = "";

        public void Render()
        {
            Console.WriteLine($"    +-----------------------------+");
            Console.WriteLine($"    | {_text,-27} |");
            Console.WriteLine($"    +-----------------------------+");
        }

        public void SetText(string text) => _text = text;
        public string GetText() => _text;
    }

    // ═══════════════════════════════════════════════════════════════
    // ABSTRACT FACTORY
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Abstract Factory interface declares creation methods for each product type.
    /// </summary>
    public interface IUIFactory
    {
        IButton CreateButton();
        ICheckbox CreateCheckbox();
        ITextBox CreateTextBox();
        string GetPlatformName();
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE FACTORIES
    // ═══════════════════════════════════════════════════════════════
    
    public class WindowsUIFactory : IUIFactory
    {
        public IButton CreateButton() => new WindowsButton();
        public ICheckbox CreateCheckbox() => new WindowsCheckbox();
        public ITextBox CreateTextBox() => new WindowsTextBox();
        public string GetPlatformName() => "Windows 11";
    }

    public class MacOSUIFactory : IUIFactory
    {
        public IButton CreateButton() => new MacOSButton();
        public ICheckbox CreateCheckbox() => new MacOSCheckbox();
        public ITextBox CreateTextBox() => new MacOSTextBox();
        public string GetPlatformName() => "macOS Ventura";
    }

    public class LinuxUIFactory : IUIFactory
    {
        public IButton CreateButton() => new LinuxButton();
        public ICheckbox CreateCheckbox() => new LinuxCheckbox();
        public ITextBox CreateTextBox() => new LinuxTextBox();
        public string GetPlatformName() => "Ubuntu Linux";
    }

    // ═══════════════════════════════════════════════════════════════
    // APPLICATION (USES THE FACTORY)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Application class uses the factory to create UI elements.
    /// It doesn't care which concrete factory it's using.
    /// </summary>
    public class Application
    {
        private readonly IButton _button;
        private readonly ICheckbox _checkbox;
        private readonly ITextBox _textBox;
        private readonly string _platformName;

        public Application(IUIFactory factory)
        {
            _button = factory.CreateButton();
            _checkbox = factory.CreateCheckbox();
            _textBox = factory.CreateTextBox();
            _platformName = factory.GetPlatformName();
        }

        public void RenderUI()
        {
            Console.WriteLine($"\n  ┌─── {_platformName} Application ───┐\n");
            
            Console.WriteLine("  Button:");
            _button.Render();
            
            Console.WriteLine("\n  Checkbox:");
            _checkbox.Render();
            
            Console.WriteLine("\n  TextBox:");
            _textBox.SetText("Enter your text here...");
            _textBox.Render();
            
            Console.WriteLine($"\n  └{'─'.ToString().PadRight(30, '─')}┘");
        }

        public void SimulateInteraction()
        {
            Console.WriteLine($"\n  🖱️  Simulating user interaction on {_platformName}:\n");
            
            _button.OnClick(() => Console.WriteLine("      Action: Form submitted!"));
            _checkbox.Toggle();
            _checkbox.Render();
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
            Console.WriteLine("║     ABSTRACT FACTORY PATTERN DEMO          ║");
            Console.WriteLine("║     Cross-Platform UI Components           ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // Detect "platform" or let user choose
            Console.WriteLine("\n📱 Select platform (1=Windows, 2=macOS, 3=Linux): ");
            string? input = Console.ReadLine();
            
            IUIFactory factory = input switch
            {
                "2" => new MacOSUIFactory(),
                "3" => new LinuxUIFactory(),
                _ => new WindowsUIFactory()
            };

            // The application works with any factory
            Application app = new Application(factory);

            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  RENDERING UI COMPONENTS");
            Console.WriteLine("═══════════════════════════════════════════════");
            app.RenderUI();

            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  SIMULATING USER INTERACTION");
            Console.WriteLine("═══════════════════════════════════════════════");
            app.SimulateInteraction();

            // Show all platforms
            Console.WriteLine("\n\n═══════════════════════════════════════════════");
            Console.WriteLine("  ALL PLATFORMS COMPARISON");
            Console.WriteLine("═══════════════════════════════════════════════");
            
            var factories = new IUIFactory[]
            {
                new WindowsUIFactory(),
                new MacOSUIFactory(),
                new LinuxUIFactory()
            };

            foreach (var f in factories)
            {
                new Application(f).RenderUI();
            }

            Console.WriteLine("\n✨ Demo completed! Press any key to exit...");
            Console.ReadKey();
        }
    }
}
```

### Console Output

```
╔════════════════════════════════════════════╗
║     ABSTRACT FACTORY PATTERN DEMO          ║
║     Cross-Platform UI Components           ║
╚════════════════════════════════════════════╝

📱 Select platform (1=Windows, 2=macOS, 3=Linux): 2

═══════════════════════════════════════════════
  RENDERING UI COMPONENTS
═══════════════════════════════════════════════

  ┌─── macOS Ventura Application ───┐

  Button:
    (  macOS Button  )

  Checkbox:
    ○ macOS Checkbox

  TextBox:
    ╭─────────────────────────────╮
    │ Enter your text here...     │
    ╰─────────────────────────────╯

  └──────────────────────────────┘

═══════════════════════════════════════════════
  SIMULATING USER INTERACTION
═══════════════════════════════════════════════

  🖱️  Simulating user interaction on macOS Ventura:

    → macOS button clicked with smooth animation!
      Action: Form submitted!
    → macOS checkbox toggled with animation to: True
    ● macOS Checkbox
```

---

## Real-World Use Cases

| Domain | Example |
|--------|---------|
| **UI Frameworks** | Creating platform-specific widgets (Windows Forms, WPF, GTK, Cocoa) |
| **Database Access** | Factories for different database providers (SQL Server, Oracle, PostgreSQL) |
| **Document Generation** | Creating document elements for different formats (HTML, PDF, DOCX) |
| **Game Development** | Creating themed game objects (Medieval, Futuristic, Fantasy) |
| **E-commerce** | Payment gateway integrations (Stripe, PayPal, Square) |
| **Cloud Services** | Abstracting cloud providers (AWS, Azure, GCP) |

---

## When to Use

✅ **Use Abstract Factory when:**

- Your code needs to work with various families of related products
- You want to ensure products from one family are used together
- You want to provide a library of products without exposing implementations
- You need to support multiple platforms or environments

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Single Product** - If you only create one type of product, use Factory Method instead

2. **Rarely Changing Families** - If product families almost never change, the abstraction overhead isn't worth it

3. **No Cross-Family Constraint** - If mixing products from different families is acceptable

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Adding a new product requires changing ALL factories
public interface IUIFactory
{
    IButton CreateButton();
    ICheckbox CreateCheckbox();
    ISlider CreateSlider();  // New product = modify all concrete factories!
}

// ✅ GOOD: Consider if you really need this product in all families
// Or use extension/plugin approach for optional products
```

```csharp
// ❌ BAD: Mixing factories
var windowsButton = new WindowsUIFactory().CreateButton();
var macCheckbox = new MacOSUIFactory().CreateCheckbox();  // Inconsistent!

// ✅ GOOD: Use one factory consistently
var factory = new WindowsUIFactory();
var button = factory.CreateButton();
var checkbox = factory.CreateCheckbox();  // Same family
```

```csharp
// ❌ BAD: Factory with too many products (code smell)
public interface IGodFactory
{
    IButton CreateButton();
    ICheckbox CreateCheckbox();
    ITextBox CreateTextBox();
    ISlider CreateSlider();
    IProgressBar CreateProgressBar();
    IMenu CreateMenu();
    IToolbar CreateToolbar();
    // ... 20 more products
}

// ✅ GOOD: Split into focused factories
public interface IInputFactory { ... }
public interface IContainerFactory { ... }
public interface INavigationFactory { ... }
```

---

## Comparison with Factory Method

| Aspect | Factory Method | Abstract Factory |
|--------|----------------|------------------|
| **Products** | Single product | Family of products |
| **Inheritance** | Uses class inheritance | Uses object composition |
| **Focus** | One product creation | Related product creation |
| **Complexity** | Lower | Higher |

---

## Key Takeaways

- 🎯 **Product Compatibility**: Guarantees products from one family work together
- 🔌 **Open/Closed Principle**: Add new families without changing existing code
- 🔗 **Loose Coupling**: Client only knows abstract interfaces
- 📦 **Encapsulation**: Hides concrete product classes from client
- ⚡ **Flexibility**: Switch entire product families by changing factory

---

## Related Patterns

- [Factory Method](01-factory-method.md) - Abstract Factory often uses Factory Methods internally
- [Singleton](05-singleton.md) - Factories are often singletons
- [Prototype](04-prototype.md) - Alternative when families are created by cloning
- [Builder](03-builder.md) - Can be used with Abstract Factory for complex products
