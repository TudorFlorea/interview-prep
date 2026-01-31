# NeetCode 150 - Complete C# Study Guide

> A comprehensive study guide for the NeetCode 150 challenge with C# solutions, pattern explanations, and progress tracking.

## 📊 Progress Dashboard

| Category | Progress | Easy | Medium | Hard |
|----------|----------|------|--------|------|
| [Arrays & Hashing](01-arrays-and-hashing.md) | 0/9 | 4🟢 | 4🟡 | 1🔴 |
| [Two Pointers](02-two-pointers.md) | 0/5 | 1🟢 | 3🟡 | 1🔴 |
| [Sliding Window](03-sliding-window.md) | 0/6 | 1🟢 | 3🟡 | 2🔴 |
| [Stack](04-stack.md) | 0/7 | 1🟢 | 5🟡 | 1🔴 |
| [Binary Search](05-binary-search.md) | 0/7 | 1🟢 | 5🟡 | 1🔴 |
| [Linked List](06-linked-list.md) | 0/11 | 3🟢 | 6🟡 | 2🔴 |
| [Trees](07-trees.md) | 0/15 | 6🟢 | 7🟡 | 2🔴 |
| [Tries](08-tries.md) | 0/3 | 0🟢 | 2🟡 | 1🔴 |
| [Heap / Priority Queue](09-heap-priority-queue.md) | 0/7 | 2🟢 | 4🟡 | 1🔴 |
| [Backtracking](10-backtracking.md) | 0/9 | 0🟢 | 7🟡 | 2🔴 |
| [Graphs](11-graphs.md) | 0/13 | 0🟢 | 12🟡 | 1🔴 |
| [Advanced Graphs](12-advanced-graphs.md) | 0/6 | 0🟢 | 4🟡 | 2🔴 |
| [1-D Dynamic Programming](13-1d-dynamic-programming.md) | 0/12 | 2🟢 | 9🟡 | 1🔴 |
| [2-D Dynamic Programming](14-2d-dynamic-programming.md) | 0/11 | 0🟢 | 8🟡 | 3🔴 |
| [Greedy](15-greedy.md) | 0/8 | 1🟢 | 6🟡 | 1🔴 |
| [Intervals](16-intervals.md) | 0/6 | 1🟢 | 4🟡 | 1🔴 |
| [Math & Geometry](17-math-and-geometry.md) | 0/8 | 2🟢 | 5🟡 | 1🔴 |
| [Bit Manipulation](18-bit-manipulation.md) | 0/7 | 5🟢 | 1🟡 | 1🔴 |
| **TOTAL** | **0/150** | **30🟢** | **95🟡** | **25🔴** |

---

## 🗺️ Study Roadmap

### Phase 1: Foundations (Weeks 1-2)
Build core problem-solving patterns with fundamental data structures.

1. **[Arrays & Hashing](01-arrays-and-hashing.md)** - HashMap/HashSet operations, frequency counting
2. **[Two Pointers](02-two-pointers.md)** - Opposite ends, same direction traversal
3. **[Sliding Window](03-sliding-window.md)** - Variable/fixed window, optimization

### Phase 2: Core Data Structures (Weeks 3-4)
Master essential data structure manipulations.

4. **[Stack](04-stack.md)** - LIFO operations, monotonic stacks
5. **[Binary Search](05-binary-search.md)** - Search space reduction, boundary finding
6. **[Linked List](06-linked-list.md)** - Pointer manipulation, fast/slow patterns

### Phase 3: Tree Structures (Weeks 5-6)
Tree traversal and hierarchical data.

7. **[Trees](07-trees.md)** - BFS, DFS, BST properties
8. **[Tries](08-tries.md)** - Prefix trees, word search
9. **[Heap / Priority Queue](09-heap-priority-queue.md)** - Top K, streaming median

### Phase 4: Graph Algorithms (Weeks 7-8)
Graph traversal and pathfinding.

10. **[Backtracking](10-backtracking.md)** - Permutations, combinations, pruning
11. **[Graphs](11-graphs.md)** - BFS, DFS, connected components
12. **[Advanced Graphs](12-advanced-graphs.md)** - Dijkstra, Union-Find, topological sort

### Phase 5: Dynamic Programming (Weeks 9-10)
Optimization through memoization.

13. **[1-D Dynamic Programming](13-1d-dynamic-programming.md)** - Linear DP, state transitions
14. **[2-D Dynamic Programming](14-2d-dynamic-programming.md)** - Grid DP, string matching

### Phase 6: Specialized Topics (Weeks 11-12)
Rounding out the preparation.

15. **[Greedy](15-greedy.md)** - Local optimal choices
16. **[Intervals](16-intervals.md)** - Overlap detection, merging
17. **[Math & Geometry](17-math-and-geometry.md)** - Matrix operations, number theory
18. **[Bit Manipulation](18-bit-manipulation.md)** - Binary operations, XOR tricks

---

## 🎯 How to Use This Guide

### For Each Problem:
1. **Read the problem statement** - Understand inputs, outputs, constraints
2. **Try solving independently** (15-30 min) - Don't look at solutions immediately
3. **Study the intuition** - Understand WHY the approach works
4. **Review brute force** - Know the naive solution first
5. **Master the optimal** - Understand the optimization
6. **Code it yourself** - Don't copy-paste; type it out
7. **Mark as complete** - Check the box when you can solve it independently

### Pattern Recognition Tips:
- **"Subarray/Substring"** → Sliding Window
- **"Sorted array"** → Binary Search or Two Pointers
- **"All permutations/combinations"** → Backtracking
- **"Shortest path"** → BFS (unweighted) or Dijkstra (weighted)
- **"Overlapping subproblems"** → Dynamic Programming
- **"Connected components"** → Union-Find or DFS
- **"Top K elements"** → Heap

---

## 📚 Resources

### Official Links
- [NeetCode.io](https://neetcode.io/) - Video explanations and roadmap
- [NeetCode 150 List](https://neetcode.io/practice) - Interactive problem list
- [LeetCode](https://leetcode.com/) - Practice platform

### C# Specific
- [C# Language Reference](https://docs.microsoft.com/en-us/dotnet/csharp/)
- [.NET Collections](https://docs.microsoft.com/en-us/dotnet/standard/collections/)

### Complexity Cheat Sheet
| Operation | Array | List | HashSet | Dictionary | SortedSet |
|-----------|-------|------|---------|------------|-----------|
| Access | O(1) | O(1) | - | O(1) | O(log n) |
| Search | O(n) | O(n) | O(1) | O(1) | O(log n) |
| Insert | O(n) | O(1)* | O(1) | O(1) | O(log n) |
| Delete | O(n) | O(n) | O(1) | O(1) | O(log n) |

*Amortized for Add at end

---

## 🏁 Quick Start

1. Begin with [Arrays & Hashing](01-arrays-and-hashing.md)
2. Complete at least 2-3 problems per day
3. Review completed problems weekly
4. Track your progress by checking boxes
5. Revisit hard problems after 1 week

**Good luck with your interview preparation!** 🚀
