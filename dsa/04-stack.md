# Stack

[← Back to Index](/dsa/00-index.md)

## Overview

A Stack is a Last-In-First-Out (LIFO) data structure. Stacks are essential for problems involving nested structures, matching pairs, backtracking, and maintaining state in a specific order.

### When to Use This Pattern
- **Matching pairs** - parentheses, brackets, tags
- **Previous/next greater/smaller element** - monotonic stack
- **Expression evaluation** - postfix, infix notation
- **Backtracking** - undo operations, DFS
- **Maintaining history** - browser back button, undo/redo

### Types of Stack Problems

1. **Basic Stack Operations** - push, pop, peek for matching/validation
2. **Monotonic Stack** - maintain increasing/decreasing order for range queries
3. **Two Stacks** - implement queue, min stack, expression parsing

### Key C# Patterns
```csharp
// Basic stack usage
Stack&lt;int> stack = new Stack&lt;int>();
stack.Push(x);           // Add to top
stack.Pop();             // Remove and return top
stack.Peek();            // Return top without removing
stack.Count;             // Size
stack.Count > 0          // Not empty check

// Monotonic increasing stack (for next smaller element)
Stack&lt;int> stack = new Stack&lt;int>();
for (int i = 0; i &lt; nums.Length; i++) {
    while (stack.Count > 0 && nums[stack.Peek()] > nums[i]) {
        int idx = stack.Pop();
        result[idx] = nums[i];  // nums[i] is next smaller for nums[idx]
    }
    stack.Push(i);
}
```

### Complexity Patterns
| Operation | Time |
|-----------|------|
| Push | O(1) |
| Pop | O(1) |
| Peek | O(1) |
| Monotonic stack (n elements) | O(n) total |

---

## Problems

### 1. Valid Parentheses
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/valid-parentheses/) | [NeetCode](https://neetcode.io/problems/validate-parentheses)

#### Problem
Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.

A string is valid if:
- Open brackets are closed by the same type of brackets
- Open brackets are closed in the correct order
- Every close bracket has a corresponding open bracket

**Example:**
```
Input: s = "()[]{}"
Output: true

Input: s = "(]"
Output: false
```

#### Intuition
Use a stack to track opening brackets. When we see a closing bracket, check if it matches the most recent opening bracket (top of stack).

#### Brute Force Approach
Repeatedly remove valid pairs until no more can be removed.

- **Time:** O(n²)
- **Space:** O(n)

```csharp
public class Solution {
    public bool IsValid(string s) {
        while (s.Contains("()") || s.Contains("[]") || s.Contains("{}")) {
            s = s.Replace("()", "")
                 .Replace("[]", "")
                 .Replace("{}", "");
        }
        return s.Length == 0;
    }
}
```

#### Optimal Approach
Stack-based matching.

- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public bool IsValid(string s) {
        Stack&lt;char> stack = new Stack&lt;char>();
        Dictionary&lt;char, char> pairs = new Dictionary&lt;char, char> {
            { ')', '(' },
            { ']', '[' },
            { '}', '{' }
        };
        
        foreach (char c in s) {
            if (pairs.ContainsKey(c)) {
                // Closing bracket
                if (stack.Count == 0 || stack.Pop() != pairs[c]) {
                    return false;
                }
            } else {
                // Opening bracket
                stack.Push(c);
            }
        }
        
        return stack.Count == 0;
    }
}
```

#### Key Takeaways
- Use dictionary to map closing → opening brackets
- Stack handles nested structures naturally
- Check stack is empty at the end (all brackets matched)
- Edge case: more closing than opening brackets

---

### 2. Min Stack
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/min-stack/) | [NeetCode](https://neetcode.io/problems/minimum-stack)

#### Problem
Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.

- `push(val)` - pushes element onto stack
- `pop()` - removes top element
- `top()` - gets top element
- `getMin()` - retrieves minimum element

**Example:**
```
MinStack minStack = new MinStack();
minStack.push(-2);
minStack.push(0);
minStack.push(-3);
minStack.getMin(); // Returns -3
minStack.pop();
minStack.getMin(); // Returns -2
```

#### Intuition
Maintain a second stack that tracks the minimum at each level. When we push, also push the current minimum. When we pop, pop from both stacks.

#### Approach: Two Stacks
Main stack for values, min stack for minimums.

- **Time:** O(1) for all operations
- **Space:** O(n) for both stacks

```csharp
public class MinStack {
    private Stack&lt;int> stack;
    private Stack&lt;int> minStack;
    
