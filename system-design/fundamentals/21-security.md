# Security Fundamentals

[← Back to Fundamentals](/system-design/fundamentals/00-index.md)

---

## Overview

Security is not optional—it must be designed into systems from the start. This guide covers authentication, authorization, encryption, and common security patterns essential for system design interviews.

---

## 🔐 Authentication vs Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│              AUTHENTICATION VS AUTHORIZATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Authentication (AuthN): "WHO are you?"                         │
│  ───────────────────────────────────────                        │
│  • Verifying identity                                           │
│  • Login with username/password                                 │
│  • OAuth, SSO                                                   │
│  • API keys                                                     │
│                                                                 │
│  Authorization (AuthZ): "WHAT can you do?"                      │
│  ─────────────────────────────────────────                      │
│  • Checking permissions                                         │
│  • Role-based access (Admin, User, Guest)                      │
│  • Resource-level permissions                                   │
│  • Policy decisions                                             │
│                                                                 │
│  Flow:                                                          │
│  ─────                                                          │
│  User → [AuthN: Valid user?] → [AuthZ: Has permission?] → Resource
│              ↓                        ↓                         │
│          401 Unauthorized        403 Forbidden                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎫 Authentication Methods

### Session-Based Authentication

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION AUTHENTICATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Login                                                       │
│  ─────────                                                      │
│  Client ──[username/password]──► Server                         │
│                                    │                            │
│                              Verify credentials                 │
│                              Create session                     │
│                              Store in Redis/DB                  │
│                                    │                            │
│  Client ◄──[Set-Cookie: sid=abc123]── Server                    │
│                                                                 │
│  2. Subsequent Requests                                         │
│  ───────────────────────                                        │
│  Client ──[Cookie: sid=abc123]──► Server                        │
│                                    │                            │
│                              Lookup session                     │
│                              Verify not expired                 │
│                              Get user data                      │
│                                    │                            │
│  Client ◄──[Response]──────────── Server                        │
│                                                                 │
│  Session Store:                                                 │
│  ┌───────────────────────────────────────────┐                 │
│  │ sid:abc123 → {user_id: 123, role: "admin",│                 │
│  │               expires: 2023-11-02T00:00}  │                 │
│  └───────────────────────────────────────────┘                 │
│                                                                 │
│  ✅ Easy to revoke (delete session)                             │
│  ✅ Server controls session data                                │
│  ❌ Requires session storage (Redis)                            │
│  ❌ Harder to scale (sticky sessions or shared store)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Token-Based Authentication (JWT)

```
┌─────────────────────────────────────────────────────────────────┐
│                    JWT AUTHENTICATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Login                                                       │
│  ─────────                                                      │
│  Client ──[username/password]──► Server                         │
│                                    │                            │
│                              Verify credentials                 │
│                              Create JWT token                   │
│                              (No server storage!)               │
│                                    │                            │
│  Client ◄──[{token: "eyJhbG..."}]── Server                     │
│                                                                 │
│  2. Subsequent Requests                                         │
│  ───────────────────────                                        │
│  Client ──[Authorization: Bearer eyJhbG...]──► Server           │
│                                    │                            │
│                              Verify signature                   │
│                              Check expiry                       │
│                              Extract claims                     │
│                                    │                            │
│  Client ◄──[Response]──────────── Server                        │
│                                                                 │
│  JWT Structure:                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Header.Payload.Signature                                   │ │
│  │                                                            │ │
│  │ Header:  {"alg": "HS256", "typ": "JWT"}                   │ │
│  │ Payload: {"sub": "123", "role": "admin", "exp": 16990...} │ │
│  │ Signature: HMAC-SHA256(header + payload, secret)          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ✅ Stateless (no server storage)                               │
│  ✅ Easy to scale                                               │
│  ✅ Contains claims (self-describing)                           │
│  ❌ Can't revoke until expiry                                   │
│  ❌ Token size can be large                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### OAuth 2.0 / OpenID Connect

```
┌─────────────────────────────────────────────────────────────────┐
│                    OAUTH 2.0 FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User wants to login to App using Google account                │
│                                                                 │
│  ┌────────┐      ┌─────────┐      ┌────────────────┐           │
│  │  User  │      │   App   │      │ Google (AuthZ) │           │
│  └───┬────┘      └────┬────┘      └───────┬────────┘           │
│      │                │                   │                     │
│      │ 1. Click       │                   │                     │
│      │ "Login Google" │                   │                     │
│      │───────────────►│                   │                     │
│      │                │                   │                     │
│      │   2. Redirect to Google            │                     │
│      │◄───────────────────────────────────│                     │
│      │                                    │                     │
│      │──────────────────────────────────►│                     │
│      │   3. User logs in to Google       │                     │
│      │   4. User grants permission       │                     │
│      │◄──────────────────────────────────│                     │
│      │   5. Redirect with auth code      │                     │
│      │                │                   │                     │
│      │───────────────►│                   │                     │
│      │                │   6. Exchange     │                     │
│      │                │   code for token  │                     │
│      │                │──────────────────►│                     │
│      │                │◄──────────────────│                     │
│      │                │   7. Access token │                     │
│      │                │                   │                     │
│      │ 8. Logged in!  │                   │                     │
│      │◄───────────────│                   │                     │
│                                                                 │
│  OAuth 2.0: Authorization (access to resources)                 │
│  OpenID Connect: Authentication layer on top (user identity)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### API Key Authentication

