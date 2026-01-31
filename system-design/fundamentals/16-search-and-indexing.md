# Search and Indexing

[← Back to Fundamentals](00-index.md)

---

## Overview

Search is a critical feature in most applications. This guide covers search fundamentals, inverted indexes, Elasticsearch, and strategies for building scalable search systems. Understanding these concepts is essential for designing systems with search capabilities.

---

## 📊 Search Fundamentals

### Types of Search

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEARCH TYPES                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Exact Match:                                                   │
│  WHERE email = 'user@example.com'                               │
│  → Simple database index                                        │
│                                                                 │
│  Prefix Search:                                                 │
│  WHERE name LIKE 'John%'                                        │
│  → Trie or B-tree index                                         │
│                                                                 │
│  Full-Text Search:                                              │
│  "Find documents containing 'database optimization'"            │
│  → Inverted index                                               │
│                                                                 │
│  Fuzzy Search:                                                  │
│  "Find 'databse' (typo)"                                        │
│  → Edit distance, n-grams                                       │
│                                                                 │
│  Semantic Search:                                               │
│  "Find documents about 'data storage'" (conceptual match)       │
│  → Vector embeddings, ML models                                 │
│                                                                 │
│  Faceted Search:                                                │
│  "Electronics > Phones > Under $500 > 4+ stars"                 │
│  → Aggregations, filters                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📚 Inverted Index

### Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVERTED INDEX                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Documents:                                                     │
│  ─────────                                                      │
│  Doc1: "The quick brown fox"                                    │
│  Doc2: "The lazy dog"                                           │
│  Doc3: "Quick brown dog"                                        │
│                                                                 │
│  Forward Index (like a book):                                   │
│  ─────────────────────────────                                  │
│  Doc1 → [the, quick, brown, fox]                               │
│  Doc2 → [the, lazy, dog]                                       │
│  Doc3 → [quick, brown, dog]                                    │
│                                                                 │
│  Inverted Index (like a book's index):                          │
│  ─────────────────────────────────────                          │
│  brown → [Doc1, Doc3]                                          │
│  dog   → [Doc2, Doc3]                                          │
│  fox   → [Doc1]                                                │
│  lazy  → [Doc2]                                                │
│  quick → [Doc1, Doc3]                                          │
│  the   → [Doc1, Doc2]                                          │
│                                                                 │
│  To find "brown": O(1) lookup → [Doc1, Doc3]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### With Position Information

```
┌─────────────────────────────────────────────────────────────────┐
│                    POSITIONAL INVERTED INDEX                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stores term positions for phrase queries                       │
│                                                                 │
│  Term → [(DocID, [positions...]), ...]                         │
│                                                                 │
│  quick → [(Doc1, [2]), (Doc3, [1])]                            │
│  brown → [(Doc1, [3]), (Doc3, [2])]                            │
│                                                                 │
│  Query: "quick brown" (adjacent words)                          │
│  1. Find docs with both: Doc1, Doc3                            │
│  2. Check positions adjacent:                                   │
│     Doc1: quick@2, brown@3 ✓ (2+1=3)                           │
│     Doc3: quick@1, brown@2 ✓ (1+1=2)                           │
│  3. Both match!                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Elasticsearch Architecture

### Cluster Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ELASTICSEARCH CLUSTER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Cluster: Collection of nodes                                   │
│  ─────────────────────────────                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     ES Cluster                          │   │
│  │                                                         │   │
│  │   ┌──────────┐   ┌──────────┐   ┌──────────┐          │   │
│  │   │  Node 1  │   │  Node 2  │   │  Node 3  │          │   │
│  │   │ (Master) │   │ (Data)   │   │ (Data)   │          │   │
│  │   └──────────┘   └──────────┘   └──────────┘          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Index: Like a database table                                   │
│  ─────────────────────────────                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Index: "products"                             │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐               │   │
│  │   │ Shard 0 │  │ Shard 1 │  │ Shard 2 │  (Primary)    │   │
│  │   └─────────┘  └─────────┘  └─────────┘               │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐               │   │
│  │   │Replica 0│  │Replica 1│  │Replica 2│  (Replicas)   │   │
│  │   └─────────┘  └─────────┘  └─────────┘               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Shard: Horizontal partition of an index                        │
│  Replica: Copy of a shard for redundancy                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Indexing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    INDEXING PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Document → Analyzer → Inverted Index                           │
│                                                                 │
│  Input: "The Quick BROWN Fox!"                                  │
│                                                                 │
│  1. Character Filters:                                          │
│     "The Quick BROWN Fox!" → "The Quick BROWN Fox"             │
│     (remove special chars)                                      │
│                                                                 │
│  2. Tokenizer:                                                  │
│     "The Quick BROWN Fox" → ["The", "Quick", "BROWN", "Fox"]   │
│     (split on whitespace)                                       │
│                                                                 │
│  3. Token Filters:                                              │
│     Lowercase: ["the", "quick", "brown", "fox"]                │
│     Stopwords: ["quick", "brown", "fox"]  (remove "the")       │
│     Stemming: ["quick", "brown", "fox"]                        │
│                                                                 │
│  Result: Index contains ["quick", "brown", "fox"]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Common Analyzers

| Analyzer | Example Input | Output Tokens |
|----------|---------------|---------------|
| **Standard** | "The Quick-Brown" | [the, quick, brown] |
| **Simple** | "The Quick-Brown" | [the, quick, brown] |
| **Whitespace** | "The Quick-Brown" | [The, Quick-Brown] |
| **Keyword** | "The Quick-Brown" | [The Quick-Brown] |
| **English** | "running quickly" | [run, quick] (stemmed) |

---

## 💻 Elasticsearch Queries

### Basic Queries

```json
// Match query - analyzed, full-text search
{
  "query": {
    "match": {
      "description": "database optimization"
    }
  }
}

// Term query - exact match, not analyzed
{
  "query": {
    "term": {
      "status": "published"
    }
  }
}

// Bool query - combine conditions
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "elasticsearch" } }
      ],
      "filter": [
        { "term": { "status": "published" } },
        { "range": { "date": { "gte": "2023-01-01" } } }
      ],
      "should": [
        { "match": { "category": "tutorial" } }
      ],
      "must_not": [
        { "term": { "archived": true } }
      ]
    }
  }
}
```

### Fuzzy and Autocomplete

```json
// Fuzzy search (handles typos)
{
  "query": {
    "fuzzy": {
      "title": {
        "value": "databse",
        "fuzziness": "AUTO"
      }
    }
  }
}

