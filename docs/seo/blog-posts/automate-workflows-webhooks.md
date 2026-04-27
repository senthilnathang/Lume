---
title: "Automate Your Workflows with Lume Webhooks: 10 Real Examples"
slug: automate-workflows-webhooks
description: "Practical webhook automation examples for Lume: CRM workflows, notifications, integrations, and custom actions."
keywords: ["webhook automation", "CRM automation", "workflow automation", "API integration"]
target_volume: 1700
difficulty: 45
audience: ["Developers", "Technical Founders", "DevOps Teams"]
published_date: 2026-09-07
reading_time: 11
---

# Automate Your Workflows with Lume Webhooks: 10 Real Examples

Webhooks turn Lume into a workflow engine. When something happens in Lume (new contact, deal closed, form submitted), Lume sends a webhook to your system, triggering automated actions.

Here are 10 real-world examples with code.

---

## How Webhooks Work in Lume

1. **Trigger:** Something happens in Lume (contact created, opportunity moved to "closed-won")
2. **Payload:** Lume sends JSON data about the change
3. **Endpoint:** Your server receives the webhook
4. **Action:** Your code processes the data and does something (send email, create record, notify user)

---

## Example 1: Send Welcome Email When Contact is Added

**Trigger:** New Contact created
**Action:** Send personalized welcome email

```javascript
// Your webhook endpoint (Node.js example)
app.post('/webhooks/contact-created', (req, res) => {
  const { data } = req.body; // Contact data from Lume
  
  const emailContent = `
    Welcome ${data.first_name}!
    
    We're excited to connect. Here's what you can expect:
    - Personal onboarding call within 24 hours
    - Free trial access to all features
    - Dedicated support team
    
    Reply to this email with any questions.
  `;
  
  sendEmail({
    to: data.email,
    subject: `Welcome ${data.first_name}!`,
    body: emailContent
  });
  
  res.status(200).send({ success: true });
});
```

**Setup in Lume:**
1. Click **Automations**
2. Create webhook: "Contact Created Webhook"
3. Trigger: When Contact is created
4. Endpoint: https://yourserver.com/webhooks/contact-created
5. Save

---

## Example 2: Auto-Create Invoice When Deal Closes

**Trigger:** Opportunity moved to "Closed-Won"
**Action:** Create invoice in accounting system (QuickBooks, FreshBooks, etc.)

```javascript
app.post('/webhooks/deal-closed', async (req, res) => {
  const { data } = req.body; // Deal data
  
  const invoice = {
    customer_id: data.company_id,
    amount: data.amount,
    description: `Invoice for ${data.opportunity_name}`,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  };
  
  // Send to QuickBooks API
  await quickbooks.createInvoice(invoice);
  
  res.status(200).send({ success: true });
});
```

**Use case:** Save 5 min per deal × 50 deals/month = 4+ hours saved

---

## Example 3: Slack Notification for Hot Leads

**Trigger:** Contact moved to "Qualified" stage
**Action:** Post to Slack sales channel

