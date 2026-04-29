# User Acceptance Testing (UAT) — Test Cases

**Phase**: 3 - Testing & Validation  
**Date**: 2026-04-22  
**Duration**: 3-5 business days  
**Test Environment**: Staging (docker-compose.staging.yml)

---

## Overview

UAT validates that the Entity Builder system meets business requirements and delivers the expected functionality. Test cases cover:

1. **Core Functionality** - Entity CRUD, record management, relationships
2. **Data Integrity** - Accuracy after migration, field mapping correctness
3. **Performance** - Response times, concurrent user handling
4. **Security** - Access control, data isolation, audit trails
5. **User Experience** - UI responsiveness, error handling, navigation
6. **Integration** - API compatibility, webhook integration, bulk operations

---

## Pre-UAT Setup

### Environment Preparation

```bash
# 1. Start staging environment
docker-compose -f docker-compose.staging.yml up -d

# 2. Run database migration
docker-compose -f docker-compose.staging.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/migrate-to-entity-builder.js run

# 3. Validate migration
docker-compose -f docker-compose.staging.yml exec backend \
  NODE_OPTIONS='--experimental-vm-modules' \
  node scripts/validate-migration.js

# 4. Create test data (if needed)
# - Add 10 new entities
# - Create 100+ records across entities
# - Set up 5+ relationships
# - Configure field permissions

# 5. Verify system health
curl http://localhost:3000/api/base/health
```

### Test User Accounts

Create test users with different roles:

| Username | Role | Email | Purpose |
|----------|------|-------|---------|
| `admin_user` | Admin | admin@test.dev | Full system access |
| `manager_user` | Manager | manager@test.dev | Read/write entities |
| `viewer_user` | Viewer | viewer@test.dev | Read-only access |
| `editor_user` | Editor | editor@test.dev | Create/edit records |

---

## Test Case Categories

### 1. Entity Management

#### TC-1.1: Create Entity
**Description**: User can create a new entity with name, label, description  
**Steps**:
1. Log in as admin
2. Navigate to `/settings/entities`
3. Click "New Entity"
4. Enter:
   - Name: `products`
   - Label: `Products`
   - Description: `Product inventory management`
5. Click "Create"

**Expected Result**: ✓
- Entity created successfully
- Redirects to entity detail page
- Entity appears in entity list

**Pass/Fail**: ☐

---

#### TC-1.2: Update Entity
**Description**: User can edit entity properties  
**Steps**:
1. Open existing entity
2. Edit label: `Products (Updated)`
3. Edit description: `Updated description`
4. Click "Save"

**Expected Result**: ✓
- Changes saved immediately
- Audit log entry created
- Entity list shows updated label

**Pass/Fail**: ☐

---

#### TC-1.3: Delete Entity
**Description**: User can delete an entity  
**Steps**:
1. Open entity detail page
2. Click "Delete Entity"
3. Confirm deletion

**Expected Result**: ✓
- Entity soft-deleted (not removed from DB)
- No longer visible in entity list
- Records still recoverable if needed

**Pass/Fail**: ☐

---

#### TC-1.4: Field Management
**Description**: User can add, edit, delete entity fields  
**Steps**:
1. Open entity "Fields" tab
2. Click "Add Field"
3. Enter:
   - Name: `sku`
   - Label: `SKU`
   - Type: `text`
   - Required: checked
4. Click "Save"
5. Verify field appears in form

**Expected Result**: ✓
- Field added successfully
- Appears in entity records form
- Validation enforced (required)

**Pass/Fail**: ☐

---

### 2. Record Management

#### TC-2.1: Create Record
**Description**: User can create a new record in an entity  
**Steps**:
1. Navigate to entity records view
2. Click "New Record"
3. Fill form:
   - Product Name: `Widget A`
   - SKU: `SKU-001`
   - Price: `29.99`
   - In Stock: checked
4. Click "Create"

**Expected Result**: ✓
- Record created successfully
- New record appears in list
- Timestamp recorded (createdAt)
- User recorded (createdBy)

**Pass/Fail**: ☐

---

#### TC-2.2: Edit Record
**Description**: User can update record data  
**Steps**:
1. Click on record in list
2. Edit field: Price `39.99`
3. Click "Update"

**Expected Result**: ✓
- Changes saved immediately
- Updated timestamp (updatedAt)
- User recorded (updatedBy)
- Audit log entry created

**Pass/Fail**: ☐

---

#### TC-2.3: Delete Record
**Description**: User can soft-delete a record  
**Steps**:
1. Open record
2. Click "Delete"
3. Confirm

**Expected Result**: ✓
- Record soft-deleted
- No longer visible in normal views
- Can be restored if needed
- Audit log entry created

**Pass/Fail**: ☐

---

#### TC-2.4: Bulk Create Records
**Description**: User can import multiple records  
**Steps**:
1. In records list, click "Import"
2. Select CSV file with 10 records
3. Click "Import"
4. Monitor job progress in Bull Board

