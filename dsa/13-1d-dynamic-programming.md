# 1D Dynamic Programming

[← Back to Index](/dsa/00-index.md)

## Overview

Dynamic Programming (DP) solves problems by breaking them into overlapping subproblems and storing results to avoid recomputation. 1D DP uses a single dimension (often an array) to track state.

### When to Use DP
- **Optimal substructure**: optimal solution contains optimal solutions to subproblems
- **Overlapping subproblems**: same subproblems solved repeatedly
- Keywords: "maximum", "minimum", "count ways", "is it possible"

### DP Approaches

| Approach | Description | Direction |
|----------|-------------|-----------|
| **Top-Down (Memoization)** | Recursive with cache | Start from target, work down |
| **Bottom-Up (Tabulation)** | Iterative, build table | Start from base cases, work up |

### DP Template
```csharp
// Bottom-up template
int[] dp = new int[n + 1];
dp[0] = base_case;  // Initialize base cases

for (int i = 1; i <= n; i++) {
    dp[i] = optimal(dp[i-1], dp[i-2], ...);  // Recurrence
}

return dp[n];
```

---

## Problems

### 1. Climbing Stairs
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/climbing-stairs/) | [NeetCode](https://neetcode.io/problems/climbing-stairs)

#### Problem
You can climb 1 or 2 steps. How many distinct ways to reach step n?

**Example:**
```
Input: n = 3
Output: 3  (1+1+1, 1+2, 2+1)
```

#### Intuition
To reach step n, you came from step n-1 or n-2. This is the Fibonacci sequence.

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int ClimbStairs(int n) {
        if (n <= 2) return n;
        
        int prev2 = 1, prev1 = 2;
        
        for (int i = 3; i <= n; i++) {
            int current = prev1 + prev2;
            prev2 = prev1;
            prev1 = current;
        }
        
        return prev1;
    }
}
```

#### Key Takeaways
- dp[n] = dp[n-1] + dp[n-2]
- Only need last two values → O(1) space
- Base cases: dp[1] = 1, dp[2] = 2

---

### 2. Min Cost Climbing Stairs
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/min-cost-climbing-stairs/) | [NeetCode](https://neetcode.io/problems/min-cost-climbing-stairs)

#### Problem
Given cost array where cost[i] is cost to climb from step i, find minimum cost to reach top (beyond last step). Can start at step 0 or 1.

**Example:**
```
Input: cost = [10,15,20]
Output: 15  (Start at index 1, pay 15, jump 2 steps to top)
```

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int MinCostClimbingStairs(int[] cost) {
        int n = cost.Length;
        int prev2 = cost[0], prev1 = cost[1];
        
        for (int i = 2; i < n; i++) {
            int current = cost[i] + Math.Min(prev1, prev2);
            prev2 = prev1;
            prev1 = current;
        }
        
        return Math.Min(prev1, prev2);  // Can reach top from last or second-last
    }
}
```

#### Key Takeaways
- dp[i] = cost[i] + min(dp[i-1], dp[i-2])
- Can reach "top" from either of last two steps
- Answer is min(dp[n-1], dp[n-2])

---

### 3. House Robber
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/house-robber/) | [NeetCode](https://neetcode.io/problems/house-robber)

#### Problem
Rob houses for maximum money. Cannot rob adjacent houses.

**Example:**
```
Input: nums = [2,7,9,3,1]
Output: 12  (Rob houses 0, 2, 4: 2+9+1)
```

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int Rob(int[] nums) {
        if (nums.Length == 1) return nums[0];
        
        int prev2 = nums[0];              // Max if we're at house 0
        int prev1 = Math.Max(nums[0], nums[1]);  // Max if we're at house 1
        
        for (int i = 2; i < nums.Length; i++) {
            int current = Math.Max(
                prev1,              // Don't rob house i
                prev2 + nums[i]     // Rob house i (skip i-1)
            );
            prev2 = prev1;
            prev1 = current;
        }
        
        return prev1;
    }
}
```

#### Key Takeaways
- dp[i] = max(dp[i-1], dp[i-2] + nums[i])
- Choice: rob this house or skip it
- Classic "take or skip" DP pattern

---

### 4. House Robber II
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/house-robber-ii/) | [NeetCode](https://neetcode.io/problems/house-robber-ii)

#### Problem
Same as House Robber, but houses are in a circle (first and last are adjacent).

#### Intuition
Can't rob both first and last. Try two cases: exclude first or exclude last.

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int Rob(int[] nums) {
        if (nums.Length == 1) return nums[0];
        
        // Case 1: Rob houses 0 to n-2 (exclude last)
        // Case 2: Rob houses 1 to n-1 (exclude first)
        return Math.Max(
            RobRange(nums, 0, nums.Length - 2),
            RobRange(nums, 1, nums.Length - 1)
        );
    }
    
    private int RobRange(int[] nums, int start, int end) {
        if (start == end) return nums[start];
        
        int prev2 = nums[start];
        int prev1 = Math.Max(nums[start], nums[start + 1]);
        
        for (int i = start + 2; i <= end; i++) {
            int current = Math.Max(prev1, prev2 + nums[i]);
            prev2 = prev1;
            prev1 = current;
        }
        
        return prev1;
    }
}
```

