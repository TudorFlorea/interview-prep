# Math & Geometry

[← Back to Index](/dsa/00-index.md)

## Overview

Math and geometry problems test mathematical reasoning, number theory, and spatial understanding. Common topics include:

- **Modular arithmetic**
- **Prime numbers**
- **GCD/LCM**
- **Matrix operations**
- **Geometric calculations**

### Useful Math Formulas

```
Sum of 1 to n:           n * (n + 1) / 2
Sum of squares:          n * (n + 1) * (2n + 1) / 6
Arithmetic series:       n * (first + last) / 2
Geometric series:        a * (1 - r^n) / (1 - r)
GCD (Euclidean):         gcd(a, b) = gcd(b, a % b)
LCM:                     lcm(a, b) = a * b / gcd(a, b)
```

---

## Problems

### 1. Rotate Image
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/rotate-image/) | [NeetCode](https://neetcode.io/problems/rotate-image)

#### Problem
Rotate an n×n matrix 90 degrees clockwise in-place.

**Example:**
```
Input:  [[1,2,3],      Output: [[7,4,1],
         [4,5,6],               [8,5,2],
         [7,8,9]]               [9,6,3]]
```

#### Approach 1: Transpose + Reverse Rows
- **Time:** O(n²)
- **Space:** O(1)

```csharp
public class Solution {
    public void Rotate(int[][] matrix) {
        int n = matrix.Length;
        
        // Transpose (swap across diagonal)
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int temp = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = temp;
            }
        }
        
        // Reverse each row
        for (int i = 0; i < n; i++) {
            Array.Reverse(matrix[i]);
        }
    }
}
```

#### Approach 2: Four-way Swap
```csharp
public class Solution {
    public void Rotate(int[][] matrix) {
        int n = matrix.Length;
        
        for (int i = 0; i < n / 2; i++) {
            for (int j = i; j < n - 1 - i; j++) {
                int temp = matrix[i][j];
                matrix[i][j] = matrix[n - 1 - j][i];
                matrix[n - 1 - j][i] = matrix[n - 1 - i][n - 1 - j];
                matrix[n - 1 - i][n - 1 - j] = matrix[j][n - 1 - i];
                matrix[j][n - 1 - i] = temp;
            }
        }
    }
}
```

#### Key Takeaways
- Transpose + Reverse = 90° clockwise
- Transpose + Reverse columns = 90° counter-clockwise
- Four elements swap in a cycle

---

### 2. Spiral Matrix
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/spiral-matrix/) | [NeetCode](https://neetcode.io/problems/spiral-matrix)

#### Problem
Return all elements in spiral order.

**Example:**
```
Input: [[1,2,3],[4,5,6],[7,8,9]]
Output: [1,2,3,6,9,8,7,4,5]
```

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(1) excluding output

```csharp
public class Solution {
    public IList<int> SpiralOrder(int[][] matrix) {
        List<int> result = new List<int>();
        
        int top = 0, bottom = matrix.Length - 1;
        int left = 0, right = matrix[0].Length - 1;
        
        while (top <= bottom && left <= right) {
            // Right
            for (int c = left; c <= right; c++) {
                result.Add(matrix[top][c]);
            }
            top++;
            
            // Down
            for (int r = top; r <= bottom; r++) {
                result.Add(matrix[r][right]);
            }
            right--;
            
            // Left (check if row still exists)
            if (top <= bottom) {
                for (int c = right; c >= left; c--) {
                    result.Add(matrix[bottom][c]);
                }
                bottom--;
            }
            
            // Up (check if column still exists)
            if (left <= right) {
                for (int r = bottom; r >= top; r--) {
                    result.Add(matrix[r][left]);
                }
                left++;
            }
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Track four boundaries: top, bottom, left, right
- Move boundaries inward after each direction
- Check bounds before left/up traversals

---

### 3. Set Matrix Zeroes
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/set-matrix-zeroes/) | [NeetCode](https://neetcode.io/problems/set-zeroes-in-matrix)

#### Problem
If element is 0, set its entire row and column to 0. Do it in-place.

**Example:**
```
Input:  [[1,1,1],      Output: [[1,0,1],
         [1,0,1],               [0,0,0],
         [1,1,1]]               [1,0,1]]
```

#### Optimal Approach: O(1) Space
Use first row/column as markers.

- **Time:** O(m × n)
- **Space:** O(1)

```csharp
public class Solution {
    public void SetZeroes(int[][] matrix) {
        int m = matrix.Length, n = matrix[0].Length;
        bool firstRowZero = false, firstColZero = false;
        
        // Check if first row/column should be zero
        for (int j = 0; j < n; j++) {
            if (matrix[0][j] == 0) firstRowZero = true;
        }
        for (int i = 0; i < m; i++) {
            if (matrix[i][0] == 0) firstColZero = true;
        }
        
        // Use first row/column as markers
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                if (matrix[i][j] == 0) {
                    matrix[i][0] = 0;
                    matrix[0][j] = 0;
                }
            }
        }
        
        // Set zeros based on markers
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                if (matrix[i][0] == 0 || matrix[0][j] == 0) {
                    matrix[i][j] = 0;
                }
            }
        }
        
        // Handle first row/column
        if (firstRowZero) {
            for (int j = 0; j < n; j++) matrix[0][j] = 0;
        }
        if (firstColZero) {
            for (int i = 0; i < m; i++) matrix[i][0] = 0;
        }
    }
}
```

#### Key Takeaways
- Use first row/col as markers to avoid extra space
- Handle first row/col separately to avoid overwrites
- Process markers before setting first row/col

---

### 4. Happy Number
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/happy-number/) | [NeetCode](https://neetcode.io/problems/is-happy-number)

#### Problem
A happy number eventually reaches 1 when replaced by sum of squares of digits. Detect if number is happy.

**Example:**
```
Input: n = 19
Output: true  (1² + 9² = 82 → 8² + 2² = 68 → ... → 1)
```

#### Approach 1: HashSet
- **Time:** O(log n)
- **Space:** O(log n)

```csharp
public class Solution {
    public bool IsHappy(int n) {
        HashSet<int> seen = new HashSet<int>();
        
        while (n != 1 && !seen.Contains(n)) {
            seen.Add(n);
            n = GetNext(n);
        }
        
        return n == 1;
    }
    