    public MinStack() {
        stack = new Stack&lt;int>();
        minStack = new Stack&lt;int>();
    }
    
    public void Push(int val) {
        stack.Push(val);
        // Push current minimum (either new value or existing minimum)
        int min = minStack.Count == 0 ? val : Math.Min(val, minStack.Peek());
        minStack.Push(min);
    }
    
    public void Pop() {
        stack.Pop();
        minStack.Pop();
    }
    
    public int Top() {
        return stack.Peek();
    }
    
    public int GetMin() {
        return minStack.Peek();
    }
}
```

#### Alternative: Single Stack with Pairs
Store (value, minAtThisLevel) pairs.

```csharp
public class MinStack {
    private Stack&lt;(int val, int min)> stack;
    
    public MinStack() {
        stack = new Stack&lt;(int, int)>();
    }
    
    public void Push(int val) {
        int min = stack.Count == 0 ? val : Math.Min(val, stack.Peek().min);
        stack.Push((val, min));
    }
    
    public void Pop() {
        stack.Pop();
    }
    
    public int Top() {
        return stack.Peek().val;
    }
    
    public int GetMin() {
        return stack.Peek().min;
    }
}
```

#### Key Takeaways
- Each element remembers the minimum at its level
- Both approaches achieve O(1) for all operations
- Tuple approach uses less code but same space
- Pattern extends to tracking other properties (max, sum, etc.)

---

### 3. Evaluate Reverse Polish Notation
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/evaluate-reverse-polish-notation/) | [NeetCode](https://neetcode.io/problems/evaluate-reverse-polish-notation)

#### Problem
Evaluate the value of an arithmetic expression in Reverse Polish Notation (postfix notation).

Valid operators are `+`, `-`, `*`, `/`. Each operand may be an integer or another expression. Division truncates toward zero.

**Example:**
```
Input: tokens = ["2","1","+","3","*"]
Output: 9
Explanation: ((2 + 1) * 3) = 9

Input: tokens = ["4","13","5","/","+"]
Output: 6
Explanation: (4 + (13 / 5)) = 6
```

#### Intuition
In RPN, when we see an operator, we apply it to the two most recent operands. A stack naturally tracks operands waiting to be used.

#### Optimal Approach
Push numbers to stack, apply operators to top two elements.

- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public int EvalRPN(string[] tokens) {
        Stack&lt;int> stack = new Stack&lt;int>();
        HashSet&lt;string> operators = new HashSet&lt;string> { "+", "-", "*", "/" };
        
        foreach (string token in tokens) {
            if (operators.Contains(token)) {
                int b = stack.Pop();  // Second operand (popped first)
                int a = stack.Pop();  // First operand
                
                int result = token switch {
                    "+" => a + b,
                    "-" => a - b,
                    "*" => a * b,
                    "/" => a / b,
                    _ => throw new ArgumentException("Invalid operator")
                };
                
                stack.Push(result);
            } else {
                stack.Push(int.Parse(token));
            }
        }
        
        return stack.Pop();
    }
}
```

#### Alternative: Without Switch Expression
```csharp
public class Solution {
    public int EvalRPN(string[] tokens) {
        Stack&lt;int> stack = new Stack&lt;int>();
        
        foreach (string token in tokens) {
            if (token == "+" || token == "-" || token == "*" || token == "/") {
                int b = stack.Pop();
                int a = stack.Pop();
                
                if (token == "+") stack.Push(a + b);
                else if (token == "-") stack.Push(a - b);
                else if (token == "*") stack.Push(a * b);
                else stack.Push(a / b);
            } else {
                stack.Push(int.Parse(token));
            }
        }
        
        return stack.Pop();
    }
}
```

#### Key Takeaways
- Pop order matters: first pop is the RIGHT operand
- Division in C# truncates toward zero (matches problem requirement)
- RPN eliminates need for parentheses and operator precedence
- Result is the single remaining element on stack

---

