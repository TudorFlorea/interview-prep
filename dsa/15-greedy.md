# Greedy

[← Back to Index](/dsa/00-index.md)

## Overview

Greedy algorithms make the locally optimal choice at each step, hoping to find a global optimum. They work when the problem has:

1. **Greedy choice property**: A local optimum leads to a global optimum
2. **Optimal substructure**: An optimal solution contains optimal solutions to subproblems

### When to Use Greedy
- Scheduling/interval problems
- Huffman coding
- Minimum spanning trees
- Some graph shortest paths
- When "always pick the best available" works

### Greedy vs DP
| Greedy | DP |
|--------|-----|
| Make one choice, never look back | Consider all choices |
| Often O(n log n) or O(n) | Often O(n²) or worse |
| Doesn't always work | Always works if applicable |
| Proof needed for correctness | Correctness from recurrence |

---

## Problems

### 1. Maximum Subarray
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/maximum-subarray/) | [NeetCode](https://neetcode.io/problems/maximum-subarray)

#### Problem
Find the contiguous subarray with the largest sum.

**Example:**
```
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6  ([4,-1,2,1])
```

#### Optimal Approach: Kadane's Algorithm
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int MaxSubArray(int[] nums) {
        int maxSum = nums[0];
        int currentSum = nums[0];
        
        for (int i = 1; i < nums.Length; i++) {
            // Either extend current subarray or start new one
            currentSum = Math.Max(nums[i], currentSum + nums[i]);
            maxSum = Math.Max(maxSum, currentSum);
        }
        
        return maxSum;
    }
}
```

#### Key Takeaways
- Kadane's: reset when current sum becomes negative
- At each position: extend or start fresh
- Classic greedy: always make best choice for current position

---

### 2. Jump Game
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/jump-game/) | [NeetCode](https://neetcode.io/problems/jump-game)

#### Problem
Given array where nums[i] is max jump length from index i, determine if you can reach the last index.

**Example:**
```
Input: nums = [2,3,1,1,4]
Output: true  (0→1→4 or 0→2→3→4)
```

#### Optimal Approach: Greedy
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public bool CanJump(int[] nums) {
        int maxReach = 0;
        
        for (int i = 0; i < nums.Length; i++) {
            if (i > maxReach) return false;  // Can't reach this index
            maxReach = Math.Max(maxReach, i + nums[i]);
            if (maxReach >= nums.Length - 1) return true;
        }
        
        return true;
    }
}
```

#### Alternative: Work Backwards
```csharp
public class Solution {
    public bool CanJump(int[] nums) {
        int goal = nums.Length - 1;
        
        for (int i = nums.Length - 2; i >= 0; i--) {
            if (i + nums[i] >= goal) {
                goal = i;  // This position can reach goal
            }
        }
        
        return goal == 0;
    }
}
```

#### Key Takeaways
- Track maximum reachable index
- If current index > maxReach, impossible
- Backwards: move goal closer when reachable

---

### 3. Jump Game II
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/jump-game-ii/) | [NeetCode](https://neetcode.io/problems/jump-game-ii)

#### Problem
Return minimum jumps to reach the last index. Guaranteed to be reachable.

**Example:**
```
Input: nums = [2,3,1,1,4]
Output: 2  (0→1→4)
```

#### Optimal Approach: Greedy (BFS-like)
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int Jump(int[] nums) {
        int jumps = 0;
        int currentEnd = 0;   // End of current jump range
        int farthest = 0;     // Farthest we can reach
        
        for (int i = 0; i < nums.Length - 1; i++) {
            farthest = Math.Max(farthest, i + nums[i]);
            
            if (i == currentEnd) {
                jumps++;
                currentEnd = farthest;
            }
        }
        
        return jumps;
    }
}
```

#### Key Takeaways
- Think of it as BFS levels
- When reaching end of current level, jump count increases
- Track farthest reachable within current jump

---

### 4. Gas Station
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/gas-station/) | [NeetCode](https://neetcode.io/problems/gas-station)

#### Problem
There are n gas stations. gas[i] is gas available, cost[i] is gas to reach next station. Find starting station to complete circuit, or -1 if impossible.

**Example:**
```
Input: gas = [1,2,3,4,5], cost = [3,4,5,1,2]
Output: 3
```

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int CanCompleteCircuit(int[] gas, int[] cost) {
        int totalGas = 0, totalCost = 0;
        int tank = 0;
        int start = 0;
        
        for (int i = 0; i < gas.Length; i++) {
            totalGas += gas[i];
            totalCost += cost[i];
            tank += gas[i] - cost[i];
            
            if (tank < 0) {
                // Can't start from any station before i+1
                start = i + 1;
                tank = 0;
            }
        }
        
        return totalGas >= totalCost ? start : -1;
    }
}
```

#### Key Takeaways
- If total gas >= total cost, solution exists
- If tank goes negative at i, start must be > i
- Only one unique solution guaranteed

---

