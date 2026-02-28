# Singleton Pattern

[← Back to Creational Patterns](/design-patterns/creational/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Singleton** is a creational design pattern that ensures a class has only one instance and provides a global point of access to it.

---

## Problem

The Singleton pattern solves two problems at the same time (violating Single Responsibility Principle):

1. **Ensure a class has just a single instance.** Why would anyone want to control how many instances a class has? The most common reason is to control access to some shared resource—a database connection or a file.

2. **Provide a global access point to that instance.** Those global variables that you used to store essential objects? They don't protect the content from being overwritten. Singleton provides protection.

---

## Solution

All implementations of the Singleton have these two steps in common:

1. Make the default constructor private
2. Create a static creation method that acts as a constructor

```
┌─────────────────────────────────────────────────────────────┐
│                        Singleton                             │
├─────────────────────────────────────────────────────────────┤
│ - instance: Singleton          [static, private]            │
│ - data: object                                              │
├─────────────────────────────────────────────────────────────┤
│ - Singleton()                  [private constructor]        │
│ + GetInstance(): Singleton     [static]                     │
│ + BusinessLogic(): void                                     │
└─────────────────────────────────────────────────────────────┘

    Client                         Singleton
      │                               │
      │  GetInstance()                │
      │──────────────────────────────►│
      │                               │──┐ if instance == null
      │                               │  │ create new instance
      │                               │◄─┘
      │◄──────────────────────────────│
      │         instance              │
```

---

## Structure

1. **Singleton Class** - Declares a static method for getting the instance
2. **Private Constructor** - Prevents direct instantiation
3. **Static Instance** - Holds the single instance
4. **Thread Safety** - Ensures only one instance in multi-threaded scenarios

---

## C# Implementation

### Full Console Example: Multiple Singleton Implementations

```csharp
using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace SingletonPattern
{
    // ═══════════════════════════════════════════════════════════════
    // IMPLEMENTATION 1: Basic Singleton (NOT thread-safe)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Simple singleton - works for single-threaded scenarios only.
    /// ⚠️ NOT recommended for production use.
    /// </summary>
    public class BasicSingleton
    {
        private static BasicSingleton? _instance;
        
        public string Data { get; set; } = "Basic Singleton Data";

        // Private constructor prevents instantiation from outside
        private BasicSingleton()
        {
            Console.WriteLine("    [BasicSingleton] Constructor called");
        }

        public static BasicSingleton Instance
        {
            get
            {
                if (_instance == null)
                {
                    _instance = new BasicSingleton();
                }
                return _instance;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // IMPLEMENTATION 2: Thread-Safe Singleton with Lock
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Thread-safe singleton using lock.
    /// Works but has performance overhead due to locking on every access.
    /// </summary>
    public class LockedSingleton
    {
        private static LockedSingleton? _instance;
        private static readonly object _lock = new();
        
        public string Data { get; set; } = "Locked Singleton Data";
        public DateTime CreatedAt { get; }

        private LockedSingleton()
        {
            CreatedAt = DateTime.Now;
            Console.WriteLine($"    [LockedSingleton] Constructor called at {CreatedAt:HH:mm:ss.fff}");
            Thread.Sleep(100); // Simulate expensive initialization
        }

        public static LockedSingleton Instance
        {
            get
            {
                lock (_lock)
                {
                    if (_instance == null)
                    {
                        _instance = new LockedSingleton();
                    }
                    return _instance;
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // IMPLEMENTATION 3: Double-Check Locking
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Thread-safe singleton with double-check locking.
    /// Better performance than simple lock - only locks during creation.
    /// </summary>
    public class DoubleCheckSingleton
    {
        private static DoubleCheckSingleton? _instance;
        private static readonly object _lock = new();
        
        public string Data { get; set; } = "Double-Check Singleton Data";
        public Guid InstanceId { get; }

        private DoubleCheckSingleton()
        {
            InstanceId = Guid.NewGuid();
            Console.WriteLine($"    [DoubleCheckSingleton] Created with ID: {InstanceId}");
        }

        public static DoubleCheckSingleton Instance
        {
            get
            {
                // First check (no locking)
                if (_instance == null)
                {
                    lock (_lock)
                    {
                        // Second check (with locking)
                        if (_instance == null)
                        {
                            _instance = new DoubleCheckSingleton();
                        }
                    }
                }
                return _instance;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // IMPLEMENTATION 4: Lazy\<T\> (RECOMMENDED)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Thread-safe singleton using Lazy\<T\>.
    /// ✅ RECOMMENDED approach in modern C#.
    /// </summary>
    public class LazySingleton
    {
        private static readonly Lazy<LazySingleton> _lazy = 
            new(() => new LazySingleton());
        
        public string Data { get; set; } = "Lazy Singleton Data";
        public DateTime CreatedAt { get; }
        public int AccessCount { get; private set; }

        private LazySingleton()
        {
            CreatedAt = DateTime.Now;
            Console.WriteLine($"    [LazySingleton] Lazily initialized at {CreatedAt:HH:mm:ss.fff}");
        }

        public static LazySingleton Instance
        {
            get
            {
                var instance = _lazy.Value;
                instance.AccessCount++;
                return instance;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // IMPLEMENTATION 5: Static Initialization (Eager)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Thread-safe singleton using static initialization.
    /// Simple and thread-safe, but initializes eagerly (not lazy).
    /// </summary>
    public class EagerSingleton
    {
        // Instance is created when the class is first accessed
        private static readonly EagerSingleton _instance = new();
        
        public string Data { get; set; } = "Eager Singleton Data";

        // Explicit static constructor to prevent beforefieldinit
        static EagerSingleton()
        {
            Console.WriteLine("    [EagerSingleton] Static constructor called");
        }

        private EagerSingleton()
        {
            Console.WriteLine("    [EagerSingleton] Instance constructor called");
        }

        public static EagerSingleton Instance => _instance;
    }

    // ═══════════════════════════════════════════════════════════════
    // REAL-WORLD EXAMPLE: Configuration Manager
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// A realistic singleton example - Application Configuration Manager.
    /// </summary>
    public class ConfigurationManager
    {
        private static readonly Lazy<ConfigurationManager> _lazy =
            new(() => new ConfigurationManager());

        private readonly Dictionary<string, string> _settings;
        public DateTime LoadedAt { get; }

        private ConfigurationManager()
        {
            Console.WriteLine("    [ConfigurationManager] Loading configuration...");
            LoadedAt = DateTime.Now;
            
            // Simulate loading from file/database
            _settings = new Dictionary<string, string>
            {
                { "DatabaseConnection", "Server=localhost;Database=MyApp;Trusted_Connection=true;" },
                { "ApiEndpoint", "https://api.example.com/v1" },
                { "MaxRetries", "3" },
                { "Timeout", "30000" },
                { "Environment", "Development" },
                { "LogLevel", "Debug" }
            };
            
            Thread.Sleep(200); // Simulate slow loading
            Console.WriteLine("    [ConfigurationManager] Configuration loaded!");
        }

        public static ConfigurationManager Instance => _lazy.Value;

        public string? GetSetting(string key)
        {
            return _settings.TryGetValue(key, out var value) ? value : null;
        }

        public void SetSetting(string key, string value)
        {
            _settings[key] = value;
        }

        public void DisplayAllSettings()
        {
            Console.WriteLine("\n  ┌────────────────────────────────────────────┐");
            Console.WriteLine("  │        CONFIGURATION SETTINGS              │");
            Console.WriteLine("  ├────────────────────────────────────────────┤");
            foreach (var kvp in _settings)
            {
                var displayValue = kvp.Value.Length > 25 
                    ? kvp.Value.Substring(0, 22) + "..." 
                    : kvp.Value;
                Console.WriteLine($"  │ {kvp.Key,-18} │ {displayValue,-20} │");
            }
            Console.WriteLine("  └────────────────────────────────────────────┘");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // REAL-WORLD EXAMPLE: Logger
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Another realistic example - Thread-safe Logger.
    /// </summary>
    public class Logger
    {
        private static readonly Lazy<Logger> _lazy = new(() => new Logger());
        private readonly object _logLock = new();
        private readonly List<string> _logHistory = new();

        private Logger()
        {
            Console.WriteLine("    [Logger] Logger initialized");
        }

        public static Logger Instance => _lazy.Value;

        public void Log(string level, string message)
        {
            lock (_logLock)
            {
                var entry = $"[{DateTime.Now:HH:mm:ss.fff}] [{level}] {message}";
                _logHistory.Add(entry);
                
                var color = level switch
                {
                    "INFO" => ConsoleColor.White,
                    "WARN" => ConsoleColor.Yellow,
                    "ERROR" => ConsoleColor.Red,
                    "DEBUG" => ConsoleColor.Gray,
                    _ => ConsoleColor.White
                };
                
                Console.ForegroundColor = color;
                Console.WriteLine($"    {entry}");
                Console.ResetColor();
            }
        }

        public void Info(string message) => Log("INFO", message);
        public void Warn(string message) => Log("WARN", message);
        public void Error(string message) => Log("ERROR", message);
        public void Debug(string message) => Log("DEBUG", message);

        public int LogCount => _logHistory.Count;
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT CODE
    // ═══════════════════════════════════════════════════════════════
    
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("╔════════════════════════════════════════════╗");
            Console.WriteLine("║        SINGLETON PATTERN DEMO              ║");
            Console.WriteLine("║        Multiple Implementations            ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Basic Singleton
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DEMO 1: Basic Singleton");
            Console.WriteLine("═══════════════════════════════════════════════");

            var basic1 = BasicSingleton.Instance;
            var basic2 = BasicSingleton.Instance;
            Console.WriteLine($"\n  Same instance? {ReferenceEquals(basic1, basic2)}");

            // ─────────────────────────────────────────────
            // Demo 2: Thread Safety with Lazy\<T\>
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DEMO 2: Thread Safety (Lazy\<T\>)");
            Console.WriteLine("═══════════════════════════════════════════════");

            Console.WriteLine("\n  Accessing LazySingleton from multiple threads:");
            
            var instances = new LazySingleton[5];
            Parallel.For(0, 5, i =>
            {
                instances[i] = LazySingleton.Instance;
                Console.WriteLine($"    Thread {i}: Got instance");
            });

            Console.WriteLine($"\n  All same instance? {instances.All(i => ReferenceEquals(i, instances[0]))}");
            Console.WriteLine($"  Access count: {LazySingleton.Instance.AccessCount}");

            // ─────────────────────────────────────────────
            // Demo 3: Real-World - Configuration Manager
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DEMO 3: Configuration Manager");
            Console.WriteLine("═══════════════════════════════════════════════");

            var config = ConfigurationManager.Instance;
            config.DisplayAllSettings();

            Console.WriteLine("\n  Reading specific settings:");
            Console.WriteLine($"    Environment: {config.GetSetting("Environment")}");
            Console.WriteLine($"    MaxRetries: {config.GetSetting("MaxRetries")}");

            // Modify a setting
            config.SetSetting("Environment", "Production");
            Console.WriteLine("\n  Changed Environment to Production");

            // Access from "different part of application"
            var configAgain = ConfigurationManager.Instance;
            Console.WriteLine($"    Same instance? {ReferenceEquals(config, configAgain)}");
            Console.WriteLine($"    Environment now: {configAgain.GetSetting("Environment")}");

            // ─────────────────────────────────────────────
            // Demo 4: Real-World - Logger
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DEMO 4: Logger Singleton");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            var logger = Logger.Instance;
            logger.Info("Application started");
            logger.Debug("Initializing components");
            logger.Warn("Cache size is getting large");
            logger.Error("Failed to connect to external service");
            logger.Info("Retrying connection...");
            logger.Info("Connection established");

            Console.WriteLine($"\n  Total log entries: {Logger.Instance.LogCount}");

            // Multi-threaded logging
            Console.WriteLine("\n  Multi-threaded logging:");
            Parallel.For(0, 5, i =>
            {
                Logger.Instance.Info($"Message from thread {i}");
            });

            Console.WriteLine($"\n  Total log entries after parallel: {Logger.Instance.LogCount}");

            Console.WriteLine("\n✨ Demo completed! Press any key to exit...");
            Console.ReadKey();
        }
    }
}
```

### Console Output

```
╔════════════════════════════════════════════╗
║        SINGLETON PATTERN DEMO              ║
║        Multiple Implementations            ║
╚════════════════════════════════════════════╝

═══════════════════════════════════════════════
  DEMO 1: Basic Singleton
═══════════════════════════════════════════════
    [BasicSingleton] Constructor called

  Same instance? True

═══════════════════════════════════════════════
  DEMO 2: Thread Safety (Lazy\<T\>)
═══════════════════════════════════════════════

  Accessing LazySingleton from multiple threads:
    [LazySingleton] Lazily initialized at 10:30:45.123
    Thread 0: Got instance
    Thread 2: Got instance
    Thread 1: Got instance
    Thread 4: Got instance
    Thread 3: Got instance

  All same instance? True
  Access count: 6

═══════════════════════════════════════════════
  DEMO 3: Configuration Manager
═══════════════════════════════════════════════
    [ConfigurationManager] Loading configuration...
    [ConfigurationManager] Configuration loaded!

  ┌────────────────────────────────────────────┐
  │        CONFIGURATION SETTINGS              │
  ├────────────────────────────────────────────┤
  │ DatabaseConnection   │ Server=localhost;Da... │
  │ ApiEndpoint          │ https://api.example... │
  │ MaxRetries           │ 3                    │
  │ Timeout              │ 30000                │
  │ Environment          │ Development          │
  │ LogLevel             │ Debug                │
  └────────────────────────────────────────────┘
```

---

## Singleton Implementations Comparison

| Implementation | Thread-Safe | Lazy | Performance | Recommended |
|----------------|-------------|------|-------------|-------------|
| **Basic** | ❌ No | ✅ Yes | Fast | ❌ |
| **Lock** | ✅ Yes | ✅ Yes | Slow | ❌ |
| **Double-Check** | ✅ Yes | ✅ Yes | Good | ⚠️ |
| **Lazy\&lt;T\>** | ✅ Yes | ✅ Yes | Good | ✅ Best |
| **Static Init** | ✅ Yes | ❌ No | Fast | ⚠️ |

---

## Real-World Use Cases

| Domain | Example |
|--------|---------|
| **Logging** | Single logger instance across application |
| **Configuration** | Application settings manager |
| **Database Connection** | Connection pool manager |
| **Caching** | In-memory cache instance |
| **Thread Pool** | Managing worker threads |
| **Device Access** | Printer spooler, hardware managers |
| **Registry** | Service locator pattern |

---

## When to Use

✅ **Use Singleton when:**

- Exactly one instance is needed (database connection, file manager)
- You need stricter control over global variables
- The single instance should be extensible by subclassing

---

## Anti-Patterns & Pitfalls

### ❌ Problems with Singleton:

1. **Violates Single Responsibility Principle** - Controls both creation AND functionality

2. **Makes Unit Testing Difficult** - Global state is hard to mock

3. **Hidden Dependencies** - Code depends on singleton but it's not visible

4. **Concurrency Issues** - If not implemented correctly

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Not thread-safe
public static Singleton Instance
{
    get
    {
        if (_instance == null)  // Race condition here!
            _instance = new Singleton();
        return _instance;
    }
}

// ✅ GOOD: Use Lazy\<T\>
private static readonly Lazy<Singleton> _lazy = new(() => new Singleton());
public static Singleton Instance => _lazy.Value;
```

```csharp
// ❌ BAD: Singletons holding disposable resources without cleanup
public class BadDbSingleton
{
    private readonly SqlConnection _connection;  // Never disposed!
}

// ✅ GOOD: Implement IDisposable or use connection pooling
public class GoodDbSingleton : IDisposable
{
    private bool _disposed;
    public void Dispose() { /* cleanup */ }
}
```

```csharp
// ❌ BAD: Using singleton for everything
var userId = UserSingleton.Instance.GetId();  // Hard to test!

// ✅ GOOD: Use dependency injection
public class Service
{
    private readonly IUserProvider _userProvider;
    public Service(IUserProvider userProvider)  // Mockable!
    {
        _userProvider = userProvider;
    }
}
```

---

## Alternatives to Singleton

| Alternative | When to Use |
|-------------|-------------|
| **Dependency Injection** | When testability is important |
| **Static Class** | When no instance state is needed |
| **Monostate** | When you need multiple objects sharing state |
| **Object Pool** | When you need controlled instance reuse |

---

## Key Takeaways

- 🎯 **Single Instance**: Guarantees only one instance exists
- 🌍 **Global Access**: Provides global access point
- ⚡ **Lazy Initialization**: Instance created on first access (usually)
- 🔒 **Thread Safety**: Must be implemented correctly for multi-threading
- ⚠️ **Use Sparingly**: Often overused; consider alternatives
- ✅ **Prefer Lazy\&lt;T\>**: Modern C# best practice

---

## Related Patterns

- [Abstract Factory](/design-patterns/creational/02-abstract-factory.md) - Often implemented as Singleton
- [Builder](/design-patterns/creational/03-builder.md) - Directors can be Singletons
- [Facade](/design-patterns/structural/05-facade.md) - Often implemented as Singleton
- [State](/design-patterns/behavioral/07-state.md) - State objects are often Singletons
