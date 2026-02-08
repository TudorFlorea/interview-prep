# Firewalls & Security Groups

[← Back to Index](/networking/00-index.md)

---

## Overview

Firewalls and security groups control network traffic by allowing or denying connections based on rules. Understanding network security is essential for protecting applications and designing secure architectures.

### When This Matters Most
- Designing secure cloud architectures
- Debugging connectivity issues
- Implementing defense in depth
- Compliance and security audits

---

## Firewall Fundamentals

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HOW FIREWALLS WORK                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Packet arrives:                                                        │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │ Src IP: 203.0.113.50                                             │  │
│   │ Dst IP: 10.0.1.10                                                │  │
│   │ Src Port: 54321                                                  │  │
│   │ Dst Port: 443                                                    │  │
│   │ Protocol: TCP                                                    │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                     FIREWALL RULE TABLE                          │  │
│   ├──────────────────────────────────────────────────────────────────┤  │
│   │ Rule 1: Allow TCP 443 from 0.0.0.0/0    → ✅ MATCH → ALLOW      │  │
│   │ Rule 2: Allow TCP 22 from 10.0.0.0/8    → (not evaluated)       │  │
│   │ Rule 3: Deny all                         → (not evaluated)       │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│   Rules evaluated top-to-bottom, first match wins                       │
│   Default policy: usually DENY (implicit deny at end)                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Types of Firewalls

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FIREWALL TYPES BY LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   PACKET FILTER (Stateless) - Layer 3/4                                 │
│   ──────────────────────────────────────                                 │
│   - Examines each packet independently                                  │
│   - No connection tracking                                               │
│   - Must allow return traffic explicitly                                │
│   - Fast, simple                                                         │
│   Example: AWS NACLs, basic iptables rules                              │
│                                                                          │
│   STATEFUL FIREWALL - Layer 3/4                                          │
│   ─────────────────────────────                                          │
│   - Tracks connection state                                              │
│   - Return traffic automatically allowed                                │
│   - More intelligent, more memory                                        │
│   Example: AWS Security Groups, iptables with conntrack                 │
│                                                                          │
│   APPLICATION FIREWALL (WAF) - Layer 7                                   │
│   ────────────────────────────────────                                   │
│   - Inspects HTTP/application content                                   │
│   - Can block SQL injection, XSS, etc.                                  │
│   - Protocol-aware (HTTP, SQL, etc.)                                    │
│   Example: AWS WAF, Cloudflare WAF, ModSecurity                         │
│                                                                          │
│   NEXT-GEN FIREWALL (NGFW)                                               │
│   ────────────────────────                                               │
│   - All of the above plus:                                              │
│   - Deep packet inspection                                               │
│   - IDS/IPS (Intrusion Detection/Prevention)                            │
│   - Application awareness (identify apps by traffic pattern)            │
│   Example: Palo Alto, Fortinet, Cisco Firepower                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Stateless vs Stateful

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   STATELESS vs STATEFUL FIREWALLS                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   STATELESS (AWS NACLs):                                                 │
│   ──────────────────────                                                 │
│                                                                          │
│   Client:54321 ──► Server:443  (Inbound rule: Allow TCP 443) ✅         │
│   Server:443 ──► Client:54321  (Outbound rule needed!)                  │
│                                                                          │
│   Must configure BOTH directions:                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Inbound: Allow TCP 443 from 0.0.0.0/0                          │   │
│   │ Outbound: Allow TCP 1024-65535 to 0.0.0.0/0  (ephemeral ports) │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ────────────────────────────────────────────────────────────────────  │
│                                                                          │
│   STATEFUL (AWS Security Groups):                                        │
│   ────────────────────────────────                                       │
│                                                                          │
│   Client:54321 ──► Server:443  (Inbound rule: Allow TCP 443) ✅         │
│   Server:443 ──► Client:54321  (Return traffic automatically allowed)  │
│                                                                          │
│   Only configure inbound:                                                │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Inbound: Allow TCP 443 from 0.0.0.0/0                          │   │
│   │ (Outbound responses tracked and allowed automatically)         │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Connection tracking table:                                             │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Src IP        Src Port  Dst IP      Dst Port  State           │   │
│   │ 203.0.113.50  54321     10.0.1.10   443       ESTABLISHED     │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## AWS Security Groups

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AWS SECURITY GROUPS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Characteristics:                                                       │
│   ├── Stateful (return traffic automatic)                               │
│   ├── Allow rules only (no explicit deny)                               │
│   ├── All rules evaluated (not first-match)                             │
│   ├── Applied at instance/ENI level                                     │
│   └── Can reference other security groups                               │
│                                                                          │
│   Example: 3-Tier Architecture                                           │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Web Tier SG (sg-web)                                            │   │
│   │ Inbound:                                                        │   │
│   │   - TCP 443 from 0.0.0.0/0        (HTTPS from internet)        │   │
│   │   - TCP 80 from 0.0.0.0/0         (HTTP for redirect)          │   │
│   │ Outbound:                                                       │   │
│   │   - All traffic to 0.0.0.0/0      (default, can restrict)      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ App Tier SG (sg-app)                                            │   │
│   │ Inbound:                                                        │   │
│   │   - TCP 8080 from sg-web          (only from web tier!)        │   │
│   │ Outbound:                                                       │   │
│   │   - TCP 5432 to sg-db             (to database only)           │   │
│   │   - TCP 443 to 0.0.0.0/0          (external APIs)              │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ DB Tier SG (sg-db)                                              │   │
│   │ Inbound:                                                        │   │
│   │   - TCP 5432 from sg-app          (only from app tier!)        │   │
│   │ Outbound:                                                       │   │
│   │   - None needed (responses automatic)                          │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Referencing SGs instead of IPs:                                       │
│   - Auto-scales with instances                                          │
│   - No need to update when IPs change                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Security Group Best Practices

