# Strategy Pattern

[← Back to Behavioral Patterns](/design-patterns/behavioral/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Strategy** is a behavioral design pattern that lets you define a family of algorithms, put each of them into a separate class, and make their objects interchangeable.

---

## Problem

Imagine you're building a navigation app. Initially, you only support driving routes. Then you add walking, public transit, cycling, and more. Each time you add a new routing algorithm, the main class doubles in size, becoming a maintenance nightmare.

---

## Solution

The Strategy pattern suggests extracting each algorithm into a separate class (strategy). The original class (context) stores a reference to a strategy and delegates the work to it. The context doesn't know how the strategy works; it only knows the interface.

```
┌─────────────────────────────────────────────────────────────────┐
│                          Context                                │
│─────────────────────────────────────────────────────────────────│
│  - strategy: IStrategy                                          │
│  + setStrategy(strategy)                                        │
│  + executeStrategy()  ────► strategy.execute()                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     &lt;&lt;interface>> IStrategy                      │
│─────────────────────────────────────────────────────────────────│
│  + execute()                                                    │
└─────────────────────────────────────────────────────────────────┘
                              △
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────────────┐      ┌────────────┐      ┌────────────┐
    │ StrategyA  │      │ StrategyB  │      │ StrategyC  │
    │────────────│      │────────────│      │────────────│
    │ execute()  │      │ execute()  │      │ execute()  │
    └────────────┘      └────────────┘      └────────────┘
```

---

## Structure

1. **Strategy Interface** - Declares algorithm contract
2. **Concrete Strategies** - Implement algorithm variations
3. **Context** - Contains strategy reference, delegates execution
4. **Client** - Creates and configures strategy objects

---

## C# Implementation

### Full Console Example: Payment & Sorting Strategies

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

namespace StrategyPattern
{
    // ═══════════════════════════════════════════════════════════════
    // STRATEGY INTERFACE - Payment
    // ═══════════════════════════════════════════════════════════════
    
    public interface IPaymentStrategy
    {
        string Name { get; }
        bool Validate();
        bool Pay(decimal amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE STRATEGIES - Payment Methods
    // ═══════════════════════════════════════════════════════════════
    
    public class CreditCardPayment : IPaymentStrategy
    {
        private readonly string _cardNumber;
        private readonly string _expiryDate;
        private readonly string _cvv;

        public string Name => "Credit Card";

        public CreditCardPayment(string cardNumber, string expiryDate, string cvv)
        {
            _cardNumber = cardNumber;
            _expiryDate = expiryDate;
            _cvv = cvv;
        }

        public bool Validate()
        {
            // Simplified validation
            bool isValid = _cardNumber.Length == 16 && 
                          _cvv.Length == 3;
            
            Console.WriteLine($"    💳 Validating card ****{_cardNumber[^4..]}...");
            Console.WriteLine($"    {(isValid ? "✅ Card valid" : "❌ Card invalid")}");
            return isValid;
        }

        public bool Pay(decimal amount)
        {
            if (!Validate()) return false;
            
            Console.WriteLine($"    💳 Processing card payment of ${amount:F2}...");
            Console.WriteLine($"    ✅ Payment successful!");
            return true;
        }
    }

    public class PayPalPayment : IPaymentStrategy
    {
        private readonly string _email;
        private readonly string _password;

        public string Name => "PayPal";

        public PayPalPayment(string email, string password)
        {
            _email = email;
            _password = password;
        }

        public bool Validate()
        {
            Console.WriteLine($"    📧 Authenticating PayPal: {_email}...");
            bool isValid = _email.Contains("@") && _password.Length >= 6;
            Console.WriteLine($"    {(isValid ? "✅ Login successful" : "❌ Login failed")}");
            return isValid;
        }

        public bool Pay(decimal amount)
        {
            if (!Validate()) return false;
            
            Console.WriteLine($"    📧 Processing PayPal payment of ${amount:F2}...");
            Console.WriteLine($"    ✅ Payment sent from {_email}");
            return true;
        }
    }

    public class CryptoPayment : IPaymentStrategy
    {
        private readonly string _walletAddress;
        private readonly string _currency;

        public string Name => $"Crypto ({_currency})";

        public CryptoPayment(string walletAddress, string currency = "BTC")
        {
            _walletAddress = walletAddress;
            _currency = currency;
        }

        public bool Validate()
        {
            Console.WriteLine($"    🔗 Verifying wallet: {_walletAddress[..8]}...");
            bool isValid = _walletAddress.Length >= 26;
            Console.WriteLine($"    {(isValid ? "✅ Wallet verified" : "❌ Invalid wallet")}");
            return isValid;
        }

        public bool Pay(decimal amount)
        {
            if (!Validate()) return false;
            
            decimal cryptoAmount = amount / GetExchangeRate();
            Console.WriteLine($"    🪙 Sending {cryptoAmount:F8} {_currency} (${amount:F2})...");
            Console.WriteLine($"    ⏳ Waiting for blockchain confirmation...");
            Console.WriteLine($"    ✅ Transaction confirmed!");
            return true;
        }

        private decimal GetExchangeRate() => _currency switch
        {
            "BTC" => 45000m,
            "ETH" => 3000m,
            _ => 1m
        };
    }

    public class ApplePayPayment : IPaymentStrategy
    {
        private readonly string _deviceId;

        public string Name => "Apple Pay";

        public ApplePayPayment(string deviceId)
        {
            _deviceId = deviceId;
        }

        public bool Validate()
        {
            Console.WriteLine($"    📱 Authenticating device: {_deviceId}...");
            Console.WriteLine($"    🔐 Touch ID / Face ID verified");
            return true;
        }

        public bool Pay(decimal amount)
        {
            if (!Validate()) return false;
            
            Console.WriteLine($"    📱 Processing Apple Pay: ${amount:F2}...");
            Console.WriteLine($"    ✅ Payment complete!");
            return true;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTEXT - Shopping Cart
    // ═══════════════════════════════════════════════════════════════
    
    public class ShoppingCart
    {
        private readonly List&lt;(string Name, decimal Price)> _items = new();
        private IPaymentStrategy? _paymentStrategy;

        public void AddItem(string name, decimal price)
        {
            _items.Add((name, price));
            Console.WriteLine($"  🛒 Added: {name} - ${price:F2}");
        }

        public decimal GetTotal() => _items.Sum(i => i.Price);

        public void SetPaymentMethod(IPaymentStrategy strategy)
        {
            _paymentStrategy = strategy;
            Console.WriteLine($"  💰 Payment method set: {strategy.Name}");
        }

        public bool Checkout()
        {
            if (_paymentStrategy == null)
            {
                Console.WriteLine("  ❌ Please select a payment method");
                return false;
            }

            decimal total = GetTotal();
            Console.WriteLine($"\n  🧾 Checking out {_items.Count} items - Total: ${total:F2}");
            Console.WriteLine($"  ─────────────────────────────────────────\n");

            bool success = _paymentStrategy.Pay(total);
            
            if (success)
            {
                _items.Clear();
                Console.WriteLine($"\n  🎉 Order placed successfully!");
            }
            else
            {
                Console.WriteLine($"\n  ❌ Checkout failed. Please try again.");
            }

            return success;
        }

        public void ShowCart()
        {
            Console.WriteLine("\n  🛒 Shopping Cart:");
            foreach (var (name, price) in _items)
            {
                Console.WriteLine($"    • {name}: ${price:F2}");
            }
            Console.WriteLine($"    ─────────────────");
            Console.WriteLine($"    Total: ${GetTotal():F2}");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SORTING STRATEGY EXAMPLE
    // ═══════════════════════════════════════════════════════════════
    
    public interface ISortStrategy&lt;T>
    {
        string Name { get; }
        void Sort(List&lt;T> data);
    }

    public class BubbleSort&lt;T> : ISortStrategy&lt;T> where T : IComparable&lt;T>
    {
        public string Name => "Bubble Sort";

        public void Sort(List&lt;T> data)
        {
            Console.WriteLine($"    🔄 Using {Name} (O(n²))...");
            for (int i = 0; i &lt; data.Count - 1; i++)
            {
                for (int j = 0; j &lt; data.Count - 1 - i; j++)
                {
                    if (data[j].CompareTo(data[j + 1]) > 0)
                    {
                        (data[j], data[j + 1]) = (data[j + 1], data[j]);
                    }
                }
            }
        }
    }

    public class QuickSort&lt;T> : ISortStrategy&lt;T> where T : IComparable&lt;T>
    {
        public string Name => "Quick Sort";

        public void Sort(List&lt;T> data)
        {
            Console.WriteLine($"    ⚡ Using {Name} (O(n log n) average)...");
            QuickSortRecursive(data, 0, data.Count - 1);
        }

        private void QuickSortRecursive(List&lt;T> data, int low, int high)
        {
            if (low &lt; high)
            {
                int pi = Partition(data, low, high);
                QuickSortRecursive(data, low, pi - 1);
                QuickSortRecursive(data, pi + 1, high);
            }
        }

        private int Partition(List&lt;T> data, int low, int high)
        {
            T pivot = data[high];
            int i = low - 1;

            for (int j = low; j &lt; high; j++)
            {
                if (data[j].CompareTo(pivot) &lt;= 0)
                {
                    i++;
                    (data[i], data[j]) = (data[j], data[i]);
                }
            }
            (data[i + 1], data[high]) = (data[high], data[i + 1]);
            return i + 1;
        }
    }

    public class MergeSort&lt;T> : ISortStrategy&lt;T> where T : IComparable&lt;T>
    {
        public string Name => "Merge Sort";

        public void Sort(List&lt;T> data)
        {
            Console.WriteLine($"    🔀 Using {Name} (O(n log n) guaranteed)...");
            var sorted = MergeSortRecursive(data);
            data.Clear();
            data.AddRange(sorted);
        }

        private List&lt;T> MergeSortRecursive(List&lt;T> data)
        {
            if (data.Count &lt;= 1) return data;

            int mid = data.Count / 2;
            var left = MergeSortRecursive(data.Take(mid).ToList());
            var right = MergeSortRecursive(data.Skip(mid).ToList());

            return Merge(left, right);
        }

        private List&lt;T> Merge(List&lt;T> left, List&lt;T> right)
        {
            var result = new List&lt;T>();
            int i = 0, j = 0;

            while (i &lt; left.Count && j &lt; right.Count)
            {
                if (left[i].CompareTo(right[j]) &lt;= 0)
                    result.Add(left[i++]);
                else
                    result.Add(right[j++]);
            }

            result.AddRange(left.Skip(i));
            result.AddRange(right.Skip(j));
            return result;
        }
    }

    public class DataProcessor&lt;T> where T : IComparable&lt;T>
    {
        private ISortStrategy&lt;T>? _sortStrategy;

        public void SetSortStrategy(ISortStrategy&lt;T> strategy)
        {
            _sortStrategy = strategy;
            Console.WriteLine($"  🔧 Sort strategy: {strategy.Name}");
        }

        public void ProcessData(List&lt;T> data)
        {
            if (_sortStrategy == null)
            {
                Console.WriteLine("  ⚠️ No sort strategy set!");
                return;
            }

            Console.WriteLine($"\n  📊 Processing {data.Count} items...");
            var sw = System.Diagnostics.Stopwatch.StartNew();
            _sortStrategy.Sort(data);
            sw.Stop();
            Console.WriteLine($"    ✅ Sorted in {sw.ElapsedMilliseconds}ms");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LAMBDA STRATEGIES (Functional Approach)
    // ═══════════════════════════════════════════════════════════════
    
    public class TextFormatter
    {
        private Func&lt;string, string> _formatStrategy = s => s;

        public void SetFormatter(Func&lt;string, string> formatter)
        {
            _formatStrategy = formatter;
        }

        public string Format(string text) => _formatStrategy(text);
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT CODE
    // ═══════════════════════════════════════════════════════════════
    
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("╔════════════════════════════════════════════╗");
            Console.WriteLine("║        STRATEGY PATTERN DEMO               ║");
            Console.WriteLine("║        Payment & Sorting Strategies        ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Payment Strategies
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  PAYMENT STRATEGIES");
            Console.WriteLine("═══════════════════════════════════════════════");

            var cart = new ShoppingCart();
            cart.AddItem("Laptop", 999.99m);
            cart.AddItem("Mouse", 29.99m);
            cart.AddItem("Keyboard", 79.99m);
            cart.ShowCart();

            Console.WriteLine("\n  📍 Paying with Credit Card:\n");
            cart.SetPaymentMethod(new CreditCardPayment("1234567890123456", "12/25", "123"));
            cart.Checkout();

            // New order
            Console.WriteLine("\n  ─────────────────────────────────────────\n");
            cart.AddItem("Headphones", 199.99m);
            cart.AddItem("USB Hub", 49.99m);
            cart.ShowCart();

            Console.WriteLine("\n  📍 Paying with PayPal:\n");
            cart.SetPaymentMethod(new PayPalPayment("user@email.com", "password123"));
            cart.Checkout();

            // Crypto payment
            Console.WriteLine("\n  ─────────────────────────────────────────\n");
            cart.AddItem("Monitor", 399.99m);
            cart.ShowCart();

            Console.WriteLine("\n  📍 Paying with Bitcoin:\n");
            cart.SetPaymentMethod(new CryptoPayment("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "BTC"));
            cart.Checkout();

            // ─────────────────────────────────────────────
            // Demo 2: Sorting Strategies
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  SORTING STRATEGIES");
            Console.WriteLine("═══════════════════════════════════════════════");

            var processor = new DataProcessor&lt;int>();
            var random = new Random(42);

            // Small dataset - use simple sort
            var smallData = Enumerable.Range(0, 20).Select(_ => random.Next(100)).ToList();
            Console.WriteLine($"\n  Original: [{string.Join(", ", smallData.Take(10))}...]");
            
            processor.SetSortStrategy(new BubbleSort&lt;int>());
            processor.ProcessData(smallData);
            Console.WriteLine($"  Sorted: [{string.Join(", ", smallData.Take(10))}...]");

            // Larger dataset - use efficient sort
            var largeData = Enumerable.Range(0, 1000).Select(_ => random.Next(10000)).ToList();
            Console.WriteLine($"\n  📊 Large dataset: {largeData.Count} items");
            
            processor.SetSortStrategy(new QuickSort&lt;int>());
            processor.ProcessData(new List&lt;int>(largeData));

            processor.SetSortStrategy(new MergeSort&lt;int>());
            processor.ProcessData(new List&lt;int>(largeData));

            // ─────────────────────────────────────────────
            // Demo 3: Lambda Strategies
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  LAMBDA STRATEGIES (Functional)");
            Console.WriteLine("═══════════════════════════════════════════════");

            var formatter = new TextFormatter();
            string text = "Hello Strategy Pattern";

            formatter.SetFormatter(s => s.ToUpper());
            Console.WriteLine($"\n  Original: {text}");
            Console.WriteLine($"  UPPERCASE: {formatter.Format(text)}");

            formatter.SetFormatter(s => s.ToLower());
            Console.WriteLine($"  lowercase: {formatter.Format(text)}");

            formatter.SetFormatter(s => string.Join("-", s.Split(' ')));
            Console.WriteLine($"  kebab-case: {formatter.Format(text)}");

            formatter.SetFormatter(s => new string(s.Reverse().ToArray()));
            Console.WriteLine($"  Reversed: {formatter.Format(text)}");

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
| **Payment Systems** | Credit card, PayPal, crypto |
| **Compression** | ZIP, RAR, 7z algorithms |
| **Routing** | Different navigation strategies |
| **Sorting** | Various sorting algorithms |
| **Validation** | Different validation rules |
| **Pricing** | Discount strategies |

---

## Strategy vs State

| Aspect | Strategy | State |
|--------|----------|-------|
| **Intent** | Replace algorithm | Change behavior based on state |
| **Awareness** | Strategies don't know each other | States can transition to other states |
| **Who Decides** | Client chooses strategy | Object changes state internally |
| **Lifetime** | Usually set once | Changes throughout object's life |

---

## When to Use

✅ **Use Strategy when:**

- You have many similar classes that differ only in algorithm
- You need different variants of an algorithm
- Algorithm uses data clients shouldn't know about
- A class has many conditional statements for algorithm selection

---

## C# Functional Approach

Strategy is often replaced by simple lambdas in modern C#:

```csharp
// Instead of interface + multiple classes
public class Processor
{
    public void Process(List&lt;int> data, Func&lt;int, int, int> compare)
    {
        data.Sort((a, b) => compare(a, b));
    }
}

// Usage
processor.Process(data, (a, b) => a - b);  // Ascending
processor.Process(data, (a, b) => b - a);  // Descending
```

---

## Anti-Patterns & Pitfalls

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Strategy that depends on context internals
public class BadStrategy : IStrategy
{
    public void Execute(Context ctx)
    {
        var privateData = ctx.GetType()
            .GetField("_private", BindingFlags.NonPublic)
            .GetValue(ctx);  // Breaks encapsulation!
    }
}

// ✅ GOOD: Strategy receives only what it needs
public class GoodStrategy : IStrategy
{
    public Result Execute(InputData input)
    {
        // Work only with provided input
        return new Result();
    }
}
```

---

## Key Takeaways

- 🔄 **Interchangeable**: Algorithms can be swapped at runtime
- 📦 **Encapsulation**: Each algorithm is a separate class
- 🎯 **Open/Closed**: Add new strategies without modifying context
- 🔧 **Composition over Inheritance**: Uses object composition

---

## Related Patterns

- [State](/design-patterns/behavioral/07-state.md) - Similar structure, different intent
- [Command](/design-patterns/behavioral/02-command.md) - Can use strategy for execution logic
- [Template Method](/design-patterns/behavioral/09-template-method.md) - Uses inheritance instead of composition
- [Decorator](/design-patterns/structural/04-decorator.md) - Can wrap strategies
