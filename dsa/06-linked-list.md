# Linked List

[← Back to Index](/dsa/00-index.md)

## Overview

A Linked List is a linear data structure where elements are stored in nodes, each containing data and a pointer to the next node. Unlike arrays, linked lists don't require contiguous memory and allow O(1) insertions/deletions at known positions.

### When to Use This Pattern
- **Sequential access** with frequent insertions/deletions
- **Unknown size** - dynamic growth without reallocation
- **Implement stacks/queues** - O(1) operations at ends
- **LRU Cache** - O(1) remove and add with HashMap

### Types of Linked List Problems

1. **Pointer Manipulation** - reverse, reorder, merge
2. **Fast/Slow Pointers** - cycle detection, middle finding
3. **Dummy Head** - simplify edge cases for head modifications
4. **Multiple Lists** - merge, intersection, addition

### Key C# Patterns
```csharp
// ListNode definition (usually provided)
public class ListNode {
    public int val;
    public ListNode next;
    public ListNode(int val = 0, ListNode next = null) {
        this.val = val;
        this.next = next;
    }
}

// Dummy head pattern
ListNode dummy = new ListNode(0);
dummy.next = head;
// ... manipulate list
return dummy.next;

// Fast/slow pointers
ListNode slow = head, fast = head;
while (fast != null && fast.next != null) {
    slow = slow.next;
    fast = fast.next.next;
}
// slow is at middle (or start of second half)
```

### Complexity Patterns
| Operation | Array | Linked List |
|-----------|-------|-------------|
| Access by index | O(1) | O(n) |
| Insert at head | O(n) | O(1) |
| Insert at tail | O(1)* | O(n) or O(1)** |
| Delete at known position | O(n) | O(1) |
| Search | O(n) | O(n) |

*Amortized for dynamic arrays
**O(1) if tail pointer maintained

---

## Problems

### 1. Reverse Linked List
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/reverse-linked-list/) | [NeetCode](https://neetcode.io/problems/reverse-a-linked-list)

#### Problem
Given the head of a singly linked list, reverse the list and return the new head.

**Example:**
```
Input: head = [1,2,3,4,5]
Output: [5,4,3,2,1]
```

#### Intuition
Change each node's next pointer to point to the previous node instead of the next.

#### Iterative Approach
Use three pointers: prev, current, next.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public ListNode ReverseList(ListNode head) {
        ListNode prev = null;
        ListNode current = head;
        
        while (current != null) {
            ListNode next = current.next;  // Save next
            current.next = prev;           // Reverse pointer
            prev = current;                // Move prev forward
            current = next;                // Move current forward
        }
        
        return prev;  // New head
    }
}
```

#### Recursive Approach
Reverse the rest of the list, then fix the current node.

- **Time:** O(n)
- **Space:** O(n) - recursion stack

```csharp
public class Solution {
    public ListNode ReverseList(ListNode head) {
        // Base case: empty or single node
        if (head == null || head.next == null) {
            return head;
        }
        
        // Reverse the rest of the list
        ListNode newHead = ReverseList(head.next);
        
        // Fix the current node
        head.next.next = head;
        head.next = null;
        
        return newHead;
    }
}
```

#### Key Takeaways
- Iterative is more space-efficient
- Save next before overwriting current.next
- Return prev (not current) at the end
- Fundamental building block for many linked list problems

---

### 2. Merge Two Sorted Lists
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/merge-two-sorted-lists/) | [NeetCode](https://neetcode.io/problems/merge-two-sorted-linked-lists)

#### Problem
Merge two sorted linked lists into one sorted list by splicing together the nodes.

**Example:**
```
Input: list1 = [1,2,4], list2 = [1,3,4]
Output: [1,1,2,3,4,4]
```

#### Intuition
Use a dummy head and compare nodes from both lists, always picking the smaller one.

#### Iterative Approach
Compare and link nodes one by one.

- **Time:** O(n + m)
- **Space:** O(1)

```csharp
public class Solution {
    public ListNode MergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(0);
        ListNode current = dummy;
        
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {
                current.next = list1;
                list1 = list1.next;
            } else {
                current.next = list2;
                list2 = list2.next;
            }
            current = current.next;
        }
        
        // Attach remaining nodes
        current.next = list1 ?? list2;
        
        return dummy.next;
    }
}
```

#### Recursive Approach
Pick smaller head, recursively merge the rest.

- **Time:** O(n + m)
- **Space:** O(n + m) - recursion stack

```csharp
public class Solution {
    public ListNode MergeTwoLists(ListNode list1, ListNode list2) {
        if (list1 == null) return list2;
        if (list2 == null) return list1;
        
        if (list1.val <= list2.val) {
            list1.next = MergeTwoLists(list1.next, list2);
            return list1;
        } else {
            list2.next = MergeTwoLists(list1, list2.next);
            return list2;
        }
    }
}
```

#### Key Takeaways
- Dummy head simplifies handling of the first node
- `current.next = list1 ?? list2` attaches remaining list
- Pattern used in merge sort and merge K sorted lists

---

### 3. Reorder List
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/reorder-list/) | [NeetCode](https://neetcode.io/problems/reorder-linked-list)

#### Problem
Reorder list from L0 → L1 → ... → Ln-1 → Ln to L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → ...

Do not modify node values; only change node pointers.

**Example:**
```
Input: head = [1,2,3,4]
Output: [1,4,2,3]

