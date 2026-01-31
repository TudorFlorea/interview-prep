# Chain of Responsibility Pattern

[← Back to Behavioral Patterns](00-index.md) | [← Back to Main Index](../00-index.md)

---

## Intent

**Chain of Responsibility** is a behavioral design pattern that lets you pass requests along a chain of handlers. Upon receiving a request, each handler decides either to process the request or to pass it to the next handler in the chain.

---

## Problem

Imagine you're building an ordering system. You want to restrict access so that only authenticated users can create orders. Also, users with admin permissions must have full access. And requests should go through validation, logging, and caching layers.

Adding checks one after another results in bloated, complex code that's hard to maintain.

---

## Solution

Chain of Responsibility transforms particular behaviors into stand-alone objects called handlers. Each handler has a method for handling requests and a reference to the next handler. If a handler can't process a request, it passes it along.

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  Handler A │────►│  Handler B │────►│  Handler C │────►│  Handler D │
│            │     │            │     │            │     │            │
│  Handle()  │     │  Handle()  │     │  Handle()  │     │  Handle()  │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
      │                  │                  │                  │
      │ can't handle     │ can't handle     │ HANDLES!         │
      └──────────────────┴──────────────────┘                  │
                                                               │
     Request ─────────────────────────────────────────────────►│
```

---

## Structure

1. **Handler** - Declares interface for handling requests
2. **Base Handler** - Optional class with boilerplate code (next handler reference)
3. **Concrete Handlers** - Contain actual code for processing requests
4. **Client** - May compose chains once or dynamically

---

## C# Implementation

### Full Console Example: Support Ticket System

```csharp
using System;

namespace ChainOfResponsibilityPattern
{
    // ═══════════════════════════════════════════════════════════════
    // REQUEST
    // ═══════════════════════════════════════════════════════════════
    
    public enum TicketPriority
    {
        Low,
        Medium,
        High,
        Critical
    }

    public class SupportTicket
    {
        public int Id { get; }
        public string Title { get; }
        public string Description { get; }
        public TicketPriority Priority { get; }
        public string Category { get; }
        public bool IsResolved { get; set; }
        public string? Resolution { get; set; }
        public string? HandledBy { get; set; }

        public SupportTicket(int id, string title, string description, 
            TicketPriority priority, string category)
        {
            Id = id;
            Title = title;
            Description = description;
            Priority = priority;
            Category = category;
        }

        public override string ToString() =>
            $"Ticket #{Id}: [{Priority}] [{Category}] {Title}";
    }

    // ═══════════════════════════════════════════════════════════════
    // HANDLER INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    public interface ISupportHandler
    {
        ISupportHandler SetNext(ISupportHandler handler);
        void Handle(SupportTicket ticket);
    }

    // ═══════════════════════════════════════════════════════════════
    // BASE HANDLER
    // ═══════════════════════════════════════════════════════════════
    
    public abstract class BaseSupportHandler : ISupportHandler
    {
        private ISupportHandler? _nextHandler;
        
        protected abstract string HandlerName { get; }

        public ISupportHandler SetNext(ISupportHandler handler)
        {
            _nextHandler = handler;
            return handler;  // Enables chaining: a.SetNext(b).SetNext(c)
        }

        public virtual void Handle(SupportTicket ticket)
        {
            if (CanHandle(ticket))
            {
                ProcessTicket(ticket);
            }
            else if (_nextHandler != null)
            {
                Console.WriteLine($"    ➡️ {HandlerName}: Passing to next handler...");
                _nextHandler.Handle(ticket);
            }
            else
            {
                Console.WriteLine($"    ❌ No handler available for: {ticket}");
            }
        }

        protected abstract bool CanHandle(SupportTicket ticket);
        protected abstract void ProcessTicket(SupportTicket ticket);
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE HANDLERS
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Handles FAQ and basic questions.
    /// </summary>
    public class AutomatedBotHandler : BaseSupportHandler
    {
        protected override string HandlerName => "🤖 Automated Bot";

        private readonly string[] _knownQuestions =
        {
            "password", "reset", "login", "account"
        };

