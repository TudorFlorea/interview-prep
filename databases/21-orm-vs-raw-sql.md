# ORM vs Raw SQL

[← Back to Index](/databases/00-index.md)

---

## Overview

Object-Relational Mappers (ORMs) abstract database operations into object-oriented code, while raw SQL provides direct database access. Both have their place—understanding their trade-offs helps you choose the right approach for each situation.

### When This Matters Most
- Designing application architecture
- Performance-critical code paths
- Team skill composition
- Long-term maintainability

---

## ORM Overview

### What ORMs Do

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ORM: Object-Relational Mapping                                          │
│                                                                          │
│  Application Layer              ORM Layer              Database Layer    │
│  ┌──────────────┐         ┌──────────────────┐       ┌──────────────┐   │
│  │   Objects    │         │                  │       │              │   │
│  │              │ ◄────►  │  Maps between    │ ◄───► │   Tables     │   │
│  │  user.name   │         │  objects & rows  │       │              │   │
│  │  user.save() │         │                  │       │  SQL queries │   │
│  └──────────────┘         └──────────────────┘       └──────────────┘   │
│                                                                          │
│  ORM handles:                                                            │
│  - SQL generation                                                        │
│  - Type conversion                                                       │
│  - Relationship loading                                                  │
│  - Change tracking                                                       │
│  - Connection pooling                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Popular ORMs by Language

| Language | ORM | Type |
|----------|-----|------|
| **Python** | SQLAlchemy | Full-featured |
| **Python** | Django ORM | Framework-integrated |
| **JavaScript** | Prisma | Type-safe, modern |
| **JavaScript** | TypeORM | Decorator-based |
| **JavaScript** | Sequelize | Traditional |
| **Java** | Hibernate | Enterprise standard |
| **C#** | Entity Framework | Microsoft's ORM |
| **Ruby** | ActiveRecord | Rails integrated |
| **Go** | GORM | Popular Go ORM |

---

## Side-by-Side Comparison

### Basic CRUD Operations

```python
# === RAW SQL (Python/psycopg2) ===

# Create
cursor.execute("""
    INSERT INTO users (name, email, created_at)
    VALUES (%s, %s, NOW())
    RETURNING id
""", ('Alice', 'alice@example.com'))
user_id = cursor.fetchone()[0]

# Read
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
user = cursor.fetchone()  # tuple: (1, 'Alice', 'alice@example.com', ...)

# Update
cursor.execute("""
    UPDATE users SET name = %s WHERE id = %s
""", ('Alicia', user_id))

# Delete
cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))

# === ORM (SQLAlchemy) ===

# Create
user = User(name='Alice', email='alice@example.com')
session.add(user)
session.commit()  # user.id is now populated

# Read
user = session.query(User).get(user_id)  # User object

# Update
user.name = 'Alicia'
session.commit()

# Delete
session.delete(user)
session.commit()
```

### Queries with Joins

```python
# === RAW SQL ===
cursor.execute("""
    SELECT u.id, u.name, COUNT(o.id) as order_count, SUM(o.total) as total_spent
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.status = 'active'
    GROUP BY u.id, u.name
    HAVING COUNT(o.id) > 5
    ORDER BY total_spent DESC
    LIMIT 10
""")
results = cursor.fetchall()

# === ORM (SQLAlchemy) ===
results = (
    session.query(
        User.id,
        User.name,
        func.count(Order.id).label('order_count'),
        func.sum(Order.total).label('total_spent')
    )
    .outerjoin(Order)
    .filter(User.status == 'active')
    .group_by(User.id, User.name)
    .having(func.count(Order.id) > 5)
    .order_by(desc('total_spent'))
    .limit(10)
    .all()
)

# === ORM (Django) ===
results = (
    User.objects
    .filter(status='active')
    .annotate(
        order_count=Count('orders'),
        total_spent=Sum('orders__total')
    )
    .filter(order_count__gt=5)
    .order_by('-total_spent')
    [:10]
)
```

### Complex Queries