```yaml
# Terraform example

resource "aws_security_group" "web" {
  name        = "web-tier"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  # HTTPS from anywhere
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH from bastion only
  ingress {
    description     = "SSH from bastion"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  # Outbound: restrict to known destinations
  egress {
    description     = "To app tier"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    description = "HTTPS to internet (APIs, package repos)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-tier-sg"
  }
}
```

---

## AWS Network ACLs (NACLs)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      NETWORK ACLs                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Characteristics:                                                       │
│   ├── Stateless (must allow both directions)                            │
│   ├── Allow AND Deny rules                                               │
│   ├── Evaluated in order (rule number)                                  │
│   ├── Applied at subnet level                                            │
│   └── First match wins                                                   │
│                                                                          │
│   Example NACL:                                                          │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ INBOUND RULES                                                   │   │
│   │ Rule   Type        Port    Source          Action               │   │
│   │ 100    HTTPS       443     0.0.0.0/0       ALLOW                │   │
│   │ 110    SSH         22      10.0.0.0/8      ALLOW                │   │
│   │ 120    Custom TCP  1024-65535  0.0.0.0/0   ALLOW  (return)     │   │
│   │ *      All         All     0.0.0.0/0       DENY   (default)     │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │ OUTBOUND RULES                                                  │   │
│   │ Rule   Type        Port    Destination     Action               │   │
│   │ 100    HTTPS       443     0.0.0.0/0       ALLOW                │   │
│   │ 110    Custom TCP  1024-65535  0.0.0.0/0   ALLOW  (responses)  │   │
│   │ *      All         All     0.0.0.0/0       DENY   (default)     │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Ephemeral ports (1024-65535):                                         │
│   - Clients use random high ports for connections                       │
│   - Must allow these for return traffic (stateless!)                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Security Groups vs NACLs

| Feature | Security Groups | NACLs |
|---------|----------------|-------|
| **Level** | Instance (ENI) | Subnet |
| **State** | Stateful | Stateless |
| **Rules** | Allow only | Allow and Deny |
| **Evaluation** | All rules | First match (ordered) |
| **Default** | Deny all inbound, allow all outbound | Allow all |
| **Use case** | Instance-level security | Subnet-level guardrails |

---

## Linux iptables/nftables

```bash
# iptables - Traditional Linux firewall

# View current rules
sudo iptables -L -n -v

# Allow incoming SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow incoming HTTPS
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow established connections (stateful)
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT

# Drop all other incoming
sudo iptables -A INPUT -j DROP

# Allow all outgoing
sudo iptables -A OUTPUT -j ACCEPT

# Save rules (Ubuntu/Debian)
sudo iptables-save > /etc/iptables.rules

# Restore on boot
# Add to /etc/rc.local or use iptables-persistent package
```

```bash
# nftables - Modern replacement for iptables

# View rules
sudo nft list ruleset

# Simple server configuration
sudo nft add table inet filter
sudo nft add chain inet filter input { type filter hook input priority 0 \; policy drop \; }
sudo nft add chain inet filter output { type filter hook output priority 0 \; policy accept \; }

# Allow established
sudo nft add rule inet filter input ct state established,related accept

# Allow loopback
sudo nft add rule inet filter input iif lo accept

# Allow SSH and HTTPS
sudo nft add rule inet filter input tcp dport { 22, 443 } accept

# View rules
sudo nft list ruleset
```

