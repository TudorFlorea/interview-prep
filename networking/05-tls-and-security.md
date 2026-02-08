# TLS & Security

[← Back to Index](/networking/00-index.md)

---

## Overview

TLS (Transport Layer Security) is the cryptographic protocol securing most Internet communication. Understanding TLS is essential for building secure applications, debugging certificate issues, and implementing proper authentication.

### When This Matters Most
- Configuring HTTPS for your services
- Debugging certificate errors
- Implementing mTLS for service-to-service auth
- Understanding security best practices

---

## What TLS Provides

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TLS SECURITY GUARANTEES                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. CONFIDENTIALITY (Encryption)                                         │
│     ┌─────────────────────┐         ┌─────────────────────┐             │
│     │ "Hello, password123"│  ─────► │ "Xk9#mP2@Lq..."     │             │
│     │    (plaintext)      │         │   (encrypted)       │             │
│     └─────────────────────┘         └─────────────────────┘             │
│     Only endpoints can read the data                                     │
│                                                                          │
│  2. INTEGRITY (Tamper Detection)                                         │
│     ┌──────────────────────────────────────────────────────┐            │
│     │ Data ───►│ MAC │───► If data modified, MAC fails ❌   │            │
│     └──────────────────────────────────────────────────────┘            │
│     Any modification is detected                                         │
│                                                                          │
│  3. AUTHENTICATION (Identity Verification)                               │
│     ┌──────────────────────────────────────────────────────┐            │
│     │ Server presents certificate signed by trusted CA     │            │
│     │ Client verifies: "This really is google.com" ✓       │            │
│     └──────────────────────────────────────────────────────┘            │
│     Server proves its identity (optionally client too)                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TLS Versions

| Version | Year | Status | Notes |
|---------|------|--------|-------|
| SSL 2.0 | 1995 | ❌ Deprecated | Serious vulnerabilities |
| SSL 3.0 | 1996 | ❌ Deprecated | POODLE vulnerability |
| TLS 1.0 | 1999 | ❌ Deprecated | BEAST vulnerability |
| TLS 1.1 | 2006 | ❌ Deprecated | Minor improvements |
| TLS 1.2 | 2008 | ✅ Widely used | Still secure, most common |
| TLS 1.3 | 2018 | ✅ Recommended | Faster, more secure |

**Use TLS 1.2 minimum, prefer TLS 1.3**

---

## TLS 1.2 Handshake

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TLS 1.2 HANDSHAKE (2 RTT)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Client                                              Server             │
│      │                                                  │                │
│      │─── ClientHello ─────────────────────────────────►│                │
│      │    - TLS version (1.2)                           │                │
│      │    - Random bytes (32)                           │                │
│      │    - Cipher suites supported                     │   RTT 1        │
│      │    - Extensions (SNI, etc)                       │                │
│      │                                                  │                │
│      │◄── ServerHello ──────────────────────────────────│                │
│      │    - Chosen cipher suite                         │                │
│      │    - Random bytes (32)                           │                │
│      │◄── Certificate ──────────────────────────────────│                │
│      │    - Server's certificate chain                  │                │
│      │◄── ServerKeyExchange (if needed) ────────────────│                │
│      │◄── ServerHelloDone ──────────────────────────────│                │
│      │                                                  │                │
│      │    [Client verifies certificate]                 │                │
│      │                                                  │                │
│      │─── ClientKeyExchange ───────────────────────────►│   RTT 2        │
│      │    - Pre-master secret (encrypted)               │                │
│      │─── ChangeCipherSpec ────────────────────────────►│                │
│      │─── Finished (encrypted) ────────────────────────►│                │
│      │                                                  │                │
│      │◄── ChangeCipherSpec ─────────────────────────────│                │
│      │◄── Finished (encrypted) ─────────────────────────│                │
│      │                                                  │                │
│      │◄═══════════ Encrypted Application Data ════════►│                │
│      │                                                  │                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TLS 1.3 Handshake (Faster!)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TLS 1.3 HANDSHAKE (1 RTT)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Client                                              Server             │
│      │                                                  │                │
│      │─── ClientHello ─────────────────────────────────►│                │
│      │    - Supported cipher suites                     │                │
│      │    - Key shares (DH public keys)                 │                │
│      │    - Random                                      │   RTT 1        │
│      │                                                  │                │
│      │◄── ServerHello ──────────────────────────────────│                │
│      │    - Chosen cipher suite                         │                │
│      │    - Key share (DH public key)                   │                │
│      │◄── EncryptedExtensions ──────────────────────────│                │
│      │◄── Certificate ──────────────────────────────────│                │
│      │◄── CertificateVerify ────────────────────────────│                │
│      │◄── Finished ─────────────────────────────────────│                │
│      │                                                  │                │
│      │─── Finished ────────────────────────────────────►│                │
│      │                                                  │                │
│      │◄═══════════ Encrypted Application Data ════════►│                │
│      │                                                  │                │
│   TLS 1.3 Benefits:                                                      │
│   - 1 RTT instead of 2 (50% faster handshake)                           │
│   - 0-RTT resumption for repeat connections                              │
│   - Removed insecure algorithms (RSA key exchange, CBC, etc)            │
│   - Encrypted more of the handshake                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Certificates and PKI