```python
# Simple but limited - good for server-to-server

# Client includes API key in header
# X-API-Key: sk_live_abc123def456

@app.before_request
def verify_api_key():
    api_key = request.headers.get('X-API-Key')
    if not api_key:
        return {"error": "API key required"}, 401
    
    key_data = api_keys_db.get(api_key)
    if not key_data:
        return {"error": "Invalid API key"}, 401
    
    if key_data.is_revoked:
        return {"error": "API key revoked"}, 401
    
    # Set rate limits based on key tier
    g.rate_limit = key_data.rate_limit
    g.client_id = key_data.client_id

# Best practices:
# ✅ Use prefixes: sk_live_, sk_test_
# ✅ Hash keys in database (like passwords)
# ✅ Allow key rotation
# ✅ Scope keys to specific permissions
# ❌ Never embed in client-side code
```

---

## 🛡️ Authorization Patterns

### Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────────┐
│                    RBAC                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Users → Roles → Permissions                                    │
│                                                                 │
│  ┌────────────┐     ┌──────────────┐     ┌─────────────────┐   │
│  │   Users    │     │    Roles     │     │  Permissions    │   │
│  ├────────────┤     ├──────────────┤     ├─────────────────┤   │
│  │ alice      │────►│ admin        │────►│ users:read      │   │
│  │ bob        │     │              │     │ users:write     │   │
│  │            │     │              │     │ orders:read     │   │
│  │            │     │              │     │ orders:write    │   │
│  │            │     │              │     │ admin:access    │   │
│  └────────────┘     ├──────────────┤     ├─────────────────┤   │
│                     │ editor       │────►│ orders:read     │   │
│  ┌────────────┐     │              │     │ orders:write    │   │
│  │ charlie    │────►│              │     │                 │   │
│  └────────────┘     ├──────────────┤     ├─────────────────┤   │
│                     │ viewer       │────►│ orders:read     │   │
│  ┌────────────┐     │              │     │                 │   │
│  │ diana      │────►│              │     │                 │   │
│  └────────────┘     └──────────────┘     └─────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Attribute-Based Access Control (ABAC)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ABAC                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  More flexible than RBAC - decisions based on attributes        │
│                                                                 │
│  Policy Example:                                                │
│  ─────────────────                                              │
│  "Engineers can access documents in their department            │
│   during business hours from company network"                   │
│                                                                 │
│  Attributes checked:                                            │
│  • User: role=engineer, department=engineering                 │
│  • Resource: type=document, department=engineering             │
│  • Environment: time=14:00, ip=10.0.0.0/8                     │
│  • Action: read                                                │
│                                                                 │
│  Evaluation:                                                    │
│  ───────────                                                    │
│  if (user.role == "engineer" AND                               │
│      user.department == resource.department AND                │
│      9 <= current_hour <= 17 AND                               │
│      ip_in_range(request.ip, "10.0.0.0/8")):                  │
│      ALLOW                                                      │
│  else:                                                          │
│      DENY                                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Resource-Based Authorization

```python
# Check ownership or explicit sharing

def can_access_document(user, document):
    # Owner always has access
    if document.owner_id == user.id:
        return True
    
    # Check explicit shares
    share = DocumentShare.query.filter_by(
        document_id=document.id,
        user_id=user.id
    ).first()
    
    if share:
        return True
    
    # Check organization access
    if document.org_id == user.org_id and document.is_org_visible:
        return True
    
    return False

# Middleware
@app.route('/documents/<doc_id>')
def get_document(doc_id):
    document = Document.query.get_or_404(doc_id)
    
    if not can_access_document(current_user, document):
        abort(403)
    
    return document.to_json()
```