---

## Web Application Firewalls (WAF)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      WEB APPLICATION FIREWALL                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   WAF inspects HTTP/HTTPS content (Layer 7)                             │
│                                                                          │
│   ┌────────────┐         ┌──────────┐         ┌──────────┐             │
│   │   Client   │ ──────► │   WAF    │ ──────► │  Server  │             │
│   └────────────┘         └──────────┘         └──────────┘             │
│                               │                                         │
│                               ├── SQL Injection detection               │
│                               ├── XSS (Cross-Site Scripting)           │
│                               ├── Path traversal                        │
│                               ├── Request rate limiting                │
│                               ├── Bot detection                        │
│                               ├── Geo-blocking                          │
│                               └── Custom rules                          │
│                                                                          │
│   Example attacks blocked:                                               │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ SQL Injection:                                                  │   │
│   │ GET /users?id=1' OR '1'='1                                     │   │
│   │                    ^^^^^^^^^^^^^ WAF blocks this                │   │
│   │                                                                 │   │
│   │ XSS:                                                            │   │
│   │ POST /comment body=<script>alert('xss')</script>               │   │
│   │                    ^^^^^^^^^^^^^^^^^^^^^^^^ WAF blocks         │   │
│   │                                                                 │   │
│   │ Path Traversal:                                                 │   │
│   │ GET /files?path=../../../etc/passwd                            │   │
│   │                 ^^^^^^^^^^^^^^^^^^^^ WAF blocks                 │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### AWS WAF Rules Example

```yaml
# AWS WAF managed rules + custom rules

Resources:
  WebACL:
    Type: AWS::WAFv2::WebACL
    Properties:
      Name: production-waf
      Scope: REGIONAL
      DefaultAction:
        Allow: {}
      Rules:
        # AWS Managed Rules - Common attacks
        - Name: AWSManagedRulesCommonRuleSet
          Priority: 1
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesCommonRuleSet
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: CommonRuleSet

        # AWS Managed Rules - SQL Injection
        - Name: AWSManagedRulesSQLiRuleSet
          Priority: 2
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesSQLiRuleSet
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: SQLiRuleSet

        # Rate limiting (100 requests per 5 minutes per IP)
        - Name: RateLimitRule
          Priority: 3
          Action:
            Block: {}
          Statement:
            RateBasedStatement:
              Limit: 100
              AggregateKeyType: IP
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: RateLimit

        # Block specific countries (OFAC compliance example)
        - Name: GeoBlockRule
          Priority: 4
          Action:
            Block: {}
          Statement:
            GeoMatchStatement:
              CountryCodes:
                - KP  # North Korea
                - IR  # Iran
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: GeoBlock
```

---

## Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DEFENSE IN DEPTH                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Layer multiple security controls:                                      │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     INTERNET                                     │   │
│   └───────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│   Layer 1: Edge              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  CDN/WAF (Cloudflare, AWS CloudFront + WAF)                     │   │
│   │  - DDoS protection                                               │   │
│   │  - Bot mitigation                                                │   │
│   │  - OWASP rules                                                   │   │
│   └───────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│   Layer 2: Network           ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  VPC + NACLs                                                     │   │
│   │  - Subnet isolation                                              │   │
│   │  - Coarse-grained network rules                                  │   │
│   │  - Block known bad IP ranges                                     │   │
│   └───────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│   Layer 3: Instance          ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  Security Groups                                                 │   │
│   │  - Fine-grained instance rules                                   │   │
│   │  - Least privilege access                                        │   │
│   │  - Reference other SGs                                           │   │
│   └───────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│   Layer 4: Host              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  Host-based firewall (iptables)                                  │   │
│   │  - Defense if SG misconfigured                                   │   │
│   │  - Process-specific rules                                        │   │
│   └───────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│   Layer 5: Application       ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  Application security                                            │   │
│   │  - Authentication/Authorization                                  │   │
│   │  - Input validation                                              │   │
│   │  - Encryption at rest                                            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Common Firewall Rules

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      COMMON FIREWALL RULES                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Web Server:                                                            │
│   - Inbound TCP 80, 443 from 0.0.0.0/0                                  │
│   - Inbound TCP 22 from bastion/VPN only                                │
│                                                                          │
│   API Server:                                                            │
│   - Inbound TCP 443 from load balancer SG only                          │
│   - Inbound TCP 22 from bastion only                                    │
│                                                                          │
│   Database:                                                              │
│   - Inbound TCP 5432 (Postgres) from app SG only                        │
│   - Inbound TCP 3306 (MySQL) from app SG only                           │
│   - NO direct internet access                                           │
│                                                                          │
│   Redis/Cache:                                                           │
│   - Inbound TCP 6379 from app SG only                                   │
│   - NO internet access                                                   │
│                                                                          │
│   Bastion/Jump Host:                                                     │
│   - Inbound TCP 22 from corporate IP range                              │
│   - Outbound TCP 22 to all internal instances                           │
│                                                                          │
│   Kubernetes Worker:                                                     │
│   - Inbound TCP 10250 (kubelet) from master SG                          │
│   - Inbound TCP 30000-32767 (NodePort) from LB                          │
│   - All internal cluster communication                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Exercises

