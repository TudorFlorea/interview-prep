# Iterator Pattern

[← Back to Behavioral Patterns](00-index.md) | [← Back to Main Index](../00-index.md)

---

## Intent

**Iterator** is a behavioral design pattern that lets you traverse elements of a collection without exposing its underlying representation (list, stack, tree, etc.).

---

## Problem

Collections can be simple lists or complex trees, graphs, or other structures. But no matter how a collection is structured, you need a way to access each element without exposing the internal structure.

Adding traversal code to the collection couples it to specific traversal algorithms. Different clients might need different traversal methods.

---

## Solution

The Iterator pattern extracts the traversal behavior into a separate object called an iterator. The iterator encapsulates all traversal details.

```
┌────────────────────────────────────────────────────────────────┐
│  Client                                                         │
│  ─────                                                         │
│  Uses IIterator to traverse, doesn't know collection internals │
└────────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌──────────────────┐             ┌──────────────────────┐
│  &lt;&lt;interface>>   │             │    &lt;&lt;interface>>     │
│  IIterator&lt;T>    │             │ IIterableCollection  │
│──────────────────│             │──────────────────────│
│ + Current: T     │◄────────────│ + CreateIterator()   │
│ + MoveNext()     │   returns   └──────────────────────┘
│ + Reset()        │
└──────────────────┘
```

---

## Structure

1. **Iterator** - Interface for accessing and traversing elements
2. **Concrete Iterator** - Implements traversal algorithm
3. **Iterable Collection** - Interface declaring method to get iterator
4. **Concrete Collection** - Returns iterator instances

---

## C# Implementation

### Full Console Example: Custom Iterators

