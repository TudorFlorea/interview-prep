# Design Search Autocomplete

[← Back to Problems](/system-design/problems/00-index.md)

---

## 🎯 Problem Statement

Design a search autocomplete system (typeahead) that suggests query completions as users type, ranking suggestions by relevance and popularity.

**Difficulty**: 🟡 Intermediate (Tier 2)

---

## 1. Requirements Gathering

### Functional Requirements

1. **Real-time suggestions** - Show suggestions as user types
2. **Ranked results** - Order by relevance/popularity
3. **Prefix matching** - Match beginning of queries
4. **Personalization** - User's recent searches (optional)
5. **Trending queries** - Incorporate popularity
6. **Multi-language** - Support different languages

### Non-Functional Requirements

| Aspect | Requirement |
|--------|-------------|
| **Fault Tolerance** | 99.9% availability |
| **CAP** | AP - Stale suggestions acceptable |
| **Scalability** | 10B queries/day |
| **Latency** | < 100ms (P99) |
| **Environment** | Global |

---

## 2. Back of Envelope Calculations

```
Traffic:
- 10 billion searches/day
- Average 4 characters typed before selecting
- 40 billion autocomplete requests/day
- 40B / 86400 ≈ 460,000 requests/second

Storage:
- 5 billion unique queries
- Average query: 20 characters
- 5B × 20 bytes = 100 GB

Trie Size:
- Nodes for prefixes: ~10 billion
- 100 bytes per node = 1 TB
```

---

## 3. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    AUTOCOMPLETE ARCHITECTURE                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                            ┌─────────────┐                                 │
│                            │   Client    │                                 │
│                            └──────┬──────┘                                 │
│                                   │                                        │
│                        ┌──────────┴──────────┐                            │
│                        │        CDN          │  (Cache popular prefixes)  │
│                        └──────────┬──────────┘                            │
│                                   │                                        │
│                        ┌──────────┴──────────┐                            │
│                        │   Load Balancer     │                            │
│                        └──────────┬──────────┘                            │
│                                   │                                        │
│         ┌─────────────────────────┼─────────────────────────┐             │
│         │                         │                         │              │
│         ▼                         ▼                         ▼              │
│    ┌─────────┐             ┌──────────┐             ┌──────────┐          │
│    │Autocomp │             │Autocomp  │             │Autocomp  │          │
│    │Server 1 │             │Server 2  │             │Server N  │          │
│    └────┬────┘             └────┬─────┘             └────┬─────┘          │
│         │                       │                        │                 │
│         └───────────────────────┼────────────────────────┘                 │
│                                 │                                          │
│                     ┌───────────┴───────────┐                             │
│                     │                       │                              │
│                     ▼                       ▼                              │
│              ┌───────────┐           ┌───────────┐                        │
│              │  Trie     │           │  Redis    │                        │
│              │  Cluster  │           │  Cache    │                        │
│              └─────┬─────┘           └───────────┘                        │
│                    │                                                       │
│                    │ Async Updates                                         │
│                    │                                                       │
│              ┌─────▼─────┐                                                │
│              │  Query    │◄──── Kafka ◄──── Search Events                 │
│              │ Aggregator│                                                 │
│              └───────────┘                                                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Deep Dive: Trie Data Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                   TRIE STRUCTURE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Example queries: "tree", "true", "try", "trip"                │
│                                                                 │
│                     [root]                                      │
│                        │                                        │
│                       [t]                                       │
│                        │                                        │
│                       [r]                                       │
│                     /    \                                      │
│                   [e]    [i/u]                                  │
│                   / \       \                                   │
│                 [e] [y]    [p/e]                                │
│                 (tree)     (trip, true, try)                    │
│                                                                 │
│  Node Structure:                                                │
│  ─────────────────                                              │
│  class TrieNode:                                                │
│      children: Dict[char, TrieNode]                            │
│      is_end_of_word: bool                                      │
│      frequency: int                                            │
│      top_suggestions: List[str]  # Precomputed top-k          │
│                                                                 │
│  Optimization: Store top-k suggestions at each node           │
│  ─────────────────────────────────────────────────              │
│  At node "tr":                                                 │
│    top_suggestions = ["tree", "trump", "trip", "true", "try"] │
│                                                                 │
│  Query "tr" → Return precomputed list immediately             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Trie Implementation

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.frequency = 0
        self.top_k = []  # Precomputed top suggestions
        
