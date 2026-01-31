# Flyweight Pattern

[← Back to Structural Patterns](00-index.md) | [← Back to Main Index](../00-index.md)

---

## Intent

**Flyweight** is a structural design pattern that lets you fit more objects into the available amount of RAM by sharing common parts of state between multiple objects instead of keeping all of the data in each object.

---

## Problem

You're building a game with millions of particles for bullets, missiles, and shrapnel. Each particle has color, sprite, position, direction, and speed.

After running the game, it crashes due to insufficient RAM. Each particle object consumes too much memory, and there are too many of them.

---

## Solution

Upon closer look, you might notice that the particle's color and sprite are almost always the same, while position, direction, and speed change per particle.

The constant data of an object is called **intrinsic state** (shared). The varying data is called **extrinsic state** (unique). The Flyweight pattern suggests storing intrinsic state inside the objects and passing extrinsic state to methods.

```
┌─────────────────────────────────────────────────────────────────┐
│   Before Flyweight:                                              │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                  │
│   │Particle│ │Particle│ │Particle│ │Particle│  × 1,000,000     │
│   │color   │ │color   │ │color   │ │color   │                  │
│   │sprite  │ │sprite  │ │sprite  │ │sprite  │  = HUGE MEMORY   │
│   │x, y    │ │x, y    │ │x, y    │ │x, y    │                  │
│   └────────┘ └────────┘ └────────┘ └────────┘                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│   After Flyweight:                                               │
│                                                                  │
│   Shared Flyweights (Intrinsic):     Contexts (Extrinsic):      │
│   ┌───────────────┐                  ┌───────┐ ┌───────┐        │
│   │ BulletType    │ ◄────────────────│ x, y  │ │ x, y  │        │
│   │ color, sprite │                  │ speed │ │ speed │ × 1M   │
│   └───────────────┘                  └───────┘ └───────┘        │
│                                                                  │
│   = MUCH LESS MEMORY                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Structure

1. **Flyweight** - Contains intrinsic state (shared, immutable)
2. **Context** - Contains extrinsic state (unique, changes)
3. **Flyweight Factory** - Creates and manages flyweight objects
4. **Client** - Stores extrinsic state and passes it when using flyweights

---

## C# Implementation

### Full Console Example: Text Editor Character Rendering

```csharp
using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace FlyweightPattern
{
    // ═══════════════════════════════════════════════════════════════
    // FLYWEIGHT (Intrinsic State - Shared)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Flyweight stores shared state (intrinsic).
    /// Must be immutable!
    /// </summary>
    public class CharacterStyle
    {
        // Intrinsic state - shared across many characters
        public string FontFamily { get; }
        public int FontSize { get; }
        public string Color { get; }
        public bool Bold { get; }
        public bool Italic { get; }

        public CharacterStyle(string fontFamily, int fontSize, string color, bool bold, bool italic)
        {
            FontFamily = fontFamily;
            FontSize = fontSize;
            Color = color;
            Bold = bold;
            Italic = italic;
        }

        public void Render(char character, int x, int y)
        {
            string style = "";
            if (Bold) style += "B";
            if (Italic) style += "I";
            if (string.IsNullOrEmpty(style)) style = "R";

            // In real app, this would render to screen
            // Console.WriteLine($"    [{character}] at ({x},{y}) - {FontFamily} {FontSize}pt {Color} [{style}]");
        }

        public override string ToString()
        {
            return $"{FontFamily}-{FontSize}-{Color}-{(Bold ? "B" : "")}{(Italic ? "I" : "")}";
        }

        // For use as dictionary key
        public override int GetHashCode()
        {
            return HashCode.Combine(FontFamily, FontSize, Color, Bold, Italic);
        }

        public override bool Equals(object? obj)
        {
            if (obj is CharacterStyle other)
            {
                return FontFamily == other.FontFamily &&
                       FontSize == other.FontSize &&
                       Color == other.Color &&
                       Bold == other.Bold &&
                       Italic == other.Italic;
            }
            return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FLYWEIGHT FACTORY
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Factory creates and manages Flyweight objects.
    /// Ensures flyweights are shared properly.
    /// </summary>
    public class CharacterStyleFactory
    {
        private readonly Dictionary&lt;string, CharacterStyle> _styles = new();

        public CharacterStyle GetStyle(string fontFamily, int fontSize, string color, bool bold = false, bool italic = false)
        {
            string key = $"{fontFamily}-{fontSize}-{color}-{bold}-{italic}";

            if (!_styles.ContainsKey(key))
            {
                _styles[key] = new CharacterStyle(fontFamily, fontSize, color, bold, italic);
            }

            return _styles[key];
        }

        public int GetStyleCount() => _styles.Count;

        public void ListStyles()
        {
            Console.WriteLine("\n  Cached Styles:");
            foreach (var kvp in _styles)
            {
                Console.WriteLine($"    • {kvp.Key}");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTEXT (Extrinsic State - Unique per character)
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Context stores extrinsic state and references a flyweight.
    /// </summary>
    public class Character
    {
        // Extrinsic state - unique to each character
        public char Char { get; }
        public int X { get; set; }
        public int Y { get; set; }

        // Reference to shared flyweight
        private readonly CharacterStyle _style;

        public Character(char c, int x, int y, CharacterStyle style)
        {
            Char = c;
            X = x;
            Y = y;
            _style = style;
        }

        public void Render()
        {
            _style.Render(Char, X, Y);
        }

        public CharacterStyle Style => _style;
    }

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENT (Uses Flyweight pattern internally)
    // ═══════════════════════════════════════════════════════════════
    
    public class TextDocument
    {
        private readonly List&lt;Character> _characters = new();
        private readonly CharacterStyleFactory _styleFactory;
        private int _cursorX = 0;
        private int _cursorY = 0;

        public TextDocument(CharacterStyleFactory styleFactory)
        {
            _styleFactory = styleFactory;
        }

        public void AddText(string text, string font = "Arial", int size = 12, 
                           string color = "Black", bool bold = false, bool italic = false)
        {
            var style = _styleFactory.GetStyle(font, size, color, bold, italic);

            foreach (char c in text)
            {
                if (c == '\n')
                {
                    _cursorX = 0;
                    _cursorY++;
                }
                else
                {
                    _characters.Add(new Character(c, _cursorX, _cursorY, style));
                    _cursorX++;
                }
            }
        }

        public void Render()
        {
            foreach (var character in _characters)
            {
                character.Render();
            }
        }

        public int CharacterCount => _characters.Count;
        public int UniqueStyleCount => _styleFactory.GetStyleCount();
    }

    // ═══════════════════════════════════════════════════════════════
    // GAME EXAMPLE: Particle System
    // ═══════════════════════════════════════════════════════════════
    
    public class ParticleType
    {
        // Intrinsic (shared) - heavy data
        public string Sprite { get; }
        public string Color { get; }
        public byte[] TextureData { get; }  // Simulated heavy texture

        public ParticleType(string sprite, string color)
        {
            Sprite = sprite;
            Color = color;
            // Simulate 1KB of texture data per particle type
            TextureData = new byte[1024];
        }
    }

    public class Particle
    {
        // Extrinsic (unique) - lightweight
        public float X { get; set; }
        public float Y { get; set; }
        public float SpeedX { get; set; }
        public float SpeedY { get; set; }
        public float Lifetime { get; set; }

        // Reference to shared flyweight
        private readonly ParticleType _type;

        public Particle(ParticleType type, float x, float y, float speedX, float speedY)
        {
            _type = type;
            X = x;
            Y = y;
            SpeedX = speedX;
            SpeedY = speedY;
            Lifetime = 1.0f;
        }

        public void Update(float deltaTime)
        {
            X += SpeedX * deltaTime;
            Y += SpeedY * deltaTime;
            Lifetime -= deltaTime;
        }
    }

    public class ParticleFactory
    {
        private readonly Dictionary&lt;string, ParticleType> _types = new();

        public ParticleType GetParticleType(string sprite, string color)
        {
            string key = $"{sprite}_{color}";
            if (!_types.ContainsKey(key))
            {
                _types[key] = new ParticleType(sprite, color);
            }
            return _types[key];
        }

        public int TypeCount => _types.Count;
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT CODE
    // ═══════════════════════════════════════════════════════════════
    
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("╔════════════════════════════════════════════╗");
            Console.WriteLine("║        FLYWEIGHT PATTERN DEMO              ║");
            Console.WriteLine("║        Memory Optimization                 ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Text Editor
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  TEXT EDITOR - Character Styles");
            Console.WriteLine("═══════════════════════════════════════════════");

            var styleFactory = new CharacterStyleFactory();
            var document = new TextDocument(styleFactory);

            // Add various styled text
            document.AddText("Hello ", "Arial", 12, "Black");
            document.AddText("World", "Arial", 12, "Black", bold: true);
            document.AddText("!\n", "Arial", 12, "Black");
            document.AddText("This is ", "Times New Roman", 14, "Blue");
            document.AddText("styled", "Times New Roman", 14, "Blue", italic: true);
            document.AddText(" text.\n", "Times New Roman", 14, "Blue");
            document.AddText("More Arial text here.", "Arial", 12, "Black");

            Console.WriteLine($"\n  📊 Document Statistics:");
            Console.WriteLine($"     Total characters: {document.CharacterCount}");
            Console.WriteLine($"     Unique styles: {document.UniqueStyleCount}");
            Console.WriteLine($"     Memory saved: {document.CharacterCount - document.UniqueStyleCount} style objects avoided");

            styleFactory.ListStyles();

            // ─────────────────────────────────────────────
            // Demo 2: Particle System (Memory savings)
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  PARTICLE SYSTEM - Memory Comparison");
            Console.WriteLine("═══════════════════════════════════════════════");

            var particleFactory = new ParticleFactory();
            var particles = new List&lt;Particle>();
            var random = new Random(42);

            // Create 100,000 particles with only 5 types
            int particleCount = 100_000;
            string[] sprites = { "bullet", "spark", "smoke", "fire", "debris" };
            string[] colors = { "Red", "Orange", "Yellow", "White", "Gray" };

            Console.WriteLine($"\n  Creating {particleCount:N0} particles...");

            var sw = Stopwatch.StartNew();
            for (int i = 0; i &lt; particleCount; i++)
            {
                string sprite = sprites[random.Next(sprites.Length)];
                string color = colors[random.Next(colors.Length)];
                var type = particleFactory.GetParticleType(sprite, color);
                
                particles.Add(new Particle(
                    type,
                    random.Next(1920),
                    random.Next(1080),
                    (float)(random.NextDouble() * 10 - 5),
                    (float)(random.NextDouble() * 10 - 5)
                ));
            }
            sw.Stop();

            Console.WriteLine($"  ✅ Created in {sw.ElapsedMilliseconds}ms");
            Console.WriteLine($"\n  📊 Memory Analysis:");
            Console.WriteLine($"     Total particles: {particleCount:N0}");
            Console.WriteLine($"     Unique particle types: {particleFactory.TypeCount}");
            
            // Memory calculations (approximate)
            int bytesPerParticle = 20;  // 4 floats + reference
            int bytesPerType = 1024 + 50;  // Texture + properties
            
            long withFlyweight = (particleCount * bytesPerParticle) + (particleFactory.TypeCount * bytesPerType);
            long withoutFlyweight = particleCount * (bytesPerParticle + bytesPerType);
            
            Console.WriteLine($"\n  💾 Memory Usage:");
            Console.WriteLine($"     Without Flyweight: {withoutFlyweight / 1024.0 / 1024.0:F2} MB");
            Console.WriteLine($"     With Flyweight:    {withFlyweight / 1024.0 / 1024.0:F2} MB");
            Console.WriteLine($"     Savings:           {(withoutFlyweight - withFlyweight) / 1024.0 / 1024.0:F2} MB ({100 - (withFlyweight * 100.0 / withoutFlyweight):F1}%)");

            // ─────────────────────────────────────────────
            // Demo 3: Sharing verification
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  VERIFYING FLYWEIGHT SHARING");
            Console.WriteLine("═══════════════════════════════════════════════");

            var style1 = styleFactory.GetStyle("Arial", 12, "Black");
            var style2 = styleFactory.GetStyle("Arial", 12, "Black");
            var style3 = styleFactory.GetStyle("Arial", 12, "Red");

            Console.WriteLine($"\n  style1: Arial 12 Black - HashCode: {style1.GetHashCode()}");
            Console.WriteLine($"  style2: Arial 12 Black - HashCode: {style2.GetHashCode()}");
            Console.WriteLine($"  style3: Arial 12 Red   - HashCode: {style3.GetHashCode()}");
            Console.WriteLine($"\n  style1 == style2: {ReferenceEquals(style1, style2)} (same object!)");
            Console.WriteLine($"  style1 == style3: {ReferenceEquals(style1, style3)} (different objects)");

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
| **Text Editors** | Character formatting (font, size, color) |
| **Game Development** | Particles, trees, bullets, terrain tiles |
| **Web Browsers** | CSS style objects shared across elements |
| **String Interning** | C# and Java intern string literals |
| **Caching** | Immutable cached objects |
| **GIS Systems** | Map icons and markers |

---

## When to Use

✅ **Use Flyweight when:**

- Application uses a large number of similar objects
- Objects can be divided into intrinsic (shared) and extrinsic (unique) state
- Intrinsic state is immutable
- Groups of objects can be replaced by fewer shared objects

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Few Objects** - Flyweight overhead isn't worth it for small counts
2. **Unique State Heavy** - If most state is unique, sharing saves little
3. **Mutable Intrinsic State** - Shared state must be immutable

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Mutable flyweight
public class MutableFlyweight
{
    public string Color { get; set; }  // Can be changed - breaks sharing!
}

// ✅ GOOD: Immutable flyweight
public class ImmutableFlyweight
{
    public string Color { get; }  // Read-only
    public ImmutableFlyweight(string color) => Color = color;
}
```

---

## Key Takeaways

- 💾 **Memory Optimization**: Reduces memory by sharing common state
- 📦 **Intrinsic/Extrinsic Split**: Separate shared from unique state
- 🔒 **Immutability Required**: Shared state must not change
- 🏭 **Factory Managed**: Factory ensures proper sharing

---

## Related Patterns

- [Composite](03-composite.md) - Often uses Flyweight for leaf nodes
- [State](../behavioral/07-state.md) - State objects can be Flyweights
- [Strategy](../behavioral/08-strategy.md) - Strategy objects can be Flyweights
- [Singleton](../creational/05-singleton.md) - Similar sharing concept but for one instance
