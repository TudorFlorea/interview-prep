# Memento Pattern

[← Back to Behavioral Patterns](00-index.md) | [← Back to Main Index](../00-index.md)

---

## Intent

**Memento** is a behavioral design pattern that lets you save and restore the previous state of an object without revealing the details of its implementation.

---

## Problem

Imagine you're building a text editor and want to implement undo. You might try making all fields public to copy the object's state, but this exposes the object's internal structure and makes it fragile to future changes.

You also can't simply save a copy if the object has private fields that are crucial to its state.

---

## Solution

The Memento pattern delegates creating the state snapshots to the actual owner of that state, the originator object. Instead of other objects trying to copy the editor's state from "outside," the editor class itself can make the snapshot since it has full access to its own state.

```
┌─────────────────┐         ┌─────────────────┐
│    Caretaker    │         │    Originator   │
│─────────────────│         │─────────────────│
│ - history[]     │◄───────►│ - state         │
│ + backup()      │         │ + save()        │
│ + undo()        │         │ + restore()     │
└────────┬────────┘         └─────────────────┘
         │
         │ stores
         ▼
┌─────────────────┐
│     Memento     │
│─────────────────│
│ - state         │  ← Opaque to caretaker
│ - date          │
│ + GetState()    │  ← Only originator can read
└─────────────────┘
```

---

## Structure

1. **Originator** - Creates memento containing its current state
2. **Memento** - Value object that stores originator's state
3. **Caretaker** - Keeps track of mementos (history), never modifies them

---

## C# Implementation

### Full Console Example: Game Save System & Document History