### Certificate Chain

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CERTIFICATE CHAIN OF TRUST                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────┐                                   │
│   │      ROOT CA CERTIFICATE        │  Self-signed, stored in           │
│   │        (DigiCert, Let's Encrypt)│  browser/OS trust store          │
│   └────────────────┬────────────────┘                                   │
│                    │ signs                                               │
│                    ▼                                                     │
│   ┌─────────────────────────────────┐                                   │
│   │   INTERMEDIATE CA CERTIFICATE   │  Signed by Root CA               │
│   │     (DigiCert SHA2 Extended)    │  Can sign end-entity certs       │
│   └────────────────┬────────────────┘                                   │
│                    │ signs                                               │
│                    ▼                                                     │
│   ┌─────────────────────────────────┐                                   │
│   │     END-ENTITY CERTIFICATE      │  Your server's certificate       │
│   │       (www.example.com)         │  Contains public key              │
│   └─────────────────────────────────┘                                   │
│                                                                          │
│   Server sends: End-entity cert + Intermediate cert(s)                  │
│   Client has: Root CA certs pre-installed                               │
│   Verification: Build chain up to trusted root                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Certificate Contents

```bash
# View certificate
$ openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -text -noout

# Key fields:
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 12:34:56:...
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: C=US, O=DigiCert Inc, CN=DigiCert SHA2 Extended Validation
        Validity
            Not Before: Jan  1 00:00:00 2024 GMT
            Not After : Dec 31 23:59:59 2024 GMT     # Expiration date!
        Subject: CN=www.example.com                   # Who this cert is for
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
            RSA Public-Key: (2048 bit)
        X509v3 extensions:
            X509v3 Subject Alternative Name:          # All valid domains
                DNS:www.example.com, DNS:example.com
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
```

---

## Certificate Types

| Type | Validation | Use Case | Cost | Time |
|------|------------|----------|------|------|
| **DV** (Domain Validated) | Prove domain control | Blogs, small sites | Free (Let's Encrypt) | Minutes |
| **OV** (Organization Validated) | Verify organization | Business sites | $50-200/year | Days |
| **EV** (Extended Validation) | Extensive verification | Banks, high-trust | $100-500/year | Weeks |
| **Wildcard** | Covers *.domain.com | Multiple subdomains | Varies | Varies |

---

## Cipher Suites

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CIPHER SUITE FORMAT                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384                                  │
│  └┬┘ └──┬──┘└┬┘     └────┬────┘ └──┬──┘                                 │
│   │     │    │           │         │                                     │
│   │     │    │           │         └─ Hash for PRF (TLS 1.2)            │
│   │     │    │           │                                               │
│   │     │    │           └─ Symmetric cipher + mode                      │
│   │     │    │              (AES-256 in GCM mode)                        │
│   │     │    │                                                           │
│   │     │    └─ Authentication algorithm                                 │
│   │     │       (RSA signature)                                          │
│   │     │                                                                │
│   │     └─ Key Exchange algorithm                                        │
│   │        (Elliptic Curve Diffie-Hellman Ephemeral)                    │
│   │                                                                      │
│   └─ Protocol (TLS)                                                      │
│                                                                          │
│  TLS 1.3 Simplified:                                                     │
│  TLS_AES_256_GCM_SHA384                                                  │
│  - Only ECDHE key exchange (assumed)                                     │
│  - Removed insecure options                                              │
│                                                                          │
│  Recommended (2024):                                                     │
│  ✅ TLS_AES_256_GCM_SHA384 (TLS 1.3)                                    │
│  ✅ TLS_CHACHA20_POLY1305_SHA256 (TLS 1.3)                              │
│  ✅ TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 (TLS 1.2)                     │
│  ❌ Anything with RC4, DES, MD5, SHA1, CBC mode                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Common TLS Issues

### Certificate Errors

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMMON CERTIFICATE ERRORS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ERR_CERT_DATE_INVALID                                                   │
│  └── Certificate expired or not yet valid                               │
│      Fix: Renew certificate                                              │
│                                                                          │
│  ERR_CERT_COMMON_NAME_INVALID                                            │
│  └── Domain doesn't match certificate                                   │
│      Fix: Get cert for correct domain, check SAN                        │
│                                                                          │
│  ERR_CERT_AUTHORITY_INVALID                                              │
│  └── Self-signed or unknown CA                                          │
│      Fix: Use trusted CA, or add CA to trust store                      │
│                                                                          │
│  ERR_CERT_REVOKED                                                        │
│  └── Certificate has been revoked                                       │
│      Fix: Get new certificate                                            │
│                                                                          │
│  UNABLE_TO_GET_ISSUER_CERT_LOCALLY                                       │
│  └── Missing intermediate certificate                                   │
│      Fix: Configure server to send full chain                           │
│                                                                          │
│  CERTIFICATE_VERIFY_FAILED (curl/Python)                                 │
│  └── CA bundle missing or outdated                                      │
│      Fix: Update ca-certificates, use --cacert                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## mTLS (Mutual TLS)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MUTUAL TLS (Two-Way Authentication)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Regular TLS:                                                            │
│  ┌────────┐                              ┌────────┐                     │
│  │ Client │ ─────────────────────────────│ Server │                     │
│  │        │ "Prove you're google.com"    │  ✓     │                     │
│  │        │ ◄─── Server certificate ─────│        │                     │
│  └────────┘                              └────────┘                     │
│  Server proves identity, client is anonymous                            │
│                                                                          │
│  Mutual TLS:                                                             │
│  ┌────────┐                              ┌────────┐                     │
│  │ Client │ ◄─── Server certificate ─────│ Server │                     │
│  │   ✓    │                              │   ✓    │                     │
│  │        │ ──── Client certificate ────►│        │                     │
│  └────────┘                              └────────┘                     │
│  BOTH sides prove identity                                               │
│                                                                          │
│  Use cases:                                                              │
│  - Service-to-service communication (microservices)                     │
│  - API authentication (instead of API keys)                             │
│  - Zero-trust networks                                                   │
│  - IoT device authentication                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### mTLS Configuration Example

```nginx
# Nginx mTLS configuration
server {
    listen 443 ssl;
    server_name api.internal.example.com;

    # Server certificate
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    # Client certificate verification
    ssl_client_certificate /etc/nginx/certs/ca.crt;  # CA that signed client certs
    ssl_verify_client on;                             # Require client cert

    location / {
        # Pass client cert info to backend
        proxy_set_header X-Client-Cert $ssl_client_s_dn;
        proxy_pass http://backend;
    }
}
```

---

## Let's Encrypt & ACME

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ACME PROTOCOL (Let's Encrypt)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Request certificate for example.com                                  │
│  ┌──────────┐              ┌────────────────┐                           │
│  │  Client  │ ────────────►│ Let's Encrypt  │                           │
│  │ (certbot)│              │     ACME       │                           │
│  └──────────┘              └────────────────┘                           │
│                                   │                                      │
│  2. Prove domain control:         │                                      │
│                                   ▼                                      │
│  HTTP-01 Challenge:    Put file at /.well-known/acme-challenge/xxx      │
│  DNS-01 Challenge:     Add TXT record _acme-challenge.example.com       │
│                                   │                                      │
│  3. CA verifies challenge         │                                      │
│                                   ▼                                      │
│  4. Certificate issued (valid 90 days)                                   │
│                                                                          │
│  Common tools:                                                           │
│  - certbot (official)                                                    │
│  - acme.sh (shell-based)                                                 │
│  - Caddy (built-in ACME)                                                 │
│  - Traefik (built-in ACME)                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

```bash
# Get certificate with certbot
sudo certbot certonly --webroot -w /var/www/html -d example.com

# Auto-renewal (typically via cron)
sudo certbot renew --dry-run
```

---

## SSL/TLS Tools

### openssl Commands

```bash
# Check certificate of remote server
openssl s_client -connect example.com:443 -servername example.com

# View certificate details
openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -text -noout

# Check expiration date
openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates

# Check supported protocols
openssl s_client -connect example.com:443 -tls1_2
openssl s_client -connect example.com:443 -tls1_3

# Test specific cipher
openssl s_client -connect example.com:443 -cipher 'ECDHE-RSA-AES256-GCM-SHA384'

# Generate self-signed certificate (for testing)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Generate CSR (Certificate Signing Request)
openssl req -new -newkey rsa:4096 -nodes -keyout server.key -out server.csr
```

### Online Tools

- **SSL Labs Test**: https://www.ssllabs.com/ssltest/ - Comprehensive server analysis
- **crt.sh**: https://crt.sh/ - Certificate transparency logs
- **What's My Chain**: https://whatsmychaincert.com/ - Check certificate chain

---

## Best Practices

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TLS BEST PRACTICES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ✅ DO:                                                                  │
│  ├── Use TLS 1.2 minimum, prefer TLS 1.3                                │
│  ├── Enable HSTS (HTTP Strict Transport Security)                       │
│  ├── Use strong cipher suites (ECDHE, AES-GCM)                          │
│  ├── Automate certificate renewal (Let's Encrypt + certbot)             │
│  ├── Configure complete certificate chain                               │
│  ├── Enable OCSP Stapling                                                │
│  ├── Set appropriate key sizes (RSA 2048+, ECDSA P-256+)                │
│  └── Monitor certificate expiration                                      │
│                                                                          │
│  ❌ DON'T:                                                               │
│  ├── Disable certificate verification in production                     │
│  ├── Use SSL 3.0, TLS 1.0, or TLS 1.1                                   │
│  ├── Use weak ciphers (RC4, DES, export ciphers)                        │
│  ├── Use wildcard certs on public-facing servers                        │
│  ├── Share private keys across services                                  │
│  └── Ignore certificate expiration alerts                                │
│                                                                          │
│  Security Headers:                                                       │
│  Strict-Transport-Security: max-age=31536000; includeSubDomains         │
│  X-Content-Type-Options: nosniff                                         │
│  X-Frame-Options: DENY                                                   │
│  Content-Security-Policy: default-src 'self'                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Exercises

### Exercise 1: Inspect a Certificate 🟢

**Scenario:** Use openssl to inspect the certificate for github.com:
1. Check the expiration date
2. Find the issuer (CA)
3. List all domains the cert covers (SAN)

<details>
<summary>💡 Hints</summary>

- Use `openssl s_client -connect github.com:443`
- Pipe to `openssl x509 -text` for details
- Look for "Subject Alternative Name" section

</details>

<details>
<summary>✅ Solution</summary>

```bash
# Full certificate details
$ openssl s_client -connect github.com:443 -servername github.com 2>/dev/null | \
  openssl x509 -text -noout

# Just expiration
$ openssl s_client -connect github.com:443 2>/dev/null | \
  openssl x509 -noout -dates
notBefore=Feb 14 00:00:00 2024 GMT
notAfter=Mar 14 23:59:59 2025 GMT

# Just issuer
$ openssl s_client -connect github.com:443 2>/dev/null | \
  openssl x509 -noout -issuer
issuer=C = US, O = DigiCert Inc, CN = DigiCert TLS Hybrid ECC SHA384 2020 CA1

# Subject Alternative Names
$ openssl s_client -connect github.com:443 2>/dev/null | \
  openssl x509 -noout -text | grep -A1 "Subject Alternative Name"
            X509v3 Subject Alternative Name:
                DNS:github.com, DNS:www.github.com

# Quick summary script
echo | openssl s_client -connect github.com:443 -servername github.com 2>/dev/null | \
  openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

**Key observations:**
- Certificate issued by DigiCert
- Covers both github.com and www.github.com
- Valid for ~1 year

</details>

---

### Exercise 2: Diagnose Certificate Chain Issues 🟡

**Scenario:** Your API returns this error:
```
SSL: CERTIFICATE_VERIFY_FAILED - unable to get local issuer certificate
```

Diagnose and explain how to fix it.

<details>
<summary>💡 Hints</summary>

- This means the chain is incomplete
- Server might not be sending intermediate certs
- Client might be missing root CA

</details>

<details>
<summary>✅ Solution</summary>

**Diagnosis:**

```bash
# Check if server sends full chain
$ openssl s_client -connect api.example.com:443 -showcerts

# Look for number of certificates
# Should see: End-entity cert + Intermediate cert(s)
# If only 1 cert, chain is incomplete

# Verify chain explicitly
$ openssl s_client -connect api.example.com:443 -verify 5

# Check what's missing
$ openssl verify -verbose server.crt
error 20 at 0 depth lookup: unable to get local issuer certificate
```

**Common causes and fixes:**

```
1. Server not sending intermediate certificates

   Fix (Nginx):
   # Concatenate certs in order: server + intermediate
   cat server.crt intermediate.crt > fullchain.crt
   
   ssl_certificate /path/to/fullchain.crt;
   ssl_certificate_key /path/to/server.key;

2. Client missing root CA (common in Docker/minimal images)

   Fix (Debian/Ubuntu):
   apt-get update && apt-get install -y ca-certificates

   Fix (Alpine):
   apk add ca-certificates

   Fix (Python requests):
   import certifi
   requests.get(url, verify=certifi.where())

3. Self-signed or private CA

   Fix: Add CA to trust store
   # Linux
   cp custom-ca.crt /usr/local/share/ca-certificates/
   update-ca-certificates
   
   # Environment variable
   export SSL_CERT_FILE=/path/to/ca-bundle.crt
```

**Verify the fix:**
```bash
# Test with curl
curl -v https://api.example.com

# Test with openssl (should show "Verify return code: 0 (ok)")
openssl s_client -connect api.example.com:443 -verify_return_error
```

</details>

---

### Exercise 3: Configure TLS for Production 🔴

**Scenario:** You need to configure Nginx with:
- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS header
- OCSP stapling

Write the configuration.

<details>
<summary>💡 Hints</summary>

- Disable older protocols explicitly
- Use Mozilla's SSL Configuration Generator for cipher suites
- HSTS requires a max-age value

</details>

<details>
<summary>✅ Solution</summary>

```nginx
# /etc/nginx/conf.d/ssl.conf

# SSL/TLS settings
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;  # Let client choose (TLS 1.3 best practice)

# Modern cipher suites (Mozilla Intermediate configuration)
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;

# ECDH curve
ssl_ecdh_curve X25519:secp384r1;

# Session settings
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;  # Disable for forward secrecy

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
ssl_trusted_certificate /etc/nginx/certs/chain.pem;  # Full chain for OCSP

# Diffie-Hellman parameter for DHE ciphersuites
ssl_dhparam /etc/nginx/ssl/dhparam.pem;  # Generate: openssl dhparam -out dhparam.pem 2048

server {
    listen 443 ssl http2;
    server_name example.com;

    # Certificates
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # HSTS (365 days, include subdomains, preload eligible)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Additional security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        root /var/www/html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}
```

**Generate DH parameters:**
```bash
openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048
```

**Verify configuration:**
```bash
# Test config
nginx -t

# Reload
nginx -s reload

# Test with SSL Labs
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=example.com
# Target: A+ rating
```

**Key points:**
- TLS 1.2 minimum, 1.3 preferred
- ECDHE for forward secrecy
- AES-GCM or ChaCha20 for symmetric encryption
- HSTS forces HTTPS for future visits
- OCSP stapling improves connection speed

</details>

---

## Key Takeaways

- 🔐 **TLS provides**: Confidentiality, integrity, and authentication
- 📜 **Certificates prove identity**: Signed by trusted CAs, contain public keys
- 🔗 **Chain of trust**: Root CA → Intermediate → End-entity
- ⚡ **TLS 1.3 is faster**: 1-RTT handshake, 0-RTT resumption
- 🔄 **mTLS for services**: Both sides authenticate with certificates
- 🤖 **Automate renewals**: Let's Encrypt + certbot or ACME clients
- 📊 **Test your config**: Use SSL Labs for comprehensive analysis

---

## Related Topics

- [HTTP & HTTPS](/networking/02-http-and-https.md) - HTTP over TLS
- [Firewalls & Security Groups](/networking/10-firewalls-and-security-groups.md) - Network security
- Cloud Networking - Managed certificates, mTLS in service mesh