class AutocompleteTrie:
    def __init__(self, k=10):
        self.root = TrieNode()
        self.k = k
        
    def insert(self, word: str, frequency: int):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
            
            # Update top-k at each prefix
            self._update_top_k(node, word, frequency)
            
        node.is_end = True
        node.frequency = frequency
        
    def _update_top_k(self, node: TrieNode, word: str, freq: int):
        # Add or update word in top_k
        for i, (w, f) in enumerate(node.top_k):
            if w == word:
                node.top_k[i] = (word, freq)
                break
        else:
            node.top_k.append((word, freq))
        
        # Sort by frequency descending and keep top k
        node.top_k.sort(key=lambda x: -x[1])
        node.top_k = node.top_k[:self.k]
        
    def search(self, prefix: str) -> List[str]:
        node = self.root
        for char in prefix:
            if char not in node.children:
                return []
            node = node.children[char]
        
        # Return precomputed suggestions
        return [word for word, freq in node.top_k]
```

---

## 5. Scaling the Trie

```
┌─────────────────────────────────────────────────────────────────┐
│                   TRIE PARTITIONING                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Problem: 1 TB trie doesn't fit on single server               │
│                                                                 │
│  Solution: Partition by first character(s)                     │
│  ─────────────────────────────────────────                      │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    Router                               │    │
│  │  Prefix "a*" → Shard 1                                 │    │
│  │  Prefix "b*" → Shard 2                                 │    │
│  │  Prefix "c*" → Shard 3                                 │    │
│  │  ...                                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│         ┌──────────────┬──────────────┬──────────────┐         │
│         ▼              ▼              ▼              ▼         │
│    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐      │
│    │ Shard 1 │   │ Shard 2 │   │ Shard 3 │   │Shard 26 │      │
│    │  a-*    │   │  b-*    │   │  c-*    │   │  z-*    │      │
│    └─────────┘   └─────────┘   └─────────┘   └─────────┘      │
│                                                                 │
│  Replication:                                                   │
│  ─────────────                                                  │
│  • Each shard has 3 replicas                                  │
│  • Sync via Raft or async replication                        │
│                                                                 │
│  Alternative: Two-level sharding                               │
│  ───────────────────────────────                                │
│  Prefix "aa*" → Shard 1A                                       │
│  Prefix "ab*" → Shard 1B                                       │
│  ...                                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                   CACHING LAYERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Browser Cache                                        │
│  ───────────────────────                                        │
│  • Cache responses locally                                     │
│  • Cache-Control: max-age=60                                   │
│  • User types "app" → Cached from previous "ap"               │
│                                                                 │
│  Layer 2: CDN Cache                                             │
│  ───────────────────                                            │
│  • Cache popular prefixes at edge                              │
│  • "how", "what", "why" → Cached globally                     │
│  • TTL: 5 minutes                                              │
│                                                                 │
│  Layer 3: Redis Cache                                           │
│  ─────────────────────                                          │
│  • Cache prefix → suggestions                                  │
│  • LRU eviction                                                │
│  • TTL: 1 hour                                                 │
│                                                                 │
│  Cache Hit Rates:                                               │
│  ─────────────────                                              │
│  • CDN: 30% (very popular prefixes)                           │
│  • Redis: 50% (medium popularity)                             │
│  • Trie: 20% (long tail)                                      │
│                                                                 │
│  Cache Key Design:                                              │
│  ───────────────────                                            │
│  autocomplete:{prefix}:{locale}                                │
│  autocomplete:how:en-US → ["how to", "how are you", ...]      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Ranking Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│                   RANKING SIGNALS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Signals:                                                       │
│  ─────────                                                      │
│  1. Query Frequency - How often this query is searched         │
│  2. Recency - Recent trending queries                          │
│  3. User History - User's past searches                        │
│  4. Location - Geographically relevant                        │
│  5. Context - Current session context                          │
│                                                                 │
│  Scoring Formula:                                               │
│  ─────────────────                                              │
│  score = (frequency × 0.4) +                                   │
│          (recency_boost × 0.2) +                               │
│          (personalization × 0.2) +                             │
│          (context × 0.2)                                       │
│                                                                 │
│  Frequency Decay:                                               │
│  ─────────────────                                              │
│  • Recent queries weighted more heavily                        │
│  • Exponential decay: score = count × decay^(age_in_days)     │
│                                                                 │
│  Personalization:                                               │
│  ─────────────────                                              │
│  • Boost queries user has searched before                      │
│  • Store recent 100 queries per user                          │
│  • Blend with global suggestions                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Data Collection Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                   DATA COLLECTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pipeline:                                                      │
│  ──────────                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ Search   │──►│  Kafka   │──►│Aggregator│──►│  Trie    │    │
│  │ Events   │   │          │   │          │   │ Builder  │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
│                                                                 │
│  Search Event:                                                  │
│  ───────────────                                                │
│  {                                                              │
│    "query": "python tutorial",                                  │
│    "user_id": "user123",                                        │
│    "timestamp": "2025-01-15T10:00:00Z",                        │
│    "location": "US",                                            │
│    "device": "mobile"                                          │
│  }                                                              │
│                                                                 │
│  Aggregation (Hourly/Daily):                                   │
│  ─────────────────────────────                                  │
│  • Count queries per time window                               │
│  • Calculate trending score                                    │
│  • Filter spam/profanity                                      │
│                                                                 │
│  Trie Update Strategy:                                          │
│  ──────────────────────                                         │
│  Option A: Rebuild entire trie daily (offline)                │
│  Option B: Incremental updates (online)                       │
│                                                                 │
│  Hybrid Approach:                                               │
│  ─────────────────                                              │
│  • Rebuild trie weekly with full data                         │
│  • Merge hourly trending data into hot cache                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. API Design