```csharp
using System;
using System.Collections.Generic;
using System.Text.Json;

namespace MementoPattern
{
    // ═══════════════════════════════════════════════════════════════
    // MEMENTO - Game Save State
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Memento stores the internal state of the Game (Originator).
    /// The state is immutable once created.
    /// </summary>
    public class GameMemento
    {
        public string Name { get; }
        public DateTime SaveTime { get; }
        
        // State is serialized to prevent external modification
        private readonly string _serializedState;

        public GameMemento(string name, GameState state)
        {
            Name = name;
            SaveTime = DateTime.Now;
            _serializedState = JsonSerializer.Serialize(state);
        }

        public GameState GetState()
        {
            return JsonSerializer.Deserialize&lt;GameState>(_serializedState)!;
        }

        public override string ToString() => 
            $"{Name} (Saved: {SaveTime:HH:mm:ss})";
    }

    // ═══════════════════════════════════════════════════════════════
    // STATE DATA
    // ═══════════════════════════════════════════════════════════════
    
    public class GameState
    {
        public string PlayerName { get; set; } = "Player";
        public int Level { get; set; }
        public int Health { get; set; }
        public int Score { get; set; }
        public string CurrentLocation { get; set; } = "Start";
        public List&lt;string> Inventory { get; set; } = new();
    }

    // ═══════════════════════════════════════════════════════════════
    // ORIGINATOR - Game
    // ═══════════════════════════════════════════════════════════════
    
    public class Game
    {
        private GameState _state;

        public Game(string playerName)
        {
            _state = new GameState
            {
                PlayerName = playerName,
                Level = 1,
                Health = 100,
                Score = 0,
                CurrentLocation = "Village",
                Inventory = new List&lt;string> { "Wooden Sword" }
            };
        }

        // Game actions
        public void Play()
        {
            Console.WriteLine($"  🎮 Playing level {_state.Level}...");
            _state.Score += 100;
            Console.WriteLine($"  ⭐ Score increased to {_state.Score}");
        }

        public void TakeDamage(int damage)
        {
            _state.Health -= damage;
            Console.WriteLine($"  💔 Took {damage} damage! Health: {_state.Health}");
        }

        public void Heal(int amount)
        {
            _state.Health = Math.Min(100, _state.Health + amount);
            Console.WriteLine($"  💚 Healed {amount}! Health: {_state.Health}");
        }

        public void LevelUp()
        {
            _state.Level++;
            Console.WriteLine($"  ⬆️ Level up! Now level {_state.Level}");
        }

        public void Travel(string location)
        {
            _state.CurrentLocation = location;
            Console.WriteLine($"  🗺️ Traveled to {location}");
        }

        public void CollectItem(string item)
        {
            _state.Inventory.Add(item);
            Console.WriteLine($"  📦 Collected: {item}");
        }

        // Memento operations
        public GameMemento Save(string saveName)
        {
            Console.WriteLine($"  💾 Saving game as '{saveName}'...");
            return new GameMemento(saveName, _state);
        }

        public void Restore(GameMemento memento)
        {
            _state = memento.GetState();
            Console.WriteLine($"  📂 Loaded save: {memento.Name}");
        }

        public void ShowStatus()
        {
            Console.WriteLine($"\n  ┌─────────────────────────────┐");
            Console.WriteLine($"  │ 👤 {_state.PlayerName,-23} │");
            Console.WriteLine($"  ├─────────────────────────────┤");
            Console.WriteLine($"  │ Level: {_state.Level,-20} │");
            Console.WriteLine($"  │ Health: {_state.Health,-19} │");
            Console.WriteLine($"  │ Score: {_state.Score,-20} │");
            Console.WriteLine($"  │ Location: {_state.CurrentLocation,-17} │");
            Console.WriteLine($"  │ Inventory: {string.Join(", ", _state.Inventory),-16}");
            Console.WriteLine($"  └─────────────────────────────┘\n");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CARETAKER - Save Manager
    // ═══════════════════════════════════════════════════════════════
    
    public class SaveManager
    {
        private readonly List&lt;GameMemento> _saves = new();
        private readonly int _maxSaves;

        public SaveManager(int maxSaves = 5)
        {
            _maxSaves = maxSaves;
        }

        public void AddSave(GameMemento memento)
        {
            if (_saves.Count >= _maxSaves)
            {
                Console.WriteLine($"  ⚠️ Max saves reached. Removing oldest...");
                _saves.RemoveAt(0);
            }
            _saves.Add(memento);
            Console.WriteLine($"  ✅ Save slot {_saves.Count}/{_maxSaves} used");
        }

        public GameMemento? GetLatestSave()
        {
            return _saves.Count > 0 ? _saves[^1] : null;
        }

        public GameMemento? GetSave(int index)
        {
            if (index >= 0 && index &lt; _saves.Count)
                return _saves[index];
            return null;
        }

        public void ShowSaves()
        {
            Console.WriteLine("\n  📋 Available Saves:");
            if (_saves.Count == 0)
            {
                Console.WriteLine("    (No saves available)");
                return;
            }
            for (int i = 0; i &lt; _saves.Count; i++)
            {
                Console.WriteLine($"    [{i}] {_saves[i]}");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEXT EDITOR EXAMPLE - With Undo History
    // ═══════════════════════════════════════════════════════════════
    
    public class EditorMemento
    {
        public string Content { get; }
        public int CursorPosition { get; }
        public DateTime Timestamp { get; }

        public EditorMemento(string content, int cursor)
        {
            Content = content;
            CursorPosition = cursor;
            Timestamp = DateTime.Now;
        }
    }

    public class TextEditor
    {
        private string _content = "";
        private int _cursor = 0;
        private readonly Stack&lt;EditorMemento> _undoStack = new();
        private readonly Stack&lt;EditorMemento> _redoStack = new();

        private void SaveState()
        {
            _undoStack.Push(new EditorMemento(_content, _cursor));
            _redoStack.Clear();  // New action clears redo
        }

        public void Type(string text)
        {
            SaveState();
            _content = _content.Insert(_cursor, text);
            _cursor += text.Length;
        }

        public void Delete(int count)
        {
            if (_cursor + count > _content.Length) return;
            SaveState();
            _content = _content.Remove(_cursor, count);
        }

        public void Backspace(int count)
        {
            if (_cursor &lt; count) return;
            SaveState();
            _cursor -= count;
            _content = _content.Remove(_cursor, count);
        }

        public void Undo()
        {
            if (_undoStack.Count == 0)
            {
                Console.WriteLine("    ⚠️ Nothing to undo");
                return;
            }
            
            // Save current for redo
            _redoStack.Push(new EditorMemento(_content, _cursor));
            
            // Restore previous
            var memento = _undoStack.Pop();
            _content = memento.Content;
            _cursor = memento.CursorPosition;
            Console.WriteLine("    ↩️ Undo");
        }

        public void Redo()
        {
            if (_redoStack.Count == 0)
            {
                Console.WriteLine("    ⚠️ Nothing to redo");
                return;
            }
            
            // Save current for undo
            _undoStack.Push(new EditorMemento(_content, _cursor));
            
            // Restore redo state
            var memento = _redoStack.Pop();
            _content = memento.Content;
            _cursor = memento.CursorPosition;
            Console.WriteLine("    ↪️ Redo");
        }

        public void Display()
        {
            Console.WriteLine($"    Content: \"{_content}\"");
            Console.WriteLine($"    History: {_undoStack.Count} undo, {_redoStack.Count} redo");
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
            Console.WriteLine("║        MEMENTO PATTERN DEMO                ║");
            Console.WriteLine("║        Game Saves & Editor History         ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Game Save System
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  GAME SAVE SYSTEM");
            Console.WriteLine("═══════════════════════════════════════════════");

            var game = new Game("Hero");
            var saveManager = new SaveManager(3);

            game.ShowStatus();

            // Play some game
            Console.WriteLine("  📍 Playing the game...\n");
            game.Play();
            game.CollectItem("Health Potion");
            game.Travel("Forest");
            
            // Save progress
            saveManager.AddSave(game.Save("Before Boss"));
            game.ShowStatus();

            // Continue playing
            Console.WriteLine("  📍 Entering boss fight...\n");
            game.TakeDamage(50);
            game.LevelUp();
            game.Score();
            
            saveManager.AddSave(game.Save("During Boss"));

            // Boss defeats player
            Console.WriteLine("  📍 Boss is winning...\n");
            game.TakeDamage(40);
            game.TakeDamage(15);
            game.ShowStatus();

            // Reload save!
            Console.WriteLine("  📍 GAME OVER! Loading save...\n");
            saveManager.ShowSaves();
            
            var beforeBoss = saveManager.GetSave(0);
            if (beforeBoss != null)
            {
                game.Restore(beforeBoss);
                game.ShowStatus();
            }

            // Try again
            Console.WriteLine("  📍 Second attempt...\n");
            game.Play();
            game.Heal(20);
            game.LevelUp();
            game.CollectItem("Boss Key");
            game.ShowStatus();

            // ─────────────────────────────────────────────
            // Demo 2: Text Editor Undo/Redo
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  TEXT EDITOR UNDO/REDO");
            Console.WriteLine("═══════════════════════════════════════════════");

            var editor = new TextEditor();

            Console.WriteLine("\n  Typing 'Hello World!'...");
            editor.Type("Hello");
            editor.Display();

            editor.Type(" World");
            editor.Display();

            editor.Type("!");
            editor.Display();

            Console.WriteLine("\n  Undoing changes...");
            editor.Undo();
            editor.Display();

            editor.Undo();
            editor.Display();

            Console.WriteLine("\n  Redoing...");
            editor.Redo();
            editor.Display();

            Console.WriteLine("\n  Typing ' Everyone'...");
            editor.Type(" Everyone");
            editor.Display();

            Console.WriteLine("\n  Try redo (should fail - new action clears redo)...");
            editor.Redo();

            Console.WriteLine("\n  Multiple undos...");
            editor.Undo();
            editor.Undo();
            editor.Undo();
            editor.Display();

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
| **Text Editors** | Undo/redo operations |
| **Games** | Save game functionality |
| **Database** | Transaction rollback |
| **Graphics Software** | History panel |
| **Version Control** | Commit snapshots |
| **Form Wizards** | Step-back functionality |

---

## When to Use

✅ **Use Memento when:**

- You need to produce snapshots of an object's state to restore later
- Direct access to fields/getters would expose implementation details
- You want to implement undo mechanism

---

## Anti-Patterns & Pitfalls

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Memento exposes mutable state
public class BadMemento
{
    public List&lt;string> Items { get; set; }  // Can be modified!
}

// ✅ GOOD: Immutable memento
public class GoodMemento
{
    private readonly string _serializedState;
    
    public GoodMemento(List&lt;string> items)
    {
        _serializedState = JsonSerializer.Serialize(items);
    }
    
    public List&lt;string> GetState()
    {
        return JsonSerializer.Deserialize&lt;List&lt;string>>(_serializedState)!;
    }
}
```

### ❌ Memory Considerations:

```csharp
// ⚠️ Storing too many mementos
// Consider limiting history size or using incremental saves

public class LimitedHistory
{
    private readonly LinkedList&lt;Memento> _history = new();
    private readonly int _maxSize = 100;

    public void Add(Memento m)
    {
        if (_history.Count >= _maxSize)
            _history.RemoveFirst();  // Remove oldest
        _history.AddLast(m);
    }
}
```

---

## Key Takeaways

- 📸 **Snapshots**: Capture and restore object state
- 🔒 **Encapsulation**: State details hidden from caretaker
- ↩️ **Undo Support**: Natural fit for undo/redo operations
- 💾 **Memory Trade-off**: Each snapshot uses memory

---

## Related Patterns

- [Command](02-command.md) - Alternative for undo (reverse operations vs saved state)
- [Iterator](03-iterator.md) - Can use memento to capture iteration state
- [Prototype](../creational/04-prototype.md) - Both involve copying state