    private int GetNext(int n) {
        int sum = 0;
        while (n > 0) {
            int digit = n % 10;
            sum += digit * digit;
            n /= 10;
        }
        return sum;
    }
}
```

#### Approach 2: Floyd's Cycle Detection
- **Time:** O(log n)
- **Space:** O(1)

```csharp
public class Solution {
    public bool IsHappy(int n) {
        int slow = n, fast = GetNext(n);
        
        while (fast != 1 && slow != fast) {
            slow = GetNext(slow);
            fast = GetNext(GetNext(fast));
        }
        
        return fast == 1;
    }
    
    private int GetNext(int n) {
        int sum = 0;
        while (n > 0) {
            int digit = n % 10;
            sum += digit * digit;
            n /= 10;
        }
        return sum;
    }
}
```

#### Key Takeaways
- Cycle detection: either reaches 1 or enters cycle
- Floyd's algorithm works for O(1) space
- Digit extraction: n % 10 and n / 10

---

### 5. Plus One
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/plus-one/) | [NeetCode](https://neetcode.io/problems/plus-one)

#### Problem
Given a number represented as digit array, add one.

**Example:**
```
Input: digits = [1,2,3]
Output: [1,2,4]

Input: digits = [9,9,9]
Output: [1,0,0,0]
```

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1) or O(n) if carry

```csharp
public class Solution {
    public int[] PlusOne(int[] digits) {
        for (int i = digits.Length - 1; i >= 0; i--) {
            if (digits[i] < 9) {
                digits[i]++;
                return digits;
            }
            digits[i] = 0;
        }
        
        // All 9s case: need new array
        int[] result = new int[digits.Length + 1];
        result[0] = 1;
        return result;
    }
}
```

#### Key Takeaways
- If digit &lt; 9, just increment and return
- If digit = 9, set to 0 and continue carry
- All 9s: create new array with 1 at front

---

### 6. Pow(x, n)
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/powx-n/) | [NeetCode](https://neetcode.io/problems/pow-x-n)

#### Problem
Implement pow(x, n) which calculates x raised to power n.

**Example:**
```
Input: x = 2.0, n = 10
Output: 1024.0

