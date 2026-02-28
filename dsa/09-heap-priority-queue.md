# Heap / Priority Queue

[← Back to Index](/dsa/00-index.md)

## Overview

A Heap is a complete binary tree satisfying the heap property. A Priority Queue is an abstract data type typically implemented using a heap that always gives access to the highest (or lowest) priority element.

### When to Use This Pattern
- **Top K elements** - largest, smallest, most frequent
- **Streaming data** - maintain running statistics
- **Merge K sorted lists** - always get minimum
- **Task scheduling** - process by priority
- **Dijkstra's algorithm** - shortest path

### Types of Heaps
- **Min-Heap**: Parent ≤ children (smallest at root)
- **Max-Heap**: Parent ≥ children (largest at root)

### Key C# Implementation
```csharp
// C# PriorityQueue (min-heap by default)
PriorityQueue<TElement, TPriority> pq = new PriorityQueue<TElement, TPriority>();
pq.Enqueue(element, priority);  // Add element with priority
pq.Dequeue();                   // Remove and return min priority element
pq.Peek();                      // View min priority element
pq.Count;                       // Number of elements

// For max-heap behavior, negate priorities
pq.Enqueue(element, -priority);

// Or use custom comparer
PriorityQueue<int, int> maxHeap = new PriorityQueue<int, int>(
    Comparer<int>.Create((a, b) => b.CompareTo(a))
);
```

### Complexity
| Operation | Time |
|-----------|------|
| Insert | O(log n) |
| Extract Min/Max | O(log n) |
| Peek | O(1) |
| Build heap | O(n) |

---

## Problems