### 4. Generate Parentheses
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/generate-parentheses/) | [NeetCode](https://neetcode.io/problems/generate-parentheses)

#### Problem
Given `n` pairs of parentheses, generate all combinations of well-formed parentheses.

**Example:**
```
Input: n = 3
Output: ["((()))","(()())","(())()","()(())","()()()"]
```

#### Intuition
Use backtracking. At each step, we can add `(` if we haven't used all, or `)` if there are more open than close parentheses.

#### Optimal Approach: Backtracking
Track count of open and close parentheses used.

- **Time:** O(4^n / √n) - Catalan number
- **Space:** O(n) - recursion depth

```csharp
public class Solution {
    public IList&lt;string> GenerateParenthesis(int n) {
        List&lt;string> result = new List&lt;string>();
        Backtrack(result, new StringBuilder(), 0, 0, n);
        return result;
    }
    
    private void Backtrack(List&lt;string> result, StringBuilder current, 
                           int open, int close, int n) {
        // Base case: used all parentheses
        if (current.Length == 2 * n) {
            result.Add(current.ToString());
            return;
        }
        
        // Can add opening parenthesis if we haven't used all
        if (open &lt; n) {
            current.Append('(');
            Backtrack(result, current, open + 1, close, n);
            current.Length--;  // Backtrack
        }
        
        // Can add closing parenthesis if there are unmatched opens
        if (close &lt; open) {
            current.Append(')');
            Backtrack(result, current, open, close + 1, n);
            current.Length--;  // Backtrack
        }
    }
}
```

#### Alternative: Using Stack Explicitly
Track state on a stack instead of recursion.

```csharp
public class Solution {
    public IList&lt;string> GenerateParenthesis(int n) {
        List&lt;string> result = new List&lt;string>();
        Stack&lt;(string str, int open, int close)> stack = new Stack&lt;(string, int, int)>();
        
        stack.Push(("", 0, 0));
        
        while (stack.Count > 0) {
            var (str, open, close) = stack.Pop();
            
            if (str.Length == 2 * n) {
                result.Add(str);
                continue;
            }
            
            if (open &lt; n) {
                stack.Push((str + "(", open + 1, close));
            }
            
            if (close &lt; open) {
                stack.Push((str + ")", open, close + 1));
            }
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Two rules: `open &lt; n` and `close &lt; open`
- This is backtracking, but stack-based iteration also works
- `StringBuilder.Length--` removes last character (backtracking)
- Time complexity involves Catalan numbers C_n = (2n)! / ((n+1)! × n!)

---

### 5. Daily Temperatures
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/daily-temperatures/) | [NeetCode](https://neetcode.io/problems/daily-temperatures)

#### Problem
Given an array of daily temperatures, return an array where `answer[i]` is the number of days until a warmer temperature. If there's no future day with a warmer temperature, put 0.

**Example:**
```
Input: temperatures = [73,74,75,71,69,72,76,73]
Output: [1,1,4,2,1,1,0,0]
```

#### Intuition
Use a monotonic decreasing stack. When we find a warmer day, it's the answer for all cooler days waiting on the stack.

#### Brute Force Approach
For each day, search forward for warmer day.

- **Time:** O(n²)
- **Space:** O(1) excluding output

```csharp
public class Solution {
    public int[] DailyTemperatures(int[] temperatures) {
        int n = temperatures.Length;
        int[] result = new int[n];
        
        for (int i = 0; i &lt; n; i++) {
            for (int j = i + 1; j &lt; n; j++) {
                if (temperatures[j] > temperatures[i]) {
                    result[i] = j - i;
                    break;
                }
            }
        }
        
        return result;
    }
}
```

#### Optimal Approach: Monotonic Decreasing Stack
Store indices; pop when we find a warmer temperature.

- **Time:** O(n) - each index pushed and popped at most once
- **Space:** O(n)

```csharp
public class Solution {
    public int[] DailyTemperatures(int[] temperatures) {
        int n = temperatures.Length;
        int[] result = new int[n];
        Stack&lt;int> stack = new Stack&lt;int>();  // Stores indices
        
        for (int i = 0; i &lt; n; i++) {
            // Pop all days that have found their warmer day
            while (stack.Count > 0 && temperatures[stack.Peek()] &lt; temperatures[i]) {
                int prevDay = stack.Pop();
                result[prevDay] = i - prevDay;
            }
            stack.Push(i);
        }
        
        // Days remaining in stack have no warmer day (result stays 0)
        return result;
    }
}
```

#### Key Takeaways
- **Monotonic decreasing stack**: temperatures decrease from bottom to top
- When we find a higher temperature, we resolve all waiting lower temperatures
- Store indices to calculate distance (days until warmer)
- Pattern applies to: next greater element, stock span, largest rectangle

---

### 6. Car Fleet
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/car-fleet/) | [NeetCode](https://neetcode.io/problems/car-fleet)

#### Problem
`n` cars are driving toward a destination at mile `target`. Given `position` and `speed` arrays, determine how many car fleets will arrive at the destination.

A car fleet is when cars drive bumper to bumper at the same speed. A car cannot pass another car, but can catch up and join its fleet.

**Example:**
```
Input: target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]
Output: 3
```

#### Intuition
Sort cars by position (closest to target first). Calculate time to reach target for each car. If a car behind reaches target faster, it joins the fleet of the car ahead.

#### Approach: Stack-based Fleet Counting
Sort by position descending, use stack to track fleet times.

- **Time:** O(n log n) for sorting
- **Space:** O(n)

```csharp
public class Solution {
    public int CarFleet(int target, int[] position, int[] speed) {
        int n = position.Length;
        if (n == 0) return 0;
        
        // Create (position, time to reach target) pairs
        var cars = new (int pos, double time)[n];
        for (int i = 0; i &lt; n; i++) {
            cars[i] = (position[i], (double)(target - position[i]) / speed[i]);
        }
        
        // Sort by position descending (closest to target first)
        Array.Sort(cars, (a, b) => b.pos.CompareTo(a.pos));
        
        Stack&lt;double> stack = new Stack&lt;double>();  // Fleet arrival times
        
        foreach (var (pos, time) in cars) {
            // If this car is slower (takes more time), it forms a new fleet
            if (stack.Count == 0 || time > stack.Peek()) {
                stack.Push(time);
            }
            // Otherwise, it catches up to the fleet ahead (don't push)
        }
        
        return stack.Count;
    }
}
```

#### Alternative: Without Stack (Just Count)
We only need to count fleets, not track them.

```csharp
public class Solution {
    public int CarFleet(int target, int[] position, int[] speed) {
        int n = position.Length;
        if (n == 0) return 0;
        
        var cars = new (int pos, double time)[n];
        for (int i = 0; i &lt; n; i++) {
            cars[i] = (position[i], (double)(target - position[i]) / speed[i]);
        }
        
        Array.Sort(cars, (a, b) => b.pos.CompareTo(a.pos));
        
        int fleets = 0;
        double slowest = 0;  // Slowest car seen so far
        
        foreach (var (pos, time) in cars) {
            if (time > slowest) {
                fleets++;
                slowest = time;
            }
        }
        
        return fleets;
    }
}
```

#### Key Takeaways
- Sort by position to process front-to-back
- Time to target: `(target - position) / speed`
- Slower car (more time) blocks faster cars behind it
- Faster car joins fleet of slower car ahead
- Stack naturally tracks fleet boundaries

---

### 7. Largest Rectangle in Histogram
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/largest-rectangle-in-histogram/) | [NeetCode](https://neetcode.io/problems/largest-rectangle-in-histogram)

#### Problem
Given an array `heights` representing a histogram, find the area of the largest rectangle that can be formed.

**Example:**
```
Input: heights = [2,1,5,6,2,3]
Output: 10
Explanation: Rectangle of height 5 spanning indices 2-3 has area 5*2 = 10
```

#### Intuition
For each bar, find how far it can extend left and right (bounded by shorter bars). Use a monotonic increasing stack to efficiently find boundaries.

#### Brute Force Approach
For each bar, expand left and right to find rectangle.

- **Time:** O(n²)
- **Space:** O(1)

```csharp
public class Solution {
    public int LargestRectangleArea(int[] heights) {
        int maxArea = 0;
        
        for (int i = 0; i &lt; heights.Length; i++) {
            int height = heights[i];
            
            // Expand left
            int left = i;
            while (left > 0 && heights[left - 1] >= height) {
                left--;
            }
            
            // Expand right
            int right = i;
            while (right &lt; heights.Length - 1 && heights[right + 1] >= height) {
                right++;
            }
            
            int width = right - left + 1;
            maxArea = Math.Max(maxArea, height * width);
        }
        
        return maxArea;
    }
}
```

#### Optimal Approach: Monotonic Increasing Stack
Stack stores indices of bars in increasing height order.

- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public int LargestRectangleArea(int[] heights) {
        Stack&lt;int> stack = new Stack&lt;int>();  // Indices
        int maxArea = 0;
        
        for (int i = 0; i &lt;= heights.Length; i++) {
            // Use 0 as sentinel for the end
            int currentHeight = (i == heights.Length) ? 0 : heights[i];
            
            // Pop bars that are taller than current
            while (stack.Count > 0 && heights[stack.Peek()] > currentHeight) {
                int height = heights[stack.Pop()];
                
                // Width extends from previous stack element to current position
                int width = stack.Count == 0 ? i : i - stack.Peek() - 1;
                
                maxArea = Math.Max(maxArea, height * width);
            }
            
            stack.Push(i);
        }
        
        return maxArea;
    }
}
```

