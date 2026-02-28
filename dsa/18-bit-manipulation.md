# Bit Manipulation

[← Back to Index](/dsa/00-index.md)

## Overview

Bit manipulation uses bitwise operators to solve problems efficiently. It's essential for low-level programming, optimization, and problems involving binary representations.

### Bitwise Operators in C#

| Operator | Name | Example | Result |
|----------|------|---------|--------|
| `&` | AND | `5 & 3` | 1 (0101 & 0011 = 0001) |
| `\|` | OR | `5 \| 3` | 7 (0101 \| 0011 = 0111) |
| `^` | XOR | `5 ^ 3` | 6 (0101 ^ 0011 = 0110) |
| `~` | NOT | `~5` | -6 (inverts all bits) |
| `<<` | Left Shift | `5 << 1` | 10 (multiply by 2) |
| `>>` | Right Shift | `5 >> 1` | 2 (divide by 2) |

### Key XOR Properties
```
a ^ 0 = a           (identity)
a ^ a = 0           (self-inverse)
a ^ b ^ a = b       (cancellation)
a ^ b = b ^ a       (commutative)
(a ^ b) ^ c = a ^ (b ^ c)  (associative)
```

### Useful Bit Tricks
```csharp
// Check if n is power of 2
bool isPow2 = (n & (n - 1)) == 0 && n > 0;

// Get i-th bit (0-indexed from right)
int bit = (n >> i) & 1;

// Set i-th bit
n = n | (1 << i);

// Clear i-th bit
n = n & ~(1 << i);

// Toggle i-th bit
n = n ^ (1 << i);

// Get lowest set bit
int lowest = n & (-n);

// Clear lowest set bit
n = n & (n - 1);

// Count set bits
int count = 0;
while (n > 0) {
    count += n & 1;
    n >>= 1;
}
```

---

## Problems

### 1. Single Number
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/single-number/) | [NeetCode](https://neetcode.io/problems/single-number)

#### Problem
Every element appears twice except one. Find the single one.

**Example:**
```
Input: nums = [2,2,1]
Output: 1
```

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int SingleNumber(int[] nums) {
        int result = 0;
        foreach (int num in nums) {
            result ^= num;
        }
        return result;
    }
}
```

#### Key Takeaways
- XOR of number with itself is 0
- XOR of number with 0 is the number
- All pairs cancel out, leaving the single number

---

### 2. Number of 1 Bits
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/number-of-1-bits/) | [NeetCode](https://neetcode.io/problems/number-of-one-bits)

#### Problem
Return number of '1' bits (Hamming weight) in an unsigned integer.

**Example:**
```
Input: n = 11 (binary: 1011)
Output: 3
```

#### Approach 1: Check Each Bit
- **Time:** O(32)
- **Space:** O(1)

```csharp
public class Solution {
    public int HammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            count += n & 1;
            n = (int)((uint)n >> 1);  // Unsigned right shift
        }
        return count;
    }
}
```

#### Approach 2: Brian Kernighan's Algorithm
- **Time:** O(number of 1s)
- **Space:** O(1)

```csharp
public class Solution {
    public int HammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n &= (n - 1);  // Clear lowest set bit
            count++;
        }
        return count;
    }
}
```

#### Key Takeaways
- n & (n-1) clears the lowest set bit
- Brian Kernighan's is faster when few bits are set
- C# int is signed; use unsigned shift for negative numbers

---

### 3. Counting Bits
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/counting-bits/) | [NeetCode](https://neetcode.io/problems/counting-bits)

#### Problem
For each number from 0 to n, count the number of 1s in its binary representation.

**Example:**
```
Input: n = 5
Output: [0,1,1,2,1,2]  (0,1,10,11,100,101)
```

#### Optimal Approach: DP
- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public int[] CountBits(int n) {
        int[] dp = new int[n + 1];
        
        for (int i = 1; i <= n; i++) {
            dp[i] = dp[i >> 1] + (i & 1);
            // Alternatively: dp[i] = dp[i & (i - 1)] + 1;
        }
        
        return dp;
    }
}
```

#### Key Takeaways
- dp[i] = dp[i/2] + (last bit of i)
- Or: dp[i] = dp[i without lowest bit] + 1
- Build on previously computed values

---

