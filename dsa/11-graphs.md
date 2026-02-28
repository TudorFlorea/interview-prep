# Graphs

[← Back to Index](/dsa/00-index.md)

## Overview

A graph is a data structure consisting of vertices (nodes) and edges (connections between nodes). Graphs can represent networks, relationships, paths, and many real-world problems.

### Graph Representations

```csharp
// Adjacency List (most common, space efficient)
Dictionary<int, List<int>> graph = new Dictionary<int, List<int>>();

// Adjacency Matrix (good for dense graphs)
int[,] graph = new int[n, n];

// Edge List
List<int[]> edges = new List<int[]>();  // [[from, to], ...]
```

### Graph Traversal Templates

```csharp
// DFS - Recursive
void DFS(int node, HashSet<int> visited) {
    visited.Add(node);
    foreach (int neighbor in graph[node]) {
        if (!visited.Contains(neighbor)) {
            DFS(neighbor, visited);
        }
    }
}

// BFS - Iterative
void BFS(int start) {
    Queue<int> queue = new Queue<int>();
    HashSet<int> visited = new HashSet<int>();
    queue.Enqueue(start);
    visited.Add(start);
    
    while (queue.Count > 0) {
        int node = queue.Dequeue();
        foreach (int neighbor in graph[node]) {
            if (!visited.Contains(neighbor)) {
                visited.Add(neighbor);
                queue.Enqueue(neighbor);
            }
        }
    }
}
```

### When to Use DFS vs BFS

| Use DFS when... | Use BFS when... |
|-----------------|-----------------|
| Exploring all paths | Finding shortest path (unweighted) |
| Detecting cycles | Level-order traversal |
| Topological sort | Minimum steps/moves |
| Backtracking | "Spreading" problems (rot, infection) |

---

## Problems

