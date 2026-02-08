# Intervals

[← Back to Index](/dsa/00-index.md)

## Overview

Interval problems involve ranges with start and end points. Common operations include merging, finding overlaps, and scheduling.

### Key Techniques
1. **Sort by start** or **sort by end**
2. **Sweep line** algorithm
3. **Priority queue** for active intervals

### Interval Relationships
```
Given intervals [a, b] and [c, d]:

Overlapping:     |------|        max(a,c) &lt;= min(b,d)
                    |------|

Non-overlapping: |------|  |------|    b &lt; c or d &lt; a

Merged:          |-----------|        [min(a,c), max(b,d)]
```

---

## Problems

### 1. Insert Interval
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/insert-interval/) | [NeetCode](https://neetcode.io/problems/insert-new-interval)

#### Problem
Insert new interval into sorted non-overlapping intervals, merge if necessary.

**Example:**
```
Input: intervals = [[1,3],[6,9]], newInterval = [2,5]
Output: [[1,5],[6,9]]
```

#### Optimal Approach
- **Time:** O(n)
- **Space:** O(n)

```csharp
public class Solution {
    public int[][] Insert(int[][] intervals, int[] newInterval) {
        List&lt;int[]> result = new List&lt;int[]>();
        int i = 0;
        int n = intervals.Length;
        
        // Add all intervals that come before newInterval
        while (i &lt; n && intervals[i][1] &lt; newInterval[0]) {
            result.Add(intervals[i]);
            i++;
        }
        
        // Merge overlapping intervals
        while (i &lt; n && intervals[i][0] &lt;= newInterval[1]) {
            newInterval[0] = Math.Min(newInterval[0], intervals[i][0]);
            newInterval[1] = Math.Max(newInterval[1], intervals[i][1]);
            i++;
        }
        result.Add(newInterval);
        
        // Add all intervals that come after
        while (i &lt; n) {
            result.Add(intervals[i]);
            i++;
        }
        
        return result.ToArray();
    }
}
```

#### Key Takeaways
- Three phases: before, overlap, after
- Overlap condition: intervals[i].start &lt;= newInterval.end
- Merge by taking min start, max end

---

### 2. Merge Intervals
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/merge-intervals/) | [NeetCode](https://neetcode.io/problems/merge-intervals)

#### Problem
Merge all overlapping intervals.

**Example:**
```
Input: intervals = [[1,3],[2,6],[8,10],[15,18]]
Output: [[1,6],[8,10],[15,18]]
```

#### Optimal Approach
- **Time:** O(n log n)
- **Space:** O(n)

```csharp
public class Solution {
    public int[][] Merge(int[][] intervals) {
        if (intervals.Length &lt;= 1) return intervals;
        
        // Sort by start time
        Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0]));
        
        List&lt;int[]> result = new List&lt;int[]>();
        int[] current = intervals[0];
        
        for (int i = 1; i &lt; intervals.Length; i++) {
            if (intervals[i][0] &lt;= current[1]) {
                // Overlapping: extend current interval
                current[1] = Math.Max(current[1], intervals[i][1]);
            } else {
                // Non-overlapping: add current and start new
                result.Add(current);
                current = intervals[i];
            }
        }
        
        result.Add(current);  // Don't forget the last one
        
        return result.ToArray();
    }
}
```

#### Key Takeaways
- Sort by start time first
- Overlap: current.end >= next.start
- Extend end when merging

---

### 3. Non-overlapping Intervals
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/non-overlapping-intervals/) | [NeetCode](https://neetcode.io/problems/non-overlapping-intervals)

#### Problem
Find minimum number of intervals to remove to make the rest non-overlapping.

**Example:**
```
Input: intervals = [[1,2],[2,3],[3,4],[1,3]]
Output: 1  (Remove [1,3])
```

#### Intuition
This is equivalent to finding maximum non-overlapping intervals, then subtracting from total.

#### Optimal Approach
- **Time:** O(n log n)
- **Space:** O(1)

```csharp
public class Solution {
    public int EraseOverlapIntervals(int[][] intervals) {
        // Sort by end time (greedy: keep earliest ending)
        Array.Sort(intervals, (a, b) => a[1].CompareTo(b[1]));
        
        int count = 0;
        int prevEnd = int.MinValue;
        
        foreach (var interval in intervals) {
            if (interval[0] >= prevEnd) {
                // No overlap: keep this interval
                prevEnd = interval[1];
            } else {
                // Overlap: remove this interval (it ends later)
                count++;
            }
        }
        
        return count;
    }
}
```

#### Key Takeaways
- Sort by END time (not start!)
- Keep intervals that end earliest (leaves room for more)
- Classic interval scheduling / activity selection

---

### 4. Meeting Rooms
- [ ] Completed | 🟢 Easy | [LeetCode](https://leetcode.com/problems/meeting-rooms/) | [NeetCode](https://neetcode.io/problems/meeting-schedule)

#### Problem
Determine if a person can attend all meetings (no overlaps).

**Example:**
```
Input: intervals = [[0,30],[5,10],[15,20]]
Output: false
```

#### Optimal Approach
- **Time:** O(n log n)
- **Space:** O(1)

```csharp
public class Solution {
    public bool CanAttendMeetings(int[][] intervals) {
        if (intervals.Length &lt;= 1) return true;
        
        Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0]));
        
        for (int i = 1; i &lt; intervals.Length; i++) {
            if (intervals[i][0] &lt; intervals[i - 1][1]) {
                return false;  // Overlap detected
            }
        }
        
        return true;
    }
}
```

#### Key Takeaways
- Sort by start time
- Check if any meeting starts before previous ends

---

### 5. Meeting Rooms II
- [ ] Completed | 🟡 Medium | [LeetCode](https://leetcode.com/problems/meeting-rooms-ii/) | [NeetCode](https://neetcode.io/problems/meeting-schedule-ii)

#### Problem
Find minimum number of meeting rooms required.

**Example:**
```
Input: intervals = [[0,30],[5,10],[15,20]]
Output: 2
```

#### Approach 1: Sweep Line
- **Time:** O(n log n)
- **Space:** O(n)

```csharp
public class Solution {
    public int MinMeetingRooms(int[][] intervals) {
        List&lt;(int time, int type)> events = new List&lt;(int, int)>();
        
        foreach (var interval in intervals) {
            events.Add((interval[0], 1));   // Start event
            events.Add((interval[1], -1));  // End event
        }
        
        // Sort by time, then by type (end before start if same time)
        events.Sort((a, b) => {
            if (a.time != b.time) return a.time.CompareTo(b.time);
            return a.type.CompareTo(b.type);  // -1 before 1
        });
        
        int rooms = 0, maxRooms = 0;
        
        foreach (var e in events) {
            rooms += e.type;
            maxRooms = Math.Max(maxRooms, rooms);
        }
        
        return maxRooms;
    }
}
```

#### Approach 2: Min-Heap
- **Time:** O(n log n)
- **Space:** O(n)

```csharp
public class Solution {
    public int MinMeetingRooms(int[][] intervals) {
        Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0]));
        
        // Min-heap of end times
        PriorityQueue&lt;int, int> pq = new PriorityQueue&lt;int, int>();
        
        foreach (var interval in intervals) {
            // If earliest ending meeting ends before this starts
            if (pq.Count > 0 && pq.Peek() &lt;= interval[0]) {
                pq.Dequeue();  // Reuse that room
            }
            
            pq.Enqueue(interval[1], interval[1]);  // Add this meeting's end time
        }
        
        return pq.Count;  // Number of rooms in use
    }
}
```

#### Key Takeaways
- Sweep line: +1 for start, -1 for end, track max active
- Min-heap: track earliest ending room, reuse if possible
- Both give minimum concurrent meetings

---

### 6. Minimum Interval to Include Each Query
- [ ] Completed | 🔴 Hard | [LeetCode](https://leetcode.com/problems/minimum-interval-to-include-each-query/) | [NeetCode](https://neetcode.io/problems/minimum-interval-including-query)

#### Problem
For each query, find the smallest interval that contains it. Return -1 if no such interval.

**Example:**
```
Input: intervals = [[1,4],[2,4],[3,6],[4,4]], queries = [2,3,4,5]
Output: [3,3,1,4]
```

#### Optimal Approach: Offline Processing
- **Time:** O((n + q) log n)
- **Space:** O(n + q)

```csharp
public class Solution {
    public int[] MinInterval(int[][] intervals, int[] queries) {
        // Sort intervals by start
        Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0]));
        
        // Sort queries while keeping original indices
        int[] sortedQueries = queries.Select((q, i) => i).ToArray();
        Array.Sort(sortedQueries, (a, b) => queries[a].CompareTo(queries[b]));
        
        // Min-heap of (size, end) for active intervals
        PriorityQueue&lt;(int size, int end), int> pq = new PriorityQueue&lt;(int, int), int>();
        
        int[] result = new int[queries.Length];
        int i = 0;
        
        foreach (int qi in sortedQueries) {
            int q = queries[qi];
            
            // Add all intervals that start &lt;= query
            while (i &lt; intervals.Length && intervals[i][0] &lt;= q) {
                int size = intervals[i][1] - intervals[i][0] + 1;
                pq.Enqueue((size, intervals[i][1]), size);
                i++;
            }
            
            // Remove intervals that end before query
            while (pq.Count > 0 && pq.Peek().end &lt; q) {
                pq.Dequeue();
            }
            
            result[qi] = pq.Count > 0 ? pq.Peek().size : -1;
        }
        
        return result;
    }
}
```

#### Key Takeaways
- Process queries in sorted order (offline)
- Add intervals that could contain query (start &lt;= q)
- Remove intervals that can't contain query (end &lt; q)
- Min-heap by size gives smallest containing interval

---

## Summary

### Interval Problem Patterns

| Problem | Technique | Sort By |
|---------|-----------|---------|
| Merge overlapping | Linear scan | Start |
| Check overlap | Compare adjacent | Start |
| Max non-overlapping | Greedy | End |
| Min rooms | Sweep line or heap | Start |
| Insert interval | Three phases | Already sorted |

### Overlap Detection
```csharp
// Two intervals [a1, a2] and [b1, b2] overlap if:
bool overlap = !(a2 &lt; b1 || b2 &lt; a1);
// Equivalent to:
bool overlap = a1 &lt;= b2 && b1 &lt;= a2;
// Or:
bool overlap = Math.Max(a1, b1) &lt;= Math.Min(a2, b2);
```

### Sweep Line Template
```csharp
// For counting concurrent events
List&lt;(int time, int delta)> events = new List&lt;(int, int)>();
foreach (var interval in intervals) {
    events.Add((interval.start, +1));
    events.Add((interval.end, -1));
}
events.Sort((a, b) => {
    if (a.time != b.time) return a.time.CompareTo(b.time);
    return a.delta.CompareTo(b.delta);  // End before start at same time
});

int active = 0, maxActive = 0;
foreach (var e in events) {
    active += e.delta;
    maxActive = Math.Max(maxActive, active);
}
```

### Common Mistakes
1. **Wrong sort order**: End for max non-overlapping, start for most others
2. **Boundary conditions**: Is [1,2] and [2,3] overlapping? Depends on problem (usually no)
3. **Forgetting last interval**: When merging, add the final interval after loop
