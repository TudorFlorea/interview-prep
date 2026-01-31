# Two Pointers

[← Back to Index](00-index.md)

## Overview

The Two Pointers technique uses two pointer variables to traverse a data structure, typically an array or string. This pattern often reduces O(n²) brute force solutions to O(n) by avoiding redundant comparisons.

### When to Use This Pattern
- **Sorted arrays** where you need to find pairs/triplets with a target sum
- **Palindrome checking** - compare from both ends
- **Partitioning** - separate elements based on a condition
- **Merging** - combine two sorted arrays

### Types of Two Pointer Patterns

1. **Opposite Direction** - Start from both ends, move toward center
   - Palindrome check, Two Sum II, Container problems

2. **Same Direction (Fast/Slow)** - Both start from beginning at different speeds
   - Cycle detection, remove duplicates, linked list problems

3. **Sliding Window** - Both pointers define a window (covered in next section)

### Key C# Patterns
```csharp
// Opposite direction pointers
int left = 0, right = arr.Length - 1;
while (left &lt; right) {
    // Process arr[left] and arr[right]
    // Move pointers based on condition
}

// Same direction (fast/slow)
int slow = 0;
for (int fast = 0; fast &lt; arr.Length; fast++) {
    if (condition) {
        arr[slow] = arr[fast];
        slow++;
    }
}

// Skip duplicates pattern
while (left &lt; right && arr[left] == arr[left + 1]) left++;
```

### Complexity Patterns
| Technique | Time | Space |
|-----------|------|-------|
| Two Sum in sorted array | O(n) | O(1) |
| Three Sum | O(n²) | O(1) or O(n) |
| Brute force pairs | O(n²) | O(1) |

---

## Problems