### 1. Number of Islands
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/number-of-islands/) | [NeetCode](https://neetcode.io/problems/count-number-of-islands)

#### Problem
Given a 2D grid of '1's (land) and '0's (water), count the number of islands. An island is surrounded by water and formed by connecting adjacent lands horizontally or vertically.

**Example:**
```
Input: grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
Output: 3
```

#### Optimal Approach: DFS
- **Time:** O(m × n)
- **Space:** O(m × n) worst case for recursion

```csharp
public class Solution {
    public int NumIslands(char[][] grid) {
        int islands = 0;
        int rows = grid.Length;
        int cols = grid[0].Length;
        
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == '1') {
                    islands++;
                    DFS(grid, r, c);
                }
            }
        }
        
        return islands;
    }
    
    private void DFS(char[][] grid, int r, int c) {
        if (r < 0 || r >= grid.Length || 
            c < 0 || c >= grid[0].Length || 
            grid[r][c] != '1') {
            return;
        }
        
        grid[r][c] = '0';  // Mark as visited
        
        DFS(grid, r + 1, c);
        DFS(grid, r - 1, c);
        DFS(grid, r, c + 1);
        DFS(grid, r, c - 1);
    }
}
```

#### BFS Approach
```csharp
public class Solution {
    public int NumIslands(char[][] grid) {
        int islands = 0;
        int rows = grid.Length;
        int cols = grid[0].Length;
        
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] == '1') {
                    islands++;
                    BFS(grid, r, c);
                }
            }
        }
        
        return islands;
    }
    
    private void BFS(char[][] grid, int r, int c) {
        Queue<(int, int)> queue = new Queue<(int, int)>();
        queue.Enqueue((r, c));
        grid[r][c] = '0';
        
        int[] dr = {0, 0, 1, -1};
        int[] dc = {1, -1, 0, 0};
        
        while (queue.Count > 0) {
            var (row, col) = queue.Dequeue();
            
            for (int d = 0; d < 4; d++) {
                int nr = row + dr[d];
                int nc = col + dc[d];
                
                if (nr >= 0 && nr < grid.Length && 
                    nc >= 0 && nc < grid[0].Length && 
                    grid[nr][nc] == '1') {
                    grid[nr][nc] = '0';
                    queue.Enqueue((nr, nc));
                }
            }
        }
    }
}
```

#### Key Takeaways
- Classic graph traversal on 2D grid
- Each cell is a node, adjacent cells are neighbors
- Sink/mark visited cells to avoid revisiting
- Count number of DFS/BFS calls started

---

### 2. Clone Graph
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/clone-graph/) | [NeetCode](https://neetcode.io/problems/clone-graph)

#### Problem
Given a reference of a node in a connected undirected graph, return a deep copy.

#### Optimal Approach: DFS with HashMap
- **Time:** O(V + E)
- **Space:** O(V)

```csharp
public class Solution {
    private Dictionary<Node, Node> visited = new Dictionary<Node, Node>();
    
    public Node CloneGraph(Node node) {
        if (node == null) return null;
        
        if (visited.ContainsKey(node)) {
            return visited[node];
        }
        
        Node clone = new Node(node.val);
        visited[node] = clone;
        
        foreach (Node neighbor in node.neighbors) {
            clone.neighbors.Add(CloneGraph(neighbor));
        }
        
        return clone;
    }
}
```

#### Key Takeaways
- HashMap maps original → clone
- Visit each node once, clone and connect
- Handle cycles via visited map

---

### 3. Max Area of Island
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/max-area-of-island/) | [NeetCode](https://neetcode.io/problems/max-area-of-island)

#### Problem
Return the maximum area of an island in the grid.

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(m × n)

```csharp
public class Solution {
    public int MaxAreaOfIsland(int[][] grid) {
        int maxArea = 0;
        
        for (int r = 0; r < grid.Length; r++) {
            for (int c = 0; c < grid[0].Length; c++) {
                if (grid[r][c] == 1) {
                    maxArea = Math.Max(maxArea, DFS(grid, r, c));
                }
            }
        }
        
        return maxArea;
    }
    
    private int DFS(int[][] grid, int r, int c) {
        if (r < 0 || r >= grid.Length || 
            c < 0 || c >= grid[0].Length || 
            grid[r][c] != 1) {
            return 0;
        }
        
        grid[r][c] = 0;  // Mark visited
        
        return 1 + DFS(grid, r + 1, c) + DFS(grid, r - 1, c) + 
                   DFS(grid, r, c + 1) + DFS(grid, r, c - 1);
    }
}
```

---

### 4. Pacific Atlantic Water Flow
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/pacific-atlantic-water-flow/) | [NeetCode](https://neetcode.io/problems/pacific-atlantic-water-flow)

#### Problem
Find cells from which water can flow to both Pacific (top/left edges) and Atlantic (bottom/right edges) oceans.

#### Intuition
Reverse thinking: start from ocean edges and flow uphill to find reachable cells.

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(m × n)

```csharp
public class Solution {
    private int rows, cols;
    private int[][] heights;
    
    public IList<IList<int>> PacificAtlantic(int[][] heights) {
        this.heights = heights;
        rows = heights.Length;
        cols = heights[0].Length;
        
        bool[,] pacific = new bool[rows, cols];
        bool[,] atlantic = new bool[rows, cols];
        
        // DFS from Pacific edges (top row, left column)
        for (int c = 0; c < cols; c++) DFS(0, c, pacific, int.MinValue);
        for (int r = 0; r < rows; r++) DFS(r, 0, pacific, int.MinValue);
        
        // DFS from Atlantic edges (bottom row, right column)
        for (int c = 0; c < cols; c++) DFS(rows - 1, c, atlantic, int.MinValue);
        for (int r = 0; r < rows; r++) DFS(r, cols - 1, atlantic, int.MinValue);
        
        // Find cells reachable by both
        List<IList<int>> result = new List<IList<int>>();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (pacific[r, c] && atlantic[r, c]) {
                    result.Add(new List<int> { r, c });
                }
            }
        }
        
        return result;
    }
    
    private void DFS(int r, int c, bool[,] visited, int prevHeight) {
        if (r < 0 || r >= rows || c < 0 || c >= cols || 
            visited[r, c] || heights[r][c] < prevHeight) {
            return;
        }
        
        visited[r, c] = true;
        
        DFS(r + 1, c, visited, heights[r][c]);
        DFS(r - 1, c, visited, heights[r][c]);
        DFS(r, c + 1, visited, heights[r][c]);
        DFS(r, c - 1, visited, heights[r][c]);
    }
}
```

#### Key Takeaways
- Reverse: flow from ocean upward
- Two separate DFS, find intersection
- Water flows uphill in reverse = height >= prevHeight

---

### 5. Surrounded Regions
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/surrounded-regions/) | [NeetCode](https://neetcode.io/problems/surrounded-regions)

#### Problem
Capture all regions surrounded by 'X'. A region is captured by flipping all 'O's to 'X's. Border-connected 'O's are not surrounded.

#### Optimal Approach
- **Time:** O(m × n)
- **Space:** O(m × n)

```csharp
public class Solution {
    public void Solve(char[][] board) {
        int rows = board.Length;
        int cols = board[0].Length;
        
        // Mark border-connected 'O's as safe (temporarily 'S')
        for (int r = 0; r < rows; r++) {
            if (board[r][0] == 'O') DFS(board, r, 0);
            if (board[r][cols - 1] == 'O') DFS(board, r, cols - 1);
        }
        for (int c = 0; c < cols; c++) {
            if (board[0][c] == 'O') DFS(board, 0, c);
            if (board[rows - 1][c] == 'O') DFS(board, rows - 1, c);
        }
        
        // Capture surrounded 'O's and restore safe ones
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (board[r][c] == 'O') board[r][c] = 'X';       // Capture
                else if (board[r][c] == 'S') board[r][c] = 'O';  // Restore
            }
        }
    }
    
    private void DFS(char[][] board, int r, int c) {
        if (r < 0 || r >= board.Length || 
            c < 0 || c >= board[0].Length || 
            board[r][c] != 'O') {
            return;
        }
        
        board[r][c] = 'S';  // Safe
        
        DFS(board, r + 1, c);
        DFS(board, r - 1, c);
        DFS(board, r, c + 1);
        DFS(board, r, c - 1);
    }
}
```

#### Key Takeaways
- Start from borders, mark safe regions
- Everything else gets captured
- Three-state: 'O', 'X', 'S' (safe temporary marker)

---

### 6. Rotting Oranges
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/rotting-oranges/) | [NeetCode](https://neetcode.io/problems/rotting-oranges)

#### Problem
Return minimum minutes until no fresh oranges remain. Each minute, fresh oranges adjacent to rotten ones become rotten.

**Example:**
```
Input: grid = [[2,1,1],[1,1,0],[0,1,1]]
Output: 4
```

#### Intuition
Multi-source BFS from all rotten oranges simultaneously.

#### Optimal Approach: BFS
- **Time:** O(m × n)
- **Space:** O(m × n)

```csharp
public class Solution {
    public int OrangesRotting(int[][] grid) {
        Queue<(int, int)> queue = new Queue<(int, int)>();
        int fresh = 0;
        
        // Find all rotten oranges and count fresh
        for (int r = 0; r < grid.Length; r++) {
            for (int c = 0; c < grid[0].Length; c++) {
                if (grid[r][c] == 2) queue.Enqueue((r, c));
                else if (grid[r][c] == 1) fresh++;
            }
        }
        
        if (fresh == 0) return 0;
        
        int minutes = 0;
        int[] dr = {0, 0, 1, -1};
        int[] dc = {1, -1, 0, 0};
        
        while (queue.Count > 0 && fresh > 0) {
            minutes++;
            int size = queue.Count;
            
            for (int i = 0; i < size; i++) {
                var (row, col) = queue.Dequeue();
                
                for (int d = 0; d < 4; d++) {
                    int nr = row + dr[d];
                    int nc = col + dc[d];
                    
                    if (nr >= 0 && nr < grid.Length && 
                        nc >= 0 && nc < grid[0].Length && 
                        grid[nr][nc] == 1) {
                        grid[nr][nc] = 2;
                        fresh--;
                        queue.Enqueue((nr, nc));
                    }
                }
            }
        }
        
        return fresh == 0 ? minutes : -1;
    }
}
```

#### Key Takeaways
- Multi-source BFS: all rotten oranges spread simultaneously
- Track fresh count to detect impossibility
- Process level by level to track time

---

### 7. Walls and Gates
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/walls-and-gates/) | [NeetCode](https://neetcode.io/problems/islands-and-treasure)

#### Problem
Fill each empty room with distance to nearest gate. Gates = 0, walls = -1, empty = INF.

#### Optimal Approach: Multi-source BFS
- **Time:** O(m × n)
- **Space:** O(m × n)

```csharp
public class Solution {
    public void WallsAndGates(int[][] rooms) {
        int INF = int.MaxValue;
        Queue<(int, int)> queue = new Queue<(int, int)>();
        
        // Find all gates
        for (int r = 0; r < rooms.Length; r++) {
            for (int c = 0; c < rooms[0].Length; c++) {
                if (rooms[r][c] == 0) {
                    queue.Enqueue((r, c));
                }
            }
        }
        
        int[] dr = {0, 0, 1, -1};
        int[] dc = {1, -1, 0, 0};
        
        while (queue.Count > 0) {
            var (row, col) = queue.Dequeue();
            
            for (int d = 0; d < 4; d++) {
                int nr = row + dr[d];
                int nc = col + dc[d];
                
                if (nr >= 0 && nr < rooms.Length && 
                    nc >= 0 && nc < rooms[0].Length && 
                    rooms[nr][nc] == INF) {
                    rooms[nr][nc] = rooms[row][col] + 1;
                    queue.Enqueue((nr, nc));
                }
            }
        }
    }
}
```

---

### 8. Course Schedule
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/course-schedule/) | [NeetCode](https://neetcode.io/problems/course-schedule)

#### Problem
Given n courses and prerequisites, determine if all courses can be finished.

**Example:**
```
Input: numCourses = 2, prerequisites = [[1,0]]
Output: true  (Take course 0 then 1)

Input: numCourses = 2, prerequisites = [[1,0],[0,1]]
Output: false  (Cycle)
```

#### Intuition
Detect cycle in directed graph using DFS or topological sort.

#### Approach 1: DFS Cycle Detection
- **Time:** O(V + E)
- **Space:** O(V + E)

```csharp
public class Solution {
    public bool CanFinish(int numCourses, int[][] prerequisites) {
        // Build adjacency list
        Dictionary<int, List<int>> graph = new Dictionary<int, List<int>>();
        for (int i = 0; i < numCourses; i++) {
            graph[i] = new List<int>();
        }
        foreach (var prereq in prerequisites) {
            graph[prereq[0]].Add(prereq[1]);
        }
        
        // 0 = unvisited, 1 = visiting (in current path), 2 = visited
        int[] state = new int[numCourses];
        
        for (int course = 0; course < numCourses; course++) {
            if (!DFS(graph, course, state)) {
                return false;
            }
        }
        
        return true;
    }
    
    private bool DFS(Dictionary<int, List<int>> graph, int course, int[] state) {
        if (state[course] == 1) return false;  // Cycle detected
        if (state[course] == 2) return true;   // Already processed
        
        state[course] = 1;  // Mark as visiting
        
        foreach (int prereq in graph[course]) {
            if (!DFS(graph, prereq, state)) {
                return false;
            }
        }
        
        state[course] = 2;  // Mark as visited
        return true;
    }
}
```

#### Approach 2: Kahn's Algorithm (BFS Topological Sort)
- **Time:** O(V + E)
- **Space:** O(V + E)

```csharp
public class Solution {
    public bool CanFinish(int numCourses, int[][] prerequisites) {
        int[] inDegree = new int[numCourses];
        Dictionary<int, List<int>> graph = new Dictionary<int, List<int>>();
        
        for (int i = 0; i < numCourses; i++) {
            graph[i] = new List<int>();
        }
        
        foreach (var prereq in prerequisites) {
            graph[prereq[1]].Add(prereq[0]);
            inDegree[prereq[0]]++;
        }
        
        Queue<int> queue = new Queue<int>();
        for (int i = 0; i < numCourses; i++) {
            if (inDegree[i] == 0) queue.Enqueue(i);
        }
        
        int count = 0;
        while (queue.Count > 0) {
            int course = queue.Dequeue();
            count++;
            
            foreach (int next in graph[course]) {
                inDegree[next]--;
                if (inDegree[next] == 0) {
                    queue.Enqueue(next);
                }
            }
        }
        
        return count == numCourses;
    }
}
```

#### Key Takeaways
- Cycle detection in directed graph
- DFS: three states (unvisited, visiting, visited)
- Kahn's: process nodes with 0 in-degree

---

### 9. Course Schedule II
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/course-schedule-ii/) | [NeetCode](https://neetcode.io/problems/course-schedule-ii)

#### Problem
Return the ordering of courses to finish all courses. Return empty array if impossible.

#### Optimal Approach: Topological Sort
- **Time:** O(V + E)
- **Space:** O(V + E)

```csharp
public class Solution {
    public int[] FindOrder(int numCourses, int[][] prerequisites) {
        int[] inDegree = new int[numCourses];
        Dictionary<int, List<int>> graph = new Dictionary<int, List<int>>();
        
        for (int i = 0; i < numCourses; i++) {
            graph[i] = new List<int>();
        }
        
        foreach (var prereq in prerequisites) {
            graph[prereq[1]].Add(prereq[0]);
            inDegree[prereq[0]]++;
        }
        
        Queue<int> queue = new Queue<int>();
        for (int i = 0; i < numCourses; i++) {
            if (inDegree[i] == 0) queue.Enqueue(i);
        }
        
        List<int> order = new List<int>();
        while (queue.Count > 0) {
            int course = queue.Dequeue();
            order.Add(course);
            
            foreach (int next in graph[course]) {
                inDegree[next]--;
                if (inDegree[next] == 0) {
                    queue.Enqueue(next);
                }
            }
        }
        
        return order.Count == numCourses ? order.ToArray() : new int[0];
    }
}
```

---

### 10. Redundant Connection
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/redundant-connection/) | [NeetCode](https://neetcode.io/problems/redundant-connection)

#### Problem
Given edges that form a tree plus one extra edge creating a cycle, find the extra edge.

#### Optimal Approach: Union-Find
- **Time:** O(n × α(n)) ≈ O(n)
- **Space:** O(n)

```csharp
public class Solution {
    private int[] parent;
    private int[] rank;
    
    public int[] FindRedundantConnection(int[][] edges) {
        int n = edges.Length;
        parent = new int[n + 1];
        rank = new int[n + 1];
        
        for (int i = 0; i <= n; i++) {
            parent[i] = i;
            rank[i] = 1;
        }
        
        foreach (var edge in edges) {
            if (!Union(edge[0], edge[1])) {
                return edge;
            }
        }
        
        return new int[0];
    }
    
    private int Find(int x) {
        if (parent[x] != x) {
            parent[x] = Find(parent[x]);  // Path compression
        }
        return parent[x];
    }
    
    private bool Union(int x, int y) {
        int px = Find(x);
        int py = Find(y);
        
        if (px == py) return false;  // Cycle detected
        
        // Union by rank
        if (rank[px] > rank[py]) {
            parent[py] = px;
        } else if (rank[px] < rank[py]) {
            parent[px] = py;
        } else {
            parent[py] = px;
            rank[px]++;
        }
        
        return true;
    }
}
```

#### Key Takeaways
- Union-Find: detect if edge creates cycle
- Path compression + union by rank for optimization
- First edge that fails to union is the answer

---

### 11. Number of Connected Components
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/) | [NeetCode](https://neetcode.io/problems/count-connected-components)

#### Problem
Given n nodes and edges, count connected components.

#### Approach 1: Union-Find
- **Time:** O(E × α(n))
- **Space:** O(n)

```csharp
public class Solution {
    private int[] parent;
    
    public int CountComponents(int n, int[][] edges) {
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        
        int components = n;
        
        foreach (var edge in edges) {
            if (Union(edge[0], edge[1])) {
                components--;
            }
        }
        
        return components;
    }
    
    private int Find(int x) {
        if (parent[x] != x) {
            parent[x] = Find(parent[x]);
        }
        return parent[x];
    }
    
    private bool Union(int x, int y) {
        int px = Find(x);
        int py = Find(y);
        
        if (px == py) return false;
        
        parent[px] = py;
        return true;
    }
}
```

#### Approach 2: DFS
```csharp
public class Solution {
    public int CountComponents(int n, int[][] edges) {
        Dictionary<int, List<int>> graph = new Dictionary<int, List<int>>();
        for (int i = 0; i < n; i++) graph[i] = new List<int>();
        
        foreach (var edge in edges) {
            graph[edge[0]].Add(edge[1]);
            graph[edge[1]].Add(edge[0]);
        }
        
        bool[] visited = new bool[n];
        int components = 0;
        
        for (int i = 0; i < n; i++) {
            if (!visited[i]) {
                DFS(graph, i, visited);
                components++;
            }
        }
        
        return components;
    }
    
    private void DFS(Dictionary<int, List<int>> graph, int node, bool[] visited) {
        visited[node] = true;
        foreach (int neighbor in graph[node]) {
            if (!visited[neighbor]) {
                DFS(graph, neighbor, visited);
            }
        }
    }
}
```

---

### 12. Graph Valid Tree
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/graph-valid-tree/) | [NeetCode](https://neetcode.io/problems/valid-tree)

#### Problem
Given n nodes and edges, determine if the graph is a valid tree (connected, no cycles).

#### Optimal Approach: Union-Find
- **Time:** O(E × α(n))
- **Space:** O(n)

```csharp
public class Solution {
    private int[] parent;
    
    public bool ValidTree(int n, int[][] edges) {
        // Tree has exactly n-1 edges
        if (edges.Length != n - 1) return false;
        
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        
        foreach (var edge in edges) {
            if (!Union(edge[0], edge[1])) {
                return false;  // Cycle detected
            }
        }
        
        return true;  // n-1 edges, no cycle = tree
    }
    
    private int Find(int x) {
        if (parent[x] != x) {
            parent[x] = Find(parent[x]);
        }
        return parent[x];
    }
    
    private bool Union(int x, int y) {
        int px = Find(x);
        int py = Find(y);
        
        if (px == py) return false;
        
        parent[px] = py;
        return true;
    }
}
```

#### Key Takeaways
- Valid tree: n nodes, n-1 edges, no cycles, connected
- Check edge count first, then check for cycles

---

### 13. Word Ladder
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/word-ladder/) | [NeetCode](https://neetcode.io/problems/word-ladder)

#### Problem
Transform from beginWord to endWord, changing one letter at a time. Each intermediate word must be in wordList. Return shortest transformation length.

**Example:**
```
Input: beginWord = "hit", endWord = "cog", 
       wordList = ["hot","dot","dog","lot","log","cog"]
Output: 5 ("hit" -> "hot" -> "dot" -> "dog" -> "cog")
```

#### Optimal Approach: BFS
- **Time:** O(M² × N) where M = word length, N = word count
- **Space:** O(M × N)

```csharp
public class Solution {
    public int LadderLength(string beginWord, string endWord, IList<string> wordList) {
        HashSet<string> wordSet = new HashSet<string>(wordList);
        if (!wordSet.Contains(endWord)) return 0;
        
        Queue<string> queue = new Queue<string>();
        queue.Enqueue(beginWord);
        
        HashSet<string> visited = new HashSet<string>();
        visited.Add(beginWord);
        
        int length = 1;
        
        while (queue.Count > 0) {
            int size = queue.Count;
            
            for (int i = 0; i < size; i++) {
                string word = queue.Dequeue();
                
                if (word == endWord) return length;
                
                char[] chars = word.ToCharArray();
                for (int j = 0; j < chars.Length; j++) {
                    char originalChar = chars[j];
                    
                    for (char c = 'a'; c <= 'z'; c++) {
                        if (c == originalChar) continue;
                        
                        chars[j] = c;
                        string newWord = new string(chars);
                        
                        if (wordSet.Contains(newWord) && !visited.Contains(newWord)) {
                            visited.Add(newWord);
                            queue.Enqueue(newWord);
                        }
                    }
                    
                    chars[j] = originalChar;
                }
            }
            
            length++;
        }
        
        return 0;
    }
}
```

#### Alternative: Bidirectional BFS
Start from both ends, meet in middle for ~50% reduction.

#### Key Takeaways
- BFS for shortest path in unweighted graph
- Each word is a node, connected if differ by 1 letter
- Generate all possible next words vs checking all pairs

---

## Summary

### Graph Problem Patterns

| If you see... | Consider... |
|---------------|-------------|
| "Number of" regions/components | DFS/BFS counting |
| Shortest path (unweighted) | BFS |
| Detect cycle | DFS with states or Union-Find |
| Topological ordering | Kahn's algorithm or DFS |
| "Spreading" (rot, infection) | Multi-source BFS |
| Find connected components | Union-Find or DFS |

### Union-Find Template
```csharp
class UnionFind {
    private int[] parent, rank;
    
    public UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    
    public int Find(int x) {
        if (parent[x] != x) parent[x] = Find(parent[x]);
        return parent[x];
    }
    
    public bool Union(int x, int y) {
        int px = Find(x), py = Find(y);
        if (px == py) return false;
        if (rank[px] < rank[py]) { int t = px; px = py; py = t; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        return true;
    }
}
```

### Grid Navigation
```csharp
int[] dr = {0, 0, 1, -1};  // right, left, down, up
int[] dc = {1, -1, 0, 0};

// 8 directions (include diagonals)
int[] dr = {0, 0, 1, 1, 1, -1, -1, -1};
int[] dc = {1, -1, 0, 1, -1, 0, 1, -1};
```
