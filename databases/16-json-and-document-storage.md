# JSON and Document Storage

[← Back to Index](00-index.md)

---

## Overview

Modern relational databases support JSON/document storage, combining the flexibility of NoSQL with the power of SQL. This enables schema-flexible data, API response caching, and handling semi-structured data without sacrificing ACID guarantees.

### When This Matters Most
- Storing flexible/dynamic attributes
- Caching external API responses
- Event data with varying schemas
- Bridging SQL and NoSQL patterns

---

## JSON vs JSONB

| Feature | JSON | JSONB |
|---------|------|-------|
| **Storage** | Text (as-is) | Binary (parsed) |
| **Duplicate keys** | Preserved | Last value wins |
| **Key order** | Preserved | Not preserved |
| **Whitespace** | Preserved | Removed |
| **Indexing** | No | Yes (GIN, btree) |
| **Query speed** | Slower (parse each time) | Faster |
| **Insert speed** | Faster | Slower (parsing overhead) |

```sql
-- PostgreSQL: Prefer JSONB for most use cases
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    attributes JSONB DEFAULT '{}'  -- Use JSONB
);

-- MySQL: JSON type (binary storage, similar to JSONB)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    attributes JSON
);
```

**Recommendation:** Use **JSONB** (PostgreSQL) or **JSON** (MySQL 5.7+) for queryable data.

---

## Basic Operations

### Inserting JSON

```sql
-- Direct JSON literal
INSERT INTO products (name, attributes)
VALUES ('Laptop', '{"brand": "Dell", "specs": {"ram": 16, "storage": 512}}');

-- Using JSON functions
INSERT INTO products (name, attributes)
VALUES ('Phone', jsonb_build_object(
    'brand', 'Apple',
    'specs', jsonb_build_object('storage', 256)
));
```

### Accessing JSON Data

```sql
-- PostgreSQL operators
SELECT 
    name,
    attributes -> 'brand' AS brand_json,        -- Returns JSON: "Dell"
    attributes ->> 'brand' AS brand_text,       -- Returns text: Dell
    attributes -> 'specs' -> 'ram' AS ram_json, -- Nested: 16 (as JSON)
    attributes -> 'specs' ->> 'ram' AS ram_text -- Nested: 16 (as text)
FROM products;

-- Path operator (PostgreSQL)
SELECT attributes #>> '{specs,ram}' AS ram FROM products;

-- MySQL syntax
SELECT 
    name,
    JSON_EXTRACT(attributes, '$.brand') AS brand,
    attributes->>'$.brand' AS brand_text,
    attributes->>'$.specs.ram' AS ram
FROM products;
```

### Operator Reference

| Operator | PostgreSQL | MySQL | Returns |
|----------|------------|-------|---------|
| Get field | `->` | `->` | JSON |
| Get field as text | `->>` | `->>` | Text |
| Get path | `#>` | N/A | JSON |
| Get path as text | `#>>` | N/A | Text |
| Contains | `@>` | N/A | Boolean |
| Exists key | `?` | N/A | Boolean |

---

## Querying JSON

### Filtering

```sql
-- PostgreSQL: Filter by JSON value
SELECT * FROM products 
WHERE attributes ->> 'brand' = 'Dell';

-- Filter by nested value (cast for comparison)
SELECT * FROM products 
WHERE (attributes -> 'specs' ->> 'ram')::int >= 16;

-- Contains operator (uses GIN index!)
SELECT * FROM products 
WHERE attributes @> '{"brand": "Dell"}';

-- Key exists
SELECT * FROM products 
WHERE attributes ? 'brand';

-- Any of these keys exist
SELECT * FROM products 
WHERE attributes ?| array['warranty', 'support'];

-- All of these keys exist
SELECT * FROM products 
WHERE attributes ?& array['brand', 'specs'];

-- MySQL: Filter
SELECT * FROM products 
WHERE JSON_EXTRACT(attributes, '$.brand') = 'Dell';

-- MySQL: Contains
SELECT * FROM products
WHERE JSON_CONTAINS(attributes, '"Dell"', '$.brand');
```