Input: x = 2.0, n = -2
Output: 0.25
```

#### Optimal Approach: Fast Exponentiation
- **Time:** O(log n)
- **Space:** O(1)

```csharp
public class Solution {
    public double MyPow(double x, int n) {
        long N = n;  // Handle int.MinValue
        if (N < 0) {
            x = 1 / x;
            N = -N;
        }
        
        double result = 1.0;
        double current = x;
        
        while (N > 0) {
            if ((N & 1) == 1) {  // N is odd
                result *= current;
            }
            current *= current;  // Square
            N >>= 1;             // Divide by 2
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Binary exponentiation: x^n = (x²)^(n/2)
- Handle negative n: x^(-n) = 1/x^n
- Use long for n to handle int.MinValue

---

### 7. Multiply Strings
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/multiply-strings/) | [NeetCode](https://neetcode.io/problems/multiply-strings)

#### Problem
Multiply two non-negative integers represented as strings.

**Example:**
```
Input: num1 = "123", num2 = "456"
Output: "56088"
```

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(m + n)

```csharp
public class Solution {
    public string Multiply(string num1, string num2) {
        if (num1 == "0" || num2 == "0") return "0";
        
        int m = num1.Length, n = num2.Length;
        int[] result = new int[m + n];
        
        // Multiply each digit pair
        for (int i = m - 1; i >= 0; i--) {
            for (int j = n - 1; j >= 0; j--) {
                int mul = (num1[i] - '0') * (num2[j] - '0');
                int p1 = i + j, p2 = i + j + 1;
                
                int sum = mul + result[p2];
                result[p2] = sum % 10;
                result[p1] += sum / 10;
            }
        }
        
        StringBuilder sb = new StringBuilder();
        foreach (int digit in result) {
            if (!(sb.Length == 0 && digit == 0)) {
                sb.Append(digit);
            }
        }
        
        return sb.Length == 0 ? "0" : sb.ToString();
    }
}
```

#### Key Takeaways
- num1[i] × num2[j] contributes to positions i+j and i+j+1
- Process carries during multiplication
- Skip leading zeros

---

### 8. Detect Squares
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/detect-squares/) | [NeetCode](https://neetcode.io/problems/detect-squares)

#### Problem
Design a data structure that:
- Adds points
- Counts squares with query point as one corner

**Example:**
```
DetectSquares ds = new DetectSquares();
ds.add([3,10]);
ds.add([11,2]);
ds.add([3,2]);
ds.count([11,10]);  // Returns 1 (square with corners [3,10],[11,2],[3,2],[11,10])
```

#### Optimal Approach
- **Time:** O(n) for count, O(1) for add
- **Space:** O(n)

```csharp
public class DetectSquares {
    private Dictionary<(int, int), int> pointCount;
    private List<int[]> points;
    
    public DetectSquares() {
        pointCount = new Dictionary<(int, int), int>();
        points = new List<int[]>();
    }
    
    public void Add(int[] point) {
        var key = (point[0], point[1]);
        pointCount[key] = pointCount.GetValueOrDefault(key, 0) + 1;
        points.Add(point);
    }
    
    public int Count(int[] point) {
        int px = point[0], py = point[1];
        int count = 0;
        
        foreach (var p in points) {
            int x = p[0], y = p[1];
            
            // Find diagonal point (same distance from query point)
            if (Math.Abs(px - x) != Math.Abs(py - y) || px == x || py == y) {
                continue;  // Not diagonal or same point
            }
            
            // Check other two corners exist
            count += pointCount.GetValueOrDefault((px, y), 0) * 
                     pointCount.GetValueOrDefault((x, py), 0);
        }
        
        return count;
    }
}
```

#### Key Takeaways
- For each diagonal point, check other two corners
- Square condition: |px - x| = |py - y| and px ≠ x
- Multiply counts for duplicate points

---

## Summary

### Common Math Patterns

| Pattern | Technique |
|---------|-----------|
| Digit manipulation | n % 10, n / 10 |
| Fast power | Binary exponentiation |
| Cycle detection | Floyd's algorithm |
| Matrix rotation | Transpose + reverse |
| Modular arithmetic | (a + b) % m = ((a % m) + (b % m)) % m |

### Matrix Transformations

```csharp
// 90° clockwise: transpose then reverse rows
// 90° counter-clockwise: reverse rows then transpose
// 180°: reverse rows then reverse columns

// Transpose
for (int i = 0; i < n; i++)
    for (int j = i + 1; j < n; j++)
        swap(matrix[i][j], matrix[j][i])
```

### Number Theory

```csharp
// GCD (Greatest Common Divisor)
int GCD(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

// LCM (Least Common Multiple)
int LCM(int a, int b) => a / GCD(a, b) * b;

// Check if prime
bool IsPrime(int n) {
    if (n <= 1) return false;
    for (int i = 2; i * i <= n; i++)
        if (n % i == 0) return false;
    return true;
}
```
