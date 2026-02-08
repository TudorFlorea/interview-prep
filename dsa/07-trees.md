# Trees

[← Back to Index](/dsa/00-index.md)

## Overview

A Tree is a hierarchical data structure with nodes connected by edges. Binary trees (each node has at most 2 children) are the most common in interviews. Trees enable O(log n) operations when balanced.

### When to Use This Pattern
- **Hierarchical data** - file systems, organization charts
- **Sorted data with fast operations** - Binary Search Trees
- **Prefix matching** - Tries (covered separately)
- **Expression parsing** - Abstract syntax trees

### Types of Tree Traversals

1. **Preorder** (Root → Left → Right) - copy tree, prefix expression
2. **Inorder** (Left → Root → Right) - BST gives sorted order
3. **Postorder** (Left → Right → Root) - delete tree, postfix expression
4. **Level Order** (BFS) - level by level traversal

### Key C# Patterns
```csharp
// TreeNode definition (usually provided)
public class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;
    public TreeNode(int val = 0, TreeNode left = null, TreeNode right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

// DFS recursive template
void DFS(TreeNode node) {
    if (node == null) return;
    // Preorder: process here
    DFS(node.left);
    // Inorder: process here
    DFS(node.right);
    // Postorder: process here
}

// BFS template
Queue&lt;TreeNode> queue = new Queue&lt;TreeNode>();
queue.Enqueue(root);
while (queue.Count > 0) {
    TreeNode node = queue.Dequeue();
    // Process node
    if (node.left != null) queue.Enqueue(node.left);
    if (node.right != null) queue.Enqueue(node.right);
}
```

### Complexity Patterns
| Operation | Balanced Tree | Unbalanced Tree |
|-----------|---------------|-----------------|
| Search | O(log n) | O(n) |
| Insert | O(log n) | O(n) |
| Delete | O(log n) | O(n) |
| Traversal | O(n) | O(n) |

---

## Problems

### 1. Invert Binary Tree
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/invert-binary-tree/) | [NeetCode](https://neetcode.io/problems/invert-a-binary-tree)

#### Problem
Given the root of a binary tree, invert the tree (mirror it) and return its root.

**Example:**
```
Input:     4
         /   \
        2     7
       / \   / \
      1   3 6   9

Output:    4
         /   \
        7     2
       / \   / \
      9   6 3   1
```

#### Intuition
Swap left and right children at each node, then recursively invert subtrees.

#### Recursive Approach
- **Time:** O(n)
- **Space:** O(h) where h = height

```csharp
public class Solution {
    public TreeNode InvertTree(TreeNode root) {
        if (root == null) return null;
        
        // Swap children
        TreeNode temp = root.left;
        root.left = root.right;
        root.right = temp;
        
        // Recursively invert subtrees
        InvertTree(root.left);
        InvertTree(root.right);
        
        return root;
    }
}
```

#### Iterative Approach (BFS)
- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public TreeNode InvertTree(TreeNode root) {
        if (root == null) return null;
        
        Queue&lt;TreeNode> queue = new Queue&lt;TreeNode>();
        queue.Enqueue(root);
        
        while (queue.Count > 0) {
            TreeNode node = queue.Dequeue();
            
            // Swap children
            TreeNode temp = node.left;
            node.left = node.right;
            node.right = temp;
            
            if (node.left != null) queue.Enqueue(node.left);
            if (node.right != null) queue.Enqueue(node.right);
        }
        
        return root;
    }
}
```

#### Key Takeaways
- Simple swap at each node
- Can use any traversal order (preorder, postorder, level order)
- Famous problem (Homebrew creator couldn't do it in interview)

---

### 2. Maximum Depth of Binary Tree
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/maximum-depth-of-binary-tree/) | [NeetCode](https://neetcode.io/problems/depth-of-binary-tree)

#### Problem
Given the root of a binary tree, return its maximum depth (number of nodes along the longest path from root to leaf).

**Example:**
```
Input: root = [3,9,20,null,null,15,7]
Output: 3
```

#### Recursive Approach
- **Time:** O(n)
- **Space:** O(h)

```csharp
public class Solution {
    public int MaxDepth(TreeNode root) {
        if (root == null) return 0;
        
        int leftDepth = MaxDepth(root.left);
        int rightDepth = MaxDepth(root.right);
        
        return 1 + Math.Max(leftDepth, rightDepth);
    }
}
```

#### Iterative Approach (BFS)
- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public int MaxDepth(TreeNode root) {
        if (root == null) return 0;
        
        Queue&lt;TreeNode> queue = new Queue&lt;TreeNode>();
        queue.Enqueue(root);
        int depth = 0;
        
        while (queue.Count > 0) {
            int levelSize = queue.Count;
            depth++;
            
            for (int i = 0; i &lt; levelSize; i++) {
                TreeNode node = queue.Dequeue();
                if (node.left != null) queue.Enqueue(node.left);
                if (node.right != null) queue.Enqueue(node.right);
            }
        }
        
        return depth;
    }
}
```

