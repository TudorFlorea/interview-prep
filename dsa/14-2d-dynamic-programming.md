# 2D Dynamic Programming

[← Back to Index](/dsa/00-index.md)

## Overview

2D Dynamic Programming uses a 2D array (or matrix) to track state across two dimensions. Common applications include string comparisons, grid paths, and problems with two sequences.

### Common 2D DP Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| Grid Paths | Paths in a matrix | Unique Paths |
| Two Strings | Compare/transform strings | Edit Distance, LCS |
| Intervals | Subproblems on ranges | Matrix Chain, Burst Balloons |
| Knapsack | Items with weights/values | 0/1 Knapsack |

### 2D DP Template
```csharp
// For two sequences of length m and n
int[,] dp = new int[m + 1, n + 1];

// Initialize base cases
for (int i = 0; i <= m; i++) dp[i, 0] = base_case;
for (int j = 0; j <= n; j++) dp[0, j] = base_case;

// Fill the table
for (int i = 1; i <= m; i++) {
    for (int j = 1; j <= n; j++) {
        dp[i, j] = recurrence(dp[i-1, j], dp[i, j-1], dp[i-1, j-1]);
    }
}

return dp[m, n];
```

---

## Problems

### 1. Unique Paths
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/unique-paths/) | [NeetCode](https://neetcode.io/problems/unique-paths)

#### Problem
Robot starts at top-left of m×n grid, can only move right or down. How many unique paths to bottom-right?

**Example:**
```
Input: m = 3, n = 7
Output: 28
```

#### Optimal Approach: DP
- **Time:** O(m × n)
- **Space:** O(n)

```csharp
public class Solution {
    public int UniquePaths(int m, int n) {
        int[] dp = new int[n];
        Array.Fill(dp, 1);  // First row: all 1s
        
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                dp[j] = dp[j] + dp[j - 1];  // From top + from left
            }
        }
        
        return dp[n - 1];
    }
}
```

#### Full 2D Approach
```csharp
public class Solution {
    public int UniquePaths(int m, int n) {
        int[,] dp = new int[m, n];
        
        // First row and column: only one way
        for (int i = 0; i < m; i++) dp[i, 0] = 1;
        for (int j = 0; j < n; j++) dp[0, j] = 1;
        
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                dp[i, j] = dp[i - 1, j] + dp[i, j - 1];
            }
        }
        
        return dp[m - 1, n - 1];
    }
}
```

#### Key Takeaways
- dp[i][j] = paths from top + paths from left
- Base case: first row/column have only one path
- Can optimize to 1D since we only need previous row

---

### 2. Unique Paths II
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/unique-paths-ii/) | [NeetCode](https://neetcode.io/problems/unique-paths-ii)

#### Problem
Same as Unique Paths, but with obstacles (grid value 1 = obstacle).

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(n)

```csharp
public class Solution {
    public int UniquePathsWithObstacles(int[][] obstacleGrid) {
        int m = obstacleGrid.Length;
        int n = obstacleGrid[0].Length;
        
        if (obstacleGrid[0][0] == 1 || obstacleGrid[m - 1][n - 1] == 1) return 0;
        
        int[] dp = new int[n];
        dp[0] = 1;
        
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (obstacleGrid[i][j] == 1) {
                    dp[j] = 0;
                } else if (j > 0) {
                    dp[j] += dp[j - 1];
                }
            }
        }
        
        return dp[n - 1];
    }
}
```

#### Key Takeaways
- Set dp = 0 for obstacle cells
- Check start and end for obstacles early
- Same recurrence, just handle obstacles

---

### 3. Longest Common Subsequence
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/longest-common-subsequence/) | [NeetCode](https://neetcode.io/problems/longest-common-subsequence)

#### Problem
Find the length of the longest common subsequence of two strings.

**Example:**
```
Input: text1 = "abcde", text2 = "ace"
Output: 3  ("ace")
```

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(n)

```csharp
public class Solution {
    public int LongestCommonSubsequence(string text1, string text2) {
        int m = text1.Length, n = text2.Length;
        int[] prev = new int[n + 1];
        int[] curr = new int[n + 1];
        
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1[i - 1] == text2[j - 1]) {
                    curr[j] = prev[j - 1] + 1;
                } else {
                    curr[j] = Math.Max(prev[j], curr[j - 1]);
                }
            }
            var temp = prev;
            prev = curr;
            curr = temp;
        }
        
        return prev[n];
    }
}
```

#### Full 2D Approach
```csharp
public class Solution {
    public int LongestCommonSubsequence(string text1, string text2) {
        int m = text1.Length, n = text2.Length;
        int[,] dp = new int[m + 1, n + 1];
        
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1[i - 1] == text2[j - 1]) {
                    dp[i, j] = dp[i - 1, j - 1] + 1;
                } else {
                    dp[i, j] = Math.Max(dp[i - 1, j], dp[i, j - 1]);
                }
            }
        }
        
        return dp[m, n];
    }
}
```

#### Key Takeaways
- Match: dp[i][j] = dp[i-1][j-1] + 1
- No match: dp[i][j] = max(dp[i-1][j], dp[i][j-1])
- Classic two-string DP pattern

---

### 4. Best Time to Buy and Sell Stock with Cooldown
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/) | [NeetCode](https://neetcode.io/problems/buy-and-sell-crypto-with-cooldown)

#### Problem
Buy and sell stock for max profit. After selling, must wait one day before buying again (cooldown).

**Example:**
```
Input: prices = [1,2,3,0,2]
Output: 3  (buy=1, sell=2, cooldown, buy=0, sell=2)
```

#### Intuition
Track three states: holding, sold (in cooldown), rest (can buy).

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int MaxProfit(int[] prices) {
        if (prices.Length <= 1) return 0;
        
        int held = -prices[0];  // Holding stock
        int sold = 0;           // Just sold (in cooldown)
        int rest = 0;           // Can buy
        
        for (int i = 1; i < prices.Length; i++) {
            int prevHeld = held;
            int prevSold = sold;
            int prevRest = rest;
            
            held = Math.Max(prevHeld, prevRest - prices[i]);  // Keep or buy
            sold = prevHeld + prices[i];                       // Sell
            rest = Math.Max(prevRest, prevSold);               // Do nothing or finish cooldown
        }
        
        return Math.Max(sold, rest);
    }
}
```

#### Key Takeaways
- State machine: held → sold → rest → held
- held: max(held, rest - price)
- sold: held + price
- rest: max(rest, sold)

---

### 5. Coin Change II
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/coin-change-ii/) | [NeetCode](https://neetcode.io/problems/coin-change-ii)

#### Problem
Count the number of combinations to make amount using given coins.

**Example:**
```
Input: amount = 5, coins = [1,2,5]
Output: 4  (5, 2+2+1, 2+1+1+1, 1+1+1+1+1)
```

#### Optimal Approach
- **Time:** O(amount × coins)
- **Space:** O(amount)

```csharp
public class Solution {
    public int Change(int amount, int[] coins) {
        int[] dp = new int[amount + 1];
        dp[0] = 1;  // One way to make 0: use no coins
        
        foreach (int coin in coins) {
            for (int i = coin; i <= amount; i++) {
                dp[i] += dp[i - coin];
            }
        }
        
        return dp[amount];
    }
}
```

#### Key Takeaways
- Outer loop: coins (to avoid duplicate combinations)
- Inner loop: amounts (forwards for unbounded)
- dp[i] += dp[i - coin]: add ways using this coin
- Order matters: coin-first avoids counting [1,2] and [2,1] separately

---

### 6. Target Sum
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/target-sum/) | [NeetCode](https://neetcode.io/problems/target-sum)

#### Problem
Assign + or - to each number to get target sum. Count the ways.

**Example:**
```
Input: nums = [1,1,1,1,1], target = 3
Output: 5  (-1+1+1+1+1 = 3, etc.)
```

#### Intuition
If P = sum of positives, N = sum of negatives: P - N = target, P + N = sum
So P = (sum + target) / 2. Count subsets with sum P.

#### Optimal Approach
- **Time:** O(n × sum)
- **Space:** O(sum)

```csharp
public class Solution {
    public int FindTargetSumWays(int[] nums, int target) {
        int sum = nums.Sum();
        
        if ((sum + target) % 2 != 0 || Math.Abs(target) > sum) return 0;
        
        int subsetSum = (sum + target) / 2;
        
        int[] dp = new int[subsetSum + 1];
        dp[0] = 1;
        
        foreach (int num in nums) {
            for (int i = subsetSum; i >= num; i--) {
                dp[i] += dp[i - num];
            }
        }
        
        return dp[subsetSum];
    }
}
```

#### Key Takeaways
- Transform to subset sum problem
- P = (sum + target) / 2 must be integer
- Backwards iteration for 0/1 (each num used once)

---

### 7. Interleaving String
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/interleaving-string/) | [NeetCode](https://neetcode.io/problems/interleaving-string)

#### Problem
Determine if s3 is formed by interleaving s1 and s2.

**Example:**
```
Input: s1 = "aabcc", s2 = "dbbca", s3 = "aadbbcbcac"
Output: true
```

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(n)

```csharp
public class Solution {
    public bool IsInterleave(string s1, string s2, string s3) {
        int m = s1.Length, n = s2.Length;
        if (m + n != s3.Length) return false;
        
        bool[] dp = new bool[n + 1];
        
        for (int i = 0; i <= m; i++) {
            for (int j = 0; j <= n; j++) {
                if (i == 0 && j == 0) {
                    dp[j] = true;
                } else if (i == 0) {
                    dp[j] = dp[j - 1] && s2[j - 1] == s3[j - 1];
                } else if (j == 0) {
                    dp[j] = dp[j] && s1[i - 1] == s3[i - 1];
                } else {
                    dp[j] = (dp[j] && s1[i - 1] == s3[i + j - 1]) ||
                            (dp[j - 1] && s2[j - 1] == s3[i + j - 1]);
                }
            }
        }
        
        return dp[n];
    }
}
```

#### Key Takeaways
- dp[i][j] = can form s3[0..i+j) using s1[0..i) and s2[0..j)
- Take from s1: dp[i-1][j] && s1[i-1] == s3[i+j-1]
- Take from s2: dp[i][j-1] && s2[j-1] == s3[i+j-1]

---

### 8. Longest Increasing Path in a Matrix
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/longest-increasing-path-in-a-matrix/) | [NeetCode](https://neetcode.io/problems/longest-increasing-path-in-matrix)

#### Problem
Find the longest increasing path in the matrix. Can move in 4 directions.

**Example:**
```
Input: matrix = [[9,9,4],[6,6,8],[2,1,1]]
Output: 4  (1→2→6→9)
```

#### Optimal Approach: DFS with Memoization
- **Time:** O(m × n)
- **Space:** O(m × n)

```csharp
public class Solution {
    private int[,] memo;
    private int[] dr = {0, 0, 1, -1};
    private int[] dc = {1, -1, 0, 0};
    
