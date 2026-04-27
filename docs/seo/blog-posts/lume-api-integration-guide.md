---
title: "Lume REST API Integration Guide: Build Custom Apps"
slug: lume-api-integration-guide
description: "Complete REST API reference for Lume with code examples for JavaScript, Python, and cURL."
keywords: ["REST API", "API integration", "webhook", "custom integration", "developer guide"]
target_volume: 1900
difficulty: 48
audience: ["Developers", "Technical Founders", "API Users"]
published_date: 2026-09-09
reading_time: 12
---

# Lume REST API Integration Guide: Build Custom Apps

The Lume API lets you build custom applications on top of Lume. Read data, create records, update entities, trigger automations—all via REST API.

---

## Authentication

All API requests require an API key. Get yours from **Settings → API Keys**.

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.lume.dev/api/contacts
```

**Rate limits:**
- Free tier: 1,000 requests/day
- Pro tier: 100,000 requests/day
- Enterprise: Unlimited

---

## Base Endpoints

### Contacts (Example)

```
GET    /api/contacts              # List all contacts
GET    /api/contacts/:id          # Get single contact
POST   /api/contacts              # Create contact
PUT    /api/contacts/:id          # Update contact
DELETE /api/contacts/:id          # Delete contact
POST   /api/contacts/:id/restore  # Restore deleted contact
```

---

## Example 1: Create a Contact

**JavaScript (Fetch)**

```javascript
const createContact = async () => {
  const response = await fetch('https://api.lume.dev/api/contacts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      company: 'Acme Corp',
      phone: '+1-555-0123',
      lead_status: 'Prospecting'
    })
  });
  
  const contact = await response.json();
  console.log('Created:', contact.id);
  return contact;
};

createContact();
```

**Python**

```python
import requests

url = 'https://api.lume.dev/api/contacts'
headers = {'Authorization': 'Bearer YOUR_API_KEY'}
data = {
    'first_name': 'John',
    'last_name': 'Doe',
    'email': 'john@example.com',
    'company': 'Acme Corp',
    'phone': '+1-555-0123',
    'lead_status': 'Prospecting'
}

response = requests.post(url, json=data, headers=headers)
contact = response.json()
print(f"Created contact: {contact['id']}")
```

**cURL**

```bash
curl -X POST https://api.lume.dev/api/contacts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "phone": "+1-555-0123",
    "lead_status": "Prospecting"
  }'
```

---

## Example 2: List & Filter Contacts

**JavaScript**

```javascript
const listContacts = async (filters = {}) => {
  const query = new URLSearchParams();
  
  // Add filters
  if (filters.company) query.append('company', filters.company);
  if (filters.lead_status) query.append('lead_status', filters.lead_status);
  if (filters.limit) query.append('limit', filters.limit);
  if (filters.offset) query.append('offset', filters.offset);
  
  const url = `https://api.lume.dev/api/contacts?${query}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
  });
  
  const contacts = await response.json();
  console.log(`Found ${contacts.total} contacts`);
  return contacts;
};

// Usage
listContacts({ 
  company: 'Acme Corp', 
  lead_status: 'Qualified',
  limit: 50 
});
```

**Advanced filtering:**

```javascript
// Get contacts created in last 7 days
listContacts({
  created_after: new Date(Date.now() - 7*24*60*60*1000).toISOString()
});

// Get hot leads
listContacts({
  lead_status: 'Qualified',
  last_contacted_before: new Date(Date.now() - 7*24*60*60*1000).toISOString()
});
```

---

## Example 3: Update a Contact

**JavaScript**

```javascript
const updateContact = async (contactId, updates) => {
  const response = await fetch(`https://api.lume.dev/api/contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  const contact = await response.json();
  console.log('Updated:', contact.id);
  return contact;
};

// Usage
updateContact('contact-123', {
  lead_status: 'Negotiating',
  last_contacted: new Date().toISOString()
});
```

---

## Example 4: Bulk Operations

**Create multiple contacts**

```javascript
const bulkCreate = async (contactList) => {
  const response = await fetch('https://api.lume.dev/api/contacts/bulk', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'create',
      records: contactList
    })
  });
  
  const result = await response.json();
  console.log(`Created ${result.success} contacts`);
  console.log(`Failed: ${result.failed}`);
  return result;
};