### 4. Reverse Bits
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/reverse-bits/) | [NeetCode](https://neetcode.io/problems/reverse-bits)

#### Problem
Reverse bits of a 32-bit unsigned integer.

**Example:**
```
Input:  00000010100101000001111010011100
Output: 00111001011110000010100101000000
```

#### Optimal Approach
- **Time:** O(32)
- **Space:** O(1)

```csharp
public class Solution {
    public uint reverseBits(uint n) {
        uint result = 0;
        
        for (int i = 0; i < 32; i++) {
            result <<= 1;          // Make room for next bit
            result |= (n & 1);     // Add last bit of n
            n >>= 1;               // Move to next bit
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Extract bits from right, add to result from left
- Shift result left, n right
- Process all 32 bits

---

### 5. Missing Number
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/missing-number/) | [NeetCode](https://neetcode.io/problems/missing-number)

#### Problem
Given array containing n distinct numbers from [0, n], find the missing one.

**Example:**
```
Input: nums = [3,0,1]
Output: 2
```

#### Approach 1: XOR
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int MissingNumber(int[] nums) {
        int xor = nums.Length;
        
        for (int i = 0; i < nums.Length; i++) {
            xor ^= i ^ nums[i];
        }
        
        return xor;
    }
}
```

#### Approach 2: Math (Sum)
```csharp
public class Solution {
    public int MissingNumber(int[] nums) {
        int n = nums.Length;
        int expectedSum = n * (n + 1) / 2;
        int actualSum = nums.Sum();
        return expectedSum - actualSum;
    }
}
```

#### Key Takeaways
- XOR: numbers appearing twice cancel out
- XOR [0..n] with all nums, remaining is missing
- Math: expected sum - actual sum = missing

---

### 6. Sum of Two Integers
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/sum-of-two-integers/) | [NeetCode](https://neetcode.io/problems/sum-of-two-integers)

#### Problem
Calculate sum of two integers without using + or -.

**Example:**
```
Input: a = 1, b = 2
Output: 3
```

#### Optimal Approach
- **Time:** O(32)
- **Space:** O(1)

```csharp
public class Solution {
    public int GetSum(int a, int b) {
        while (b != 0) {
            int carry = a & b;      // Carry where both bits are 1
            a = a ^ b;              // Sum without carry
            b = carry << 1;         // Shift carry left
        }
        return a;
    }
}
```

#### How It Works
```
a = 5 (0101), b = 3 (0011)

Step 1:
carry = 0101 & 0011 = 0001
a = 0101 ^ 0011 = 0110
b = 0001 << 1 = 0010

Step 2:
carry = 0110 & 0010 = 0010
a = 0110 ^ 0010 = 0100
b = 0010 << 1 = 0100

Step 3:
carry = 0100 & 0100 = 0100
a = 0100 ^ 0100 = 0000
b = 0100 << 1 = 1000

Step 4:
carry = 0000 & 1000 = 0000
a = 0000 ^ 1000 = 1000 = 8
b = 0000 << 1 = 0000

Result: 8
```

#### Key Takeaways
- XOR gives sum without carry
- AND gives carry positions
- Shift carry left and repeat

---

### 7. Reverse Integer
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/reverse-integer/) | [NeetCode](https://neetcode.io/problems/reverse-integer)

#### Problem
Reverse digits of a 32-bit signed integer. Return 0 if overflow.

**Example:**
```
Input: x = 123
Output: 321

Input: x = -123
Output: -321
```

#### Optimal Approach
- **Time:** O(log x)
- **Space:** O(1)

```csharp
public class Solution {
    public int Reverse(int x) {
        int result = 0;
        
        while (x != 0) {
            int digit = x % 10;
            x /= 10;
            
            // Check for overflow before it happens
            if (result > int.MaxValue / 10 || 
                (result == int.MaxValue / 10 && digit > 7)) {
                return 0;
            }
            if (result < int.MinValue / 10 || 
                (result == int.MinValue / 10 && digit < -8)) {
                return 0;
            }
            
            result = result * 10 + digit;
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Extract digits from right using % 10
- Check overflow BEFORE multiplying
- int.MaxValue = 2147483647, int.MinValue = -2147483648

---

## Summary

### Common Bit Patterns

| Pattern | Operation |
|---------|-----------|
| Check if bit i is set | `(n >> i) & 1` |
| Set bit i | `n \| (1 << i)` |
| Clear bit i | `n & ~(1 << i)` |
| Toggle bit i | `n ^ (1 << i)` |
| Clear lowest set bit | `n & (n - 1)` |
| Get lowest set bit | `n & (-n)` |
| Check power of 2 | `(n & (n-1)) == 0` |

### XOR Applications
- Find single unique element
- Find missing number
- Swap without temp: `a ^= b; b ^= a; a ^= b;`

### Addition Without +
```
Sum = a ^ b          (add without carry)
Carry = (a & b) << 1 (calculate carry)
Repeat until no carry
```

### Bit Count Methods
1. **Loop through bits**: O(32)
2. **Brian Kernighan**: O(number of 1s)
3. **Lookup table**: O(1) with preprocessing
4. **Built-in**: `BitOperations.PopCount(uint n)`

### C# Specific Notes
```csharp
// C# int is signed, be careful with right shift
int n = -1;
n >> 1;  // Arithmetic shift, keeps sign bit
(int)((uint)n >> 1);  // Logical shift, fills with 0

// BitOperations class (System.Numerics)
BitOperations.PopCount((uint)n);  // Count 1s
BitOperations.LeadingZeroCount((uint)n);
BitOperations.TrailingZeroCount((uint)n);
```

### Binary Representation
```csharp
// Convert to binary string
string binary = Convert.ToString(n, 2);

// Parse binary string
int n = Convert.ToInt32("1010", 2);  // 10
```