```
# Get suggestions
GET /api/v1/autocomplete?q={prefix}&limit=10&locale=en-US

Response:
{
    "prefix": "how to",
    "suggestions": [
        {"text": "how to learn python", "score": 0.95},
        {"text": "how to cook rice", "score": 0.92},
        {"text": "how to tie a tie", "score": 0.88}
    ],
    "cached": true
}

# Headers
Cache-Control: public, max-age=60
X-Request-ID: abc123
```

---

## 10. Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Trie Storage | Custom (in-memory) | Low latency |
| Cache | Redis | Prefix caching |
| CDN | CloudFlare | Edge caching |
| Events | Kafka | Stream processing |
| Aggregation | Spark/Flink | Batch + streaming |
| Profanity Filter | Bloom filter | Fast lookup |

---

## 11. Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                   KEY TAKEAWAYS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PRECOMPUTE TOP-K                                            │
│     Store suggestions at each trie node                        │
│     Avoid DFS traversal at query time                         │
│                                                                 │
│  2. MULTI-LAYER CACHING                                         │
│     Browser → CDN → Redis → Trie                              │
│     90%+ cache hit rate achievable                            │
│                                                                 │
│  3. PARTITION BY PREFIX                                         │
│     Simple, predictable sharding                              │
│     Route by first character(s)                               │
│                                                                 │
│  4. ASYNC UPDATES                                               │
│     Don't update trie synchronously                           │
│     Batch aggregation, periodic rebuild                       │
│                                                                 │
│  5. FILTER INAPPROPRIATE CONTENT                                │
│     Blocklist + ML for profanity                              │
│     Manual review for trending                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. References

- [07-caching.md](/system-design/fundamentals/07-caching.md) - Caching strategies
- [16-search-and-indexing.md](/system-design/fundamentals/16-search-and-indexing.md) - Search
- [12-consistent-hashing.md](/system-design/fundamentals/12-consistent-hashing.md) - Sharding

---

[← Back to Problems](/system-design/problems/00-index.md) | [Next: Distributed Cache →](/system-design/problems/14-distributed-cache.md)
