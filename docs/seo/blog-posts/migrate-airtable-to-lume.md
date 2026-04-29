---
title: "Migrate from Airtable to Lume in 2 Days: Complete Guide"
slug: migrate-airtable-to-lume
description: "Step-by-step guide to migrating your Airtable bases to Lume with zero downtime."
keywords: ["Airtable migration", "data migration", "CRM migration", "open-source CRM"]
target_volume: 1700
difficulty: 42
audience: ["Technical Founders", "DevOps Teams", "Operations Managers"]
published_date: 2026-09-08
reading_time: 10
---

# Migrate from Airtable to Lume in 2 Days: Complete Guide

Migrating from Airtable to Lume is straightforward. This guide walks you through the process with minimal downtime.

**Timeline:** 2-3 days
**Downtime:** 0 hours (can run parallel during migration)
**Cost:** $0-200 (just infrastructure)

---

## Pre-Migration Checklist (Day 1, Morning)

- [ ] Backup your Airtable base (export all data as CSV)
- [ ] List all bases you're migrating (name, number of records, field count)
- [ ] Document all automations in Airtable
- [ ] Document all views and filters you use
- [ ] Get team buy-in on timeline
- [ ] Set up Lume instance (or managed hosting account)

---

## Step 1: Export Data from Airtable (30 min)

For each Airtable base:

1. Open the base in Airtable
2. Click the **grid icon** (top right) → **Download CSV**
3. Save file as `base-name-export.csv`
4. Repeat for all tables/bases

**Important:** Check that CSV includes all columns, especially:
- Linked records (exported as IDs)
- Attachments (URLs only, not files)
- Formulas (values only, not formulas)

---

## Step 2: Map Airtable Structure to Lume (1 hour)

Create a mapping document:

```
AIRTABLE → LUME

Base: CRM
├─ Table: Contacts
│  ├─ Name (Text) → name (Text)
│  ├─ Email (Email) → email (Email)
│  ├─ Company (Text) → company (Text)
│  ├─ Lead Status (Single select) → lead_status (Select)
│  └─ Linked Records: Companies → Link to Company entity
│
├─ Table: Companies
│  ├─ Name (Text) → name (Text)
│  ├─ Website (URL) → website (URL)
│  └─ Industry (Single select) → industry (Select)
│
└─ Table: Activities
   ├─ Type (Single select) → activity_type (Select)
   ├─ Contact (Link to Contacts) → contact_id (Link to Contact)
   └─ Date (Date) → activity_date (Date)
```

**Key mappings:**
- Airtable's **Single Select** → Lume's **Select**
- Airtable's **Linked Records** → Lume's **Link to Entity**
- Airtable's **Attachments** → Lume's **File** (same concept)
- Airtable's **Formula** → Lume's **Calculated Field** (if available) or manual calculation

---

## Step 3: Create Entities in Lume (2 hours)

In your Lume instance:

1. Go to **Modules** → **Base**
2. Create each entity from your mapping:

**Example: Create Contact entity**

```
Entity Name: Contact
Fields:
- name (Text)
- email (Email)
- phone (Text, optional)
- company (Link to Company entity)
- lead_status (Select: Prospecting, Qualified, Negotiating, Closed)
- last_contacted (Date, optional)
- notes (LongText, optional)
```

3. Create **Select field options** to match Airtable values exactly
4. Create **Link fields** between entities

**Time-saver:** Use Lume's bulk import feature (upcoming v2.1) if available.

---

## Step 4: Transform and Clean Data (2 hours)

Before importing, transform your CSV data:

**Example Python script:**

```python
import csv
import json
from datetime import datetime

def transform_airtable_csv(input_file, output_file):
    """Transform Airtable CSV to Lume import format"""
    
    rows = []
    with open(input_file, 'r') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Clean email
            if row['Email']:
                row['email'] = row['Email'].strip().lower()
            
            # Map status values
            status_map = {
                'Lead': 'Prospecting',
                'MQL': 'Qualified',
                'SQL': 'Negotiating',
                'Won': 'Closed-Won'
            }
            if 'Lead Status' in row:
                row['lead_status'] = status_map.get(row['Lead Status'], row['Lead Status'])
            
            # Convert Airtable date to ISO format
            if 'Created' in row and row['Created']:
                date_obj = datetime.strptime(row['Created'], '%m/%d/%Y')
                row['created_at'] = date_obj.isoformat()
            
            # Remove Airtable-specific columns
            if 'Airtable ID' in row:
                del row['Airtable ID']
            
            rows.append(row)
    
    # Write transformed data
    with open(output_file, 'w') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Transformed {len(rows)} rows")

transform_airtable_csv('contacts-export.csv', 'contacts-import.csv')
```

