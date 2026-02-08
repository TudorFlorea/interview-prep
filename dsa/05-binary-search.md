# Binary Search

[← Back to Index](/dsa/00-index.md)

## Overview

Binary Search is a divide-and-conquer algorithm that finds a target value in a sorted array by repeatedly halving the search space. It reduces O(n) linear search to O(log n).

### When to Use This Pattern
- **Sorted array** - find element, find boundary
- **Search space can be halved** - answer lies in one half
- **Monotonic property** - if condition is true/false at point X, it stays that way for all values beyond X
- **Optimization problems** - minimize/maximize something with a feasible check

### Types of Binary Search Problems

1. **Classic Binary Search** - find exact element in sorted array
2. **Boundary Finding** - find first/last occurrence, insertion point
3. **Search on Answer** - binary search on possible answer values
4. **Rotated/Modified Arrays** - variations on sorted arrays

### Key C# Patterns
```csharp
// Classic binary search
int left = 0, right = arr.Length - 1;
while (left &lt;= right) {
    int mid = left + (right - left) / 2;  // Avoid overflow
    if (arr[mid] == target) return mid;
    else if (arr[mid] &lt; target) left = mid + 1;
    else right = mid - 1;
}
return -1;  // Not found

// Lower bound (first >= target)
while (left &lt; right) {
    int mid = left + (right - left) / 2;
    if (arr[mid] &lt; target) left = mid + 1;
    else right = mid;
}

// Upper bound (first > target)
while (left &lt; right) {
    int mid = left + (right - left) / 2;
    if (arr[mid] &lt;= target) left = mid + 1;
    else right = mid;
}
```

### Complexity Patterns
| Operation | Time | Space |
|-----------|------|-------|
| Binary search | O(log n) | O(1) |
| Linear search | O(n) | O(1) |
| Binary search + check | O(log n × check) | O(1) |

---

## Problems