        protected override bool CanHandle(SupportTicket ticket)
        {
            if (ticket.Priority > TicketPriority.Low) return false;
            
            foreach (var keyword in _knownQuestions)
            {
                if (ticket.Description.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        protected override void ProcessTicket(SupportTicket ticket)
        {
            Console.WriteLine($"    {HandlerName}: Handling ticket #{ticket.Id}");
            Console.WriteLine($"    {HandlerName}: Sending automated response with FAQ links");
            ticket.IsResolved = true;
            ticket.Resolution = "Automated: FAQ article sent";
            ticket.HandledBy = HandlerName;
        }
    }

    /// <summary>
    /// Handles general customer inquiries.
    /// </summary>
    public class Level1SupportHandler : BaseSupportHandler
    {
        protected override string HandlerName => "👤 Level 1 Support";

        protected override bool CanHandle(SupportTicket ticket)
        {
            return ticket.Priority &lt;= TicketPriority.Medium &&
                   ticket.Category != "Technical" &&
                   ticket.Category != "Billing";
        }

        protected override void ProcessTicket(SupportTicket ticket)
        {
            Console.WriteLine($"    {HandlerName}: Handling ticket #{ticket.Id}");
            Console.WriteLine($"    {HandlerName}: Providing customer service response");
            ticket.IsResolved = true;
            ticket.Resolution = "L1: Customer inquiry resolved";
            ticket.HandledBy = HandlerName;
        }
    }

    /// <summary>
    /// Handles technical issues.
    /// </summary>
    public class TechnicalSupportHandler : BaseSupportHandler
    {
        protected override string HandlerName => "🔧 Technical Support";

        protected override bool CanHandle(SupportTicket ticket)
        {
            return ticket.Category == "Technical" && 
                   ticket.Priority &lt;= TicketPriority.High;
        }

        protected override void ProcessTicket(SupportTicket ticket)
        {
            Console.WriteLine($"    {HandlerName}: Handling ticket #{ticket.Id}");
            Console.WriteLine($"    {HandlerName}: Investigating technical issue");
            Console.WriteLine($"    {HandlerName}: Applying fix or workaround");
            ticket.IsResolved = true;
            ticket.Resolution = "Tech: Issue diagnosed and resolved";
            ticket.HandledBy = HandlerName;
        }
    }

    /// <summary>
    /// Handles billing and payment issues.
    /// </summary>
    public class BillingSupportHandler : BaseSupportHandler
    {
        protected override string HandlerName => "💰 Billing Support";

        protected override bool CanHandle(SupportTicket ticket)
        {
            return ticket.Category == "Billing";
        }

        protected override void ProcessTicket(SupportTicket ticket)
        {
            Console.WriteLine($"    {HandlerName}: Handling ticket #{ticket.Id}");
            Console.WriteLine($"    {HandlerName}: Reviewing billing records");
            Console.WriteLine($"    {HandlerName}: Processing adjustment if needed");
            ticket.IsResolved = true;
            ticket.Resolution = "Billing: Payment issue resolved";
            ticket.HandledBy = HandlerName;
        }
    }

    /// <summary>
    /// Handles critical and escalated issues.
    /// </summary>
    public class ManagerHandler : BaseSupportHandler
    {
        protected override string HandlerName => "👔 Manager";

        protected override bool CanHandle(SupportTicket ticket)
        {
            return ticket.Priority == TicketPriority.Critical || 
                   ticket.Priority == TicketPriority.High;
        }

        protected override void ProcessTicket(SupportTicket ticket)
        {
            Console.WriteLine($"    {HandlerName}: PRIORITY ESCALATION - Ticket #{ticket.Id}");
            Console.WriteLine($"    {HandlerName}: Direct manager intervention");
            Console.WriteLine($"    {HandlerName}: Expedited resolution in progress");
            ticket.IsResolved = true;
            ticket.Resolution = "Manager: Escalated and personally resolved";
            ticket.HandledBy = HandlerName;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MIDDLEWARE EXAMPLE (Alternative Usage)
    // ═══════════════════════════════════════════════════════════════
    
    public interface IMiddleware
    {
        IMiddleware SetNext(IMiddleware middleware);
        bool Process(Request request);
    }

    public class Request
    {
        public string UserId { get; set; } = "";
        public string Token { get; set; } = "";
        public string Data { get; set; } = "";
    }

    public abstract class Middleware : IMiddleware
    {
        private IMiddleware? _next;

        public IMiddleware SetNext(IMiddleware middleware)
        {
            _next = middleware;
            return middleware;
        }

        public virtual bool Process(Request request)
        {
            if (_next != null)
                return _next.Process(request);
            return true;
        }
    }

    public class AuthenticationMiddleware : Middleware
    {
        public override bool Process(Request request)
        {
            if (string.IsNullOrEmpty(request.Token))
            {
                Console.WriteLine("    🔑 [Auth] BLOCKED: No token provided");
                return false;
            }
            Console.WriteLine("    🔑 [Auth] Token validated");
            return base.Process(request);
        }
    }

    public class RateLimitMiddleware : Middleware
    {
        private readonly Dictionary&lt;string, int> _requestCounts = new();
        private readonly int _limit = 5;

        public override bool Process(Request request)
        {
            _requestCounts.TryGetValue(request.UserId, out int count);
            if (count >= _limit)
            {
                Console.WriteLine("    ⏱️ [RateLimit] BLOCKED: Too many requests");
                return false;
            }
            _requestCounts[request.UserId] = count + 1;
            Console.WriteLine($"    ⏱️ [RateLimit] Request {count + 1}/{_limit} allowed");
            return base.Process(request);
        }
    }

    public class ValidationMiddleware : Middleware
    {
        public override bool Process(Request request)
        {
            if (string.IsNullOrEmpty(request.Data))
            {
                Console.WriteLine("    ✅ [Validation] BLOCKED: Empty data");
                return false;
            }
            Console.WriteLine("    ✅ [Validation] Data is valid");
            return base.Process(request);
        }
    }

    public class LoggingMiddleware : Middleware
    {
        public override bool Process(Request request)
        {
            Console.WriteLine($"    📝 [Logging] Processing request from {request.UserId}");
            var result = base.Process(request);
            Console.WriteLine($"    📝 [Logging] Request completed: {(result ? "Success" : "Failed")}");
            return result;
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
            Console.WriteLine("║   CHAIN OF RESPONSIBILITY PATTERN DEMO     ║");
            Console.WriteLine("║   Support Ticket & Middleware Systems      ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Support Ticket System
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  SUPPORT TICKET CHAIN");
            Console.WriteLine("═══════════════════════════════════════════════");

            // Build the chain
            var bot = new AutomatedBotHandler();
            var l1Support = new Level1SupportHandler();
            var techSupport = new TechnicalSupportHandler();
            var billing = new BillingSupportHandler();
            var manager = new ManagerHandler();

            bot.SetNext(l1Support)
               .SetNext(techSupport)
               .SetNext(billing)
               .SetNext(manager);

            // Create test tickets
            var tickets = new[]
            {
                new SupportTicket(1, "Can't login", "How do I reset my password?", 
                    TicketPriority.Low, "General"),
                new SupportTicket(2, "Slow app", "Application running slowly", 
                    TicketPriority.Medium, "General"),
                new SupportTicket(3, "Crash on startup", "App crashes when opening", 
                    TicketPriority.High, "Technical"),
                new SupportTicket(4, "Wrong charge", "I was charged twice", 
                    TicketPriority.Medium, "Billing"),
                new SupportTicket(5, "URGENT: Site down", "Production is completely down!", 
                    TicketPriority.Critical, "Technical")
            };

            // Process tickets
            foreach (var ticket in tickets)
            {
                Console.WriteLine($"\n  📩 New ticket: {ticket}");
                Console.WriteLine("  ─────────────────────────────────────────");
                bot.Handle(ticket);
                Console.WriteLine($"  ✅ Resolved by: {ticket.HandledBy}");
            }

            // ─────────────────────────────────────────────
            // Demo 2: Middleware Pipeline
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  MIDDLEWARE PIPELINE");
            Console.WriteLine("═══════════════════════════════════════════════");

            var logging = new LoggingMiddleware();
            var auth = new AuthenticationMiddleware();
            var rateLimit = new RateLimitMiddleware();
            var validation = new ValidationMiddleware();

            logging.SetNext(auth).SetNext(rateLimit).SetNext(validation);

            var requests = new[]
            {
                new Request { UserId = "user1", Token = "valid-token", Data = "Some data" },
                new Request { UserId = "user2", Token = "", Data = "Some data" },
                new Request { UserId = "user3", Token = "valid-token", Data = "" },
            };

            foreach (var request in requests)
            {
                Console.WriteLine($"\n  📨 Request from {request.UserId}:");
                logging.Process(request);
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
| **HTTP Middleware** | ASP.NET Core request pipeline |
| **Event Handling** | DOM event bubbling, WPF routed events |
| **Logging** | Log level filtering chains |
| **Validation** | Multi-step form validation |
| **Authentication** | Multi-factor auth chains |
| **Exception Handling** | Try-catch chains |

---

## When to Use

✅ **Use Chain of Responsibility when:**

- Multiple objects may handle a request, and handler isn't known a priori
- You want to issue a request without specifying the receiver explicitly
- The set of handlers should be specified dynamically

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Single Handler** - If only one handler exists, pattern is overkill
2. **Guarantee Required** - If request MUST be handled, ensure chain ends properly

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Request falls through unhandled
public void Handle(Request request)
{
    if (!CanHandle(request) && _next != null)
        _next.Handle(request);
    // If no next and can't handle - request is lost!
}

// ✅ GOOD: Handle unhandled case
public void Handle(Request request)
{
    if (!CanHandle(request))
    {
        if (_next != null)
            _next.Handle(request);
        else
            throw new Exception("Request not handled");
    }
}
```

---

## Key Takeaways

- 🔗 **Decoupling**: Sender doesn't know which handler processes request
- ➕ **Flexible Chain**: Easy to add/remove/reorder handlers
- 🎯 **Single Responsibility**: Each handler focuses on one type of request
- ⚠️ **No Guarantee**: Request might not be handled at all

---

## Related Patterns

- [Command](02-command.md) - Can be passed along the chain
- [Composite](../structural/03-composite.md) - Parent can act as successor
- [Decorator](../structural/04-decorator.md) - Similar structure but different intent
