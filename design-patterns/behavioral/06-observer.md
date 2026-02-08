# Observer Pattern

[← Back to Behavioral Patterns](/design-patterns/behavioral/00-index.md) | [← Back to Main Index](/design-patterns/00-index.md)

---

## Intent

**Observer** is a behavioral design pattern that lets you define a subscription mechanism to notify multiple objects about any events that happen to the object they're observing.

---

## Problem

Imagine you have two types of objects: a `Store` and a `Customer`. The customer is interested in a particular product. The customer could visit the store every day, but most trips would be pointless while the product is out of stock.

Alternatively, the store could spam all customers whenever any new product arrives, but this would upset customers who aren't interested.

---

## Solution

The Observer pattern suggests adding a subscription mechanism to the publisher (subject). Objects can subscribe to or unsubscribe from events. When an important event happens, the publisher notifies all subscribers.

```
┌─────────────────────────────────────────────────────────────┐
│                        Publisher                             │
│─────────────────────────────────────────────────────────────│
│  - subscribers: List&lt;ISubscriber>                           │
│  - state                                                    │
│  + subscribe(subscriber)                                    │
│  + unsubscribe(subscriber)                                  │
│  + notify() ─────────────────────────────────────────┐     │
└─────────────────────────────────────────────────────────────┘
                                                        │
            ┌──────────────────────────┬────────────────┴────────┐
            ▼                          ▼                         ▼
      ┌──────────┐              ┌──────────┐              ┌──────────┐
      │Subscriber│              │Subscriber│              │Subscriber│
      │    A     │              │    B     │              │    C     │
      │  update()│              │  update()│              │  update()│
      └──────────┘              └──────────┘              └──────────┘
```

---

## Structure

1. **Publisher (Subject)** - Sends notifications when state changes
2. **Subscriber (Observer)** - Interface for receiving updates
3. **Concrete Subscribers** - Perform actions in response to publisher notifications
4. **Client** - Creates publishers and subscribers, manages subscriptions

---

## C# Implementation

### Full Console Example: Stock Market & Weather Station