Input: head = [1,2,3,4,5]
Output: [1,5,2,4,3]
```

#### Intuition
1. Find the middle of the list
2. Reverse the second half
3. Merge the two halves alternately

#### Optimal Approach
Three steps: find middle, reverse second half, merge.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public void ReorderList(ListNode head) {
        if (head == null || head.next == null) return;
        
        // Step 1: Find middle using slow/fast pointers
        ListNode slow = head, fast = head;
        while (fast.next != null && fast.next.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        
        // Step 2: Reverse second half
        ListNode secondHalf = ReverseList(slow.next);
        slow.next = null;  // Cut the list
        
        // Step 3: Merge alternately
        ListNode firstHalf = head;
        while (secondHalf != null) {
            ListNode temp1 = firstHalf.next;
            ListNode temp2 = secondHalf.next;
            
            firstHalf.next = secondHalf;
            secondHalf.next = temp1;
            
            firstHalf = temp1;
            secondHalf = temp2;
        }
    }
    
    private ListNode ReverseList(ListNode head) {
        ListNode prev = null, current = head;
        while (current != null) {
            ListNode next = current.next;
            current.next = prev;
            prev = current;
            current = next;
        }
        return prev;
    }
}
```

#### Key Takeaways
- Combines three fundamental techniques: find middle, reverse, merge
- Fast pointer condition: `fast.next != null && fast.next.next != null`
- Cut the list before merging to avoid cycles
- In-place with O(1) space

---

