# Full-Text Search

[← Back to Index](/databases/00-index.md)

---

## Overview

Full-text search (FTS) enables efficient searching within text content—finding documents by keywords, phrases, and relevance. While simpler than dedicated search engines like Elasticsearch, database-native FTS is often sufficient and avoids additional infrastructure.

### When This Matters Most
- Product search functionality
- Document/content management systems
- Log searching
- User-generated content search

---

## Beyond LIKE and ILIKE

### The Problem with LIKE

```sql
-- LIKE is slow and limited
SELECT * FROM products WHERE description LIKE '%wireless mouse%';

-- Problems:
-- 1. No index usage (leading wildcard = full table scan)
-- 2. No word boundary awareness ("wireless" matches "firewireless")
-- 3. No relevance ranking
-- 4. No linguistic features (stemming, synonyms)
```

### Full-Text Search Solution

```sql
-- PostgreSQL: Fast and ranked
SELECT * FROM products 
WHERE to_tsvector('english', description) @@ to_tsquery('english', 'wireless & mouse')
ORDER BY ts_rank(to_tsvector('english', description), to_tsquery('english', 'wireless & mouse')) DESC;

-- Benefits:
-- ✅ Uses GIN index (fast!)
-- ✅ Word-boundary aware
-- ✅ Relevance ranking
-- ✅ Stemming ("running" matches "run")
```

---

## PostgreSQL Full-Text Search

### Core Concepts

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TEXT SEARCH DATA TYPES                                                  │
│                                                                          │
│  tsvector: Processed document (normalized, stemmed tokens)               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 'cat':1 'garden':4 'quick':2 'run':3                              │   │
│  │   ↑         ↑          ↑        ↑                                 │   │
│  │ token   position    token   position (stemmed from "running")    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  tsquery: Search query (normalized, with operators)                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ 'cat' & 'run'           -- cat AND run                            │   │
│  │ 'cat' | 'dog'           -- cat OR dog                             │   │
│  │ !'cat'                  -- NOT cat                                │   │
│  │ 'quick' <-> 'cat'       -- quick FOLLOWED BY cat                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  @@ operator: Matches tsvector against tsquery                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Creating and Querying

```sql
-- Convert text to tsvector
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');
-- Result: 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2

-- Create search query
SELECT to_tsquery('english', 'quick & fox');
-- Result: 'quick' & 'fox'

-- Match query against document
SELECT to_tsvector('english', 'The quick brown fox') @@ to_tsquery('english', 'quick & fox');
-- Result: true

-- Simpler query syntax with plainto_tsquery
SELECT to_tsvector('english', 'The quick brown fox') @@ plainto_tsquery('english', 'quick fox');
-- Automatically ANDs words together

-- Phrase search with phraseto_tsquery
SELECT to_tsvector('english', 'The quick brown fox') @@ phraseto_tsquery('english', 'quick brown');
-- Matches adjacent words in order

-- Web-style search with websearch_to_tsquery (PostgreSQL 11+)
SELECT websearch_to_tsquery('english', 'quick -lazy "brown fox"');
-- Result: 'quick' & !'lazi' & 'brown' <-> 'fox'
```

### Query Operators

```sql
-- AND: Both terms must match
SELECT * FROM products 
WHERE search_vector @@ to_tsquery('wireless & mouse');

-- OR: Either term matches
SELECT * FROM products 
WHERE search_vector @@ to_tsquery('wireless | bluetooth');

-- NOT: Exclude term
SELECT * FROM products 
WHERE search_vector @@ to_tsquery('mouse & !gaming');

-- FOLLOWED BY: Phrase/proximity
SELECT * FROM products 
WHERE search_vector @@ to_tsquery('wireless <-> mouse');  -- Adjacent
SELECT * FROM products 
WHERE search_vector @@ to_tsquery('wireless <2> mouse');  -- Within 2 words

-- Prefix matching
SELECT * FROM products 
WHERE search_vector @@ to_tsquery('wire:*');  -- Matches wireless, wired, wire
```

---

## Indexing Full-Text Search

### GIN Index

```sql
-- Create table with search vector column
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED
);

-- Create GIN index on search vector
CREATE INDEX idx_products_search ON products USING GIN (search_vector);

-- Search uses the index
SELECT name, description
FROM products
WHERE search_vector @@ websearch_to_tsquery('english', 'wireless mouse')
ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', 'wireless mouse')) DESC;
```

### Manual tsvector Column

```sql
-- Alternative: Trigger-maintained search vector
ALTER TABLE products ADD COLUMN search_vector tsvector;

CREATE INDEX idx_products_search ON products USING GIN (search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION products_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER products_search_update
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_update();

-- Backfill existing rows
UPDATE products SET search_vector = 
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B');
```

---

## Ranking and Relevance

### ts_rank

