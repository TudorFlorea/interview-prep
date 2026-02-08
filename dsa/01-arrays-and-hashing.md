# Arrays & Hashing

[← Back to Index](/dsa/00-index.md)

## Overview

Arrays and Hashing form the foundation of most coding interview problems. This category focuses on using hash-based data structures (HashSet, Dictionary) to achieve O(1) lookups and reduce time complexity from O(n²) to O(n).

### When to Use This Pattern
- Need to check if an element exists → **HashSet**
- Need to count frequencies → **Dictionary&lt;T, int>**
- Need to find pairs/groups with specific properties → **HashMap**
- Need O(1) lookup instead of O(n) search

### Key C# Data Structures
```csharp
// HashSet - unique elements, O(1) add/remove/contains
HashSet&lt;int> set = new HashSet&lt;int>();
set.Add(1);           // Returns true if added, false if exists
set.Contains(1);      // O(1) lookup

// Dictionary - key-value pairs, O(1) operations
Dictionary&lt;string, int> map = new Dictionary&lt;string, int>();
map["key"] = value;                    // Add or update
map.TryGetValue("key", out int val);   // Safe lookup
map.ContainsKey("key");                // Check existence

// GetValueOrDefault - useful for counting
map[key] = map.GetValueOrDefault(key, 0) + 1;
```

### Common Techniques
1. **Frequency Counting** - Count occurrences of each element
2. **Two-Pass HashMap** - First pass builds map, second pass queries
3. **One-Pass HashMap** - Check and build simultaneously
4. **Sorting + Comparison** - Anagram detection via sorted strings
5. **Index Mapping** - Use values as keys to find relationships

### Complexity Patterns
| Technique | Time | Space |
|-----------|------|-------|
| HashSet lookup | O(1) | O(n) |
| Frequency count | O(n) | O(n) |
| Sorting approach | O(n log n) | O(1) or O(n) |
| Brute force pairs | O(n²) | O(1) |

---

## Problems