```python
# === RAW SQL ===
cursor.execute("""
    WITH monthly_sales AS (
        SELECT 
            DATE_TRUNC('month', order_date) as month,
            product_id,
            SUM(quantity) as units_sold,
            SUM(quantity * unit_price) as revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.order_date >= NOW() - INTERVAL '12 months'
        GROUP BY 1, 2
    ),
    ranked AS (
        SELECT 
            *,
            ROW_NUMBER() OVER (PARTITION BY month ORDER BY revenue DESC) as rank
        FROM monthly_sales
    )
    SELECT r.*, p.name as product_name
    FROM ranked r
    JOIN products p ON r.product_id = p.id
    WHERE rank &lt;= 5
    ORDER BY month DESC, rank
""")
top_products_by_month = cursor.fetchall()

# === ORM ===
# This is where ORMs struggle - often best to use raw SQL
results = session.execute(text("""
    WITH monthly_sales AS (...)
    ...
""")).fetchall()

# Or construct using ORM primitives (verbose and less readable)
```

---

## The N+1 Problem

The most common ORM performance pitfall.

```python
# ❌ N+1 Problem: 1 query for users + N queries for orders
users = session.query(User).all()  # 1 query
for user in users:
    print(user.orders)  # N queries (one per user!)

# Total: 101 queries for 100 users

# ✅ Solution 1: Eager loading (joinedload)
users = session.query(User).options(joinedload(User.orders)).all()
# 1 query with JOIN

# ✅ Solution 2: Subquery loading
users = session.query(User).options(subqueryload(User.orders)).all()
# 2 queries total: one for users, one for all orders

# ✅ Solution 3: Raw SQL if complex
users_with_orders = session.execute(text("""
    SELECT u.*, 
           json_agg(o.*) as orders
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    GROUP BY u.id
""")).fetchall()
```

### Detecting N+1 in Development

```python
# SQLAlchemy: Log all queries
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Django: django-debug-toolbar or
from django.db import connection
print(len(connection.queries))  # Check query count

# Pytest plugin: pytest-django with --fail-on-template-vars
```

---

## When to Use Each

### Use ORM When:

| Scenario | Why ORM Works |
|----------|--------------|
| **Standard CRUD** | Clean, less boilerplate |
| **Simple queries** | Readable, maintainable |
| **Rapid development** | Less code to write |
| **Schema is evolving** | Migrations, model changes |
| **Team knows ORM well** | Productivity |
| **Type safety matters** | Compile-time checks |

### Use Raw SQL When:

| Scenario | Why Raw SQL Works |
|----------|------------------|
| **Complex reports** | CTEs, window functions |
| **Performance-critical** | Hand-optimized queries |
| **Bulk operations** | Batch INSERT/UPDATE |
| **Database-specific features** | JSON, full-text, etc. |
| **Legacy database** | Unusual schema |
| **Team knows SQL well** | Expertise |

---

## Hybrid Approach

Best of both worlds.

```python
# === SQLAlchemy: ORM for simple, raw for complex ===

# ORM for CRUD
user = User(name='Alice')
session.add(user)
session.commit()

# Raw SQL for complex queries
from sqlalchemy import text

result = session.execute(text("""
    WITH monthly_stats AS (...)
    SELECT ...
"""), {'user_id': user.id}).fetchall()

# Map raw results to objects if needed
from collections import namedtuple
MonthlyStats = namedtuple('MonthlyStats', ['month', 'revenue', 'orders'])
stats = [MonthlyStats(*row) for row in result]

# === Django: QuerySet for simple, raw() for complex ===

# ORM
active_users = User.objects.filter(status='active')

# Raw SQL with model mapping
users = User.objects.raw("""
    SELECT * FROM users 
    WHERE id IN (
        SELECT user_id FROM orders 
        GROUP BY user_id 
        HAVING SUM(total) > 1000
    )
""")

# Completely raw (no model)
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT ...")
    results = cursor.fetchall()
```

---

## Query Builders (Middle Ground)