### JSON Arrays

```sql
-- Sample data
INSERT INTO products (name, attributes) VALUES
('Multi-color Shirt', '{"colors": ["red", "blue", "green"], "sizes": ["S", "M", "L"]}');

-- PostgreSQL: Array access
SELECT 
    attributes -> 'colors' -> 0 AS first_color,  -- "red"
    attributes -> 'colors' -> -1 AS last_color   -- "green" (negative index)
FROM products;

-- Check if array contains value
SELECT * FROM products 
WHERE attributes -> 'colors' ? 'blue';

-- Or using containment
SELECT * FROM products 
WHERE attributes @> '{"colors": ["blue"]}';

-- Unnest array elements
SELECT 
    name,
    jsonb_array_elements_text(attributes -> 'colors') AS color
FROM products;
-- Returns one row per color

-- MySQL: Array functions
SELECT 
    JSON_EXTRACT(attributes, '$.colors[0]') AS first_color,
    JSON_CONTAINS(attributes, '"blue"', '$.colors') AS has_blue
FROM products;
```

---

## Modifying JSON

### Updating Fields

```sql
-- PostgreSQL: Set a field
UPDATE products 
SET attributes = jsonb_set(attributes, '{brand}', '"Lenovo"')
WHERE id = 1;

-- Set nested field
UPDATE products 
SET attributes = jsonb_set(attributes, '{specs,ram}', '32')
WHERE id = 1;

-- Create path if not exists (4th argument = true)
UPDATE products 
SET attributes = jsonb_set(attributes, '{specs,gpu}', '"RTX 4080"', true)
WHERE id = 1;

-- Remove a field
UPDATE products 
SET attributes = attributes - 'old_field'
WHERE id = 1;

-- Remove nested field
UPDATE products 
SET attributes = attributes #- '{specs,old_spec}'
WHERE id = 1;

-- MySQL: Set field
UPDATE products 
SET attributes = JSON_SET(attributes, '$.brand', 'Lenovo')
WHERE id = 1;

-- MySQL: Remove field
UPDATE products 
SET attributes = JSON_REMOVE(attributes, '$.old_field')
WHERE id = 1;
```

### Concatenating/Merging

```sql
-- PostgreSQL: Merge two JSONB objects
UPDATE products 
SET attributes = attributes || '{"warranty": "2 years", "support": true}'
WHERE id = 1;
-- || performs shallow merge, later values override

-- Deep merge (custom function needed for recursive)
-- Shallow merge overwrites nested objects entirely

-- MySQL: Merge
UPDATE products 
SET attributes = JSON_MERGE_PATCH(attributes, '{"warranty": "2 years"}')
WHERE id = 1;
```

---

## Indexing JSON

### GIN Index (PostgreSQL)

```sql
-- Index all keys and values (most flexible)
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- Now these queries use the index:
SELECT * FROM products WHERE attributes @> '{"brand": "Dell"}';
SELECT * FROM products WHERE attributes ? 'brand';
SELECT * FROM products WHERE attributes ?| array['brand', 'specs'];

-- More specific index (jsonb_path_ops) - faster, less flexible
CREATE INDEX idx_products_attrs_path ON products 
USING GIN (attributes jsonb_path_ops);
-- Only supports @> operator, but smaller and faster
```

### Expression Index on Specific Fields

```sql
-- PostgreSQL: Index a specific JSON field
CREATE INDEX idx_products_brand ON products ((attributes ->> 'brand'));

-- Now this is fast:
SELECT * FROM products WHERE attributes ->> 'brand' = 'Dell';

-- Index with casting
CREATE INDEX idx_products_ram ON products 
    (((attributes -> 'specs' ->> 'ram')::int));

-- MySQL: Generated column + index
ALTER TABLE products 
ADD COLUMN brand VARCHAR(100) GENERATED ALWAYS AS (attributes->>'$.brand') STORED;
CREATE INDEX idx_brand ON products (brand);
```