### 1. Contains Duplicate
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/contains-duplicate/) | [NeetCode](https://neetcode.io/problems/duplicate-integer)

#### Problem
Given an integer array `nums`, return `true` if any value appears at least twice in the array, and `false` if every element is distinct.

**Example:**
```
Input: nums = [1,2,3,1]
Output: true

Input: nums = [1,2,3,4]
Output: false
```

#### Intuition
We need to detect if any duplicate exists. The naive approach compares every pair, but we can use a HashSet to remember what we've seen and check in O(1) time.

#### Brute Force Approach
Compare every element with every other element.

- **Time:** O(n²) - nested loops
- **Space:** O(1) - no extra space

```csharp
public class Solution {
    public bool ContainsDuplicate(int[] nums) {
        for (int i = 0; i &lt; nums.Length; i++) {
            for (int j = i + 1; j &lt; nums.Length; j++) {
                if (nums[i] == nums[j]) {
                    return true;
                }
            }
        }
        return false;
    }
}
```

#### Optimal Approach
Use a HashSet to track seen elements. If we try to add an element that already exists, we found a duplicate.

- **Time:** O(n) - single pass
- **Space:** O(n) - HashSet storage

```csharp
public class Solution {
    public bool ContainsDuplicate(int[] nums) {
        HashSet&lt;int> seen = new HashSet&lt;int>();
        foreach (int num in nums) {
            if (!seen.Add(num)) {
                return true;  // Add returns false if element exists
            }
        }
        return false;
    }
}
```

#### Alternative: Sorting Approach
Sort the array and check adjacent elements.

- **Time:** O(n log n) - sorting dominates
- **Space:** O(1) or O(n) - depending on sort implementation

```csharp
public class Solution {
    public bool ContainsDuplicate(int[] nums) {
        Array.Sort(nums);
        for (int i = 1; i &lt; nums.Length; i++) {
            if (nums[i] == nums[i - 1]) {
                return true;
            }
        }
        return false;
    }
}
```

#### Key Takeaways
- `HashSet.Add()` returns `false` if element already exists - use this to detect duplicates
- Trade space for time is a fundamental pattern
- Edge cases: empty array, single element → return false

---

### 2. Valid Anagram
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/valid-anagram/) | [NeetCode](https://neetcode.io/problems/is-anagram)

#### Problem
Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.

An anagram is a word formed by rearranging the letters of another word using all original letters exactly once.

**Example:**
```
Input: s = "anagram", t = "nagaram"
Output: true

Input: s = "rat", t = "car"
Output: false
```

#### Intuition
Anagrams have the same character frequencies. We can either sort both strings and compare, or count character frequencies and verify they match.

#### Brute Force Approach
Sort both strings and compare.

- **Time:** O(n log n) - sorting
- **Space:** O(n) - string conversion

```csharp
public class Solution {
    public bool IsAnagram(string s, string t) {
        if (s.Length != t.Length) return false;
        
        char[] sArr = s.ToCharArray();
        char[] tArr = t.ToCharArray();
        Array.Sort(sArr);
        Array.Sort(tArr);
        
        return new string(sArr) == new string(tArr);
    }
}
```

#### Optimal Approach
Use frequency counting with a single array (since we know it's lowercase letters a-z).

- **Time:** O(n) - two passes through strings
- **Space:** O(1) - fixed 26-element array (O(26) = O(1))

```csharp
public class Solution {
    public bool IsAnagram(string s, string t) {
        if (s.Length != t.Length) return false;
        
        int[] count = new int[26];
        
        for (int i = 0; i &lt; s.Length; i++) {
            count[s[i] - 'a']++;
            count[t[i] - 'a']--;
        }
        
        foreach (int c in count) {
            if (c != 0) return false;
        }
        
        return true;
    }
}
```

#### Alternative: Dictionary Approach
More flexible for Unicode characters.

- **Time:** O(n)
- **Space:** O(k) where k is the number of unique characters

```csharp
public class Solution {
    public bool IsAnagram(string s, string t) {
        if (s.Length != t.Length) return false;
        
        Dictionary&lt;char, int> count = new Dictionary&lt;char, int>();
        
        foreach (char c in s) {
            count[c] = count.GetValueOrDefault(c, 0) + 1;
        }
        
        foreach (char c in t) {
            if (!count.ContainsKey(c)) return false;
            count[c]--;
            if (count[c] &lt; 0) return false;
        }
        
        return true;
    }
}
```

#### Key Takeaways
- For lowercase English letters, use `int[26]` array for O(1) space
- `char - 'a'` converts character to 0-25 index
- Early return if lengths differ saves unnecessary work
- Follow-up: For Unicode, use Dictionary instead of fixed array

---

### 3. Two Sum
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/two-sum/) | [NeetCode](https://neetcode.io/problems/two-integer-sum)

#### Problem
Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

You may assume that each input has exactly one solution, and you may not use the same element twice.

**Example:**
```
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: nums[0] + nums[1] = 2 + 7 = 9
```

#### Intuition
For each number, we need to find if its complement (target - num) exists. A HashMap allows O(1) complement lookup.

#### Brute Force Approach
Check every pair of numbers.

- **Time:** O(n²) - nested loops
- **Space:** O(1)

```csharp
public class Solution {
    public int[] TwoSum(int[] nums, int target) {
        for (int i = 0; i &lt; nums.Length; i++) {
            for (int j = i + 1; j &lt; nums.Length; j++) {
                if (nums[i] + nums[j] == target) {
                    return new int[] { i, j };
                }
            }
        }
        return new int[] { };  // No solution found
    }
}
```

#### Optimal Approach
One-pass HashMap: for each element, check if complement exists, then add current element to map.

- **Time:** O(n) - single pass
- **Space:** O(n) - HashMap storage

```csharp
public class Solution {
    public int[] TwoSum(int[] nums, int target) {
        Dictionary&lt;int, int> map = new Dictionary&lt;int, int>();
        
        for (int i = 0; i &lt; nums.Length; i++) {
            int complement = target - nums[i];
            
            if (map.ContainsKey(complement)) {
                return new int[] { map[complement], i };
            }
            
            map[nums[i]] = i;
        }
        
        return new int[] { };  // No solution found
    }
}
```

#### Key Takeaways
- Store value → index mapping in HashMap
- Check for complement BEFORE adding current element (avoid using same element twice)
- One-pass is possible because we only need to find one pair
- This pattern extends to Three Sum, Four Sum, etc.

---

### 4. Group Anagrams
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/group-anagrams/) | [NeetCode](https://neetcode.io/problems/anagram-groups)

#### Problem
Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.

**Example:**
```
Input: strs = ["eat","tea","tan","ate","nat","bat"]
Output: [["bat"],["nat","tan"],["ate","eat","tea"]]
```

#### Intuition
Anagrams produce the same result when sorted. Use the sorted string as a key to group anagrams together in a HashMap.

#### Brute Force Approach
Compare each string with every other string to check if they're anagrams.

- **Time:** O(n² × k) where k is max string length
- **Space:** O(n × k)

```csharp
public class Solution {
    public IList&lt;IList&lt;string>> GroupAnagrams(string[] strs) {
        List&lt;IList&lt;string>> result = new List&lt;IList&lt;string>>();
        bool[] used = new bool[strs.Length];
        
        for (int i = 0; i &lt; strs.Length; i++) {
            if (used[i]) continue;
            
            List&lt;string> group = new List&lt;string> { strs[i] };
            used[i] = true;
            
            for (int j = i + 1; j &lt; strs.Length; j++) {
                if (!used[j] && IsAnagram(strs[i], strs[j])) {
                    group.Add(strs[j]);
                    used[j] = true;
                }
            }
            result.Add(group);
        }
        return result;
    }
    
    private bool IsAnagram(string s, string t) {
        if (s.Length != t.Length) return false;
        char[] a = s.ToCharArray(), b = t.ToCharArray();
        Array.Sort(a); Array.Sort(b);
        return new string(a) == new string(b);
    }
}
```

#### Optimal Approach: Sorted String Key
Sort each string and use it as HashMap key.

- **Time:** O(n × k log k) - n strings, each sorted in O(k log k)
- **Space:** O(n × k) - storing all strings

```csharp
public class Solution {
    public IList&lt;IList&lt;string>> GroupAnagrams(string[] strs) {
        Dictionary&lt;string, List&lt;string>> map = new Dictionary&lt;string, List&lt;string>>();
        
        foreach (string s in strs) {
            char[] chars = s.ToCharArray();
            Array.Sort(chars);
            string key = new string(chars);
            
            if (!map.ContainsKey(key)) {
                map[key] = new List&lt;string>();
            }
            map[key].Add(s);
        }
        
        return new List&lt;IList&lt;string>>(map.Values);
    }
}
```

#### Alternative: Character Count Key
Use character frequency as key (avoids sorting).

- **Time:** O(n × k) - linear in total characters
- **Space:** O(n × k)

```csharp
public class Solution {
    public IList&lt;IList&lt;string>> GroupAnagrams(string[] strs) {
        Dictionary&lt;string, List&lt;string>> map = new Dictionary&lt;string, List&lt;string>>();
        
        foreach (string s in strs) {
            int[] count = new int[26];
            foreach (char c in s) {
                count[c - 'a']++;
            }
            
            // Create key from count array: "1#0#2#..." format
            string key = string.Join("#", count);
            
            if (!map.ContainsKey(key)) {
                map[key] = new List&lt;string>();
            }
            map[key].Add(s);
        }
        
        return new List&lt;IList&lt;string>>(map.Values);
    }
}
```

#### Key Takeaways
- Sorted string = canonical form for anagrams
- Character count avoids O(k log k) sorting per string
- Use `string.Join("#", count)` to create unique key from array
- Dictionary groups by key, Values gives all groups

---

### 5. Top K Frequent Elements
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/top-k-frequent-elements/) | [NeetCode](https://neetcode.io/problems/top-k-elements-in-list)

#### Problem
Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.

**Example:**
```
Input: nums = [1,1,1,2,2,3], k = 2
Output: [1,2]
```

#### Intuition
First count frequencies, then find top K. We can sort by frequency, use a heap, or use bucket sort (since frequency is bounded by array length).

#### Brute Force Approach
Count frequencies, then sort by frequency.

- **Time:** O(n log n) - sorting
- **Space:** O(n)

```csharp
public class Solution {
    public int[] TopKFrequent(int[] nums, int k) {
        Dictionary&lt;int, int> count = new Dictionary&lt;int, int>();
        foreach (int num in nums) {
            count[num] = count.GetValueOrDefault(num, 0) + 1;
        }
        
        // Sort by frequency descending
        var sorted = count.OrderByDescending(x => x.Value).Take(k);
        
        return sorted.Select(x => x.Key).ToArray();
    }
}
```

#### Optimal Approach: Bucket Sort
Use frequency as index into buckets. Since max frequency is n, we create n+1 buckets.

- **Time:** O(n) - counting and bucket operations
- **Space:** O(n) - buckets

```csharp
public class Solution {
    public int[] TopKFrequent(int[] nums, int k) {
        // Step 1: Count frequencies
        Dictionary&lt;int, int> count = new Dictionary&lt;int, int>();
        foreach (int num in nums) {
            count[num] = count.GetValueOrDefault(num, 0) + 1;
        }
        
        // Step 2: Create buckets where index = frequency
        List&lt;int>[] buckets = new List&lt;int>[nums.Length + 1];
        for (int i = 0; i &lt; buckets.Length; i++) {
            buckets[i] = new List&lt;int>();
        }
        
        foreach (var kvp in count) {
            buckets[kvp.Value].Add(kvp.Key);
        }
        
        // Step 3: Collect top k from highest frequency buckets
        List&lt;int> result = new List&lt;int>();
        for (int i = buckets.Length - 1; i >= 0 && result.Count &lt; k; i--) {
            result.AddRange(buckets[i]);
        }
        
        return result.Take(k).ToArray();
    }
}
```

#### Alternative: Min-Heap Approach
Maintain a min-heap of size k.

- **Time:** O(n log k) - heap operations
- **Space:** O(n + k)

```csharp
public class Solution {
    public int[] TopKFrequent(int[] nums, int k) {
        Dictionary&lt;int, int> count = new Dictionary&lt;int, int>();
        foreach (int num in nums) {
            count[num] = count.GetValueOrDefault(num, 0) + 1;
        }
        
        // Use PriorityQueue (min-heap by frequency)
        PriorityQueue&lt;int, int> minHeap = new PriorityQueue&lt;int, int>();
        
        foreach (var kvp in count) {
            minHeap.Enqueue(kvp.Key, kvp.Value);
            if (minHeap.Count > k) {
                minHeap.Dequeue();  // Remove smallest frequency
            }
        }
        
        int[] result = new int[k];
        for (int i = 0; i &lt; k; i++) {
            result[i] = minHeap.Dequeue();
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Bucket sort achieves O(n) when frequency is bounded
- Min-heap of size k is useful for "top K" problems
- C# `PriorityQueue&lt;TElement, TPriority>` is a min-heap by default
- Frequency counting is the first step in many problems

---

### 6. Product of Array Except Self
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/product-of-array-except-self/) | [NeetCode](https://neetcode.io/problems/products-of-array-discluding-self)

#### Problem
Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all elements of `nums` except `nums[i]`.

You must solve it without using division and in O(n) time.

**Example:**
```
Input: nums = [1,2,3,4]
Output: [24,12,8,6]
```

#### Intuition
For each position, the result is (product of all elements to the left) × (product of all elements to the right). We can compute prefix and suffix products.

#### Brute Force Approach
For each element, multiply all other elements.

- **Time:** O(n²)
- **Space:** O(1) excluding output

```csharp
public class Solution {
    public int[] ProductExceptSelf(int[] nums) {
        int n = nums.Length;
        int[] result = new int[n];
        
        for (int i = 0; i &lt; n; i++) {
            int product = 1;
            for (int j = 0; j &lt; n; j++) {
                if (i != j) {
                    product *= nums[j];
                }
            }
            result[i] = product;
        }
        
        return result;
    }
}
```

#### Optimal Approach: Prefix and Suffix Products
Use two passes: first compute prefix products, then multiply by suffix products.

- **Time:** O(n) - two passes
- **Space:** O(1) - excluding output array (output doesn't count as extra space)

```csharp
public class Solution {
    public int[] ProductExceptSelf(int[] nums) {
        int n = nums.Length;
        int[] result = new int[n];
        
        // First pass: compute prefix products
        // result[i] = product of all elements before index i
        result[0] = 1;
        for (int i = 1; i &lt; n; i++) {
            result[i] = result[i - 1] * nums[i - 1];
        }
        
        // Second pass: multiply by suffix products
        // suffix = product of all elements after index i
        int suffix = 1;
        for (int i = n - 1; i >= 0; i--) {
            result[i] *= suffix;
            suffix *= nums[i];
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Prefix/suffix product pattern is common for "all except current" problems
- Can compute prefix in result array, then multiply by running suffix
- Avoids division (which would fail with zeros and require special handling)
- Follow-up: What if array contains zeros? This solution handles it correctly!

---

### 7. Valid Sudoku
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/valid-sudoku/) | [NeetCode](https://neetcode.io/problems/valid-sudoku)

#### Problem
Determine if a 9x9 Sudoku board is valid. Only the filled cells need to be validated according to the following rules:
1. Each row must contain digits 1-9 without repetition
2. Each column must contain digits 1-9 without repetition
3. Each of the nine 3×3 sub-boxes must contain digits 1-9 without repetition

**Example:**
```
Input: A 9x9 board with some filled cells
Output: true if valid, false otherwise
```

#### Intuition
Use HashSets to track seen numbers for each row, column, and 3×3 box. For each cell, check all three constraints.

#### Brute Force Approach
Three separate passes: check all rows, then all columns, then all boxes.

- **Time:** O(81) = O(1) - fixed board size
- **Space:** O(81) = O(1)

```csharp
public class Solution {
    public bool IsValidSudoku(char[][] board) {
        // Check rows
        for (int r = 0; r &lt; 9; r++) {
            HashSet&lt;char> seen = new HashSet&lt;char>();
            for (int c = 0; c &lt; 9; c++) {
                if (board[r][c] != '.') {
                    if (!seen.Add(board[r][c])) return false;
                }
            }
        }
        
        // Check columns
        for (int c = 0; c &lt; 9; c++) {
            HashSet&lt;char> seen = new HashSet&lt;char>();
            for (int r = 0; r &lt; 9; r++) {
                if (board[r][c] != '.') {
                    if (!seen.Add(board[r][c])) return false;
                }
            }
        }
        
        // Check 3x3 boxes
        for (int boxRow = 0; boxRow &lt; 3; boxRow++) {
            for (int boxCol = 0; boxCol &lt; 3; boxCol++) {
                HashSet&lt;char> seen = new HashSet&lt;char>();
                for (int r = boxRow * 3; r &lt; boxRow * 3 + 3; r++) {
                    for (int c = boxCol * 3; c &lt; boxCol * 3 + 3; c++) {
                        if (board[r][c] != '.') {
                            if (!seen.Add(board[r][c])) return false;
                        }
                    }
                }
            }
        }
        
        return true;
    }
}
```

#### Optimal Approach: Single Pass
Use arrays of HashSets to track all constraints simultaneously.

- **Time:** O(81) = O(1)
- **Space:** O(81) = O(1)

```csharp
public class Solution {
    public bool IsValidSudoku(char[][] board) {
        HashSet&lt;char>[] rows = new HashSet&lt;char>[9];
        HashSet&lt;char>[] cols = new HashSet&lt;char>[9];
        HashSet&lt;char>[] boxes = new HashSet&lt;char>[9];
        
        for (int i = 0; i &lt; 9; i++) {
            rows[i] = new HashSet&lt;char>();
            cols[i] = new HashSet&lt;char>();
            boxes[i] = new HashSet&lt;char>();
        }
        
        for (int r = 0; r &lt; 9; r++) {
            for (int c = 0; c &lt; 9; c++) {
                char val = board[r][c];
                if (val == '.') continue;
                
                // Calculate box index: (r/3)*3 + c/3
                int boxIdx = (r / 3) * 3 + (c / 3);
                
                // Check all three constraints
                if (!rows[r].Add(val) || 
                    !cols[c].Add(val) || 
                    !boxes[boxIdx].Add(val)) {
                    return false;
                }
            }
        }
        
        return true;
    }
}
```

#### Key Takeaways
- Box index formula: `(row / 3) * 3 + (col / 3)` maps cell to 0-8 box index
- Single pass with multiple HashSets is cleaner than three separate passes
- Fixed-size board means O(1) time and space technically
- `HashSet.Add()` returns false if element exists - perfect for duplicate detection

---

### 8. Encode and Decode Strings
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/encode-and-decode-strings/) | [NeetCode](https://neetcode.io/problems/string-encode-and-decode)

#### Problem
Design an algorithm to encode a list of strings to a single string. The encoded string is then decoded back to the original list of strings.

**Example:**
```
Input: ["hello","world"]
Encode: "5#hello5#world"
Decode: ["hello","world"]
```

#### Intuition
The challenge is handling strings that may contain any character, including delimiters. Solution: prefix each string with its length followed by a special character.

#### Approach
Use format: `length#string` for each string. The `#` delimiter is safe because we know exactly how many characters to read after it.

- **Time:** O(n) for both encode and decode, where n is total character count
- **Space:** O(n)

```csharp
public class Codec {
    // Encodes a list of strings to a single string
    public string Encode(IList&lt;string> strs) {
        StringBuilder sb = new StringBuilder();
        foreach (string s in strs) {
            sb.Append(s.Length);
            sb.Append('#');
            sb.Append(s);
        }
        return sb.ToString();
    }

    // Decodes a single string to a list of strings
    public IList&lt;string> Decode(string s) {
        List&lt;string> result = new List&lt;string>();
        int i = 0;
        
        while (i &lt; s.Length) {
            // Find the delimiter
            int j = i;
            while (s[j] != '#') {
                j++;
            }
            
            // Parse length
            int length = int.Parse(s.Substring(i, j - i));
            
            // Extract string
            string str = s.Substring(j + 1, length);
            result.Add(str);
            
            // Move to next encoded string
            i = j + 1 + length;
        }
        
        return result;
    }
}
```

#### Alternative: Chunked Transfer Encoding Style
Use 4-byte fixed-width length prefix.

```csharp
public class Codec {
    public string Encode(IList&lt;string> strs) {
        StringBuilder sb = new StringBuilder();
        foreach (string s in strs) {
            // Use 4-character padded length
            sb.Append(s.Length.ToString("D4"));
            sb.Append(s);
        }
        return sb.ToString();
    }

    public IList&lt;string> Decode(string s) {
        List&lt;string> result = new List&lt;string>();
        int i = 0;
        
        while (i &lt; s.Length) {
            int length = int.Parse(s.Substring(i, 4));
            i += 4;
            result.Add(s.Substring(i, length));
            i += length;
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Length-prefix encoding handles any character in strings
- `#` as delimiter is safe because we read exactly `length` characters
- Fixed-width length prefix (e.g., 4 digits) simplifies parsing
- This is similar to how network protocols encode variable-length data

---

### 9. Longest Consecutive Sequence
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/longest-consecutive-sequence/) | [NeetCode](https://neetcode.io/problems/longest-consecutive-sequence)

#### Problem
Given an unsorted array of integers `nums`, return the length of the longest consecutive elements sequence.

You must write an algorithm that runs in O(n) time.

**Example:**
```
Input: nums = [100,4,200,1,3,2]
Output: 4
Explanation: The longest consecutive sequence is [1,2,3,4]. Length = 4.
```

#### Intuition
Put all numbers in a HashSet. For each number, check if it's the START of a sequence (n-1 doesn't exist). If so, count how long the sequence extends.

#### Brute Force Approach
Sort the array and find longest consecutive run.

- **Time:** O(n log n) - sorting
- **Space:** O(1) or O(n)

```csharp
public class Solution {
    public int LongestConsecutive(int[] nums) {
        if (nums.Length == 0) return 0;
        
        Array.Sort(nums);
        int longest = 1;
        int current = 1;
        
        for (int i = 1; i &lt; nums.Length; i++) {
            if (nums[i] == nums[i - 1]) {
                continue;  // Skip duplicates
            } else if (nums[i] == nums[i - 1] + 1) {
                current++;
            } else {
                longest = Math.Max(longest, current);
                current = 1;
            }
        }
        
        return Math.Max(longest, current);
    }
}
```

#### Optimal Approach: HashSet with Sequence Start Detection
Only start counting from sequence beginnings to avoid redundant work.

- **Time:** O(n) - each element is visited at most twice
- **Space:** O(n) - HashSet storage

```csharp
public class Solution {
    public int LongestConsecutive(int[] nums) {
        HashSet&lt;int> numSet = new HashSet&lt;int>(nums);
        int longest = 0;
        
        foreach (int num in numSet) {
            // Only start counting if this is the beginning of a sequence
            if (!numSet.Contains(num - 1)) {
                int currentNum = num;
                int currentLength = 1;
                
                // Count consecutive numbers
                while (numSet.Contains(currentNum + 1)) {
                    currentNum++;
                    currentLength++;
                }
                
                longest = Math.Max(longest, currentLength);
            }
        }
        
        return longest;
    }
}
```

#### Key Takeaways
- Key insight: Only start counting from sequence START (where n-1 doesn't exist)
- This ensures O(n) because each number is part of exactly one sequence count
- Without the "start check", it would be O(n²) in worst case
- Use `new HashSet&lt;int>(nums)` to initialize from array
- Edge case: empty array → return 0

---

## Summary

### Pattern Recognition for Arrays & Hashing

| If you see... | Consider... |
|---------------|-------------|
| "Find duplicates" | HashSet |
| "Count frequencies" | Dictionary&lt;T, int> |
| "Find pair with sum" | HashMap complement lookup |
| "Group by property" | HashMap with computed key |
| "Top K frequent" | Bucket sort or Heap |
| "Product except self" | Prefix/Suffix products |
| "Validate uniqueness in regions" | Multiple HashSets |
| "Consecutive sequence" | HashSet + sequence start detection |

### C# Quick Reference

```csharp
// Frequency counting pattern
Dictionary&lt;T, int> count = new Dictionary&lt;T, int>();
count[key] = count.GetValueOrDefault(key, 0) + 1;

// HashSet duplicate detection
if (!set.Add(element)) { /* duplicate found */ }

// Initialize HashSet from array
HashSet&lt;int> set = new HashSet&lt;int>(array);

// Dictionary safe access
if (dict.TryGetValue(key, out var value)) { /* use value */ }

// LINQ for Top K
collection.OrderByDescending(x => x.Value).Take(k);
```