### 1. Binary Search
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/binary-search/) | [NeetCode](https://neetcode.io/problems/binary-search)

#### Problem
Given a sorted array `nums` and a `target`, return the index of `target`. If not found, return -1.

You must write an algorithm with O(log n) runtime.

**Example:**
```
Input: nums = [-1,0,3,5,9,12], target = 9
Output: 4
```

#### Intuition
Compare target with middle element. If equal, found it. If target is smaller, search left half. If larger, search right half.

#### Optimal Approach
Classic binary search with two pointers.

- **Time:** O(log n)
- **Space:** O(1)

```csharp
public class Solution {
    public int Search(int[] nums, int target) {
        int left = 0, right = nums.Length - 1;
        
        while (left &lt;= right) {
            int mid = left + (right - left) / 2;  // Avoid overflow
            
            if (nums[mid] == target) {
                return mid;
            } else if (nums[mid] &lt; target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        return -1;
    }
}
```

#### Alternative: Recursive Approach
```csharp
public class Solution {
    public int Search(int[] nums, int target) {
        return BinarySearch(nums, target, 0, nums.Length - 1);
    }
    
    private int BinarySearch(int[] nums, int target, int left, int right) {
        if (left > right) return -1;
        
        int mid = left + (right - left) / 2;
        
        if (nums[mid] == target) return mid;
        if (nums[mid] &lt; target) return BinarySearch(nums, target, mid + 1, right);
        return BinarySearch(nums, target, left, mid - 1);
    }
}
```

#### Key Takeaways
- Use `left + (right - left) / 2` instead of `(left + right) / 2` to avoid integer overflow
- `while (left &lt;= right)` - include equality to check single-element ranges
- Move `left = mid + 1` and `right = mid - 1` to avoid infinite loops
- Foundation for all binary search variations

---

### 2. Search a 2D Matrix
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/search-a-2d-matrix/) | [NeetCode](https://neetcode.io/problems/search-2d-matrix)

#### Problem
Given an m×n matrix where:
- Each row is sorted in ascending order
- The first element of each row is greater than the last element of the previous row

Search for a target value. Return true if found.

**Example:**
```
Input: matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3
Output: true
```

#### Intuition
The matrix is essentially a sorted 1D array laid out in rows. We can do binary search treating it as a single array.

#### Approach 1: Two Binary Searches
First find the row, then search within that row.

- **Time:** O(log m + log n)
- **Space:** O(1)

```csharp
public class Solution {
    public bool SearchMatrix(int[][] matrix, int target) {
        int m = matrix.Length, n = matrix[0].Length;
        
        // Binary search to find the row
        int top = 0, bottom = m - 1;
        while (top &lt;= bottom) {
            int midRow = top + (bottom - top) / 2;
            if (target &lt; matrix[midRow][0]) {
                bottom = midRow - 1;
            } else if (target > matrix[midRow][n - 1]) {
                top = midRow + 1;
            } else {
                // Target is in this row
                return BinarySearchRow(matrix[midRow], target);
            }
        }
        
        return false;
    }
    
    private bool BinarySearchRow(int[] row, int target) {
        int left = 0, right = row.Length - 1;
        while (left &lt;= right) {
            int mid = left + (right - left) / 2;
            if (row[mid] == target) return true;
            if (row[mid] &lt; target) left = mid + 1;
            else right = mid - 1;
        }
        return false;
    }
}
```

#### Approach 2: Single Binary Search (Treat as 1D Array)
Map 1D index to 2D coordinates.

- **Time:** O(log(m × n))
- **Space:** O(1)

```csharp
public class Solution {
    public bool SearchMatrix(int[][] matrix, int target) {
        int m = matrix.Length, n = matrix[0].Length;
        int left = 0, right = m * n - 1;
        
        while (left &lt;= right) {
            int mid = left + (right - left) / 2;
            
            // Convert 1D index to 2D coordinates
            int row = mid / n;
            int col = mid % n;
            int value = matrix[row][col];
            
            if (value == target) return true;
            if (value &lt; target) left = mid + 1;
            else right = mid - 1;
        }
        
        return false;
    }
}
```

#### Key Takeaways
- Convert 1D index to 2D: `row = index / cols`, `col = index % cols`
- Both approaches are O(log(m×n)) which equals O(log m + log n)
- Single binary search is cleaner but less intuitive
- For matrices where rows aren't connected, use approach 1

---

### 3. Koko Eating Bananas
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/koko-eating-bananas/) | [NeetCode](https://neetcode.io/problems/eating-bananas)

#### Problem
Koko can eat bananas at speed `k` bananas/hour. She has `n` piles with `piles[i]` bananas and `h` hours. Each hour, she picks a pile and eats `k` bananas from it. If the pile has fewer than `k`, she eats them all and waits.

Find the minimum `k` such that she can finish all bananas in `h` hours.

**Example:**
```
Input: piles = [3,6,7,11], h = 8
Output: 4
Explanation: At k=4, hours needed = 1+2+2+3 = 8
```

#### Intuition
Binary search on the answer `k`. For each candidate `k`, calculate total hours needed. Find the minimum `k` that works.

#### Brute Force Approach
Try all speeds from 1 to max(piles).

- **Time:** O(max(piles) × n)
- **Space:** O(1)

```csharp
public class Solution {
    public int MinEatingSpeed(int[] piles, int h) {
        int maxPile = piles.Max();
        
        for (int k = 1; k &lt;= maxPile; k++) {
            if (CanFinish(piles, k, h)) {
                return k;
            }
        }
        
        return maxPile;
    }
    
    private bool CanFinish(int[] piles, int k, int h) {
        long hours = 0;
        foreach (int pile in piles) {
            hours += (pile + k - 1) / k;  // Ceiling division
        }
        return hours &lt;= h;
    }
}
```

#### Optimal Approach: Binary Search on Answer
Search space is [1, max(piles)].

- **Time:** O(n × log(max(piles)))
- **Space:** O(1)

```csharp
public class Solution {
    public int MinEatingSpeed(int[] piles, int h) {
        int left = 1;
        int right = piles.Max();
        
        while (left &lt; right) {
            int mid = left + (right - left) / 2;
            
            if (CanFinish(piles, mid, h)) {
                right = mid;  // Try smaller k
            } else {
                left = mid + 1;  // Need larger k
            }
        }
        
        return left;
    }
    
    private bool CanFinish(int[] piles, int k, int h) {
        long hours = 0;
        foreach (int pile in piles) {
            hours += (pile + k - 1) / k;  // Ceiling: (a + b - 1) / b
        }
        return hours &lt;= h;
    }
}
```

#### Key Takeaways
- **Binary search on answer**: when answer has monotonic property (higher k always works if lower k works)
- Ceiling division: `(a + b - 1) / b` or `(int)Math.Ceiling((double)a / b)`
- Use `long` for hours sum to avoid overflow
- Search for minimum k where `CanFinish` returns true

---

### 4. Find Minimum in Rotated Sorted Array
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) | [NeetCode](https://neetcode.io/problems/find-minimum-in-rotated-sorted-array)

#### Problem
A sorted array of unique elements has been rotated between 1 and n times. Find the minimum element.

**Example:**
```
Input: nums = [3,4,5,1,2]
Output: 1
Explanation: Original [1,2,3,4,5] was rotated 3 times

Input: nums = [4,5,6,7,0,1,2]
Output: 0
```

#### Intuition
The minimum is at the rotation point. Compare with rightmost element to determine which half contains the minimum.

#### Brute Force Approach
Linear scan.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int FindMin(int[] nums) {
        int min = nums[0];
        foreach (int num in nums) {
            min = Math.Min(min, num);
        }
        return min;
    }
}
```

#### Optimal Approach: Binary Search
Compare mid with right to find rotation point.

- **Time:** O(log n)
- **Space:** O(1)

```csharp
public class Solution {
    public int FindMin(int[] nums) {
        int left = 0, right = nums.Length - 1;
        
        while (left &lt; right) {
            int mid = left + (right - left) / 2;
            
            if (nums[mid] > nums[right]) {
                // Minimum is in right half
                left = mid + 1;
            } else {
                // Minimum is in left half (including mid)
                right = mid;
            }
        }
        
        return nums[left];
    }
}
```

#### Why Compare with Right (not Left)?
- If `nums[mid] > nums[right]`: rotation point is to the right
- If `nums[mid] &lt; nums[right]`: this half is sorted, minimum might be at mid or left
- Comparing with left is ambiguous when array isn't rotated

#### Key Takeaways
- Use `left &lt; right` (not `left &lt;= right`) to avoid infinite loop
- Compare with `nums[right]` to determine which half has minimum
- `right = mid` (not `mid - 1`) because mid could be the minimum
- Works for both rotated and non-rotated arrays

---

### 5. Search in Rotated Sorted Array
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/search-in-rotated-sorted-array/) | [NeetCode](https://neetcode.io/problems/find-target-in-rotated-sorted-array)

#### Problem
Given a rotated sorted array (no duplicates) and a target, return the index of target or -1 if not found.

**Example:**
```
Input: nums = [4,5,6,7,0,1,2], target = 0
Output: 4

