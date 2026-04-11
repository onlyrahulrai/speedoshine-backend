# Franchise Management System - Database Schema

## Overview
This document defines the database schema for the franchise onboarding and management system. The schema is normalized (3NF), scalable, and designed for data integrity and performance.

## Database Type
**PostgreSQL 12+** (recommended for JSONB support, advanced indexing, and reliability)

---

## Core Entity Relationship Diagram

```
users (1) ──→ (M) franchise_applications
users (1) ──→ (M) franchise_owners
users (1) ──→ (M) admin_logs

franchise_applications (1) ──→ (M) franchise_documents
franchise_applications (1) ──→ (M) franchise_payments
franchise_applications (1) ──→ (M) franchise_verification
franchise_applications (1) ──→ (M) status_history
franchise_applications (1) ──→ (M) application_forms

franchise_owners (1) ──→ (M) franchise_outlets
franchise_outlets (1) ──→ (M) outlet_staff
franchise_outlets (1) ──→ (M) outlet_financials
```

---

## Tables

### 1. `users`
Stores all system users (admins, franchise owners, applicants)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Role & Status
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'franchise_owner', 'admin', 'sub_admin')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification')),
  
  -- Profile
  profile_picture_url TEXT,
  last_login TIMESTAMP,
  is_email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',  -- For extensibility: preferences, tags, etc.
  
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_role (role),
  INDEX idx_status (status)
);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

---

### 2. `franchise_applications`
Main records for franchise applications

```sql
CREATE TABLE franchise_applications (
  id VARCHAR(20) PRIMARY KEY,  -- Format: FR-YYYYMMDD-XXXX
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Application Identifiers
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  franchise_id VARCHAR(20),  -- Assigned after activation
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Franchise owner once assigned
  
  -- Status & Workflow
  status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN (
    'Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 
    'Onboarding', 'Go Live', 'Active'
  )),
  
  -- Applicant Basic Details
  proprietor_name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  district VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  
  -- Business Details
  business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('Individual', 'Firm', 'Company')),
  pan_number VARCHAR(20) UNIQUE,
  gst_number VARCHAR(30),
  sap_code VARCHAR(50),
  outlet_details TEXT,
  
  -- Bank Details
  account_number VARCHAR(20),
  ifsc_code VARCHAR(20),
  cancelled_cheque_url TEXT,
  
  -- Franchise Preferences (from application form)
  preferred_location VARCHAR(255),
  is_full_owner BOOLEAN DEFAULT TRUE,
  available_space INTEGER,  -- in sq ft
  preferred_model VARCHAR(50) CHECK (preferred_model IN ('COCO', 'FOCO', 'FOFO')),
  expected_timeline VARCHAR(100),
  investment_capacity VARCHAR(100),
  business_experience BOOLEAN DEFAULT FALSE,
  experience_description TEXT,
  why_franchise TEXT,
  remarks TEXT,
  
  -- Audit
  created_by VARCHAR(50),  -- admin, sub_admin, or user
  updated_by VARCHAR(50),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  FOREIGN KEY (applicant_id) REFERENCES users(id),
  FOREIGN KEY (owner_user_id) REFERENCES users(id),
  
  INDEX idx_status (status),
  INDEX idx_applicant_id (applicant_id),
  INDEX idx_owner_user_id (owner_user_id),
  INDEX idx_pan_number (pan_number),
  INDEX idx_gst_number (gst_number),
  INDEX idx_created_at (created_at),
  INDEX idx_city (city),
  UNIQUE INDEX idx_pan_per_status (pan_number, status)
);

CREATE TRIGGER update_franchise_applications_timestamp
BEFORE UPDATE ON franchise_applications
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

---

### 3. `status_history`
Tracks all status changes for an application

```sql
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id VARCHAR(20) NOT NULL,
  
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  reason TEXT,
  metadata JSONB DEFAULT '{}',  -- Additional context
  
  FOREIGN KEY (application_id) REFERENCES franchise_applications(id),
  
  INDEX idx_application_id (application_id),
  INDEX idx_changed_at (changed_at)
);
```

---

### 4. `franchise_documents`
Stores document uploads and versions

```sql
CREATE TABLE franchise_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id VARCHAR(20) NOT NULL,
  
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('aadhaar', 'pan', 'bank', 'cheque', 'agreement', 'other')),
  
  -- File Info
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,  -- in bytes
  mime_type VARCHAR(100),
  storage_path TEXT NOT NULL,  -- S3/Cloud path
  file_url TEXT NOT NULL,
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN DEFAULT TRUE,
  
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  FOREIGN KEY (application_id) REFERENCES franchise_applications(id) ON DELETE CASCADE,
  
  INDEX idx_application_id (application_id),
  INDEX idx_document_type (document_type),
  INDEX idx_uploaded_at (uploaded_at),
  UNIQUE INDEX idx_current_document (application_id, document_type, is_current)
);
```

---

### 5. `franchise_verification`
KYC and verification status

```sql
CREATE TABLE franchise_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id VARCHAR(20) NOT NULL UNIQUE,
  
  -- KYC Status
  kyc_verified BOOLEAN DEFAULT FALSE,
  kyc_verified_at TIMESTAMP,
  kyc_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  kyc_details JSONB DEFAULT '{}',  -- {panVerified, aadhaarVerified, bankVerified}
  
  -- Document Verification
  documents_verified BOOLEAN DEFAULT FALSE,
  documents_verified_at TIMESTAMP,
  documents_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Agreement
  agreement_signed BOOLEAN DEFAULT FALSE,
  agreement_signed_at TIMESTAMP,
  agreement_signed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  agreement_url TEXT,
  
  -- Terms
  terms_accepted BOOLEAN DEFAULT FALSE,
  terms_accepted_at TIMESTAMP,
  
  -- Background Check (extensible)
  background_check_status VARCHAR(50) DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'in_progress', 'passed', 'failed')),
  background_check_at TIMESTAMP,
  background_check_notes TEXT,
  
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (application_id) REFERENCES franchise_applications(id) ON DELETE CASCADE,
  
  INDEX idx_application_id (application_id),
  INDEX idx_kyc_verified (kyc_verified),
  INDEX idx_agreement_signed (agreement_signed)
);