### Which Index to Use?

| Query Pattern | Index Type |
|---------------|------------|
| `@>` containment | GIN |
| `?` key exists | GIN |
| `->>` = specific value | Expression (btree) |
| Numeric comparisons | Expression (btree) |
| Full-text on JSON string | GIN with to_tsvector |

---

## JSON Aggregation

### Building JSON from Rows

```sql
-- PostgreSQL: Aggregate rows into JSON array
SELECT jsonb_agg(
    jsonb_build_object('id', id, 'name', name)
) AS all_products
FROM products;
-- Returns: [{"id": 1, "name": "Laptop"}, {"id": 2, "name": "Phone"}]

-- Build object from key-value pairs
SELECT jsonb_object_agg(id, name) AS product_map
FROM products;
-- Returns: {"1": "Laptop", "2": "Phone"}

-- MySQL equivalent
SELECT JSON_ARRAYAGG(
    JSON_OBJECT('id', id, 'name', name)
) AS all_products
FROM products;
```

### Expanding JSON to Rows

```sql
-- PostgreSQL: Turn JSON array into rows
SELECT 
    p.name,
    color
FROM products p,
     jsonb_array_elements_text(p.attributes -> 'colors') AS color;

-- Turn JSON object into key-value rows
SELECT 
    p.name,
    key,
    value
FROM products p,
     jsonb_each(p.attributes) AS kv(key, value);

-- MySQL: JSON_TABLE for structured extraction
SELECT 
    p.name,
    specs.*
FROM products p,
     JSON_TABLE(
         p.attributes,
         '$.specs' COLUMNS (
             ram INT PATH '$.ram',
             storage INT PATH '$.storage'
         )
     ) AS specs;
```

---

## JSON Schema Validation

### PostgreSQL (with check constraint)

```sql
-- Validate JSON structure with CHECK constraint
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    
    -- Require certain fields
    CONSTRAINT valid_payload CHECK (
        payload ? 'timestamp' AND
        payload ? 'user_id' AND
        jsonb_typeof(payload -> 'timestamp') = 'string' AND
        jsonb_typeof(payload -> 'user_id') = 'number'
    )
);

-- This fails:
INSERT INTO events (event_type, payload)
VALUES ('click', '{"user_id": "abc"}');  -- user_id should be number
-- ERROR: new row violates check constraint "valid_payload"
```

### MySQL (JSON Schema)

```sql
-- MySQL 8.0.17+: JSON Schema validation
ALTER TABLE events ADD CONSTRAINT check_payload
CHECK (
    JSON_SCHEMA_VALID('{
        "type": "object",
        "required": ["timestamp", "user_id"],
        "properties": {
            "timestamp": {"type": "string"},
            "user_id": {"type": "integer"}
        }
    }', payload)
);
```

---

## Common Patterns

### Pattern 1: Flexible Attributes

```sql
-- Base table with common fields, JSON for variable attributes
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    attributes JSONB DEFAULT '{}'
);

-- Electronics have: brand, specs
INSERT INTO products (category, name, price, attributes)
VALUES ('electronics', 'Laptop', 999.99, 
        '{"brand": "Dell", "specs": {"ram": 16, "storage": 512}}');

-- Clothing has: size, color, material
INSERT INTO products (category, name, price, attributes)
VALUES ('clothing', 'T-Shirt', 29.99,
        '{"size": "M", "color": "blue", "material": "cotton"}');
```

### Pattern 2: Audit Log

```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    action VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Trigger captures changes as JSON
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END,
        current_setting('app.user_id', true)::int
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

### Pattern 3: API Response Cache

```sql
CREATE TABLE api_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    response JSONB NOT NULL,
    headers JSONB,
    cached_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