---

## 🔒 Encryption

### Encryption Types

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION OVERVIEW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  At Rest: Data stored on disk                                   │
│  ─────────────────────────────                                  │
│  • Database encryption (TDE)                                    │
│  • File system encryption                                       │
│  • S3 server-side encryption                                    │
│                                                                 │
│  In Transit: Data moving over network                           │
│  ─────────────────────────────────────                          │
│  • HTTPS/TLS                                                    │
│  • Database connections (SSL)                                   │
│  • Internal service communication (mTLS)                        │
│                                                                 │
│  Application-Level: App encrypts specific data                  │
│  ─────────────────────────────────────────────                  │
│  • Sensitive fields (SSN, credit cards)                        │
│  • End-to-end encryption (messaging)                           │
│  • Client-side encryption before upload                         │
│                                                                 │
│  Defense in Depth:                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [TLS] → [App Encryption] → [DB TDE] → [Disk Encrypt]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Symmetric vs Asymmetric Encryption

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYMMETRIC VS ASYMMETRIC                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Symmetric (AES):                                               │
│  ─────────────────                                              │
│  Same key for encrypt and decrypt                               │
│                                                                 │
│  Key: [████████]                                                │
│                                                                 │
│  Plaintext → [Encrypt] → Ciphertext → [Decrypt] → Plaintext    │
│               ↑                         ↑                       │
│              Key                       Key                      │
│                                                                 │
│  ✅ Fast                                                        │
│  ✅ Good for large data                                         │
│  ❌ Key distribution problem                                    │
│                                                                 │
│  Asymmetric (RSA):                                              │
│  ──────────────────                                             │
│  Public key to encrypt, private key to decrypt                  │
│                                                                 │
│  Public:  [████]  Private: [████████████]                      │
│                                                                 │
│  Plaintext → [Encrypt] → Ciphertext → [Decrypt] → Plaintext    │
│               ↑                         ↑                       │
│           Public Key              Private Key                   │
│                                                                 │
│  ✅ Solves key distribution                                     │
│  ✅ Digital signatures                                          │
│  ❌ Slow                                                        │
│  ❌ Not for large data                                          │
│                                                                 │
│  In practice: Use asymmetric to exchange symmetric key          │
│  (This is how TLS works)                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Sensitive Data Handling

```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import hashlib

class SensitiveDataHandler:
    def __init__(self, master_key: bytes):
        self.fernet = Fernet(master_key)
    
    def encrypt_pii(self, data: str) -> str:
        """Encrypt sensitive data like SSN"""
        return self.fernet.encrypt(data.encode()).decode()
    
    def decrypt_pii(self, encrypted: str) -> str:
        """Decrypt sensitive data"""
        return self.fernet.decrypt(encrypted.encode()).decode()
    
    @staticmethod
    def hash_for_lookup(data: str, salt: str) -> str:
        """Create searchable hash (for looking up by SSN)"""
        return hashlib.pbkdf2_hmac(
            'sha256',
            data.encode(),
            salt.encode(),
            100000
        ).hex()

# Storage pattern for SSN
class User:
    # Store encrypted SSN
    ssn_encrypted = Column(String(255))
    
    # Store hash for lookups (can search without decrypting all)
    ssn_hash = Column(String(64), index=True)
    
    def set_ssn(self, ssn: str):
        handler = SensitiveDataHandler(get_master_key())
        self.ssn_encrypted = handler.encrypt_pii(ssn)
        self.ssn_hash = handler.hash_for_lookup(ssn, SALT)
    
    def get_ssn(self) -> str:
        handler = SensitiveDataHandler(get_master_key())
        return handler.decrypt_pii(self.ssn_encrypted)

# Finding user by SSN without decrypting all records
def find_by_ssn(ssn: str):
    hash_value = SensitiveDataHandler.hash_for_lookup(ssn, SALT)
    return User.query.filter_by(ssn_hash=hash_value).first()
```

---

## 🛡️ Common Security Patterns

### Input Validation

```python
from pydantic import BaseModel, validator, EmailStr
import re

class UserRegistration(BaseModel):
    email: EmailStr
    username: str
    password: str
    
    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', v):
            raise ValueError('Invalid username format')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password too short')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password needs uppercase')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password needs number')
        return v

# SQL Injection Prevention
# ❌ NEVER do this:
query = f"SELECT * FROM users WHERE id = {user_input}"

# ✅ Always use parameterized queries:
cursor.execute("SELECT * FROM users WHERE id = %s", (user_input,))

# Or use ORM:
user = User.query.filter_by(id=user_input).first()
```

