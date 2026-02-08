# Tries

[← Back to Index](/dsa/00-index.md)

## Overview

A Trie (pronounced "try") is a tree-like data structure used for efficient retrieval of keys in a dataset of strings. Also called a prefix tree, it excels at prefix-based searches and autocomplete features.

### When to Use This Pattern
- **Prefix matching** - autocomplete, spell checker
- **Word validation** - dictionary lookup
- **Word search in matrix** - efficiently prune branches
- **IP routing** - longest prefix matching

### Trie Structure
```
        root
       / | \
      a  b  c
     /|      \
    p n       a
   /   \       \
  p     t       t
 /
l
e

Words: apple, ant, cat
```

### Key C# Implementation
```csharp
public class TrieNode {
    public Dictionary&lt;char, TrieNode> children = new Dictionary&lt;char, TrieNode>();
    public bool isEndOfWord = false;
}

// Alternative: Fixed array for lowercase letters
public class TrieNode {
    public TrieNode[] children = new TrieNode[26];
    public bool isEndOfWord = false;
}
```

### Complexity
| Operation | Time | Space |
|-----------|------|-------|
| Insert | O(m) | O(m) |
| Search | O(m) | O(1) |
| Prefix Search | O(m) | O(1) |
| Delete | O(m) | O(1) |

Where m = length of word

---

## Problems