-- Store response
INSERT INTO api_cache (cache_key, response, expires_at)
VALUES ('user:123:profile', '{"name": "Alice", "email": "..."}', NOW() + INTERVAL '1 hour')
ON CONFLICT (cache_key) 
DO UPDATE SET response = EXCLUDED.response, expires_at = EXCLUDED.expires_at;

-- Retrieve if not expired
SELECT response FROM api_cache 
WHERE cache_key = 'user:123:profile' AND expires_at > NOW();
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Use JSONB over JSON**: Better performance, indexable
- **Index frequently queried paths**: Expression or GIN indexes
- **Validate structure**: CHECK constraints or application validation
- **Keep searchable data in columns**: Don't bury important data in JSON
- **Use for truly variable data**: Not as a substitute for proper schema

### ❌ Avoid:
- **Storing everything as JSON**: Lose type safety and constraints
- **Deep nesting**: Hard to query and index
- **Large JSON documents**: Consider separate tables
- **Querying without indexes**: Full scans are slow
- **JSON for relationships**: Use proper foreign keys

---

## Exercises

### Exercise 1: JSON Queries 🟢

Given this table:

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT,
    details JSONB
);

INSERT INTO orders (customer_id, details) VALUES
(1, '{"items": [{"sku": "A1", "qty": 2, "price": 10.00}, {"sku": "B2", "qty": 1, "price": 25.00}], "shipping": {"method": "express", "address": {"city": "NYC"}}}'),
(2, '{"items": [{"sku": "C3", "qty": 5, "price": 5.00}], "shipping": {"method": "standard", "address": {"city": "LA"}}}');
```

Write queries to:
1. Get all orders shipping to NYC
2. Find orders with express shipping
3. Calculate total items per order

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Orders shipping to NYC
SELECT * FROM orders 
WHERE details -> 'shipping' -> 'address' ->> 'city' = 'NYC';

-- Or using containment:
SELECT * FROM orders 
WHERE details @> '{"shipping": {"address": {"city": "NYC"}}}';

-- 2. Express shipping orders
SELECT * FROM orders 
WHERE details -> 'shipping' ->> 'method' = 'express';

-- Or:
SELECT * FROM orders 
WHERE details @> '{"shipping": {"method": "express"}}';

-- 3. Total items per order
SELECT 
    id,
    customer_id,
    (SELECT SUM((item ->> 'qty')::int) 
     FROM jsonb_array_elements(details -> 'items') AS item
    ) AS total_items
FROM orders;

-- Or with lateral join:
SELECT 
    o.id,
    SUM((item ->> 'qty')::int) AS total_items
FROM orders o,
     jsonb_array_elements(o.details -> 'items') AS item
GROUP BY o.id;
```

</details>

---

### Exercise 2: JSON Modification 🟡

Using the orders table:
1. Add a discount field to order 1
2. Change shipping method to "overnight" for order 2
3. Add a new item to order 1's items array
4. Remove the shipping address from all orders

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Add discount field
UPDATE orders 
SET details = jsonb_set(details, '{discount}', '15.00')
WHERE id = 1;

-- 2. Change shipping method
UPDATE orders 
SET details = jsonb_set(details, '{shipping,method}', '"overnight"')
WHERE id = 2;

-- 3. Add new item to array
UPDATE orders 
SET details = jsonb_set(
    details, 
    '{items}', 
    (details -> 'items') || '[{"sku": "D4", "qty": 3, "price": 12.00}]'::jsonb
)
WHERE id = 1;

-- Or using array append:
UPDATE orders 
SET details = jsonb_insert(
    details,
    '{items, -1}',  -- After last element
    '{"sku": "D4", "qty": 3, "price": 12.00}',
    true  -- Insert after
)
WHERE id = 1;

-- 4. Remove shipping address from all
UPDATE orders 
SET details = details #- '{shipping,address}';

