# Template Method Pattern

[← Back to Behavioral Patterns](00-index.md) | [← Back to Main Index](../00-index.md)

---

## Intent

**Template Method** is a behavioral design pattern that defines the skeleton of an algorithm in the superclass but lets subclasses override specific steps of the algorithm without changing its structure.

---

## Problem

Imagine you're creating a data mining application that analyzes documents. Users might supply PDF, DOC, or CSV files. While the extraction format differs, processing and analysis are the same. You end up with lots of duplicate code across classes.

---

## Solution

The Template Method pattern suggests breaking down an algorithm into steps, turning them into methods, and putting the sequence of calls inside a single "template method." Subclasses can override specific steps while the overall structure remains unchanged.

```
┌─────────────────────────────────────────────────────────────────┐
│                    AbstractClass                                │
│─────────────────────────────────────────────────────────────────│
│  + templateMethod()     ← Defines algorithm skeleton            │
│    {                                                            │
│      step1();           ← May be abstract or have default      │
│      step2();           ← Subclasses can override              │
│      step3();           ← Hook methods are optional            │
│    }                                                            │
│                                                                 │
│  # step1()              ← abstract (required override)         │
│  # step2()              ← virtual (optional override)          │
│  # step3()              ← hook (empty by default)              │
└─────────────────────────────────────────────────────────────────┘
                              △
         ┌────────────────────┴────────────────────┐
         │                                         │
    ┌────────────┐                          ┌────────────┐
    │ ConcreteA  │                          │ ConcreteB  │
    │────────────│                          │────────────│
    │ step1()    │                          │ step1()    │
    │ step2()    │                          │ step3()    │
    └────────────┘                          └────────────┘
```

---

## Structure

1. **Abstract Class** - Defines template method and algorithm steps
2. **Template Method** - Calls steps in specific order (usually final)
3. **Abstract Steps** - Must be implemented by subclasses
4. **Default Steps** - Have default implementation, can be overridden
5. **Hooks** - Empty methods subclasses can optionally override

---

## C# Implementation

