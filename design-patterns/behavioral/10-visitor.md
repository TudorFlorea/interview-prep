# Visitor Pattern

[← Back to Behavioral Patterns](00-index.md) | [← Back to Main Index](../00-index.md)

---

## Intent

**Visitor** is a behavioral design pattern that lets you separate algorithms from the objects on which they operate. It allows adding new operations to existing object structures without modifying those structures.

---

## Problem

Imagine you have a complex object structure (like a document with various elements). You need to export it to different formats (XML, JSON, plain text). Adding export methods to each element class pollutes them with export logic and violates single responsibility.

---

## Solution

The Visitor pattern suggests placing new behavior into a separate class called visitor. The original object (element) "accepts" a visitor and tells it which visiting method to call, passing itself as an argument. This technique is called "double dispatch."

```
┌──────────────────────────────────────────────────────────────────┐
│  Element Interface                                                │
│──────────────────────────────────────────────────────────────────│
│  + accept(visitor: IVisitor)                                     │
│                                                                  │
│    // Implementation in ConcreteElement:                         │
│    visitor.visit(this)  ← Double dispatch                       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Visitor Interface                                                │
│──────────────────────────────────────────────────────────────────│
│  + visitElementA(element: ElementA)                              │
│  + visitElementB(element: ElementB)                              │
│  + visitElementC(element: ElementC)                              │
└──────────────────────────────────────────────────────────────────┘

     Element A                    Visitor
    ┌─────────┐                 ┌─────────┐
    │ Accept  │────────────────►│ VisitA  │
    └─────────┘   calls with    └─────────┘
                   "this"
```

---

## Structure

1. **Visitor Interface** - Declares visit methods for each element type
2. **Concrete Visitors** - Implement operations for each element type
3. **Element Interface** - Declares accept method
4. **Concrete Elements** - Implement accept by calling appropriate visit method
5. **Object Structure** - Collection that can enumerate elements

---

## C# Implementation

### Full Console Example: Document Export & Shape Calculator