### 1. Kth Largest Element in a Stream
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/kth-largest-element-in-a-stream/) | [NeetCode](https://neetcode.io/problems/kth-largest-integer-in-a-stream)

#### Problem
Design a class that finds the kth largest element in a stream. Each call to `add(val)` returns the kth largest.

**Example:**
```
KthLargest kthLargest = new KthLargest(3, [4, 5, 8, 2]);
kthLargest.add(3);   // returns 4
kthLargest.add(5);   // returns 5
kthLargest.add(10);  // returns 5
kthLargest.add(9);   // returns 8
kthLargest.add(4);   // returns 8
```

#### Intuition
Maintain a min-heap of size k. The root is always the kth largest.

#### Optimal Approach
- **Time:** O(log k) per add
- **Space:** O(k)

```csharp
public class KthLargest {
    private PriorityQueue<int, int> minHeap;
    private int k;
    
    public KthLargest(int k, int[] nums) {
        this.k = k;
        minHeap = new PriorityQueue<int, int>();
        
        foreach (int num in nums) {
            Add(num);
        }
    }
    
    public int Add(int val) {
        minHeap.Enqueue(val, val);
        
        // Keep only k largest elements
        if (minHeap.Count > k) {
            minHeap.Dequeue();
        }
        
        return minHeap.Peek();
    }
}
```

#### Key Takeaways
- Min-heap of size k keeps k largest; root is kth largest
- For kth smallest, use max-heap of size k
- Always maintain heap size = k after initial fills

---

### 2. Last Stone Weight
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/last-stone-weight/) | [NeetCode](https://neetcode.io/problems/last-stone-weight)

#### Problem
We have stones with integer weights. Each turn, take the two heaviest stones and smash them. If weights are equal, both destroyed. Otherwise, the lighter is destroyed and the heavier loses the lighter's weight. Return the weight of the last remaining stone (or 0 if none).

**Example:**
```
Input: stones = [2,7,4,1,8,1]
Output: 1
Explanation: 8,7→1; 4,2→2; 2,1→1; 1,1→0; last = 1
```

#### Intuition
Use a max-heap to always get the two heaviest stones.

#### Optimal Approach
- **Time:** O(n log n)
- **Space:** O(n)

```csharp
public class Solution {
    public int LastStoneWeight(int[] stones) {
        // Max-heap using negated values
        PriorityQueue<int, int> maxHeap = new PriorityQueue<int, int>();
        
        foreach (int stone in stones) {
            maxHeap.Enqueue(stone, -stone);  // Negate for max-heap
        }
        
        while (maxHeap.Count > 1) {
            int first = maxHeap.Dequeue();
            int second = maxHeap.Dequeue();
            
            if (first != second) {
                int remaining = first - second;
                maxHeap.Enqueue(remaining, -remaining);
            }
        }
        
        return maxHeap.Count == 0 ? 0 : maxHeap.Peek();
    }
}
```

#### Key Takeaways
- Max-heap: negate priorities in C# PriorityQueue
- Simulate the process until 0 or 1 stones remain
- Only add back to heap if stones have different weights

---

### 3. K Closest Points to Origin
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/k-closest-points-to-origin/) | [NeetCode](https://neetcode.io/problems/k-closest-points-to-origin)

#### Problem
Given an array of points and integer k, return the k closest points to origin (0, 0).

**Example:**
```
Input: points = [[1,3],[-2,2]], k = 1
Output: [[-2,2]]
Explanation: Distance of (1,3) = √10, (-2,2) = √8. Closest is (-2,2).
```

#### Intuition
Use a max-heap of size k to keep track of k smallest distances.

#### Optimal Approach: Max-Heap of Size K
- **Time:** O(n log k)
- **Space:** O(k)

```csharp
public class Solution {
    public int[][] KClosest(int[][] points, int k) {
        // Max-heap: keep k smallest by removing largest when > k
        PriorityQueue<int[], int> maxHeap = new PriorityQueue<int[], int>(
            Comparer<int>.Create((a, b) => b.CompareTo(a))
        );
        
        foreach (int[] point in points) {
            int dist = point[0] * point[0] + point[1] * point[1];  // No need for sqrt
            maxHeap.Enqueue(point, dist);
            
            if (maxHeap.Count > k) {
                maxHeap.Dequeue();  // Remove farthest
            }
        }
        
        int[][] result = new int[k][];
        for (int i = 0; i < k; i++) {
            result[i] = maxHeap.Dequeue();
        }
        
        return result;
    }
}
```

#### Alternative: Min-Heap (Extract K)
- **Time:** O(n + k log n)
- **Space:** O(n)

```csharp
public class Solution {
    public int[][] KClosest(int[][] points, int k) {
        // Min-heap: all points, extract k smallest
        PriorityQueue<int[], int> minHeap = new PriorityQueue<int[], int>();
        
        foreach (int[] point in points) {
            int dist = point[0] * point[0] + point[1] * point[1];
            minHeap.Enqueue(point, dist);
        }
        
        int[][] result = new int[k][];
        for (int i = 0; i < k; i++) {
            result[i] = minHeap.Dequeue();
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Use squared distance to avoid sqrt
- Max-heap of size k is more efficient when n >> k
- Min-heap approach simpler but uses more space

---

### 4. Kth Largest Element in an Array
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/kth-largest-element-in-an-array/) | [NeetCode](https://neetcode.io/problems/kth-largest-element-in-an-array)

#### Problem
Given an array `nums` and integer `k`, return the kth largest element.

**Example:**
```
Input: nums = [3,2,1,5,6,4], k = 2
Output: 5
```

#### Approach 1: Min-Heap of Size K
- **Time:** O(n log k)
- **Space:** O(k)

```csharp
public class Solution {
    public int FindKthLargest(int[] nums, int k) {
        PriorityQueue<int, int> minHeap = new PriorityQueue<int, int>();
        
        foreach (int num in nums) {
            minHeap.Enqueue(num, num);
            
            if (minHeap.Count > k) {
                minHeap.Dequeue();
            }
        }
        
        return minHeap.Peek();
    }
}
```

#### Approach 2: QuickSelect (Average O(n))
- **Time:** O(n) average, O(n²) worst
- **Space:** O(1)

```csharp
public class Solution {
    public int FindKthLargest(int[] nums, int k) {
        int targetIndex = nums.Length - k;  // kth largest = (n-k)th smallest
        return QuickSelect(nums, 0, nums.Length - 1, targetIndex);
    }
    
    private int QuickSelect(int[] nums, int left, int right, int k) {
        if (left == right) return nums[left];
        
        int pivotIndex = Partition(nums, left, right);
        
        if (pivotIndex == k) {
            return nums[pivotIndex];
        } else if (pivotIndex < k) {
            return QuickSelect(nums, pivotIndex + 1, right, k);
        } else {
            return QuickSelect(nums, left, pivotIndex - 1, k);
        }
    }
    
    private int Partition(int[] nums, int left, int right) {
        int pivot = nums[right];
        int i = left;
        
        for (int j = left; j < right; j++) {
            if (nums[j] <= pivot) {
                Swap(nums, i, j);
                i++;
            }
        }
        
        Swap(nums, i, right);
        return i;
    }
    
    private void Swap(int[] nums, int i, int j) {
        int temp = nums[i];
        nums[i] = nums[j];
        nums[j] = temp;
    }
}
```

#### Key Takeaways
- Heap: O(n log k) guaranteed
- QuickSelect: O(n) average but O(n²) worst case
- For interview, heap is safer unless asked for O(n)
- kth largest = (n-k)th smallest in sorted order

---

### 5. Task Scheduler
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/task-scheduler/) | [NeetCode](https://neetcode.io/problems/task-scheduling)

#### Problem
Given tasks and cooling interval n, find minimum intervals to complete all tasks. Same task must have at least n intervals between them. CPU can be idle.

**Example:**
```
Input: tasks = ["A","A","A","B","B","B"], n = 2
Output: 8
Explanation: A -> B -> idle -> A -> B -> idle -> A -> B
```

#### Intuition
Always process the most frequent task first to minimize idle time. Use max-heap for frequencies.

#### Optimal Approach: Max-Heap with Cooldown Queue
- **Time:** O(n × m) where m = number of tasks
- **Space:** O(1) - at most 26 task types

```csharp
public class Solution {
    public int LeastInterval(char[] tasks, int n) {
        // Count frequencies
        int[] freq = new int[26];
        foreach (char task in tasks) {
            freq[task - 'A']++;
        }
        
        // Max-heap of frequencies
        PriorityQueue<int, int> maxHeap = new PriorityQueue<int, int>(
            Comparer<int>.Create((a, b) => b.CompareTo(a))
        );
        
        foreach (int f in freq) {
            if (f > 0) maxHeap.Enqueue(f, f);
        }
        
        // Queue for cooling tasks: (count, available_time)
        Queue<(int count, int availableTime)> cooldown = new Queue<(int, int)>();
        
        int time = 0;
        
        while (maxHeap.Count > 0 || cooldown.Count > 0) {
            time++;
            
            // Process a task
            if (maxHeap.Count > 0) {
                int count = maxHeap.Dequeue() - 1;
                if (count > 0) {
                    cooldown.Enqueue((count, time + n));
                }
            }
            
            // Check if any task finished cooling
            if (cooldown.Count > 0 && cooldown.Peek().availableTime == time) {
                var ready = cooldown.Dequeue();
                maxHeap.Enqueue(ready.count, ready.count);
            }
        }
        
        return time;
    }
}
```

#### Alternative: Math Formula
- **Time:** O(n)
- **Space:** O(1)

```csharp
public class Solution {
    public int LeastInterval(char[] tasks, int n) {
        int[] freq = new int[26];
        foreach (char task in tasks) {
            freq[task - 'A']++;
        }
        
        int maxFreq = freq.Max();
        int maxCount = freq.Count(f => f == maxFreq);
        
        // Formula: (maxFreq - 1) * (n + 1) + maxCount
        // But minimum is tasks.Length (no idle needed)
        int intervals = (maxFreq - 1) * (n + 1) + maxCount;
        
        return Math.Max(intervals, tasks.Length);
    }
}
```

#### Key Takeaways
- Process most frequent tasks first
- Use cooldown queue to track when tasks become available
- Math formula is O(1) but less intuitive
- Idle only when no tasks available

---

### 6. Design Twitter
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/design-twitter/) | [NeetCode](https://neetcode.io/problems/design-twitter-feed)

#### Problem
Design a simplified Twitter with:
- `postTweet(userId, tweetId)` - Post a tweet
- `getNewsFeed(userId)` - Get 10 most recent tweets from user and followees
- `follow(followerId, followeeId)` - Follow a user
- `unfollow(followerId, followeeId)` - Unfollow a user

#### Optimal Approach
HashMap for follows, merge K sorted lists for feed.

- **Time:** O(k log n) for getNewsFeed where k = number of followees
- **Space:** O(users + tweets)

```csharp
public class Twitter {
    private int timestamp = 0;
    private Dictionary<int, List<(int time, int tweetId)>> tweets;
    private Dictionary<int, HashSet<int>> following;
    
    public Twitter() {
        tweets = new Dictionary<int, List<(int, int)>>();
        following = new Dictionary<int, HashSet<int>>();
    }
    
    public void PostTweet(int userId, int tweetId) {
        if (!tweets.ContainsKey(userId)) {
            tweets[userId] = new List<(int, int)>();
        }
        tweets[userId].Add((timestamp++, tweetId));
    }
    
    public IList<int> GetNewsFeed(int userId) {
        // Max-heap: (time, tweetId, userId, index)
        PriorityQueue<(int time, int tweetId, int userId, int index), int> maxHeap = 
            new PriorityQueue<(int, int, int, int), int>(
                Comparer<int>.Create((a, b) => b.CompareTo(a))
            );
        
        // Add user's own tweets
        if (!following.ContainsKey(userId)) {
            following[userId] = new HashSet<int>();
        }
        following[userId].Add(userId);  // Follow self for feed
        
        // Add latest tweet from each followee
        foreach (int followeeId in following[userId]) {
            if (tweets.ContainsKey(followeeId) && tweets[followeeId].Count > 0) {
                var tweetList = tweets[followeeId];
                int idx = tweetList.Count - 1;
                var (time, tweetId) = tweetList[idx];
                maxHeap.Enqueue((time, tweetId, followeeId, idx), time);
            }
        }
        
        List<int> feed = new List<int>();
        
        while (maxHeap.Count > 0 && feed.Count < 10) {
            var (time, tweetId, followeeId, idx) = maxHeap.Dequeue();
            feed.Add(tweetId);
            
            // Add next tweet from same user
            if (idx > 0) {
                idx--;
                var (nextTime, nextTweetId) = tweets[followeeId][idx];
                maxHeap.Enqueue((nextTime, nextTweetId, followeeId, idx), nextTime);
            }
        }
        
        following[userId].Remove(userId);  // Undo self-follow
        
        return feed;
    }
    
    public void Follow(int followerId, int followeeId) {
        if (!following.ContainsKey(followerId)) {
            following[followerId] = new HashSet<int>();
        }
        following[followerId].Add(followeeId);
    }
    
    public void Unfollow(int followerId, int followeeId) {
        if (following.ContainsKey(followerId)) {
            following[followerId].Remove(followeeId);
        }
    }
}
```

#### Key Takeaways
- This is a "merge K sorted lists" problem
- Each user's tweets are sorted by time
- Max-heap merges most recent tweets across all followees
- Store timestamp globally for ordering

---

### 7. Find Median from Data Stream
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/find-median-from-data-stream/) | [NeetCode](https://neetcode.io/problems/find-median-in-a-data-stream)

#### Problem
Design a data structure that supports:
- `addNum(num)` - Add number to stream
- `findMedian()` - Return median of all numbers so far

**Example:**
```
MedianFinder mf = new MedianFinder();
mf.addNum(1);
mf.addNum(2);
mf.findMedian(); // 1.5
mf.addNum(3);
mf.findMedian(); // 2
```

#### Intuition
Use two heaps: max-heap for smaller half, min-heap for larger half. Median is at the tops.

#### Optimal Approach: Two Heaps
- **Time:** O(log n) for add, O(1) for median
- **Space:** O(n)

```csharp
public class MedianFinder {
    // Max-heap for smaller half
    private PriorityQueue<int, int> maxHeap;
    // Min-heap for larger half
    private PriorityQueue<int, int> minHeap;
    
    public MedianFinder() {
        maxHeap = new PriorityQueue<int, int>(
            Comparer<int>.Create((a, b) => b.CompareTo(a))
        );
        minHeap = new PriorityQueue<int, int>();
    }
    
    public void AddNum(int num) {
        // Add to max-heap (smaller half)
        maxHeap.Enqueue(num, num);
        
        // Balance: move max of smaller half to larger half
        int maxOfSmaller = maxHeap.Dequeue();
        minHeap.Enqueue(maxOfSmaller, maxOfSmaller);
        
        // Ensure smaller half has equal or one more element
        if (minHeap.Count > maxHeap.Count) {
            int minOfLarger = minHeap.Dequeue();
            maxHeap.Enqueue(minOfLarger, minOfLarger);
        }
    }
    
    public double FindMedian() {
        if (maxHeap.Count > minHeap.Count) {
            return maxHeap.Peek();
        }
        return (maxHeap.Peek() + minHeap.Peek()) / 2.0;
    }
}
```

#### How It Works
```
Numbers: 1, 2, 3, 4, 5

maxHeap (smaller): [1, 2, 3]  (top = 3)
minHeap (larger):  [4, 5]     (top = 4)

Odd count: median = maxHeap.Peek() = 3
Even count: median = (maxHeap.Peek() + minHeap.Peek()) / 2
```

#### Key Takeaways
- Max-heap stores smaller half, min-heap stores larger half
- Balance heaps so sizes differ by at most 1
- Median is always at one or both tops
- Invariant: max of smaller ≤ min of larger

---

## Summary

### Pattern Recognition for Heap/Priority Queue

| If you see... | Consider... |
|---------------|-------------|
| Top K / Kth largest/smallest | Heap of size K |
| Streaming data | Heap or two heaps |
| Merge K sorted | Min-heap with one from each |
| Running median | Two heaps (max + min) |
| Process by priority | Priority queue |
| Shortest path | Min-heap for Dijkstra |

### Heap Selection Guide

| Problem | Heap Type | Size |
|---------|-----------|------|
| K largest elements | Min-heap | K |
| K smallest elements | Max-heap | K |
| Kth largest | Min-heap | K |
| Kth smallest | Max-heap | K |
| Median | Max-heap + Min-heap | n/2 each |

### C# Priority Queue Quick Reference

```csharp
// Min-heap (default)
PriorityQueue<int, int> minHeap = new PriorityQueue<int, int>();
minHeap.Enqueue(element, priority);  // Lower priority = dequeued first
minHeap.Dequeue();                   // Remove min
minHeap.Peek();                      // View min

// Max-heap (custom comparer)
PriorityQueue<int, int> maxHeap = new PriorityQueue<int, int>(
    Comparer<int>.Create((a, b) => b.CompareTo(a))
);

// Max-heap (negate priority)
minHeap.Enqueue(element, -priority);

// With complex objects
PriorityQueue<ListNode, int> pq = new PriorityQueue<ListNode, int>();
pq.Enqueue(node, node.val);
```