### 4. Remove Nth Node From End of List
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) | [NeetCode](https://neetcode.io/problems/remove-node-from-end-of-linked-list)

#### Problem
Given the head of a linked list, remove the nth node from the end and return the head.

**Example:**
```
Input: head = [1,2,3,4,5], n = 2
Output: [1,2,3,5]
Explanation: Remove 4 (2nd from end)
```

#### Intuition
Use two pointers with n nodes apart. When fast reaches end, slow is at the node before the one to remove.

#### Optimal Approach: Two Pointers
One pass with dummy head.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public ListNode RemoveNthFromEnd(ListNode head, int n) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        
        ListNode slow = dummy, fast = dummy;
        
        // Move fast n+1 steps ahead (so slow ends up before target)
        for (int i = 0; i <= n; i++) {
            fast = fast.next;
        }
        
        // Move both until fast reaches end
        while (fast != null) {
            slow = slow.next;
            fast = fast.next;
        }
        
        // Remove the node
        slow.next = slow.next.next;
        
        return dummy.next;
    }
}
```

#### Key Takeaways
- Dummy head handles removing the first node
- Move fast n+1 steps so slow stops BEFORE the target
- Two-pointer gap technique is powerful for "nth from end" problems

---

### 5. Copy List with Random Pointer
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/copy-list-with-random-pointer/) | [NeetCode](https://neetcode.io/problems/copy-linked-list-with-random-pointer)

#### Problem
A linked list has nodes with an additional random pointer that can point to any node or null. Create a deep copy of the list.

**Example:**
```
Input: head = [[7,null],[13,0],[11,4],[10,2],[1,0]]
Output: [[7,null],[13,0],[11,4],[10,2],[1,0]]
```

#### Intuition
Use a HashMap to map original nodes to their copies. Two passes: first create all nodes, then set up pointers.

#### Approach 1: HashMap
Map original nodes to copies.

- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public Node CopyRandomList(Node head) {
        if (head == null) return null;
        
        Dictionary<Node, Node> map = new Dictionary<Node, Node>();
        
        // First pass: create all nodes
        Node current = head;
        while (current != null) {
            map[current] = new Node(current.val);
            current = current.next;
        }
        
        // Second pass: set up next and random pointers
        current = head;
        while (current != null) {
            map[current].next = current.next != null ? map[current.next] : null;
            map[current].random = current.random != null ? map[current.random] : null;
            current = current.next;
        }
        
        return map[head];
    }
}
```

#### Approach 2: Interleaving (O(1) Space)
Insert copy nodes between original nodes.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public Node CopyRandomList(Node head) {
        if (head == null) return null;
        
        // Step 1: Create interleaved list A->A'->B->B'->...
        Node current = head;
        while (current != null) {
            Node copy = new Node(current.val);
            copy.next = current.next;
            current.next = copy;
            current = copy.next;
        }
        
        // Step 2: Set random pointers for copies
        current = head;
        while (current != null) {
            if (current.random != null) {
                current.next.random = current.random.next;
            }
            current = current.next.next;
        }
        
        // Step 3: Separate the lists
        Node dummy = new Node(0);
        Node copyCurrent = dummy;
        current = head;
        
        while (current != null) {
            copyCurrent.next = current.next;
            copyCurrent = copyCurrent.next;
            
            current.next = current.next.next;
            current = current.next;
        }
        
        return dummy.next;
    }
}
```

#### Key Takeaways
- HashMap approach is simpler and more intuitive
- Interleaving approach uses O(1) extra space
- Key insight: copy.random = original.random.next (in interleaved list)
- Restore original list in the interleaving approach

---

### 6. Add Two Numbers
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/add-two-numbers/) | [NeetCode](https://neetcode.io/problems/add-two-numbers)

#### Problem
Two non-empty linked lists represent two non-negative integers in reverse order (digits stored in reverse). Add the two numbers and return the sum as a linked list.

**Example:**
```
Input: l1 = [2,4,3], l2 = [5,6,4]
Output: [7,0,8]
Explanation: 342 + 465 = 807
```

#### Intuition
Add digits from head (ones place) with carry, just like elementary school addition.

#### Optimal Approach
Traverse both lists, handle carry.

- **Time:** O(max(n, m))
- **Space:** O(max(n, m))

```csharp
public class Solution {
    public ListNode AddTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode current = dummy;
        int carry = 0;
        
        while (l1 != null || l2 != null || carry > 0) {
            int sum = carry;
            
            if (l1 != null) {
                sum += l1.val;
                l1 = l1.next;
            }
            
            if (l2 != null) {
                sum += l2.val;
                l2 = l2.next;
            }
            
            carry = sum / 10;
            current.next = new ListNode(sum % 10);
            current = current.next;
        }
        