### 1. Implement Trie (Prefix Tree)
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/implement-trie-prefix-tree/) | [NeetCode](https://neetcode.io/problems/implement-prefix-tree)

#### Problem
Implement a Trie with:
- `insert(word)` - Insert a word
- `search(word)` - Return true if word is in trie
- `startsWith(prefix)` - Return true if any word starts with prefix

**Example:**
```
Trie trie = new Trie();
trie.insert("apple");
trie.search("apple");   // true
trie.search("app");     // false
trie.startsWith("app"); // true
```

#### Optimal Approach
Array-based children for lowercase letters.

- **Time:** O(m) for all operations
- **Space:** O(total characters)

```csharp
public class Trie {
    private class TrieNode {
        public TrieNode[] children = new TrieNode[26];
        public bool isEndOfWord = false;
    }
    
    private TrieNode root;
    
    public Trie() {
        root = new TrieNode();
    }
    
    public void Insert(string word) {
        TrieNode node = root;
        foreach (char c in word) {
            int index = c - 'a';
            if (node.children[index] == null) {
                node.children[index] = new TrieNode();
            }
            node = node.children[index];
        }
        node.isEndOfWord = true;
    }
    
    public bool Search(string word) {
        TrieNode node = FindNode(word);
        return node != null && node.isEndOfWord;
    }
    
    public bool StartsWith(string prefix) {
        return FindNode(prefix) != null;
    }
    
    private TrieNode FindNode(string s) {
        TrieNode node = root;
        foreach (char c in s) {
            int index = c - 'a';
            if (node.children[index] == null) {
                return null;
            }
            node = node.children[index];
        }
        return node;
    }
}
```

#### Alternative: Dictionary-based (Flexible Characters)
```csharp
public class Trie {
    private class TrieNode {
        public Dictionary&lt;char, TrieNode> children = new Dictionary&lt;char, TrieNode>();
        public bool isEndOfWord = false;
    }
    
    private TrieNode root;
    
    public Trie() {
        root = new TrieNode();
    }
    
    public void Insert(string word) {
        TrieNode node = root;
        foreach (char c in word) {
            if (!node.children.ContainsKey(c)) {
                node.children[c] = new TrieNode();
            }
            node = node.children[c];
        }
        node.isEndOfWord = true;
    }
    
    public bool Search(string word) {
        TrieNode node = FindNode(word);
        return node != null && node.isEndOfWord;
    }
    
    public bool StartsWith(string prefix) {
        return FindNode(prefix) != null;
    }
    
    private TrieNode FindNode(string s) {
        TrieNode node = root;
        foreach (char c in s) {
            if (!node.children.ContainsKey(c)) {
                return null;
            }
            node = node.children[c];
        }
        return node;
    }
}
```

#### Key Takeaways
- Array[26] is faster for lowercase-only letters
- Dictionary is more flexible for Unicode/mixed case
- `isEndOfWord` distinguishes complete words from prefixes
- Common operation: traverse to node, then check condition

---

### 2. Design Add and Search Words Data Structure
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/design-add-and-search-words-data-structure/) | [NeetCode](https://neetcode.io/problems/design-word-search-data-structure)

#### Problem
Design a data structure that supports:
- `addWord(word)` - Add a word
- `search(word)` - Search for word; `.` can match any single character

**Example:**
```
WordDictionary dict = new WordDictionary();
dict.addWord("bad");
dict.addWord("dad");
dict.addWord("mad");
dict.search("pad"); // false
dict.search("bad"); // true
dict.search(".ad"); // true
dict.search("b.."); // true
```

#### Optimal Approach
Trie with DFS for wildcard matching.

- **Time:** O(m) for add, O(m × 26^w) worst case for search with w wildcards
- **Space:** O(total characters)

```csharp
public class WordDictionary {
    private class TrieNode {
        public TrieNode[] children = new TrieNode[26];
        public bool isEndOfWord = false;
    }
    
    private TrieNode root;
    
    public WordDictionary() {
        root = new TrieNode();
    }
    
    public void AddWord(string word) {
        TrieNode node = root;
        foreach (char c in word) {
            int index = c - 'a';
            if (node.children[index] == null) {
                node.children[index] = new TrieNode();
            }
            node = node.children[index];
        }
        node.isEndOfWord = true;
    }
    
    public bool Search(string word) {
        return SearchHelper(word, 0, root);
    }
    
    private bool SearchHelper(string word, int index, TrieNode node) {
        if (node == null) return false;
        
        if (index == word.Length) {
            return node.isEndOfWord;
        }
        
        char c = word[index];
        
        if (c == '.') {
            // Wildcard: try all children
            foreach (TrieNode child in node.children) {
                if (SearchHelper(word, index + 1, child)) {
                    return true;
                }
            }
            return false;
        } else {
            // Regular character
            int childIndex = c - 'a';
            return SearchHelper(word, index + 1, node.children[childIndex]);
        }
    }
}
```

#### Key Takeaways
- Wildcard `.` requires trying all 26 possible children
- Use recursion/DFS for wildcard handling
- Regular Trie operations still O(m)
- Multiple wildcards can cause exponential search in worst case

---

### 3. Word Search II
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/word-search-ii/) | [NeetCode](https://neetcode.io/problems/search-for-word-ii)

#### Problem
Given an m×n board of characters and a list of words, find all words that can be formed by sequentially adjacent cells (no cell reused per word).

**Example:**
```
Input: board = [["o","a","a","n"],
                ["e","t","a","e"],
                ["i","h","k","r"],
                ["i","f","l","v"]], 
       words = ["oath","pea","eat","rain"]
Output: ["eat","oath"]
```

#### Intuition
Build Trie from words. DFS from each cell, following Trie to prune invalid paths early.

#### Optimal Approach
Trie + DFS with backtracking.

- **Time:** O(m × n × 4^L) where L = max word length
- **Space:** O(total characters in words)

```csharp
public class Solution {
    private class TrieNode {
        public TrieNode[] children = new TrieNode[26];
        public string word = null;  // Store complete word at end
    }
    
    private int[] rowDir = { -1, 1, 0, 0 };
    private int[] colDir = { 0, 0, -1, 1 };
    
    public IList&lt;string> FindWords(char[][] board, string[] words) {
        // Build Trie
        TrieNode root = new TrieNode();
        foreach (string word in words) {
            TrieNode node = root;
            foreach (char c in word) {
                int index = c - 'a';
                if (node.children[index] == null) {
                    node.children[index] = new TrieNode();
                }
                node = node.children[index];
            }
            node.word = word;
        }
        
        List&lt;string> result = new List&lt;string>();
        int m = board.Length, n = board[0].Length;
        
        // DFS from each cell
        for (int r = 0; r &lt; m; r++) {
            for (int c = 0; c &lt; n; c++) {
                DFS(board, r, c, root, result);
            }
        }
        
        return result;
    }
    
    private void DFS(char[][] board, int r, int c, TrieNode node, List&lt;string> result) {
        // Bounds check
        if (r &lt; 0 || r >= board.Length || c &lt; 0 || c >= board[0].Length) {
            return;
        }
        
        char ch = board[r][c];
        
        // Already visited or no matching child
        if (ch == '#' || node.children[ch - 'a'] == null) {
            return;
        }
        
        node = node.children[ch - 'a'];
        
        // Found a word
        if (node.word != null) {
            result.Add(node.word);
            node.word = null;  // Avoid duplicates
        }
        
        // Mark as visited
        board[r][c] = '#';
        
        // Explore neighbors
        for (int d = 0; d &lt; 4; d++) {
            DFS(board, r + rowDir[d], c + colDir[d], node, result);
        }
        
        // Restore
        board[r][c] = ch;
    }
}
```

#### Optimizations
1. **Store word at end node** - avoid reconstructing path
2. **Remove word after finding** - prevents duplicates
3. **Prune empty branches** - remove Trie nodes with no children

```csharp
// Optimization: Prune empty Trie branches
private void DFS(char[][] board, int r, int c, TrieNode parent, int parentIndex, List&lt;string> result) {
    // ... existing code ...
    
    // After exploring, if node has no children and no word, remove it
    if (node.word == null && AllChildrenNull(node)) {
        parent.children[parentIndex] = null;
    }
}

private bool AllChildrenNull(TrieNode node) {
    foreach (var child in node.children) {
        if (child != null) return false;
    }
    return true;
}
```

#### Key Takeaways
- Trie enables early termination of invalid paths
- Store complete word at node to avoid path reconstruction
- Mark visited cells with special character (e.g., '#')
- Set found word to null to avoid duplicates
- Prune Trie branches for repeated searches

---

## Summary

### Pattern Recognition for Tries

| If you see... | Consider... |
|---------------|-------------|
| Prefix matching | Trie with startsWith |
| Autocomplete | Trie + DFS to find all matches |
| Word in grid | Trie + backtracking DFS |
| Wildcard search | Trie + recursive DFS |
| Dictionary operations | Trie for O(m) operations |

### Trie Templates

```csharp
// Basic Trie Node
public class TrieNode {
    public TrieNode[] children = new TrieNode[26];
    public bool isEndOfWord = false;
    // Optional: store word, count, etc.
}

// Insert
void Insert(string word) {
    TrieNode node = root;
    foreach (char c in word) {
        int i = c - 'a';
        if (node.children[i] == null) {
            node.children[i] = new TrieNode();
        }
        node = node.children[i];
    }
    node.isEndOfWord = true;
}

// Search (exact match)
bool Search(string word) {
    TrieNode node = FindNode(word);
    return node != null && node.isEndOfWord;
}

// Prefix search
bool StartsWith(string prefix) {
    return FindNode(prefix) != null;
}

// Find node for string
TrieNode FindNode(string s) {
    TrieNode node = root;
    foreach (char c in s) {
        int i = c - 'a';
        if (node.children[i] == null) return null;
        node = node.children[i];
    }
    return node;
}
```

### Trie vs Other Data Structures

| Structure | Search | Prefix Search | Space |
|-----------|--------|---------------|-------|
| Trie | O(m) | O(m) | O(ALPHABET × m × n) |
| HashSet | O(m) | O(n × m) | O(n × m) |
| Sorted Array | O(m log n) | O(m + log n) | O(n × m) |

Where m = word length, n = number of words