```sql
-- Basic ranking
SELECT 
    name,
    ts_rank(search_vector, query) AS rank
FROM products, websearch_to_tsquery('english', 'wireless mouse') query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- Ranking with normalization
SELECT 
    name,
    ts_rank(search_vector, query, 32) AS rank  -- 32 = divide by document length
FROM products, websearch_to_tsquery('english', 'wireless') query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- Normalization options:
-- 0: Default (ignore length)
-- 1: Divide by 1 + log(document length)
-- 2: Divide by document length
-- 4: Divide by mean harmonic distance between extents
-- 8: Divide by number of unique words
-- 16: Divide by 1 + log(number of unique words)
-- 32: Divide by itself + 1
```

### ts_rank_cd (Cover Density)

```sql
-- Considers proximity of matching terms
SELECT 
    name,
    ts_rank_cd(search_vector, query) AS rank
FROM products, to_tsquery('english', 'wireless & mouse') query
WHERE search_vector @@ query
ORDER BY rank DESC;
-- Documents where "wireless" and "mouse" are closer rank higher
```

### Weighted Ranking

```sql
-- Weights: A=1.0, B=0.4, C=0.2, D=0.1 (default)
-- Customize weights
SELECT 
    name,
    ts_rank(
        '{0.1, 0.2, 0.4, 1.0}',  -- D, C, B, A weights
        search_vector, 
        query
    ) AS rank
FROM products, websearch_to_tsquery('english', 'wireless mouse') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

---

## MySQL Full-Text Search

### FULLTEXT Index

```sql
-- Create table with FULLTEXT index
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    FULLTEXT INDEX idx_search (name, description)
) ENGINE=InnoDB;

-- Natural language mode (default)
SELECT * FROM products
WHERE MATCH(name, description) AGAINST('wireless mouse');

-- Boolean mode (operators)
SELECT * FROM products
WHERE MATCH(name, description) AGAINST('+wireless +mouse -gaming' IN BOOLEAN MODE);

-- With relevance score
SELECT 
    name,
    MATCH(name, description) AGAINST('wireless mouse') AS relevance
FROM products
WHERE MATCH(name, description) AGAINST('wireless mouse')
ORDER BY relevance DESC;
```

### MySQL Boolean Operators

```sql
-- + means must have
-- - means must not have
-- * wildcard suffix
-- "" phrase
-- > increase relevance
-- < decrease relevance
-- () grouping

SELECT * FROM products
WHERE MATCH(name, description) AGAINST(
    '+wireless +"optical mouse" -gaming* >ergonomic' IN BOOLEAN MODE
);
```

---

## Text Search Configuration

### Language Configuration

```sql
-- List available configurations
SELECT cfgname FROM pg_ts_config;
-- english, simple, spanish, german, etc.

-- Simple config (no stemming, no stop words)
SELECT to_tsvector('simple', 'The running dogs');
-- Result: 'dogs':3 'running':2 'the':1

-- English config (stemming, stop words removed)
SELECT to_tsvector('english', 'The running dogs');
-- Result: 'dog':3 'run':2
-- "The" removed (stop word), "running" → "run", "dogs" → "dog"
```

### Custom Dictionaries

```sql
-- View what a configuration does
\dF+ english

-- Add synonyms
CREATE TEXT SEARCH DICTIONARY synonyms (
    TEMPLATE = synonym,
    SYNONYMS = my_synonyms  -- File: $SHAREDIR/tsearch_data/my_synonyms.syn
);

-- my_synonyms.syn content:
-- wifi wireless
-- notebook laptop

-- Create custom configuration
CREATE TEXT SEARCH CONFIGURATION custom_english (COPY = english);
ALTER TEXT SEARCH CONFIGURATION custom_english
    ALTER MAPPING FOR asciiword WITH synonyms, english_stem;
```

---

## Highlighting Results

### ts_headline

```sql
-- Highlight matching terms
SELECT 
    name,
    ts_headline(
        'english',
        description,
        websearch_to_tsquery('english', 'wireless mouse'),
        'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15'
    ) AS highlighted
FROM products
WHERE search_vector @@ websearch_to_tsquery('english', 'wireless mouse');

-- Result: "...ergonomic <b>wireless</b> optical <b>mouse</b> with..."
```

### Options for ts_headline

```sql
ts_headline(config, document, query, options)

-- Options:
-- StartSel, StopSel: Markup for matches (default: <b>, </b>)
-- MaxWords: Maximum words to output
-- MinWords: Minimum words to output
-- ShortWord: Minimum word length to show
-- HighlightAll: Show all occurrences (default: just first)
-- MaxFragments: Maximum number of text fragments
-- FragmentDelimiter: String between fragments
```

---

## Common Patterns

### Pattern 1: Search with Autocomplete

```sql
-- Prefix matching for autocomplete
SELECT DISTINCT name
FROM products
WHERE search_vector @@ to_tsquery('simple', 'wir:*')
ORDER BY ts_rank(search_vector, to_tsquery('simple', 'wir:*')) DESC
LIMIT 10;

