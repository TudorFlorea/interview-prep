# Proxy Pattern

[← Back to Structural Patterns](/design-patterns/structural/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Proxy** is a structural design pattern that lets you provide a substitute or placeholder for another object. A proxy controls access to the original object, allowing you to perform something either before or after the request gets through to the original object.

---

## Problem

You have a massive object that consumes lots of resources. You need it from time to time, but not always. You could implement lazy initialization: create this object only when it's actually needed. But all of the object's clients would need to execute this deferred initialization code.

This leads to a lot of code duplication. And what about access control, logging, or caching? You'd need to modify the real object, which might not be possible.

---

## Solution

The Proxy pattern suggests creating a new proxy class with the same interface as the original service object. Then you update your app so that it passes the proxy object to all of the original object's clients. Upon receiving a request, the proxy creates a real service object and delegates all the work to it.

```
┌──────────┐     ┌────────────────┐     ┌──────────────┐
│  Client  │────►│     Proxy      │────►│ Real Subject │
│          │     │                │     │              │
│          │     │ - realSubject  │     │              │
└──────────┘     │ + Request()    │     │ + Request()  │
                 └────────────────┘     └──────────────┘
                          │                     ▲
                          │                     │
                          └─────implements──────┘
                                    │
                           ┌────────┴────────┐
                           │  <<interface>>  │
                           │    ISubject     │
                           │ + Request()     │
                           └─────────────────┘
```

---

## Types of Proxies

| Type | Purpose |
|------|---------|
| **Virtual Proxy** | Lazy initialization (defer creation until needed) |
| **Protection Proxy** | Access control (check permissions) |
| **Remote Proxy** | Local representative for remote object |
| **Logging Proxy** | Log requests before/after |
| **Caching Proxy** | Cache results of expensive operations |
| **Smart Reference** | Additional actions when object accessed |

---

## C# Implementation

### Full Console Example: Multiple Proxy Types

```csharp
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;

namespace ProxyPattern
{
    // ═══════════════════════════════════════════════════════════════
    // SUBJECT INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    public interface IDocument
    {
        string GetContent();
        void SetContent(string content);
        string GetMetadata();
    }

    // ═══════════════════════════════════════════════════════════════
    // REAL SUBJECT
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Real Subject - expensive to create, contains actual logic.
    /// </summary>
    public class HeavyDocument : IDocument
    {
        private readonly string _filename;
        private string _content;
        private readonly DateTime _loadedAt;

        public HeavyDocument(string filename)
        {
            _filename = filename;
            Console.WriteLine($"    📄 [HeavyDocument] Loading '{filename}'...");
            
            // Simulate expensive loading operation
            Thread.Sleep(1000);
            _content = $"Content of {filename} loaded from disk/network";
            _loadedAt = DateTime.Now;
            
            Console.WriteLine($"    📄 [HeavyDocument] Loaded at {_loadedAt:HH:mm:ss}");
        }

        public string GetContent() => _content;
        
        public void SetContent(string content)
        {
            _content = content;
            Console.WriteLine($"    📄 [HeavyDocument] Content updated");
        }

        public string GetMetadata() => $"File: {_filename}, Loaded: {_loadedAt:HH:mm:ss}";
    }

    // ═══════════════════════════════════════════════════════════════
    // VIRTUAL PROXY (Lazy Loading)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Virtual Proxy - defers object creation until actually needed.
    /// </summary>
    public class LazyDocumentProxy : IDocument
    {
        private readonly string _filename;
        private HeavyDocument? _document;
        private readonly object _lock = new();

        public LazyDocumentProxy(string filename)
        {
            _filename = filename;
            Console.WriteLine($"    🔄 [LazyProxy] Created proxy for '{filename}' (not loaded yet)");
        }

        private HeavyDocument GetDocument()
        {
            lock (_lock)
            {
                if (_document == null)
                {
                    Console.WriteLine($"    🔄 [LazyProxy] First access - initializing document...");
                    _document = new HeavyDocument(_filename);
                }
            }
            return _document;
        }

        public string GetContent() => GetDocument().GetContent();
        public void SetContent(string content) => GetDocument().SetContent(content);
        public string GetMetadata() => _document != null 
            ? GetDocument().GetMetadata() 
            : $"File: {_filename} (not loaded)";
    }

    // ═══════════════════════════════════════════════════════════════
    // PROTECTION PROXY (Access Control)
    // ═══════════════════════════════════════════════════════════════
    
    public enum AccessLevel
    {
        Guest = 0,
        User = 1,
        Admin = 2
    }

    public class User
    {
        public string Name { get; }
        public AccessLevel AccessLevel { get; }

        public User(string name, AccessLevel level)
        {
            Name = name;
            AccessLevel = level;
        }
    }

    /// <summary>
    /// Protection Proxy - controls access based on user permissions.
    /// </summary>
    public class SecureDocumentProxy : IDocument
    {
        private readonly IDocument _document;
        private readonly User _user;
        private readonly AccessLevel _readLevel;
        private readonly AccessLevel _writeLevel;

        public SecureDocumentProxy(IDocument document, User user, 
            AccessLevel readLevel = AccessLevel.User,
            AccessLevel writeLevel = AccessLevel.Admin)
        {
            _document = document;
            _user = user;
            _readLevel = readLevel;
            _writeLevel = writeLevel;
        }

        public string GetContent()
        {
            if (_user.AccessLevel >= _readLevel)
            {
                Console.WriteLine($"    🔐 [SecureProxy] Access granted to {_user.Name} (Level: {_user.AccessLevel})");
                return _document.GetContent();
            }
            else
            {
                Console.WriteLine($"    🚫 [SecureProxy] Access DENIED to {_user.Name} (needs {_readLevel})");
                throw new UnauthorizedAccessException("Insufficient permissions to read");
            }
        }

        public void SetContent(string content)
        {
            if (_user.AccessLevel >= _writeLevel)
            {
                Console.WriteLine($"    🔐 [SecureProxy] Write access granted to {_user.Name}");
                _document.SetContent(content);
            }
            else
            {
                Console.WriteLine($"    🚫 [SecureProxy] Write access DENIED to {_user.Name} (needs {_writeLevel})");
                throw new UnauthorizedAccessException("Insufficient permissions to write");
            }
        }

        public string GetMetadata() => _document.GetMetadata();
    }

    // ═══════════════════════════════════════════════════════════════
    // CACHING PROXY
    // ═══════════════════════════════════════════════════════════════
    
    public interface IDataService
    {
        string FetchData(string query);
    }

    public class SlowDataService : IDataService
    {
        public string FetchData(string query)
        {
            Console.WriteLine($"    🌐 [SlowService] Fetching data for '{query}'...");
            Thread.Sleep(500);  // Simulate network delay
            return $"Result for '{query}' at {DateTime.Now:HH:mm:ss.fff}";
        }
    }

    /// <summary>
    /// Caching Proxy - caches results of expensive operations.
    /// </summary>
    public class CachingProxy : IDataService
    {
        private readonly IDataService _service;
        private readonly Dictionary<string, (string Data, DateTime CachedAt)> _cache = new();
        private readonly TimeSpan _cacheExpiry;

        public CachingProxy(IDataService service, TimeSpan? cacheExpiry = null)
        {
            _service = service;
            _cacheExpiry = cacheExpiry ?? TimeSpan.FromMinutes(5);
        }

        public string FetchData(string query)
        {
            if (_cache.TryGetValue(query, out var cached))
            {
                if (DateTime.Now - cached.CachedAt < _cacheExpiry)
                {
                    Console.WriteLine($"    📦 [CachingProxy] Cache HIT for '{query}'");
                    return cached.Data;
                }
                Console.WriteLine($"    ⏰ [CachingProxy] Cache EXPIRED for '{query}'");
            }
            else
            {
                Console.WriteLine($"    ❌ [CachingProxy] Cache MISS for '{query}'");
            }

            var result = _service.FetchData(query);
            _cache[query] = (result, DateTime.Now);
            return result;
        }

        public void ClearCache()
        {
            _cache.Clear();
            Console.WriteLine("    🗑️ [CachingProxy] Cache cleared");
        }

        public int CacheSize => _cache.Count;
    }

    // ═══════════════════════════════════════════════════════════════
    // LOGGING PROXY
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Logging Proxy - logs all method calls.
    /// </summary>
    public class LoggingDocumentProxy : IDocument
    {
        private readonly IDocument _document;
        private readonly string _name;

        public LoggingDocumentProxy(IDocument document, string name = "Document")
        {
            _document = document;
            _name = name;
        }

        public string GetContent()
        {
            var sw = Stopwatch.StartNew();
            Console.WriteLine($"    📝 [LoggingProxy] {_name}.GetContent() called");
            
            var result = _document.GetContent();
            
            sw.Stop();
            Console.WriteLine($"    📝 [LoggingProxy] {_name}.GetContent() completed in {sw.ElapsedMilliseconds}ms");
            return result;
        }

        public void SetContent(string content)
        {
            Console.WriteLine($"    📝 [LoggingProxy] {_name}.SetContent() called with {content.Length} chars");
            _document.SetContent(content);
            Console.WriteLine($"    📝 [LoggingProxy] {_name}.SetContent() completed");
        }

        public string GetMetadata()
        {
            Console.WriteLine($"    📝 [LoggingProxy] {_name}.GetMetadata() called");
            return _document.GetMetadata();
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
            Console.WriteLine("║        PROXY PATTERN DEMO                  ║");
            Console.WriteLine("║        Multiple Proxy Types                ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Virtual Proxy (Lazy Loading)
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  VIRTUAL PROXY - Lazy Loading");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            // Create proxies - no actual loading happens yet
            var doc1 = new LazyDocumentProxy("report.pdf");
            var doc2 = new LazyDocumentProxy("data.xlsx");
            
            Console.WriteLine("\n  Proxies created. Documents NOT loaded yet.");
            Console.WriteLine($"  doc1 metadata: {doc1.GetMetadata()}");
            
            Console.WriteLine("\n  Now accessing doc1 content (triggers loading):");
            string content = doc1.GetContent();
            Console.WriteLine($"  Content: {content[..50]}...");

            Console.WriteLine("\n  Accessing doc1 again (already loaded):");
            content = doc1.GetContent();
            Console.WriteLine($"  Content: {content[..50]}...");

            // doc2 is never loaded because we never access it!

            // ─────────────────────────────────────────────
            // Demo 2: Protection Proxy (Access Control)
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  PROTECTION PROXY - Access Control");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            var secretDoc = new HeavyDocument("secret.doc");
            
            var guest = new User("Guest User", AccessLevel.Guest);
            var admin = new User("Admin User", AccessLevel.Admin);

            Console.WriteLine("\n  Guest trying to read:");
            var guestProxy = new SecureDocumentProxy(secretDoc, guest);
            try
            {
                guestProxy.GetContent();
            }
            catch (UnauthorizedAccessException)
            {
                Console.WriteLine("    Exception caught: Access denied");
            }

            Console.WriteLine("\n  Admin trying to read:");
            var adminProxy = new SecureDocumentProxy(secretDoc, admin);
            adminProxy.GetContent();

            Console.WriteLine("\n  Admin trying to write:");
            adminProxy.SetContent("New secret content");

            // ─────────────────────────────────────────────
            // Demo 3: Caching Proxy
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  CACHING PROXY - Performance Optimization");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            var slowService = new SlowDataService();
            var cachedService = new CachingProxy(slowService, TimeSpan.FromSeconds(30));

            Console.WriteLine("  First request (cache miss):");
            var sw = Stopwatch.StartNew();
            var result = cachedService.FetchData("users");
            Console.WriteLine($"  Result: {result}");
            Console.WriteLine($"  Time: {sw.ElapsedMilliseconds}ms\n");

            Console.WriteLine("  Second request (cache hit):");
            sw.Restart();
            result = cachedService.FetchData("users");
            Console.WriteLine($"  Result: {result}");
            Console.WriteLine($"  Time: {sw.ElapsedMilliseconds}ms\n");

            Console.WriteLine("  Different query (cache miss):");
            sw.Restart();
            result = cachedService.FetchData("orders");
            Console.WriteLine($"  Result: {result}");
            Console.WriteLine($"  Time: {sw.ElapsedMilliseconds}ms");

            Console.WriteLine($"\n  Cache size: {cachedService.CacheSize} entries");

            // ─────────────────────────────────────────────
            // Demo 4: Logging Proxy
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  LOGGING PROXY - Audit Trail");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            var realDoc = new HeavyDocument("audit.log");
            var loggingDoc = new LoggingDocumentProxy(realDoc, "AuditDocument");

            Console.WriteLine("\n  Operations with logging:\n");
            loggingDoc.GetContent();
            loggingDoc.SetContent("New audit entry added");
            loggingDoc.GetMetadata();

            // ─────────────────────────────────────────────
            // Demo 5: Stacked Proxies
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  STACKED PROXIES - Combining Features");
            Console.WriteLine("═══════════════════════════════════════════════\n");

            // Stack proxies: Logging → Security → Lazy → Real
            IDocument document = new LazyDocumentProxy("stacked.doc");
            document = new SecureDocumentProxy(document, admin);
            document = new LoggingDocumentProxy(document, "StackedDoc");

            Console.WriteLine("  Accessing stacked document:\n");
            document.GetContent();

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
| **ORM Frameworks** | Entity Framework lazy loading of related entities |
| **Web Services** | WCF/gRPC client proxies for remote calls |
| **Security** | Authorization checks before accessing resources |
| **Caching** | Redis/memory cache wrappers |
| **Images** | Load thumbnail first, full image on demand |
| **Logging/Metrics** | Wrap services to add telemetry |

---

## When to Use

✅ **Use Proxy when:**

- Need lazy initialization (Virtual Proxy)
- Need access control (Protection Proxy)
- Need local representation of remote object (Remote Proxy)
- Need logging, caching, or smart reference (Logging/Caching Proxy)

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **No Added Value** - If proxy just delegates without adding behavior
2. **Performance Critical** - Each proxy adds method call overhead

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Proxy exposes real subject
public class BadProxy : ISubject
{
    public ISubject RealSubject { get; }  // Clients can bypass proxy!
}

// ✅ GOOD: Encapsulate real subject
public class GoodProxy : ISubject
{
    private readonly ISubject _subject;  // Private - can't be bypassed
}
```

---

## Key Takeaways

- 🎭 **Same Interface**: Proxy and real subject share interface
- 🔒 **Access Control**: Can restrict, log, or modify access
- ⏳ **Lazy Loading**: Defer expensive operations until needed
- 📦 **Transparent**: Clients don't know they're using a proxy
- 🔗 **Stackable**: Multiple proxies can be combined

---

## Related Patterns

- [Adapter](/design-patterns/structural/01-adapter.md) - Changes interface; Proxy keeps same interface
- [Decorator](/design-patterns/structural/04-decorator.md) - Adds behavior; Proxy controls access
- [Facade](/design-patterns/structural/05-facade.md) - Simplifies; Proxy represents
