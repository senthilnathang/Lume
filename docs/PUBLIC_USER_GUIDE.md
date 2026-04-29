# Lume v2.0 User Guide

**Last Updated:** April 28, 2026  
**Version:** 2.0.0  
**Status:** Production Ready

Complete guide to using Lume for data management, automations, and team collaboration.

---

## Table of Contents

1. [UI Overview & Navigation](#ui-overview--navigation)
2. [Entity & Field Management](#entity--field-management)
3. [Record Operations (CRUD)](#record-operations-crud)
4. [Views (List, Form, Gallery, Calendar, Kanban)](#views-list-form-gallery-calendar-kanban)
5. [Filtering, Sorting & Grouping](#filtering-sorting--grouping)
6. [Relationships](#relationships)
7. [Automations & Workflows](#automations--workflows)
8. [Webhooks & Integrations](#webhooks--integrations)
9. [User Management & Permissions](#user-management--permissions)
10. [Settings & Configuration](#settings--configuration)
11. [Collaboration Features](#collaboration-features)
12. [Tips & Best Practices](#tips--best-practices)

---

## UI Overview & Navigation

### Main Dashboard

When you log into Lume, you'll see the main dashboard with:

**Left Sidebar:** Primary navigation showing:
- **Modules:** All installed modules (Base, Security, Editor, Website, Media, etc.)
- **Favorites:** Quick access to frequently used entities
- **Search:** Global search across all data
- **Settings:** Profile, notifications, integrations
- **Help:** Documentation links and support

**Main Content Area:** 
- Entity list or selected record details
- Views and filters applied
- Action buttons for creating/editing records

**Top Navigation Bar:**
- **Search:** Quick global search
- **Notifications:** Real-time updates on automations, comments
- **Profile Menu:** Account settings, logout
- **Help:** Link to documentation

### Module View

Each module in Lume contains related entities. For example:
- **Base Module:** Contains Core entities (Users, Roles, Settings)
- **Website Module:** Contains Pages, Menus, Media files
- **Editor Module:** Contains Templates, Snippets
- **Custom Modules:** Your own entities and extensions

Click on a module to expand and see all entities within it.

### Entity Overview

When you select an entity (like "Contacts"), you see:

**Entity Header:**
- Entity name and icon
- Number of records
- Quick action buttons (+ New Record, ⋮ Menu)

**Tabs:**
- **Records:** All records in the selected view
- **Views:** Available views (List, Form, etc.)
- **Fields:** Entity field structure
- **Settings:** Entity configuration
- **Permissions:** Access control
- **Automation:** Workflows for this entity

**Status Bar:**
- Number of records loaded
- Filter status
- Sort order

---

## Entity & Field Management

### Understanding Entities

An **entity** is Lume's term for a database table. Think of it as a container for one type of data:
- **Contacts:** Customer and lead information
- **Projects:** Project management data
- **Invoices:** Financial records
- **Tasks:** To-do items

Each entity has:
- **Fields:** Columns that define what data is stored (e.g., First Name, Email)
- **Records:** Rows of data (e.g., John Smith, john@example.com)
- **Views:** Different ways to display the data (list, form, calendar, etc.)
- **Permissions:** Who can view and edit the data
- **Automations:** Triggered actions based on record changes

### Creating an Entity

1. In the sidebar, select the module where you want the entity
2. Click **+ New Entity**
3. Configure:
   - **Name:** Plural form (e.g., "Contacts")
   - **Singular:** Singular form (e.g., "Contact")
   - **Description:** What this entity stores
   - **Icon:** Visual identifier
4. Click **Create**
5. You'll be taken to the field builder

### Deleting an Entity

⚠️ **Warning:** Deleting an entity deletes all its records and cannot be undone.

1. Go to entity settings (⋮ menu > Settings)
2. Scroll to **Danger Zone**
3. Click **Delete Entity**
4. Confirm by typing the entity name

### Entity Configuration

Access entity settings from the entity menu (⋮ > Settings):

**Basic Settings:**
- Name and description
- Icon and color
- Visibility (hidden/visible in sidebar)
- Archive entity (soft delete, don't show in UI)

**Record Settings:**
- Display name template (how records appear in relationships)
- Allow duplicate records
- Auto-increment ID
- Default sort order

**Advanced:**
- Custom entity URL slug
- Enable audit logging (default: enabled)
- Enable versioning
- Soft delete (records can be restored)

---

## Field Types & Properties

Lume supports 15+ field types for capturing different kinds of data:

### Text Fields

**Text (String)**
- Single line of text
- Max length: 255 characters
- Examples: Name, Email, Phone
- Options: Required, Unique, Default value, Min/Max length

**Email**
- Validated email address format
- Automatically validates format (no @ = error)
- Useful for sending automated emails
- Options: Required, Unique

**Phone**
- Phone number with optional formatting
- Examples: (555) 123-4567, +1 555-123-4567
- Can validate format by country

**URL**
- Web address with validation
- Automatically validates http(s):// format
- Clickable in list views

**Long Text / Textarea**
- Multi-line text field
- Unlimited characters
- Good for notes, descriptions, comments
- Can enable rich text editing (bold, italic, lists)

### Number Fields

**Number (Integer)**
- Whole numbers: -2147483648 to 2147483647
- Examples: Quantity, Age, Years

**Decimal**
- Numbers with decimal places
- Examples: Price ($19.99), Rating (4.5)
- Set decimal places (2 for currency)

**Currency**
- Decimal with currency symbol
- Display in user's currency
- Set decimal places

**Percentage**
- 0-100% values
- Displayed as percentage with optional % symbol

### Date & Time Fields

**Date**
- Calendar date without time
- Format: MM/DD/YYYY (customizable)
- Useful for deadlines, birthdays

**Date & Time**
- Full timestamp with date and time
- Time zone aware
- Useful for events, created_at timestamps

**Time**
- Just the time portion
- Format: HH:MM (24-hour or 12-hour AM/PM)

### Boolean & Select

**Checkbox**
- True/False toggle
- Useful for flags: Is Archived, Is Featured, Is Verified
- Displays as checkbox in forms

**Select (Dropdown)**
- Choose one value from predefined list
- Examples: Status (New, In Progress, Done), Priority (Low, Medium, High)
- Can allow custom values or restrict to list

**Multi-Select**
- Choose multiple values from list
- Stored as array of values
- Examples: Tags, Skills, Interests

### File & Media

**File Upload**
- Upload single file
- Store on server, CDN, or cloud storage (S3)
- Configurable max file size
- Show file name and download link

**Image**
- Upload image file (JPG, PNG, GIF, WebP)
- Display as thumbnail in list/gallery views
- Auto-generate responsive versions

**Files (Multiple)**
- Upload multiple files
- Store as array of file objects
- Show file gallery

### Relationships

**Relationship (Foreign Key)**
- Link to another entity's record
- Examples: Contact → Company, Task → Project
- See next section for detailed info

**Many-to-Many**
- Link to multiple records in another entity
- Examples: Student → Courses, Article → Tags
- Automatic linking table created

### System Fields

**ID (Primary Key)**
- Unique identifier for each record
- Auto-generated integer or UUID
- Read-only

**Created At**
- Timestamp when record created
- Auto-set, cannot be edited
- Good for "created recently" sorting

**Updated At**
- Timestamp of last modification
- Auto-updated on any field change
- Useful for "recently modified" filters

**Deleted At**
- For soft-deleted records (if enabled)
- Hidden from normal views unless filtering
- Can restore deleted records

### Field Properties (All Fields)

Every field has common properties:

**Required:** Record cannot be saved without a value

**Unique:** No two records can have the same value

**Default Value:** Automatically set if user doesn't enter one

**Help Text:** Instructions shown below the field

**Visible in List:** Show/hide in list view

**Searchable:** Include in global search

**Read-Only:** Field cannot be edited after creation

**Validation Rules:** Custom regex patterns or logic

### Adding Fields to an Entity

1. Select the entity
2. Click **Fields** tab
3. Click **+ Add Field**
4. Choose field type
5. Configure:
   - **Field Name:** Display name
   - **Field Type:** Dropdown to select
   - **Field Properties:** Required, unique, default, etc.
   - **Validation:** Patterns or range
6. Click **Save**

### Editing Field Properties

1. Select entity > Fields tab
2. Click the field name
3. Modify properties
4. Click **Save**

⚠️ **Note:** Changing field types can cause data loss (e.g., text to number conversion). Backup before major changes.

### Deleting a Field

⚠️ **Warning:** Deleting a field deletes all data in that column.

1. Entity > Fields tab
2. Click field
3. Scroll to **Danger Zone**
4. Click **Delete Field**
5. Confirm

---

## Record Operations (CRUD)

CRUD stands for Create, Read, Update, Delete—the four basic operations for managing records.

### Create (Add New Record)

**Method 1: Using + New Button**

1. Select entity > View
2. Click **+ New [Entity Name]**
3. Form opens with empty fields
4. Fill in the data
5. Click **Save** or **Save & Add Another**

**Method 2: Using Form View**

1. Select entity > Form view
2. Click **+ New Record**
3. Fill in form fields
4. Click **Save**

**Method 3: Using Duplicate**

1. Open an existing record
2. Click ⋮ menu > **Duplicate**
3. Modify fields as needed
4. Click **Save as New**

**Method 4: Using API**

```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com"
  }'
```

### Read (View Records)

**List View:**
1. Select entity and view
2. Records displayed in table format
3. Click row to open detail view
4. Scroll to see more records
5. Use pagination controls for large datasets

**Detail View:**
1. Click any record in list
2. Drawer or modal opens showing all fields
3. Edit inline or open full form
4. Close when done

**Related Records:**
1. Open a record
2. Scroll to relationship fields
3. See linked records with option to add more

### Update (Edit Record)

**Inline Editing (in List View):**
1. Click field value in table
2. Edit directly
3. Press Enter to save or Escape to cancel

**Form Editing:**
1. Click record to open
2. Click **Edit** or double-click field
3. Modify fields
4. Click **Save**

**Bulk Editing:**
1. Select multiple records (checkboxes)
2. Click **Bulk Actions**
3. Choose **Edit Selected**
4. Select field to edit
5. Enter new value
6. Click **Apply to [X] records**

**API Update:**

```bash
curl -X PUT http://localhost:3000/api/contacts/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "Customer"}'
```

### Delete (Remove Record)

**Soft Delete (Default):**
Records are marked as deleted but can be restored.

1. Select record
2. Click ⋮ menu > **Delete**
3. Confirm deletion
4. Record removed from normal views
5. Can restore from **Deleted Items** view

**Restore Deleted Record:**
1. View > **Show Deleted Records** filter
2. Find record
3. Click **Restore**

**Hard Delete:**
Permanently removes record (cannot be undone).

1. Select record
2. Click ⋮ menu > **Delete Permanently**
3. Confirm twice
4. Record permanently deleted

**Bulk Delete:**
1. Select multiple records
2. Click **Delete Selected**
3. Choose soft or hard delete
4. Confirm

### Import Records

**From CSV:**
1. Select entity
2. Click ⋮ menu > **Import**
3. Upload CSV file
4. Map CSV columns to entity fields
5. Preview import
6. Click **Import**

**From Spreadsheet:**
1. Copy data from Excel/Google Sheets
2. Click ⋮ menu > **Paste**
3. Select columns to import
4. Click **Import**

### Export Records

**Export as CSV:**
1. Select view with records
2. Click ⋮ menu > **Export as CSV**
3. Specify fields to include
4. Download starts

**Export as Excel:**
1. Select entity and view
2. Click ⋮ menu > **Export as Excel**
3. Opens Excel file with records

**API Export:**

```bash
# Get all contacts as JSON
curl -X GET "http://localhost:3000/api/contacts?limit=1000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Views (List, Form, Gallery, Calendar, Kanban)

Views are different ways to display and interact with your records. Lume supports 5 view types.

### List View

Displays records in a sortable, filterable table.

**Best for:** Overview of all records, data entry, quick scanning

**Features:**
- Add/remove columns
- Inline editing
- Sorting by any column
- Row selection (bulk actions)
- Export
- Grouping

**Create List View:**
1. Entity > Views tab
2. Click **+ New View**
3. Select **List View**
4. Configure:
   - **Name:** View title
   - **Columns:** Which fields to display
   - **Default Sort:** Sort order
   - **Filters:** Pre-applied filters
   - **Grouping:** Group by field (optional)
5. Click **Create**

**Using List View:**
- Click column header to sort
- Click field value to edit inline
- Click row to open detail
- Use filter button to apply filters
- Drag column headers to reorder
- Right-click column header for options (hide, sort, etc.)

### Form View

Single record form for data entry with organized field layout.

**Best for:** Creating and editing records, data entry forms

**Features:**
- Custom field layout
- Sections and dividers
- Field grouping
- Required field highlighting
- Rich text editor support
- File upload preview

**Create Form View:**
1. Entity > Views tab
2. Click **+ New View**
3. Select **Form View**
4. Drag fields to organize layout
5. Add sections: Click **+ Section**, name it, drag fields into it
6. Configure:
   - **Default Values**
   - **Read-Only Fields** (for certain users)
   - **Submit Behavior** (save and close, save and new, etc.)
7. Click **Create**

**Using Form View:**
- Click **+ New Record** to open blank form
- Click existing record to edit
- Tab to move between fields
- Some fields show inline preview (images, relationships)
- Click **Save** to persist changes

### Gallery View

Visual display of records with image thumbnails.

**Best for:** Visual browsing (portfolio, real estate listings, products)

**Features:**
- Image preview
- Card layout
- Click to open detail
- Filter and sort
- Drag to reorder (optional)

**Create Gallery View:**
1. Entity > Views tab
2. Click **+ New View**
3. Select **Gallery View**
4. Configure:
   - **Image Field:** Which field contains images
   - **Title Field:** What appears as card title
   - **Subtitle Field:** Additional info on card
   - **Description:** Long text preview
5. Click **Create**

**Using Gallery View:**
- Scroll to browse cards
- Click card to open full record
- Cards are responsive (mobile-friendly)
- Sort by clicking ⋮ > Sort
- Filter by clicking filter button

### Calendar View

Display records with date fields on an interactive calendar.

**Best for:** Event tracking, deadlines, date-based data

**Features:**
- Month, week, day views
- Drag events to reschedule
- Color coding by status
- Tooltip preview
- Create events by clicking date

**Create Calendar View:**
1. Entity > Views tab
2. Click **+ New View**
3. Select **Calendar View**
4. Configure:
   - **Date Field:** Which date field to use
   - **Title:** What to display on calendar event
   - **Color By:** Optional color coding field
5. Click **Create**

**Using Calendar View:**
- View modes: Month, Week, Day (click tabs)
- Click date to create record
- Drag event to change date
- Click event to open record
- Use filters to show subset

### Kanban View

Organize records into columns/stages (like a Trello board).

**Best for:** Pipeline management, workflow stages, todo lists

**Features:**
- Drag cards between columns
- Vertical scrolling within columns
- Card preview with key fields
- Filter across all columns
- Add cards directly

**Create Kanban View:**
1. Entity > Views tab
2. Click **+ New View**
3. Select **Kanban View**
4. Configure:
   - **Group By Field:** Usually a Status or Stage field
   - **Card Title:** How to label each card
   - **Card Details:** Additional fields shown on card
   - **Column Order:** Arrange stages
5. Click **Create**

**Using Kanban View:**
- Drag cards between columns to change status
- Click card to see full record
- Add column for new stage
- Use filter to show subset of cards
- Sort within columns

---

## Filtering, Sorting & Grouping

### Filtering

Filters narrow down records to show only those matching certain criteria.

**Simple Filter:**
1. Click filter icon in list view
2. Select field to filter by
3. Choose operator (equals, contains, greater than, etc.)
4. Enter value
5. Click **Apply**

**Complex Filter (AND/OR):**
1. Click filter icon
2. Click **Advanced**
3. Build condition groups:
   - Field "contains" value AND
   - Field "equals" value OR
   - Field "is empty"
4. Click **Apply**

**Common Filter Examples:**

```
Status = "Done"          (equals)
Email contains "gmail"   (contains)
Amount > 1000           (greater than)
Date is this month      (relative date)
Created > 7 days ago    (date range)
Tags includes "urgent"  (multi-select contains)
Company is empty        (relationship is empty)
```

**Save Filter:**
1. Create filter
2. Click **Save Filter**
3. Name it: "My Filter"
4. Next time, select from dropdown

**Remove Filter:**
1. Click filter icon
2. Click **Clear All** or **X** on specific filter

### Sorting

Order records by one or more fields.

**Single Column Sort:**
1. Click column header in list view
2. Click once for A→Z (ascending)
3. Click again for Z→A (descending)
4. Click again to remove sort

**Multi-Column Sort:**
1. Click column header (establishes primary sort)
2. While holding Shift, click another column (secondary sort)
3. Continue for tertiary sort

**Save Default Sort:**
1. Set sort order
2. Click ⋮ view menu > **Save as Default**
3. This view always opens with this sort

**Sort Examples:**
- By date: Newest first (updated_at descending)
- By name: A to Z (firstName ascending)
- By priority: High to Low (priority descending)
- By status then name: Group by status, then alphabetically within each group

### Grouping

Organize records into collapsible groups.

**Group by Field:**
1. Click ⋮ menu
2. Select **Group By**
3. Choose field (usually Status, Category, or Date)
4. Records organized into sections
5. Click section to collapse/expand

**Group by Examples:**
- By Status: New, In Progress, Done
- By Priority: High, Medium, Low
- By Month: January, February, March (for dates)
- By First Letter: A-D, E-H, etc. (for text)

**Remove Grouping:**
1. Click ⋮ menu
2. Select **Ungroup**

---

## Relationships

Relationships connect records in different entities together.

### Understanding Relationships

**One-to-Many:** One record in Entity A connects to many in Entity B
- Company → Employees (one company has many employees)
- Project → Tasks (one project has many tasks)

**Many-to-Many:** Records link bidirectionally
- Students ↔ Courses (one student takes many courses, one course has many students)
- Articles ↔ Tags (one article has many tags, one tag applies to many articles)

### Creating Relationship Fields

**Add Relationship Field:**
1. Select entity
2. Click Fields tab
3. Click **+ Add Field**
4. Type: Select **Relationship**
5. Configure:
   - **Field Name:** "Company" or "Manager"
   - **Related Entity:** Which entity to link to
   - **Relationship Type:** One-to-Many or Many-to-Many
   - **Reverse Field Name:** Name for reverse side
6. Click **Create**

Lume automatically creates the reverse relationship field in the related entity.

### Using Relationships

**Link Records (One-to-Many):**
1. Open record in Employee entity
2. Find Company field
3. Click **Select Company**
4. Search and choose company
5. Save

**Unlink Records:**
1. Open record
2. Click relationship field
3. Click **X** or **Remove**
4. Save

**Add Related Record (Inline):**
1. Open record with relationship
2. Click **+ Add** in relationship section
3. Form opens for new related record
4. Fill in data
5. Save
6. New record automatically linked

**Many-to-Many:**
1. Open record
2. Find many-to-many field
3. Click **+ Add**
4. Select multiple options
5. Click **Save**

### Displaying Related Data

**In List View:**
Show related record info in list columns.

1. List view > Columns
2. Click **+ Add Column**
3. Select relationship field
4. Choose what to display from related record
   - Name/Title
   - Email
   - Status
   - Custom formula combining fields
5. Column now shows related data

**In Forms:**
Related records shown as mini-views.

1. Open record
2. Scroll to relationship field
3. See all linked records in collapsible section
4. Click to expand and see details

**Using Relationships in Filters:**
Filter by related record properties.

```
Company → Status = "Active"
(Show employees whose company status is Active)

Student → Courses → Instructor = "John"
(Show students taking courses taught by John)
```

---

## Automations & Workflows

Automations let you trigger actions automatically when records change.

### Understanding Automations

An automation has:
- **Trigger:** When something happens (record created, field updated, schedule)
- **Conditions:** Optional criteria (if status = "done")
- **Actions:** What to do (send email, create record, API call)

### Creating Automations

**Simple Automation: Send Email on New Record**

1. Entity > Automation tab
2. Click **+ New Automation**
3. **Trigger:** Select "When record is created"
4. **Conditions (Optional):** Add "Status = Customer"
5. **Actions:** Click **+ Add Action**
6. Select **Send Email**
7. Configure:
   - **To:** Use email field from record
   - **Subject:** "Welcome, {firstName}!"
   - **Body:** HTML email template
8. Click **Create Automation**

**Advanced Automation: Multi-Step Workflow**

1. Create automation
2. Set trigger: "When Status field changes"
3. Add conditions: "New status = Done"
4. Add multiple actions in sequence:
   - Action 1: Send email to {email}
   - Action 2: Create related record in "Completed" entity
   - Action 3: Update related Manager → Total Completed count
   - Action 4: POST webhook to external system

### Automation Triggers

**Record-Based:**
- Record is created
- Record is updated
- Record is deleted
- Specific field changes
- Field reaches threshold (amount > 1000)

**Schedule-Based:**
- On a schedule (daily, weekly, monthly)
- On specific date/time
- Recurring (every 1st of month at 9 AM)

**External:**
- Webhook received
- API call triggers automation
- Third-party integration (Zapier, IFTTT)

### Automation Actions

**Email:** Send email to user, contact, or custom address

**Notification:** Notify user in-app

**Create Record:** Create related record with values

**Update Record:** Update current or related record

**API Call:** POST/PUT to external endpoint

**Slack:** Send message to Slack channel

**Database:** Update records in current or other entities

**Conditional (If/Then):** Branch logic based on conditions

### Automation Best Practices

✅ **Do:**
- Test automation with few records first
- Use conditions to limit scope
- Log actions for debugging
- Document automation purpose

❌ **Don't:**
- Create circular automations (A creates B, B creates A)
- Update triggering record (causes re-trigger)
- Send unlimited emails (use conditions)
- Forget to test before deploying

### Disabling/Editing Automations

1. Entity > Automation tab
2. Find automation in list
3. Click to edit or use toggle to disable
4. Modifications take effect immediately
5. Save changes

---

## Webhooks & Integrations

Webhooks let you send data to external systems when records change.

### Creating Webhooks

**Outgoing Webhook (Send to External System):**

1. Entity > Settings > Webhooks
2. Click **+ New Webhook**
3. Configure:
   - **URL:** External endpoint (e.g., https://api.example.com/contacts)
   - **Event:** When to trigger (create, update, delete)
   - **Conditions:** Optional filters
   - **Headers:** Authentication headers if needed
   - **Payload:** Data to send
4. Click **Create**

**Example Webhook Payload:**
```json
{
  "event": "contact.created",
  "timestamp": "2026-04-28T10:30:00Z",
  "data": {
    "id": 123,
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "status": "New Lead"
  }
}
```

**Incoming Webhook (Receive Data):**

1. Entity > Automation tab
2. Create automation
3. Set trigger: "Webhook received"
4. System generates webhook URL
5. External system POSTs to this URL
6. Automation processes data

### Pre-Built Integrations

**Slack Integration:**

1. Settings > Integrations > Slack
2. Click **Connect Slack**
3. Authorize Lume in Slack
4. In automations, add action "Send to Slack"
5. Choose channel
6. Format message

**Email Integration:**

- Automatically set up (no configuration needed)
- Send emails from automations
- Support HTML templates
- Track opens/clicks (if using email service)

**Stripe Integration (Payment Processing):**

1. Settings > Integrations > Stripe
2. Connect Stripe account
3. Add Stripe fields to entities
4. Use in automations to charge customers

**Google Sheets Integration:**

1. Settings > Integrations > Google Sheets
2. Authorize Google account
3. Create automation
4. Action: "Append to Google Sheet"
5. Records automatically sync to sheet

**Zapier / n8n Integration:**

Use Lume's webhook as trigger in Zapier/n8n to connect to 5,000+ apps:
- Mailchimp (email)
- HubSpot (CRM)
- Airtable (sync data)
- Slack (notifications)
- Google Drive (backup)

### Testing Webhooks

**Test Webhook:**
1. Edit webhook
2. Click **Test**
3. System sends test payload
4. Check external system received it
5. Verify data formatted correctly

**Retry Failed Webhooks:**
1. Click webhook
2. View **Recent Deliveries**
3. Find failed delivery
4. Click **Retry**
5. Monitor logs for success

---

## User Management & Permissions

### Adding Users

**Invite User:**
1. Settings > Users
2. Click **+ Invite User**
3. Enter email address
4. Select role (Admin, Editor, Viewer)
5. Click **Send Invitation**
6. User receives email with login link

**Bulk Invite:**
1. Settings > Users
2. Click **Bulk Invite**
3. Paste email addresses (one per line)
4. Select role
5. Click **Invite All**

### User Roles

**Admin:**
- Full access to all features
- Can manage other users
- Can install/uninstall modules
- Can configure system settings

**Editor:**
- Can create and edit records
- Can modify own profile
- Cannot access system settings
- Can access assigned entities

**Viewer:**
- Can only view records
- Cannot create or edit
- Limited to assigned views
- Good for read-only access

### Permission Levels

**Record-Level Permissions:**
- Some entities have record ownership
- Owner can restrict edit/view to specific users or roles

**Field-Level Permissions:**
- Hide sensitive fields from certain users
- Example: Hide salary field from non-managers

**Entity-Level Permissions:**
- Control which roles can access which entities
- Example: Only Admins see audit logs

### Configuring Permissions

**Entity Permissions:**
1. Entity > Settings > Permissions
2. Select role
3. Check/uncheck capabilities:
   - View
   - Create
   - Edit
   - Delete
4. Click **Save**

**Field Permissions:**
1. Entity > Fields
2. Click field
3. Scroll to **Permissions**
4. Set read/edit access per role
5. Click **Save**

### Managing Users

**Edit User:**
1. Settings > Users
2. Click user name
3. Change role or permissions
4. Click **Save**

**Reset User Password:**
1. Settings > Users
2. Click user
3. Click **Reset Password**
4. User receives email with reset link

**Deactivate User:**
1. Settings > Users
2. Click user
3. Click **Deactivate**
4. User cannot login
5. Can reactivate later

**Remove User:**
1. Settings > Users
2. Click user
3. Click **Remove**
4. Confirm deletion

---

## Settings & Configuration

### Profile Settings

**Change Password:**
1. Settings > Profile
2. Click **Change Password**
3. Enter current password
4. Enter new password (min 12 characters)
5. Confirm new password
6. Click **Change**

**Update Profile:**
1. Settings > Profile
2. Edit name, avatar, timezone
3. Click **Save**

**Notification Preferences:**
1. Settings > Notifications
2. Toggle notification types:
   - Email on mention
   - Automation summaries
   - Mention notifications
   - Update digests
3. Save

### Email Configuration

**Setup SMTP:**
1. Settings > Email
2. Enter SMTP credentials:
   - Host (smtp.gmail.com)
   - Port (587)
   - Username
   - Password
3. Click **Test Email**
4. Check inbox for test email
5. Click **Save**

**Email Templates:**
1. Settings > Email Templates
2. Customize templates for:
   - Welcome email
   - Password reset
   - Automation notifications
3. Use variables: {firstName}, {email}, {link}

### API Keys

**Create API Key:**
1. Settings > API Keys
2. Click **+ Generate Key**
3. Name it (e.g., "Zapier Integration")
4. Select scopes (read, write, delete)
5. Copy key (won't be shown again)
6. Use in API calls: `-H "Authorization: Bearer KEY"`

**Revoke API Key:**
1. Settings > API Keys
2. Click **Revoke** on key
3. Key no longer works
4. All integrations using it will fail

### Integrations

See previous section for setting up integrations (Slack, Stripe, Google Sheets, etc.).

---

## Collaboration Features

### Comments & Discussions

**Add Comment to Record:**
1. Open record
2. Click **Comments** tab
3. Type comment
4. @mention someone: `@John Smith`
5. Click **Post**

**Reply to Comment:**
1. Click **Reply** under comment
2. Type response
3. Click **Reply**

**Notifications:**
- Mentioned users get notified
- Can @notify in automations

### Activity Log

**View Record History:**
1. Open record
2. Click **Activity** tab
3. See all changes:
   - Who changed what
   - When
   - Old value → New value

**Record Audit Trail:**
Every change is logged:
- Record creation
- Field updates
- Comments added
- Automations triggered
- User who made change
- Exact timestamp

### Team Collaboration

**Shared Views:**
1. Entity > Views
2. Click view > Share
3. Select who can view:
   - Specific users
   - Roles
   - All users
4. Set permissions: View or Edit

**Mentioned in Automations:**
- Automations can mention users
- Users notified in-app and by email
- Great for task assignments

---

## Tips & Best Practices

### Entity Design

✅ **Use descriptive names:**
- "Customers" instead of "Data"
- "Opportunities" instead of "Things"

✅ **Keep entities focused:**
- One type of data per entity
- Don't mix unrelated data

✅ **Use relationships:**
- Link rather than duplicate data
- Company address in Company entity, not repeated in Contacts

✅ **Plan fields upfront:**
- Adding fields is easy, removing is harder
- Think about what data you need

### Field Organization

✅ **Order logically:**
- Name fields first
- Contact info next
- Status/metadata last

✅ **Use field types correctly:**
- Email type for emails (validates format)
- Number type for numbers (enables math)
- Date type for dates (enables calendar sorting)

✅ **Add help text:**
- Guide users on what to enter
- Reduce data entry errors

### Views & Filtering

✅ **Create role-specific views:**
- Managers see pipeline view
- Team members see assigned tasks only
- Admins see all data

✅ **Use saved filters:**
- "My Tasks"
- "Open Issues"
- "This Month's Revenue"

✅ **Default sort matters:**
- Recent items first (updated_at desc)
- Important first (priority desc)
- Alphabetical (lastName asc)

### Automation Best Practices

✅ **Start simple:**
- Single action first
- Add complexity gradually
- Test with few records

✅ **Use conditions:**
- Don't email all records
- Only notify when status changes
- Limit scope to relevant data

✅ **Monitor automations:**
- Check logs for errors
- Verify outcomes
- Disable if causing issues

### Performance Tips

✅ **Use filters:**
- Don't load all records if you don't need them
- Filtered views faster than full entity

✅ **Archive old data:**
- Move completed projects to archive
- Reduces list sizes
- Faster queries

✅ **Index heavily-queried fields:**
- Status fields
- Date fields
- Foreign keys
- Often-filtered fields

### Data Security

✅ **Use field permissions:**
- Hide salary from non-managers
- Hide SSN from viewers
- Different data per role

✅ **Audit logging:**
- Keep it enabled (default)
- Review logs regularly
- Detect unauthorized changes

✅ **Regular backups:**
- Export critical data weekly
- Keep backup off-site
- Test restore process

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + /` | Open command palette |
| `Cmd/Ctrl + K` | Global search |
| `Cmd/Ctrl + N` | New record |
| `Cmd/Ctrl + S` | Save |
| `Cmd/Ctrl + E` | Edit |
| `Escape` | Close modal |
| `Tab` | Next field |
| `Shift + Tab` | Previous field |
| `Enter` | Save (in form) |
| `Cmd/Ctrl + Z` | Undo |

---

## Troubleshooting User Issues

### Can't Create Record

**Check:**
- Do you have Editor or Admin role?
- Are required fields filled?
- Is entity view not in read-only mode?

### Changes Not Saving

**Check:**
- Click Save button explicitly
- Check for validation errors
- Look at browser console for errors

### Can't See Record

**Check:**
- Is it filtered out?
- Remove filters and try again
- Check permissions (do you have access?)

### Automation Didn't Trigger

**Check:**
- Is automation enabled?
- Do conditions match?
- Check automation logs for errors
- Test with automation directly

---

**Need help?** Check [PUBLIC_GETTING_STARTED.md](PUBLIC_GETTING_STARTED.md) for setup, or [PUBLIC_API_REFERENCE.md](PUBLIC_API_REFERENCE.md) for API details.

