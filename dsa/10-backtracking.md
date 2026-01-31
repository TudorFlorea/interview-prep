# Backtracking

[← Back to Index](00-index.md)

## Overview

Backtracking is a systematic way to explore all possible solutions by building candidates incrementally and abandoning ("backtracking") candidates that cannot lead to valid solutions.

### When to Use This Pattern
- **Generate all combinations/permutations/subsets**
- **Find paths** satisfying constraints
- **Puzzle solving** (Sudoku, N-Queens)
- **Constraint satisfaction** problems
- **Problems with "all possible" or "every" in description**

### Backtracking Template
```csharp
void Backtrack(current_state, choices) {
    if (is_goal(current_state)) {
        add_to_results(current_state);
        return;
    }
    
    for (each choice in choices) {
        if (is_valid(choice)) {
            make_choice(choice);           // Do
            Backtrack(new_state, remaining_choices);
            undo_choice(choice);           // Undo
        }
    }
}
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Choice** | What decisions can we make at each step? |
| **Constraints** | What rules must we follow? |
| **Goal** | When do we have a complete solution? |
| **Prune** | When can we stop early? |

### Common Patterns

| Type | Characteristic | Example |
|------|----------------|---------|
| Subsets | Include/exclude each element | Power set |
| Permutations | Use each element exactly once | Arrangements |
| Combinations | Choose k elements | nCk |
| Partitioning | Divide into groups | Palindrome partition |

---

## Problems

### 1. Subsets
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/subsets/) | [NeetCode](https://neetcode.io/problems/subsets)

#### Problem
Given an array of unique integers, return all possible subsets (the power set).

**Example:**
```
Input: nums = [1,2,3]
Output: [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]
```

#### Intuition
For each element, we have two choices: include it or exclude it.

#### Optimal Approach: Backtracking
- **Time:** O(n × 2^n)
- **Space:** O(n) for recursion

```csharp
public class Solution {
    public IList&lt;IList&lt;int>> Subsets(int[] nums) {
        List&lt;IList&lt;int>> result = new List&lt;IList&lt;int>>();
        Backtrack(nums, 0, new List&lt;int>(), result);
        return result;
    }
    
