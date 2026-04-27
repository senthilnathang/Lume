---
title: "Managing Sales Pipelines in Lume: Best Practices for Revenue Growth"
slug: sales-pipeline-lume
description: "Guide to building and managing sales pipelines in Lume: deal tracking, forecasting, and revenue analytics."
keywords: ["sales pipeline", "deal management", "revenue forecasting", "CRM"]
target_volume: 1600
difficulty: 38
audience: ["Sales Managers", "Revenue Leaders", "Startup Founders"]
published_date: 2026-09-06
reading_time: 9
---

# Managing Sales Pipelines in Lume: Best Practices for Revenue Growth

A good sales pipeline is the difference between guessing and forecasting. Lume makes it easy to build a visual, data-driven pipeline that shows you exactly where deals stand and what to do next.

This guide covers pipeline setup, best practices, and metrics that matter.

---

## The Perfect Pipeline: 5 Stages

Most B2B sales funnels work with 5 stages:

1. **Prospecting** (Raw leads, not contacted yet)
2. **Qualified** (Contacted, interested, but not pitched)
3. **Proposal** (We've sent a proposal)
4. **Negotiating** (We're in talks)
5. **Closed** (Won or Lost)

In Lume:

1. Create an **Opportunity** entity with a "Stage" select field
2. Add options: Prospecting, Qualified, Proposal, Negotiating, Closed-Won, Closed-Lost
3. Create a **Kanban view** that shows columns for each stage
4. Drag opportunities between stages as they progress

---

## Win Rate Calculation

Not all pipelines are created equal. Calculate your **stage conversion rates**:

**Example pipeline:**
- 100 prospecting deals
- 40 qualified (40% conversion)
- 15 proposals sent (37.5% conversion)
- 5 in negotiation (33% conversion)
- 3 closed-won (60% conversion)

**Your win rate: 3%**

In Lume:
1. Click **Reports**
2. Create a report: "Pipeline Conversion"
3. Show count of deals by stage
4. Calculate percentages
5. **Benchmark:** Average B2B win rate is 2-5%. If you're below 2%, you have a problem. If above 5%, you're outperforming.

---

## Forecast Revenue (3-Month View)

Smart forecasting predicts revenue 3 months out:

1. Click **Opportunities**
2. Select all deals in "Proposal" or "Negotiating" stages
3. Filter by close date: Next 90 days
4. Sum the amount field
5. Adjust by stage:
   - **Proposal stage:** 30% probability → multiply by 0.3
   - **Negotiating:** 60% probability → multiply by 0.6
   - **Closed-Won:** 100% → full amount

**Example:**
- Proposal deals: $50,000 × 0.3 = $15,000
- Negotiating: $30,000 × 0.6 = $18,000
- **3-month forecast: $33,000**

Set up this calculation as an automated dashboard in Lume.

---

## Sales Velocity: How Long Does a Deal Take?

Measure time from first contact to close:

In Lume:
1. Add fields to Opportunity:
   - "First Contact Date"
   - "Close Date"
   - "Days in Pipeline" (calculated field: Close Date - First Contact Date)

2. Create a report showing average "Days in Pipeline" by stage

**Example metrics:**
- Prospecting to Qualified: 5 days (too slow = weak qualification)
- Qualified to Proposal: 10 days (benchmark = 10 days)
- Proposal to Close: 20 days (benchmark = 20-30 days)

If prospecting takes 20 days, your qualification is too slow.

---

## Deal Aging Report

Find deals stuck in your pipeline:

1. Create a report: "Deals Stuck > 30 Days"
2. Filter: Last updated > 30 days ago
3. Show: Deal name, stage, days in stage, owner
4. This shows which deals to follow up on

**Action:** Weekly, review this report. Call the owner for stalled deals.

---

## Activity Tracking per Deal

The most-closed deals have the most activity. Track it:

In Lume:
1. Link every call, email, and meeting to an Opportunity
2. Create a report: "Activities per Opportunity"
3. Show: Opportunity name, number of activities, stage
4. Compare won deals vs. lost deals

**Insight:** If won deals average 5 activities and lost deals average 2, you know that more touchpoints = more closes.

**Action:** Set a minimum activity target per deal (e.g., 1 activity per week).

---

## Territory Allocation

Divide pipeline by sales rep:

1. Add field to Opportunity: "Sales Rep" (link to User entity)
2. Create report: "Pipeline by Sales Rep"
3. Show revenue, deal count, win rate per rep
4. Identify top performers and struggling reps

**Action:** Pair struggling reps with top performers for 1:1 coaching.

---

## Customer Profile (ICP) Matching

Close higher-value deals faster:

1. Add field to Opportunity: "Matches ICP" (checkbox)
2. Create report: "ICP vs. Non-ICP Win Rate"
3. Calculate win rate for each segment

**Example:** If ICP deals close at 8% and non-ICP at 2%, you should focus on ICP-only prospects.

---

## Automated Warnings

Set up automations for high-risk deals:

1. Create automation: "Deal in Proposal for 30+ days"
   - Trigger: Deal in "Proposal" stage for 30+ days
   - Action: Alert sales rep to follow up

2. Create automation: "Deal moving backward"
   - Trigger: Deal moves from Negotiating → Proposal (rare but bad)
   - Action: Alert manager to investigate

---

## Weekly Pipeline Review Template

Every Monday, review:

1. **New deals:** How many entered prospecting this week?
2. **Progression:** How many moved to next stage?
3. **Stalled deals:** Any stuck > 30 days?
4. **Forecast:** Revenue at 60%/100% probability?
5. **Top risk:** Which deal might slip?

Use a Lume dashboard to pull all this data automatically.

---

## The Key Metric: Pipeline to Revenue Ratio

How much pipeline do you need for target revenue?

**Example:**
- Revenue target: $100,000/month
- Win rate: 5%
- Average deal: $10,000

**Math:** $100,000 / (5% × $10,000) = $200,000 needed in pipeline

**Action:** Maintain $200,000 in pipeline at all times to hit revenue goals.

---

## Set Up Your Pipeline Today

[Deploy Lume](https://lume.dev) and create your sales pipeline in 30 minutes:

1. Create Opportunity entity (Stage, Amount, Close Date)
2. Create Kanban view by stage
3. Add 10 sample deals
4. Set up forecasting report
5. Invite your sales team

Within 1 week, you'll see patterns in your sales process that you never saw before.

Questions? Join our [community Discord](https://discord.gg/lume).
