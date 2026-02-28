# Advanced Graphs

[← Back to Index](/dsa/00-index.md)

## Overview

Advanced graph problems involve weighted edges, complex traversals, and algorithms like Dijkstra's, Bellman-Ford, Prim's, and Kruskal's for shortest paths and minimum spanning trees.

### Key Algorithms

| Algorithm | Purpose | Graph Type | Time Complexity |
|-----------|---------|------------|-----------------|
| Dijkstra | Shortest path | Weighted (non-negative) | O((V+E) log V) |
| Bellman-Ford | Shortest path | Weighted (any) | O(V × E) |
| Floyd-Warshall | All-pairs shortest | Weighted | O(V³) |
| Prim's | MST | Weighted, undirected | O((V+E) log V) |
| Kruskal's | MST | Weighted, undirected | O(E log E) |

### Dijkstra's Template
```csharp
int[] Dijkstra(int start, Dictionary<int, List<(int node, int weight)>> graph, int n) {
    int[] dist = Enumerable.Repeat(int.MaxValue, n).ToArray();
    dist[start] = 0;
    
    PriorityQueue<int, int> pq = new PriorityQueue<int, int>();
    pq.Enqueue(start, 0);
    
    while (pq.Count > 0) {
        int node = pq.Dequeue();
        
        foreach (var (neighbor, weight) in graph[node]) {
            int newDist = dist[node] + weight;
            if (newDist < dist[neighbor]) {
                dist[neighbor] = newDist;
                pq.Enqueue(neighbor, newDist);
            }
        }
    }
    
    return dist;
}
```

---

## Problems