-- Or with trigram similarity (pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

SELECT name, similarity(name, 'wireles') AS sim
FROM products
WHERE name % 'wireles'  -- Similar enough
ORDER BY sim DESC
LIMIT 10;
```

### Pattern 2: Multi-Field Search with Weights

```sql
-- Search across multiple fields with different importance
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    summary TEXT,
    body TEXT,
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(body, '')), 'C')
    ) STORED
);

CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- Matches in title rank higher than summary, which ranks higher than body
SELECT 
    title,
    ts_headline('english', body, query, 'MaxWords=50') AS snippet,
    ts_rank(search_vector, query) AS rank
FROM articles, websearch_to_tsquery('english', 'database optimization') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Pattern 3: Faceted Search

```sql
-- Combine full-text with filters
SELECT 
    p.name,
    c.name AS category,
    ts_rank(p.search_vector, query) AS rank
FROM products p
JOIN categories c ON p.category_id = c.id
CROSS JOIN websearch_to_tsquery('english', 'wireless') query
WHERE p.search_vector @@ query
  AND p.price BETWEEN 20 AND 100
  AND c.name = 'Electronics'
ORDER BY rank DESC;

-- Count by category (facets)
SELECT 
    c.name AS category,
    COUNT(*) AS count
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.search_vector @@ websearch_to_tsquery('english', 'wireless')
GROUP BY c.name
ORDER BY count DESC;
```

---

## Performance Optimization

### Index Maintenance

```sql
-- Check index size
SELECT 
    indexrelname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE indexrelname LIKE '%search%';

-- Reindex if bloated
REINDEX INDEX idx_products_search;

-- Analyze for query planner
ANALYZE products;
```

### Query Optimization

```sql
-- Use LIMIT with ORDER BY for top results
SELECT name, ts_rank(search_vector, query) AS rank
FROM products, websearch_to_tsquery('english', 'wireless mouse') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;

-- Avoid ts_headline on many rows (compute after limit)
WITH ranked AS (
    SELECT id, name, description, ts_rank(search_vector, query) AS rank
    FROM products, websearch_to_tsquery('english', 'wireless mouse') query
    WHERE search_vector @@ query
    ORDER BY rank DESC
    LIMIT 20
)
SELECT 
    name,
    ts_headline('english', description, websearch_to_tsquery('english', 'wireless mouse')) AS snippet
FROM ranked;
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Store tsvector in dedicated column**: Avoid computing on every query
- **Use GIN index**: Essential for performance
- **Apply weights to fields**: Title should rank higher than body
- **Use websearch_to_tsquery**: User-friendly syntax
- **Compute ts_headline after filtering**: It's expensive

### ❌ Avoid:
- **Computing tsvector in WHERE**: No index usage
- **Large ts_headline results**: Limit with MaxWords
- **Ignoring stemming issues**: Test with your actual queries
- **Skipping ANALYZE**: Bad statistics = poor plans

---

## Exercises

### Exercise 1: Basic Full-Text Search 🟢

Create a searchable blog posts table:
1. Create table with title, content, and auto-updated search vector
2. Add GIN index
3. Insert 3 sample posts
4. Search for posts containing "database"

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Create table
CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', title), 'A') ||
        setweight(to_tsvector('english', content), 'B')
    ) STORED
);

-- 2. Add GIN index
CREATE INDEX idx_posts_search ON blog_posts USING GIN (search_vector);

-- 3. Insert sample posts
INSERT INTO blog_posts (title, content) VALUES
('Introduction to Databases', 'This post covers the basics of relational databases including tables, keys, and relationships.'),
('Advanced SQL Techniques', 'Learn about window functions, CTEs, and subqueries for complex data analysis.'),
('Database Performance Tuning', 'Optimize your database queries with proper indexing, query analysis, and configuration.');

-- 4. Search for "database"
SELECT 
    title,
    ts_headline('english', content, query, 'MaxWords=30') AS snippet,
    ts_rank(search_vector, query) AS rank
FROM blog_posts, websearch_to_tsquery('english', 'database') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

</details>

---

### Exercise 2: Advanced Search Features 🟡

Extend the blog search to:
1. Support phrase search ("relational database")
2. Exclude posts with certain terms
3. Implement autocomplete for titles
4. Show result count per month

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Phrase search
SELECT title FROM blog_posts
WHERE search_vector @@ phraseto_tsquery('english', 'relational database');

-- Or with websearch (quotes = phrase)
SELECT title FROM blog_posts
WHERE search_vector @@ websearch_to_tsquery('english', '"relational database"');

-- 2. Exclude terms
SELECT title FROM blog_posts
WHERE search_vector @@ websearch_to_tsquery('english', 'database -performance');

-- Or Boolean mode
SELECT title FROM blog_posts
WHERE search_vector @@ to_tsquery('english', 'database & !performance');

-- 3. Autocomplete for titles
-- First, add trigram support
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_posts_title_trgm ON blog_posts USING GIN (title gin_trgm_ops);

-- Autocomplete query
SELECT title
FROM blog_posts
WHERE title ILIKE 'int%'  -- Prefix match
   OR title % 'intro'     -- Fuzzy match (typos)
ORDER BY similarity(title, 'intro') DESC
LIMIT 5;

-- Or with text search prefix
SELECT DISTINCT title
FROM blog_posts
WHERE search_vector @@ to_tsquery('simple', 'intro:*')
LIMIT 5;

-- 4. Result count per month
SELECT 
    date_trunc('month', created_at) AS month,
    COUNT(*) AS post_count
FROM blog_posts
WHERE search_vector @@ websearch_to_tsquery('english', 'database')
GROUP BY date_trunc('month', created_at)
ORDER BY month DESC;
```

