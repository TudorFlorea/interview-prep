# Sliding Window

[← Back to Index](00-index.md)

## Overview

The Sliding Window technique maintains a "window" over a contiguous subarray or substring, expanding and contracting it to find optimal solutions. This pattern often reduces O(n²) or O(n³) brute force solutions to O(n).

### When to Use This Pattern
- Finding **subarray/substring** with specific property (min/max length, sum, characters)
- Problems with words like "contiguous", "substring", "subarray"
- Need to track elements within a range that changes

### Types of Sliding Windows

1. **Fixed Size Window** - Window size is constant
   - "Find max sum of k consecutive elements"
   - "Find average of each window of size k"

2. **Variable Size Window** - Window expands/contracts based on conditions
   - "Minimum window containing all characters"
   - "Longest substring without repeating characters"

### Key C# Patterns
```csharp
// Fixed size window
int windowSum = 0;
for (int i = 0; i &lt; k; i++) windowSum += arr[i];  // Initialize
for (int i = k; i &lt; arr.Length; i++) {
    windowSum += arr[i] - arr[i - k];  // Slide: add new, remove old
}

// Variable size window (expand right, contract left)
int left = 0;
for (int right = 0; right &lt; arr.Length; right++) {
    // Add arr[right] to window
    while (windowInvalid) {
        // Remove arr[left] from window
        left++;
    }
    // Update result
}
```

### Complexity Patterns
| Problem Type | Time | Space |
|--------------|------|-------|
| Fixed window | O(n) | O(1) |
| Variable window | O(n) | O(k) where k = unique elements |
| Brute force all subarrays | O(n²) or O(n³) | O(1) |

---

## Problems

