# Facade Pattern

[← Back to Structural Patterns](/design-patterns/structural/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Facade** is a structural design pattern that provides a simplified interface to a library, a framework, or any other complex set of classes.

---

## Problem

Imagine that you must make your code work with a broad set of objects that belong to a sophisticated library or framework. Ordinarily, you'd need to initialize all of those objects, keep track of dependencies, execute methods in the correct order, and so on.

As a result, the business logic of your classes becomes tightly coupled to the implementation details of 3rd-party classes, making it hard to comprehend and maintain.

---

## Solution

A facade is a class that provides a simple interface to a complex subsystem which contains lots of moving parts. A facade might provide limited functionality in comparison to working with the subsystem directly. However, it includes only those features that clients really care about.

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT                                  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                │ uses simple interface
                                ▼
                    ┌───────────────────────┐
                    │       FACADE          │
                    │───────────────────────│
                    │ + SimpleOperation1()  │
                    │ + SimpleOperation2()  │
                    │ + SimpleOperation3()  │
                    └───────────┬───────────┘
                                │
                                │ delegates to
                                ▼
    ┌──────────────────────────────────────────────────────────┐
    │                  COMPLEX SUBSYSTEM                        │
    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
    │  │SubsysA  │  │SubsysB  │  │SubsysC  │  │SubsysD  │     │
    │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │
    │       │            │            │            │           │
    │       └────────────┴──────┬─────┴────────────┘           │
    │                           │                               │
    │              Complex Dependencies                         │
    └──────────────────────────────────────────────────────────┘
```

---

## Structure

1. **Facade** - Provides convenient access to subsystem functionality
2. **Subsystem Classes** - Implement complex subsystem functionality
3. **Additional Facade** - (Optional) Prevent polluting single facade with unrelated features
4. **Client** - Uses the facade instead of calling subsystem objects directly

---

## C# Implementation

### Full Console Example: Home Theater System

```csharp
using System;
using System.Threading;

namespace FacadePattern
{
    // ═══════════════════════════════════════════════════════════════
    // COMPLEX SUBSYSTEM CLASSES
    // ═══════════════════════════════════════════════════════════════
    
    public class Television
    {
        private bool _isOn;
        private int _volume = 20;
        private string _input = "HDMI1";

        public void TurnOn()
        {
            _isOn = true;
            Console.WriteLine("    📺 TV: Turning on");
            Thread.Sleep(200);
        }

        public void TurnOff()
        {
            _isOn = false;
            Console.WriteLine("    📺 TV: Turning off");
        }

        public void SetInput(string input)
        {
            _input = input;
            Console.WriteLine($"    📺 TV: Input set to {input}");
        }

        public void SetVolume(int level)
        {
            _volume = level;
            Console.WriteLine($"    📺 TV: Volume set to {level}");
        }
    }

    public class SoundSystem
    {
        private bool _isOn;
        private int _volume;
        private string _mode = "Stereo";

        public void TurnOn()
        {
            _isOn = true;
            Console.WriteLine("    🔊 Sound System: Powering on");
            Thread.Sleep(100);
        }

        public void TurnOff()
        {
            _isOn = false;
            Console.WriteLine("    🔊 Sound System: Powering off");
        }

        public void SetVolume(int level)
        {
            _volume = level;
            Console.WriteLine($"    🔊 Sound System: Volume at {level}%");
        }

        public void SetSurroundMode()
        {
            _mode = "Surround 7.1";
            Console.WriteLine("    🔊 Sound System: Surround mode enabled");
        }

        public void SetStereoMode()
        {
            _mode = "Stereo";
            Console.WriteLine("    🔊 Sound System: Stereo mode enabled");
        }
    }

    public class StreamingPlayer
    {
        private bool _isOn;
        private string _currentContent = "";

        public void TurnOn()
        {
            _isOn = true;
            Console.WriteLine("    🎬 Streaming Player: Starting up");
            Thread.Sleep(300);
        }

        public void TurnOff()
        {
            _isOn = false;
            Console.WriteLine("    🎬 Streaming Player: Shutting down");
        }

        public void Play(string title)
        {
            _currentContent = title;
            Console.WriteLine($"    🎬 Streaming Player: Playing \"{title}\"");
        }

        public void Pause()
        {
            Console.WriteLine("    🎬 Streaming Player: Paused");
        }

        public void Stop()
        {
            Console.WriteLine("    🎬 Streaming Player: Stopped");
            _currentContent = "";
        }
    }

    public class GamingConsole
    {
        private bool _isOn;
        private string _currentGame = "";

        public void TurnOn()
        {
            _isOn = true;
            Console.WriteLine("    🎮 Gaming Console: Booting up");
            Thread.Sleep(400);
        }

        public void TurnOff()
        {
            _isOn = false;
            Console.WriteLine("    🎮 Gaming Console: Shutting down");
        }

        public void LoadGame(string game)
        {
            _currentGame = game;
            Console.WriteLine($"    🎮 Gaming Console: Loading \"{game}\"");
            Thread.Sleep(200);
        }
    }

    public class SmartLights
    {
        private int _brightness = 100;
        private string _color = "White";
        private bool _isOn = true;

        public void TurnOn()
        {
            _isOn = true;
            Console.WriteLine("    💡 Smart Lights: On");
        }

        public void TurnOff()
        {
            _isOn = false;
            Console.WriteLine("    💡 Smart Lights: Off");
        }

        public void Dim(int percentage)
        {
            _brightness = percentage;
            Console.WriteLine($"    💡 Smart Lights: Dimmed to {percentage}%");
        }

        public void SetColor(string color)
        {
            _color = color;
            Console.WriteLine($"    💡 Smart Lights: Color set to {color}");
        }

        public void SetTheaterMode()
        {
            _brightness = 10;
            _color = "Warm";
            Console.WriteLine("    💡 Smart Lights: Theater mode (10%, Warm)");
        }
    }

    public class Projector
    {
        private bool _isOn;
        private string _input = "HDMI";

        public void TurnOn()
        {
            _isOn = true;
            Console.WriteLine("    📽️ Projector: Warming up lamp");
            Thread.Sleep(500);
            Console.WriteLine("    📽️ Projector: Ready");
        }

        public void TurnOff()
        {
            Console.WriteLine("    📽️ Projector: Cooling down");
            _isOn = false;
        }

        public void SetInput(string input)
        {
            _input = input;
            Console.WriteLine($"    📽️ Projector: Input set to {input}");
        }

        public void SetWideScreenMode()
        {
            Console.WriteLine("    📽️ Projector: Wide screen mode (16:9)");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FACADE
    // ═══════════════════════════════════════════════════════════════
    
    /// <summary>
    /// The Facade class provides a simple interface to the complex home theater subsystem.
    /// </summary>
    public class HomeTheaterFacade
    {
        private readonly Television _tv;
        private readonly SoundSystem _soundSystem;
        private readonly StreamingPlayer _streamingPlayer;
        private readonly GamingConsole _gamingConsole;
        private readonly SmartLights _lights;
        private readonly Projector _projector;

        public HomeTheaterFacade(
            Television tv,
            SoundSystem soundSystem,
            StreamingPlayer streamingPlayer,
            GamingConsole gamingConsole,
            SmartLights lights,
            Projector projector)
        {
            _tv = tv;
            _soundSystem = soundSystem;
            _streamingPlayer = streamingPlayer;
            _gamingConsole = gamingConsole;
            _lights = lights;
            _projector = projector;
        }

        /// <summary>
        /// Simple operation: Watch a movie
        /// Behind the scenes: 8+ operations on multiple subsystems
        /// </summary>
        public void WatchMovie(string movie)
        {
            Console.WriteLine($"\n  🎬 Starting movie: \"{movie}\"");
            Console.WriteLine("  ────────────────────────────────────────\n");
            
            _lights.SetTheaterMode();
            _projector.TurnOn();
            _projector.SetWideScreenMode();
            _soundSystem.TurnOn();
            _soundSystem.SetSurroundMode();
            _soundSystem.SetVolume(50);
            _streamingPlayer.TurnOn();
            _streamingPlayer.Play(movie);
            
            Console.WriteLine("\n  ────────────────────────────────────────");
            Console.WriteLine("  ✅ Enjoy your movie!\n");
        }

        /// <summary>
        /// Simple operation: End movie
        /// </summary>
        public void EndMovie()
        {
            Console.WriteLine("\n  🛑 Ending movie session");
            Console.WriteLine("  ────────────────────────────────────────\n");
            
            _streamingPlayer.Stop();
            _streamingPlayer.TurnOff();
            _soundSystem.TurnOff();
            _projector.TurnOff();
            _lights.TurnOn();
            
            Console.WriteLine("\n  ────────────────────────────────────────");
            Console.WriteLine("  ✅ Movie ended. Lights restored.\n");
        }

        /// <summary>
        /// Simple operation: Start gaming session
        /// </summary>
        public void PlayGame(string game)
        {
            Console.WriteLine($"\n  🎮 Starting game: \"{game}\"");
            Console.WriteLine("  ────────────────────────────────────────\n");
            
            _lights.Dim(50);
            _lights.SetColor("Blue");
            _tv.TurnOn();
            _tv.SetInput("HDMI2");
            _soundSystem.TurnOn();
            _soundSystem.SetStereoMode();
            _soundSystem.SetVolume(40);
            _gamingConsole.TurnOn();
            _gamingConsole.LoadGame(game);
            
            Console.WriteLine("\n  ────────────────────────────────────────");
            Console.WriteLine("  ✅ Game ready! Have fun!\n");
        }

        /// <summary>
        /// Simple operation: End gaming
        /// </summary>
        public void EndGaming()
        {
            Console.WriteLine("\n  🛑 Ending gaming session");
            Console.WriteLine("  ────────────────────────────────────────\n");
            
            _gamingConsole.TurnOff();
            _soundSystem.TurnOff();
            _tv.TurnOff();
            _lights.TurnOn();
            
            Console.WriteLine("\n  ────────────────────────────────────────");
            Console.WriteLine("  ✅ Gaming ended.\n");
        }

        /// <summary>
        /// Simple operation: Listen to music
        /// </summary>
        public void ListenToMusic()
        {
            Console.WriteLine("\n  🎵 Starting music mode");
            Console.WriteLine("  ────────────────────────────────────────\n");
            
            _lights.Dim(70);
            _lights.SetColor("Purple");
            _soundSystem.TurnOn();
            _soundSystem.SetStereoMode();
            _soundSystem.SetVolume(60);
            
            Console.WriteLine("\n  ────────────────────────────────────────");
            Console.WriteLine("  ✅ Music mode ready!\n");
        }

        /// <summary>
        /// Simple operation: Everything off
        /// </summary>
        public void AllOff()
        {
            Console.WriteLine("\n  ⚡ Shutting down all systems");
            Console.WriteLine("  ────────────────────────────────────────\n");
            
            _streamingPlayer.TurnOff();
            _gamingConsole.TurnOff();
            _soundSystem.TurnOff();
            _projector.TurnOff();
            _tv.TurnOff();
            _lights.TurnOff();
            
            Console.WriteLine("\n  ────────────────────────────────────────");
            Console.WriteLine("  ✅ All systems off. Goodbye!\n");
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
            Console.WriteLine("║        FACADE PATTERN DEMO                 ║");
            Console.WriteLine("║        Home Theater System                 ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // Create all the subsystem components
            var tv = new Television();
            var sound = new SoundSystem();
            var streaming = new StreamingPlayer();
            var gaming = new GamingConsole();
            var lights = new SmartLights();
            var projector = new Projector();

            // Create the facade
            var homeTheater = new HomeTheaterFacade(
                tv, sound, streaming, gaming, lights, projector);

            // ─────────────────────────────────────────────
            // Demo: Using simple facade methods
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  MOVIE NIGHT");
            Console.WriteLine("═══════════════════════════════════════════════");

            // One simple call instead of managing 6+ devices
            homeTheater.WatchMovie("Interstellar");
            
            Console.WriteLine("  [Press Enter to end movie...]");
            Console.ReadLine();
            
            homeTheater.EndMovie();

            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  GAMING SESSION");
            Console.WriteLine("═══════════════════════════════════════════════");

            homeTheater.PlayGame("Elden Ring");
            
            Console.WriteLine("  [Press Enter to end gaming...]");
            Console.ReadLine();
            
            homeTheater.EndGaming();

            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  QUICK SHUTDOWN");
            Console.WriteLine("═══════════════════════════════════════════════");

            homeTheater.AllOff();

            // ─────────────────────────────────────────────
            // Benefits visualization
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  FACADE BENEFITS");
            Console.WriteLine("═══════════════════════════════════════════════");

            Console.WriteLine(@"
  Without Facade (Client manages everything):
  ────────────────────────────────────────────
  lights.SetTheaterMode();
  projector.TurnOn();
  projector.SetWideScreenMode();
  soundSystem.TurnOn();
  soundSystem.SetSurroundMode();
  soundSystem.SetVolume(50);
  streamingPlayer.TurnOn();
  streamingPlayer.Play(movie);
  // Client must know the order, handle errors, etc.

  With Facade (Simple interface):
  ────────────────────────────────────────────
  homeTheater.WatchMovie(""Interstellar"");
  // Done! Facade handles all complexity.
");

            Console.WriteLine("✨ Demo completed! Press any key to exit...");
            Console.ReadKey();
        }
    }
}
```

---

## Real-World Use Cases

| Domain | Example |
|--------|---------|
| **Database Access** | Entity Framework DbContext simplifies SQL |
| **File Compression** | ZipFile class wraps complex compression |
| **HTTP Clients** | HttpClient simplifies raw socket operations |
| **Logging Frameworks** | Simple Log() methods hide complex outputs |
| **Payment Gateways** | Simple Charge() hides multi-step processes |
| **Video Encoding** | FFmpeg wrapper libraries |

---

## When to Use

✅ **Use Facade when:**

- You need a simple interface to a complex subsystem
- You want to layer your subsystems (facade per layer)
- You want to decouple clients from subsystem implementation

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **God Facade** - Facade becomes too large with too many methods
2. **Forced Usage** - Don't prevent direct subsystem access when needed

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Facade that does too much
public class GodFacade
{
    public void DoEverythingForModuleA() { }
    public void DoEverythingForModuleB() { }
    public void DoEverythingForModuleC() { }
    // 50+ more methods...
}

// ✅ GOOD: Focused facades
public class ModuleAFacade { /* A-related operations */ }
public class ModuleBFacade { /* B-related operations */ }
```

---

## Key Takeaways

- 🎯 **Simplicity**: Provides simple interface to complex systems
- 📦 **Encapsulation**: Hides subsystem complexity from clients
- 🔓 **Non-Restrictive**: Doesn't prevent direct subsystem access
- 🏗️ **Layering**: Helps define entry points to each subsystem level

---

## Related Patterns

- [Adapter](/design-patterns/structural/01-adapter.md) - Changes interface; Facade simplifies
- [Abstract Factory](/design-patterns/creational/02-abstract-factory.md) - Can use Facade to hide creation complexity
- [Singleton](/design-patterns/creational/05-singleton.md) - Facade is often a Singleton
- [Mediator](/design-patterns/behavioral/04-mediator.md) - Both reduce coupling, but Mediator adds behavior