### 1. Valid Palindrome
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/valid-palindrome/) | [NeetCode](https://neetcode.io/problems/is-palindrome)

#### Problem
A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string `s`, return `true` if it is a palindrome, or `false` otherwise.

**Example:**
```
Input: s = "A man, a plan, a canal: Panama"
Output: true
Explanation: "amanaplanacanalpanama" is a palindrome.

Input: s = "race a car"
Output: false
```

#### Intuition
Compare characters from both ends, skipping non-alphanumeric characters and ignoring case. If all pairs match, it's a palindrome.

#### Brute Force Approach
Create a cleaned string, then compare with its reverse.

- **Time:** O(n)
- **Space:** O(n) - extra string storage

```csharp
public class Solution {
    public bool IsPalindrome(string s) {
        // Clean the string
        StringBuilder sb = new StringBuilder();
        foreach (char c in s) {
            if (char.IsLetterOrDigit(c)) {
                sb.Append(char.ToLower(c));
            }
        }
        
        string cleaned = sb.ToString();
        char[] reversed = cleaned.ToCharArray();
        Array.Reverse(reversed);
        
        return cleaned == new string(reversed);
    }
}
```

#### Optimal Approach
Use two pointers from opposite ends, skip non-alphanumeric in-place.

- **Time:** O(n)
- **Space:** O(1) - no extra storage

```csharp
public class Solution {
    public bool IsPalindrome(string s) {
        int left = 0, right = s.Length - 1;
        
        while (left &lt; right) {
            // Skip non-alphanumeric from left
            while (left &lt; right && !char.IsLetterOrDigit(s[left])) {
                left++;
            }
            // Skip non-alphanumeric from right
            while (left &lt; right && !char.IsLetterOrDigit(s[right])) {
                right--;
            }
            
            // Compare characters (case-insensitive)
            if (char.ToLower(s[left]) != char.ToLower(s[right])) {
                return false;
            }
            
            left++;
            right--;
        }
        
        return true;
    }
}
```

#### Key Takeaways
- `char.IsLetterOrDigit()` checks alphanumeric
- `char.ToLower()` for case-insensitive comparison
- Two pointers avoid creating new strings
- Edge case: empty string or single character → true

---

### 2. Two Sum II - Input Array Is Sorted
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) | [NeetCode](https://neetcode.io/problems/two-integer-sum-ii)

#### Problem
Given a **1-indexed** sorted array `numbers`, find two numbers that add up to `target`. Return their indices as `[index1, index2]` where `index1 &lt; index2`.

You must use only constant extra space.

**Example:**
```
Input: numbers = [2,7,11,15], target = 9
Output: [1,2]
Explanation: 2 + 7 = 9
```

#### Intuition
Since the array is sorted, use two pointers. If sum is too small, move left pointer right; if too large, move right pointer left.

#### Brute Force Approach
Check every pair (ignores the sorted property).

- **Time:** O(n²)
- **Space:** O(1)

```csharp
public class Solution {
    public int[] TwoSum(int[] numbers, int target) {
        for (int i = 0; i &lt; numbers.Length; i++) {
            for (int j = i + 1; j &lt; numbers.Length; j++) {
                if (numbers[i] + numbers[j] == target) {
                    return new int[] { i + 1, j + 1 };  // 1-indexed
                }
            }
        }
        return new int[] { };
    }
}
```

#### Optimal Approach
Two pointers from opposite ends.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int[] TwoSum(int[] numbers, int target) {
        int left = 0, right = numbers.Length - 1;
        
        while (left &lt; right) {
            int sum = numbers[left] + numbers[right];
            
            if (sum == target) {
                return new int[] { left + 1, right + 1 };  // 1-indexed
            } else if (sum &lt; target) {
                left++;   // Need larger sum, move left pointer right
            } else {
                right--;  // Need smaller sum, move right pointer left
            }
        }
        
        return new int[] { };  // No solution found
    }
}
```

#### Why Does This Work?
- Array is sorted, so `numbers[left] ≤ numbers[right]`
- If `sum &lt; target`: moving `left` right increases sum
- If `sum > target`: moving `right` left decreases sum
- We never miss the answer because we only skip pairs that can't be solutions

#### Key Takeaways
- **Sorted array + pair sum = two pointers**
- Return 1-indexed result as specified
- Each pointer only moves in one direction → O(n) guaranteed
- This is more space-efficient than HashMap approach

---

### 3. 3Sum
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/3sum/) | [NeetCode](https://neetcode.io/problems/three-integer-sum)

#### Problem
Given an integer array `nums`, return all triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.

The solution set must not contain duplicate triplets.

**Example:**
```
Input: nums = [-1,0,1,2,-1,-4]
Output: [[-1,-1,2],[-1,0,1]]
```

#### Intuition
Sort the array, then for each element, use Two Sum II to find pairs that sum to the negative of that element. Skip duplicates to avoid duplicate triplets.

#### Brute Force Approach
Check all triplets.

- **Time:** O(n³)
- **Space:** O(1) excluding output

```csharp
public class Solution {
    public IList&lt;IList&lt;int>> ThreeSum(int[] nums) {
        Array.Sort(nums);
        HashSet&lt;(int, int, int)> seen = new HashSet&lt;(int, int, int)>();
        List&lt;IList&lt;int>> result = new List&lt;IList&lt;int>>();
        
        for (int i = 0; i &lt; nums.Length; i++) {
            for (int j = i + 1; j &lt; nums.Length; j++) {
                for (int k = j + 1; k &lt; nums.Length; k++) {
                    if (nums[i] + nums[j] + nums[k] == 0) {
                        var triplet = (nums[i], nums[j], nums[k]);
                        if (!seen.Contains(triplet)) {
                            seen.Add(triplet);
                            result.Add(new List&lt;int> { nums[i], nums[j], nums[k] });
                        }
                    }
                }
            }
        }
        return result;
    }
}
```

#### Optimal Approach
Sort + Two Pointers for each fixed first element.

- **Time:** O(n²) - O(n log n) sort + O(n²) two-pointer passes
- **Space:** O(1) or O(n) depending on sort implementation

```csharp
public class Solution {
    public IList&lt;IList&lt;int>> ThreeSum(int[] nums) {
        List&lt;IList&lt;int>> result = new List&lt;IList&lt;int>>();
        Array.Sort(nums);
        
        for (int i = 0; i &lt; nums.Length - 2; i++) {
            // Skip duplicates for first element
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            
            // Early termination: if smallest element > 0, no valid triplet
            if (nums[i] > 0) break;
            
            int left = i + 1;
            int right = nums.Length - 1;
            int target = -nums[i];  // We need nums[left] + nums[right] = target
            
            while (left &lt; right) {
                int sum = nums[left] + nums[right];
                
                if (sum == target) {
                    result.Add(new List&lt;int> { nums[i], nums[left], nums[right] });
                    
                    // Skip duplicates for second element
                    while (left &lt; right && nums[left] == nums[left + 1]) left++;
                    // Skip duplicates for third element
                    while (left &lt; right && nums[right] == nums[right - 1]) right--;
                    
                    left++;
                    right--;
                } else if (sum &lt; target) {
                    left++;
                } else {
                    right--;
                }
            }
        }
        
        return result;
    }
}
```

#### Key Takeaways
- **Sort first** to enable two pointers and duplicate skipping
- Skip duplicates at all three positions to avoid duplicate triplets
- Early termination when `nums[i] > 0` (all remaining elements positive)
- Pattern: Fix one element, use Two Sum II for remaining two
- Extends to 4Sum, 5Sum... with nested loops

---

### 4. Container With Most Water
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/container-with-most-water/) | [NeetCode](https://neetcode.io/problems/max-water-container)

#### Problem
Given an array `height` where `height[i]` is the height of a vertical line at position `i`, find two lines that together with the x-axis form a container that holds the most water.

Return the maximum amount of water the container can store.

**Example:**
```
Input: height = [1,8,6,2,5,4,8,3,7]
Output: 49
Explanation: Lines at indices 1 and 8 (heights 8 and 7) form container with area = 7 × 7 = 49
```

#### Intuition
Area = min(height[left], height[right]) × (right - left). Start with widest container, then try to increase height by moving the shorter line inward.

#### Brute Force Approach
Check all pairs of lines.

- **Time:** O(n²)
- **Space:** O(1)

```csharp
public class Solution {
    public int MaxArea(int[] height) {
        int maxArea = 0;
        
        for (int i = 0; i &lt; height.Length; i++) {
            for (int j = i + 1; j &lt; height.Length; j++) {
                int h = Math.Min(height[i], height[j]);
                int w = j - i;
                maxArea = Math.Max(maxArea, h * w);
            }
        }
        
        return maxArea;
    }
}
```

#### Optimal Approach
Two pointers starting from widest, greedily move shorter side inward.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int MaxArea(int[] height) {
        int left = 0, right = height.Length - 1;
        int maxArea = 0;
        
        while (left &lt; right) {
            // Calculate current area
            int h = Math.Min(height[left], height[right]);
            int w = right - left;
            maxArea = Math.Max(maxArea, h * w);
            
            // Move the shorter line inward
            if (height[left] &lt; height[right]) {
                left++;
            } else {
                right--;
            }
        }
        
        return maxArea;
    }
}
```