        return dummy.next;
    }
}
```

#### Key Takeaways
- Handle different list lengths by checking for null
- Don't forget final carry (e.g., 999 + 1 = 1000)
- `sum % 10` gives current digit, `sum / 10` gives carry
- Reverse order makes addition straightforward (start from ones place)

---

### 7. Linked List Cycle
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/linked-list-cycle/) | [NeetCode](https://neetcode.io/problems/linked-list-cycle-detection)

#### Problem
Given head of a linked list, determine if it has a cycle.

**Example:**
```
Input: head = [3,2,0,-4], pos = 1 (tail connects to index 1)
Output: true
```

#### Intuition
Use Floyd's cycle detection: fast pointer moves 2 steps, slow moves 1 step. If there's a cycle, they will meet.

#### Approach 1: HashSet
Track visited nodes.

- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public bool HasCycle(ListNode head) {
        HashSet<ListNode> visited = new HashSet<ListNode>();
        
        while (head != null) {
            if (visited.Contains(head)) {
                return true;
            }
            visited.Add(head);
            head = head.next;
        }
        
        return false;
    }
}
```

#### Optimal Approach: Floyd's Cycle Detection
Fast and slow pointers.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public bool HasCycle(ListNode head) {
        if (head == null || head.next == null) return false;
        
        ListNode slow = head, fast = head;
        
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            
            if (slow == fast) {
                return true;
            }
        }
        
        return false;
    }
}
```

#### Key Takeaways
- Floyd's algorithm: if cycle exists, fast and slow will meet
- Fast moves 2x speed, so it "catches up" 1 node per iteration
- Check `fast != null && fast.next != null` before moving fast

---

### 8. Find the Duplicate Number
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/find-the-duplicate-number/) | [NeetCode](https://neetcode.io/problems/find-duplicate-integer)

#### Problem
Given an array of n+1 integers where each integer is in [1, n], find the duplicate (there is exactly one duplicate that may appear more than once).

Constraints: O(1) extra space, don't modify array.

**Example:**
```
Input: nums = [1,3,4,2,2]
Output: 2
```

#### Intuition
Treat array as linked list where nums[i] points to nums[nums[i]]. The duplicate creates a cycle. Use Floyd's algorithm to find cycle start.

#### Optimal Approach: Floyd's Algorithm
Treat as linked list cycle problem.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int FindDuplicate(int[] nums) {
        // Phase 1: Find intersection point
        int slow = nums[0];
        int fast = nums[0];
        
        do {
            slow = nums[slow];
            fast = nums[nums[fast]];
        } while (slow != fast);
        
        // Phase 2: Find cycle start
        slow = nums[0];
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        
        return slow;
    }
}
```

#### Why This Works
- Values 1 to n map to indices 1 to n
- Following the "links" creates a sequence
- Duplicate value means two indices point to same location → cycle
- Cycle entrance is the duplicate

#### Key Takeaways
- Creative application of Floyd's cycle detection
- Phase 1: Find meeting point in cycle
- Phase 2: Reset one pointer to start, move both at same speed
- Meeting point in phase 2 is the cycle entrance (duplicate)

---