### 1. Best Time to Buy and Sell Stock
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) | [NeetCode](https://neetcode.io/problems/buy-and-sell-crypto)

#### Problem
Given an array `prices` where `prices[i]` is the price of a stock on day `i`, find the maximum profit from buying on one day and selling on a later day. Return 0 if no profit is possible.

**Example:**
```
Input: prices = [7,1,5,3,6,4]
Output: 5
Explanation: Buy on day 2 (price=1), sell on day 5 (price=6), profit = 6-1 = 5
```

#### Intuition
Track the minimum price seen so far. For each day, calculate potential profit if we sell today (today's price - minimum seen). Keep track of maximum profit.

#### Brute Force Approach
Check every pair of buy/sell days.

- **Time:** O(n²)
- **Space:** O(1)

```csharp
public class Solution {
    public int MaxProfit(int[] prices) {
        int maxProfit = 0;
        
        for (int buy = 0; buy &lt; prices.Length; buy++) {
            for (int sell = buy + 1; sell &lt; prices.Length; sell++) {
                int profit = prices[sell] - prices[buy];
                maxProfit = Math.Max(maxProfit, profit);
            }
        }
        
        return maxProfit;
    }
}
```

#### Optimal Approach
One pass: track minimum price and maximum profit.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int MaxProfit(int[] prices) {
        int minPrice = int.MaxValue;
        int maxProfit = 0;
        
        foreach (int price in prices) {
            if (price &lt; minPrice) {
                minPrice = price;  // Found new minimum
            } else {
                maxProfit = Math.Max(maxProfit, price - minPrice);
            }
        }
        
        return maxProfit;
    }
}
```

#### Alternative: Two Pointers View
Think of it as sliding window where left = buy day, right = sell day.

```csharp
public class Solution {
    public int MaxProfit(int[] prices) {
        int left = 0;   // Buy pointer
        int right = 1;  // Sell pointer
        int maxProfit = 0;
        
        while (right &lt; prices.Length) {
            if (prices[left] &lt; prices[right]) {
                // Profitable trade
                maxProfit = Math.Max(maxProfit, prices[right] - prices[left]);
            } else {
                // Found lower price, move buy pointer
                left = right;
            }
            right++;
        }
        
        return maxProfit;
    }
}
```

#### Key Takeaways
- This is a simplified sliding window / Kadane's-like problem
- Only need to track the running minimum
- Can't use sorting because order matters (must buy before sell)
- Foundation for more complex stock problems (multiple transactions, cooldown, etc.)

---

### 2. Longest Substring Without Repeating Characters
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/longest-substring-without-repeating-characters/) | [NeetCode](https://neetcode.io/problems/longest-substring-without-duplicates)

#### Problem
Given a string `s`, find the length of the longest substring without repeating characters.

**Example:**
```
Input: s = "abcabcbb"
Output: 3
Explanation: "abc" is the longest substring without repeating characters.

Input: s = "bbbbb"
Output: 1
```

#### Intuition
Use a sliding window that expands right. When we encounter a duplicate, shrink from the left until no duplicates remain. Track characters in current window with a HashSet.

#### Brute Force Approach
Check every substring for uniqueness.

- **Time:** O(n³) - O(n²) substrings × O(n) to check each
- **Space:** O(min(n, m)) where m = character set size

```csharp
public class Solution {
    public int LengthOfLongestSubstring(string s) {
        int maxLen = 0;
        
        for (int i = 0; i &lt; s.Length; i++) {
            HashSet&lt;char> seen = new HashSet&lt;char>();
            for (int j = i; j &lt; s.Length; j++) {
                if (seen.Contains(s[j])) break;
                seen.Add(s[j]);
                maxLen = Math.Max(maxLen, j - i + 1);
            }
        }
        
        return maxLen;
    }
}
```

#### Optimal Approach: Sliding Window with HashSet
Expand right, contract left when duplicate found.

- **Time:** O(n) - each character visited at most twice
- **Space:** O(min(n, m))

```csharp
public class Solution {
    public int LengthOfLongestSubstring(string s) {
        HashSet&lt;char> window = new HashSet&lt;char>();
        int left = 0;
        int maxLen = 0;
        
        for (int right = 0; right &lt; s.Length; right++) {
            // Shrink window until no duplicate
            while (window.Contains(s[right])) {
                window.Remove(s[left]);
                left++;
            }
            
            window.Add(s[right]);
            maxLen = Math.Max(maxLen, right - left + 1);
        }
        
        return maxLen;
    }
}
```

#### Alternative: Sliding Window with HashMap (Direct Jump)
Store character positions to jump left pointer directly.

- **Time:** O(n)
- **Space:** O(min(n, m))

```csharp
public class Solution {
    public int LengthOfLongestSubstring(string s) {
        Dictionary&lt;char, int> lastSeen = new Dictionary&lt;char, int>();
        int left = 0;
        int maxLen = 0;
        
        for (int right = 0; right &lt; s.Length; right++) {
            char c = s[right];
            
            // If character seen and is in current window
            if (lastSeen.ContainsKey(c) && lastSeen[c] >= left) {
                left = lastSeen[c] + 1;  // Jump past the duplicate
            }
            
            lastSeen[c] = right;
            maxLen = Math.Max(maxLen, right - left + 1);
        }
        
        return maxLen;
    }
}
```

#### Key Takeaways
- HashSet for O(1) duplicate detection
- HashMap approach allows direct jump (slightly faster in practice)
- Window contracts from left when constraint violated
- Classic variable-size sliding window problem

---

### 3. Longest Repeating Character Replacement
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/longest-repeating-character-replacement/) | [NeetCode](https://neetcode.io/problems/longest-repeating-substring-with-replacement)

#### Problem
Given a string `s` and an integer `k`, you can replace at most `k` characters to make all characters in a substring the same. Return the length of the longest such substring.

**Example:**
```
Input: s = "AABABBA", k = 1
Output: 4
Explanation: Replace one 'A' in "AABABBA" to get "AABBBBBA". Longest = 4 ("BBBB").
```

#### Intuition
For any window, if (window size - count of most frequent char) ≤ k, we can make all characters the same. Use sliding window and track character frequencies.

#### Brute Force Approach
Check every substring.

- **Time:** O(n² × 26)
- **Space:** O(26) = O(1)

```csharp
public class Solution {
    public int CharacterReplacement(string s, int k) {
        int maxLen = 0;
        
        for (int i = 0; i &lt; s.Length; i++) {
            int[] count = new int[26];
            int maxFreq = 0;
            
            for (int j = i; j &lt; s.Length; j++) {
                count[s[j] - 'A']++;
                maxFreq = Math.Max(maxFreq, count[s[j] - 'A']);
                
                int windowLen = j - i + 1;
                int replacements = windowLen - maxFreq;
                
                if (replacements &lt;= k) {
                    maxLen = Math.Max(maxLen, windowLen);
                }
            }
        }
        
        return maxLen;
    }
}
```

#### Optimal Approach: Sliding Window
Maintain window where (size - maxFreq) ≤ k.

- **Time:** O(n)
- **Space:** O(26) = O(1)

```csharp
public class Solution {
    public int CharacterReplacement(string s, int k) {
        int[] count = new int[26];
        int left = 0;
        int maxFreq = 0;  // Max frequency of any single char in current window
        int maxLen = 0;
        
        for (int right = 0; right &lt; s.Length; right++) {
            count[s[right] - 'A']++;
            maxFreq = Math.Max(maxFreq, count[s[right] - 'A']);
            
            // Window is valid if we can replace (windowLen - maxFreq) chars with k replacements
            int windowLen = right - left + 1;
            
            // Shrink window if too many replacements needed
            while (windowLen - maxFreq > k) {
                count[s[left] - 'A']--;
                left++;
                windowLen--;
            }
            
            maxLen = Math.Max(maxLen, windowLen);
        }
        
        return maxLen;
    }
}
```

#### Optimized: No Need to Recalculate maxFreq When Shrinking
Key insight: maxLen can only increase when maxFreq increases. We don't need to decrease maxFreq.

```csharp
public class Solution {
    public int CharacterReplacement(string s, int k) {
        int[] count = new int[26];
        int left = 0;
        int maxFreq = 0;
        int maxLen = 0;
        
        for (int right = 0; right &lt; s.Length; right++) {
            count[s[right] - 'A']++;
            maxFreq = Math.Max(maxFreq, count[s[right] - 'A']);
            
            // If window invalid, shrink by 1 (no need to update maxFreq)
            if (right - left + 1 - maxFreq > k) {
                count[s[left] - 'A']--;
                left++;
            }
            
            maxLen = right - left + 1;
        }
        
        return maxLen;
    }
}
```

#### Key Takeaways
- Valid window: `windowSize - maxFrequency ≤ k`
- We don't need to find which character to keep, just the max frequency
- Optimization: maxFreq never needs to decrease (only looking for longer valid windows)
- Track frequencies with array for O(1) operations

---

### 4. Permutation in String
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/permutation-in-string/) | [NeetCode](https://neetcode.io/problems/permutation-string)

#### Problem
Given two strings `s1` and `s2`, return `true` if `s2` contains a permutation of `s1`.

In other words, return `true` if one of `s1`'s permutations is a substring of `s2`.

**Example:**
```
Input: s1 = "ab", s2 = "eidbaooo"
Output: true
Explanation: s2 contains "ba" which is a permutation of "ab"
```

#### Intuition
A permutation has the same character frequencies. Use a fixed-size sliding window of length `s1.Length` over `s2` and check if frequencies match.

#### Brute Force Approach
Check every substring of length s1.Length.

- **Time:** O(n × m) where n = len(s2), m = len(s1)
- **Space:** O(26) = O(1)

```csharp
public class Solution {
    public bool CheckInclusion(string s1, string s2) {
        if (s1.Length > s2.Length) return false;
        
        int[] target = new int[26];
        foreach (char c in s1) {
            target[c - 'a']++;
        }
        
        for (int i = 0; i &lt;= s2.Length - s1.Length; i++) {
            int[] window = new int[26];
            for (int j = i; j &lt; i + s1.Length; j++) {
                window[s2[j] - 'a']++;
            }
            if (ArraysEqual(target, window)) return true;
        }
        
        return false;
    }
    
    private bool ArraysEqual(int[] a, int[] b) {
        for (int i = 0; i &lt; 26; i++) {
            if (a[i] != b[i]) return false;
        }
        return true;
    }
}
```

#### Optimal Approach: Fixed Sliding Window with Match Count
Track how many characters have matching frequencies.

- **Time:** O(n)
- **Space:** O(26) = O(1)

```csharp
public class Solution {
    public bool CheckInclusion(string s1, string s2) {
        if (s1.Length > s2.Length) return false;
        
        int[] s1Count = new int[26];
        int[] s2Count = new int[26];
        
        // Initialize: count s1 and first window of s2
        for (int i = 0; i &lt; s1.Length; i++) {
            s1Count[s1[i] - 'a']++;
            s2Count[s2[i] - 'a']++;
        }
        
        // Count matching character frequencies
        int matches = 0;
        for (int i = 0; i &lt; 26; i++) {
            if (s1Count[i] == s2Count[i]) matches++;
        }
        
        // Slide the window
        for (int i = s1.Length; i &lt; s2.Length; i++) {
            if (matches == 26) return true;
            
            // Add new character (right side of window)
            int idx = s2[i] - 'a';
            s2Count[idx]++;
            if (s2Count[idx] == s1Count[idx]) matches++;
            else if (s2Count[idx] == s1Count[idx] + 1) matches--;
            
            // Remove old character (left side of window)
            idx = s2[i - s1.Length] - 'a';
            s2Count[idx]--;
            if (s2Count[idx] == s1Count[idx]) matches++;
            else if (s2Count[idx] == s1Count[idx] - 1) matches--;
        }
        
        return matches == 26;
    }
}
```

#### Alternative: Simpler Sliding Window
Less optimized but cleaner.

```csharp
public class Solution {
    public bool CheckInclusion(string s1, string s2) {
        if (s1.Length > s2.Length) return false;
        
        int[] target = new int[26];
        int[] window = new int[26];
        
        foreach (char c in s1) target[c - 'a']++;
        
        for (int i = 0; i &lt; s2.Length; i++) {
            // Add to window
            window[s2[i] - 'a']++;
            
            // Remove from window if we've exceeded s1's length
            if (i >= s1.Length) {
                window[s2[i - s1.Length] - 'a']--;
            }
            
            // Check if match
            if (i >= s1.Length - 1 && ArraysMatch(target, window)) {
                return true;
            }
        }
        
        return false;
    }
    
    private bool ArraysMatch(int[] a, int[] b) {
        for (int i = 0; i &lt; 26; i++) {
            if (a[i] != b[i]) return false;
        }
        return true;
    }
}
```

#### Key Takeaways
- Fixed window size = s1.Length
- Permutation = same character frequencies
- "Matches" optimization avoids comparing 26 elements each time
- Carefully handle adding/removing characters at window edges

---

### 5. Minimum Window Substring
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/minimum-window-substring/) | [NeetCode](https://neetcode.io/problems/minimum-window-with-characters)

#### Problem
Given strings `s` and `t`, return the minimum window substring of `s` that contains all characters from `t` (including duplicates). Return empty string if no such window exists.

**Example:**
```
Input: s = "ADOBECODEBANC", t = "ABC"
Output: "BANC"
Explanation: "BANC" contains 'A', 'B', and 'C'
```

#### Intuition
Use a variable-size sliding window. Expand right until we have all characters from `t`, then contract left to minimize. Track required characters and how many we've satisfied.

#### Brute Force Approach
Check all substrings for containing all chars of t.

- **Time:** O(n² × m)
- **Space:** O(m)

```csharp
public class Solution {
    public string MinWindow(string s, string t) {
        if (t.Length > s.Length) return "";
        
        Dictionary&lt;char, int> tCount = new Dictionary&lt;char, int>();
        foreach (char c in t) {
            tCount[c] = tCount.GetValueOrDefault(c, 0) + 1;
        }
        
        int minLen = int.MaxValue;
        int minStart = 0;
        
        for (int i = 0; i &lt; s.Length; i++) {
            Dictionary&lt;char, int> window = new Dictionary&lt;char, int>();
            for (int j = i; j &lt; s.Length; j++) {
                window[s[j]] = window.GetValueOrDefault(s[j], 0) + 1;
                
                if (ContainsAll(window, tCount)) {
                    if (j - i + 1 &lt; minLen) {
                        minLen = j - i + 1;
                        minStart = i;
                    }
                    break;  // Found shortest from this start
                }
            }
        }
        
        return minLen == int.MaxValue ? "" : s.Substring(minStart, minLen);
    }
    
    private bool ContainsAll(Dictionary&lt;char, int> window, Dictionary&lt;char, int> target) {
        foreach (var kvp in target) {
            if (!window.ContainsKey(kvp.Key) || window[kvp.Key] &lt; kvp.Value) {
                return false;
            }
        }
        return true;
    }
}
```

#### Optimal Approach: Sliding Window with "Have" and "Need"
Track how many required characters we've satisfied.

- **Time:** O(n + m)
- **Space:** O(m)

```csharp
public class Solution {
    public string MinWindow(string s, string t) {
        if (t.Length > s.Length) return "";
        
        // Count characters needed from t
        Dictionary&lt;char, int> need = new Dictionary&lt;char, int>();
        foreach (char c in t) {
            need[c] = need.GetValueOrDefault(c, 0) + 1;
        }
        
        Dictionary&lt;char, int> window = new Dictionary&lt;char, int>();
        int have = 0;           // Number of chars with satisfied count
        int required = need.Count;  // Number of unique chars needed
        
        int left = 0;
        int minLen = int.MaxValue;
        int minStart = 0;
        
        for (int right = 0; right &lt; s.Length; right++) {
            char c = s[right];
            window[c] = window.GetValueOrDefault(c, 0) + 1;
            
            // Check if this character's requirement is now satisfied
            if (need.ContainsKey(c) && window[c] == need[c]) {
                have++;
            }
            
            // Contract window while we have all required chars
            while (have == required) {
                // Update minimum
                if (right - left + 1 &lt; minLen) {
                    minLen = right - left + 1;
                    minStart = left;
                }
                
                // Remove left character
                char leftChar = s[left];
                window[leftChar]--;
                if (need.ContainsKey(leftChar) && window[leftChar] &lt; need[leftChar]) {
                    have--;
                }
                left++;
            }
        }
        
        return minLen == int.MaxValue ? "" : s.Substring(minStart, minLen);
    }
}
```

#### Key Takeaways
- "have" counts satisfied character types, not total characters
- Contract window when valid to find minimum
- Use `window[c] == need[c]` to detect when requirement is exactly met
- Use `window[c] &lt; need[c]` to detect when we lose satisfaction
- This pattern applies to many "minimum substring containing X" problems

---

### 6. Sliding Window Maximum
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/sliding-window-maximum/) | [NeetCode](https://neetcode.io/problems/sliding-window-maximum)

#### Problem
Given an array `nums` and a window size `k`, return the maximum element in each sliding window as it moves from left to right.

**Example:**
```
Input: nums = [1,3,-1,-3,5,3,6,7], k = 3
Output: [3,3,5,5,6,7]
Window positions:
[1 3 -1] -3 5 3 6 7    → 3
1 [3 -1 -3] 5 3 6 7    → 3
1 3 [-1 -3 5] 3 6 7    → 5
...
```

#### Intuition
Use a monotonic decreasing deque. Elements in deque are potential maximums. Remove elements smaller than current (they can never be max) and elements outside window.

#### Brute Force Approach
Find max in each window.

- **Time:** O(n × k)
- **Space:** O(n - k + 1) for output

```csharp
public class Solution {
    public int[] MaxSlidingWindow(int[] nums, int k) {
        int n = nums.Length;
        int[] result = new int[n - k + 1];
        
        for (int i = 0; i &lt;= n - k; i++) {
            int max = nums[i];
            for (int j = i; j &lt; i + k; j++) {
                max = Math.Max(max, nums[j]);
            }
            result[i] = max;
        }
        
        return result;
    }
}
```

#### Optimal Approach: Monotonic Decreasing Deque
Store indices; maintain decreasing order of values.

- **Time:** O(n) - each element added and removed at most once
- **Space:** O(k) - deque size

```csharp
public class Solution {
    public int[] MaxSlidingWindow(int[] nums, int k) {
        int n = nums.Length;
        int[] result = new int[n - k + 1];
        LinkedList&lt;int> deque = new LinkedList&lt;int>();  // Store indices
        
        for (int i = 0; i &lt; n; i++) {
            // Remove indices outside current window
            while (deque.Count > 0 && deque.First.Value &lt; i - k + 1) {
                deque.RemoveFirst();
            }
            
            // Remove indices of smaller elements (they won't be max)
            while (deque.Count > 0 && nums[deque.Last.Value] &lt; nums[i]) {
                deque.RemoveLast();
            }
            
            deque.AddLast(i);
            
            // Add to result once we have a full window
            if (i >= k - 1) {
                result[i - k + 1] = nums[deque.First.Value];
            }
        }
        
        return result;
    }
}
```

#### Why Monotonic Deque Works
1. **Decreasing order**: Front of deque is always the maximum
2. **Remove smaller elements**: If `nums[i] > nums[j]` where `i > j`, then `nums[j]` can never be maximum for any future window containing `i`
3. **Remove outside elements**: Elements with index &lt; `i - k + 1` are outside current window

#### Key Takeaways
- **Monotonic deque** is powerful for range max/min queries
- Store indices, not values, to check window bounds
- "Decreasing" means each new element removes all smaller elements
- Similar problems: Next Greater Element, Daily Temperatures
- C# doesn't have Deque, use `LinkedList&lt;T>` with AddFirst/AddLast/RemoveFirst/RemoveLast

---

## Summary

### Pattern Recognition for Sliding Window

| If you see... | Consider... |
|---------------|-------------|
| "Subarray/substring of size k" | Fixed window |
| "Minimum/maximum subarray with condition" | Variable window |
| "Contiguous elements" | Sliding window |
| "Contains all characters" | Variable window + frequency map |
| "Longest/shortest substring" | Variable window |
| "Maximum in each window" | Monotonic deque |

### Variable Window Template

```csharp
int left = 0;
for (int right = 0; right &lt; n; right++) {
    // 1. Add element at right to window
    
    // 2. Shrink window while constraint violated
    while (/* window invalid */) {
        // Remove element at left
        left++;
    }
    
    // 3. Update result (window is now valid)
}
```

### Fixed Window Template

```csharp
// Initialize first window
for (int i = 0; i &lt; k; i++) {
    // Add to window
}

// Slide window
for (int i = k; i &lt; n; i++) {
    // Process current window (before sliding)
    
    // Add new element (right)
    // Remove old element (left = i - k)
}
```

### C# Data Structures for Sliding Window

```csharp
// HashSet - check duplicates in window
HashSet&lt;char> window = new HashSet&lt;char>();

// Dictionary - frequency counting
Dictionary&lt;char, int> freq = new Dictionary&lt;char, int>();
freq[c] = freq.GetValueOrDefault(c, 0) + 1;

// LinkedList as Deque (for monotonic deque)
LinkedList&lt;int> deque = new LinkedList&lt;int>();
deque.AddLast(x);     // push back
deque.RemoveLast();   // pop back
deque.AddFirst(x);    // push front
deque.RemoveFirst();  // pop front
deque.First.Value;    // peek front
deque.Last.Value;     // peek back
```