</details>

---

### Exercise 3: Multi-Entity Search 🔴

**Scenario:** Build a unified search across products, articles, and users.

Requirements:
1. Search should return results from all three tables
2. Results should be ranked by relevance
3. Results should show entity type and relevant preview
4. Support pagination

<details>
<summary>✅ Solution</summary>

```sql
-- Setup tables (simplified)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED
);

CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    body TEXT,
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(body, '')), 'B')
    ) STORED
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    bio TEXT,
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(bio, '')), 'B')
    ) STORED
);

-- Create indexes
CREATE INDEX idx_products_fts ON products USING GIN (search_vector);
CREATE INDEX idx_articles_fts ON articles USING GIN (search_vector);
CREATE INDEX idx_users_fts ON users USING GIN (search_vector);

-- Unified search with pagination
WITH search_results AS (
    SELECT 
        'product' AS entity_type,
        id,
        name AS title,
        description AS preview_text,
        search_vector,
        ts_rank(search_vector, query) AS rank
    FROM products, websearch_to_tsquery('english', 'database') query
    WHERE search_vector @@ query
    
    UNION ALL
    
    SELECT 
        'article' AS entity_type,
        id,
        title,
        body AS preview_text,
        search_vector,
        ts_rank(search_vector, query) AS rank
    FROM articles, websearch_to_tsquery('english', 'database') query
    WHERE search_vector @@ query
    
    UNION ALL
    
    SELECT 
        'user' AS entity_type,
        id,
        name AS title,
        bio AS preview_text,
        search_vector,
        ts_rank(search_vector, query) AS rank
    FROM users, websearch_to_tsquery('english', 'database') query
    WHERE search_vector @@ query
),
ranked AS (
    SELECT 
        entity_type,
        id,
        title,
        preview_text,
        rank,
        ROW_NUMBER() OVER (ORDER BY rank DESC) AS rn
    FROM search_results
)
SELECT 
    entity_type,
    id,
    title,
    ts_headline(
        'english', 
        preview_text, 
        websearch_to_tsquery('english', 'database'),
        'MaxWords=30'
    ) AS snippet,
    rank
FROM ranked
WHERE rn BETWEEN 1 AND 10  -- Page 1, 10 results
ORDER BY rank DESC;

-- For page 2: WHERE rn BETWEEN 11 AND 20

-- Wrap in a function for reuse
CREATE OR REPLACE FUNCTION unified_search(
    search_term TEXT,
    page_num INT DEFAULT 1,
    page_size INT DEFAULT 10
)
RETURNS TABLE (
    entity_type TEXT,
    id INT,
    title VARCHAR,
    snippet TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    WITH search_results AS (
        -- ... (same CTE as above)
    )
    SELECT ...
    WHERE rn BETWEEN ((page_num - 1) * page_size + 1) AND (page_num * page_size);
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM unified_search('database', 1, 10);
```

</details>

---

## Key Takeaways

- 🔍 **tsvector + tsquery**: PostgreSQL's FTS foundation
- 📊 **GIN index**: Essential for fast full-text queries
- ⚖️ **Weights (A,B,C,D)**: Prioritize title over body
- 📝 **websearch_to_tsquery**: User-friendly query parsing
- 🌐 **Language configs**: Enable stemming and stop words
- 💡 **ts_headline**: Show context, but compute after LIMIT

---

## Related Topics

- [Indexing Deep Dive](/databases/07-indexing-deep-dive.md) - GIN index internals
- [JSON and Document Storage](/databases/16-json-and-document-storage.md) - Searching JSON text
- [Query Optimization](/databases/09-query-optimization.md) - Optimizing search queries