#### Why Does Moving the Shorter Line Work?
- Moving the shorter line might find a taller line → potentially more area
- Moving the taller line can only decrease or maintain height, AND decreases width → always less area
- Therefore, moving the shorter line is the only way to potentially improve

#### Key Takeaways
- Area is limited by the shorter line (min height)
- Start wide, then try to increase height
- Greedy choice: move the pointer at the shorter line
- No need to track which specific lines give max area (unless asked)

---

### 5. Trapping Rain Water
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/trapping-rain-water/) | [NeetCode](https://neetcode.io/problems/trapping-rain-water)

#### Problem
Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.

**Example:**
```
Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]
Output: 6
```

#### Intuition
Water at each position = min(maxLeft, maxRight) - height[i]. We can compute maxLeft and maxRight for each position, or use two pointers to compute on-the-fly.

#### Brute Force Approach
For each position, find max height to left and right.

- **Time:** O(n²)
- **Space:** O(1)

```csharp
public class Solution {
    public int Trap(int[] height) {
        int totalWater = 0;
        
        for (int i = 0; i &lt; height.Length; i++) {
            int leftMax = 0, rightMax = 0;
            
            // Find max height to the left
            for (int j = 0; j &lt;= i; j++) {
                leftMax = Math.Max(leftMax, height[j]);
            }
            
            // Find max height to the right
            for (int j = i; j &lt; height.Length; j++) {
                rightMax = Math.Max(rightMax, height[j]);
            }
            
            // Water at position i
            totalWater += Math.Min(leftMax, rightMax) - height[i];
        }
        
        return totalWater;
    }
}
```

#### Better Approach: Precomputed Arrays
Precompute leftMax and rightMax arrays.

- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public int Trap(int[] height) {
        if (height.Length == 0) return 0;
        
        int n = height.Length;
        int[] leftMax = new int[n];
        int[] rightMax = new int[n];
        
        // Compute leftMax for each position
        leftMax[0] = height[0];
        for (int i = 1; i &lt; n; i++) {
            leftMax[i] = Math.Max(leftMax[i - 1], height[i]);
        }
        
        // Compute rightMax for each position
        rightMax[n - 1] = height[n - 1];
        for (int i = n - 2; i >= 0; i--) {
            rightMax[i] = Math.Max(rightMax[i + 1], height[i]);
        }
        
        // Calculate trapped water
        int totalWater = 0;
        for (int i = 0; i &lt; n; i++) {
            totalWater += Math.Min(leftMax[i], rightMax[i]) - height[i];
        }
        
        return totalWater;
    }
}
```

#### Optimal Approach: Two Pointers
Track running maxLeft and maxRight, process from the side with smaller max.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int Trap(int[] height) {
        if (height.Length == 0) return 0;
        
        int left = 0, right = height.Length - 1;
        int leftMax = 0, rightMax = 0;
        int totalWater = 0;
        
        while (left &lt; right) {
            if (height[left] &lt; height[right]) {
                // Process left side
                if (height[left] >= leftMax) {
                    leftMax = height[left];  // Update max, no water here
                } else {
                    totalWater += leftMax - height[left];  // Trap water
                }
                left++;
            } else {
                // Process right side
                if (height[right] >= rightMax) {
                    rightMax = height[right];  // Update max, no water here
                } else {
                    totalWater += rightMax - height[right];  // Trap water
                }
                right--;
            }
        }
        
        return totalWater;
    }
}
```