#### Key Takeaways
- Circular constraint: can't take both first and last
- Solve twice: once excluding first, once excluding last
- Take maximum of two cases

---

### 5. Longest Palindromic Substring
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/longest-palindromic-substring/) | [NeetCode](https://neetcode.io/problems/longest-palindromic-substring)

#### Problem
Find the longest palindromic substring.

**Example:**
```
Input: s = "babad"
Output: "bab" or "aba"
```

#### Approach 1: Expand Around Center
- **Time:** O(n²)
- **Space:** O(1)

```csharp
public class Solution {
    public string LongestPalindrome(string s) {
        int start = 0, maxLen = 0;
        
        for (int i = 0; i < s.Length; i++) {
            // Odd length: center at i
            int len1 = ExpandAroundCenter(s, i, i);
            // Even length: center between i and i+1
            int len2 = ExpandAroundCenter(s, i, i + 1);
            
            int len = Math.Max(len1, len2);
            if (len > maxLen) {
                maxLen = len;
                start = i - (len - 1) / 2;
            }
        }
        
        return s.Substring(start, maxLen);
    }
    
    private int ExpandAroundCenter(string s, int left, int right) {
        while (left >= 0 && right < s.Length && s[left] == s[right]) {
            left--;
            right++;
        }
        return right - left - 1;
    }
}
```

#### Approach 2: DP
- **Time:** O(n²)
- **Space:** O(n²)

```csharp
public class Solution {
    public string LongestPalindrome(string s) {
        int n = s.Length;
        bool[,] dp = new bool[n, n];  // dp[i,j] = s[i..j] is palindrome
        
        int start = 0, maxLen = 1;
        
        // All substrings of length 1 are palindromes
        for (int i = 0; i < n; i++) dp[i, i] = true;
        
        // Check length 2
        for (int i = 0; i < n - 1; i++) {
            if (s[i] == s[i + 1]) {
                dp[i, i + 1] = true;
                start = i;
                maxLen = 2;
            }
        }
        
        // Check lengths 3 to n
        for (int len = 3; len <= n; len++) {
            for (int i = 0; i <= n - len; i++) {
                int j = i + len - 1;
                if (s[i] == s[j] && dp[i + 1, j - 1]) {
                    dp[i, j] = true;
                    start = i;
                    maxLen = len;
                }
            }
        }
        
        return s.Substring(start, maxLen);
    }
}
```

#### Key Takeaways
- Expand around center is simpler and uses O(1) space
- DP: dp[i][j] = (s[i] == s[j]) && dp[i+1][j-1]
- Consider both odd and even length palindromes

---

### 6. Palindromic Substrings
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/palindromic-substrings/) | [NeetCode](https://neetcode.io/problems/palindromic-substrings)

#### Problem
Count the number of palindromic substrings.

**Example:**
```
Input: s = "aaa"
Output: 6  ("a", "a", "a", "aa", "aa", "aaa")
```

#### Optimal Approach: Expand Around Center
- **Time:** O(n²)
- **Space:** O(1)

```csharp
public class Solution {
    public int CountSubstrings(string s) {
        int count = 0;
        
        for (int i = 0; i < s.Length; i++) {
            count += CountPalindromes(s, i, i);      // Odd
            count += CountPalindromes(s, i, i + 1);  // Even
        }
        
        return count;
    }
    
    private int CountPalindromes(string s, int left, int right) {
        int count = 0;
        while (left >= 0 && right < s.Length && s[left] == s[right]) {
            count++;
            left--;
            right++;
        }
        return count;
    }
}
```

---

### 7. Decode Ways
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/decode-ways/) | [NeetCode](https://neetcode.io/problems/decode-ways)

#### Problem
Given a string of digits, count ways to decode it (A=1, B=2, ..., Z=26).

**Example:**
```
Input: s = "226"
Output: 3  ("BZ", "VF", "BBF")
```

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int NumDecodings(string s) {
        if (s[0] == '0') return 0;
        
        int prev2 = 1;  // dp[i-2]: ways to decode empty prefix
        int prev1 = 1;  // dp[i-1]: ways to decode first char
        
        for (int i = 1; i < s.Length; i++) {
            int current = 0;
            
            // Single digit decode
            if (s[i] != '0') {
                current += prev1;
            }
            
            // Two digit decode
            int twoDigit = int.Parse(s.Substring(i - 1, 2));
            if (twoDigit >= 10 && twoDigit <= 26) {
                current += prev2;
            }
            
            prev2 = prev1;
            prev1 = current;
        }
        
        return prev1;
    }
}
```

#### Key Takeaways
- dp[i] = ways using single digit + ways using two digits
- Single digit: s[i] != '0' → add dp[i-1]
- Two digits: 10-26 → add dp[i-2]
- Leading zero is invalid

---

### 8. Coin Change
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/coin-change/) | [NeetCode](https://neetcode.io/problems/coin-change)

#### Problem
Find minimum coins to make amount. Return -1 if impossible.

**Example:**
```
Input: coins = [1,2,5], amount = 11
Output: 3  (5+5+1)
```

#### Optimal Approach
- **Time:** O(amount × coins)
- **Space:** O(amount)

```csharp
public class Solution {
    public int CoinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Array.Fill(dp, amount + 1);  // Use large value instead of int.MaxValue
        dp[0] = 0;
        