-- Verify changes
SELECT id, jsonb_pretty(details) FROM orders;
```

</details>

---

### Exercise 3: Schema Design 🔴

**Scenario:** Design a product catalog that supports:
- Multiple categories with different attributes
- Electronics: brand, specs (CPU, RAM, storage), warranty
- Clothing: size, color, material, care instructions
- Books: author, ISBN, pages, publisher

Implement:
1. Table schema with validation
2. Indexes for common queries
3. Query to find all electronics with RAM >= 16GB

<details>
<summary>✅ Solution</summary>

```sql
-- 1. Table schema with validation
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL CHECK (category IN ('electronics', 'clothing', 'books')),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Category-specific validation
    CONSTRAINT valid_electronics CHECK (
        category != 'electronics' OR (
            attributes ? 'brand' AND
            attributes ? 'specs' AND
            attributes -> 'specs' ? 'ram'
        )
    ),
    CONSTRAINT valid_clothing CHECK (
        category != 'clothing' OR (
            attributes ? 'size' AND
            attributes ? 'color'
        )
    ),
    CONSTRAINT valid_books CHECK (
        category != 'books' OR (
            attributes ? 'author' AND
            attributes ? 'isbn'
        )
    )
);

-- 2. Indexes for common queries

-- GIN index for general JSONB queries
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- Expression indexes for specific fields
CREATE INDEX idx_products_brand ON products ((attributes ->> 'brand'))
WHERE category = 'electronics';

CREATE INDEX idx_products_ram ON products (((attributes -> 'specs' ->> 'ram')::int))
WHERE category = 'electronics';

CREATE INDEX idx_products_author ON products ((attributes ->> 'author'))
WHERE category = 'books';

CREATE INDEX idx_products_size ON products ((attributes ->> 'size'))
WHERE category = 'clothing';

-- Composite for category queries
CREATE INDEX idx_products_category_price ON products (category, price);

-- 3. Sample data
INSERT INTO products (category, name, price, attributes) VALUES
('electronics', 'Gaming Laptop', 1499.99, 
 '{"brand": "ASUS", "specs": {"cpu": "i7", "ram": 32, "storage": 1024}, "warranty": "2 years"}'),
('electronics', 'Budget Laptop', 599.99,
 '{"brand": "Acer", "specs": {"cpu": "i5", "ram": 8, "storage": 256}, "warranty": "1 year"}'),
('clothing', 'Cotton T-Shirt', 29.99,
 '{"size": "M", "color": "blue", "material": "100% cotton", "care": ["machine wash", "tumble dry"]}'),
('books', 'Database Design', 49.99,
 '{"author": "Jane Smith", "isbn": "978-1234567890", "pages": 450, "publisher": "Tech Books"}');

-- 4. Query: Electronics with RAM >= 16GB
SELECT 
    name,
    price,
    attributes ->> 'brand' AS brand,
    attributes -> 'specs' ->> 'ram' AS ram_gb
FROM products
WHERE category = 'electronics'
  AND (attributes -> 'specs' ->> 'ram')::int >= 16
ORDER BY price;

-- Using GIN index (containment won't work for >= comparison)
-- The expression index idx_products_ram handles this efficiently
```

</details>

---

## Key Takeaways

- 🗄️ **JSONB > JSON**: Use JSONB for queryable data in PostgreSQL
- 🔍 **Index appropriately**: GIN for flexibility, expression for specific fields
- 📋 **Validate structure**: CHECK constraints prevent bad data
- 🔗 **Combine SQL + JSON**: Use relational columns for indexed/critical data
- 📦 **Good for flexible schemas**: Product attributes, event payloads, configs
- ⚠️ **Not a replacement for schema**: Don't bury important data in JSON

---

## Related Topics

- [Full-Text Search](17-full-text-search.md) - Searching within JSON text
- [Indexing Deep Dive](07-indexing-deep-dive.md) - GIN index details
- [Database Design Principles](01-database-design-principles.md) - When to use JSON