#### Why Does This Work?
1. We maintain bars in **increasing order** on the stack
2. When we encounter a shorter bar, we calculate areas for all taller bars
3. For each popped bar:
   - Right boundary: current position (first shorter bar to the right)
   - Left boundary: previous position on stack (first shorter bar to the left)
   - Width = right - left - 1

#### Alternative: Cleaner with Array Extension
Add 0s at both ends to avoid edge cases.

```csharp
public class Solution {
    public int LargestRectangleArea(int[] heights) {
        // Add sentinels: 0 at start and end
        int[] h = new int[heights.Length + 2];
        Array.Copy(heights, 0, h, 1, heights.Length);
        // h[0] = 0, h[h.Length-1] = 0 (defaults)
        
        Stack&lt;int> stack = new Stack&lt;int>();
        stack.Push(0);  // Push sentinel index
        int maxArea = 0;
        
        for (int i = 1; i &lt; h.Length; i++) {
            while (h[stack.Peek()] > h[i]) {
                int height = h[stack.Pop()];
                int width = i - stack.Peek() - 1;
                maxArea = Math.Max(maxArea, height * width);
            }
            stack.Push(i);
        }
        
        return maxArea;
    }
}
```

#### Key Takeaways
- **Monotonic increasing stack** for "nearest smaller element" problems
- Sentinel values (0s) simplify boundary handling
- Each bar is pushed and popped exactly once → O(n)
- This is the foundation for problems like Maximal Rectangle

