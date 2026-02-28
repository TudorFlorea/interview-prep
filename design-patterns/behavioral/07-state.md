# State Pattern

[← Back to Behavioral Patterns](/design-patterns/behavioral/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**State** is a behavioral design pattern that lets an object alter its behavior when its internal state changes. It appears as if the object changed its class.

---

## Problem

Imagine a `Document` class that can be in one of three states: Draft, Moderation, Published. The `publish` method works differently depending on the current state. Adding more states leads to massive conditionals scattered throughout the code.

---

## Solution

The State pattern suggests creating new classes for all possible states and extracting the state-specific behavior into them. The original object (context) stores a reference to a state object and delegates state-specific work to it.

```
┌─────────────────────────────────────────────────────────────────┐
│                          Context                                │
│─────────────────────────────────────────────────────────────────│
│  - state: IState                                                │
│  + request()  ─────────► state.handle(this)                    │
│  + changeState(newState)                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │ State A  │        │ State B  │        │ State C  │
    │──────────│        │──────────│        │──────────│
    │ handle() │        │ handle() │        │ handle() │
    │    │     │        │    │     │        │    │     │
    │    ▼     │        │    ▼     │        │    ▼     │
    │ →State B │        │ →State C │        │ →State A │
    └──────────┘        └──────────┘        └──────────┘
```

---

## Structure

1. **Context** - Stores reference to current state, delegates to it
2. **State Interface** - Declares state-specific methods
3. **Concrete States** - Implement behavior for each state
4. **State Transitions** - Can be triggered by context or states themselves

---

## C# Implementation

### Full Console Example: Vending Machine & Media Player

```csharp
using System;
using System.Collections.Generic;

namespace StatePattern
{
    // ═══════════════════════════════════════════════════════════════
    // STATE INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    public interface IVendingMachineState
    {
        void InsertMoney(VendingMachine machine, decimal amount);
        void SelectProduct(VendingMachine machine, string product);
        void Dispense(VendingMachine machine);
        void Cancel(VendingMachine machine);
        string GetStateName();
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTEXT - Vending Machine
    // ═══════════════════════════════════════════════════════════════
    
    public class VendingMachine
    {
        private IVendingMachineState _state;
        public decimal InsertedMoney { get; set; }
        public string? SelectedProduct { get; set; }
        
        private readonly Dictionary<string, (decimal Price, int Stock)> _inventory;

        public VendingMachine()
        {
            _state = new IdleState();
            InsertedMoney = 0;
            _inventory = new Dictionary<string, (decimal, int)>
            {
                { "Cola", (1.50m, 5) },
                { "Chips", (1.00m, 3) },
                { "Candy", (0.75m, 10) },
                { "Water", (1.25m, 0) }  // Out of stock
            };
        }

        public void SetState(IVendingMachineState state)
        {
            Console.WriteLine($"  🔄 State: {_state.GetStateName()} → {state.GetStateName()}");
            _state = state;
        }

        public void InsertMoney(decimal amount) => _state.InsertMoney(this, amount);
        public void SelectProduct(string product) => _state.SelectProduct(this, product);
        public void Dispense() => _state.Dispense(this);
        public void Cancel() => _state.Cancel(this);

        public bool HasProduct(string product) => 
            _inventory.ContainsKey(product) && _inventory[product].Stock > 0;
        
        public decimal GetPrice(string product) => 
            _inventory.TryGetValue(product, out var info) ? info.Price : decimal.MaxValue;

        public void ReduceStock(string product)
        {
            if (_inventory.TryGetValue(product, out var info))
                _inventory[product] = (info.Price, info.Stock - 1);
        }

        public void ShowStatus()
        {
            Console.WriteLine($"\n  ┌────────────────────────────────┐");
            Console.WriteLine($"  │  🏧 VENDING MACHINE            │");
            Console.WriteLine($"  ├────────────────────────────────┤");
            Console.WriteLine($"  │  State: {_state.GetStateName(),-22} │");
            Console.WriteLine($"  │  Money: ${InsertedMoney:F2,-21} │");
            Console.WriteLine($"  │  Selection: {SelectedProduct ?? "None",-18} │");
            Console.WriteLine($"  └────────────────────────────────┘");
        }

        public void ShowProducts()
        {
            Console.WriteLine("\n  📋 Available Products:");
            foreach (var (name, (price, stock)) in _inventory)
            {
                string status = stock > 0 ? $"({stock} left)" : "(OUT OF STOCK)";
                Console.WriteLine($"    • {name}: ${price:F2} {status}");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE STATES
    // ═══════════════════════════════════════════════════════════════
    
    public class IdleState : IVendingMachineState
    {
        public string GetStateName() => "Idle";

        public void InsertMoney(VendingMachine machine, decimal amount)
        {
            machine.InsertedMoney += amount;
            Console.WriteLine($"  💵 Inserted ${amount:F2}. Total: ${machine.InsertedMoney:F2}");
            machine.SetState(new HasMoneyState());
        }

        public void SelectProduct(VendingMachine machine, string product)
        {
            Console.WriteLine("  ⚠️ Please insert money first");
        }

        public void Dispense(VendingMachine machine)
        {
            Console.WriteLine("  ⚠️ Please insert money and select a product");
        }

        public void Cancel(VendingMachine machine)
        {
            Console.WriteLine("  ℹ️ Nothing to cancel");
        }
    }

    public class HasMoneyState : IVendingMachineState
    {
        public string GetStateName() => "Has Money";

        public void InsertMoney(VendingMachine machine, decimal amount)
        {
            machine.InsertedMoney += amount;
            Console.WriteLine($"  💵 Inserted ${amount:F2}. Total: ${machine.InsertedMoney:F2}");
        }

        public void SelectProduct(VendingMachine machine, string product)
        {
            if (!machine.HasProduct(product))
            {
                Console.WriteLine($"  ❌ {product} is out of stock");
                return;
            }

            decimal price = machine.GetPrice(product);
            if (machine.InsertedMoney < price)
            {
                Console.WriteLine($"  ⚠️ Insufficient funds. {product} costs ${price:F2}");
                return;
            }

            machine.SelectedProduct = product;
            Console.WriteLine($"  ✅ Selected: {product}");
            machine.SetState(new DispensingState());
        }

        public void Dispense(VendingMachine machine)
        {
            Console.WriteLine("  ⚠️ Please select a product first");
        }

        public void Cancel(VendingMachine machine)
        {
            Console.WriteLine($"  💰 Returning ${machine.InsertedMoney:F2}");
            machine.InsertedMoney = 0;
            machine.SetState(new IdleState());
        }
    }

    public class DispensingState : IVendingMachineState
    {
        public string GetStateName() => "Dispensing";

        public void InsertMoney(VendingMachine machine, decimal amount)
        {
            Console.WriteLine("  ⚠️ Please wait, dispensing in progress...");
        }

        public void SelectProduct(VendingMachine machine, string product)
        {
            Console.WriteLine("  ⚠️ Please wait, dispensing in progress...");
        }

        public void Dispense(VendingMachine machine)
        {
            if (machine.SelectedProduct == null) return;

            decimal price = machine.GetPrice(machine.SelectedProduct);
            decimal change = machine.InsertedMoney - price;

            Console.WriteLine($"  📦 Dispensing {machine.SelectedProduct}...");
            Console.WriteLine($"  🎉 Enjoy your {machine.SelectedProduct}!");

            if (change > 0)
                Console.WriteLine($"  💰 Change: ${change:F2}");

            machine.ReduceStock(machine.SelectedProduct);
            machine.InsertedMoney = 0;
            machine.SelectedProduct = null;
            machine.SetState(new IdleState());
        }

        public void Cancel(VendingMachine machine)
        {
            Console.WriteLine("  ⚠️ Cannot cancel, already dispensing");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MEDIA PLAYER EXAMPLE
    // ═══════════════════════════════════════════════════════════════
    
    public abstract class PlayerState
    {
        protected MediaPlayer Player;

        protected PlayerState(MediaPlayer player)
        {
            Player = player;
        }

        public abstract string Name { get; }
        public abstract void ClickPlay();
        public abstract void ClickStop();
        public abstract void ClickNext();
        public abstract void ClickPrevious();
    }

    public class MediaPlayer
    {
        private PlayerState _state;
        private readonly List<string> _playlist;
        private int _currentTrack;

        public MediaPlayer(List<string> playlist)
        {
            _playlist = playlist;
            _currentTrack = 0;
            _state = new StoppedState(this);
        }

        public void SetState(PlayerState state)
        {
            Console.WriteLine($"  🔄 Player: {_state.Name} → {state.Name}");
            _state = state;
        }

        public void ClickPlay() => _state.ClickPlay();
        public void ClickStop() => _state.ClickStop();
        public void ClickNext() => _state.ClickNext();
        public void ClickPrevious() => _state.ClickPrevious();

        public string CurrentTrack => _playlist[_currentTrack];
        public int TrackIndex => _currentTrack;
        
        public void NextTrack()
        {
            _currentTrack = (_currentTrack + 1) % _playlist.Count;
        }

        public void PreviousTrack()
        {
            _currentTrack = (_currentTrack - 1 + _playlist.Count) % _playlist.Count;
        }

        public void ShowStatus()
        {
            Console.WriteLine($"    🎵 Now: {CurrentTrack} (Track {_currentTrack + 1}/{_playlist.Count})");
        }
    }

    public class StoppedState : PlayerState
    {
        public StoppedState(MediaPlayer player) : base(player) { }
        public override string Name => "Stopped";

        public override void ClickPlay()
        {
            Console.WriteLine("  ▶️ Starting playback");
            Player.ShowStatus();
            Player.SetState(new PlayingState(Player));
        }

        public override void ClickStop()
        {
            Console.WriteLine("  ℹ️ Already stopped");
        }

        public override void ClickNext()
        {
            Player.NextTrack();
            Console.WriteLine("  ⏭️ Next track selected");
            Player.ShowStatus();
        }

        public override void ClickPrevious()
        {
            Player.PreviousTrack();
            Console.WriteLine("  ⏮️ Previous track selected");
            Player.ShowStatus();
        }
    }

    public class PlayingState : PlayerState
    {
        public PlayingState(MediaPlayer player) : base(player) { }
        public override string Name => "Playing";

        public override void ClickPlay()
        {
            Console.WriteLine("  ⏸️ Pausing playback");
            Player.SetState(new PausedState(Player));
        }

        public override void ClickStop()
        {
            Console.WriteLine("  ⏹️ Stopping playback");
            Player.SetState(new StoppedState(Player));
        }

        public override void ClickNext()
        {
            Player.NextTrack();
            Console.WriteLine("  ⏭️ Playing next track");
            Player.ShowStatus();
        }

        public override void ClickPrevious()
        {
            Player.PreviousTrack();
            Console.WriteLine("  ⏮️ Playing previous track");
            Player.ShowStatus();
        }
    }

    public class PausedState : PlayerState
    {
        public PausedState(MediaPlayer player) : base(player) { }
        public override string Name => "Paused";

        public override void ClickPlay()
        {
            Console.WriteLine("  ▶️ Resuming playback");
            Player.ShowStatus();
            Player.SetState(new PlayingState(Player));
        }

        public override void ClickStop()
        {
            Console.WriteLine("  ⏹️ Stopping playback");
            Player.SetState(new StoppedState(Player));
        }

        public override void ClickNext()
        {
            Player.NextTrack();
            Console.WriteLine("  ⏭️ Next track (still paused)");
            Player.ShowStatus();
        }

        public override void ClickPrevious()
        {
            Player.PreviousTrack();
            Console.WriteLine("  ⏮️ Previous track (still paused)");
            Player.ShowStatus();
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
            Console.WriteLine("║        STATE PATTERN DEMO                  ║");
            Console.WriteLine("║        Vending Machine & Media Player      ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Vending Machine
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  VENDING MACHINE");
            Console.WriteLine("═══════════════════════════════════════════════");

            var machine = new VendingMachine();
            machine.ShowProducts();
            machine.ShowStatus();

            Console.WriteLine("\n  📍 Scenario: Buying a Candy\n");
            
            machine.SelectProduct("Candy");  // Should fail - no money
            machine.InsertMoney(0.50m);
            machine.SelectProduct("Candy");  // Should fail - not enough money
            machine.InsertMoney(0.50m);
            machine.SelectProduct("Candy");  // Should work
            machine.Dispense();

            machine.ShowStatus();

            Console.WriteLine("\n  📍 Scenario: Trying out of stock item\n");
            machine.InsertMoney(2.00m);
            machine.SelectProduct("Water");  // Out of stock
            machine.Cancel();  // Get money back

            Console.WriteLine("\n  📍 Scenario: Buying Cola with change\n");
            machine.InsertMoney(2.00m);
            machine.SelectProduct("Cola");
            machine.Dispense();

            // ─────────────────────────────────────────────
            // Demo 2: Media Player
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  MEDIA PLAYER");
            Console.WriteLine("═══════════════════════════════════════════════");

            var playlist = new List<string>
            {
                "Bohemian Rhapsody - Queen",
                "Hotel California - Eagles",
                "Stairway to Heaven - Led Zeppelin",
                "Imagine - John Lennon"
            };

            var player = new MediaPlayer(playlist);

            Console.WriteLine("\n  📍 Playing music\n");
            player.ClickPlay();
            player.ClickNext();
            player.ClickNext();

            Console.WriteLine("\n  📍 Pause and resume\n");
            player.ClickPlay();  // Pause
            player.ClickPrevious();  // While paused
            player.ClickPlay();  // Resume

            Console.WriteLine("\n  📍 Stop playback\n");
            player.ClickStop();
            player.ClickStop();  // Already stopped
            player.ClickNext();  // Navigate while stopped

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
| **Document Workflow** | Draft → Review → Published |
| **Order Processing** | Pending → Paid → Shipped → Delivered |
| **Media Players** | Playing → Paused → Stopped |
| **Vending Machines** | Idle → Has Money → Dispensing |
| **Traffic Lights** | Red → Green → Yellow |
| **Game Characters** | Idle → Walking → Running → Jumping |

---

## State vs Strategy

| Aspect | State | Strategy |
|--------|-------|----------|
| **Intent** | Object behavior changes based on internal state | Client chooses algorithm |
| **Awareness** | States know about other states | Strategies are independent |
| **Transitions** | States can trigger transitions | No transitions |
| **Replacement** | Happens internally, automatically | Set by client explicitly |

---

## When to Use

✅ **Use State when:**

- Object behavior depends on its state and must change at runtime
- Operations have large conditionals based on object's state
- You have duplicate code across states

---

## Anti-Patterns & Pitfalls

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: State explosion
// Too many states can make the system hard to understand

// ❌ BAD: States know too much about context
public class BadState : IState
{
    public void Handle(Context ctx)
    {
        // Directly accessing private members
        ctx._privateField = 10;  // Violates encapsulation
    }
}

// ✅ GOOD: Context provides controlled access
public class GoodState : IState
{
    public void Handle(Context ctx)
    {
        ctx.SetValue(10);  // Use public methods
        ctx.ChangeState(new NextState());
    }
}
```

---

## Key Takeaways

- 🔄 **Dynamic Behavior**: Object appears to change class at runtime
- 📦 **Encapsulation**: State-specific behavior isolated in state classes
- 🎯 **Single Responsibility**: Each state handles only its behavior
- ⚠️ **Complexity**: Can lead to many small state classes

---

## Related Patterns

- [Strategy](/design-patterns/behavioral/08-strategy.md) - Similar structure but different intent
- [Singleton](/design-patterns/creational/05-singleton.md) - State objects can be singletons
- [Flyweight](/design-patterns/structural/06-flyweight.md) - Can share state objects