// Usage
bulkCreate([
  { first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com' },
  { first_name: 'Bob', last_name: 'Jones', email: 'bob@example.com' },
  { first_name: 'Carol', last_name: 'White', email: 'carol@example.com' }
]);
```

**Bulk update**

```javascript
const bulkUpdate = async (updates) => {
  const response = await fetch('https://api.lume.dev/api/contacts/bulk', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'update',
      records: updates // Array of {id, ...changes}
    })
  });
  
  return await response.json();
};

// Usage
bulkUpdate([
  { id: 'contact-1', lead_status: 'Qualified' },
  { id: 'contact-2', lead_status: 'Qualified' },
  { id: 'contact-3', lead_status: 'Disqualified' }
]);
```

---

## Example 5: Linked Records (Relationships)

**Create contact linked to company**

```javascript
const createLinkedContact = async () => {
  // First, get or create company
  const companyResponse = await fetch('https://api.lume.dev/api/companies', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
    body: JSON.stringify({
      name: 'Acme Corp',
      website: 'https://acme.example.com',
      industry: 'Technology'
    })
  });
  
  const company = await companyResponse.json();
  
  // Create contact linked to company
  const contactResponse = await fetch('https://api.lume.dev/api/contacts', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
    body: JSON.stringify({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@acme.example.com',
      company_id: company.id  // Link to company
    })
  });
  
  const contact = await contactResponse.json();
  return contact;
};
```

---

## Example 6: Search & Query

**Full-text search**

```javascript
const searchContacts = async (query) => {
  const response = await fetch(
    `https://api.lume.dev/api/contacts/search?q=${encodeURIComponent(query)}`,
    { headers: { 'Authorization': 'Bearer YOUR_API_KEY' } }
  );
  
  const results = await response.json();
  return results; // Array of matching contacts
};

searchContacts('john acme');
```

---

## Example 7: Error Handling

```javascript
const safeApiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(
      `https://api.lume.dev${endpoint}`,
      {
        headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
        ...options
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error:', error.message);
    
    // Retry logic for rate limits
    if (error.message.includes('429')) {
      console.log('Rate limited. Retrying in 60s...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return safeApiCall(endpoint, options); // Retry
    }
    
    throw error;
  }
};
```

---

## Example 8: Pagination

```javascript
const getAllContacts = async () => {
  let allContacts = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `https://api.lume.dev/api/contacts?offset=${offset}&limit=${limit}`,
      { headers: { 'Authorization': 'Bearer YOUR_API_KEY' } }
    );
    
    const data = await response.json();
    allContacts = [...allContacts, ...data.records];
    
    hasMore = data.records.length === limit;
    offset += limit;
  }
  
  return allContacts;
};
```

---

## API Response Format

**Success (200)**

```json
{
  "id": "contact-123",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "created_at": "2026-04-27T10:30:00Z",
  "updated_at": "2026-04-27T10:30:00Z"
}
```

**Error (400)**

```json
{
  "error": true,
  "code": "VALIDATION_ERROR",
  "message": "Email already exists",
  "details": {
    "field": "email",
    "reason": "duplicate"
  }
}
```

---

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Check permissions |
| 404 | Not found | Verify entity ID |
| 409 | Conflict | Duplicate email or ID |
| 429 | Rate limited | Wait 60s, retry |
| 500 | Server error | Contact support |

---

## Documentation & Resources

- **Full API docs:** https://docs.lume.dev/api
- **OpenAPI spec:** https://api.lume.dev/openapi.json
- **Code examples:** https://github.com/lume-dev/api-examples
- **Community:** https://discord.gg/lume

---

## Get Started

1. Get API key from Settings
2. Test with cURL
3. Build your integration
4. Deploy to production

Questions? Ask in our [Discord community](https://discord.gg/lume).