        for (int i = 1; i <= amount; i++) {
            foreach (int coin in coins) {
                if (coin <= i) {
                    dp[i] = Math.Min(dp[i], dp[i - coin] + 1);
                }
            }
        }
        
        return dp[amount] > amount ? -1 : dp[amount];
    }
}
```

#### Key Takeaways
- dp[i] = min coins to make amount i
- For each amount, try each coin: dp[i] = min(dp[i], dp[i-coin] + 1)
- Use amount+1 as infinity (max coins is amount when using coin=1)

---

### 9. Maximum Product Subarray
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/maximum-product-subarray/) | [NeetCode](https://neetcode.io/problems/maximum-product-subarray)

#### Problem
Find the contiguous subarray with the largest product.

**Example:**
```
Input: nums = [2,3,-2,4]
Output: 6  ([2,3])
```

#### Intuition
Track both max and min products because a negative number can turn min into max.

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int MaxProduct(int[] nums) {
        int maxProd = nums[0];
        int minProd = nums[0];
        int result = nums[0];
        
        for (int i = 1; i < nums.Length; i++) {
            int num = nums[i];
            
            // If negative, max becomes min and vice versa
            if (num < 0) {
                int temp = maxProd;
                maxProd = minProd;
                minProd = temp;
            }
            
            maxProd = Math.Max(num, maxProd * num);
            minProd = Math.Min(num, minProd * num);
            
            result = Math.Max(result, maxProd);
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Negative × negative = positive, so track minimum too
- Swap max/min when current number is negative
- At each position: max(num, maxProd × num)

---

### 10. Word Break
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/word-break/) | [NeetCode](https://neetcode.io/problems/word-break)

#### Problem
Determine if string can be segmented into dictionary words.

**Example:**
```
Input: s = "leetcode", wordDict = ["leet","code"]
Output: true
```

#### Optimal Approach
- **Time:** O(n² × m) where m = avg word length
- **Space:** O(n)

```csharp
public class Solution {
    public bool WordBreak(string s, IList<string> wordDict) {
        HashSet<string> words = new HashSet<string>(wordDict);
        bool[] dp = new bool[s.Length + 1];
        dp[0] = true;  // Empty string can be segmented
        
        for (int i = 1; i <= s.Length; i++) {
            for (int j = 0; j < i; j++) {
                if (dp[j] && words.Contains(s.Substring(j, i - j))) {
                    dp[i] = true;
                    break;
                }
            }
        }
        
        return dp[s.Length];
    }
}
```

#### Key Takeaways
- dp[i] = true if s[0..i) can be segmented
- For each position, check all possible last words
- dp[i] = true if dp[j] && s[j..i) is in dictionary

---

### 11. Longest Increasing Subsequence
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/longest-increasing-subsequence/) | [NeetCode](https://neetcode.io/problems/longest-increasing-subsequence)

#### Problem
Find length of longest strictly increasing subsequence.

**Example:**
```
Input: nums = [10,9,2,5,3,7,101,18]
Output: 4  ([2,3,7,101])
```

#### Approach 1: DP O(n²)
- **Time:** O(n²)
- **Space:** O(n)

```csharp
public class Solution {
    public int LengthOfLIS(int[] nums) {
        int[] dp = new int[nums.Length];
        Array.Fill(dp, 1);
        
        int maxLen = 1;
        
        for (int i = 1; i < nums.Length; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) {
                    dp[i] = Math.Max(dp[i], dp[j] + 1);
                }
            }
            maxLen = Math.Max(maxLen, dp[i]);
        }
        
        return maxLen;
    }
}
```

#### Approach 2: Binary Search O(n log n)
- **Time:** O(n log n)
- **Space:** O(n)

```csharp
public class Solution {
    public int LengthOfLIS(int[] nums) {
        List<int> sub = new List<int>();
        
        foreach (int num in nums) {
            int pos = BinarySearch(sub, num);
            if (pos == sub.Count) {
                sub.Add(num);
            } else {
                sub[pos] = num;  // Replace with smaller value
            }
        }
        
        return sub.Count;
    }
    