// Prefix for autocomplete
{
  "query": {
    "prefix": {
      "title": "elast"
    }
  }
}

// Completion suggester (optimized autocomplete)
{
  "suggest": {
    "product-suggest": {
      "prefix": "app",
      "completion": {
        "field": "suggest",
        "fuzzy": {
          "fuzziness": 1
        }
      }
    }
  }
}
```

### Aggregations

```json
// Faceted search with aggregations
{
  "query": {
    "match": { "category": "electronics" }
  },
  "aggs": {
    "brands": {
      "terms": { "field": "brand.keyword" }
    },
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          { "to": 100 },
          { "from": 100, "to": 500 },
          { "from": 500 }
        ]
      }
    },
    "avg_price": {
      "avg": { "field": "price" }
    }
  }
}
```

---

## 🏗️ Search System Architecture

### Dual-Write Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    DUAL-WRITE PATTERN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Application writes to both database and search                 │
│                                                                 │
│           Application                                           │
│               │                                                 │
│       ┌───────┴───────┐                                         │
│       │               │                                         │
│       ▼               ▼                                         │
│  ┌──────────┐   ┌──────────────┐                               │
│  │ Database │   │Elasticsearch │                               │
│  │ (source  │   │(search index)│                               │
│  │ of truth)│   │              │                               │
│  └──────────┘   └──────────────┘                               │
│                                                                 │
│  ⚠️ Problems:                                                   │
│  - What if ES write fails? Data inconsistency                   │
│  - Transaction coordination is complex                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CDC Pattern (Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CDC (CHANGE DATA CAPTURE)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Database is source of truth, changes streamed to search        │
│                                                                 │
│  Application                                                    │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐                                                  │
│  │ Database │                                                  │
│  └────┬─────┘                                                  │
│       │ (binlog/WAL)                                           │
│       ▼                                                         │
│  ┌──────────┐                                                  │
│  │ Debezium │  (CDC tool)                                      │
│  └────┬─────┘                                                  │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐                                                  │
│  │  Kafka   │                                                  │
│  └────┬─────┘                                                  │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────┐                                              │
│  │Elasticsearch │                                              │
│  └──────────────┘                                              │
│                                                                 │
│  ✅ Benefits:                                                   │
│  - Database transaction guarantees                              │
│  - Eventual consistency with search                             │
│  - Decoupled, scalable                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Search Optimization

### Index Design

```json
// Mapping with proper field types
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "english",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete_analyzer"
          }
        }
      },
      "price": { "type": "float" },
      "category": { "type": "keyword" },
      "created_at": { "type": "date" },
      "tags": { "type": "keyword" },
      "location": { "type": "geo_point" }
    }
  },
  "settings": {
    "number_of_shards": 5,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "autocomplete_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "autocomplete_filter"]
        }
      },
      "filter": {
        "autocomplete_filter": {
          "type": "edge_ngram",
          "min_gram": 1,
          "max_gram": 20
        }
      }
    }
  }
}
```

### Shard Sizing

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARD SIZING GUIDELINES                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Target shard size: 10-50 GB                                    │
│                                                                 │
│  Too small shards:                                              │
│  - Many shards = coordination overhead                          │
│  - Too many API calls                                           │
│                                                                 │
│  Too large shards:                                              │
│  - Slow recovery after failure                                  │
│  - Memory pressure                                              │
│                                                                 │
│  Example calculation:                                           │
│  - Expected data: 500 GB                                        │
│  - Target shard size: 25 GB                                     │
│  - Number of shards: 500 / 25 = 20 primary shards               │
│                                                                 │
│  With growth:                                                   │
│  - Plan for 2x growth: 1000 GB                                  │
│  - Number of shards: 1000 / 25 = 40 primary shards              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Relevance and Ranking

### TF-IDF Scoring

```
┌─────────────────────────────────────────────────────────────────┐
│                    TF-IDF SCORING                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TF (Term Frequency):                                           │
│  How often term appears in document                             │
│  TF = count(term) / total_terms_in_doc                         │
│                                                                 │
│  IDF (Inverse Document Frequency):                              │
│  How rare is the term across all documents                      │
│  IDF = log(total_docs / docs_containing_term)                  │
│                                                                 │
│  Score = TF × IDF                                               │
│                                                                 │
│  Example:                                                       │
│  Query: "database optimization"                                 │
│                                                                 │
│  "database": appears in 80% of tech docs → low IDF             │
│  "optimization": appears in 5% of docs → high IDF              │
│                                                                 │
│  Doc with both gets higher score if "optimization"              │
│  appears more frequently (it's more distinctive)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### BM25 (Elasticsearch Default)

```
Improvements over TF-IDF:
- Diminishing returns for term frequency
- Document length normalization

BM25(D, Q) = Σ IDF(qi) × (TF(qi, D) × (k1 + 1)) / 
             (TF(qi, D) + k1 × (1 - b + b × |D| / avgdl))

k1 = 1.2 (term frequency saturation)
b = 0.75 (document length normalization)
```

### Custom Boosting

```json
// Boost certain fields or conditions
{
  "query": {
    "bool": {
      "should": [
        { "match": { "title": { "query": "database", "boost": 3 } } },
        { "match": { "description": { "query": "database", "boost": 1 } } }
      ]
    }
  }
}

// Function score for complex ranking
{
  "query": {
    "function_score": {
      "query": { "match": { "title": "database" } },
      "functions": [
        {
          "filter": { "term": { "featured": true } },
          "weight": 2
        },
        {
          "gauss": {
            "date": {
              "origin": "now",
              "scale": "30d",
              "decay": 0.5
            }
          }
        },
        {
          "field_value_factor": {
            "field": "popularity",
            "factor": 1.2,
            "modifier": "sqrt"
          }
        }
      ],
      "boost_mode": "multiply"
    }
  }
}
```

---

## 🆚 Search Solutions Comparison

| Solution | Best For | Scaling | Learning Curve |
|----------|----------|---------|----------------|
| **PostgreSQL FTS** | Simple search, small data | Moderate | Low |
| **Elasticsearch** | Full-featured search | Excellent | Medium |
| **OpenSearch** | AWS-native, ES alternative | Excellent | Medium |
| **Algolia** | Hosted, instant search | Automatic | Low |
| **Typesense** | Self-hosted, simple | Good | Low |
| **Meilisearch** | Typo-tolerant, easy | Good | Low |
| **Solr** | Enterprise, complex needs | Excellent | High |

---

## ✅ Key Takeaways

1. **Inverted index is fundamental** - Map terms to documents
2. **Analyze your data** - Choose right tokenizers/filters
3. **Use CDC over dual-write** - Better consistency guarantees
4. **Size shards properly** - 10-50 GB per shard
5. **Tune relevance** - BM25, boosting, function scores
6. **Cache aggressively** - Query results and filter caches
7. **Monitor query performance** - Slow query logs

---

## 📚 Related Topics

- [Database Scaling](11-database-scaling.md) - Read replicas for search
- [Caching](07-caching.md) - Cache search results
- [Data Modeling](05-data-modeling.md) - Denormalization for search
- [Message Queues](09-message-queues.md) - CDC pipeline