### 5. Hand of Straights
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/hand-of-straights/) | [NeetCode](https://neetcode.io/problems/hand-of-straights)

#### Problem
Determine if cards can be rearranged into groups of consecutive cards of size groupSize.

**Example:**
```
Input: hand = [1,2,3,6,2,3,4,7,8], groupSize = 3
Output: true  ([1,2,3], [2,3,4], [6,7,8])
```

#### Optimal Approach
- **Time:** O(n log n)
- **Space:** O(n)

```csharp
public class Solution {
    public bool IsNStraightHand(int[] hand, int groupSize) {
        if (hand.Length % groupSize != 0) return false;
        
        SortedDictionary<int, int> count = new SortedDictionary<int, int>();
        foreach (int card in hand) {
            count[card] = count.GetValueOrDefault(card, 0) + 1;
        }
        
        while (count.Count > 0) {
            int start = count.Keys.First();
            
            for (int i = start; i < start + groupSize; i++) {
                if (!count.ContainsKey(i)) return false;
                
                count[i]--;
                if (count[i] == 0) count.Remove(i);
            }
        }
        
        return true;
    }
}
```

#### Key Takeaways
- Sort and greedily form groups from smallest card
- Use SortedDictionary for O(log n) min access
- Each smallest card must start a group

---

### 6. Merge Triplets to Form Target
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/merge-triplets-to-form-target-triplet/) | [NeetCode](https://neetcode.io/problems/merge-triplets-to-form-target)

#### Problem
Merge triplets using max operation. Determine if target triplet is achievable.

**Example:**
```
Input: triplets = [[2,5,3],[1,8,4],[1,7,5]], target = [2,7,5]
Output: true  (max([2,5,3], [1,7,5]) = [2,7,5])
```

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public bool MergeTriplets(int[][] triplets, int[] target) {
        bool[] found = new bool[3];
        
        foreach (var triplet in triplets) {
            // Skip if any element exceeds target
            if (triplet[0] > target[0] || triplet[1] > target[1] || triplet[2] > target[2]) {
                continue;
            }
            
            // This triplet is usable
            for (int i = 0; i < 3; i++) {
                if (triplet[i] == target[i]) {
                    found[i] = true;
                }
            }
        }
        
        return found[0] && found[1] && found[2];
    }
}
```

#### Key Takeaways
- Skip triplets with any element > target
- Collect triplets that have exact matches
- Need at least one match for each position

---

### 7. Partition Labels
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/partition-labels/) | [NeetCode](https://neetcode.io/problems/partition-labels)

#### Problem
Partition string so each letter appears in at most one part. Return sizes of parts.

**Example:**
```
Input: s = "ababcbacadefegdehijhklij"
Output: [9,7,8]
```

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(1) - 26 letters

```csharp
public class Solution {
    public IList<int> PartitionLabels(string s) {
        // Find last occurrence of each character
        int[] lastIndex = new int[26];
        for (int i = 0; i < s.Length; i++) {
            lastIndex[s[i] - 'a'] = i;
        }
        
        List<int> result = new List<int>();
        int start = 0, end = 0;
        
        for (int i = 0; i < s.Length; i++) {
            end = Math.Max(end, lastIndex[s[i] - 'a']);
            
            if (i == end) {
                result.Add(end - start + 1);
                start = i + 1;
            }
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Precompute last occurrence of each character
- Extend partition end as needed
- Cut when current index reaches partition end

---

### 8. Valid Parenthesis String
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/valid-parenthesis-string/) | [NeetCode](https://neetcode.io/problems/valid-parenthesis-string)

#### Problem
String with '(', ')', '*'. '*' can be '(', ')', or empty. Check if valid.

**Example:**
```
Input: s = "(*))"
Output: true
```

#### Optimal Approach: Track Range
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public bool CheckValidString(string s) {
        int minOpen = 0;  // Minimum possible open parens
        int maxOpen = 0;  // Maximum possible open parens
        
        foreach (char c in s) {
            if (c == '(') {
                minOpen++;
                maxOpen++;
            } else if (c == ')') {
                minOpen--;
                maxOpen--;
            } else {  // '*'
                minOpen--;  // Treat as ')'
                maxOpen++;  // Treat as '('
            }
            
            if (maxOpen < 0) return false;  // Too many ')'
            minOpen = Math.Max(minOpen, 0);  // Can't go negative
        }
        
        return minOpen == 0;
    }
}
```

#### Key Takeaways
- Track range of possible open parentheses
- '*' expands the range (can be (, ), or empty)
- Valid if 0 is in the possible range at end

---

## Summary

### Greedy Pattern Recognition

| Problem Type | Greedy Strategy |
|-------------|-----------------|
| Max/min subarray | Kadane's: extend or restart |
| Intervals | Sort by end, pick earliest |
| Scheduling | Sort by deadline or duration |
| Jump/reach | Track farthest reachable |
| Circular | If total sufficient, solution exists |

### When Greedy Works

Greedy works when:
1. Making the locally optimal choice doesn't prevent optimal future choices
2. You can prove the greedy choice is safe

**Example proofs:**
- Activity selection: Picking earliest finish leaves most room for others
- Gas station: If tank goes negative, can't start from anywhere before

### Greedy Templates

```csharp
// Interval scheduling (max non-overlapping)
Array.Sort(intervals, (a, b) => a[1].CompareTo(b[1]));
int end = int.MinValue, count = 0;
foreach (var interval in intervals) {
    if (interval[0] >= end) {
        count++;
        end = interval[1];
    }
}

// Kadane's (max subarray sum)
int maxSum = nums[0], current = nums[0];
for (int i = 1; i < nums.Length; i++) {
    current = Math.Max(nums[i], current + nums[i]);
    maxSum = Math.Max(maxSum, current);
}

// Jump game (reach check)
int maxReach = 0;
for (int i = 0; i <= maxReach && maxReach < n - 1; i++) {
    maxReach = Math.Max(maxReach, i + nums[i]);
}
```