### Full Console Example: Document Parser & Game AI

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace TemplateMethodPattern
{
    // ═══════════════════════════════════════════════════════════════
    // ABSTRACT CLASS - Data Mining Template
    // ═══════════════════════════════════════════════════════════════
    
    public abstract class DataMiner
    {
        // Template Method - defines the algorithm skeleton
        public void Mine(string path)
        {
            Console.WriteLine($"\n  📊 Starting data mining: {path}");
            Console.WriteLine("  ═══════════════════════════════════════════");

            // Step 1: Open the file
            string rawData = OpenFile(path);
            
            // Step 2: Extract data
            var data = ExtractData(rawData);
            
            // Step 3: Parse data (hook - optional override)
            data = ParseData(data);
            
            // Step 4: Analyze data
            var analysis = AnalyzeData(data);
            
            // Step 5: Send report (hook - optional override)
            SendReport(analysis);
            
            // Step 6: Close file
            CloseFile();

            Console.WriteLine("  ═══════════════════════════════════════════");
            Console.WriteLine("  ✅ Mining complete!\n");
        }

        // Abstract methods - MUST be implemented
        protected abstract string OpenFile(string path);
        protected abstract List&lt;string> ExtractData(string rawData);

        // Default implementation - CAN be overridden
        protected virtual List&lt;string> ParseData(List&lt;string> data)
        {
            Console.WriteLine("  📝 Parsing data (default: no transformation)");
            return data;
        }

        protected virtual Dictionary&lt;string, int> AnalyzeData(List&lt;string> data)
        {
            Console.WriteLine("  🔍 Analyzing data...");
            var wordCount = new Dictionary&lt;string, int>();
            foreach (var item in data)
            {
                foreach (var word in item.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                {
                    string w = word.ToLower();
                    wordCount[w] = wordCount.GetValueOrDefault(w, 0) + 1;
                }
            }
            return wordCount;
        }

        // Hook methods - empty by default, CAN be overridden
        protected virtual void SendReport(Dictionary&lt;string, int> analysis)
        {
            Console.WriteLine("  📧 Sending report...");
            Console.WriteLine($"    Total unique words: {analysis.Count}");
        }

        protected virtual void CloseFile()
        {
            Console.WriteLine("  📁 Closing file");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE IMPLEMENTATIONS
    // ═══════════════════════════════════════════════════════════════
    
    public class PdfMiner : DataMiner
    {
        protected override string OpenFile(string path)
        {
            Console.WriteLine($"  📄 Opening PDF: {path}");
            // Simulate PDF reading
            return "PDF content: Lorem ipsum dolor sit amet consectetur adipiscing elit";
        }

        protected override List&lt;string> ExtractData(string rawData)
        {
            Console.WriteLine("  📤 Extracting text from PDF layers...");
            // Simulate PDF text extraction
            return new List&lt;string> { rawData.Replace("PDF content: ", "") };
        }

        protected override void CloseFile()
        {
            Console.WriteLine("  📁 Releasing PDF reader resources");
        }
    }

    public class CsvMiner : DataMiner
    {
        protected override string OpenFile(string path)
        {
            Console.WriteLine($"  📊 Opening CSV: {path}");
            // Simulate CSV
            return "Name,Age,City\nAlice,30,NYC\nBob,25,LA\nCharlie,35,Chicago";
        }

        protected override List&lt;string> ExtractData(string rawData)
        {
            Console.WriteLine("  📤 Extracting rows from CSV...");
            var lines = rawData.Split('\n');
            var data = new List&lt;string>();
            foreach (var line in lines)
            {
                data.Add(line);
            }
            Console.WriteLine($"    Found {data.Count} rows");
            return data;
        }

        protected override List&lt;string> ParseData(List&lt;string> data)
        {
            Console.WriteLine("  📝 Parsing CSV structure...");
            var parsed = new List&lt;string>();
            if (data.Count > 0)
            {
                var headers = data[0].Split(',');
                for (int i = 1; i &lt; data.Count; i++)
                {
                    var values = data[i].Split(',');
                    var sb = new StringBuilder();
                    for (int j = 0; j &lt; headers.Length; j++)
                    {
                        sb.Append($"{headers[j]}={values[j]} ");
                    }
                    parsed.Add(sb.ToString());
                }
            }
            return parsed;
        }
    }

    public class DocMiner : DataMiner
    {
        protected override string OpenFile(string path)
        {
            Console.WriteLine($"  📝 Opening DOC: {path}");
            // Simulate DOC reading
            return "DOC: This is a sample Word document with important data";
        }

        protected override List&lt;string> ExtractData(string rawData)
        {
            Console.WriteLine("  📤 Extracting paragraphs from DOC...");
            var content = rawData.Replace("DOC: ", "");
            return new List&lt;string> { content };
        }

        // Override hook to add custom reporting
        protected override void SendReport(Dictionary&lt;string, int> analysis)
        {
            base.SendReport(analysis);
            Console.WriteLine("    📊 Top words:");
            var sorted = analysis.OrderByDescending(x => x.Value).Take(3);
            foreach (var (word, count) in sorted)
            {
                Console.WriteLine($"      • \"{word}\": {count}");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // GAME AI EXAMPLE
    // ═══════════════════════════════════════════════════════════════
    
    public abstract class GameAI
    {
        // Template Method
        public void TakeTurn()
        {
            Console.WriteLine($"\n  🎮 {GetUnitName()} taking turn...");
            Console.WriteLine("  ─────────────────────────────────────────");

            CollectResources();
            BuildStructures();
            BuildUnits();
            Attack();
            
            if (ShouldRetreat())
            {
                Retreat();
            }

            Console.WriteLine("  ─────────────────────────────────────────");
        }

        // Abstract methods
        protected abstract string GetUnitName();
        protected abstract void BuildStructures();
        protected abstract void BuildUnits();

        // Default implementations
        protected virtual void CollectResources()
        {
            Console.WriteLine("  💰 Collecting resources from nearby nodes...");
        }

        protected virtual void Attack()
        {
            Console.WriteLine("  ⚔️ Attacking enemy with available units");
        }

        // Hooks
        protected virtual bool ShouldRetreat() => false;
        
        protected virtual void Retreat()
        {
            Console.WriteLine("  🏃 Retreating to base!");
        }
    }

    public class WarriorAI : GameAI
    {
        protected override string GetUnitName() => "⚔️ Warrior Faction";

        protected override void BuildStructures()
        {
            Console.WriteLine("  🏰 Building: Barracks, Training Ground");
        }

        protected override void BuildUnits()
        {
            Console.WriteLine("  👥 Training: Knights, Archers, Infantry");
        }

        protected override void Attack()
        {
            Console.WriteLine("  ⚔️ Charging with full army - NO RETREAT!");
        }

        // Warriors never retreat
        protected override bool ShouldRetreat() => false;
    }

    public class WizardAI : GameAI
    {
        private readonly Random _random = new();

        protected override string GetUnitName() => "🧙 Wizard Faction";

        protected override void BuildStructures()
        {
            Console.WriteLine("  🏰 Building: Mage Tower, Library, Arcane Lab");
        }

        protected override void BuildUnits()
        {
            Console.WriteLine("  👥 Summoning: Fire Mages, Ice Mages, Enchanters");
        }

        protected override void CollectResources()
        {
            Console.WriteLine("  ✨ Harvesting mana from ley lines...");
        }

        protected override void Attack()
        {
            Console.WriteLine("  🔥 Casting fireballs from safe distance!");
        }

        protected override bool ShouldRetreat() => _random.Next(100) &lt; 30;  // 30% chance
    }

    public class DefenderAI : GameAI
    {
        protected override string GetUnitName() => "🛡️ Defender Faction";

        protected override void BuildStructures()
        {
            Console.WriteLine("  🏰 Building: Walls, Towers, Fortress");
        }

        protected override void BuildUnits()
        {
            Console.WriteLine("  👥 Training: Guardians, Shield Bearers");
        }

        protected override void Attack()
        {
            Console.WriteLine("  🛡️ Holding position - defensive stance only");
        }

        protected override bool ShouldRetreat() => true;  // Always fall back to fortify

        protected override void Retreat()
        {
            Console.WriteLine("  🏰 Falling back to fortified position!");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ONLINE BANKING EXAMPLE (with hooks)
    // ═══════════════════════════════════════════════════════════════
    
    public abstract class BankingOperation
    {
        public bool Execute()
        {
            Console.WriteLine($"\n  🏦 {GetOperationName()}");
            Console.WriteLine("  ─────────────────────────────────────────");

            if (!Authenticate())
            {
                Console.WriteLine("  ❌ Authentication failed!");
                return false;
            }

            if (!Authorize())
            {
                Console.WriteLine("  ❌ Authorization failed!");
                return false;
            }

            // Hook for additional validation
            if (!AdditionalValidation())
            {
                Console.WriteLine("  ❌ Validation failed!");
                return false;
            }

            PerformOperation();
            
            // Hook for notifications
            NotifyUser();
            
            LogOperation();

            Console.WriteLine("  ✅ Operation completed successfully");
            return true;
        }

        protected abstract string GetOperationName();
        protected abstract void PerformOperation();

        protected virtual bool Authenticate()
        {
            Console.WriteLine("  🔐 Authenticating user...");
            return true;
        }

        protected virtual bool Authorize()
        {
            Console.WriteLine("  🔑 Authorizing operation...");
            return true;
        }

        // Hooks - empty by default
        protected virtual bool AdditionalValidation() => true;
        protected virtual void NotifyUser() { }
        protected virtual void LogOperation()
        {
            Console.WriteLine("  📝 Operation logged");
        }
    }

    public class MoneyTransfer : BankingOperation
    {
        private readonly decimal _amount;
        private readonly string _toAccount;

        public MoneyTransfer(decimal amount, string toAccount)
        {
            _amount = amount;
            _toAccount = toAccount;
        }

        protected override string GetOperationName() => $"Transfer ${_amount} to {_toAccount}";

        protected override bool AdditionalValidation()
        {
            Console.WriteLine($"  💳 Checking sufficient funds for ${_amount}...");
            return _amount &lt; 10000; // Simulate limit
        }

        protected override void PerformOperation()
        {
            Console.WriteLine($"  💸 Transferring ${_amount} to {_toAccount}...");
        }

        protected override void NotifyUser()
        {
            Console.WriteLine($"  📧 Email sent: Transfer of ${_amount} completed");
        }
    }

    public class AccountClosing : BankingOperation
    {
        protected override string GetOperationName() => "Close Account";

        protected override bool Authorize()
        {
            Console.WriteLine("  🔑 Requiring manager approval...");
            Console.WriteLine("  ✅ Manager approved");
            return true;
        }

        protected override void PerformOperation()
        {
            Console.WriteLine("  🔒 Closing account...");
            Console.WriteLine("  💰 Transferring remaining balance...");
        }

        protected override void NotifyUser()
        {
            Console.WriteLine("  📧 Confirmation letter will be mailed");
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
            Console.WriteLine("║     TEMPLATE METHOD PATTERN DEMO           ║");
            Console.WriteLine("║     Data Mining, Game AI & Banking         ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Data Mining
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DATA MINING TEMPLATE");
            Console.WriteLine("═══════════════════════════════════════════════");

            DataMiner[] miners = 
            {
                new PdfMiner(),
                new CsvMiner(),
                new DocMiner()
            };

            miners[0].Mine("report.pdf");
            miners[1].Mine("users.csv");
            miners[2].Mine("article.doc");

            // ─────────────────────────────────────────────
            // Demo 2: Game AI
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  GAME AI TEMPLATE");
            Console.WriteLine("═══════════════════════════════════════════════");

            GameAI[] factions =
            {
                new WarriorAI(),
                new WizardAI(),
                new DefenderAI()
            };

            foreach (var faction in factions)
            {
                faction.TakeTurn();
            }

            // ─────────────────────────────────────────────
            // Demo 3: Banking Operations
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  BANKING OPERATIONS TEMPLATE");
            Console.WriteLine("═══════════════════════════════════════════════");

            var transfer = new MoneyTransfer(500, "ACC-123456");
            transfer.Execute();

            var closeAccount = new AccountClosing();
            closeAccount.Execute();

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
| **Frameworks** | ASP.NET request pipeline |
| **Testing** | SetUp/TearDown in test frameworks |
| **Build Systems** | Build, Test, Deploy steps |
| **Document Processing** | Open, Parse, Process, Save |
| **Games** | AI behavior routines |
| **Authentication** | Login workflows |

---

## Template Method vs Strategy

| Aspect | Template Method | Strategy |
|--------|-----------------|----------|
| **Mechanism** | Inheritance | Composition |
| **Variation** | Subclass overrides steps | Different strategy objects |
| **Algorithm** | Same skeleton, different steps | Entirely different algorithms |
| **Coupling** | Tighter (inheritance) | Looser (composition) |

---

## When to Use

✅ **Use Template Method when:**

- Subclasses should extend a base algorithm without changing its structure
- You have several classes with nearly identical algorithms
- You want to control which steps subclasses can override

---

## Anti-Patterns & Pitfalls

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Template method not protected from override
public virtual void TemplateMethod()  // Should be non-virtual
{
    Step1();
    Step2();
}

// ✅ GOOD: Template method is final (sealed in C#)
public void TemplateMethod()  // Cannot be overridden
{
    Step1();
    Step2();
}

// ❌ BAD: Too many abstract methods
public abstract class TooManySteps
{
    public void Template()
    {
        Step1(); Step2(); Step3(); Step4(); Step5();
        Step6(); Step7(); Step8(); Step9(); Step10(); // Too complex!
    }
}

// ✅ GOOD: Use hooks and defaults
public abstract class JustRight
{
    public void Template()
    {
        OpenResource();      // Abstract
        ProcessData();       // Abstract
        AfterProcess();      // Hook (optional)
        CloseResource();     // Default implementation
    }
}
```

---

## Key Takeaways

- 🔄 **Inversion of Control**: Base class calls subclass methods (Hollywood Principle)
- 🎯 **Code Reuse**: Common algorithm structure in base class
- 🔒 **Controlled Extension**: Base class controls which steps are extensible
- ⚠️ **Fragile Base Class**: Changes to base can break subclasses

---

## Related Patterns

- [Strategy](08-strategy.md) - Composition alternative to Template Method
- [Factory Method](../creational/01-factory-method.md) - Often called within template method
- [Hook Methods](https://en.wikipedia.org/wiki/Template_method_pattern#Hook_methods) - Empty methods for optional behavior