    private int BinarySearch(List<int> sub, int target) {
        int left = 0, right = sub.Count;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (sub[mid] < target) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        return left;
    }
}
```

#### Key Takeaways
- DP: dp[i] = 1 + max(dp[j]) for all j where nums[j] &lt; nums[i]
- Binary search: maintain smallest tail of each length subsequence
- Binary search doesn't give actual subsequence, just length

---

### 12. Partition Equal Subset Sum
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/partition-equal-subset-sum/) | [NeetCode](https://neetcode.io/problems/partition-equal-subset-sum)

#### Problem
Determine if array can be partitioned into two subsets with equal sum.

**Example:**
```
Input: nums = [1,5,11,5]
Output: true  ([1,5,5] and [11])
```

#### Intuition
Find if there's a subset with sum = totalSum/2. This is the 0/1 knapsack problem.

#### Optimal Approach
- **Time:** O(n × sum)
- **Space:** O(sum)

```csharp
public class Solution {
    public bool CanPartition(int[] nums) {
        int sum = nums.Sum();
        
        // Can't partition odd sum
        if (sum % 2 != 0) return false;
        
        int target = sum / 2;
        bool[] dp = new bool[target + 1];
        dp[0] = true;
        
        foreach (int num in nums) {
            // Iterate backwards to avoid using same element twice
            for (int j = target; j >= num; j--) {
                dp[j] = dp[j] || dp[j - num];
            }
        }
        
        return dp[target];
    }
}
```

#### Key Takeaways
- Equivalent to: can we make subset sum = total/2?
- 0/1 knapsack: each element used at most once
- Iterate backwards to not use same element twice

---

## Summary

### Common DP Patterns

| Pattern | Example | Recurrence |
|---------|---------|------------|
| Fibonacci-style | Climbing Stairs | dp[i] = dp[i-1] + dp[i-2] |
| Take or Skip | House Robber | dp[i] = max(dp[i-1], dp[i-2] + val) |
| Unbounded | Coin Change | dp[i] = min(dp[i-coin] + 1) |
| LIS | Longest Increasing | dp[i] = max(dp[j] + 1) where j &lt; i |
| Knapsack | Partition Subset | dp[j] = dp[j] || dp[j-num] |

### Space Optimization
Many 1D DP problems only depend on previous 1-2 values:
```csharp
// Instead of dp[n]:
int prev2 = base_case2;
int prev1 = base_case1;

for (int i = 2; i <= n; i++) {
    int current = f(prev1, prev2);
    prev2 = prev1;
    prev1 = current;
}
return prev1;
```

### DP vs Greedy
- **DP**: Try all options, remember best
- **Greedy**: Make locally optimal choice at each step
- Use DP when greedy doesn't guarantee global optimum