```csharp
using System;
using System.Collections;
using System.Collections.Generic;

namespace IteratorPattern
{
    // ═══════════════════════════════════════════════════════════════
    // CUSTOM ITERATOR - Binary Tree Traversal
    // ═══════════════════════════════════════════════════════════════
    
    public class TreeNode&lt;T>
    {
        public T Value { get; set; }
        public TreeNode&lt;T>? Left { get; set; }
        public TreeNode&lt;T>? Right { get; set; }

        public TreeNode(T value)
        {
            Value = value;
        }
    }

    public class BinaryTree&lt;T> : IEnumerable&lt;T>
    {
        public TreeNode&lt;T>? Root { get; set; }

        // Default iterator (in-order)
        public IEnumerator&lt;T> GetEnumerator() => new InOrderIterator&lt;T>(Root);
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

        // Additional traversal methods
        public IEnumerable&lt;T> PreOrder() => new PreOrderEnumerable&lt;T>(Root);
        public IEnumerable&lt;T> PostOrder() => new PostOrderEnumerable&lt;T>(Root);
        public IEnumerable&lt;T> BreadthFirst() => new BreadthFirstEnumerable&lt;T>(Root);
    }

    // In-Order Iterator (Left -> Node -> Right)
    public class InOrderIterator&lt;T> : IEnumerator&lt;T>
    {
        private readonly Stack&lt;TreeNode&lt;T>> _stack = new();
        private TreeNode&lt;T>? _current;
        private readonly TreeNode&lt;T>? _root;

        public InOrderIterator(TreeNode&lt;T>? root)
        {
            _root = root;
            Reset();
        }

        public T Current => _current!.Value;
        object IEnumerator.Current => Current!;

        public bool MoveNext()
        {
            while (_stack.Count > 0 || _current != null)
            {
                while (_current != null)
                {
                    _stack.Push(_current);
                    _current = _current.Left;
                }

                _current = _stack.Pop();
                var result = _current;
                _current = _current.Right;
                
                if (result != null)
                {
                    _current = result.Right;
                    return true;
                }
            }
            return false;
        }

        public void Reset()
        {
            _stack.Clear();
            _current = _root;
        }

        public void Dispose() { }
    }

    // Pre-Order Enumerable (Node -> Left -> Right)
    public class PreOrderEnumerable&lt;T> : IEnumerable&lt;T>
    {
        private readonly TreeNode&lt;T>? _root;
        public PreOrderEnumerable(TreeNode&lt;T>? root) => _root = root;
        
        public IEnumerator&lt;T> GetEnumerator()
        {
            if (_root == null) yield break;
            
            var stack = new Stack&lt;TreeNode&lt;T>>();
            stack.Push(_root);
            
            while (stack.Count > 0)
            {
                var node = stack.Pop();
                yield return node.Value;
                
                if (node.Right != null) stack.Push(node.Right);
                if (node.Left != null) stack.Push(node.Left);
            }
        }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

    // Post-Order Enumerable (Left -> Right -> Node)
    public class PostOrderEnumerable&lt;T> : IEnumerable&lt;T>
    {
        private readonly TreeNode&lt;T>? _root;
        public PostOrderEnumerable(TreeNode&lt;T>? root) => _root = root;
        
        public IEnumerator&lt;T> GetEnumerator()
        {
            var result = new List&lt;T>();
            PostOrderTraverse(_root, result);
            return result.GetEnumerator();
        }

        private void PostOrderTraverse(TreeNode&lt;T>? node, List&lt;T> result)
        {
            if (node == null) return;
            PostOrderTraverse(node.Left, result);
            PostOrderTraverse(node.Right, result);
            result.Add(node.Value);
        }

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

    // Breadth-First Enumerable (Level by Level)
    public class BreadthFirstEnumerable&lt;T> : IEnumerable&lt;T>
    {
        private readonly TreeNode&lt;T>? _root;
        public BreadthFirstEnumerable(TreeNode&lt;T>? root) => _root = root;
        
        public IEnumerator&lt;T> GetEnumerator()
        {
            if (_root == null) yield break;
            
            var queue = new Queue&lt;TreeNode&lt;T>>();
            queue.Enqueue(_root);
            
            while (queue.Count > 0)
            {
                var node = queue.Dequeue();
                yield return node.Value;
                
                if (node.Left != null) queue.Enqueue(node.Left);
                if (node.Right != null) queue.Enqueue(node.Right);
            }
        }
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

    // ═══════════════════════════════════════════════════════════════
    // CUSTOM COLLECTION - Playlist with Multiple Iterators
    // ═══════════════════════════════════════════════════════════════
    
    public class Song
    {
        public string Title { get; }
        public string Artist { get; }
        public TimeSpan Duration { get; }

        public Song(string title, string artist, int seconds)
        {
            Title = title;
            Artist = artist;
            Duration = TimeSpan.FromSeconds(seconds);
        }

        public override string ToString() => $"{Artist} - {Title} ({Duration:mm\\:ss})";
    }

    public class Playlist : IEnumerable&lt;Song>
    {
        private readonly List&lt;Song> _songs = new();
        private readonly Random _random = new();

        public void AddSong(Song song) => _songs.Add(song);
        public int Count => _songs.Count;

        // Default: sequential
        public IEnumerator&lt;Song> GetEnumerator() => _songs.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

        // Shuffle iterator
        public IEnumerable&lt;Song> Shuffle()
        {
            var shuffled = new List&lt;Song>(_songs);
            for (int i = shuffled.Count - 1; i > 0; i--)
            {
                int j = _random.Next(i + 1);
                (shuffled[i], shuffled[j]) = (shuffled[j], shuffled[i]);
            }
            return shuffled;
        }

        // Reverse iterator
        public IEnumerable&lt;Song> Reverse()
        {
            for (int i = _songs.Count - 1; i >= 0; i--)
            {
                yield return _songs[i];
            }
        }

        // Filter iterator
        public IEnumerable&lt;Song> ByArtist(string artist)
        {
            foreach (var song in _songs)
            {
                if (song.Artist.Equals(artist, StringComparison.OrdinalIgnoreCase))
                    yield return song;
            }
        }

        // Repeat iterator
        public IEnumerable&lt;Song> RepeatForever()
        {
            while (true)
            {
                foreach (var song in _songs)
                {
                    yield return song;
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PAGED ITERATOR - For Large Collections
    // ═══════════════════════════════════════════════════════════════
    
    public class PagedIterator&lt;T> : IEnumerable&lt;IEnumerable&lt;T>>
    {
        private readonly IEnumerable&lt;T> _source;
        private readonly int _pageSize;

        public PagedIterator(IEnumerable&lt;T> source, int pageSize)
        {
            _source = source;
            _pageSize = pageSize;
        }

        public IEnumerator&lt;IEnumerable&lt;T>> GetEnumerator()
        {
            var page = new List&lt;T>();
            foreach (var item in _source)
            {
                page.Add(item);
                if (page.Count == _pageSize)
                {
                    yield return page;
                    page = new List&lt;T>();
                }
            }
            if (page.Count > 0)
                yield return page;
        }

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT CODE
    // ═══════════════════════════════════════════════════════════════
    
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("╔════════════════════════════════════════════╗");
            Console.WriteLine("║        ITERATOR PATTERN DEMO               ║");
            Console.WriteLine("║        Custom Collection Traversal         ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Binary Tree Traversals
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  BINARY TREE TRAVERSAL ITERATORS");
            Console.WriteLine("═══════════════════════════════════════════════");

            //         4
            //        / \
            //       2   6
            //      / \ / \
            //     1  3 5  7

            var tree = new BinaryTree&lt;int>
            {
                Root = new TreeNode&lt;int>(4)
                {
                    Left = new TreeNode&lt;int>(2)
                    {
                        Left = new TreeNode&lt;int>(1),
                        Right = new TreeNode&lt;int>(3)
                    },
                    Right = new TreeNode&lt;int>(6)
                    {
                        Left = new TreeNode&lt;int>(5),
                        Right = new TreeNode&lt;int>(7)
                    }
                }
            };

            Console.WriteLine("\n  Tree structure:");
            Console.WriteLine("         4");
            Console.WriteLine("        / \\");
            Console.WriteLine("       2   6");
            Console.WriteLine("      / \\ / \\");
            Console.WriteLine("     1  3 5  7");

            Console.WriteLine("\n  Pre-Order (Node→Left→Right): " + 
                string.Join(", ", tree.PreOrder()));
            Console.WriteLine("  In-Order (Left→Node→Right):  " + 
                string.Join(", ", tree));
            Console.WriteLine("  Post-Order (Left→Right→Node): " + 
                string.Join(", ", tree.PostOrder()));
            Console.WriteLine("  Breadth-First (Level):       " + 
                string.Join(", ", tree.BreadthFirst()));

            // ─────────────────────────────────────────────
            // Demo 2: Playlist Iterators
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  PLAYLIST ITERATORS");
            Console.WriteLine("═══════════════════════════════════════════════");

            var playlist = new Playlist();
            playlist.AddSong(new Song("Bohemian Rhapsody", "Queen", 354));
            playlist.AddSong(new Song("Hotel California", "Eagles", 390));
            playlist.AddSong(new Song("Stairway to Heaven", "Led Zeppelin", 482));
            playlist.AddSong(new Song("We Will Rock You", "Queen", 122));
            playlist.AddSong(new Song("Comfortably Numb", "Pink Floyd", 383));

            Console.WriteLine("\n  📋 Sequential order:");
            foreach (var song in playlist)
            {
                Console.WriteLine($"    🎵 {song}");
            }

            Console.WriteLine("\n  🔀 Shuffled:");
            foreach (var song in playlist.Shuffle())
            {
                Console.WriteLine($"    🎵 {song}");
            }

            Console.WriteLine("\n  ⏪ Reverse:");
            foreach (var song in playlist.Reverse())
            {
                Console.WriteLine($"    🎵 {song}");
            }

            Console.WriteLine("\n  🔍 Filter by Artist (Queen):");
            foreach (var song in playlist.ByArtist("Queen"))
            {
                Console.WriteLine($"    🎵 {song}");
            }

            // ─────────────────────────────────────────────
            // Demo 3: Paged Iterator
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  PAGED ITERATOR");
            Console.WriteLine("═══════════════════════════════════════════════");

            var numbers = Enumerable.Range(1, 23);
            var pagedIterator = new PagedIterator&lt;int>(numbers, 5);

            int pageNum = 1;
            foreach (var page in pagedIterator)
            {
                Console.WriteLine($"\n  📄 Page {pageNum++}: [{string.Join(", ", page)}]");
            }

            // ─────────────────────────────────────────────
            // Demo 4: C# Built-in Iterator Support
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  C# ITERATOR FEATURES (yield return)");
            Console.WriteLine("═══════════════════════════════════════════════");

            Console.WriteLine("\n  Fibonacci sequence (first 10):");
            Console.Write("    ");
            foreach (var fib in Fibonacci().Take(10))
            {
                Console.Write($"{fib} ");
            }

            Console.WriteLine("\n\n  Prime numbers (first 10):");
            Console.Write("    ");
            foreach (var prime in Primes().Take(10))
            {
                Console.Write($"{prime} ");
            }

            Console.WriteLine("\n\n✨ Demo completed! Press any key to exit...");
            Console.ReadKey();
        }

        static IEnumerable&lt;long> Fibonacci()
        {
            long a = 0, b = 1;
            yield return a;
            yield return b;
            
            while (true)
            {
                long next = a + b;
                yield return next;
                a = b;
                b = next;
            }
        }

        static IEnumerable&lt;int> Primes()
        {
            yield return 2;
            
            for (int n = 3; ; n += 2)
            {
                bool isPrime = true;
                for (int i = 3; i * i &lt;= n; i += 2)
                {
                    if (n % i == 0)
                    {
                        isPrime = false;
                        break;
                    }
                }
                if (isPrime) yield return n;
            }
        }
    }
}
```