```csharp
using System;
using System.Collections.Generic;
using System.Text;

namespace VisitorPattern
{
    // ═══════════════════════════════════════════════════════════════
    // ELEMENT INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    public interface IDocumentElement
    {
        void Accept(IDocumentVisitor visitor);
    }

    // ═══════════════════════════════════════════════════════════════
    // VISITOR INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    public interface IDocumentVisitor
    {
        void VisitParagraph(Paragraph paragraph);
        void VisitHeading(Heading heading);
        void VisitImage(Image image);
        void VisitTable(Table table);
        void VisitLink(Link link);
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE ELEMENTS
    // ═══════════════════════════════════════════════════════════════
    
    public class Paragraph : IDocumentElement
    {
        public string Text { get; }
        
        public Paragraph(string text) => Text = text;

        public void Accept(IDocumentVisitor visitor)
        {
            visitor.VisitParagraph(this);
        }
    }

    public class Heading : IDocumentElement
    {
        public string Text { get; }
        public int Level { get; }

        public Heading(string text, int level)
        {
            Text = text;
            Level = Math.Clamp(level, 1, 6);
        }

        public void Accept(IDocumentVisitor visitor)
        {
            visitor.VisitHeading(this);
        }
    }

    public class Image : IDocumentElement
    {
        public string Url { get; }
        public string AltText { get; }
        public int Width { get; }
        public int Height { get; }

        public Image(string url, string altText, int width = 300, int height = 200)
        {
            Url = url;
            AltText = altText;
            Width = width;
            Height = height;
        }

        public void Accept(IDocumentVisitor visitor)
        {
            visitor.VisitImage(this);
        }
    }

    public class Table : IDocumentElement
    {
        public List&lt;string> Headers { get; }
        public List&lt;List&lt;string>> Rows { get; }

        public Table(List&lt;string> headers, List&lt;List&lt;string>> rows)
        {
            Headers = headers;
            Rows = rows;
        }

        public void Accept(IDocumentVisitor visitor)
        {
            visitor.VisitTable(this);
        }
    }

    public class Link : IDocumentElement
    {
        public string Url { get; }
        public string Text { get; }

        public Link(string url, string text)
        {
            Url = url;
            Text = text;
        }

        public void Accept(IDocumentVisitor visitor)
        {
            visitor.VisitLink(this);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE VISITORS
    // ═══════════════════════════════════════════════════════════════
    
    public class HtmlExportVisitor : IDocumentVisitor
    {
        private readonly StringBuilder _html = new();

        public string GetResult()
        {
            return $"&lt;!DOCTYPE html>\n<html>\n<body>\n{_html}</body>\n</html>";
        }

        public void VisitParagraph(Paragraph p)
        {
            _html.AppendLine($"  <p>{p.Text}</p>");
        }

        public void VisitHeading(Heading h)
        {
            _html.AppendLine($"  &lt;h{h.Level}>{h.Text}&lt;/h{h.Level}>");
        }

        public void VisitImage(Image img)
        {
            _html.AppendLine($"  <img src=\"{img.Url}\" alt=\"{img.AltText}\" " +
                $"width=\"{img.Width}\" height=\"{img.Height}\" />");
        }

        public void VisitTable(Table t)
        {
            _html.AppendLine("  <table border=\"1\">");
            _html.AppendLine("    <tr>");
            foreach (var header in t.Headers)
            {
                _html.AppendLine($"      <th>{header}</th>");
            }
            _html.AppendLine("    </tr>");
            
            foreach (var row in t.Rows)
            {
                _html.AppendLine("    <tr>");
                foreach (var cell in row)
                {
                    _html.AppendLine($"      <td>{cell}</td>");
                }
                _html.AppendLine("    </tr>");
            }
            _html.AppendLine("  </table>");
        }

        public void VisitLink(Link link)
        {
            _html.AppendLine($"  <a href=\"{link.Url}\">{link.Text}</a>");
        }
    }

    public class MarkdownExportVisitor : IDocumentVisitor
    {
        private readonly StringBuilder _md = new();

        public string GetResult() => _md.ToString();

        public void VisitParagraph(Paragraph p)
        {
            _md.AppendLine(p.Text);
            _md.AppendLine();
        }

        public void VisitHeading(Heading h)
        {
            _md.AppendLine($"{new string('#', h.Level)} {h.Text}");
            _md.AppendLine();
        }

        public void VisitImage(Image img)
        {
            _md.AppendLine($"![{img.AltText}]({img.Url})");
            _md.AppendLine();
        }

        public void VisitTable(Table t)
        {
            _md.AppendLine("| " + string.Join(" | ", t.Headers) + " |");
            _md.AppendLine("| " + string.Join(" | ", t.Headers.ConvertAll(_ => "---")) + " |");
            
            foreach (var row in t.Rows)
            {
                _md.AppendLine("| " + string.Join(" | ", row) + " |");
            }
            _md.AppendLine();
        }

        public void VisitLink(Link link)
        {
            _md.AppendLine($"[{link.Text}]({link.Url})");
            _md.AppendLine();
        }
    }

    public class PlainTextExportVisitor : IDocumentVisitor
    {
        private readonly StringBuilder _text = new();

        public string GetResult() => _text.ToString();

        public void VisitParagraph(Paragraph p)
        {
            _text.AppendLine(p.Text);
            _text.AppendLine();
        }

        public void VisitHeading(Heading h)
        {
            _text.AppendLine(h.Text.ToUpper());
            _text.AppendLine(new string('=', h.Text.Length));
            _text.AppendLine();
        }

        public void VisitImage(Image img)
        {
            _text.AppendLine($"[Image: {img.AltText}]");
            _text.AppendLine();
        }

        public void VisitTable(Table t)
        {
            foreach (var row in t.Rows)
            {
                for (int i = 0; i &lt; t.Headers.Count; i++)
                {
                    _text.AppendLine($"{t.Headers[i]}: {row[i]}");
                }
                _text.AppendLine("---");
            }
            _text.AppendLine();
        }

        public void VisitLink(Link link)
        {
            _text.AppendLine($"{link.Text}: {link.Url}");
            _text.AppendLine();
        }
    }

    public class DocumentStatsVisitor : IDocumentVisitor
    {
        public int ParagraphCount { get; private set; }
        public int HeadingCount { get; private set; }
        public int ImageCount { get; private set; }
        public int TableCount { get; private set; }
        public int LinkCount { get; private set; }
        public int WordCount { get; private set; }

        public void VisitParagraph(Paragraph p)
        {
            ParagraphCount++;
            WordCount += p.Text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        }

        public void VisitHeading(Heading h)
        {
            HeadingCount++;
            WordCount += h.Text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        }

        public void VisitImage(Image img)
        {
            ImageCount++;
        }

        public void VisitTable(Table t)
        {
            TableCount++;
        }

        public void VisitLink(Link link)
        {
            LinkCount++;
        }

        public void PrintStats()
        {
            Console.WriteLine("\n  📊 Document Statistics:");
            Console.WriteLine($"    • Paragraphs: {ParagraphCount}");
            Console.WriteLine($"    • Headings: {HeadingCount}");
            Console.WriteLine($"    • Images: {ImageCount}");
            Console.WriteLine($"    • Tables: {TableCount}");
            Console.WriteLine($"    • Links: {LinkCount}");
            Console.WriteLine($"    • Total Words: {WordCount}");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENT (Object Structure)
    // ═══════════════════════════════════════════════════════════════
    
    public class Document
    {
        private readonly List&lt;IDocumentElement> _elements = new();
        public string Title { get; }

        public Document(string title)
        {
            Title = title;
        }

        public void Add(IDocumentElement element)
        {
            _elements.Add(element);
        }

        public void Accept(IDocumentVisitor visitor)
        {
            foreach (var element in _elements)
            {
                element.Accept(visitor);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SHAPE CALCULATOR EXAMPLE
    // ═══════════════════════════════════════════════════════════════
    
    public interface IShape
    {
        void Accept(IShapeVisitor visitor);
    }

    public interface IShapeVisitor
    {
        void VisitCircle(Circle circle);
        void VisitRectangle(Rectangle rectangle);
        void VisitTriangle(Triangle triangle);
    }

    public class Circle : IShape
    {
        public double Radius { get; }
        public Circle(double radius) => Radius = radius;
        public void Accept(IShapeVisitor visitor) => visitor.VisitCircle(this);
    }

    public class Rectangle : IShape
    {
        public double Width { get; }
        public double Height { get; }
        public Rectangle(double width, double height)
        {
            Width = width;
            Height = height;
        }
        public void Accept(IShapeVisitor visitor) => visitor.VisitRectangle(this);
    }

    public class Triangle : IShape
    {
        public double Base { get; }
        public double Height { get; }
        public Triangle(double @base, double height)
        {
            Base = @base;
            Height = height;
        }
        public void Accept(IShapeVisitor visitor) => visitor.VisitTriangle(this);
    }

    public class AreaCalculator : IShapeVisitor
    {
        public double TotalArea { get; private set; }

        public void VisitCircle(Circle c)
        {
            double area = Math.PI * c.Radius * c.Radius;
            Console.WriteLine($"    ⭕ Circle (r={c.Radius}): Area = {area:F2}");
            TotalArea += area;
        }

        public void VisitRectangle(Rectangle r)
        {
            double area = r.Width * r.Height;
            Console.WriteLine($"    📐 Rectangle ({r.Width}x{r.Height}): Area = {area:F2}");
            TotalArea += area;
        }

        public void VisitTriangle(Triangle t)
        {
            double area = 0.5 * t.Base * t.Height;
            Console.WriteLine($"    📐 Triangle (b={t.Base}, h={t.Height}): Area = {area:F2}");
            TotalArea += area;
        }
    }

    public class PerimeterCalculator : IShapeVisitor
    {
        public double TotalPerimeter { get; private set; }

        public void VisitCircle(Circle c)
        {
            double perimeter = 2 * Math.PI * c.Radius;
            Console.WriteLine($"    ⭕ Circle (r={c.Radius}): Perimeter = {perimeter:F2}");
            TotalPerimeter += perimeter;
        }

        public void VisitRectangle(Rectangle r)
        {
            double perimeter = 2 * (r.Width + r.Height);
            Console.WriteLine($"    📐 Rectangle ({r.Width}x{r.Height}): Perimeter = {perimeter:F2}");
            TotalPerimeter += perimeter;
        }

        public void VisitTriangle(Triangle t)
        {
            // Assuming isoceles triangle for simplicity
            double side = Math.Sqrt((t.Base / 2) * (t.Base / 2) + t.Height * t.Height);
            double perimeter = t.Base + 2 * side;
            Console.WriteLine($"    📐 Triangle: Perimeter ≈ {perimeter:F2}");
            TotalPerimeter += perimeter;
        }
    }

    public class DrawingVisitor : IShapeVisitor
    {
        public void VisitCircle(Circle c)
        {
            Console.WriteLine($"    ⭕ Drawing circle with radius {c.Radius}");
            Console.WriteLine("       ╭───╮");
            Console.WriteLine("       │   │");
            Console.WriteLine("       ╰───╯");
        }

        public void VisitRectangle(Rectangle r)
        {
            Console.WriteLine($"    📐 Drawing rectangle {r.Width}x{r.Height}");
            Console.WriteLine("       ┌─────┐");
            Console.WriteLine("       │     │");
            Console.WriteLine("       └─────┘");
        }

        public void VisitTriangle(Triangle t)
        {
            Console.WriteLine($"    📐 Drawing triangle (base={t.Base}, height={t.Height})");
            Console.WriteLine("         ▲");
            Console.WriteLine("        ╱ ╲");
            Console.WriteLine("       ╱───╲");
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
            Console.WriteLine("║        VISITOR PATTERN DEMO                ║");
            Console.WriteLine("║        Document Export & Shape Calculator  ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Document Export
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  DOCUMENT EXPORT");
            Console.WriteLine("═══════════════════════════════════════════════");

            // Create document
            var doc = new Document("My Article");
            doc.Add(new Heading("Welcome to Visitor Pattern", 1));
            doc.Add(new Paragraph("The Visitor pattern lets you add operations to objects without modifying them."));
            doc.Add(new Heading("Example Usage", 2));
            doc.Add(new Image("diagram.png", "Class Diagram", 400, 300));
            doc.Add(new Paragraph("Here's a table summarizing the pattern:"));
            doc.Add(new Table(
                new List&lt;string> { "Aspect", "Description" },
                new List&lt;List&lt;string>>
                {
                    new() { "Intent", "Separate algorithm from object structure" },
                    new() { "Key Concept", "Double dispatch" },
                }
            ));
            doc.Add(new Link("https://refactoring.guru", "Learn More"));

            // Export to HTML
            Console.WriteLine("\n  📄 HTML Export:");
            Console.WriteLine("  ─────────────────────────────────────────");
            var htmlVisitor = new HtmlExportVisitor();
            doc.Accept(htmlVisitor);
            Console.WriteLine(htmlVisitor.GetResult());

            // Export to Markdown
            Console.WriteLine("\n  📝 Markdown Export:");
            Console.WriteLine("  ─────────────────────────────────────────");
            var mdVisitor = new MarkdownExportVisitor();
            doc.Accept(mdVisitor);
            Console.WriteLine(mdVisitor.GetResult());

            // Export to Plain Text
            Console.WriteLine("\n  📃 Plain Text Export:");
            Console.WriteLine("  ─────────────────────────────────────────");
            var textVisitor = new PlainTextExportVisitor();
            doc.Accept(textVisitor);
            Console.WriteLine(textVisitor.GetResult());

            // Get Statistics
            var statsVisitor = new DocumentStatsVisitor();
            doc.Accept(statsVisitor);
            statsVisitor.PrintStats();

            // ─────────────────────────────────────────────
            // Demo 2: Shape Calculator
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  SHAPE CALCULATOR");
            Console.WriteLine("═══════════════════════════════════════════════");

            var shapes = new List&lt;IShape>
            {
                new Circle(5),
                new Rectangle(4, 6),
                new Triangle(8, 5),
                new Circle(3)
            };

            Console.WriteLine("\n  📏 Calculating Areas:");
            var areaCalc = new AreaCalculator();
            foreach (var shape in shapes)
            {
                shape.Accept(areaCalc);
            }
            Console.WriteLine($"\n    📊 Total Area: {areaCalc.TotalArea:F2}");

            Console.WriteLine("\n  📏 Calculating Perimeters:");
            var perimeterCalc = new PerimeterCalculator();
            foreach (var shape in shapes)
            {
                shape.Accept(perimeterCalc);
            }
            Console.WriteLine($"\n    📊 Total Perimeter: {perimeterCalc.TotalPerimeter:F2}");

            Console.WriteLine("\n  🎨 Drawing Shapes:");
            var drawer = new DrawingVisitor();
            foreach (var shape in shapes)
            {
                shape.Accept(drawer);
            }

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
| **Compilers** | AST traversal for analysis/codegen |
| **Document Processing** | Export to multiple formats |
| **Graphics** | Shape calculations |
| **Serialization** | Converting objects to XML/JSON |
| **UI Frameworks** | Rendering different element types |
| **File Systems** | Operations on directory trees |

---

## Double Dispatch Explained

```csharp
// The "magic" of visitor: two virtual calls determine the method
element.Accept(visitor);           // 1st dispatch: element type
  └──► visitor.VisitXxx(this);     // 2nd dispatch: visitor type