More control than ORM, more abstraction than raw SQL.

```python
# === SQLAlchemy Core (not ORM) ===
from sqlalchemy import select, func

query = (
    select(users.c.name, func.count(orders.c.id))
    .select_from(users.join(orders))
    .group_by(users.c.name)
)
result = connection.execute(query).fetchall()

# === Knex.js (JavaScript) ===
const results = await knex('users')
    .select('users.name', knex.raw('COUNT(orders.id) as order_count'))
    .leftJoin('orders', 'users.id', 'orders.user_id')
    .groupBy('users.name');

# === Kysely (TypeScript - type-safe query builder) ===
const result = await db
    .selectFrom('users')
    .innerJoin('orders', 'orders.user_id', 'users.id')
    .select(['users.name', db.fn.count('orders.id').as('orderCount')])
    .groupBy('users.name')
    .execute();
```

---

## Performance Comparison

### Benchmarks (Typical)

| Operation | ORM | Raw SQL | Notes |
|-----------|-----|---------|-------|
| Single INSERT | ~2ms | ~1ms | ORM overhead minimal |
| Bulk INSERT (1000 rows) | ~500ms | ~50ms | Raw SQL 10x faster |
| Simple SELECT | ~2ms | ~1ms | Similar |
| Complex JOIN + aggregation | ~15ms | ~5ms | Raw SQL more efficient |
| N+1 (100 items) | ~200ms | N/A | ORM antipattern |
| Eager loaded (100 items) | ~10ms | ~8ms | Proper ORM usage |

### Optimization Techniques

```python
# === Bulk operations ===

# ❌ ORM slow way
for item in items:
    obj = Model(**item)
    session.add(obj)
session.commit()  # Many individual inserts

# ✅ ORM bulk insert
session.bulk_insert_mappings(Model, items)
session.commit()

# ✅ Raw SQL bulk
from psycopg2.extras import execute_values
execute_values(cursor, "INSERT INTO table (a, b) VALUES %s", data)

# === Select only needed columns ===

# ❌ Loads everything
users = session.query(User).all()

# ✅ Load only what's needed
users = session.query(User.id, User.name).all()

# === Use database for aggregation ===

# ❌ Slow: fetch all, aggregate in Python
orders = session.query(Order).all()
total = sum(o.amount for o in orders)

# ✅ Fast: aggregate in database
total = session.query(func.sum(Order.amount)).scalar()
```

---

## Repository Pattern

Clean architecture approach combining ORM convenience with raw SQL performance.

```python
# repository.py
class UserRepository:
    def __init__(self, session):
        self.session = session
    
    def get_by_id(self, user_id: int) -> User:
        """Simple query - use ORM."""
        return self.session.query(User).get(user_id)
    
    def create(self, name: str, email: str) -> User:
        """Simple insert - use ORM."""
        user = User(name=name, email=email)
        self.session.add(user)
        self.session.commit()
        return user
    
    def get_top_customers(self, limit: int = 10) -> list:
        """Complex query - use raw SQL."""
        return self.session.execute(text("""
            SELECT u.id, u.name, 
                   COUNT(o.id) as order_count,
                   SUM(o.total) as total_spent
            FROM users u
            JOIN orders o ON u.id = o.user_id
            GROUP BY u.id, u.name
            ORDER BY total_spent DESC
            LIMIT :limit
        """), {'limit': limit}).fetchall()
    
    def bulk_create(self, users: list[dict]) -> None:
        """Bulk insert - use raw SQL."""
        self.session.execute(
            text("INSERT INTO users (name, email) VALUES (:name, :email)"),
            users
        )
        self.session.commit()

# Usage
repo = UserRepository(session)
user = repo.get_by_id(1)
top_customers = repo.get_top_customers(limit=5)
```

---

## Common Patterns & Best Practices

### ✅ Do:
- **Use ORM for CRUD**: Reduces boilerplate
- **Use raw SQL for reports**: Complex queries are clearer in SQL
- **Watch for N+1**: Use eager loading
- **Profile in development**: Log and count queries
- **Bulk operations in raw SQL**: 10x faster
- **Keep SQL in repositories**: Centralized, testable

