# Adapter Pattern

[← Back to Structural Patterns](/design-patterns/structural/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Adapter** is a structural design pattern that allows objects with incompatible interfaces to collaborate. It acts as a wrapper between two objects, catching calls for one object and transforming them to format and interface recognizable by the second object.

---

## Problem

Imagine you're creating a stock market monitoring app. The app downloads stock data from multiple sources in XML format, then displays charts and diagrams.

You decide to improve the app by integrating a third-party analytics library. But there's a catch: the library only works with JSON data.

You could change the library to work with XML, but this might break existing code that relies on the library, and you might not have access to the library's source code.

---

## Solution

You can create an *adapter*. This is a special object that converts the interface of one object so that another object can understand it.

The adapter wraps one of the objects to hide the complexity of conversion happening behind the scenes. The wrapped object isn't even aware of the adapter.

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     Client      │────────►│     Adapter     │────────►│     Adaptee     │
│                 │         │                 │         │                 │
│  Uses Target    │         │ Implements      │         │ Has different   │
│  Interface      │         │ Target,         │         │ interface       │
│                 │         │ Wraps Adaptee   │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                    │
                                    │ implements
                                    ▼
                           ┌─────────────────┐
                           │  &lt;&lt;interface>>  │
                           │     ITarget     │
                           └─────────────────┘
```

---

## Structure

1. **Client** - Contains existing business logic
2. **Target Interface** - Describes the protocol other classes must follow to collaborate with client code
3. **Adaptee** - Contains useful behavior but has incompatible interface
4. **Adapter** - Implements target interface and wraps the adaptee

---

## C# Implementation

### Full Console Example: Payment Gateway Adapter

```csharp
using System;
using System.Collections.Generic;

namespace AdapterPattern
{
    // ═══════════════════════════════════════════════════════════════
    // TARGET INTERFACE (what the client expects)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Target interface that our application uses for payments.
    /// </summary>
    public interface IPaymentProcessor
    {
        bool ProcessPayment(decimal amount, string currency, string cardNumber);
        bool RefundPayment(string transactionId, decimal amount);
        PaymentStatus GetPaymentStatus(string transactionId);
    }

    public enum PaymentStatus
    {
        Pending,
        Completed,
        Failed,
        Refunded
    }

    // ═══════════════════════════════════════════════════════════════
    // ADAPTEE 1: Legacy PayPal API (different interface)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// A third-party PayPal API with its own interface.
    /// We can't modify this code.
    /// </summary>
    public class LegacyPayPalApi
    {
        public string MakePayment(double amountUsd, string email, string creditCard)
        {
            Console.WriteLine($"    [PayPal] Processing ${amountUsd} payment");
            Console.WriteLine($"    [PayPal] Card: ****{creditCard[^4..]}");
            var transactionId = $"PP-{Guid.NewGuid().ToString()[..8].ToUpper()}";
            Console.WriteLine($"    [PayPal] Transaction ID: {transactionId}");
            return transactionId;
        }

        public bool ReversalRequest(string ppTransactionId, double amount)
        {
            Console.WriteLine($"    [PayPal] Reversing {ppTransactionId} for ${amount}");
            return true;
        }

        public string CheckStatus(string ppTransactionId)
        {
            // PayPal uses different status codes
            return "COMPLETED";
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ADAPTEE 2: Stripe API (another different interface)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Stripe API with its own interface structure.
    /// </summary>
    public class StripeApi
    {
        public StripeCharge CreateCharge(StripeChargeRequest request)
        {
            Console.WriteLine($"    [Stripe] Creating charge for {request.Amount} {request.Currency}");
            Console.WriteLine($"    [Stripe] Card ending: {request.Source[^4..]}");
            
            var charge = new StripeCharge
            {
                Id = $"ch_{Guid.NewGuid().ToString()[..12]}",
                Amount = request.Amount,
                Currency = request.Currency,
                Status = "succeeded"
            };
            
            Console.WriteLine($"    [Stripe] Charge ID: {charge.Id}");
            return charge;
        }

        public StripeRefund CreateRefund(string chargeId, int amountCents)
        {
            Console.WriteLine($"    [Stripe] Refunding {amountCents} cents for {chargeId}");
            return new StripeRefund
            {
                Id = $"re_{Guid.NewGuid().ToString()[..12]}",
                ChargeId = chargeId,
                Status = "succeeded"
            };
        }

        public StripeCharge RetrieveCharge(string chargeId)
        {
            return new StripeCharge { Id = chargeId, Status = "succeeded" };
        }
    }

    public class StripeChargeRequest
    {
        public int Amount { get; set; }  // In cents
        public string Currency { get; set; } = "";
        public string Source { get; set; } = "";  // Card token
    }

    public class StripeCharge
    {
        public string Id { get; set; } = "";
        public int Amount { get; set; }
        public string Currency { get; set; } = "";
        public string Status { get; set; } = "";
    }

    public class StripeRefund
    {
        public string Id { get; set; } = "";
        public string ChargeId { get; set; } = "";
        public string Status { get; set; } = "";
    }

    // ═══════════════════════════════════════════════════════════════
    // ADAPTERS
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Adapter for PayPal - makes PayPal work with our IPaymentProcessor interface.
    /// </summary>
    public class PayPalAdapter : IPaymentProcessor
    {
        private readonly LegacyPayPalApi _paypal;
        private readonly Dictionary&lt;string, string> _transactionMap = new();

        public PayPalAdapter(LegacyPayPalApi paypal)
        {
            _paypal = paypal;
        }

        public bool ProcessPayment(decimal amount, string currency, string cardNumber)
        {
            Console.WriteLine("\n  💳 PayPal Adapter: Converting request...");
            
            // Convert currency to USD (simplified)
            double amountUsd = (double)amount;
            if (currency != "USD")
            {
                Console.WriteLine($"    Converting {amount} {currency} to USD");
                amountUsd = currency switch
                {
                    "EUR" => (double)amount * 1.1,
                    "GBP" => (double)amount * 1.27,
                    _ => (double)amount
                };
            }

            // PayPal requires email, we'll use a placeholder
            string email = "customer@payment.local";
            
            var transactionId = _paypal.MakePayment(amountUsd, email, cardNumber);
            _transactionMap[transactionId] = transactionId;
            
            return !string.IsNullOrEmpty(transactionId);
        }

        public bool RefundPayment(string transactionId, decimal amount)
        {
            Console.WriteLine("\n  💳 PayPal Adapter: Processing refund...");
            return _paypal.ReversalRequest(transactionId, (double)amount);
        }

        public PaymentStatus GetPaymentStatus(string transactionId)
        {
            var status = _paypal.CheckStatus(transactionId);
            return status switch
            {
                "COMPLETED" => PaymentStatus.Completed,
                "PENDING" => PaymentStatus.Pending,
                "REVERSED" => PaymentStatus.Refunded,
                _ => PaymentStatus.Failed
            };
        }
    }

    /// <summary>
    /// Adapter for Stripe - makes Stripe work with our IPaymentProcessor interface.
    /// </summary>
    public class StripeAdapter : IPaymentProcessor
    {
        private readonly StripeApi _stripe;

        public StripeAdapter(StripeApi stripe)
        {
            _stripe = stripe;
        }

        public bool ProcessPayment(decimal amount, string currency, string cardNumber)
        {
            Console.WriteLine("\n  💳 Stripe Adapter: Converting request...");
            
            // Stripe uses cents, not dollars
            var request = new StripeChargeRequest
            {
                Amount = (int)(amount * 100),  // Convert to cents
                Currency = currency.ToLower(),
                Source = cardNumber
            };

            var charge = _stripe.CreateCharge(request);
            return charge.Status == "succeeded";
        }

        public bool RefundPayment(string transactionId, decimal amount)
        {
            Console.WriteLine("\n  💳 Stripe Adapter: Processing refund...");
            var refund = _stripe.CreateRefund(transactionId, (int)(amount * 100));
            return refund.Status == "succeeded";
        }

        public PaymentStatus GetPaymentStatus(string transactionId)
        {
            var charge = _stripe.RetrieveCharge(transactionId);
            return charge.Status switch
            {
                "succeeded" => PaymentStatus.Completed,
                "pending" => PaymentStatus.Pending,
                "refunded" => PaymentStatus.Refunded,
                _ => PaymentStatus.Failed
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT CODE
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The client code works with any payment processor through the interface.
    /// </summary>
    public class PaymentService
    {
        private readonly IPaymentProcessor _processor;

        public PaymentService(IPaymentProcessor processor)
        {
            _processor = processor;
        }

        public void ProcessOrder(string orderId, decimal amount, string currency, string cardNumber)
        {
            Console.WriteLine($"\n  📦 Processing Order: {orderId}");
            Console.WriteLine($"     Amount: {amount} {currency}");
            
            bool success = _processor.ProcessPayment(amount, currency, cardNumber);
            
            if (success)
            {
                Console.WriteLine("  ✅ Payment successful!");
            }
            else
            {
                Console.WriteLine("  ❌ Payment failed!");
            }
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("╔════════════════════════════════════════════╗");
            Console.WriteLine("║        ADAPTER PATTERN DEMO                ║");
            Console.WriteLine("║        Payment Gateway Integration         ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            string testCard = "4111111111111111";

            // ─────────────────────────────────────────────
            // Using PayPal through adapter
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  PAYMENT VIA PAYPAL (Adapted)");
            Console.WriteLine("═══════════════════════════════════════════════");

            var paypalApi = new LegacyPayPalApi();
            IPaymentProcessor paypalProcessor = new PayPalAdapter(paypalApi);
            var paypalService = new PaymentService(paypalProcessor);
            
            paypalService.ProcessOrder("ORD-001", 99.99m, "USD", testCard);

            // ─────────────────────────────────────────────
            // Using Stripe through adapter
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  PAYMENT VIA STRIPE (Adapted)");
            Console.WriteLine("═══════════════════════════════════════════════");

            var stripeApi = new StripeApi();
            IPaymentProcessor stripeProcessor = new StripeAdapter(stripeApi);
            var stripeService = new PaymentService(stripeProcessor);
            
            stripeService.ProcessOrder("ORD-002", 149.50m, "EUR", testCard);

            // ─────────────────────────────────────────────
            // Demonstrating polymorphism
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  PROCESSING MULTIPLE PAYMENTS (Polymorphism)");
            Console.WriteLine("═══════════════════════════════════════════════");

            var processors = new List&lt;IPaymentProcessor>
            {
                new PayPalAdapter(new LegacyPayPalApi()),
                new StripeAdapter(new StripeApi())
            };

            int orderNum = 100;
            foreach (var processor in processors)
            {
                var service = new PaymentService(processor);
                service.ProcessOrder($"ORD-{orderNum++}", 50.00m, "USD", testCard);
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
| **Payment Integration** | Adapting various payment APIs (Stripe, PayPal, Square) |
| **Data Formats** | XML to JSON converters, CSV adapters |
| **Legacy Systems** | Wrapping old APIs for new applications |
| **Third-Party Libraries** | Adapting external libraries to your interface |
| **Database Access** | Adapting different database drivers |
| **UI Components** | Adapting third-party UI widgets |

---

## When to Use

✅ **Use Adapter when:**

- You want to use an existing class with an incompatible interface
- You want to create a reusable class that cooperates with unrelated classes
- You need to use several existing subclasses but can't adapt their interface by subclassing

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Simple Refactoring Possible** - If you can modify the original class, do that instead
2. **Too Many Adaptations** - If you need many adapters, consider redesigning
3. **Performance Critical** - Adapter adds an extra layer of indirection

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Adapter that does too much (mixing concerns)
public class BadAdapter : ITarget
{
    public void DoSomething()
    {
        _adaptee.Method();
        LogToDatabase();      // Not adapter's job!
        SendNotification();   // Not adapter's job!
    }
}

// ✅ GOOD: Adapter only adapts
public class GoodAdapter : ITarget
{
    public void DoSomething() => _adaptee.Method();
}
```

---

## Key Takeaways

- 🔌 **Interface Compatibility**: Makes incompatible interfaces work together
- 🎭 **Single Responsibility**: Separates interface conversion from business logic
- 📦 **Encapsulation**: Hides complexity of adaptation
- 🔄 **Reusability**: Same adapter works for all clients using target interface

---

## Related Patterns

- [Bridge](/design-patterns/structural/02-bridge.md) - Designed up-front; Adapter is retrofit
- [Decorator](/design-patterns/structural/04-decorator.md) - Wraps without changing interface
- [Facade](/design-patterns/structural/05-facade.md) - Simplifies; Adapter converts
- [Proxy](/design-patterns/structural/07-proxy.md) - Same interface; Adapter changes interface