---

## Real-World Use Cases

| Domain | Example |
|--------|---------|
| **Collections** | List, Dictionary, Set traversal |
| **Database** | Cursor-based result iteration |
| **File Systems** | Directory tree traversal |
| **UI Components** | Menu item navigation |
| **Parsing** | Token stream iteration |
| **Networking** | Paginated API responses |

---

## When to Use

✅ **Use Iterator when:**

- You want to access a collection's elements without exposing its representation
- You need multiple traversal algorithms for the same collection
- You want a uniform interface for traversing different collections

---

## C# Iterator Features

C# has built-in iterator support via `yield return`:

```csharp
// The yield keyword makes creating iterators trivial
public IEnumerable&lt;int> GetEvenNumbers(int max)
{
    for (int i = 0; i &lt;= max; i += 2)
    {
        yield return i;  // Lazy evaluation!
    }
}
```

---

## Anti-Patterns & Pitfalls

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Modifying collection during iteration
foreach (var item in collection)
{
    if (ShouldRemove(item))
        collection.Remove(item);  // Exception!
}

// ✅ GOOD: Use ToList() or iterate backwards
foreach (var item in collection.ToList())
{
    if (ShouldRemove(item))
        collection.Remove(item);  // Safe - iterating copy
}
```

---

## Key Takeaways

- 🔄 **Uniform Interface**: Same iteration code works with different collections
- 📦 **Encapsulation**: Collection internals stay hidden
- 🎯 **Single Responsibility**: Traversal logic separated from collection
- ⚡ **Lazy Evaluation**: C# `yield` enables efficient lazy iteration

---

## Related Patterns

- [Composite](../structural/03-composite.md) - Iterators often traverse composites
- [Factory Method](../creational/01-factory-method.md) - Used to create iterators
- [Visitor](10-visitor.md) - Can use iterator for traversal
- [Memento](05-memento.md) - Iterator can use memento to capture state