### ❌ Avoid:
- **Dogmatic approaches**: Neither "always ORM" nor "never ORM"
- **Fighting the ORM**: If it's hard, use raw SQL
- **Ignoring generated SQL**: Know what's being executed
- **Loading everything**: Select only needed columns
- **ORM for migrations**: Use dedicated migration tools

---

## Exercises

### Exercise 1: Query Comparison 🟢

Write both ORM (SQLAlchemy) and raw SQL for:
1. Find all orders over $100
2. Get user with their order count

<details>
<summary>✅ Solution</summary>

```python
# 1. Orders over $100

# Raw SQL
cursor.execute("""
    SELECT * FROM orders 
    WHERE total_amount > %s 
    ORDER BY total_amount DESC
""", (100,))
orders = cursor.fetchall()

# ORM
orders = (
    session.query(Order)
    .filter(Order.total_amount > 100)
    .order_by(Order.total_amount.desc())
    .all()
)

# 2. User with order count

# Raw SQL
cursor.execute("""
    SELECT u.id, u.name, u.email, COUNT(o.id) as order_count
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.id = %s
    GROUP BY u.id, u.name, u.email
""", (user_id,))
user_with_count = cursor.fetchone()

# ORM
from sqlalchemy import func

result = (
    session.query(
        User.id, 
        User.name, 
        User.email,
        func.count(Order.id).label('order_count')
    )
    .outerjoin(Order)
    .filter(User.id == user_id)
    .group_by(User.id, User.name, User.email)
    .first()
)
```

</details>

---

### Exercise 2: N+1 Fix 🟡

Fix this N+1 problem:

```python
users = session.query(User).filter(User.status == 'active').all()
for user in users:
    print(f"{user.name}: {len(user.orders)} orders")
    for order in user.orders:
        print(f"  - Order {order.id}: ${order.total}")
```

<details>
<summary>✅ Solution</summary>

```python
# Solution 1: Eager load with joinedload
from sqlalchemy.orm import joinedload

users = (
    session.query(User)
    .filter(User.status == 'active')
    .options(joinedload(User.orders))  # Eager load orders
    .all()
)

# Now this doesn't cause additional queries
for user in users:
    print(f"{user.name}: {len(user.orders)} orders")
    for order in user.orders:
        print(f"  - Order {order.id}: ${order.total}")

# Solution 2: Subquery load (better for many-to-many or large sets)
from sqlalchemy.orm import subqueryload

users = (
    session.query(User)
    .filter(User.status == 'active')
    .options(subqueryload(User.orders))
    .all()
)

# Solution 3: Raw SQL with aggregation (if you only need counts)
results = session.execute(text("""
    SELECT u.id, u.name, COUNT(o.id) as order_count, 
           json_agg(json_build_object('id', o.id, 'total', o.total)) as orders_json
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.status = 'active'
    GROUP BY u.id, u.name
""")).fetchall()

for row in results:
    print(f"{row.name}: {row.order_count} orders")
    for order in row.orders_json:
        print(f"  - Order {order['id']}: ${order['total']}")
```

</details>

---

### Exercise 3: Repository Design 🔴

Design a `ProductRepository` that:
1. Uses ORM for simple CRUD
2. Uses raw SQL for search with ranking
3. Uses raw SQL for bulk price updates
4. Includes proper error handling

<details>
<summary>✅ Solution</summary>