    public int LongestIncreasingPath(int[][] matrix) {
        int m = matrix.Length, n = matrix[0].Length;
        memo = new int[m, n];
        
        int maxPath = 0;
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                maxPath = Math.Max(maxPath, DFS(matrix, i, j));
            }
        }
        
        return maxPath;
    }
    
    private int DFS(int[][] matrix, int row, int col) {
        if (memo[row, col] != 0) return memo[row, col];
        
        int maxLen = 1;
        
        for (int d = 0; d < 4; d++) {
            int nr = row + dr[d];
            int nc = col + dc[d];
            
            if (nr >= 0 && nr < matrix.Length && 
                nc >= 0 && nc < matrix[0].Length &&
                matrix[nr][nc] > matrix[row][col]) {
                maxLen = Math.Max(maxLen, 1 + DFS(matrix, nr, nc));
            }
        }
        
        memo[row, col] = maxLen;
        return maxLen;
    }
}
```

#### Key Takeaways
- DFS from each cell, cache results
- No need for visited set: can only go to larger values (no cycles)
- Each cell computed once due to memoization

---

### 9. Distinct Subsequences
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/distinct-subsequences/) | [NeetCode](https://neetcode.io/problems/distinct-subsequences)

#### Problem
Count distinct subsequences of s that equal t.

**Example:**
```
Input: s = "rabbbit", t = "rabbit"
Output: 3  (choose different 'b's)
```

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(n)

```csharp
public class Solution {
    public int NumDistinct(string s, string t) {
        int m = s.Length, n = t.Length;
        int[] dp = new int[n + 1];
        dp[0] = 1;  // Empty t is subsequence of any s
        
        for (int i = 1; i <= m; i++) {
            // Iterate backwards to use previous row values
            for (int j = Math.Min(i, n); j >= 1; j--) {
                if (s[i - 1] == t[j - 1]) {
                    dp[j] += dp[j - 1];
                }
            }
        }
        
        return dp[n];
    }
}
```

#### Full 2D Approach
```csharp
public class Solution {
    public int NumDistinct(string s, string t) {
        int m = s.Length, n = t.Length;
        int[,] dp = new int[m + 1, n + 1];
        
        // Empty t is subsequence of any prefix of s
        for (int i = 0; i <= m; i++) dp[i, 0] = 1;
        
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                dp[i, j] = dp[i - 1, j];  // Don't use s[i-1]
                if (s[i - 1] == t[j - 1]) {
                    dp[i, j] += dp[i - 1, j - 1];  // Use s[i-1]
                }
            }
        }
        
        return dp[m, n];
    }
}
```

#### Key Takeaways
- Match: dp[i][j] = dp[i-1][j-1] + dp[i-1][j] (use or skip s[i])
- No match: dp[i][j] = dp[i-1][j] (skip s[i])
- Base: dp[i][0] = 1 (empty t matches any s)

---

### 10. Edit Distance
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/edit-distance/) | [NeetCode](https://neetcode.io/problems/edit-distance)

#### Problem
Find minimum operations (insert, delete, replace) to convert word1 to word2.

**Example:**
```
Input: word1 = "horse", word2 = "ros"
Output: 3  (horse → rorse → rose → ros)
```

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(n)

```csharp
public class Solution {
    public int MinDistance(string word1, string word2) {
        int m = word1.Length, n = word2.Length;
        int[] prev = new int[n + 1];
        int[] curr = new int[n + 1];
        
        // Base: convert empty string to word2[0..j]
        for (int j = 0; j <= n; j++) prev[j] = j;
        
        for (int i = 1; i <= m; i++) {
            curr[0] = i;  // Convert word1[0..i] to empty
            
            for (int j = 1; j <= n; j++) {
                if (word1[i - 1] == word2[j - 1]) {
                    curr[j] = prev[j - 1];  // No operation needed
                } else {
                    curr[j] = 1 + Math.Min(
                        prev[j - 1],    // Replace
                        Math.Min(prev[j],     // Delete
                                 curr[j - 1]) // Insert
                    );
                }
            }
            
            var temp = prev;
            prev = curr;
            curr = temp;
        }
        
        return prev[n];
    }
}
```

#### Full 2D Approach
```csharp
public class Solution {
    public int MinDistance(string word1, string word2) {
        int m = word1.Length, n = word2.Length;
        int[,] dp = new int[m + 1, n + 1];
        
        for (int i = 0; i <= m; i++) dp[i, 0] = i;
        for (int j = 0; j <= n; j++) dp[0, j] = j;
        
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (word1[i - 1] == word2[j - 1]) {
                    dp[i, j] = dp[i - 1, j - 1];
                } else {
                    dp[i, j] = 1 + Math.Min(
                        dp[i - 1, j - 1],  // Replace
                        Math.Min(dp[i - 1, j],   // Delete
                                 dp[i, j - 1])   // Insert
                    );
                }
            }
        }
        
        return dp[m, n];
    }
}
```

#### Key Takeaways
- Match: no cost, dp[i-1][j-1]
- Replace: 1 + dp[i-1][j-1]
- Delete: 1 + dp[i-1][j]
- Insert: 1 + dp[i][j-1]

---

### 11. Burst Balloons
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/burst-balloons/) | [NeetCode](https://neetcode.io/problems/burst-balloons)

#### Problem
Burst balloons to maximize coins. If burst balloon i, get nums[i-1] × nums[i] × nums[i+1].

**Example:**
```
Input: nums = [3,1,5,8]
Output: 167
```

#### Intuition
Think backwards: which balloon is burst last in a range? Use interval DP.

#### Optimal Approach
- **Time:** O(n³)
- **Space:** O(n²)

```csharp
public class Solution {
    public int MaxCoins(int[] nums) {
        int n = nums.Length;
        
        // Add virtual balloons of value 1 at boundaries
        int[] balloons = new int[n + 2];
        balloons[0] = balloons[n + 1] = 1;
        for (int i = 0; i < n; i++) balloons[i + 1] = nums[i];
        
        int[,] dp = new int[n + 2, n + 2];
        // dp[i,j] = max coins from bursting all balloons between i and j (exclusive)
        
        // Iterate by length
        for (int len = 1; len <= n; len++) {
            for (int left = 1; left <= n - len + 1; left++) {
                int right = left + len - 1;
                
                // Try each balloon as the LAST one to burst in this range
                for (int k = left; k <= right; k++) {
                    int coins = balloons[left - 1] * balloons[k] * balloons[right + 1];
                    int total = dp[left, k - 1] + coins + dp[k + 1, right];
                    dp[left, right] = Math.Max(dp[left, right], total);
                }
            }
        }
        
        return dp[1, n];
    }
}
```

#### Key Takeaways
- Interval DP: process by increasing length
- Think of last balloon to burst (not first)
- Add virtual balloons with value 1 at boundaries
- dp[i][j] = max coins for range [i, j]

---

### 12. Regular Expression Matching
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/regular-expression-matching/) | [NeetCode](https://neetcode.io/problems/regular-expression-matching)

#### Problem
Implement regex matching with '.' (any char) and '*' (zero or more of preceding).

**Example:**
```
Input: s = "aab", p = "c*a*b"
Output: true  (c* = "", a* = "aa", b = "b")
```

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(n)

```csharp
public class Solution {
    public bool IsMatch(string s, string p) {
        int m = s.Length, n = p.Length;
        bool[,] dp = new bool[m + 1, n + 1];
        dp[0, 0] = true;
        
        // Handle patterns like a*, a*b*, etc. matching empty string
        for (int j = 2; j <= n; j += 2) {
            if (p[j - 1] == '*') {
                dp[0, j] = dp[0, j - 2];
            }
        }
        
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (p[j - 1] == '*') {
                    // Zero occurrences of preceding char
                    dp[i, j] = dp[i, j - 2];
                    
                    // Or one or more occurrences if chars match
                    if (p[j - 2] == '.' || p[j - 2] == s[i - 1]) {
                        dp[i, j] = dp[i, j] || dp[i - 1, j];
                    }
                } else if (p[j - 1] == '.' || p[j - 1] == s[i - 1]) {
                    dp[i, j] = dp[i - 1, j - 1];
                }
            }
        }
        
        return dp[m, n];
    }
}
```

#### Key Takeaways
- '*' can match zero chars: dp[i][j-2]
- '*' can match one more: dp[i-1][j] if char matches
- '.' matches any single character
- Handle empty string matching patterns like "a*b*"

---

## Summary

### 2D DP Pattern Recognition

| Problem Type | Key Insight |
|-------------|-------------|
| Grid paths | dp[i][j] = paths from top + left |
| Two strings | dp[i][j] uses dp[i-1][j-1], dp[i-1][j], dp[i][j-1] |
| Interval | dp[i][j] = best for range [i, j] |
| Knapsack | dp[i][j] = best using first i items, capacity j |

### Space Optimization
Most 2D DP can be reduced to 1D if we only need previous row:
```csharp
// Instead of dp[m][n]:
int[] prev = new int[n + 1];
int[] curr = new int[n + 1];

// Swap after each row
var temp = prev; prev = curr; curr = temp;
```

### Common Recurrences

```csharp
// LCS (Longest Common Subsequence)
if (s1[i-1] == s2[j-1])
    dp[i,j] = dp[i-1,j-1] + 1
else
    dp[i,j] = max(dp[i-1,j], dp[i,j-1])

// Edit Distance
if (s1[i-1] == s2[j-1])
    dp[i,j] = dp[i-1,j-1]
else
    dp[i,j] = 1 + min(dp[i-1,j-1], dp[i-1,j], dp[i,j-1])

// Distinct Subsequences
dp[i,j] = dp[i-1,j] + (s1[i-1] == s2[j-1] ? dp[i-1,j-1] : 0)
```
