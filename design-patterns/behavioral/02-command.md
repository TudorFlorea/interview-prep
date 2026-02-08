# Command Pattern

[← Back to Behavioral Patterns](/design-patterns/behavioral/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Command** is a behavioral design pattern that turns a request into a stand-alone object that contains all information about the request. This transformation lets you pass requests as method arguments, delay or queue a request's execution, and support undoable operations.

---

## Problem

Imagine you're developing a text editor. You create a `Button` class for various buttons. While these buttons look similar, they're supposed to do different things. Where would you put the code for click handlers?

The simplest solution is creating tons of subclasses for each button. But then button code depends on volatile business logic, and you have duplicate code across similar UI elements.

---

## Solution

The Command pattern suggests encapsulating a request as an object, allowing you to parameterize clients with different requests. The invoker (button) doesn't care what command it executes.

```
┌──────────┐         ┌────────────┐         ┌───────────┐
│ Invoker  │────────►│  Command   │────────►│  Receiver │
│ (Button) │         │  (Action)  │         │ (Editor)  │
└──────────┘         └────────────┘         └───────────┘
      │                    │
      │ triggers           │ encapsulates
      ▼                    ▼
   Execute()  ──────► receiver.action()

┌─────────────────────────────────────────────────────────┐
│   Command Interface:                                     │
│   + Execute()                                           │
│   + Undo()    ← optional for reversible operations      │
└─────────────────────────────────────────────────────────┘
```

---

## Structure

1. **Command** - Declares interface for executing an operation
2. **Concrete Command** - Implements execute by invoking receiver
3. **Invoker** - Asks command to carry out the request
4. **Receiver** - Knows how to perform the actual work
5. **Client** - Creates command and sets its receiver

---

## C# Implementation

### Full Console Example: Text Editor with Undo/Redo

```csharp
using System;
using System.Collections.Generic;

namespace CommandPattern
{
    // ═══════════════════════════════════════════════════════════════
    // RECEIVER - The actual object that performs the work
    // ═══════════════════════════════════════════════════════════════
    
    public class TextEditor
    {
        private string _content = "";
        private int _cursorPosition = 0;

        public string Content => _content;
        public int CursorPosition => _cursorPosition;

        public void InsertText(string text, int position)
        {
            _content = _content.Insert(position, text);
            _cursorPosition = position + text.Length;
        }

        public string DeleteText(int position, int length)
        {
            if (position &lt; 0 || position + length > _content.Length)
                throw new ArgumentOutOfRangeException();

            string deleted = _content.Substring(position, length);
            _content = _content.Remove(position, length);
            _cursorPosition = position;
            return deleted;
        }

        public void MoveCursor(int position)
        {
            _cursorPosition = Math.Max(0, Math.Min(position, _content.Length));
        }

        public void Display()
        {
            Console.WriteLine($"  Content: \"{_content}\"");
            Console.WriteLine($"  Cursor:  {new string(' ', _cursorPosition)}↑ (pos: {_cursorPosition})");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // COMMAND INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    public interface ICommand
    {
        void Execute();
        void Undo();
        string Description { get; }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE COMMANDS
    // ═══════════════════════════════════════════════════════════════
    
    public class InsertTextCommand : ICommand
    {
        private readonly TextEditor _editor;
        private readonly string _text;
        private readonly int _position;

        public string Description => $"Insert \"{_text}\" at position {_position}";

        public InsertTextCommand(TextEditor editor, string text, int position)
        {
            _editor = editor;
            _text = text;
            _position = position;
        }

        public void Execute()
        {
            _editor.InsertText(_text, _position);
        }

        public void Undo()
        {
            _editor.DeleteText(_position, _text.Length);
        }
    }

    public class DeleteTextCommand : ICommand
    {
        private readonly TextEditor _editor;
        private readonly int _position;
        private readonly int _length;
        private string _deletedText = "";

        public string Description => $"Delete {_length} chars at position {_position}";

        public DeleteTextCommand(TextEditor editor, int position, int length)
        {
            _editor = editor;
            _position = position;
            _length = length;
        }

        public void Execute()
        {
            _deletedText = _editor.DeleteText(_position, _length);
        }

        public void Undo()
        {
            _editor.InsertText(_deletedText, _position);
        }
    }

    public class ReplaceTextCommand : ICommand
    {
        private readonly TextEditor _editor;
        private readonly string _oldText;
        private readonly string _newText;
        private int _position = -1;

        public string Description => $"Replace \"{_oldText}\" with \"{_newText}\"";

        public ReplaceTextCommand(TextEditor editor, string oldText, string newText)
        {
            _editor = editor;
            _oldText = oldText;
            _newText = newText;
        }

        public void Execute()
        {
            _position = _editor.Content.IndexOf(_oldText);
            if (_position >= 0)
            {
                _editor.DeleteText(_position, _oldText.Length);
                _editor.InsertText(_newText, _position);
            }
        }

        public void Undo()
        {
            if (_position >= 0)
            {
                _editor.DeleteText(_position, _newText.Length);
                _editor.InsertText(_oldText, _position);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // INVOKER - Manages command execution and history
    // ═══════════════════════════════════════════════════════════════
    
    public class CommandManager
    {
        private readonly Stack&lt;ICommand> _undoStack = new();
        private readonly Stack&lt;ICommand> _redoStack = new();

        public void ExecuteCommand(ICommand command)
        {
            command.Execute();
            _undoStack.Push(command);
            _redoStack.Clear();  // Clear redo history on new command
            Console.WriteLine($"  ✅ Executed: {command.Description}");
        }

        public void Undo()
        {
            if (_undoStack.Count == 0)
            {
                Console.WriteLine("  ⚠️ Nothing to undo");
                return;
            }

            var command = _undoStack.Pop();
            command.Undo();
            _redoStack.Push(command);
            Console.WriteLine($"  ↩️ Undone: {command.Description}");
        }

        public void Redo()
        {
            if (_redoStack.Count == 0)
            {
                Console.WriteLine("  ⚠️ Nothing to redo");
                return;
            }

            var command = _redoStack.Pop();
            command.Execute();
            _undoStack.Push(command);
            Console.WriteLine($"  ↪️ Redone: {command.Description}");
        }

        public void ShowHistory()
        {
            Console.WriteLine($"\n  📜 Undo stack: {_undoStack.Count} commands");
            Console.WriteLine($"  📜 Redo stack: {_redoStack.Count} commands");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MACRO COMMAND - Composite of multiple commands
    // ═══════════════════════════════════════════════════════════════
    
    public class MacroCommand : ICommand
    {
        private readonly List&lt;ICommand> _commands = new();
        private readonly string _name;

        public string Description => $"Macro: {_name} ({_commands.Count} commands)";

        public MacroCommand(string name)
        {
            _name = name;
        }

        public void AddCommand(ICommand command)
        {
            _commands.Add(command);
        }

        public void Execute()
        {
            foreach (var command in _commands)
            {
                command.Execute();
            }
        }

        public void Undo()
        {
            // Undo in reverse order
            for (int i = _commands.Count - 1; i >= 0; i--)
            {
                _commands[i].Undo();
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // QUEUE EXAMPLE - Deferred execution
    // ═══════════════════════════════════════════════════════════════
    
    public class CommandQueue
    {
        private readonly Queue&lt;ICommand> _queue = new();

        public void Enqueue(ICommand command)
        {
            _queue.Enqueue(command);
            Console.WriteLine($"  📥 Queued: {command.Description}");
        }

        public void ProcessAll()
        {
            Console.WriteLine($"\n  🚀 Processing {_queue.Count} queued commands...\n");
            while (_queue.Count > 0)
            {
                var command = _queue.Dequeue();
                Console.WriteLine($"  ▶️ Executing: {command.Description}");
                command.Execute();
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
            Console.WriteLine("║        COMMAND PATTERN DEMO                ║");
            Console.WriteLine("║        Text Editor with Undo/Redo          ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Basic Command Execution
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  BASIC TEXT EDITING");
            Console.WriteLine("═══════════════════════════════════════════════");

            var editor = new TextEditor();
            var commandManager = new CommandManager();

            Console.WriteLine("\n  Initial state:");
            editor.Display();

            // Execute commands
            commandManager.ExecuteCommand(new InsertTextCommand(editor, "Hello", 0));
            editor.Display();

            commandManager.ExecuteCommand(new InsertTextCommand(editor, " World", 5));
            editor.Display();

            commandManager.ExecuteCommand(new InsertTextCommand(editor, "!", 11));
            editor.Display();

            // ─────────────────────────────────────────────
            // Demo 2: Undo/Redo
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  UNDO / REDO");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            Console.WriteLine("  Before undo:");
            editor.Display();
            commandManager.ShowHistory();

            Console.WriteLine("\n  Undoing...");
            commandManager.Undo();
            editor.Display();

            commandManager.Undo();
            editor.Display();

            Console.WriteLine("\n  Redoing...");
            commandManager.Redo();
            editor.Display();

            commandManager.ShowHistory();

            // ─────────────────────────────────────────────
            // Demo 3: Replace Command
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  REPLACE TEXT");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            var editor2 = new TextEditor();
            var cmdMgr2 = new CommandManager();

            cmdMgr2.ExecuteCommand(new InsertTextCommand(editor2, "The quick brown fox", 0));
            editor2.Display();

            cmdMgr2.ExecuteCommand(new ReplaceTextCommand(editor2, "quick", "slow"));
            editor2.Display();

            cmdMgr2.ExecuteCommand(new ReplaceTextCommand(editor2, "brown", "lazy"));
            editor2.Display();

            Console.WriteLine("\n  Undoing all:");
            cmdMgr2.Undo();
            editor2.Display();
            cmdMgr2.Undo();
            editor2.Display();

            // ─────────────────────────────────────────────
            // Demo 4: Macro Command
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  MACRO COMMAND");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            var editor3 = new TextEditor();
            var cmdMgr3 = new CommandManager();

            // Create a macro that adds a header
            var addHeaderMacro = new MacroCommand("Add Header");
            addHeaderMacro.AddCommand(new InsertTextCommand(editor3, "=====\n", 0));
            addHeaderMacro.AddCommand(new InsertTextCommand(editor3, "TITLE\n", 6));
            addHeaderMacro.AddCommand(new InsertTextCommand(editor3, "=====\n", 12));

            Console.WriteLine("  Executing macro (3 commands as one):");
            cmdMgr3.ExecuteCommand(addHeaderMacro);
            editor3.Display();

            Console.WriteLine("\n  Undoing entire macro:");
            cmdMgr3.Undo();
            editor3.Display();

            // ─────────────────────────────────────────────
            // Demo 5: Command Queue (Deferred Execution)
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  COMMAND QUEUE (Deferred Execution)");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            var editor4 = new TextEditor();
            var queue = new CommandQueue();

            // Queue up commands without executing
            queue.Enqueue(new InsertTextCommand(editor4, "First ", 0));
            queue.Enqueue(new InsertTextCommand(editor4, "Second ", 6));
            queue.Enqueue(new InsertTextCommand(editor4, "Third", 13));

            Console.WriteLine("\n  Current editor state:");
            editor4.Display();

            // Process all queued commands
            queue.ProcessAll();

            Console.WriteLine("\n  After processing queue:");
            editor4.Display();

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
| **GUI Frameworks** | Button actions, menu items |
| **Transaction Systems** | Rollback support |
| **Task Schedulers** | Queued job execution |
| **Game Development** | Input replay, action recording |
| **Networking** | Request queuing and retry |

---

## When to Use

✅ **Use Command when:**

- You want to parameterize objects with operations
- You need to queue, log, or schedule operations
- You need undo/redo functionality
- You want to structure a system around high-level operations

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Simple Operations** - If no undo/queue needed, direct calls are simpler
2. **Stateless Commands** - If command doesn't need to store state for undo

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Command that can't undo
public class NonReversibleCommand : ICommand
{
    public void Execute() { /* destructive operation */ }
    public void Undo() { /* nothing - data lost! */ }
}

// ✅ GOOD: Store state for undo
public class ReversibleCommand : ICommand
{
    private string _previousState;
    public void Execute() { _previousState = GetState(); /* modify */ }
    public void Undo() { RestoreState(_previousState); }
}
```

---

## Key Takeaways

- 📦 **Encapsulation**: Operations become objects with all needed data
- ↩️ **Undo/Redo**: Easy to implement with command history
- 📋 **Queuing**: Commands can be queued for later execution
- 🎭 **Decoupling**: Invoker doesn't need to know about receiver

---

## Related Patterns

- [Memento](/design-patterns/behavioral/05-memento.md) - Alternative for undo (save state vs reverse operations)
- [Chain of Responsibility](/design-patterns/behavioral/01-chain-of-responsibility.md) - Commands can be passed through chain
- [Strategy](/design-patterns/behavioral/08-strategy.md) - Both encapsulate algorithms but different purpose
- [Composite](/design-patterns/structural/03-composite.md) - MacroCommand uses composite structure