```python
from typing import Optional, List
from dataclasses import dataclass
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

@dataclass
class SearchResult:
    id: int
    name: str
    price: float
    rank: float

class ProductRepository:
    def __init__(self, session: Session):
        self.session = session
    
    # === ORM for CRUD ===
    
    def get_by_id(self, product_id: int) -> Optional[Product]:
        """Get single product by ID."""
        return self.session.query(Product).get(product_id)
    
    def get_by_ids(self, product_ids: List[int]) -> List[Product]:
        """Get multiple products by IDs."""
        return (
            self.session.query(Product)
            .filter(Product.id.in_(product_ids))
            .all()
        )
    
    def create(self, name: str, price: float, description: str = None) -> Product:
        """Create new product."""
        try:
            product = Product(name=name, price=price, description=description)
            self.session.add(product)
            self.session.commit()
            return product
        except IntegrityError as e:
            self.session.rollback()
            raise ValueError(f"Product creation failed: {e}")
    
    def update(self, product_id: int, **kwargs) -> Optional[Product]:
        """Update product fields."""
        product = self.get_by_id(product_id)
        if not product:
            return None
        
        for key, value in kwargs.items():
            if hasattr(product, key):
                setattr(product, key, value)
        
        self.session.commit()
        return product
    
    def delete(self, product_id: int) -> bool:
        """Delete product."""
        product = self.get_by_id(product_id)
        if not product:
            return False
        
        self.session.delete(product)
        self.session.commit()
        return True
    
    # === Raw SQL for complex operations ===
    
    def search(self, query: str, limit: int = 20) -> List[SearchResult]:
        """Full-text search with ranking."""
        results = self.session.execute(text("""
            SELECT 
                id, 
                name, 
                price,
                ts_rank(search_vector, websearch_to_tsquery('english', :query)) as rank
            FROM products
            WHERE search_vector @@ websearch_to_tsquery('english', :query)
            ORDER BY rank DESC
            LIMIT :limit
        """), {'query': query, 'limit': limit}).fetchall()
        
        return [SearchResult(id=r.id, name=r.name, price=r.price, rank=r.rank) 
                for r in results]
    
    def bulk_update_prices(self, updates: List[dict]) -> int:
        """
        Bulk update prices.
        updates: [{'id': 1, 'price': 99.99}, ...]
        """
        if not updates:
            return 0
        
        # Create temp table approach for performance
        result = self.session.execute(text("""
            UPDATE products p
            SET price = u.new_price,
                updated_at = NOW()
            FROM (
                SELECT 
                    (value->>'id')::int as id,
                    (value->>'price')::decimal as new_price
                FROM json_array_elements(:updates::json)
            ) u
            WHERE p.id = u.id
        """), {'updates': json.dumps(updates)})
        
        self.session.commit()
        return result.rowcount
    
    def get_category_stats(self) -> List[dict]:
        """Get statistics by category."""
        results = self.session.execute(text("""
            SELECT 
                c.name as category,
                COUNT(p.id) as product_count,
                AVG(p.price) as avg_price,
                MIN(p.price) as min_price,
                MAX(p.price) as max_price
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id
            GROUP BY c.id, c.name
            ORDER BY product_count DESC
        """)).fetchall()
        
        return [dict(row._mapping) for row in results]


# === Usage Example ===

repo = ProductRepository(session)

# CRUD operations (ORM)
product = repo.create(name="Laptop", price=999.99)
product = repo.update(product.id, price=899.99)
repo.delete(product.id)

# Complex operations (Raw SQL)
search_results = repo.search("wireless mouse")
updated = repo.bulk_update_prices([
    {'id': 1, 'price': 29.99},
    {'id': 2, 'price': 39.99}
])
stats = repo.get_category_stats()
```

</details>

---

## Key Takeaways

- 🔧 **ORM for productivity**: CRUD, simple queries, rapid development
- ⚡ **Raw SQL for performance**: Bulk ops, complex queries, reports
- 🔀 **Hybrid is best**: Use both in the same project
- ⚠️ **Watch for N+1**: Most common ORM performance issue
- 📊 **Profile queries**: Know what SQL is generated
- 🏗️ **Repository pattern**: Clean abstraction for data access

---

## Related Topics

- [Query Optimization](/databases/09-query-optimization.md) - Optimizing generated SQL
- [Performance Tuning](/databases/10-performance-tuning.md) - Connection pooling
- [Security and Access Control](/databases/19-security-and-access-control.md) - Parameterized queries