#### Why Does Two Pointers Work?
- If `height[left] &lt; height[right]`, we know `rightMax >= height[right] > height[left]`
- So water at `left` is determined by `leftMax` alone (it's the limiting factor)
- Same logic applies when processing from the right
- We always process the side with the smaller height

#### Alternative: Monotonic Stack
Process bars and use a stack to track potential containers.

- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public int Trap(int[] height) {
        Stack&lt;int> stack = new Stack&lt;int>();  // Stores indices
        int totalWater = 0;
        
        for (int i = 0; i &lt; height.Length; i++) {
            // While current bar is taller than stack top
            while (stack.Count > 0 && height[i] > height[stack.Peek()]) {
                int bottom = stack.Pop();
                
                if (stack.Count == 0) break;  // No left boundary
                
                int left = stack.Peek();
                int width = i - left - 1;
                int h = Math.Min(height[left], height[i]) - height[bottom];
                
                totalWater += width * h;
            }
            
            stack.Push(i);
        }
        
        return totalWater;
    }
}
```

#### Key Takeaways
- Water trapped depends on BOTH left and right max heights
- Two pointer approach: process the side with smaller current height
- Stack approach: compute water layer by layer when we find a right boundary
- This is a classic problem that combines multiple concepts

---

## Summary

### Pattern Recognition for Two Pointers

| If you see... | Consider... |
|---------------|-------------|
| Sorted array + find pair | Opposite direction pointers |
| Palindrome check | Start from both ends |
| Remove duplicates in place | Fast/slow pointers |
| Find triplet/quadruplet | Fix elements + nested two pointers |
| Container/area problems | Opposite ends, move smaller side |
| Merge sorted arrays | Two pointers on each array |

### Two Pointer Movement Strategies

| Problem Type | Left Pointer | Right Pointer |
|--------------|--------------|---------------|
| Sum = target (sorted) | Move if sum too small | Move if sum too large |
| Palindrome | Skip non-alphanum, advance | Skip non-alphanum, retreat |
| Container | Move if shorter | Move if shorter |
| Trapping water | Move if smaller current height | Move if smaller current height |

### C# Quick Reference

```csharp
// Opposite direction template
int left = 0, right = arr.Length - 1;
while (left &lt; right) {
    // Process
    if (condition) left++;
    else right--;
}

// Skip duplicates pattern
while (left &lt; right && arr[left] == arr[left + 1]) left++;

// Character helpers
char.IsLetterOrDigit(c);
char.ToLower(c);
```