```csharp
using System;
using System.Collections.Generic;

namespace ObserverPattern
{
    // ═══════════════════════════════════════════════════════════════
    // OBSERVER INTERFACE
    // ═══════════════════════════════════════════════════════════════
    
    public interface IStockObserver
    {
        void Update(string symbol, decimal price, decimal change);
    }

    // ═══════════════════════════════════════════════════════════════
    // SUBJECT (Publisher)
    // ═══════════════════════════════════════════════════════════════
    
    public class StockMarket
    {
        private readonly Dictionary&lt;string, List&lt;IStockObserver>> _observers = new();
        private readonly Dictionary&lt;string, decimal> _prices = new();

        public void Subscribe(string symbol, IStockObserver observer)
        {
            if (!_observers.ContainsKey(symbol))
                _observers[symbol] = new List&lt;IStockObserver>();
            
            _observers[symbol].Add(observer);
            Console.WriteLine($"  ➕ New subscription for {symbol}");
        }

        public void Unsubscribe(string symbol, IStockObserver observer)
        {
            if (_observers.ContainsKey(symbol))
            {
                _observers[symbol].Remove(observer);
                Console.WriteLine($"  ➖ Unsubscribed from {symbol}");
            }
        }

        public void UpdatePrice(string symbol, decimal newPrice)
        {
            _prices.TryGetValue(symbol, out decimal oldPrice);
            decimal change = newPrice - oldPrice;
            _prices[symbol] = newPrice;

            string trend = change >= 0 ? "📈" : "📉";
            Console.WriteLine($"\n  {trend} {symbol}: ${newPrice:F2} ({change:+0.00;-0.00;0.00})");

            NotifyObservers(symbol, newPrice, change);
        }

        private void NotifyObservers(string symbol, decimal price, decimal change)
        {
            if (!_observers.ContainsKey(symbol)) return;

            foreach (var observer in _observers[symbol])
            {
                observer.Update(symbol, price, change);
            }
        }

        public decimal GetPrice(string symbol) => 
            _prices.TryGetValue(symbol, out var price) ? price : 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // CONCRETE OBSERVERS
    // ═══════════════════════════════════════════════════════════════
    
    public class StockAlertApp : IStockObserver
    {
        private readonly string _userName;
        private readonly decimal _targetHigh;
        private readonly decimal _targetLow;

        public StockAlertApp(string userName, decimal targetHigh, decimal targetLow)
        {
            _userName = userName;
            _targetHigh = targetHigh;
            _targetLow = targetLow;
        }

        public void Update(string symbol, decimal price, decimal change)
        {
            if (price >= _targetHigh)
            {
                Console.WriteLine($"    🔔 [{_userName}] ALERT: {symbol} hit ${price}! " +
                    $"Consider selling (target: ${_targetHigh})");
            }
            else if (price &lt;= _targetLow)
            {
                Console.WriteLine($"    🔔 [{_userName}] ALERT: {symbol} dropped to ${price}! " +
                    $"Consider buying (target: ${_targetLow})");
            }
        }
    }

    public class TradingBot : IStockObserver
    {
        private readonly string _name;
        private readonly decimal _buyThreshold;
        private readonly decimal _sellThreshold;
        private int _shares = 0;
        private decimal _cash = 10000;

        public TradingBot(string name, decimal buyThreshold, decimal sellThreshold)
        {
            _name = name;
            _buyThreshold = buyThreshold;
            _sellThreshold = sellThreshold;
        }

        public void Update(string symbol, decimal price, decimal change)
        {
            // Buy on dips
            if (change &lt; -_buyThreshold && _cash >= price)
            {
                int sharesToBuy = (int)(_cash / price);
                _shares += sharesToBuy;
                _cash -= sharesToBuy * price;
                Console.WriteLine($"    🤖 [{_name}] BUY {sharesToBuy} {symbol} @ ${price:F2}");
            }
            // Sell on gains
            else if (change > _sellThreshold && _shares > 0)
            {
                _cash += _shares * price;
                Console.WriteLine($"    🤖 [{_name}] SELL {_shares} {symbol} @ ${price:F2}");
                _shares = 0;
            }
        }
    }

    public class PortfolioTracker : IStockObserver
    {
        private readonly Dictionary&lt;string, int> _holdings = new();
        private readonly Dictionary&lt;string, decimal> _prices = new();

        public void AddHolding(string symbol, int shares)
        {
            _holdings[symbol] = shares;
        }

        public void Update(string symbol, decimal price, decimal change)
        {
            _prices[symbol] = price;
            
            if (_holdings.TryGetValue(symbol, out int shares))
            {
                decimal value = shares * price;
                decimal dayChange = shares * change;
                string trend = dayChange >= 0 ? "📈" : "📉";
                Console.WriteLine($"    💼 [Portfolio] {symbol}: {shares} shares = ${value:F2} " +
                    $"({trend} ${dayChange:+0.00;-0.00;0.00})");
            }
        }

        public decimal TotalValue()
        {
            decimal total = 0;
            foreach (var (symbol, shares) in _holdings)
            {
                if (_prices.TryGetValue(symbol, out decimal price))
                    total += shares * price;
            }
            return total;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // C# EVENT-BASED OBSERVER (Idiomatic C#)
    // ═══════════════════════════════════════════════════════════════
    
    public class WeatherStationEventArgs : EventArgs
    {
        public double Temperature { get; }
        public double Humidity { get; }
        public double Pressure { get; }

        public WeatherStationEventArgs(double temp, double humidity, double pressure)
        {
            Temperature = temp;
            Humidity = humidity;
            Pressure = pressure;
        }
    }

    public class WeatherStation
    {
        // C# events provide built-in observer support
        public event EventHandler&lt;WeatherStationEventArgs>? WeatherChanged;

        private double _temperature;
        private double _humidity;
        private double _pressure;

        public void SetMeasurements(double temp, double humidity, double pressure)
        {
            _temperature = temp;
            _humidity = humidity;
            _pressure = pressure;

            Console.WriteLine($"\n  🌡️ Weather Update: {temp}°F, {humidity}% humidity, {pressure} hPa");
            OnWeatherChanged();
        }

        protected virtual void OnWeatherChanged()
        {
            WeatherChanged?.Invoke(this, new WeatherStationEventArgs(
                _temperature, _humidity, _pressure));
        }
    }

    public class PhoneDisplay
    {
        private readonly string _name;

        public PhoneDisplay(string name)
        {
            _name = name;
        }

        public void HandleWeatherChange(object? sender, WeatherStationEventArgs e)
        {
            Console.WriteLine($"    📱 [{_name}] Temp: {e.Temperature}°F, Humidity: {e.Humidity}%");
        }
    }

    public class StatisticsDisplay
    {
        private readonly List&lt;double> _temperatures = new();

        public void HandleWeatherChange(object? sender, WeatherStationEventArgs e)
        {
            _temperatures.Add(e.Temperature);
            
            double avg = 0;
            foreach (var t in _temperatures) avg += t;
            avg /= _temperatures.Count;

            double min = double.MaxValue, max = double.MinValue;
            foreach (var t in _temperatures)
            {
                if (t &lt; min) min = t;
                if (t > max) max = t;
            }

            Console.WriteLine($"    📊 [Stats] Avg: {avg:F1}°F, Min: {min}°F, Max: {max}°F");
        }
    }

    public class ForecastDisplay
    {
        private double _lastPressure = 1013.25;

        public void HandleWeatherChange(object? sender, WeatherStationEventArgs e)
        {
            string forecast;
            if (e.Pressure > _lastPressure)
                forecast = "☀️ Improving weather!";
            else if (e.Pressure &lt; _lastPressure)
                forecast = "🌧️ Watch out for rain!";
            else
                forecast = "☁️ More of the same";

            Console.WriteLine($"    🔮 [Forecast] {forecast}");
            _lastPressure = e.Pressure;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // OBSERVABLE WITH IObservable&lt;T> (Reactive Pattern)
    // ═══════════════════════════════════════════════════════════════
    
    public class NewsAgency : IObservable&lt;string>
    {
        private readonly List&lt;IObserver&lt;string>> _observers = new();

        public IDisposable Subscribe(IObserver&lt;string> observer)
        {
            _observers.Add(observer);
            return new Unsubscriber(_observers, observer);
        }

        public void PublishNews(string news)
        {
            Console.WriteLine($"\n  📰 Breaking: {news}");
            foreach (var observer in _observers)
            {
                observer.OnNext(news);
            }
        }

        public void EndTransmission()
        {
            foreach (var observer in _observers)
            {
                observer.OnCompleted();
            }
            _observers.Clear();
        }

        private class Unsubscriber : IDisposable
        {
            private readonly List&lt;IObserver&lt;string>> _observers;
            private readonly IObserver&lt;string> _observer;

            public Unsubscriber(List&lt;IObserver&lt;string>> observers, IObserver&lt;string> observer)
            {
                _observers = observers;
                _observer = observer;
            }

            public void Dispose()
            {
                if (_observers.Contains(_observer))
                    _observers.Remove(_observer);
            }
        }
    }

    public class NewsSubscriber : IObserver&lt;string>
    {
        private readonly string _name;

        public NewsSubscriber(string name) => _name = name;

        public void OnNext(string news) =>
            Console.WriteLine($"    📲 [{_name}] received: {news}");

        public void OnError(Exception error) =>
            Console.WriteLine($"    ❌ [{_name}] error: {error.Message}");

        public void OnCompleted() =>
            Console.WriteLine($"    ✅ [{_name}] subscription ended");
    }

    // ═══════════════════════════════════════════════════════════════
    // CLIENT CODE
    // ═══════════════════════════════════════════════════════════════
    
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("╔════════════════════════════════════════════╗");
            Console.WriteLine("║        OBSERVER PATTERN DEMO               ║");
            Console.WriteLine("║        Stock Market & Weather Station      ║");
            Console.WriteLine("╚════════════════════════════════════════════╝");

            // ─────────────────────────────────────────────
            // Demo 1: Stock Market
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  STOCK MARKET OBSERVER");
            Console.WriteLine("═══════════════════════════════════════════════");

            var market = new StockMarket();

            // Create observers
            var aliceAlerts = new StockAlertApp("Alice", targetHigh: 180, targetLow: 140);
            var tradingBot = new TradingBot("AutoTrader", buyThreshold: 3, sellThreshold: 5);
            var portfolio = new PortfolioTracker();
            portfolio.AddHolding("AAPL", 50);

            // Subscribe
            market.Subscribe("AAPL", aliceAlerts);
            market.Subscribe("AAPL", tradingBot);
            market.Subscribe("AAPL", portfolio);

            // Simulate price changes
            Console.WriteLine("\n  --- Market Opens ---");
            market.UpdatePrice("AAPL", 150.00m);
            market.UpdatePrice("AAPL", 155.50m);
            market.UpdatePrice("AAPL", 148.00m);
            market.UpdatePrice("AAPL", 145.00m);
            market.UpdatePrice("AAPL", 139.00m);  // Below Alice's target
            market.UpdatePrice("AAPL", 152.00m);
            market.UpdatePrice("AAPL", 182.00m);  // Above Alice's target

            Console.WriteLine($"\n  💰 Portfolio Total: ${portfolio.TotalValue():F2}");

            // ─────────────────────────────────────────────
            // Demo 2: Weather Station (C# Events)
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  WEATHER STATION (C# Events)");
            Console.WriteLine("═══════════════════════════════════════════════");

            var weatherStation = new WeatherStation();

            var phoneDisplay = new PhoneDisplay("My Phone");
            var statsDisplay = new StatisticsDisplay();
            var forecastDisplay = new ForecastDisplay();

            // Subscribe using events
            weatherStation.WeatherChanged += phoneDisplay.HandleWeatherChange;
            weatherStation.WeatherChanged += statsDisplay.HandleWeatherChange;
            weatherStation.WeatherChanged += forecastDisplay.HandleWeatherChange;

            // Simulate weather changes
            weatherStation.SetMeasurements(72.5, 65, 1015.2);
            weatherStation.SetMeasurements(75.0, 70, 1012.5);
            weatherStation.SetMeasurements(68.0, 90, 1008.0);

            // Unsubscribe phone
            Console.WriteLine("\n  📱 Phone display unsubscribed\n");
            weatherStation.WeatherChanged -= phoneDisplay.HandleWeatherChange;
            weatherStation.SetMeasurements(82.0, 40, 1020.0);

            // ─────────────────────────────────────────────
            // Demo 3: IObservable&lt;T> Pattern
            // ─────────────────────────────────────────────
            Console.WriteLine("\n═══════════════════════════════════════════════");
            Console.WriteLine("  NEWS AGENCY (IObservable&lt;T>)");
            Console.WriteLine("═══════════════════════════════════════════════");

            var newsAgency = new NewsAgency();

            var subscriber1 = new NewsSubscriber("Alice");
            var subscriber2 = new NewsSubscriber("Bob");

            using var sub1 = newsAgency.Subscribe(subscriber1);
            using var sub2 = newsAgency.Subscribe(subscriber2);

            newsAgency.PublishNews("Tech stocks hit record high!");
            newsAgency.PublishNews("New climate agreement signed");

            Console.WriteLine("\n  Bob unsubscribes...");
            sub2.Dispose();

            newsAgency.PublishNews("Sports: Championship finals tonight");

            newsAgency.EndTransmission();

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
| **GUI Frameworks** | Event handlers (button clicks) |
| **Social Media** | Follower notifications |
| **Messaging** | Pub/sub systems |
| **Stock Markets** | Price ticker subscriptions |
| **Games** | Achievement/event systems |
| **Reactive Extensions** | Rx.NET, Observable streams |

---

## When to Use

✅ **Use Observer when:**

- Changes to one object require changing others, and you don't know how many
- Some objects should observe others dynamically, at runtime
- You want to decouple notification mechanism from objects

---

## C# Approaches

| Approach | Use Case |
|----------|----------|
| **Custom Interface** | Full control, simple scenarios |
| **C# Events/Delegates** | Standard .NET pattern, built-in support |
| **IObservable&lt;T>/IObserver&lt;T>** | Reactive Extensions, streaming data |

---

## Anti-Patterns & Pitfalls

### ⚠️ Common Mistakes:

```csharp
// ❌ BAD: Memory leak - never unsubscribe
button.Click += MyHandler;  // Object never gets GC'd!

// ✅ GOOD: Unsubscribe when done
void Dispose()
{
    button.Click -= MyHandler;
}

// ❌ BAD: Modifying observer list during notification
foreach (var observer in _observers)
{
    observer.Update();
    _observers.Remove(observer);  // Exception!
}

// ✅ GOOD: Copy list or mark for removal
foreach (var observer in _observers.ToList())
{
    observer.Update();
}
```

---

## Key Takeaways

- 📢 **Loose Coupling**: Publisher doesn't know concrete observers
- 📡 **Broadcast**: One-to-many notification
- 🔄 **Dynamic**: Subscribe/unsubscribe at runtime
- ⚠️ **Memory Leaks**: Always unsubscribe event handlers

---

## Related Patterns

- [Mediator](/design-patterns/behavioral/04-mediator.md) - Centralizes observer communication
- [Singleton](/design-patterns/creational/05-singleton.md) - Often used with global event managers
- [Chain of Responsibility](/design-patterns/behavioral/01-chain-of-responsibility.md) - Alternative notification routing