**Expected Result**: ✓
- Job created and queued
- All records imported successfully
- No data loss or duplication
- Job completes in <2 minutes

**Pass/Fail**: ☐

---

### 3. Filtering & Sorting

#### TC-3.1: Filter Records
**Description**: User can filter records by field value  
**Steps**:
1. In records list, click "Add Filter"
2. Select field: "Status"
3. Select operator: "equals"
4. Enter value: "active"
5. Click "Apply"

**Expected Result**: ✓
- Only records with status="active" shown
- Filter badge displays on filter button
- Record count decreases appropriately

**Pass/Fail**: ☐

---

#### TC-3.2: Multiple Filters
**Description**: User can combine multiple filter conditions  
**Steps**:
1. Add filter: `status equals active`
2. Add filter: `price greater_than 20`
3. Click "Apply"

**Expected Result**: ✓
- Both filters applied (AND logic)
- Results match both conditions
- "Clear All" removes all filters

**Pass/Fail**: ☐

---

#### TC-3.3: Sort Records
**Description**: User can sort by field  
**Steps**:
1. Click on column header "Price"
2. Verify records sorted ascending
3. Click again for descending

**Expected Result**: ✓
- Records sorted by price
- Sort direction toggles
- Sort persists with pagination

**Pass/Fail**: ☐

---

### 4. Relationships

#### TC-4.1: Link Records
**Description**: User can create relationships between records  
**Steps**:
1. Open "Product" record
2. In "Related Customers" field, click "Add"
3. Search for "Customer A"
4. Select and save

**Expected Result**: ✓
- Relationship created
- Linked record displayed
- Reverse relationship visible on customer record

**Pass/Fail**: ☐

---

#### TC-4.2: Unlink Records
**Description**: User can remove relationships  
**Steps**:
1. Open record with relationship
2. Click "X" next to linked record
3. Confirm

**Expected Result**: ✓
- Relationship removed
- No longer displayed
- Reverse relationship also removed

**Pass/Fail**: ☐

---

### 5. Views

#### TC-5.1: List View
**Description**: Records display in table format  
**Steps**:
1. Navigate to entity with list view configured
2. Verify table structure

**Expected Result**: ✓
- Column headers visible
- All records displayed with pagination
- Sorting/filtering works
- Actions column functional

**Pass/Fail**: ☐

---

#### TC-5.2: Create View
**Description**: User can create custom views  
**Steps**:
1. Open "Views" tab
2. Click "New View"
3. Enter name: "High Value Products"
4. Set type: "list"
5. Select columns: SKU, Price, Stock
6. Save

**Expected Result**: ✓
- View created successfully
- View appears in view selector
- Custom columns displayed
- Can be set as default

**Pass/Fail**: ☐

---

### 6. Data Integrity

#### TC-6.1: Field Type Validation
**Description**: System validates field types  
**Steps**:
1. Create record with email field
2. Enter invalid email: "not-an-email"
3. Try to save

**Expected Result**: ✓
- Validation error displayed
- Record not saved
- Error message clear and actionable

**Pass/Fail**: ☐

---

#### TC-6.2: Required Field Validation
**Description**: Required fields cannot be empty  
**Steps**:
1. Create record
2. Leave required field empty
3. Try to save

**Expected Result**: ✓
- Validation error displayed
- Record not saved
- Field highlighted in red

**Pass/Fail**: ☐

---

#### TC-6.3: Unique Field Validation
**Description**: System enforces unique constraints  
**Steps**:
1. Create first record with SKU "SKU-001"
2. Create second record with same SKU
3. Try to save

**Expected Result**: ✓
- Validation error displayed
- Record not saved
- Error message indicates duplicate

**Pass/Fail**: ☐

---

### 7. Security & Access Control

#### TC-7.1: Role-Based Access
**Description**: User can only see allowed records  
**Steps**:
1. Log in as viewer user
2. Attempt to create record
3. Attempt to edit existing record

**Expected Result**: ✓
- Create button disabled or hidden
- Edit button disabled
- Read-only interface

**Pass/Fail**: ☐

---

#### TC-7.2: Company Isolation
**Description**: Users only see company-scoped records  
**Steps**:
1. Log in as user for Company A
2. Verify only Company A records visible
3. Switch to Company B user
4. Verify only Company B records visible

**Expected Result**: ✓
- Users see only their company's data
- No data leakage between companies
- API enforces scoping

**Pass/Fail**: ☐

---

#### TC-7.3: Audit Logging
**Description**: All changes are logged  
**Steps**:
1. Create a record
2. Edit it
3. Check audit log

**Expected Result**: ✓
- CREATE entry for new record
- UPDATE entry for changes
- User and timestamp recorded
- Changes tracked in detail

**Pass/Fail**: ☐