Input: nums = [4,5,6,7,0,1,2], target = 3
Output: -1
```

#### Intuition
At each step, at least one half is sorted. Determine which half is sorted and whether target lies in that half.

#### Optimal Approach
Identify sorted half, check if target is there.

- **Time:** O(log n)
- **Space:** O(1)

```csharp
public class Solution {
    public int Search(int[] nums, int target) {
        int left = 0, right = nums.Length - 1;
        
        while (left &lt;= right) {
            int mid = left + (right - left) / 2;
            
            if (nums[mid] == target) {
                return mid;
            }
            
            // Determine which half is sorted
            if (nums[left] &lt;= nums[mid]) {
                // Left half is sorted
                if (target >= nums[left] && target &lt; nums[mid]) {
                    right = mid - 1;  // Target in left half
                } else {
                    left = mid + 1;   // Target in right half
                }
            } else {
                // Right half is sorted
                if (target > nums[mid] && target &lt;= nums[right]) {
                    left = mid + 1;   // Target in right half
                } else {
                    right = mid - 1;  // Target in left half
                }
            }
        }
        
        return -1;
    }
}
```

#### Alternative: Find Pivot First, Then Binary Search
```csharp
public class Solution {
    public int Search(int[] nums, int target) {
        int n = nums.Length;
        
        // Find minimum (pivot)
        int left = 0, right = n - 1;
        while (left &lt; right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] > nums[right]) left = mid + 1;
            else right = mid;
        }
        
        int pivot = left;
        
        // Binary search in appropriate half
        if (target >= nums[pivot] && target &lt;= nums[n - 1]) {
            return BinarySearch(nums, target, pivot, n - 1);
        } else {
            return BinarySearch(nums, target, 0, pivot - 1);
        }
    }
    
    private int BinarySearch(int[] nums, int target, int left, int right) {
        while (left &lt;= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] &lt; target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}