CREATE TRIGGER update_franchise_verification_timestamp
BEFORE UPDATE ON franchise_verification
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

---

### 6. `franchise_payments`
Tracks all payments and fees

```sql
CREATE TABLE franchise_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id VARCHAR(20) NOT NULL,
  
  -- Payment Info
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('registration', 'onboarding', 'go_live', 'refund')),
  amount DECIMAL(12, 2) NOT NULL,
  
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'partial', 'refunded')),
  
  -- Payment Method
  payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('online', 'offline', 'cash', 'cheque', 'upi', 'bank_transfer')),
  transaction_number VARCHAR(100) UNIQUE,
  
  -- Dates
  payment_date DATE,
  due_date DATE,
  processed_at TIMESTAMP,
  
  -- References
  receipt_url TEXT,
  invoice_number VARCHAR(100),
  
  -- Audit
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  metadata JSONB DEFAULT '{}',
  
  FOREIGN KEY (application_id) REFERENCES franchise_applications(id) ON DELETE CASCADE,
  
  INDEX idx_application_id (application_id),
  INDEX idx_payment_type (payment_type),
  INDEX idx_status (status),
  INDEX idx_payment_date (payment_date),
  INDEX idx_transaction_number (transaction_number)
);
```

---

### 7. `franchise_owners`
Links approved franchises to their owners

```sql
CREATE TABLE franchise_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  franchise_id VARCHAR(20) NOT NULL UNIQUE,
  application_id VARCHAR(20) NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL,
  
  -- Ownership Details
  ownership_type VARCHAR(50) DEFAULT 'sole' CHECK (ownership_type IN ('sole', 'partnership', 'corporate')),
  partners_count INTEGER DEFAULT 0,
  
  -- Assignment Info
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Access
  access_credentials_sent BOOLEAN DEFAULT FALSE,
  access_credentials_sent_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
  
  metadata JSONB DEFAULT '{}',
  
  FOREIGN KEY (franchise_id) REFERENCES franchise_applications(id) ON DELETE RESTRICT,
  FOREIGN KEY (application_id) REFERENCES franchise_applications(id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_franchise_id (franchise_id),
  INDEX idx_owner_user_id (owner_user_id),
  INDEX idx_status (status)
);
```

---

### 8. `franchise_outlets`
Physical locations managed by franchise owners

