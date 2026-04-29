---
title: "Build a Custom CRM Without Writing Code: Step-by-Step Guide"
slug: build-crm-without-code
description: "Learn how to build a production-ready CRM using Lume's visual page builder, without writing any code."
keywords: ["no-code CRM", "visual page builder", "custom CRM", "low-code platform"]
target_volume: 1800
difficulty: 35
audience: ["Startups", "Non-technical Founders", "Business Managers"]
published_date: 2026-09-05
reading_time: 10
---

# Build a Custom CRM Without Writing Code: Step-by-Step Guide

You don't need a developer to build a CRM anymore. In this guide, I'll walk you through building a production-ready CRM in Lume using only the visual interface—no code required.

By the end, you'll have:
- A contact management system
- A sales pipeline tracker
- Automated workflows
- A customer portal

**Time to complete: 2-3 hours**

---

## Step 1: Set Up Your Entities (30 min)

Entities in Lume are like tables in a database. For our CRM, we need:

1. **Contacts**
   - Name, Email, Phone, Company
   - Lead status (prospecting, qualified, negotiating, closed)
   - Last contacted date
   - Notes

2. **Companies**
   - Company name, website, industry
   - Number of employees
   - Annual revenue
   - Related contacts (linked field)

3. **Opportunities**
   - Opportunity name
   - Company (linked to Companies)
   - Stage (prospecting, proposal, negotiating, closed-won, closed-lost)
   - Amount
   - Close date
   - Related contact

4. **Activities**
   - Activity type (call, email, meeting)
   - Related contact/opportunity
   - Date and time
   - Notes
   - Completed (checkbox)

**How to create:**
1. Log into Lume admin panel
2. Click **Modules → Website (or Base)**
3. Click **+ New Entity**
4. For each entity above:
   - Enter the name
   - Add fields using the visual field builder
   - Click **Save**

---

## Step 2: Configure Field Types (20 min)

For each entity, add the right field types:

**Text fields** (for names, emails, notes):
- Click **+ Add Field**
- Choose **Text** type
- Label: "Contact Name"
- Save

**Select fields** (for status/stage dropdowns):
- Click **+ Add Field**
- Choose **Select**
- Label: "Lead Status"
- Add options: Prospecting, Qualified, Negotiating, Closed
- Save

**Number fields** (for revenue, amount):
- Choose **Number**
- Label: "Opportunity Amount"
- Currency: USD
- Save

**Date fields** (for close dates, last contacted):
- Choose **Date**
- Label: "Close Date"
- Save

**Linked fields** (to connect entities):
- Choose **Link to Entity**
- Label: "Related Contact"
- Link to: Contact entity
- Save

**Checklist fields** (for activity completion):
- Choose **Checkbox**
- Label: "Completed"
- Save

**Pro tip:** Use **Default values** to auto-fill common data (e.g., new contacts default to "prospecting" status).

---

## Step 3: Set Up Views & Filters (30 min)

Views are how you see your data. For each entity, create these views:

### Contacts Entity

**View 1: "All Contacts"**
- Table view of all contacts
- Columns: Name, Company, Lead Status, Last Contacted
- Sortable by: Last Contacted (newest first)

**View 2: "Hot Leads"**
- Filter: Lead Status = "Qualified"
- Columns: Name, Company, Phone, Email
- This view shows only leads ready to close

**View 3: "Companies"**
- Group by: Company name
- Shows all contacts grouped by their company

### Opportunities Entity

**View 1: "Sales Pipeline"**
- Kanban view (drag contacts between stages)
- Stages: Prospecting → Proposal → Negotiating → Closed-Won / Closed-Lost
- Card shows: Opportunity name, Amount, Contact name

**View 2: "Deals This Month"**
- Filter: Close date = This month
- Columns: Name, Amount, Stage, Close Date
- Sum amount by stage at the bottom

### Activities Entity

**View 1: "My Activities"**
- Filter: Created by = Current user
- Columns: Activity Type, Related Contact, Date, Completed
- Sortable by date (newest first)

**View 2: "Completed Activities"**
- Filter: Completed = true
- Shows activities marked as done

---

## Step 4: Create Automated Workflows (20 min)

Automate repetitive tasks using Lume's workflow builder:

### Workflow 1: Auto-Update Activity Date

When an activity is marked completed, automatically set completion date:

1. Click **Automations**
2. Create new automation:
   - **Trigger:** When "Activity" is created/updated AND "Completed" checkbox is checked
   - **Action:** Set "Completion Date" = today's date
   - Save

### Workflow 2: Escalate Old Leads

Move leads that haven't been contacted in 30 days to "follow-up":

1. Click **Automations**
2. Create new automation:
   - **Trigger:** Scheduled (daily check)
   - **Condition:** "Last Contacted" is older than 30 days AND "Lead Status" = "Qualified"
   - **Action:** Send email to assigned user: "Follow up with [Contact Name]"
   - Save

### Workflow 3: Create Follow-Up Activity

When an opportunity moves to "Proposal" stage, auto-create a follow-up call activity:

1. Click **Automations**
2. Create new automation:
   - **Trigger:** When "Opportunity" is updated AND "Stage" changes to "Proposal"
   - **Action:** Create new "Activity" with:
     - Activity Type = "Call"
     - Related Opportunity = [the opportunity]
     - Date = 3 days from now
   - Save

---

## Step 5: Build a Customer Portal (40 min)

Lume's Page Builder lets you create a portal where customers can see their opportunities:

1. Click **Pages** in the admin panel
2. Create new page: "Customer Portal"
3. Click **Edit** → Switch to **Visual Editor**

**Add these sections:**

### Section 1: Welcome

- Add text: "Welcome, [Customer Name]"
- Add button: "View My Opportunities"

### Section 2: My Opportunities

- Drag in an **Entity List** block
- Set to show **Opportunities** where "Company = Current User's Company"
- Columns: Name, Amount, Stage, Close Date
- Color opportunities by stage (green=won, orange=proposal, red=lost)

### Section 3: Recent Activities

- Drag in an **Entity List** block
- Set to show **Activities** where "Related Opportunity = Opportunities shown above"
- Columns: Type, Date, Notes
- Filter to last 10 activities

### Section 4: Contact Your Account Manager

- Add text and contact info
- Add button to contact form

4. Click **Publish**
5. Share portal URL with customers

---

## Step 6: Set Up Access Control (20 min)

Control who sees what:

1. Click **Modules → Base → Roles**
2. Create role: "Sales Rep"
   - Permissions:
     - Can view/edit: Contacts, Opportunities, Activities
     - Can create: Activities, Notes
     - Cannot view: Sensitive company data
   - Save

3. Assign users to roles in **Users** section

4. Set **Field-level permissions:**
   - Click entity → Select field
   - Only admins can edit "Salary" or "Revenue" fields
   - Sales reps can view but not edit
   - Save

---

## Step 7: Connect Email & Calendar (15 min)

**Optional but powerful:**

1. Click **Integrations**
2. Connect Gmail or Outlook
   - All emails to contacts auto-log as activities
   - Calendar invites auto-create activities

3. Connect Zapier (optional)
   - New customer signup → Create contact in Lume
   - Email received → Log activity
   - Contact moved to "Closed-Won" → Send to accounting system

---

## Step 8: Train Your Team (20 min)

1. Create a training guide (in Lume pages)
   - How to add new contacts
   - How to log activities
   - How to advance opportunities
   - How to generate reports

2. Invite team members
3. Assign roles
4. Point them to the training guide

---

## What You've Built

You now have a **production-ready CRM** with:

✅ Contact management with lead scoring
✅ Sales pipeline (Kanban view)
✅ Activity tracking and automation
✅ Customer portal for transparency
✅ Role-based access control
✅ Email integration
✅ Workflow automation

**Cost: $0** (just infrastructure to self-host)
**Time: ~3 hours**
**Code written: 0 lines**

---

## Next Steps

1. **Import existing data:** Upload CSV of current contacts/opportunities
2. **Customize further:** Add more fields, reports, or workflows as needed
3. **Mobile app:** Lume provides native mobile apps for iOS/Android
4. **API for integrations:** Connect to your other tools via REST API

---

## Get Started Now

[Deploy Lume](https://lume.dev) and follow this guide. You'll have a custom CRM running in 3 hours.

Questions? Join our [community](https://discord.gg/lume) or email support@lume.dev.