```

#### Key Takeaways
- At least one half is always sorted
- Check `nums[left] &lt;= nums[mid]` to identify sorted half (use `&lt;=` for edge cases)
- Check if target is in sorted half's range before deciding direction
- Can solve in one pass (approach 1) or two passes (approach 2)

---

### 6. Time Based Key-Value Store
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/time-based-key-value-store/) | [NeetCode](https://neetcode.io/problems/time-based-key-value-store)

#### Problem
Design a time-based key-value store:
- `set(key, value, timestamp)` - stores key with value at given timestamp
- `get(key, timestamp)` - returns the value with the largest timestamp ≤ given timestamp, or "" if none exists

Timestamps are strictly increasing for each key.

**Example:**
```
set("foo", "bar", 1)
get("foo", 1)     // Returns "bar"
get("foo", 3)     // Returns "bar" (timestamp 1 &lt;= 3)
set("foo", "bar2", 4)
get("foo", 4)     // Returns "bar2"
get("foo", 5)     // Returns "bar2"
```

#### Intuition
Store values with timestamps in a list per key. For get, binary search for the largest timestamp ≤ target.

#### Optimal Approach
Dictionary of lists + binary search.

- **Time:** O(1) for set, O(log n) for get
- **Space:** O(n) total entries

```csharp
public class TimeMap {
    private Dictionary&lt;string, List&lt;(int timestamp, string value)>> store;
    
    public TimeMap() {
        store = new Dictionary&lt;string, List&lt;(int, string)>>();
    }
    
    public void Set(string key, string value, int timestamp) {
        if (!store.ContainsKey(key)) {
            store[key] = new List&lt;(int, string)>();
        }
        store[key].Add((timestamp, value));
    }
    
    public string Get(string key, int timestamp) {
        if (!store.ContainsKey(key)) return "";
        
        var list = store[key];
        
        // Binary search for largest timestamp &lt;= target
        int left = 0, right = list.Count - 1;
        string result = "";
        
        while (left &lt;= right) {
            int mid = left + (right - left) / 2;
            
            if (list[mid].timestamp &lt;= timestamp) {
                result = list[mid].value;
                left = mid + 1;  // Try to find larger valid timestamp
            } else {
                right = mid - 1;
            }
        }
        
        return result;
    }
}
```

#### Alternative: Using Built-in Binary Search
```csharp
public class TimeMap {
    private Dictionary&lt;string, List&lt;(int timestamp, string value)>> store;
    
    public TimeMap() {
        store = new Dictionary&lt;string, List&lt;(int, string)>>();
    }
    
    public void Set(string key, string value, int timestamp) {
        if (!store.ContainsKey(key)) {
            store[key] = new List&lt;(int, string)>();
        }
        store[key].Add((timestamp, value));
    }
    
    public string Get(string key, int timestamp) {
        if (!store.ContainsKey(key)) return "";
        
        var list = store[key];
        
        // Find insertion point
        int idx = BinarySearchUpperBound(list, timestamp);
        
        if (idx == 0) return "";  // All timestamps > target
        return list[idx - 1].value;
    }
    