**Check for:**
- Empty rows
- Duplicate emails
- Invalid dates
- Mismatched select values

---

## Step 5: Import Data to Lume (1 hour)

**Option A: Bulk API (fastest for large datasets)**

```bash
curl -X POST https://api.lume.dev/api/contacts/bulk \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @contacts-import.json
```

**Option B: UI Import**

1. Go to **Contacts** in Lume
2. Click **⋯ → Import**
3. Upload your CSV file
4. Map columns (Lume auto-detects)
5. Click **Import**

Lume processes data in the background.

---

## Step 6: Verify Data (1 hour)

After import:

1. **Count check:** Compare row counts
   ```
   Airtable: 2,534 contacts
   Lume: 2,534 contacts ✅
   ```

2. **Sample check:** Verify 10 random records
3. **Link check:** Confirm linked records resolved correctly
4. **Date check:** Verify all dates imported correctly
5. **View check:** Recreate key views and filters

**Fix any issues:**
- Re-run data transformation
- Re-import (Lume overwrites duplicates via email/ID)

---

## Step 7: Recreate Automations (2 hours)

Airtable automations don't auto-migrate. Recreate them in Lume:

**Example Airtable automation:**
```
When: Record created
If: Status = "Qualified"
Then: Send email to manager
```

**Recreate in Lume:**
1. Go to **Automations**
2. Create new automation
3. Trigger: Contact created AND lead_status = "Qualified"
4. Action: Send email to [manager email]
5. Save

---

## Step 8: Migrate Workflows (Webhooks & Integrations)

**Zapier workflows:**

1. Update Zapier triggers to point to Lume API
2. Example: "Trigger: Lume contact created → Action: Send Slack message"
3. Test each Zapier workflow

**Custom integrations:**

If you have custom scripts connecting to Airtable:

```javascript
// Old (Airtable)
const Airtable = require('airtable');
const base = new Airtable.base(AIRTABLE_API_KEY);

// New (Lume)
const axios = require('axios');
const lume = axios.create({
  baseURL: 'https://api.lume.dev',
  headers: { 'Authorization': 'Bearer ' + LUME_API_KEY }
});

// Usage: instead of base('Contacts').select(), use:
const contacts = await lume.get('/api/contacts');
```

---

## Step 9: Team Training (1 hour)

Before going live:

1. **UI walkthrough:** Show team where data moved
2. **Views demo:** Show equivalent views in Lume
3. **Workflow demo:** Show automation triggers
4. **Mobile app:** Install Lume mobile app on team phones
5. **Q&A:** Answer common questions

---

## Step 10: Go Live & Monitor (30 min)

**On migration day:**

1. **Parallel run** (1 week): Keep Airtable active while team uses Lume
2. **Monitor usage:** Track team adoption
3. **Backup Airtable:** Keep old data for 30 days
4. **Announce cutover:** Set date when Airtable turns off
5. **Final sync:** Last-minute data sync for any changes

---

## Step 11: Archive Airtable (Day 30)

After 30 days of parallel running:

1. Export final Airtable backup (archive copy)
2. Downgrade Airtable account or cancel
3. Remove Airtable from team devices
4. Save $100-500/month 🎉

---

## Rollback Plan

If migration goes wrong:

1. Keep Airtable data for 30 days
2. Keep export CSVs as backups
3. If critical issue: Re-import data, revert team to Airtable
4. Troubleshoot and retry

**Probability of rollback:** <1% (most migrations are smooth)

---

## Cost Savings

**Before (Airtable):**
- 20 users × $10/month = $200/month = $2,400/year

**After (Lume self-hosted):**
- Infrastructure: $50/month = $600/year
- No per-user costs

**Annual savings: $1,800** (and you own your data)

---

## Get Help

- **Community:** Ask questions in our [Discord](https://discord.gg/lume)
- **Migration support:** Email migrate@lume.dev for personalized guidance
- **Documentation:** Check [Lume API docs](https://docs.lume.dev)

---

## Ready to Migrate?

Start with [Lume setup](https://lume.dev). Migration takes 2-3 days and costs $0-200 in infrastructure.

Questions? Reach out anytime.
