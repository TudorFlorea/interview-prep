# Bridge Pattern

[← Back to Structural Patterns](/design-patterns/structural/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Bridge** is a structural design pattern that lets you split a large class or a set of closely related classes into two separate hierarchies—abstraction and implementation—which can be developed independently of each other.

---

## Problem

Say you have a geometric `Shape` class with a pair of subclasses: `Circle` and `Square`. You want to extend this class hierarchy to incorporate colors, so you plan to create `Red` and `Blue` shape subclasses.

However, since you already have two subclasses, you'll need to create four class combinations like `BlueCircle` and `RedSquare`. Adding new shapes and colors leads to exponential growth.

---

## Solution

The Bridge pattern attempts to solve this problem by switching from inheritance to composition. You extract one of the dimensions into a separate class hierarchy, so the original classes will reference an object of the new hierarchy instead of having all of its state and behaviors within one class.

```
         ┌─────────────────┐
         │   Abstraction   │
         │─────────────────│
         │ - impl: IImpl   │───────────►┌─────────────────┐
         │ + Operation()   │            │ <<interface>>   │
         └────────┬────────┘            │ IImplementation │
                  │                     │─────────────────│
                  │                     │ + OperationImpl │
    ┌─────────────┴─────────────┐       └────────┬────────┘
    │                           │                │
┌───────────┐           ┌───────────┐   ┌───────┴────────┐
│ Refined   │           │ Refined   │   │                │
│AbstractA  │           │AbstractB  │ ┌─────┐        ┌─────┐
└───────────┘           └───────────┘ │ImplA│        │ImplB│
                                      └─────┘        └─────┘
```

---

## Structure

1. **Abstraction** - Provides high-level control logic, relies on implementation object
2. **Refined Abstraction** - Provides variants of control logic
3. **Implementation** - Declares interface common for all concrete implementations
4. **Concrete Implementation** - Contains platform-specific code

---

## C# Implementation

### Full Console Example: Cross-Platform Notification System

```csharp
using System;
using System.Collections.Generic;

namespace BridgePattern
{
    // ═══════════════════════════════════════════════════════════════
    // IMPLEMENTATION INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Implementation defines the interface for all implementation classes.
    /// It doesn't have to match the Abstraction's interface.
    /// </summary>
    public interface IMessageSender
    {
        void SendMessage(string title, string body);
        void SendMessageWithAttachment(string title, string body, string attachmentPath);
        bool IsAvailable();
        string GetSenderName();
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE IMPLEMENTATIONS
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Email implementation of message sending.
    /// </summary>
    public class EmailSender : IMessageSender
    {
        private readonly string _smtpServer;
        private readonly string _fromAddress;

        public EmailSender(string smtpServer, string fromAddress)
        {
            _smtpServer = smtpServer;
            _fromAddress = fromAddress;
        }

        public void SendMessage(string title, string body)
        {
            Console.WriteLine($"    📧 [EMAIL via {_smtpServer}]");
            Console.WriteLine($"       From: {_fromAddress}");
            Console.WriteLine($"       Subject: {title}");
            Console.WriteLine($"       Body: {body}");
        }

        public void SendMessageWithAttachment(string title, string body, string attachmentPath)
        {
            SendMessage(title, body);
            Console.WriteLine($"       📎 Attachment: {attachmentPath}");
        }

        public bool IsAvailable() => true;
        public string GetSenderName() => "Email";
    }

    /// <summary>
    /// SMS implementation of message sending.
    /// </summary>
    public class SmsSender : IMessageSender
    {
        private readonly string _phoneNumber;

        public SmsSender(string phoneNumber)
        {
            _phoneNumber = phoneNumber;
        }

        public void SendMessage(string title, string body)
        {
            // SMS doesn't support title, so we combine them
            Console.WriteLine($"    📱 [SMS to {_phoneNumber}]");
            Console.WriteLine($"       Message: {title}: {body}");
        }

        public void SendMessageWithAttachment(string title, string body, string attachmentPath)
        {
            SendMessage(title, body);
            Console.WriteLine($"       ⚠️ Note: SMS cannot send attachments. Link: {attachmentPath}");
        }

        public bool IsAvailable() => true;
        public string GetSenderName() => "SMS";
    }

    /// <summary>
    /// Push notification implementation.
    /// </summary>
    public class PushNotificationSender : IMessageSender
    {
        private readonly string _deviceToken;
        private readonly string _platform;

        public PushNotificationSender(string deviceToken, string platform)
        {
            _deviceToken = deviceToken;
            _platform = platform;
        }

        public void SendMessage(string title, string body)
        {
            Console.WriteLine($"    🔔 [PUSH to {_platform}]");
            Console.WriteLine($"       Device: {_deviceToken[..8]}...");
            Console.WriteLine($"       Title: {title}");
            Console.WriteLine($"       Body: {body}");
        }

        public void SendMessageWithAttachment(string title, string body, string attachmentPath)
        {
            SendMessage(title, body);
            Console.WriteLine($"       🖼️ Rich media: {attachmentPath}");
        }

        public bool IsAvailable() => true;
        public string GetSenderName() => $"Push ({_platform})";
    }

    /// <summary>
    /// Slack webhook implementation.
    /// </summary>
    public class SlackSender : IMessageSender
    {
        private readonly string _webhookUrl;
        private readonly string _channel;

        public SlackSender(string webhookUrl, string channel)
        {
            _webhookUrl = webhookUrl;
            _channel = channel;
        }

        public void SendMessage(string title, string body)
        {
            Console.WriteLine($"    💬 [SLACK to #{_channel}]");
            Console.WriteLine($"       *{title}*");
            Console.WriteLine($"       {body}");
        }

        public void SendMessageWithAttachment(string title, string body, string attachmentPath)
        {
            SendMessage(title, body);
            Console.WriteLine($"       📄 File: {attachmentPath}");
        }

        public bool IsAvailable() => true;
        public string GetSenderName() => $"Slack (#{_channel})";
    }

    // ═══════════════════════════════════════════════════════════════
    // ABSTRACTION
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Abstraction defines the interface for the "control" part of the hierarchy.
    /// It maintains a reference to an implementation object.
    /// </summary>
    public abstract class Notification
    {
        protected IMessageSender _sender;

        protected Notification(IMessageSender sender)
        {
            _sender = sender;
        }

        public abstract void Send(string recipient, string message);
        
        public void ChangeSender(IMessageSender sender)
        {
            _sender = sender;
        }

        public string GetSenderInfo() => _sender.GetSenderName();
    }

    // ═══════════════════════════════════════════════════════════════
    // REFINED ABSTRACTIONS
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Simple notification - just sends a basic message.
    /// </summary>
    public class SimpleNotification : Notification
    {
        public SimpleNotification(IMessageSender sender) : base(sender) { }

        public override void Send(string recipient, string message)
        {
            Console.WriteLine($"\n  📤 Simple Notification via {_sender.GetSenderName()}");
            Console.WriteLine($"     To: {recipient}");
            _sender.SendMessage("Notification", message);
        }
    }

    /// <summary>
    /// Urgent notification - adds emphasis and confirmation.
    /// </summary>
    public class UrgentNotification : Notification
    {
        public UrgentNotification(IMessageSender sender) : base(sender) { }

        public override void Send(string recipient, string message)
        {
            Console.WriteLine($"\n  🚨 URGENT Notification via {_sender.GetSenderName()}");
            Console.WriteLine($"     To: {recipient}");
            
            string urgentTitle = "⚠️ URGENT: Action Required";
            string urgentBody = $"[HIGH PRIORITY]\n{message}\n\nPlease respond immediately!";
            
            _sender.SendMessage(urgentTitle, urgentBody);
        }
    }

    /// <summary>
    /// Scheduled notification with timestamp.
    /// </summary>
    public class ScheduledNotification : Notification
    {
        private readonly DateTime _scheduledTime;

        public ScheduledNotification(IMessageSender sender, DateTime scheduledTime) : base(sender)
        {
            _scheduledTime = scheduledTime;
        }

        public override void Send(string recipient, string message)
        {
            Console.WriteLine($"\n  ⏰ Scheduled Notification via {_sender.GetSenderName()}");
            Console.WriteLine($"     Scheduled for: {_scheduledTime:yyyy-MM-dd HH:mm}");
            Console.WriteLine($"     To: {recipient}");
            
            string title = $"Scheduled Message ({_scheduledTime:MMM dd})";
            _sender.SendMessage(title, message);
        }
    }

    /// <summary>
    /// Report notification with attachment support.
    /// </summary>
    public class ReportNotification : Notification
    {
        private readonly string _reportPath;

        public ReportNotification(IMessageSender sender, string reportPath) : base(sender)
        {
            _reportPath = reportPath;
        }

        public override void Send(string recipient, string message)
        {
            Console.WriteLine($"\n  📊 Report Notification via {_sender.GetSenderName()}");
            Console.WriteLine($"     To: {recipient}");
            
            _sender.SendMessageWithAttachment("Report Available", message, _reportPath);
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
            Console.WriteLine("║        BRIDGE PATTERN DEMO                 ║");
            Console.WriteLine("║        Cross-Platform Notifications        ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // Create different message senders (implementations)
            var emailSender = new EmailSender("smtp.company.com", "noreply@company.com");
            var smsSender = new SmsSender("+1-555-123-4567");
            var pushSender = new PushNotificationSender("abc123def456ghi789", "iOS");
            var slackSender = new SlackSender("https://hooks.slack.com/...", "alerts");

            // ─────────────────────────────────────────────
            // Demo 1: Same notification type, different senders
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  SIMPLE NOTIFICATION - Different Platforms");
            Console.WriteLine("═══════════════════════════════════════════════");

            var senders = new IMessageSender[] { emailSender, smsSender, pushSender, slackSender };
            
            foreach (var sender in senders)
            {
                var notification = new SimpleNotification(sender);
                notification.Send("john.doe@example.com", "Your order has shipped!");
            }

            // ─────────────────────────────────────────────
            // Demo 2: Different notification types, same sender
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DIFFERENT NOTIFICATION TYPES - Same Platform");
            Console.WriteLine("═══════════════════════════════════════════════");

            var simple = new SimpleNotification(emailSender);
            simple.Send("user@example.com", "Welcome to our service!");

            var urgent = new UrgentNotification(emailSender);
            urgent.Send("admin@example.com", "Server CPU at 95%!");

            var scheduled = new ScheduledNotification(emailSender, DateTime.Now.AddDays(1));
            scheduled.Send("team@example.com", "Reminder: Team meeting tomorrow");

            var report = new ReportNotification(emailSender, "/reports/monthly-sales.pdf");
            report.Send("cfo@example.com", "Monthly sales report is ready for review.");

            // ─────────────────────────────────────────────
            // Demo 3: Runtime switching
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  RUNTIME SWITCHING - Change Implementation");
            Console.WriteLine("═══════════════════════════════════════════════");

            var notification = new UrgentNotification(emailSender);
            notification.Send("ops@example.com", "Database backup completed");

            Console.WriteLine("\n  🔄 Switching sender to Slack...");
            notification.ChangeSender(slackSender);
            notification.Send("ops@example.com", "Database backup completed");

            // ─────────────────────────────────────────────
            // Demo 4: Demonstrating the power of Bridge
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  BRIDGE ADVANTAGE: Any Abstraction + Any Impl");
            Console.WriteLine("═══════════════════════════════════════════════");

            Console.WriteLine("\n  Without Bridge: Need 4 notification × 4 sender = 16 classes!");
            Console.WriteLine("  With Bridge: 4 notifications + 4 senders = 8 classes!");
            Console.WriteLine("\n  Adding a new sender? Just 1 new class!");
            Console.WriteLine("  Adding a new notification type? Just 1 new class!");

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
| **UI Frameworks** | Platform-independent UI with platform-specific rendering |
| **Database Access** | Abstract queries with vendor-specific SQL |
| **Device Drivers** | Abstract device operations with hardware-specific code |
| **Remote Services** | Abstract operations with protocol-specific communication |
| **Graphics** | Shape abstractions with rendering engine implementations |

---

## When to Use

✅ **Use Bridge when:**

- You want to avoid permanent binding between abstraction and implementation
- Both abstraction and implementation should be extensible via subclasses
- Changes in implementation shouldn't affect client code
- You have a class explosion due to two orthogonal dimensions

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Single Implementation** - If only one implementation exists, Bridge is overkill
2. **Stable Hierarchies** - If neither side changes, the extra abstraction isn't worth it

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Abstraction knowing about concrete implementations
public class Notification
{
    public void Send()
    {
        if (_sender is EmailSender email)  // Knows concrete type!
            email.SpecialEmailMethod();
    }
}

// ✅ GOOD: Work only through interface
public class Notification
{
    public void Send() => _sender.SendMessage(title, body);
}
```

---

## Key Takeaways

- 🌉 **Separates Concerns**: Abstraction and implementation vary independently
- 📈 **Reduces Combinations**: Avoids class explosion
- 🔄 **Runtime Flexibility**: Can switch implementations at runtime
- 🎯 **Open/Closed**: Add new abstractions or implementations without changing existing code

---

## Related Patterns

- [Adapter](/design-patterns/structural/01-adapter.md) - Adapter is retrofit; Bridge is designed upfront
- [Abstract Factory](/design-patterns/creational/02-abstract-factory.md) - Can create Bridge components
- [Strategy](/design-patterns/behavioral/08-strategy.md) - Similar structure but different intent