### Exercise 1: Design Security Groups 🟢

**Scenario:** Design security groups for:
- Load balancer (internet-facing)
- Web application (receives from LB)
- PostgreSQL database (receives from app)

What inbound rules should each have?

<details>
<summary>✅ Solution</summary>

```hcl
# Load Balancer SG
resource "aws_security_group" "lb" {
  name = "load-balancer"
  
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    description = "HTTP for redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    description     = "To web tier"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }
}

# Web Application SG
resource "aws_security_group" "web" {
  name = "web-application"
  
  ingress {
    description     = "From load balancer only"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.lb.id]
  }
  
  ingress {
    description     = "SSH from bastion"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }
  
  egress {
    description     = "To database"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.db.id]
  }
  
  egress {
    description = "HTTPS to internet (APIs)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Database SG
resource "aws_security_group" "db" {
  name = "database"
  
  ingress {
    description     = "PostgreSQL from web tier only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }
  
  # No egress rules needed - stateful, responses automatic
  # No internet access - most secure
}
```

**Key points:**
- LB: Public-facing, accepts 80/443
- Web: Only from LB, not directly accessible
- DB: Only from Web tier, no internet
- Use SG references, not IP addresses

</details>

---

### Exercise 2: Debug Connectivity Issue 🟡

**Scenario:** Your app server (10.0.2.10) can't connect to RDS database (10.0.3.20:5432).

Security groups:
- App SG: Outbound all traffic allowed
- DB SG: Inbound TCP 5432 from 10.0.1.0/24

What's wrong? How do you fix it?

<details>
<summary>💡 Hints</summary>

- Check the CIDR range carefully
- What subnet is the app server in?
- What should the DB SG reference?

</details>

<details>
<summary>✅ Solution</summary>

**Problem:** DB Security Group allows inbound from `10.0.1.0/24`, but app server is in `10.0.2.0/24`.

```
App server IP: 10.0.2.10
DB allows from: 10.0.1.0/24 (range: 10.0.1.0 - 10.0.1.255)

10.0.2.10 is NOT in 10.0.1.0/24! ❌
```

**Fixes (choose one):**

```hcl
# Fix 1: Correct the CIDR (not recommended - fragile)
ingress {
  from_port   = 5432
  to_port     = 5432
  protocol    = "tcp"
  cidr_blocks = ["10.0.2.0/24"]  # App tier subnet
}

# Fix 2: Reference security group (recommended!)
ingress {
  from_port       = 5432
  to_port         = 5432
  protocol        = "tcp"
  security_groups = [aws_security_group.app.id]
}
```

**Debugging steps:**

```bash
# 1. Check if port is reachable
nc -zv 10.0.3.20 5432

# 2. Check security group rules
aws ec2 describe-security-groups --group-ids sg-db12345

# 3. Check VPC Flow Logs for rejected packets
# Look for REJECT with dest port 5432

# 4. Check NACLs (if using)
aws ec2 describe-network-acls --filters "Name=vpc-id,Values=vpc-xxx"

# 5. Check route tables (can app reach DB subnet?)
aws ec2 describe-route-tables
```

**Always prefer SG references over CIDR:**
- Auto-updates when instances change
- Clearer intent
- Works across subnets

</details>

---

### Exercise 3: Implement Defense in Depth 🔴

**Scenario:** Design a complete security architecture for a financial application:
- Public API (needs WAF protection)
- Internal microservices
- Sensitive database (PCI compliance)
- Audit logging requirements

Layer your security controls.

<details>
<summary>💡 Hints</summary>

- Multiple layers: Edge, Network, Instance, Application
- Consider encryption in transit and at rest
- Audit trail for all access
- Principle of least privilege

</details>