---

### 8. Performance

#### TC-8.1: List View Response Time
**Description**: List view loads quickly with large datasets  
**Steps**:
1. Ensure entity has 1000+ records
2. Navigate to records list
3. Measure load time

**Expected Result**: ✓
- Page loads in <2 seconds
- Pagination works smoothly
- Sorting/filtering <1 second

**Pass/Fail**: ☐ | **Time**: _______ ms

---

#### TC-8.2: Search Performance
**Description**: Search with filters is fast  
**Steps**:
1. Add complex filter (3+ conditions)
2. Execute search
3. Measure response time

**Expected Result**: ✓
- Filter applied in <1 second
- Results accurate
- No timeout errors

**Pass/Fail**: ☐ | **Time**: _______ ms

---

#### TC-8.3: Concurrent Users
**Description**: System handles multiple concurrent users  
**Steps**:
1. Simulate 20 concurrent users (load test)
2. Each user: create, edit, delete records
3. Monitor error rate

**Expected Result**: ✓
- All operations succeed
- No 500 errors
- Error rate <1%
- Response time stable

**Pass/Fail**: ☐

---

### 9. Error Handling

#### TC-9.1: Network Error Recovery
**Description**: System gracefully handles network issues  
**Steps**:
1. Start saving a record
2. Simulate network disconnect
3. Reconnect

**Expected Result**: ✓
- Error message displayed
- User can retry
- No data corruption

**Pass/Fail**: ☐

---

#### TC-9.2: Server Error Handling
**Description**: User-friendly error messages  
**Steps**:
1. Trigger a validation error
2. Observe error message

**Expected Result**: ✓
- Error message clear and helpful
- Not a generic 500 error
- Suggested action provided

**Pass/Fail**: ☐

---

### 10. Data Export

#### TC-10.1: Export Records to CSV
**Description**: User can export records  
**Steps**:
1. In records list, click "Export as CSV"
2. Confirm file download
3. Open CSV in spreadsheet

**Expected Result**: ✓
- File downloaded successfully
- All records included
- All columns present
- Data correctly formatted

**Pass/Fail**: ☐

---

#### TC-10.2: Bulk Export Job
**Description**: Export job is created and tracked  
**Steps**:
1. Click "Export"
2. Check Bull Board dashboard
3. Monitor job progress
4. Download result when complete

**Expected Result**: ✓
- Job appears in queue
- Status updates in real-time
- Job completes successfully
- File available for download

**Pass/Fail**: ☐

---

## Test Execution Summary

### Test Environment

- **URL**: http://staging.lume.dev (or localhost:3000)
- **Test Data**: Migrated from production backup
- **Tester**: _______________
- **Date**: _______________
- **Duration**: _______________

### Results Summary

| Category | Total | Passed | Failed | Notes |
|----------|-------|--------|--------|-------|
| Entity Management | 4 | ☐ | ☐ | |
| Record Management | 4 | ☐ | ☐ | |
| Filtering & Sorting | 3 | ☐ | ☐ | |
| Relationships | 2 | ☐ | ☐ | |
| Views | 2 | ☐ | ☐ | |
| Data Integrity | 3 | ☐ | ☐ | |
| Security | 3 | ☐ | ☐ | |
| Performance | 3 | ☐ | ☐ | |
| Error Handling | 2 | ☐ | ☐ | |
| Data Export | 2 | ☐ | ☐ | |
| **TOTAL** | **30** | **☐** | **☐** | |

### Pass/Fail Criteria

- **Pass**: All 30 test cases passed
- **Conditional Pass**: ≤2 test cases failed (non-critical)
- **Fail**: >2 test cases failed (blocking issues)

### Sign-Off

**QA Lead**: _________________________ Date: _______

**Product Manager**: _________________________ Date: _______

**Engineering Lead**: _________________________ Date: _______

---

## Bug Reporting Template

If a test fails, document using this template:

```
Bug ID: UAT-001
Severity: [Critical | High | Medium | Low]
Component: [Entity, Records, Filters, etc.]
Test Case: TC-X.X
Reproducibility: [Always | Sometimes | Rarely]

Description:
[Describe what happened]

Expected Behavior:
[What should have happened]

Actual Behavior:
[What actually happened]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Screenshot/Log:
[Attach if available]

Assigned To:
Status: [New | In Progress | Fixed | Verified]
```

---

## Success Criteria

**UAT passes when**:
- ✅ All critical test cases pass
- ✅ <2 non-critical issues found
- ✅ Performance targets met (P95 latency <500ms)
- ✅ No security vulnerabilities identified
- ✅ All stakeholders sign off
- ✅ Data migration verified 100% accurate

---

## Next Phase

Upon UAT completion:
1. Resolve any identified issues
2. Re-test fixed issues
3. Obtain final stakeholder approval
4. Proceed to Phase 4: Go-Live