### 9. LRU Cache
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/lru-cache/) | [NeetCode](https://neetcode.io/problems/lru-cache)

#### Problem
Implement an LRU (Least Recently Used) cache with:
- `get(key)` - Return value if key exists, else -1
- `put(key, value)` - Insert/update key-value. If capacity exceeded, evict least recently used.

Both operations must be O(1).

**Example:**
```
LRUCache cache = new LRUCache(2);
cache.put(1, 1);
cache.put(2, 2);
cache.get(1);       // returns 1
cache.put(3, 3);    // evicts key 2
cache.get(2);       // returns -1 (not found)
```

#### Intuition
Use a HashMap for O(1) lookup and a doubly linked list for O(1) removal/insertion. Most recently used at head, least recently used at tail.

#### Optimal Approach
HashMap + Doubly Linked List.

- **Time:** O(1) for both operations
- **Space:** O(capacity)

```csharp
public class LRUCache {
    private class Node {
        public int key, value;
        public Node prev, next;
        public Node(int key, int value) {
            this.key = key;
            this.value = value;
        }
    }
    
    private Dictionary<int, Node> cache;
    private Node head, tail;  // Dummy nodes
    private int capacity;
    
    public LRUCache(int capacity) {
        this.capacity = capacity;
        cache = new Dictionary<int, Node>();
        
        // Initialize dummy head and tail
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }
    
    public int Get(int key) {
        if (!cache.ContainsKey(key)) {
            return -1;
        }
        
        // Move to front (most recently used)
        Node node = cache[key];
        Remove(node);
        AddToFront(node);
        
        return node.value;
    }
    
    public void Put(int key, int value) {
        if (cache.ContainsKey(key)) {
            // Update existing
            Remove(cache[key]);
        }
        
        Node node = new Node(key, value);
        cache[key] = node;
        AddToFront(node);
        
        // Evict if over capacity
        if (cache.Count > capacity) {
            Node lru = tail.prev;
            Remove(lru);
            cache.Remove(lru.key);
        }
    }
    
    private void Remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private void AddToFront(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
}
```

#### Key Takeaways
- HashMap gives O(1) lookup by key
- Doubly linked list gives O(1) remove and add
- Dummy head/tail avoid null checks
- Node stores key (needed to remove from HashMap during eviction)
- Most recently used = near head, least recently used = near tail

---

### 10. Merge K Sorted Lists
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/merge-k-sorted-lists/) | [NeetCode](https://neetcode.io/problems/merge-k-sorted-linked-lists)

#### Problem
Merge k sorted linked lists into one sorted list.

**Example:**
```
Input: lists = [[1,4,5],[1,3,4],[2,6]]
Output: [1,1,2,3,4,4,5,6]
```

#### Intuition
Use a min-heap to always get the smallest current node across all lists.

#### Brute Force: Merge One by One
Merge lists sequentially.

- **Time:** O(kN) where N = total nodes
- **Space:** O(1)

```csharp
public class Solution {
    public ListNode MergeKLists(ListNode[] lists) {
        if (lists == null || lists.Length == 0) return null;
        
        ListNode result = null;
        foreach (var list in lists) {
            result = MergeTwoLists(result, list);
        }
        return result;
    }
    
    private ListNode MergeTwoLists(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode current = dummy;
        
        while (l1 != null && l2 != null) {
            if (l1.val <= l2.val) {
                current.next = l1;
                l1 = l1.next;
            } else {
                current.next = l2;
                l2 = l2.next;
            }
            current = current.next;
        }
        
        current.next = l1 ?? l2;
        return dummy.next;
    }
}
```

#### Optimal Approach: Min-Heap (Priority Queue)
Always pick smallest node.

- **Time:** O(N log k)
- **Space:** O(k)

```csharp
public class Solution {
    public ListNode MergeKLists(ListNode[] lists) {
        if (lists == null || lists.Length == 0) return null;
        
        // Min-heap by node value
        PriorityQueue<ListNode, int> minHeap = new PriorityQueue<ListNode, int>();
        
        // Add first node of each list
        foreach (var list in lists) {
            if (list != null) {
                minHeap.Enqueue(list, list.val);
            }
        }
        
        ListNode dummy = new ListNode(0);
        ListNode current = dummy;
        
        while (minHeap.Count > 0) {
            ListNode node = minHeap.Dequeue();
            current.next = node;
            current = current.next;
            
            if (node.next != null) {
                minHeap.Enqueue(node.next, node.next.val);
            }
        }
        
        return dummy.next;
    }
}
```

#### Alternative: Divide and Conquer
Merge pairs of lists recursively.

- **Time:** O(N log k)
- **Space:** O(log k) recursion

```csharp
public class Solution {
    public ListNode MergeKLists(ListNode[] lists) {
        if (lists == null || lists.Length == 0) return null;
        return MergeRange(lists, 0, lists.Length - 1);
    }
    
    private ListNode MergeRange(ListNode[] lists, int start, int end) {
        if (start == end) return lists[start];
        if (start > end) return null;
        
        int mid = start + (end - start) / 2;
        ListNode left = MergeRange(lists, start, mid);
        ListNode right = MergeRange(lists, mid + 1, end);
        
        return MergeTwoLists(left, right);
    }
    
    private ListNode MergeTwoLists(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(0);
        ListNode current = dummy;
        
        while (l1 != null && l2 != null) {
            if (l1.val <= l2.val) {
                current.next = l1; l1 = l1.next;
            } else {
                current.next = l2; l2 = l2.next;
            }
            current = current.next;
        }
        current.next = l1 ?? l2;
        return dummy.next;
    }
}
```

#### Key Takeaways
- Min-heap maintains O(log k) for finding minimum
- Always add next node of removed node to heap
- Divide and conquer has same complexity but no extra data structure
- Both O(N log k) are better than O(kN) sequential merge

---

### 11. Reverse Nodes in K-Group
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/reverse-nodes-in-k-group/) | [NeetCode](https://neetcode.io/problems/reverse-nodes-in-k-group)

#### Problem
Given a linked list, reverse nodes in groups of k. Nodes remaining (less than k) at the end should stay in original order.

**Example:**
```
Input: head = [1,2,3,4,5], k = 2
Output: [2,1,4,3,5]

Input: head = [1,2,3,4,5], k = 3
Output: [3,2,1,4,5]
```

#### Intuition
For each group of k nodes: check if k nodes exist, reverse them, connect to previous group, and continue.

#### Optimal Approach
Iterative with group reversal.

- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public ListNode ReverseKGroup(ListNode head, int k) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode groupPrev = dummy;
        
        while (true) {
            // Check if k nodes exist
            ListNode kth = GetKthNode(groupPrev, k);
            if (kth == null) break;
            
            ListNode groupNext = kth.next;
            
            // Reverse the group
            ListNode prev = kth.next;
            ListNode current = groupPrev.next;
            
            while (current != groupNext) {
                ListNode next = current.next;
                current.next = prev;
                prev = current;
                current = next;
            }
            
            // Connect with previous part
            ListNode temp = groupPrev.next;
            groupPrev.next = kth;
            groupPrev = temp;
        }
        
        return dummy.next;
    }
    
    private ListNode GetKthNode(ListNode start, int k) {
        while (start != null && k > 0) {
            start = start.next;
            k--;
        }
        return start;
    }
}
```

#### Key Takeaways
- Check if k nodes exist before reversing
- After reversing: old first becomes last, kth becomes first
- `groupPrev` tracks the node before current group
- Connect reversed group to rest of list properly

---

## Summary

### Pattern Recognition for Linked List

| If you see... | Consider... |
|---------------|-------------|
| Reverse/reorder | Iterative pointer manipulation |
| Find middle, detect cycle | Fast/slow pointers |
| Merge sorted lists | Two pointers or heap |
| Remove nth from end | Two pointers with gap |
| Modify head | Dummy head node |
| Deep copy with random | HashMap for node mapping |
| O(1) add/remove + O(1) lookup | HashMap + Doubly Linked List |

### Key Techniques

```csharp
// 1. Dummy head (simplifies edge cases)
ListNode dummy = new ListNode(0);
dummy.next = head;
// ... manipulate
return dummy.next;

// 2. Fast/slow pointers (find middle)
ListNode slow = head, fast = head;
while (fast != null && fast.next != null) {
    slow = slow.next;
    fast = fast.next.next;
}
// slow is at middle

// 3. Reverse in-place
ListNode prev = null, current = head;
while (current != null) {
    ListNode next = current.next;
    current.next = prev;
    prev = current;
    current = next;
}
// prev is new head

// 4. Two pointers with gap (nth from end)
// Move fast n steps ahead, then move both until fast reaches end
```

### C# Linked List Notes

```csharp
// No built-in singly linked list node
// Usually defined in problem:
public class ListNode {
    public int val;
    public ListNode next;
    public ListNode(int val = 0, ListNode next = null) {
        this.val = val;
        this.next = next;
    }
}

// Built-in LinkedList<T> is doubly linked
LinkedList<int> list = new LinkedList<int>();
list.AddFirst(1);
list.AddLast(2);
list.RemoveFirst();
list.RemoveLast();
```