#### Key Takeaways
- Depth = 1 + max(left depth, right depth)
- BFS counts levels = depth
- Base case: null node has depth 0

---

### 3. Diameter of Binary Tree
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/diameter-of-binary-tree/) | [NeetCode](https://neetcode.io/problems/binary-tree-diameter)

#### Problem
The diameter of a binary tree is the length of the longest path between any two nodes (number of edges). This path may or may not pass through the root.

**Example:**
```
Input: root = [1,2,3,4,5]
Output: 3
Explanation: Path 4→2→1→3 or 5→2→1→3 has length 3
```

#### Intuition
For each node, diameter passing through it = left height + right height. Track maximum across all nodes.

#### Optimal Approach
Calculate height while tracking diameter.

- **Time:** O(n)
- **Space:** O(h)

```csharp
public class Solution {
    private int diameter = 0;
    
    public int DiameterOfBinaryTree(TreeNode root) {
        Height(root);
        return diameter;
    }
    
    private int Height(TreeNode node) {
        if (node == null) return 0;
        
        int leftHeight = Height(node.left);
        int rightHeight = Height(node.right);
        
        // Update diameter (path through this node)
        diameter = Math.Max(diameter, leftHeight + rightHeight);
        
        // Return height
        return 1 + Math.Max(leftHeight, rightHeight);
    }
}
```

#### Key Takeaways
- Diameter at node = left height + right height (edges, not nodes)
- Track global maximum while computing heights
- Height and diameter computed in single traversal

---

### 4. Balanced Binary Tree
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/balanced-binary-tree/) | [NeetCode](https://neetcode.io/problems/balanced-binary-tree)

#### Problem
A height-balanced binary tree is one where the depth of the two subtrees of every node never differs by more than one.

**Example:**
```
Input: root = [3,9,20,null,null,15,7]
Output: true
```

#### Intuition
Check if heights differ by at most 1 at every node. Return -1 to indicate imbalance.

#### Optimal Approach
Single pass checking balance and height.

- **Time:** O(n)
- **Space:** O(h)

```csharp
public class Solution {
    public bool IsBalanced(TreeNode root) {
        return CheckHeight(root) != -1;
    }
    
    private int CheckHeight(TreeNode node) {
        if (node == null) return 0;
        
        int leftHeight = CheckHeight(node.left);
        if (leftHeight == -1) return -1;  // Left subtree unbalanced
        
        int rightHeight = CheckHeight(node.right);
        if (rightHeight == -1) return -1;  // Right subtree unbalanced
        
        // Check current node balance
        if (Math.Abs(leftHeight - rightHeight) > 1) {
            return -1;  // Current node unbalanced
        }
        
        return 1 + Math.Max(leftHeight, rightHeight);
    }
}
```

#### Key Takeaways
- Use -1 as sentinel for "unbalanced"
- Early termination when subtree is unbalanced
- Combines balance check with height calculation

---

### 5. Same Tree
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/same-tree/) | [NeetCode](https://neetcode.io/problems/same-binary-tree)

#### Problem
Given roots of two binary trees, check if they are the same (structurally identical with same values).

**Example:**
```
Input: p = [1,2,3], q = [1,2,3]
Output: true
```

#### Recursive Approach
- **Time:** O(n)
- **Space:** O(h)

```csharp
public class Solution {
    public bool IsSameTree(TreeNode p, TreeNode q) {
        // Both null
        if (p == null && q == null) return true;
        
        // One null, other not
        if (p == null || q == null) return false;
        
        // Both non-null: check value and subtrees
        return p.val == q.val && 
               IsSameTree(p.left, q.left) && 
               IsSameTree(p.right, q.right);
    }
}
```

#### Key Takeaways
- Check null cases first
- Recursively compare structure and values
- Short-circuit evaluation helps efficiency

---

### 6. Subtree of Another Tree
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/subtree-of-another-tree/) | [NeetCode](https://neetcode.io/problems/subtree-of-a-binary-tree)

#### Problem
Given roots of two binary trees, return true if there is a subtree of root that is identical to subRoot.

**Example:**
```
Input: root = [3,4,5,1,2], subRoot = [4,1,2]
Output: true
```

#### Intuition
Check if any node in root is the same tree as subRoot.

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(h)

```csharp
public class Solution {
    public bool IsSubtree(TreeNode root, TreeNode subRoot) {
        if (root == null) return false;
        
        if (IsSameTree(root, subRoot)) return true;
        
        return IsSubtree(root.left, subRoot) || IsSubtree(root.right, subRoot);
    }
    
    private bool IsSameTree(TreeNode p, TreeNode q) {
        if (p == null && q == null) return true;
        if (p == null || q == null) return false;
        
        return p.val == q.val && 
               IsSameTree(p.left, q.left) && 
               IsSameTree(p.right, q.right);
    }
}
```

#### Key Takeaways
- Combines tree traversal with same tree check
- For each node in main tree, check if it matches subRoot
- Can optimize with tree serialization to O(m + n)

---

### 7. Lowest Common Ancestor of a Binary Search Tree
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/) | [NeetCode](https://neetcode.io/problems/lowest-common-ancestor-in-binary-search-tree)

#### Problem
Given a BST and two nodes p and q, find their lowest common ancestor (LCA).

**Example:**
```
Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8
Output: 6
```

#### Intuition
Use BST property: if both p and q are smaller, go left; if both larger, go right; otherwise, current node is LCA.

#### Recursive Approach
- **Time:** O(h)
- **Space:** O(h)

```csharp
public class Solution {
    public TreeNode LowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        if (p.val &lt; root.val && q.val &lt; root.val) {
            return LowestCommonAncestor(root.left, p, q);
        }
        if (p.val > root.val && q.val > root.val) {
            return LowestCommonAncestor(root.right, p, q);
        }
        return root;  // Split point or one equals root
    }
}
```

#### Iterative Approach
- **Time:** O(h)
- **Space:** O(1)

```csharp
public class Solution {
    public TreeNode LowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        while (root != null) {
            if (p.val &lt; root.val && q.val &lt; root.val) {
                root = root.left;
            } else if (p.val > root.val && q.val > root.val) {
                root = root.right;
            } else {
                return root;
            }
        }
        return null;
    }
}
```

#### Key Takeaways
- BST property enables O(h) instead of O(n)
- LCA is where paths to p and q diverge
- Works even if p equals root or q equals root

---

### 8. Binary Tree Level Order Traversal
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/binary-tree-level-order-traversal/) | [NeetCode](https://neetcode.io/problems/level-order-traversal-of-binary-tree)

#### Problem
Return the level order traversal of a binary tree (values at each level from left to right).

**Example:**
```
Input: root = [3,9,20,null,null,15,7]
Output: [[3],[9,20],[15,7]]
```

#### BFS Approach
- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public IList&lt;IList&lt;int>> LevelOrder(TreeNode root) {
        List&lt;IList&lt;int>> result = new List&lt;IList&lt;int>>();
        if (root == null) return result;
        
        Queue&lt;TreeNode> queue = new Queue&lt;TreeNode>();
        queue.Enqueue(root);
        
        while (queue.Count > 0) {
            int levelSize = queue.Count;
            List&lt;int> level = new List&lt;int>();
            
            for (int i = 0; i &lt; levelSize; i++) {
                TreeNode node = queue.Dequeue();
                level.Add(node.val);
                
                if (node.left != null) queue.Enqueue(node.left);
                if (node.right != null) queue.Enqueue(node.right);
            }
            
            result.Add(level);
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Process level by level using queue size
- `levelSize = queue.Count` before processing ensures we handle one level
- Foundation for many tree problems (zigzag, right side view, etc.)

---

### 9. Binary Tree Right Side View
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/binary-tree-right-side-view/) | [NeetCode](https://neetcode.io/problems/binary-tree-right-side-view)

#### Problem
Return the values of nodes visible from the right side (rightmost node at each level).

**Example:**
```
Input: root = [1,2,3,null,5,null,4]
Output: [1,3,4]
```

#### BFS Approach
Take last node at each level.

- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public IList&lt;int> RightSideView(TreeNode root) {
        List&lt;int> result = new List&lt;int>();
        if (root == null) return result;
        
        Queue&lt;TreeNode> queue = new Queue&lt;TreeNode>();
        queue.Enqueue(root);
        
        while (queue.Count > 0) {
            int levelSize = queue.Count;
            
            for (int i = 0; i &lt; levelSize; i++) {
                TreeNode node = queue.Dequeue();
                
                // Last node in level
                if (i == levelSize - 1) {
                    result.Add(node.val);
                }
                
                if (node.left != null) queue.Enqueue(node.left);
                if (node.right != null) queue.Enqueue(node.right);
            }
        }
        
        return result;
    }
}
```

#### DFS Approach
Visit right subtree first, add first node at each depth.

- **Time:** O(n)
- **Space:** O(h)

```csharp
public class Solution {
    public IList&lt;int> RightSideView(TreeNode root) {
        List&lt;int> result = new List&lt;int>();
        DFS(root, 0, result);
        return result;
    }
    
    private void DFS(TreeNode node, int depth, List&lt;int> result) {
        if (node == null) return;
        
        // First node at this depth (rightmost due to right-first traversal)
        if (depth == result.Count) {
            result.Add(node.val);
        }
        
        DFS(node.right, depth + 1, result);
        DFS(node.left, depth + 1, result);
    }
}
```

#### Key Takeaways
- BFS: take last node of each level
- DFS: visit right first, add first node at each depth
- DFS uses less space for balanced trees

---

### 10. Count Good Nodes in Binary Tree
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/count-good-nodes-in-binary-tree/) | [NeetCode](https://neetcode.io/problems/count-good-nodes-in-binary-tree)

#### Problem
A node is "good" if the path from root to that node has no node with value greater than it. Count good nodes.

**Example:**
```
Input: root = [3,1,4,3,null,1,5]
Output: 4
Explanation: Good nodes: 3 (root), 4, 3 (left), 5
```

#### DFS Approach
Track maximum value on path from root.

- **Time:** O(n)
- **Space:** O(h)

```csharp
public class Solution {
    public int GoodNodes(TreeNode root) {
        return CountGood(root, int.MinValue);
    }
    
    private int CountGood(TreeNode node, int maxSoFar) {
        if (node == null) return 0;
        
        int count = 0;
        if (node.val >= maxSoFar) {
            count = 1;  // This is a good node
        }
        
        int newMax = Math.Max(maxSoFar, node.val);
        
        count += CountGood(node.left, newMax);
        count += CountGood(node.right, newMax);
        
        return count;
    }
}
```

#### Key Takeaways
- Good node: value >= all ancestors
- Pass maximum along the path
- Start with `int.MinValue` so root is always good

---

### 11. Validate Binary Search Tree
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/validate-binary-search-tree/) | [NeetCode](https://neetcode.io/problems/valid-binary-search-tree)

#### Problem
Determine if a binary tree is a valid BST.

BST property: left subtree contains only nodes with values less than root; right subtree contains only values greater than root.

**Example:**
```
Input: root = [2,1,3]
Output: true
```

#### Approach: Range Validation
Each node must be within valid range.

- **Time:** O(n)
- **Space:** O(h)

```csharp
public class Solution {
    public bool IsValidBST(TreeNode root) {
        return Validate(root, long.MinValue, long.MaxValue);
    }
    
    private bool Validate(TreeNode node, long min, long max) {
        if (node == null) return true;
        
        if (node.val &lt;= min || node.val >= max) {
            return false;
        }
        
        return Validate(node.left, min, node.val) && 
               Validate(node.right, node.val, max);
    }
}
```

#### Approach: Inorder Traversal
Inorder traversal of BST gives sorted order.

```csharp
public class Solution {
    private long prev = long.MinValue;
    
    public bool IsValidBST(TreeNode root) {
        return Inorder(root);
    }
    
    private bool Inorder(TreeNode node) {
        if (node == null) return true;
        
        if (!Inorder(node.left)) return false;
        
        if (node.val &lt;= prev) return false;
        prev = node.val;
        
        return Inorder(node.right);
    }
}
```

#### Key Takeaways
- Use `long` to handle edge cases with int.MinValue/MaxValue
- Range approach: left child in [min, node.val), right child in (node.val, max]
- Inorder approach: values must be strictly increasing

---

### 12. Kth Smallest Element in a BST
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/kth-smallest-element-in-a-bst/) | [NeetCode](https://neetcode.io/problems/kth-smallest-integer-in-bst)

#### Problem
Given a BST, return the kth smallest element.

**Example:**
```
Input: root = [3,1,4,null,2], k = 1
Output: 1
```

#### Inorder Traversal
BST inorder gives sorted order; return kth element.

- **Time:** O(h + k)
- **Space:** O(h)

```csharp
public class Solution {
    private int count = 0;
    private int result = 0;
    
    public int KthSmallest(TreeNode root, int k) {
        Inorder(root, k);
        return result;
    }
    
    private void Inorder(TreeNode node, int k) {
        if (node == null) return;
        
        Inorder(node.left, k);
        
        count++;
        if (count == k) {
            result = node.val;
            return;
        }
        
        Inorder(node.right, k);
    }
}
```

#### Iterative Approach
- **Time:** O(h + k)
- **Space:** O(h)

```csharp
public class Solution {
    public int KthSmallest(TreeNode root, int k) {
        Stack&lt;TreeNode> stack = new Stack&lt;TreeNode>();
        TreeNode current = root;
        
        while (current != null || stack.Count > 0) {
            // Go to leftmost
            while (current != null) {
                stack.Push(current);
                current = current.left;
            }
            
            current = stack.Pop();
            k--;
            
            if (k == 0) return current.val;
            
            current = current.right;
        }
        
        return -1;  // k > number of nodes
    }
}
```

#### Key Takeaways
- Inorder traversal of BST = sorted order
- Stop as soon as k elements visited
- Iterative uses less stack space in practice

---

### 13. Construct Binary Tree from Preorder and Inorder Traversal
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/) | [NeetCode](https://neetcode.io/problems/binary-tree-from-preorder-and-inorder-traversal)

#### Problem
Given preorder and inorder traversal arrays, construct the binary tree.

**Example:**
```
Input: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]
Output: [3,9,20,null,null,15,7]
```

#### Intuition
First element of preorder is root. Find it in inorder to split into left and right subtrees.

#### Optimal Approach
Use HashMap for O(1) lookup in inorder.

- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    private Dictionary&lt;int, int> inorderMap;
    private int preorderIdx = 0;
    
    public TreeNode BuildTree(int[] preorder, int[] inorder) {
        // Map value to index in inorder
        inorderMap = new Dictionary&lt;int, int>();
        for (int i = 0; i &lt; inorder.Length; i++) {
            inorderMap[inorder[i]] = i;
        }
        
        return Build(preorder, 0, inorder.Length - 1);
    }
    
    private TreeNode Build(int[] preorder, int inLeft, int inRight) {
        if (inLeft > inRight) return null;
        
        int rootVal = preorder[preorderIdx++];
        TreeNode root = new TreeNode(rootVal);
        
        int inorderIdx = inorderMap[rootVal];
        
        // Build left subtree first (matches preorder)
        root.left = Build(preorder, inLeft, inorderIdx - 1);
        root.right = Build(preorder, inorderIdx + 1, inRight);
        
        return root;
    }
}
```

#### Key Takeaways
- Preorder[0] is root
- Elements left of root in inorder = left subtree
- Elements right of root in inorder = right subtree
- Build left before right (matches preorder sequence)

---

### 14. Binary Tree Maximum Path Sum
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/binary-tree-maximum-path-sum/) | [NeetCode](https://neetcode.io/problems/binary-tree-maximum-path-sum)

#### Problem
Find the maximum path sum. A path is any sequence of nodes connected by edges (doesn't need to pass through root).

**Example:**
```
Input: root = [-10,9,20,null,null,15,7]
Output: 42
Explanation: Path 15→20→7 has sum 42
```

#### Intuition
For each node, consider path through it. Update global max with best path including both children. Return best single-branch path for parent.

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(h)

```csharp
public class Solution {
    private int maxSum = int.MinValue;
    
    public int MaxPathSum(TreeNode root) {
        MaxGain(root);
        return maxSum;
    }
    
    private int MaxGain(TreeNode node) {
        if (node == null) return 0;
        
        // Get max gain from left and right (ignore negative paths)
        int leftGain = Math.Max(MaxGain(node.left), 0);
        int rightGain = Math.Max(MaxGain(node.right), 0);
        
        // Path through this node
        int pathSum = node.val + leftGain + rightGain;
        maxSum = Math.Max(maxSum, pathSum);
        
        // Return max gain for parent (can only take one branch)
        return node.val + Math.Max(leftGain, rightGain);
    }
}
```

#### Key Takeaways
- `Math.Max(gain, 0)` ignores negative contribution paths
- For parent, can only extend one branch (not both)
- Track global max separately from return value
- Similar to diameter but with values instead of edges

---

### 15. Serialize and Deserialize Binary Tree
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) | [NeetCode](https://neetcode.io/problems/serialize-and-deserialize-binary-tree)

#### Problem
Design an algorithm to serialize and deserialize a binary tree.

**Example:**
```
Input: root = [1,2,3,null,null,4,5]
Output: [1,2,3,null,null,4,5]
```

#### Approach: Preorder with Null Markers
Use "null" to mark empty children.

- **Time:** O(n) for both operations
- **Space:** O(n)

```csharp
public class Codec {
    // Encodes a tree to a single string
    public string serialize(TreeNode root) {
        StringBuilder sb = new StringBuilder();
        SerializeHelper(root, sb);
        return sb.ToString();
    }
    
    private void SerializeHelper(TreeNode node, StringBuilder sb) {
        if (node == null) {
            sb.Append("null,");
            return;
        }
        
        sb.Append(node.val);
        sb.Append(",");
        SerializeHelper(node.left, sb);
        SerializeHelper(node.right, sb);
    }

    // Decodes your encoded data to tree
    public TreeNode deserialize(string data) {
        Queue&lt;string> nodes = new Queue&lt;string>(data.Split(','));
        return DeserializeHelper(nodes);
    }
    
    private TreeNode DeserializeHelper(Queue&lt;string> nodes) {
        string val = nodes.Dequeue();
        
        if (val == "null" || string.IsNullOrEmpty(val)) {
            return null;
        }
        
        TreeNode node = new TreeNode(int.Parse(val));
        node.left = DeserializeHelper(nodes);
        node.right = DeserializeHelper(nodes);
        
        return node;
    }
}
```

#### BFS Approach
Level order serialization.

```csharp
public class Codec {
    public string serialize(TreeNode root) {
        if (root == null) return "";
        
        StringBuilder sb = new StringBuilder();
        Queue&lt;TreeNode> queue = new Queue&lt;TreeNode>();
        queue.Enqueue(root);
        
        while (queue.Count > 0) {
            TreeNode node = queue.Dequeue();
            
            if (node == null) {
                sb.Append("null,");
            } else {
                sb.Append(node.val + ",");
                queue.Enqueue(node.left);
                queue.Enqueue(node.right);
            }
        }
        
        return sb.ToString();
    }

    public TreeNode deserialize(string data) {
        if (string.IsNullOrEmpty(data)) return null;
        
        string[] nodes = data.Split(',');
        TreeNode root = new TreeNode(int.Parse(nodes[0]));
        Queue&lt;TreeNode> queue = new Queue&lt;TreeNode>();
        queue.Enqueue(root);
        
        int i = 1;
        while (queue.Count > 0 && i &lt; nodes.Length) {
            TreeNode parent = queue.Dequeue();
            
            if (nodes[i] != "null" && !string.IsNullOrEmpty(nodes[i])) {
                parent.left = new TreeNode(int.Parse(nodes[i]));
                queue.Enqueue(parent.left);
            }
            i++;
            
            if (i &lt; nodes.Length && nodes[i] != "null" && !string.IsNullOrEmpty(nodes[i])) {
                parent.right = new TreeNode(int.Parse(nodes[i]));
                queue.Enqueue(parent.right);
            }
            i++;
        }
        
        return root;
    }
}
```

#### Key Takeaways
- Preorder with null markers preserves structure
- Use queue for deserialization to process in order
- Both DFS and BFS approaches work
- Consistent delimiter handling is crucial

---

## Summary

### Pattern Recognition for Trees

| If you see... | Consider... |
|---------------|-------------|
| Level by level | BFS with queue |
| Path problems | DFS with return values |
| BST operations | Use BST property |
| Serialize/construct | Preorder with markers |
| Validate structure | Range-based DFS |
| Maximum/minimum path | Track global + return local |

### Tree Traversal Templates

```csharp
// DFS Preorder
void Preorder(TreeNode node) {
    if (node == null) return;
    Process(node);
    Preorder(node.left);
    Preorder(node.right);
}

// DFS Inorder (BST sorted order)
void Inorder(TreeNode node) {
    if (node == null) return;
    Inorder(node.left);
    Process(node);
    Inorder(node.right);
}

// BFS Level Order
void LevelOrder(TreeNode root) {
    Queue&lt;TreeNode> queue = new Queue&lt;TreeNode>();
    queue.Enqueue(root);
    while (queue.Count > 0) {
        int levelSize = queue.Count;
        for (int i = 0; i &lt; levelSize; i++) {
            TreeNode node = queue.Dequeue();
            Process(node);
            if (node.left != null) queue.Enqueue(node.left);
            if (node.right != null) queue.Enqueue(node.right);
        }
    }
}
```

### BST Properties

```csharp
// BST: left &lt; root &lt; right
// Inorder traversal gives sorted order
// Search/Insert/Delete: O(h) where h = height
// Balanced BST: h = O(log n)
// Worst case (skewed): h = O(n)
```