<details>
<summary>✅ Solution</summary>

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   FINANCIAL APP SECURITY ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   LAYER 1: EDGE PROTECTION                                               │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ AWS CloudFront + WAF                                            │   │
│   │ - DDoS protection (Shield Standard/Advanced)                    │   │
│   │ - AWS Managed Rules (OWASP Top 10)                              │   │
│   │ - Rate limiting (500 req/5min per IP)                           │   │
│   │ - Geo-blocking (block OFAC countries)                           │   │
│   │ - Bot detection                                                 │   │
│   │ - Custom rules for API abuse patterns                           │   │
│   │ - All requests logged to S3 + CloudWatch                        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   LAYER 2: VPC / NETWORK                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ VPC with private/public subnets across 3 AZs                    │   │
│   │                                                                  │   │
│   │ NACLs (subnet-level):                                           │   │
│   │ - Public: Allow 443 in, ephemeral out                           │   │
│   │ - Private: Allow from public subnet only                        │   │
│   │ - Database: Allow from private subnet only                      │   │
│   │ - Deny all other traffic                                        │   │
│   │                                                                  │   │
│   │ VPC Flow Logs → CloudWatch + S3 (90 day retention)              │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   LAYER 3: SECURITY GROUPS (instance-level)                              │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ ALB-SG:                                                         │   │
│   │   Inbound: 443 from CloudFront IPs only (use prefix list)      │   │
│   │                                                                  │   │
│   │ API-SG:                                                         │   │
│   │   Inbound: 8080 from ALB-SG                                     │   │
│   │   Outbound: 443 to Service-SG, DB-SG                           │   │
│   │                                                                  │   │
│   │ Service-SG (internal microservices):                            │   │
│   │   Inbound: 8080 from API-SG, other Service-SGs                 │   │
│   │   Outbound: 5432 to DB-SG                                       │   │
│   │                                                                  │   │
│   │ DB-SG:                                                          │   │
│   │   Inbound: 5432 from Service-SG only                            │   │
│   │   No outbound internet access                                   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   LAYER 4: HOST SECURITY                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ - Hardened AMIs (CIS benchmarks)                                │   │
│   │ - No SSH access (SSM Session Manager only)                      │   │
│   │ - Host-based IDS (OSSEC/Wazuh)                                  │   │
│   │ - Regular patching (AWS Systems Manager)                        │   │
│   │ - iptables backup rules                                         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   LAYER 5: APPLICATION SECURITY                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ - mTLS between all services                                     │   │
│   │ - JWT authentication + authorization                            │   │
│   │ - Input validation on all endpoints                             │   │
│   │ - Secrets in AWS Secrets Manager                                │   │
│   │ - All API calls logged with request ID                          │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   LAYER 6: DATA SECURITY                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ - RDS encryption at rest (AWS managed keys)                     │   │
│   │ - TLS 1.2+ for all database connections                         │   │
│   │ - Column-level encryption for PAN/PII                           │   │
│   │ - Automated backups to separate region                          │   │
│   │ - Database activity logging to CloudWatch                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   LAYER 7: MONITORING & AUDIT                                            │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ - AWS CloudTrail (all API calls)                                │   │
│   │ - VPC Flow Logs (all network traffic)                           │   │
│   │ - Application logs → CloudWatch → S3                            │   │
│   │ - AWS Config (compliance rules)                                 │   │
│   │ - GuardDuty (threat detection)                                  │   │
│   │ - Security Hub (aggregated findings)                            │   │
│   │ - Log retention: 7 years (PCI requirement)                      │   │
│   │ - Real-time alerts to PagerDuty                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**PCI DSS specific requirements covered:**
- Requirement 1: Firewall configuration (NACLs, SGs)
- Requirement 2: Hardened systems (CIS AMIs)
- Requirement 3: Protect stored data (encryption at rest)
- Requirement 4: Encrypt transmission (TLS everywhere)
- Requirement 6: Secure development (WAF, input validation)
- Requirement 10: Track and monitor access (comprehensive logging)

</details>

---

## Key Takeaways

- 🔥 **Stateful vs Stateless**: Security Groups track connections; NACLs don't
- 📑 **Rule evaluation**: SGs evaluate all rules; NACLs first-match wins
- 🔗 **Reference SGs, not IPs**: More maintainable, auto-updates
- 🛡️ **Defense in Depth**: Layer multiple controls (edge, network, host, app)
- 🌐 **WAF for L7**: Protects against SQL injection, XSS, bots
- 📊 **Log everything**: VPC Flow Logs, WAF logs, CloudTrail for audit

---

## Related Topics

- [Cloud Networking](/networking/14-cloud-networking.md) - VPC architecture
- [TLS & Security](/networking/05-tls-and-security.md) - Encryption in transit
- [Load Balancing](/networking/08-load-balancing.md) - Where to terminate SSL