    private void Backtrack(int[] nums, int index, List&lt;int> current, List&lt;IList&lt;int>> result) {
        result.Add(new List&lt;int>(current));  // Add copy of current subset
        
        for (int i = index; i &lt; nums.Length; i++) {
            current.Add(nums[i]);            // Include nums[i]
            Backtrack(nums, i + 1, current, result);
            current.RemoveAt(current.Count - 1);  // Exclude nums[i] (backtrack)
        }
    }
}
```

#### Alternative: Iterative
```csharp
public class Solution {
    public IList&lt;IList&lt;int>> Subsets(int[] nums) {
        List&lt;IList&lt;int>> result = new List&lt;IList&lt;int>> { new List&lt;int>() };
        
        foreach (int num in nums) {
            int n = result.Count;
            for (int i = 0; i &lt; n; i++) {
                List&lt;int> newSubset = new List&lt;int>(result[i]);
                newSubset.Add(num);
                result.Add(newSubset);
            }
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Start from index to avoid duplicates
- Add current state at every step (all are valid subsets)
- 2^n subsets for n elements

---

### 2. Combination Sum
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/combination-sum/) | [NeetCode](https://neetcode.io/problems/combination-target-sum)

#### Problem
Given an array of distinct integers and a target, return all unique combinations where the numbers sum to target. Each number can be used unlimited times.

**Example:**
```
Input: candidates = [2,3,6,7], target = 7
Output: [[2,2,3],[7]]
```

#### Intuition
Backtrack through candidates, allowing repeated use of the same element.

#### Optimal Approach
- **Time:** O(n^(target/min))
- **Space:** O(target/min)

```csharp
public class Solution {
    public IList&lt;IList&lt;int>> CombinationSum(int[] candidates, int target) {
        List&lt;IList&lt;int>> result = new List&lt;IList&lt;int>>();
        Backtrack(candidates, target, 0, new List&lt;int>(), result);
        return result;
    }
    
    private void Backtrack(int[] candidates, int remaining, int index, 
                          List&lt;int> current, List&lt;IList&lt;int>> result) {
        if (remaining == 0) {
            result.Add(new List&lt;int>(current));
            return;
        }
        
        if (remaining &lt; 0) return;  // Prune
        
        for (int i = index; i &lt; candidates.Length; i++) {
            current.Add(candidates[i]);
            Backtrack(candidates, remaining - candidates[i], i, current, result);  // i, not i+1 (reuse allowed)
            current.RemoveAt(current.Count - 1);
        }
    }
}
```

#### Key Takeaways
- Pass `i` (not `i+1`) to allow reuse of same element
- Prune when remaining &lt; 0
- Sort candidates for optimization (can prune when candidate > remaining)

---

### 3. Permutations
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/permutations/) | [NeetCode](https://neetcode.io/problems/permutations)

#### Problem
Given an array of distinct integers, return all possible permutations.

**Example:**
```
Input: nums = [1,2,3]
Output: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]
```

#### Intuition
At each position, try all unused elements.

#### Optimal Approach
- **Time:** O(n! × n)
- **Space:** O(n)

```csharp
public class Solution {
    public IList&lt;IList&lt;int>> Permute(int[] nums) {
        List&lt;IList&lt;int>> result = new List&lt;IList&lt;int>>();
        bool[] used = new bool[nums.Length];
        Backtrack(nums, used, new List&lt;int>(), result);
        return result;
    }
    
    private void Backtrack(int[] nums, bool[] used, List&lt;int> current, List&lt;IList&lt;int>> result) {
        if (current.Count == nums.Length) {
            result.Add(new List&lt;int>(current));
            return;
        }
        
        for (int i = 0; i &lt; nums.Length; i++) {
            if (used[i]) continue;
            
            used[i] = true;
            current.Add(nums[i]);
            Backtrack(nums, used, current, result);
            current.RemoveAt(current.Count - 1);
            used[i] = false;
        }
    }
}
```

#### Alternative: Swap-Based (In-place)
```csharp
public class Solution {
    public IList&lt;IList&lt;int>> Permute(int[] nums) {
        List&lt;IList&lt;int>> result = new List&lt;IList&lt;int>>();
        Backtrack(nums, 0, result);
        return result;
    }
    
    private void Backtrack(int[] nums, int start, List&lt;IList&lt;int>> result) {
        if (start == nums.Length) {
            result.Add(nums.ToList());
            return;
        }
        
        for (int i = start; i &lt; nums.Length; i++) {
            Swap(nums, start, i);
            Backtrack(nums, start + 1, result);
            Swap(nums, start, i);  // Backtrack
        }
    }
    
    private void Swap(int[] nums, int i, int j) {
        int temp = nums[i];
        nums[i] = nums[j];
        nums[j] = temp;
    }
}
```

#### Key Takeaways
- Permutations: order matters, use all elements
- Use `used[]` array or swap-based approach
- n! permutations for n elements

---

### 4. Subsets II
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/subsets-ii/) | [NeetCode](https://neetcode.io/problems/subsets-ii)

#### Problem
Given an array that may contain duplicates, return all possible unique subsets.

**Example:**
```
Input: nums = [1,2,2]
Output: [[],[1],[1,2],[1,2,2],[2],[2,2]]
```

#### Intuition
Sort first, then skip duplicates at the same level of recursion.

#### Optimal Approach
- **Time:** O(n × 2^n)
- **Space:** O(n)

```csharp
public class Solution {
    public IList&lt;IList&lt;int>> SubsetsWithDup(int[] nums) {
        List&lt;IList&lt;int>> result = new List&lt;IList&lt;int>>();
        Array.Sort(nums);  // Sort to group duplicates
        Backtrack(nums, 0, new List&lt;int>(), result);
        return result;
    }
    
    private void Backtrack(int[] nums, int index, List&lt;int> current, List&lt;IList&lt;int>> result) {
        result.Add(new List&lt;int>(current));
        
        for (int i = index; i &lt; nums.Length; i++) {
            // Skip duplicates at same level
            if (i > index && nums[i] == nums[i - 1]) continue;
            
            current.Add(nums[i]);
            Backtrack(nums, i + 1, current, result);
            current.RemoveAt(current.Count - 1);
        }
    }
}
```

#### Key Takeaways
- Sort array first to group duplicates
- Skip `nums[i] == nums[i-1]` when `i > index`
- `i > index` ensures we only skip at same recursion level

---

### 5. Combination Sum II
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/combination-sum-ii/) | [NeetCode](https://neetcode.io/problems/combination-target-sum-ii)

#### Problem
Given an array (may have duplicates) and target, return unique combinations that sum to target. Each number can be used only once.

**Example:**
```
Input: candidates = [10,1,2,7,6,1,5], target = 8
Output: [[1,1,6],[1,2,5],[1,7],[2,6]]
```

#### Optimal Approach
- **Time:** O(2^n)
- **Space:** O(n)

```csharp
public class Solution {
    public IList&lt;IList&lt;int>> CombinationSum2(int[] candidates, int target) {
        List&lt;IList&lt;int>> result = new List&lt;IList&lt;int>>();
        Array.Sort(candidates);  // Sort to handle duplicates
        Backtrack(candidates, target, 0, new List&lt;int>(), result);
        return result;
    }
    
    private void Backtrack(int[] candidates, int remaining, int index, 
                          List&lt;int> current, List&lt;IList&lt;int>> result) {
        if (remaining == 0) {
            result.Add(new List&lt;int>(current));
            return;
        }
        
        for (int i = index; i &lt; candidates.Length; i++) {
            // Skip duplicates at same level
            if (i > index && candidates[i] == candidates[i - 1]) continue;
            
            // Prune: remaining candidates too large
            if (candidates[i] > remaining) break;
            
            current.Add(candidates[i]);
            Backtrack(candidates, remaining - candidates[i], i + 1, current, result);  // i+1, use once
            current.RemoveAt(current.Count - 1);
        }
    }
}
```

#### Key Takeaways
- Sort + skip duplicates for unique combinations
- Use `i + 1` (not `i`) since each number used once
- Early termination when `candidates[i] > remaining` (array is sorted)

---

### 6. Word Search
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/word-search/) | [NeetCode](https://neetcode.io/problems/search-for-word)

#### Problem
Given a 2D board and word, determine if the word exists in the grid. Word can be constructed from letters of adjacent cells (horizontally or vertically).

**Example:**
```
Input: board = [["A","B","C","E"],
                ["S","F","C","S"],
                ["A","D","E","E"]], 
       word = "ABCCED"
Output: true
```

#### Optimal Approach: DFS Backtracking
- **Time:** O(m × n × 4^L) where L = word length
- **Space:** O(L)

```csharp
public class Solution {
    public bool Exist(char[][] board, string word) {
        int rows = board.Length;
        int cols = board[0].Length;
        
        for (int r = 0; r &lt; rows; r++) {
            for (int c = 0; c &lt; cols; c++) {
                if (Backtrack(board, word, r, c, 0)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    private bool Backtrack(char[][] board, string word, int row, int col, int index) {
        if (index == word.Length) return true;
        
        if (row &lt; 0 || row >= board.Length || 
            col &lt; 0 || col >= board[0].Length ||
            board[row][col] != word[index]) {
            return false;
        }
        
        // Mark as visited
        char temp = board[row][col];
        board[row][col] = '#';
        
        // Explore 4 directions
        int[] dr = {0, 0, 1, -1};
        int[] dc = {1, -1, 0, 0};
        
        for (int d = 0; d &lt; 4; d++) {
            if (Backtrack(board, word, row + dr[d], col + dc[d], index + 1)) {
                return true;
            }
        }
        
        // Backtrack: restore cell
        board[row][col] = temp;
        
        return false;
    }
}
```

#### Key Takeaways
- Start search from each cell matching first character
- Mark visited cells to avoid reuse in same path
- Restore cell value when backtracking
- Return early on first successful path found

---

### 7. Palindrome Partitioning
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/palindrome-partitioning/) | [NeetCode](https://neetcode.io/problems/palindrome-partitioning)

#### Problem
Partition a string such that every substring is a palindrome. Return all possible partitions.

**Example:**
```
Input: s = "aab"
Output: [["a","a","b"],["aa","b"]]
```

#### Optimal Approach
- **Time:** O(n × 2^n)
- **Space:** O(n)

```csharp
public class Solution {
    public IList&lt;IList&lt;string>> Partition(string s) {
        List&lt;IList&lt;string>> result = new List&lt;IList&lt;string>>();
        Backtrack(s, 0, new List&lt;string>(), result);
        return result;
    }
    
    private void Backtrack(string s, int start, List&lt;string> current, List&lt;IList&lt;string>> result) {
        if (start == s.Length) {
            result.Add(new List&lt;string>(current));
            return;
        }
        
        for (int end = start; end &lt; s.Length; end++) {
            if (IsPalindrome(s, start, end)) {
                current.Add(s.Substring(start, end - start + 1));
                Backtrack(s, end + 1, current, result);
                current.RemoveAt(current.Count - 1);
            }
        }
    }
    
    private bool IsPalindrome(string s, int left, int right) {
        while (left &lt; right) {
            if (s[left++] != s[right--]) return false;
        }
        return true;
    }
}
```

#### Alternative: DP for Palindrome Check
```csharp
public class Solution {
    public IList&lt;IList&lt;string>> Partition(string s) {
        int n = s.Length;
        bool[,] isPalin = new bool[n, n];
        
        // DP: isPalin[i,j] = true if s[i..j] is palindrome
        for (int i = n - 1; i >= 0; i--) {
            for (int j = i; j &lt; n; j++) {
                if (s[i] == s[j] && (j - i &lt;= 2 || isPalin[i + 1, j - 1])) {
                    isPalin[i, j] = true;
                }
            }
        }
        
        List&lt;IList&lt;string>> result = new List&lt;IList&lt;string>>();
        Backtrack(s, 0, new List&lt;string>(), result, isPalin);
        return result;
    }
    
    private void Backtrack(string s, int start, List&lt;string> current, 
                          List&lt;IList&lt;string>> result, bool[,] isPalin) {
        if (start == s.Length) {
            result.Add(new List&lt;string>(current));
            return;
        }
        
        for (int end = start; end &lt; s.Length; end++) {
            if (isPalin[start, end]) {
                current.Add(s.Substring(start, end - start + 1));
                Backtrack(s, end + 1, current, result, isPalin);
                current.RemoveAt(current.Count - 1);
            }
        }
    }
}
```

#### Key Takeaways
- Try all possible first partitions, recurse on remainder
- Only add partition if it's a palindrome
- Precompute palindrome table for optimization

---

### 8. Letter Combinations of a Phone Number
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/letter-combinations-of-a-phone-number/) | [NeetCode](https://neetcode.io/problems/letter-combinations-of-a-phone-number)

#### Problem
Given a string of digits (2-9), return all possible letter combinations.

```
2: abc, 3: def, 4: ghi, 5: jkl, 6: mno, 7: pqrs, 8: tuv, 9: wxyz
```

**Example:**
```
Input: digits = "23"
Output: ["ad","ae","af","bd","be","bf","cd","ce","cf"]
```

#### Optimal Approach
- **Time:** O(4^n × n)
- **Space:** O(n)

```csharp
public class Solution {
    private static string[] mapping = {
        "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"
    };
    
    public IList&lt;string> LetterCombinations(string digits) {
        List&lt;string> result = new List&lt;string>();
        if (string.IsNullOrEmpty(digits)) return result;
        
        Backtrack(digits, 0, new StringBuilder(), result);
        return result;
    }
    
    private void Backtrack(string digits, int index, StringBuilder current, List&lt;string> result) {
        if (index == digits.Length) {
            result.Add(current.ToString());
            return;
        }
        
        string letters = mapping[digits[index] - '0'];
        
        foreach (char letter in letters) {
            current.Append(letter);
            Backtrack(digits, index + 1, current, result);
            current.Remove(current.Length - 1, 1);  // Backtrack
        }
    }
}
```

#### Key Takeaways
- Map digits to letters
- StringBuilder for efficient string building
- Product of all letter options

---

### 9. N-Queens
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/n-queens/) | [NeetCode](https://neetcode.io/problems/n-queens)

#### Problem
Place n queens on n×n chessboard so no two queens attack each other. Return all distinct solutions.

**Example:**
```
Input: n = 4
Output: [[".Q..","...Q","Q...","..Q."],
         ["..Q.","Q...","...Q",".Q.."]]
```

#### Intuition
Place queens row by row. Use sets to track columns and diagonals under attack.

#### Optimal Approach
- **Time:** O(n!)
- **Space:** O(n²)

```csharp
public class Solution {
    public IList&lt;IList&lt;string>> SolveNQueens(int n) {
        List&lt;IList&lt;string>> result = new List&lt;IList&lt;string>>();
        char[][] board = new char[n][];
        
        for (int i = 0; i &lt; n; i++) {
            board[i] = new char[n];
            Array.Fill(board[i], '.');
        }
        
        HashSet&lt;int> cols = new HashSet&lt;int>();
        HashSet&lt;int> posDiag = new HashSet&lt;int>();  // row + col
        HashSet&lt;int> negDiag = new HashSet&lt;int>();  // row - col
        
        Backtrack(board, 0, cols, posDiag, negDiag, result);
        return result;
    }
    
    private void Backtrack(char[][] board, int row, 
                          HashSet&lt;int> cols, HashSet&lt;int> posDiag, HashSet&lt;int> negDiag,
                          List&lt;IList&lt;string>> result) {
        if (row == board.Length) {
            List&lt;string> solution = new List&lt;string>();
            foreach (char[] r in board) {
                solution.Add(new string(r));
            }
            result.Add(solution);
            return;
        }
        
        for (int col = 0; col &lt; board.Length; col++) {
            // Check if position is under attack
            if (cols.Contains(col) || 
                posDiag.Contains(row + col) || 
                negDiag.Contains(row - col)) {
                continue;
            }
            
            // Place queen
            board[row][col] = 'Q';
            cols.Add(col);
            posDiag.Add(row + col);
            negDiag.Add(row - col);
            
            Backtrack(board, row + 1, cols, posDiag, negDiag, result);
            
            // Remove queen (backtrack)
            board[row][col] = '.';
            cols.Remove(col);
            posDiag.Remove(row + col);
            negDiag.Remove(row - col);
        }
    }
}
```

#### Key Insights
- Row-by-row placement ensures no row conflicts
- Track columns, positive diagonals (row+col), negative diagonals (row-col)
- Cells on same positive diagonal have same row+col value
- Cells on same negative diagonal have same row-col value

```
Positive diagonals (row + col):     Negative diagonals (row - col):
  0 1 2 3                             0  1  2  3
0[0 1 2 3]                          0[0 -1 -2 -3]
1[1 2 3 4]                          1[1  0 -1 -2]
2[2 3 4 5]                          2[2  1  0 -1]
3[3 4 5 6]                          3[3  2  1  0]
```

#### Key Takeaways
- Place one queen per row
- HashSet for O(1) conflict checking
- Diagonal encoding: row±col
- Classic constraint satisfaction problem

---

## Summary

### Pattern Recognition

| If you see... | Consider... |
|---------------|-------------|
| "All combinations/permutations" | Backtracking |
| "All subsets" | Include/exclude backtracking |
| "Find all paths" | Backtracking with visited |
| "Satisfy constraints" | Backtracking with pruning |
| "Partition into groups" | Backtracking |
| Duplicates in input | Sort + skip duplicates |

### Templates by Problem Type

```csharp
// SUBSETS: Add at every step
void Subsets(index) {
    result.Add(current);  // Every state is valid
    for (i = index to n) {
        Add(nums[i]);
        Subsets(i + 1);
        Remove();
    }
}

// COMBINATIONS: Add when target met
void Combinations(index, remaining) {
    if (remaining == 0) result.Add(current);
    for (i = index to n) {
        Add(nums[i]);
        Combinations(i + 1, remaining - nums[i]);  // i for reuse, i+1 for once
        Remove();
    }
}

// PERMUTATIONS: Add when full length
void Permutations() {
    if (current.Length == n) result.Add(current);
    for (i = 0 to n) {
        if (used[i]) continue;
        used[i] = true;
        Add(nums[i]);
        Permutations();
        Remove();
        used[i] = false;
    }
}
```

### Duplicate Handling
1. **Sort the array first**
2. **Skip if same as previous at same level**: `if (i > start && nums[i] == nums[i-1]) continue;`