### Rate Limiting for Security

```python
# Prevent brute force attacks

login_limiter = RateLimiter(
    key_prefix="login",
    limit=5,          # 5 attempts
    window=300        # per 5 minutes
)

@app.route('/login', methods=['POST'])
def login():
    ip = request.remote_addr
    email = request.json['email']
    
    # Rate limit by IP AND email
    if not login_limiter.is_allowed(f"{ip}:{email}"):
        # Log potential attack
        security_log.warning(f"Rate limit exceeded: {ip}, {email}")
        return {"error": "Too many attempts"}, 429
    
    user = authenticate(email, request.json['password'])
    
    if not user:
        login_limiter.record_failure(f"{ip}:{email}")
        return {"error": "Invalid credentials"}, 401
    
    login_limiter.reset(f"{ip}:{email}")
    return {"token": create_token(user)}
```

### Secrets Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECRETS MANAGEMENT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ Don't store secrets in:                                     │
│  • Source code                                                  │
│  • Git repositories                                             │
│  • Config files in repo                                         │
│  • Docker images                                                │
│                                                                 │
│  ✅ Use secrets management:                                     │
│  • AWS Secrets Manager                                          │
│  • HashiCorp Vault                                              │
│  • Azure Key Vault                                              │
│  • Environment variables (from secure source)                   │
│                                                                 │
│  Architecture:                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐             │
│  │ App      │───►│ Secrets  │───►│ Secret Store │             │
│  │ (IAM     │    │ Manager  │    │ (encrypted)  │             │
│  │  role)   │    │          │    │              │             │
│  └──────────┘    └──────────┘    └──────────────┘             │
│                                                                 │
│  Features:                                                      │
│  • Automatic rotation                                           │
│  • Audit logging                                                │
│  • Access control                                               │
│  • Encryption at rest                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌐 API Security Checklist

```
┌─────────────────────────────────────────────────────────────────┐
│                    API SECURITY CHECKLIST                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Authentication:                                                │
│  [ ] Require authentication for all endpoints                   │
│  [ ] Use secure token storage (httpOnly cookies or secure storage)
│  [ ] Implement token refresh mechanism                          │
│  [ ] Use short-lived access tokens                              │
│                                                                 │
│  Authorization:                                                 │
│  [ ] Check permissions on every request                         │
│  [ ] Implement resource-level access control                    │
│  [ ] Don't rely on client-side validation alone                │
│  [ ] Log authorization failures                                 │
│                                                                 │
│  Input Validation:                                              │
│  [ ] Validate all input on server                              │
│  [ ] Use allowlists over denylists                             │
│  [ ] Sanitize data before storage                              │
│  [ ] Validate file uploads (type, size)                        │
│                                                                 │
│  Rate Limiting:                                                 │
│  [ ] Limit requests per user/IP                                 │
│  [ ] Stricter limits on sensitive endpoints (login, password reset)
│  [ ] Return Retry-After headers                                 │
│                                                                 │
│  Transport Security:                                            │
│  [ ] HTTPS everywhere                                           │
│  [ ] Use TLS 1.2 or higher                                     │
│  [ ] Set security headers (HSTS, CSP)                          │
│  [ ] Disable old protocols and ciphers                         │
│                                                                 │
│  Logging & Monitoring:                                          │
│  [ ] Log security events                                       │
│  [ ] Alert on suspicious activity                              │
│  [ ] Don't log sensitive data                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Key Takeaways

1. **AuthN ≠ AuthZ** - Who you are vs what you can do
2. **JWTs are stateless** - Great for scale, hard to revoke
3. **Use RBAC or ABAC** - Match to your complexity needs
4. **Encrypt at rest AND in transit** - Defense in depth
5. **Validate all input** - Never trust client data
6. **Rate limit sensitive endpoints** - Prevent brute force
7. **Use secrets managers** - Never hardcode secrets
8. **Log security events** - Detection and forensics

---

## 📚 Related Topics

- [API Design](/system-design/fundamentals/04-api-design.md) - API authentication patterns
- [Distributed Patterns](/system-design/fundamentals/14-distributed-patterns.md) - Service-to-service auth
- [Rate Limiting](/system-design/fundamentals/18-rate-limiting.md) - Security rate limits
- [Monitoring](/system-design/fundamentals/19-monitoring-and-observability.md) - Security monitoring
