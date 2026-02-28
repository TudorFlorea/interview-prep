# Mediator Pattern

[← Back to Behavioral Patterns](/design-patterns/behavioral/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Mediator** is a behavioral design pattern that lets you reduce chaotic dependencies between objects. The pattern restricts direct communications between the objects and forces them to collaborate only via a mediator object.

---

## Problem

Say you have a dialog with many UI elements: buttons, text fields, checkboxes. As you add more elements, the relationships become a complex web where each element needs to communicate with many others.

Elements become tightly coupled, making the system hard to modify. Changing one element requires changes to many others.

---

## Solution

The Mediator pattern suggests ceasing all direct communication between components and making them collaborate indirectly by calling a mediator object. Components become less dependent on each other and more dependent on the mediator.

```
     Before (Tight Coupling):              After (Mediator):

    ┌───┐     ┌───┐                         ┌───┐   ┌───┐
    │ A │◄───►│ B │                         │ A │   │ B │
    └─┬─┘     └─┬─┘                         └─┬─┘   └─┬─┘
      │  ╲   ╱  │                             │       │
      │   ╲ ╱   │                             ▼       ▼
      │    ╳    │                        ┌────────────────┐
      │   ╱ ╲   │                        │    Mediator    │
      │  ╱   ╲  │                        └────────────────┘
    ┌─▼─┐     ┌─▼─┐                           ▲       ▲
    │ C │◄───►│ D │                         ┌─┴─┐   ┌─┴─┐
    └───┘     └───┘                         │ C │   │ D │
                                            └───┘   └───┘
   Everyone knows everyone        Everyone only knows mediator
```

---

## Structure

1. **Mediator** - Interface declaring communication method
2. **Concrete Mediator** - Implements coordination between components
3. **Components** - Contain business logic, communicate via mediator
4. **Base Component** - Optional base class with mediator reference

---

## C# Implementation

### Full Console Example: Chat Room & Smart Home

```csharp
using System;
using System.Collections.Generic;

namespace MediatorPattern
{
    // ═══════════════════════════════════════════════════════════════
    // MEDIATOR INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    public interface IChatMediator
    {
        void Register(User user);
        void SendMessage(string message, User sender);
        void SendPrivateMessage(string message, User sender, string recipientName);
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPONENT (User)
    // ═══════════════════════════════════════════════════════════════
    
    public abstract class User
    {
        protected IChatMediator _mediator;
        public string Name { get; }
        public bool IsOnline { get; set; } = true;

        protected User(string name, IChatMediator mediator)
        {
            Name = name;
            _mediator = mediator;
            mediator.Register(this);
        }

        public abstract void Send(string message);
        public abstract void SendPrivate(string message, string recipientName);
        public abstract void Receive(string message, User sender);
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE COMPONENTS
    // ═══════════════════════════════════════════════════════════════
    
    public class RegularUser : User
    {
        public RegularUser(string name, IChatMediator mediator) : base(name, mediator) { }

        public override void Send(string message)
        {
            Console.WriteLine($"  [{Name}] sends: {message}");
            _mediator.SendMessage(message, this);
        }

        public override void SendPrivate(string message, string recipientName)
        {
            Console.WriteLine($"  [{Name}] whispers to [{recipientName}]: {message}");
            _mediator.SendPrivateMessage(message, this, recipientName);
        }

        public override void Receive(string message, User sender)
        {
            if (IsOnline)
            {
                Console.WriteLine($"    → [{Name}] received from [{sender.Name}]: {message}");
            }
        }
    }

    public class AdminUser : User
    {
        public AdminUser(string name, IChatMediator mediator) : base(name, mediator) { }

        public override void Send(string message)
        {
            Console.WriteLine($"  👑 [{Name}] announces: {message}");
            _mediator.SendMessage(message, this);
        }

        public override void SendPrivate(string message, string recipientName)
        {
            Console.WriteLine($"  👑 [{Name}] privately to [{recipientName}]: {message}");
            _mediator.SendPrivateMessage(message, this, recipientName);
        }

        public override void Receive(string message, User sender)
        {
            if (IsOnline)
            {
                Console.WriteLine($"    → 👑 [{Name}] received from [{sender.Name}]: {message}");
            }
        }

        public void Broadcast(string systemMessage)
        {
            Console.WriteLine($"  📢 [SYSTEM] {systemMessage}");
            _mediator.SendMessage($"[SYSTEM] {systemMessage}", this);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE MEDIATOR (Chat Room)
    // ═══════════════════════════════════════════════════════════════
    
    public class ChatRoom : IChatMediator
    {
        private readonly List<User> _users = new();
        private readonly string _roomName;

        public ChatRoom(string roomName)
        {
            _roomName = roomName;
            Console.WriteLine($"\n  💬 Chat room '{_roomName}' created");
        }

        public void Register(User user)
        {
            _users.Add(user);
            Console.WriteLine($"  ➕ {user.Name} joined the room");
        }

        public void SendMessage(string message, User sender)
        {
            foreach (var user in _users)
            {
                if (user != sender)
                {
                    user.Receive(message, sender);
                }
            }
        }

        public void SendPrivateMessage(string message, User sender, string recipientName)
        {
            var recipient = _users.Find(u => u.Name == recipientName);
            if (recipient != null)
            {
                recipient.Receive($"[Private] {message}", sender);
            }
            else
            {
                Console.WriteLine($"    ⚠️ User '{recipientName}' not found");
            }
        }

        public void ShowOnlineUsers()
        {
            Console.WriteLine($"\n  👥 Users in {_roomName}:");
            foreach (var user in _users)
            {
                string status = user.IsOnline ? "🟢" : "🔴";
                string role = user is AdminUser ? "👑" : "  ";
                Console.WriteLine($"    {status} {role} {user.Name}");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SMART HOME EXAMPLE
    // ═══════════════════════════════════════════════════════════════
    
    public interface ISmartHomeMediator
    {
        void Notify(SmartDevice sender, string eventType);
    }

    public abstract class SmartDevice
    {
        protected ISmartHomeMediator _mediator;
        public string Name { get; }
        public bool IsOn { get; protected set; }

        protected SmartDevice(string name, ISmartHomeMediator mediator)
        {
            Name = name;
            _mediator = mediator;
        }

        public abstract void TurnOn();
        public abstract void TurnOff();
    }

    public class SmartLight : SmartDevice
    {
        public int Brightness { get; private set; } = 100;

        public SmartLight(string name, ISmartHomeMediator mediator) : base(name, mediator) { }

        public override void TurnOn()
        {
            IsOn = true;
            Console.WriteLine($"    💡 {Name}: ON (Brightness: {Brightness}%)");
            _mediator.Notify(this, "LIGHT_ON");
        }

        public override void TurnOff()
        {
            IsOn = false;
            Console.WriteLine($"    💡 {Name}: OFF");
            _mediator.Notify(this, "LIGHT_OFF");
        }

        public void SetBrightness(int level)
        {
            Brightness = Math.Clamp(level, 0, 100);
            Console.WriteLine($"    💡 {Name}: Brightness set to {Brightness}%");
        }

        public void Dim()
        {
            Brightness = 30;
            Console.WriteLine($"    💡 {Name}: Dimmed to {Brightness}%");
        }
    }

    public class SmartTV : SmartDevice
    {
        public SmartTV(string name, ISmartHomeMediator mediator) : base(name, mediator) { }

        public override void TurnOn()
        {
            IsOn = true;
            Console.WriteLine($"    📺 {Name}: ON");
            _mediator.Notify(this, "TV_ON");
        }

        public override void TurnOff()
        {
            IsOn = false;
            Console.WriteLine($"    📺 {Name}: OFF");
            _mediator.Notify(this, "TV_OFF");
        }
    }

    public class SmartThermostat : SmartDevice
    {
        public int Temperature { get; private set; } = 72;

        public SmartThermostat(string name, ISmartHomeMediator mediator) : base(name, mediator) { }

        public override void TurnOn()
        {
            IsOn = true;
            Console.WriteLine($"    🌡️ {Name}: ON (Temp: {Temperature}°F)");
        }

        public override void TurnOff()
        {
            IsOn = false;
            Console.WriteLine($"    🌡️ {Name}: OFF");
        }

        public void SetTemperature(int temp)
        {
            Temperature = temp;
            Console.WriteLine($"    🌡️ {Name}: Temperature set to {Temperature}°F");
            _mediator.Notify(this, "TEMP_CHANGED");
        }
    }

    public class SecuritySystem : SmartDevice
    {
        public bool IsArmed { get; private set; }

        public SecuritySystem(string name, ISmartHomeMediator mediator) : base(name, mediator) { }

        public override void TurnOn()
        {
            IsOn = true;
            Console.WriteLine($"    🔒 {Name}: ON");
        }

        public override void TurnOff()
        {
            IsOn = false;
            Console.WriteLine($"    🔒 {Name}: OFF");
        }

        public void Arm()
        {
            IsArmed = true;
            Console.WriteLine($"    🔒 {Name}: ARMED");
            _mediator.Notify(this, "SECURITY_ARMED");
        }

        public void Disarm()
        {
            IsArmed = false;
            Console.WriteLine($"    🔓 {Name}: DISARMED");
            _mediator.Notify(this, "SECURITY_DISARMED");
        }

        public void TriggerAlarm()
        {
            Console.WriteLine($"    🚨 {Name}: ALARM TRIGGERED!");
            _mediator.Notify(this, "ALARM");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE MEDIATOR (Smart Home Controller)
    // ═══════════════════════════════════════════════════════════════
    
    public class SmartHomeController : ISmartHomeMediator
    {
        private SmartLight? _livingRoomLight;
        private SmartLight? _bedroomLight;
        private SmartTV? _tv;
        private SmartThermostat? _thermostat;
        private SecuritySystem? _security;

        public void RegisterDevices(
            SmartLight? livingRoomLight = null,
            SmartLight? bedroomLight = null,
            SmartTV? tv = null,
            SmartThermostat? thermostat = null,
            SecuritySystem? security = null)
        {
            _livingRoomLight = livingRoomLight;
            _bedroomLight = bedroomLight;
            _tv = tv;
            _thermostat = thermostat;
            _security = security;
        }

        public void Notify(SmartDevice sender, string eventType)
        {
            Console.WriteLine($"  🏠 [Controller] Received: {eventType} from {sender.Name}");

            switch (eventType)
            {
                case "TV_ON":
                    // When TV turns on, dim the lights
                    _livingRoomLight?.Dim();
                    break;

                case "TV_OFF":
                    // When TV turns off, restore lights
                    _livingRoomLight?.SetBrightness(100);
                    break;

                case "SECURITY_ARMED":
                    // When security arms, turn off all lights and TV
                    Console.WriteLine("  🏠 [Controller] Goodbye mode - turning off devices");
                    _livingRoomLight?.TurnOff();
                    _bedroomLight?.TurnOff();
                    _tv?.TurnOff();
                    _thermostat?.SetTemperature(65); // Eco mode
                    break;

                case "SECURITY_DISARMED":
                    // When arriving home
                    Console.WriteLine("  🏠 [Controller] Welcome mode - setting up home");
                    _livingRoomLight?.TurnOn();
                    _thermostat?.SetTemperature(72);
                    break;

                case "ALARM":
                    // Emergency - all lights on
                    Console.WriteLine("  🏠 [Controller] EMERGENCY - All lights on!");
                    _livingRoomLight?.TurnOn();
                    _livingRoomLight?.SetBrightness(100);
                    _bedroomLight?.TurnOn();
                    _bedroomLight?.SetBrightness(100);
                    break;
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
            Console.WriteLine("║        MEDIATOR PATTERN DEMO               ║");
            Console.WriteLine("║        Chat Room & Smart Home              ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Chat Room
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  CHAT ROOM MEDIATOR");
            Console.WriteLine("═══════════════════════════════════════════════");

            var chatRoom = new ChatRoom("General");

            var admin = new AdminUser("Admin", chatRoom);
            var alice = new RegularUser("Alice", chatRoom);
            var bob = new RegularUser("Bob", chatRoom);
            var charlie = new RegularUser("Charlie", chatRoom);

            chatRoom.ShowOnlineUsers();

            Console.WriteLine("\n  --- Chat begins ---\n");

            alice.Send("Hello everyone!");
            bob.Send("Hi Alice!");
            admin.Broadcast("Welcome to the chat!");
            charlie.SendPrivate("Hey Alice, can we talk?", "Alice");
            alice.SendPrivate("Sure, what's up?", "Charlie");

            Console.WriteLine("\n  --- Bob goes offline ---");
            bob.IsOnline = false;
            
            alice.Send("Is anyone there?");

            // ─────────────────────────────────────────────
            // Demo 2: Smart Home
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  SMART HOME MEDIATOR");
            Console.WriteLine("═══════════════════════════════════════════════");

            var controller = new SmartHomeController();

            var livingLight = new SmartLight("Living Room Light", controller);
            var bedroomLight = new SmartLight("Bedroom Light", controller);
            var tv = new SmartTV("Living Room TV", controller);
            var thermostat = new SmartThermostat("Main Thermostat", controller);
            var security = new SecuritySystem("Home Security", controller);

            controller.RegisterDevices(livingLight, bedroomLight, tv, thermostat, security);

            Console.WriteLine("\n  📍 Scenario: Coming home from work");
            Console.WriteLine("  ─────────────────────────────────────────\n");
            security.Disarm();

            Console.WriteLine("\n  📍 Scenario: Watching a movie");
            Console.WriteLine("  ─────────────────────────────────────────\n");
            tv.TurnOn();

            Console.WriteLine("\n  📍 Scenario: Movie ended");
            Console.WriteLine("  ─────────────────────────────────────────\n");
            tv.TurnOff();

            Console.WriteLine("\n  📍 Scenario: Leaving home");
            Console.WriteLine("  ─────────────────────────────────────────\n");
            security.Arm();

            Console.WriteLine("\n  📍 Scenario: Intruder detected!");
            Console.WriteLine("  ─────────────────────────────────────────\n");
            security.TriggerAlarm();

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
| **UI Frameworks** | Dialog components coordination |
| **Chat Applications** | Chat room managing participants |
| **Air Traffic Control** | Tower coordinating aircraft |
| **Smart Home** | Hub coordinating devices |
| **Game Development** | Game manager coordinating entities |
| **MVC/MVVM** | Controller/ViewModel as mediator |

---

## When to Use

✅ **Use Mediator when:**

- Objects communicate in complex but well-defined ways
- Reusing objects is difficult due to dependencies on many other objects
- Behavior distributed between classes should be customizable without subclassing

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **God Mediator** - If mediator becomes too complex, it's a code smell
2. **Simple Interactions** - Direct communication may be cleaner for simple cases

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Mediator that does too much
public class GodMediator
{
    public void Notify(object sender, string ev)
    {
        // 500 lines of if-else handling everything...
    }
}

// ✅ GOOD: Split into focused mediators or use strategy
```

---

## Key Takeaways

- 🔗 **Loose Coupling**: Components don't know about each other
- 🎯 **Single Point**: All communication goes through mediator
- 📦 **Encapsulation**: Component interaction logic centralized
- ⚠️ **Watch Size**: Mediator can become a God object

---

## Related Patterns

- [Facade](/design-patterns/structural/05-facade.md) - Both organize subsystem interactions
- [Observer](/design-patterns/behavioral/06-observer.md) - Mediator can use Observer for notifications
- [Chain of Responsibility](/design-patterns/behavioral/01-chain-of-responsibility.md) - Alternative for request handling