// This allows selecting behavior based on BOTH:
// - The concrete element type
// - The concrete visitor type
```

---

## When to Use

✅ **Use Visitor when:**

- You need to perform operations on all elements of a complex structure
- You want to keep related operations together in one class
- Object structure rarely changes, but you often add new operations

---

## Anti-Patterns & Pitfalls

### ❌ Don't Use When:

1. **Frequently Changing Elements** - Adding new element types breaks all visitors
2. **Simple Hierarchies** - Overhead not justified for simple cases

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Breaking encapsulation - visitor accesses private data
public class BadVisitor : IVisitor
{
    public void Visit(Element e)
    {
        var field = e.GetType().GetField("_private", 
            BindingFlags.NonPublic);  // Violates encapsulation!
    }
}

// ✅ GOOD: Elements expose what visitors need
public class Element
{
    private int _value;
    public int GetValueForVisitor() => _value;  // Controlled access
}
```

---

## Key Takeaways

- 🔄 **Double Dispatch**: Selects method based on two types
- ➕ **Open for Extension**: Add new operations without modifying elements
- 📦 **Grouped Operations**: Related operations live together
- ⚠️ **Fragile Visitor**: Adding new element types is expensive

---

## Related Patterns

- [Composite](../structural/03-composite.md) - Visitor often traverses composites
- [Iterator](03-iterator.md) - Can be used together for traversal
- [Interpreter](https://en.wikipedia.org/wiki/Interpreter_pattern) - Often uses Visitor for AST