```sql
CREATE TABLE franchise_outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  franchise_id VARCHAR(20) NOT NULL,
  outlet_code VARCHAR(50) NOT NULL UNIQUE,  -- Format: FO-XXXX
  
  -- Location Details
  outlet_name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  district VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Operations
  is_operational BOOLEAN DEFAULT FALSE,
  operational_start_date DATE,
  
  -- Capacity
  capacity_slots INTEGER,  -- Daily booking slots
  
  -- Contact
  phone VARCHAR(20),
  email VARCHAR(255),
  manager_name VARCHAR(255),
  
  status VARCHAR(50) NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'operational', 'closed', 'suspended')),
  
  metadata JSONB DEFAULT '{}',
  
  FOREIGN KEY (franchise_id) REFERENCES franchise_applications(id),
  
  INDEX idx_franchise_id (franchise_id),
  INDEX idx_outlet_code (outlet_code),
  INDEX idx_city (city),
  INDEX idx_is_operational (is_operational),
  INDEX idx_status (status)
);

CREATE TRIGGER update_franchise_outlets_timestamp
BEFORE UPDATE ON franchise_outlets
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

---

### 9. `outlet_staff`
Staff members assigned to outlets

```sql
CREATE TABLE outlet_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  outlet_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Role & Permissions
  role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'supervisor', 'operator', 'cleaner')),
  permissions JSONB DEFAULT '{}',  -- Fine-grained permissions
  
  -- Assignment
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  FOREIGN KEY (outlet_id) REFERENCES franchise_outlets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_outlet_id (outlet_id),
  INDEX idx_user_id (user_id),
  UNIQUE INDEX idx_outlet_user_role (outlet_id, user_id, role)
);
```

---

### 10. `outlet_financials`
Financial tracking per outlet

```sql
CREATE TABLE outlet_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  outlet_id UUID NOT NULL UNIQUE,
  
  -- Revenue
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  revenue_last_30_days DECIMAL(12, 2) DEFAULT 0,
  
  -- Expenses
  total_expenses DECIMAL(12, 2) DEFAULT 0,
  monthly_rent DECIMAL(10, 2),
  utilities DECIMAL(10, 2),
  staff_salary DECIMAL(10, 2),
  maintenance DECIMAL(10, 2),
  other_expenses DECIMAL(10, 2),
  
  -- Profit
  gross_profit DECIMAL(12, 2) DEFAULT 0,
  net_margin DECIMAL(5, 2),  -- Percentage
  
  -- Royalties
  royalty_percent DECIMAL(5, 2) DEFAULT 5.0,
  royalty_amount_due DECIMAL(12, 2) DEFAULT 0,
  royalty_amount_paid DECIMAL(12, 2) DEFAULT 0,
  
  -- Payment Status
  royalty_status VARCHAR(50) DEFAULT 'current' CHECK (royalty_status IN ('current', 'due_soon', 'overdue')),
  
  FOREIGN KEY (outlet_id) REFERENCES franchise_outlets(id) ON DELETE CASCADE,
  
  INDEX idx_outlet_id (outlet_id),
  INDEX idx_royalty_status (royalty_status)
);

CREATE TRIGGER update_outlet_financials_timestamp
BEFORE UPDATE ON outlet_financials
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

---

### 11. `admin_logs`
Audit trail for admin actions

```sql
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  admin_user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,  -- 'franchise_application', 'payment', etc.
  entity_id VARCHAR(100) NOT NULL,
  
  changes JSONB DEFAULT '{}',  -- Before/after values
  ip_address INET,
  user_agent TEXT,
  
  status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_admin_user_id (admin_user_id),
  INDEX idx_entity_type (entity_type),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action)
);
```

---

### 12. `application_forms`
Stores detailed form data separately for flexibility

```sql
CREATE TABLE application_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Store entire application form as JSONB for flexibility
  form_data JSONB NOT NULL,  -- Complete form submission
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Tracking
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP,
  
  FOREIGN KEY (application_id) REFERENCES franchise_applications(id) ON DELETE CASCADE,
  
  INDEX idx_application_id (application_id),
  INDEX idx_version (version)
);

CREATE TRIGGER update_application_forms_timestamp
BEFORE UPDATE ON application_forms
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

---

## Utility Functions

### Timestamp Auto-Update Trigger Function
```sql
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Indexes Strategy