```javascript
app.post('/webhooks/lead-qualified', async (req, res) => {
  const { data } = req.body;
  
  await slack.chat.postMessage({
    channel: '#sales',
    text: `🔥 New qualified lead!`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${data.first_name} ${data.last_name}*\nCompany: ${data.company}\nEmail: ${data.email}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in Lume' },
            url: `https://lume.yourdomain.com/contacts/${data.id}`
          }
        ]
      }
    ]
  });
  
  res.status(200).send({ success: true });
});
```

**Setup:** Create a Slack app, get webhook URL, use code above to post messages.

---

## Example 4: Sync Contacts to Email List (Mailchimp)

**Trigger:** Contact created or updated
**Action:** Add to Mailchimp subscriber list

```javascript
app.post('/webhooks/contact-sync', async (req, res) => {
  const { data } = req.body;
  
  const subscriber = {
    email_address: data.email,
    merge_fields: {
      FNAME: data.first_name,
      LNAME: data.last_name,
      COMPANY: data.company
    },
    status: 'subscribed'
  };
  
  // Add to Mailchimp list
  await mailchimp.lists.addListMember('list-id', subscriber);
  
  res.status(200).send({ success: true });
});
```

**Benefit:** Automatically keep your email list in sync with CRM

---

## Example 5: Create Task Reminders via SMS

**Trigger:** Activity created with type "Phone Call"
**Action:** Send SMS reminder to user

```javascript
app.post('/webhooks/activity-created', async (req, res) => {
  const { data } = req.body;
  
  if (data.activity_type === 'Phone Call') {
    const reminderTime = new Date(data.scheduled_time);
    const minutesBefore = 15;
    
    // Schedule SMS reminder 15 min before
    scheduleReminder({
      phone: data.assigned_user.phone,
      message: `Reminder: Call ${data.contact_name} in 15 min`,
      sendAt: new Date(reminderTime - minutesBefore * 60 * 1000)
    });
  }
  
  res.status(200).send({ success: true });
});
```

**Tool:** Use Twilio or Nexmo for SMS

---

## Example 6: Auto-Update Customer Success CRM

**Trigger:** Invoice paid (via Stripe webhook)
**Action:** Mark deal as "Paid" in Lume

```javascript
// First, receive Stripe webhook
app.post('/webhooks/stripe-payment', (req, res) => {
  const event = req.body;
  
  if (event.type === 'payment_intent.succeeded') {
    const { amount, metadata } = event.data.object;
    
    // Now call Lume API to update
    fetch('https://api.lume.dev/api/opportunities/' + metadata.opportunity_id, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer YOUR_LUME_API_KEY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'Paid',
        payment_date: new Date().toISOString(),
        amount_paid: amount / 100
      })
    });
  }
  
  res.status(200).send({ received: true });
});
```

**Workflow:** Stripe payment → Update Lume → Invoice marked paid

---

## Example 7: Generate PDF Reports When Deal Closes

**Trigger:** Deal moved to "Closed-Won"
**Action:** Generate PDF summary, send to stakeholders

```javascript
app.post('/webhooks/generate-report', async (req, res) => {
  const { data } = req.body;
  
  const reportHTML = `
    <h1>Deal Closed: ${data.opportunity_name}</h1>
    <p>Amount: $${data.amount}</p>
    <p>Customer: ${data.company}</p>
    <p>Closed Date: ${new Date(data.close_date).toLocaleDateString()}</p>
    <p>Deal Duration: ${calculateDays(data.created_at, data.close_date)} days</p>
  `;
  
  const pdfBuffer = await generatePDF(reportHTML);
  
  // Send email with PDF
  await sendEmail({
    to: ['sales@company.com', 'management@company.com'],
    subject: `Deal Closed: ${data.opportunity_name}`,
    body: 'See attached report',
    attachments: [{ filename: 'deal-report.pdf', content: pdfBuffer }]
  });
  
  res.status(200).send({ success: true });
});
```

---

## Example 8: Sync to Google Sheets (Live Dashboard)

**Trigger:** Opportunity created or updated
**Action:** Add row to Google Sheets

```javascript
app.post('/webhooks/sync-sheets', async (req, res) => {
  const { data } = req.body;
  
  // Use Google Sheets API
  const sheets = google.sheets('v4');
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: 'YOUR_SHEET_ID',
    range: 'Opportunities!A:G',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [[
        data.opportunity_name,
        data.company,
        data.amount,
        data.stage,
        data.close_date,
        data.probability,
        new Date().toISOString()
      ]]
    }
  });
  
  res.status(200).send({ success: true });
});
```

**Benefit:** Live updating dashboard in Google Sheets for non-technical users

---

## Example 9: Assign Contacts to Sales Reps via Routing Logic

**Trigger:** Contact created
**Action:** Auto-assign to sales rep based on territory/industry

```javascript
app.post('/webhooks/auto-assign', async (req, res) => {
  const { data } = req.body;
  
  // Routing logic
  let assignedRep;
  if (data.company_industry === 'Healthcare') {
    assignedRep = 'john@company.com'; // Healthcare specialist
  } else if (data.company_size > 500) {
    assignedRep = 'jane@company.com'; // Enterprise specialist
  } else {
    assignedRep = 'mike@company.com'; // Default
  }
  
  // Update contact in Lume
  await fetch(`https://api.lume.dev/api/contacts/${data.id}`, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer API_KEY' },
    body: JSON.stringify({ assigned_to: assignedRep })
  });
  
  res.status(200).send({ success: true });
});
```

**Benefit:** Equal opportunity distribution, hot leads routed to specialists

---

## Example 10: Archive Old Leads Automatically

**Trigger:** Scheduled daily (cron job)
**Action:** Move leads older than 90 days to archive

```javascript
// Cron job (runs daily)
cron.schedule('0 2 * * *', async () => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  // Get old leads from Lume
  const oldLeads = await fetch(
    `https://api.lume.dev/api/contacts?created_before=${ninetyDaysAgo.toISOString()}`,
    { headers: { 'Authorization': 'Bearer API_KEY' } }
  ).then(r => r.json());
  
  // Archive each one
  for (const lead of oldLeads) {
    await fetch(`https://api.lume.dev/api/contacts/${lead.id}`, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer API_KEY' },
      body: JSON.stringify({ archived: true })
    });
  }
  
  console.log(`Archived ${oldLeads.length} old leads`);
});
```

**Benefit:** Keep your CRM clean without manual work

---

## Getting Started with Webhooks

1. **Set up a webhook endpoint** on your server (use ngrok for testing locally)
2. **Test with Postman:** Manually POST test data to your endpoint
3. **Create automation in Lume** pointing to your endpoint
4. **Monitor logs** to ensure webhooks are working
5. **Scale with queues** once you have high-volume webhooks (use BullMQ, RabbitMQ)

---

## Best Practices

- **Always verify webhooks:** Check the signature/token to ensure they're from Lume
- **Retry logic:** If your endpoint fails, Lume retries 3x (exponential backoff)
- **Idempotency:** Design endpoints to handle duplicate webhooks safely
- **Logging:** Log every webhook for debugging
- **Rate limiting:** Don't overload external APIs (batch updates when possible)

---

## Get Started

Deploy a simple webhook handler using [Vercel](https://vercel.com) or [Heroku](https://heroku.com) for free. Then connect it to Lume automations.

Questions? Ask in our [community Discord](https://discord.gg/lume).