---

## Summary

### Pattern Recognition for Stack

| If you see... | Consider... |
|---------------|-------------|
| Matching/balancing pairs | Stack for validation |
| Next greater/smaller element | Monotonic stack |
| Expression evaluation | Operand stack |
| Nested structures | Stack for state |
| Undo/history tracking | Stack for storage |
| Rectangle in histogram | Monotonic increasing stack |

### Monotonic Stack Templates

```csharp
// Monotonic DECREASING stack (next greater element)
for (int i = 0; i &lt; n; i++) {
    while (stack.Count > 0 && arr[stack.Peek()] &lt; arr[i]) {
        int idx = stack.Pop();
        result[idx] = arr[i];  // arr[i] is next greater for arr[idx]
    }
    stack.Push(i);
}

// Monotonic INCREASING stack (next smaller element)
for (int i = 0; i &lt; n; i++) {
    while (stack.Count > 0 && arr[stack.Peek()] > arr[i]) {
        int idx = stack.Pop();
        result[idx] = arr[i];  // arr[i] is next smaller for arr[idx]
    }
    stack.Push(i);
}
```

### C# Stack Quick Reference

```csharp
Stack&lt;int> stack = new Stack&lt;int>();

// Operations
stack.Push(x);           // Add to top: O(1)
stack.Pop();             // Remove and return top: O(1)
stack.Peek();            // Return top without removing: O(1)
stack.Count;             // Number of elements
stack.Count > 0          // Not empty check
stack.Clear();           // Remove all elements
stack.Contains(x);       // Check if element exists: O(n)

// Initialize with collection
Stack&lt;int> stack = new Stack&lt;int>(new[] { 1, 2, 3 });  // 3 is on top
```