### 1. Reconstruct Itinerary
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/reconstruct-itinerary/) | [NeetCode](https://neetcode.io/problems/reconstruct-flight-path)

#### Problem
Given a list of airline tickets [from, to], reconstruct the itinerary starting from "JFK". Use all tickets exactly once. If multiple valid itineraries, return lexicographically smallest.

**Example:**
```
Input: tickets = [["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]
Output: ["JFK","MUC","LHR","SFO","SJC"]
```

#### Intuition
Hierholzer's algorithm for Eulerian path. Use each edge exactly once.

#### Optimal Approach
- **Time:** O(E log E)
- **Space:** O(E)

```csharp
public class Solution {
    public IList<string> FindItinerary(IList<IList<string>> tickets) {
        // Build adjacency list with sorted destinations (for lex order)
        Dictionary<string, LinkedList<string>> graph = new Dictionary<string, LinkedList<string>>();
        
        // Sort tickets by destination
        var sortedTickets = tickets.OrderBy(t => t[1]).ToList();
        
        foreach (var ticket in sortedTickets) {
            if (!graph.ContainsKey(ticket[0])) {
                graph[ticket[0]] = new LinkedList<string>();
            }
            graph[ticket[0]].AddLast(ticket[1]);
        }
        
        LinkedList<string> result = new LinkedList<string>();
        DFS("JFK", graph, result);
        
        return result.ToList();
    }
    
    private void DFS(string airport, Dictionary<string, LinkedList<string>> graph, LinkedList<string> result) {
        if (graph.ContainsKey(airport)) {
            while (graph[airport].Count > 0) {
                string next = graph[airport].First.Value;
                graph[airport].RemoveFirst();
                DFS(next, graph, result);
            }
        }
        
        result.AddFirst(airport);  // Post-order: add after visiting all edges
    }
}
```

#### Key Takeaways
- Hierholzer's: DFS, add node to result after all edges used
- Sort destinations for lexicographic order
- Remove edges as we use them

---

### 2. Min Cost to Connect All Points
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/min-cost-to-connect-all-points/) | [NeetCode](https://neetcode.io/problems/min-cost-to-connect-points)

#### Problem
Connect all points with minimum cost. Cost between points is Manhattan distance: |x1 - x2| + |y1 - y2|.

**Example:**
```
Input: points = [[0,0],[2,2],[3,10],[5,2],[7,0]]
Output: 20
```

#### Intuition
Minimum Spanning Tree (MST) problem. Use Prim's or Kruskal's algorithm.

#### Approach 1: Prim's Algorithm
- **Time:** O(n² log n)
- **Space:** O(n²)

```csharp
public class Solution {
    public int MinCostConnectPoints(int[][] points) {
        int n = points.Length;
        bool[] visited = new bool[n];
        
        // Min-heap: (cost, pointIndex)
        PriorityQueue<(int cost, int point), int> pq = new PriorityQueue<(int, int), int>();
        pq.Enqueue((0, 0), 0);  // Start from point 0
        
        int totalCost = 0;
        int edgesUsed = 0;
        
        while (edgesUsed < n) {
            var (cost, point) = pq.Dequeue();
            
            if (visited[point]) continue;
            
            visited[point] = true;
            totalCost += cost;
            edgesUsed++;
            
            // Add edges to unvisited points
            for (int next = 0; next < n; next++) {
                if (!visited[next]) {
                    int dist = Math.Abs(points[point][0] - points[next][0]) + 
                               Math.Abs(points[point][1] - points[next][1]);
                    pq.Enqueue((dist, next), dist);
                }
            }
        }
        
        return totalCost;
    }
}
```

#### Approach 2: Kruskal's Algorithm
- **Time:** O(n² log n)
- **Space:** O(n²)

```csharp
public class Solution {
    private int[] parent;
    
    public int MinCostConnectPoints(int[][] points) {
        int n = points.Length;
        List<(int cost, int u, int v)> edges = new List<(int, int, int)>();
        
        // Build all edges
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                int cost = Math.Abs(points[i][0] - points[j][0]) + 
                           Math.Abs(points[i][1] - points[j][1]);
                edges.Add((cost, i, j));
            }
        }
        
        // Sort by cost
        edges.Sort((a, b) => a.cost.CompareTo(b.cost));
        
        // Union-Find
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        
        int totalCost = 0;
        int edgesUsed = 0;
        
        foreach (var (cost, u, v) in edges) {
            if (Union(u, v)) {
                totalCost += cost;
                edgesUsed++;
                if (edgesUsed == n - 1) break;
            }
        }
        
        return totalCost;
    }
    
    private int Find(int x) {
        if (parent[x] != x) parent[x] = Find(parent[x]);
        return parent[x];
    }
    
    private bool Union(int x, int y) {
        int px = Find(x), py = Find(y);
        if (px == py) return false;
        parent[px] = py;
        return true;
    }
}
```

#### Key Takeaways
- MST: connect all nodes with minimum total edge weight
- Prim's: grow tree from one node, pick minimum edge to new node
- Kruskal's: sort all edges, add if doesn't create cycle

---

### 3. Network Delay Time
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/network-delay-time/) | [NeetCode](https://neetcode.io/problems/network-delay-time)

#### Problem
Given n nodes and directed edges with travel times, find time for signal from node k to reach all nodes. Return -1 if impossible.

**Example:**
```
Input: times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2
Output: 2
```

#### Optimal Approach: Dijkstra's
- **Time:** O((V + E) log V)
- **Space:** O(V + E)

```csharp
public class Solution {
    public int NetworkDelayTime(int[][] times, int n, int k) {
        // Build graph
        Dictionary<int, List<(int node, int time)>> graph = new Dictionary<int, List<(int, int)>>();
        for (int i = 1; i <= n; i++) graph[i] = new List<(int, int)>();
        
        foreach (var time in times) {
            graph[time[0]].Add((time[1], time[2]));
        }
        
        // Dijkstra's
        int[] dist = Enumerable.Repeat(int.MaxValue, n + 1).ToArray();
        dist[k] = 0;
        
        PriorityQueue<int, int> pq = new PriorityQueue<int, int>();
        pq.Enqueue(k, 0);
        
        while (pq.Count > 0) {
            int node = pq.Dequeue();
            
            foreach (var (neighbor, time) in graph[node]) {
                int newDist = dist[node] + time;
                if (newDist < dist[neighbor]) {
                    dist[neighbor] = newDist;
                    pq.Enqueue(neighbor, newDist);
                }
            }
        }
        
        int maxTime = 0;
        for (int i = 1; i <= n; i++) {
            if (dist[i] == int.MaxValue) return -1;
            maxTime = Math.Max(maxTime, dist[i]);
        }
        
        return maxTime;
    }
}
```

#### Key Takeaways
- Classic Dijkstra's application
- Answer is max of all shortest paths
- Return -1 if any node unreachable

---

### 4. Swim in Rising Water
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/swim-in-rising-water/) | [NeetCode](https://neetcode.io/problems/swim-in-rising-water)

#### Problem
Find minimum time t when you can swim from (0,0) to (n-1,n-1). At time t, you can swim to cells with value ≤ t.

**Example:**
```
Input: grid = [[0,2],[1,3]]
Output: 3
```

#### Approach 1: Modified Dijkstra's
- **Time:** O(n² log n)
- **Space:** O(n²)

```csharp
public class Solution {
    public int SwimInWater(int[][] grid) {
        int n = grid.Length;
        int[][] dist = new int[n][];
        for (int i = 0; i < n; i++) {
            dist[i] = Enumerable.Repeat(int.MaxValue, n).ToArray();
        }
        
        dist[0][0] = grid[0][0];
        
        PriorityQueue<(int r, int c), int> pq = new PriorityQueue<(int, int), int>();
        pq.Enqueue((0, 0), grid[0][0]);
        
        int[] dr = {0, 0, 1, -1};
        int[] dc = {1, -1, 0, 0};
        
        while (pq.Count > 0) {
            var (row, col) = pq.Dequeue();
            
            if (row == n - 1 && col == n - 1) {
                return dist[row][col];
            }
            
            for (int d = 0; d < 4; d++) {
                int nr = row + dr[d];
                int nc = col + dc[d];
                
                if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                    int newDist = Math.Max(dist[row][col], grid[nr][nc]);
                    if (newDist < dist[nr][nc]) {
                        dist[nr][nc] = newDist;
                        pq.Enqueue((nr, nc), newDist);
                    }
                }
            }
        }
        
        return -1;
    }
}
```

#### Approach 2: Binary Search + BFS
- **Time:** O(n² log(n²))
- **Space:** O(n²)

```csharp
public class Solution {
    public int SwimInWater(int[][] grid) {
        int n = grid.Length;
        int left = grid[0][0], right = n * n - 1;
        
        while (left < right) {
            int mid = (left + right) / 2;
            if (CanReach(grid, mid)) {
                right = mid;
            } else {
                left = mid + 1;
            }
        }
        
        return left;
    }
    
    private bool CanReach(int[][] grid, int t) {
        int n = grid.Length;
        if (grid[0][0] > t) return false;
        
        Queue<(int, int)> queue = new Queue<(int, int)>();
        bool[,] visited = new bool[n, n];
        queue.Enqueue((0, 0));
        visited[0, 0] = true;
        
        int[] dr = {0, 0, 1, -1};
        int[] dc = {1, -1, 0, 0};
        
        while (queue.Count > 0) {
            var (row, col) = queue.Dequeue();
            
            if (row == n - 1 && col == n - 1) return true;
            
            for (int d = 0; d < 4; d++) {
                int nr = row + dr[d];
                int nc = col + dc[d];
                
                if (nr >= 0 && nr < n && nc >= 0 && nc < n && 
                    !visited[nr, nc] && grid[nr][nc] <= t) {
                    visited[nr, nc] = true;
                    queue.Enqueue((nr, nc));
                }
            }
        }
        
        return false;
    }
}
```

#### Key Takeaways
- Path cost = max cell value along path
- Dijkstra's: minimize max value
- Binary search: check if path exists for given t

---

### 5. Alien Dictionary
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/alien-dictionary/) | [NeetCode](https://neetcode.io/problems/foreign-dictionary)

#### Problem
Given a sorted list of words in alien language, derive the order of characters.

**Example:**
```
Input: words = ["wrt","wrf","er","ett","rftt"]
Output: "wertf"
```

#### Intuition
Build a graph from adjacent word pairs, then topological sort.

#### Optimal Approach
- **Time:** O(C) where C = total characters
- **Space:** O(1) - 26 letters max

```csharp
public class Solution {
    public string AlienOrder(string[] words) {
        // Build graph
        Dictionary<char, HashSet<char>> graph = new Dictionary<char, HashSet<char>>();
        Dictionary<char, int> inDegree = new Dictionary<char, int>();
        
        // Initialize all characters
        foreach (string word in words) {
            foreach (char c in word) {
                if (!graph.ContainsKey(c)) {
                    graph[c] = new HashSet<char>();
                    inDegree[c] = 0;
                }
            }
        }
        
        // Build edges from adjacent words
        for (int i = 0; i < words.Length - 1; i++) {
            string word1 = words[i];
            string word2 = words[i + 1];
            
            // Invalid: longer word comes before shorter prefix
            if (word1.Length > word2.Length && word1.StartsWith(word2)) {
                return "";
            }
            
            int minLen = Math.Min(word1.Length, word2.Length);
            for (int j = 0; j < minLen; j++) {
                if (word1[j] != word2[j]) {
                    // word1[j] comes before word2[j]
                    if (!graph[word1[j]].Contains(word2[j])) {
                        graph[word1[j]].Add(word2[j]);
                        inDegree[word2[j]]++;
                    }
                    break;  // Only first difference matters
                }
            }
        }
        
        // Topological sort (Kahn's)
        Queue<char> queue = new Queue<char>();
        foreach (var kvp in inDegree) {
            if (kvp.Value == 0) queue.Enqueue(kvp.Key);
        }
        
        StringBuilder result = new StringBuilder();
        while (queue.Count > 0) {
            char c = queue.Dequeue();
            result.Append(c);
            
            foreach (char next in graph[c]) {
                inDegree[next]--;
                if (inDegree[next] == 0) {
                    queue.Enqueue(next);
                }
            }
        }
        
        // Check if all characters included
        return result.Length == graph.Count ? result.ToString() : "";
    }
}
```

#### Key Takeaways
- Compare adjacent words to find order relationships
- Only first different character gives ordering info
- Invalid if longer word is prefix of shorter (comes before)
- Topological sort gives valid ordering

---

### 6. Cheapest Flights Within K Stops
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/cheapest-flights-within-k-stops/) | [NeetCode](https://neetcode.io/problems/cheapest-flight-path)

#### Problem
Find cheapest price from src to dst with at most k stops. Return -1 if no such route.

**Example:**
```
Input: n = 4, flights = [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], 
       src = 0, dst = 3, k = 1
Output: 700 (0 -> 1 -> 3)
```

#### Approach 1: Bellman-Ford (k+1 relaxations)
- **Time:** O(k × E)
- **Space:** O(V)

```csharp
public class Solution {
    public int FindCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        int[] prices = Enumerable.Repeat(int.MaxValue, n).ToArray();
        prices[src] = 0;
        
        // k stops means k+1 edges
        for (int i = 0; i <= k; i++) {
            int[] temp = (int[])prices.Clone();
            
            foreach (var flight in flights) {
                int from = flight[0], to = flight[1], price = flight[2];
                
                if (prices[from] != int.MaxValue) {
                    temp[to] = Math.Min(temp[to], prices[from] + price);
                }
            }
            
            prices = temp;
        }
        
        return prices[dst] == int.MaxValue ? -1 : prices[dst];
    }
}
```

#### Approach 2: Modified BFS
- **Time:** O(k × E)
- **Space:** O(V)

```csharp
public class Solution {
    public int FindCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        // Build graph
        Dictionary<int, List<(int to, int price)>> graph = new Dictionary<int, List<(int, int)>>();
        for (int i = 0; i < n; i++) graph[i] = new List<(int, int)>();
        
        foreach (var flight in flights) {
            graph[flight[0]].Add((flight[1], flight[2]));
        }
        
        int[] dist = Enumerable.Repeat(int.MaxValue, n).ToArray();
        dist[src] = 0;
        
        // BFS with stops tracking
        Queue<(int node, int cost)> queue = new Queue<(int, int)>();
        queue.Enqueue((src, 0));
        
        int stops = 0;
        
        while (queue.Count > 0 && stops <= k) {
            int size = queue.Count;
            
            for (int i = 0; i < size; i++) {
                var (node, cost) = queue.Dequeue();
                
                foreach (var (next, price) in graph[node]) {
                    int newCost = cost + price;
                    
                    if (newCost < dist[next]) {
                        dist[next] = newCost;
                        queue.Enqueue((next, newCost));
                    }
                }
            }
            
            stops++;
        }
        
        return dist[dst] == int.MaxValue ? -1 : dist[dst];
    }
}
```

#### Key Takeaways
- Bellman-Ford naturally handles limited edges
- k stops = k+1 edges maximum
- Use temp array to prevent using same-round updates

---

## Summary

### Algorithm Selection Guide

| Problem Type | Algorithm |
|-------------|-----------|
| Shortest path, non-negative weights | Dijkstra's |
| Shortest path, negative weights | Bellman-Ford |
| Shortest path, limited edges | Bellman-Ford (k iterations) |
| All-pairs shortest path | Floyd-Warshall |
| Minimum spanning tree | Prim's or Kruskal's |
| Eulerian path | Hierholzer's |
| Topological ordering | Kahn's or DFS |

### Complexity Comparison

| Algorithm | Time | Space | Notes |
|-----------|------|-------|-------|
| Dijkstra's | O((V+E) log V) | O(V) | Priority queue |
| Bellman-Ford | O(V × E) | O(V) | Handles negative weights |
| Prim's | O((V+E) log V) | O(V) | Start from one node |
| Kruskal's | O(E log E) | O(V) | Union-Find |

### Key Patterns

```csharp
// Dijkstra's: shortest path with non-negative weights
PriorityQueue<(node, dist), int> pq;  // Min-heap by distance
while (pq.Count > 0) {
    var (node, d) = pq.Dequeue();
    foreach neighbor: if dist[node] + weight < dist[neighbor]: update and enqueue
}

// Bellman-Ford: k iterations for at most k edges
for (i = 0 to k):
    foreach edge: relax with temp array

// MST Prim's: grow tree, always add minimum edge
while (nodes < n):
    pick minimum edge to unvisited node
    add to tree

// MST Kruskal's: sort edges, add if no cycle
sort edges by weight
foreach edge: if union(u, v) succeeds: add to tree
```