### Performance Optimization
```sql
-- Composite indexes for common queries
CREATE INDEX idx_app_status_created ON franchise_applications(status, created_at DESC);
CREATE INDEX idx_payment_app_type ON franchise_payments(application_id, payment_type);
CREATE INDEX idx_doc_app_type_current ON franchise_documents(application_id, document_type, is_current);

-- Full-text search indexes
CREATE INDEX idx_proprietor_name_search ON franchise_applications USING GIN(to_tsvector('english', proprietor_name));
CREATE INDEX idx_city_search ON franchise_applications USING GIN(to_tsvector('english', city));
```

---

## Constraints & Rules

### 1. Application Workflow Constraints
```sql
-- Can't assign owner to non-approved application
ALTER TABLE franchise_applications ADD CONSTRAINT chk_owner_assignment
CHECK (
  CASE 
    WHEN owner_user_id IS NOT NULL THEN status IN ('Approved', 'Onboarding', 'Go Live', 'Active')
    ELSE TRUE
  END
);
```

### 2. Payment Rules
```sql
-- Payment date can't be in the future
ALTER TABLE franchise_payments ADD CONSTRAINT chk_payment_date
CHECK (payment_date IS NULL OR payment_date <= CURRENT_DATE);
```

---

## Views for Common Queries

### View: Active Franchises Summary
```sql
CREATE VIEW active_franchises_summary AS
SELECT 
  fa.id,
  fa.proprietor_name,
  fa.email,
  COUNT(DISTINCT fo.id) as outlet_count,
  SUM(CAST(of.total_revenue AS DECIMAL)) as total_revenue,
  fa.status
FROM franchise_applications fa
LEFT JOIN franchise_outlets fo ON fo.franchise_id = fa.id AND fo.status = 'operational'
LEFT JOIN outlet_financials of ON of.outlet_id = fo.id
WHERE fa.status = 'Active'
GROUP BY fa.id, fa.proprietor_name, fa.email, fa.status;
```

### View: Payment Summary by Application
```sql
CREATE VIEW payment_summary AS
SELECT 
  application_id,
  SUM(CASE WHEN payment_type = 'registration' THEN amount ELSE 0 END) as registration_fee,
  SUM(CASE WHEN payment_type = 'onboarding' THEN amount ELSE 0 END) as onboarding_fee,
  SUM(CASE WHEN payment_type = 'go_live' THEN amount ELSE 0 END) as go_live_fee,
  SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
  COUNT(DISTINCT CASE WHEN status = 'pending' THEN id END) as pending_count
FROM franchise_payments
GROUP BY application_id;
```

---

## Migration Strategy

### Phase 1: Core Tables
1. `users`
2. `franchise_applications`
3. `status_history`

### Phase 2: Supporting Tables
1. `franchise_documents`
2. `franchise_verification`
3. `franchise_payments`

### Phase 3: Operations
1. `franchise_owners`
2. `franchise_outlets`
3. `outlet_staff`
4. `outlet_financials`

### Phase 4: Audit & Flexibility
1. `admin_logs`
2. `application_forms`

---

## Data Dictionary

| Field | Type | Description |
|-------|------|-------------|
| UUID | UUID | Universally unique identifier (primary keys for most entities) |
| JSONB | JSONB | PostgreSQL's JSON binary format for flexible structured data |
| DECIMAL(12,2) | DECIMAL | Precise monetary values (12 digits, 2 decimals) |
| VARCHAR(n) | VARCHAR | Variable character strings with max length |
| TIMESTAMP | TIMESTAMP | Date and time with timezone |
| INET | INET | IP address type for audit logs |

---

## Backup & Recovery

### Daily Backups
```bash
pg_dump -U postgres -F c franchise_db > backup_$(date +%Y%m%d_%H%M%S).dump
```

### Point-in-Time Recovery
```bash
pg_restore -U postgres -d franchise_db backup_20260410_120000.dump
```

---

## Performance Recommendations

1. **Partitioning**: Partition `status_history` and `admin_logs` by date for very large datasets
2. **Archiving**: Archive completed applications older than 2 years to a separate schema
3. **Statistics**: Run `ANALYZE` weekly on high-traffic tables
4. **Vacuuming**: Run `VACUUM FULL` monthly during low-traffic windows
5. **Monitoring**: Use `pg_stat_statements` to identify slow queries

---

## Future Extensions

### Planned Features
- Multi-tenant support (add `tenant_id` column to core tables)
- Real-time notifications (add `notifications` table)
- Document versions & workflows (extend `franchise_documents`)
- Financial reporting (add `reports` table)
- Compliance tracking (add `compliance_checklist` table)