    // Returns index of first element > timestamp
    private int BinarySearchUpperBound(List&lt;(int timestamp, string value)> list, int target) {
        int left = 0, right = list.Count;
        
        while (left &lt; right) {
            int mid = left + (right - left) / 2;
            if (list[mid].timestamp &lt;= target) {
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
- Timestamps are strictly increasing, so list is always sorted
- Binary search for "largest ≤ target" = upper bound - 1
- Track best result found so far during search
- Return empty string when key doesn't exist or no valid timestamp

---

### 7. Median of Two Sorted Arrays
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/median-of-two-sorted-arrays/) | [NeetCode](https://neetcode.io/problems/median-of-two-sorted-arrays)

#### Problem
Given two sorted arrays `nums1` and `nums2` of sizes m and n, return the median of the combined sorted array.

The overall run time complexity should be O(log(m+n)).

**Example:**
```
Input: nums1 = [1,3], nums2 = [2]
Output: 2.0
Explanation: Merged = [1,2,3], median = 2

Input: nums1 = [1,2], nums2 = [3,4]
Output: 2.5
Explanation: Merged = [1,2,3,4], median = (2+3)/2 = 2.5
```

#### Intuition
Binary search on the smaller array to find the correct partition point. Both arrays are split such that all elements on the left are ≤ all elements on the right.

#### Brute Force Approach
Merge arrays and find median.

- **Time:** O(m + n)
- **Space:** O(m + n)

```csharp
public class Solution {
    public double FindMedianSortedArrays(int[] nums1, int[] nums2) {
        int[] merged = new int[nums1.Length + nums2.Length];
        int i = 0, j = 0, k = 0;
        
        while (i &lt; nums1.Length && j &lt; nums2.Length) {
            if (nums1[i] &lt; nums2[j]) {
                merged[k++] = nums1[i++];
            } else {
                merged[k++] = nums2[j++];
            }
        }
        
        while (i &lt; nums1.Length) merged[k++] = nums1[i++];
        while (j &lt; nums2.Length) merged[k++] = nums2[j++];
        
        int n = merged.Length;
        if (n % 2 == 0) {
            return (merged[n/2 - 1] + merged[n/2]) / 2.0;
        }
        return merged[n/2];
    }
}
```

#### Optimal Approach: Binary Search on Partition
Find partition in shorter array.

- **Time:** O(log(min(m, n)))
- **Space:** O(1)

```csharp
public class Solution {
    public double FindMedianSortedArrays(int[] nums1, int[] nums2) {
        // Ensure nums1 is the shorter array
        if (nums1.Length > nums2.Length) {
            return FindMedianSortedArrays(nums2, nums1);
        }
        
        int m = nums1.Length, n = nums2.Length;
        int left = 0, right = m;
        
        while (left &lt;= right) {
            // Partition positions
            int partitionX = left + (right - left) / 2;
            int partitionY = (m + n + 1) / 2 - partitionX;
            
            // Get elements around partitions
            int maxLeftX = (partitionX == 0) ? int.MinValue : nums1[partitionX - 1];
            int minRightX = (partitionX == m) ? int.MaxValue : nums1[partitionX];
            
            int maxLeftY = (partitionY == 0) ? int.MinValue : nums2[partitionY - 1];
            int minRightY = (partitionY == n) ? int.MaxValue : nums2[partitionY];
            
            // Check if we found the correct partition
            if (maxLeftX &lt;= minRightY && maxLeftY &lt;= minRightX) {
                // Found correct partition
                if ((m + n) % 2 == 0) {
                    return (Math.Max(maxLeftX, maxLeftY) + 
                            Math.Min(minRightX, minRightY)) / 2.0;
                } else {
                    return Math.Max(maxLeftX, maxLeftY);
                }
            } else if (maxLeftX > minRightY) {
                // Too far right in nums1
                right = partitionX - 1;
            } else {
                // Too far left in nums1
                left = partitionX + 1;
            }
        }
        
        throw new ArgumentException("Input arrays are not sorted");
    }
}
```

#### How the Partition Works
```
nums1:  [...maxLeftX] | [minRightX...]
nums2:  [...maxLeftY] | [minRightY...]

For correct partition:
1. Total elements on left = (m + n + 1) / 2
2. maxLeftX &lt;= minRightY (all left elements of nums1 &lt;= all right of nums2)
3. maxLeftY &lt;= minRightX (all left elements of nums2 &lt;= all right of nums1)
```

#### Key Takeaways
- Binary search on the shorter array for O(log(min(m,n)))
- Use `int.MinValue` and `int.MaxValue` as sentinels for edge cases
- Partition divides combined array into two halves
- For odd total: median is max of left half
- For even total: median is average of max(left) and min(right)

---

## Summary

### Pattern Recognition for Binary Search

| If you see... | Consider... |
|---------------|-------------|
| Sorted array | Classic binary search |
| "Minimum/maximum that satisfies" | Binary search on answer |
| Rotated sorted array | Modified binary search |
| "Find first/last occurrence" | Lower/upper bound |
| Matrix sorted row+column | 2D binary search or staircase |
| "O(log n) required" | Binary search |

### Binary Search Templates

```csharp
// Template 1: Find exact match
while (left &lt;= right) {
    int mid = left + (right - left) / 2;
    if (arr[mid] == target) return mid;
    if (arr[mid] &lt; target) left = mid + 1;
    else right = mid - 1;
}
return -1;

// Template 2: Find boundary (first element >= target)
while (left &lt; right) {
    int mid = left + (right - left) / 2;
    if (arr[mid] &lt; target) left = mid + 1;
    else right = mid;
}
return left;

// Template 3: Find boundary (last element &lt;= target)
while (left &lt; right) {
    int mid = left + (right - left + 1) / 2;  // Round up
    if (arr[mid] &lt;= target) left = mid;
    else right = mid - 1;
}
return left;
```

### Common Gotchas

1. **Overflow**: Use `left + (right - left) / 2` instead of `(left + right) / 2`
2. **Infinite loop**: Ensure search space shrinks (`left = mid + 1` or `right = mid - 1`)
3. **Off-by-one**: Check boundary conditions carefully
4. **Wrong comparison**: Use `&lt;` vs `&lt;=` based on problem requirements

### C# Built-in Binary Search

```csharp
// Array.BinarySearch returns:
// - Index if found
// - Bitwise complement of index of next larger element if not found
int idx = Array.BinarySearch(arr, target);
if (idx &lt; 0) {
    int insertionPoint = ~idx;
}

// List&lt;T>.BinarySearch works the same way
int idx = list.BinarySearch(target);
```
