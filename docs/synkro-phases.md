# Synkro - phase summary

## Vision

Synkro validates and then builds a B2B SaaS that connects online stores with accounting ERPs to reduce manual data entry, rejected invoices, and inventory mismatches.

## Implemented

### Phase 1 - Public commercial validation

- Public landing page in `web/synkro/index.html`.
- Vercel rewrite for `synkro.manantiallodge.com`.
- ROI calculator with monthly orders, estimated savings, freed hours, and manual cost per order.
- Commercial validation form.
- Public endpoint `POST /api/synkro/leads`.
- Supabase table `synkro_leads`.
- Basic DNS, Vercel, and Supabase setup documentation.

### Phase 2 - Internal lead follow-up

- Protected endpoint `GET /api/synkro/leads` to list leads.
- Protected endpoint `PATCH /api/synkro/leads` to update status and commercial notes.
- Required variable `SYNKRO_ADMIN_TOKEN`.
- Initial statuses: `new`, `contacted`, `qualified`, `discarded`.
- Internal page `web/synkro/leads.html` to filter and update leads.
- Follow-up fields in Supabase: `commercial_note` and `updated_at`.
- Synkro web files isolated under `web/synkro/`.

### Phase 3 - Opportunity qualification

- Lead scoring with `score` from 0 to 100.
- Urgency levels: `low`, `medium`, `high`.
- Commercial owner field.
- Next contact date.
- E-commerce and ERP validation flags.
- CSV export from the internal leads panel.
- Simple metrics by status: new, contacted, qualified, discarded.

## Missing

### Before continuing product work

- Configure `synkro.manantiallodge.com` in Vercel and Hostinger DNS.
- Execute or update the Supabase schema for `synkro_leads`.
- Create `SYNKRO_ADMIN_TOKEN` in Vercel environment variables.
- Test real lead capture in production.
- Decide whether Synkro should be indexed or temporarily marked as `noindex`.
- Adjust ROI assumptions: monthly operator cost, minutes per order, and target subscription price.

### Suggested Phase 4 - MVP technical architecture

- Design webhook contracts for Shopify/WooCommerce.
- Define base models: Tenant, Integration, ExternalOrder, SyncAttempt, AuditLog.
- Create an independent backend structure for a future .NET service or decide whether the MVP continues in serverless Node.
- Define multi-tenant strategy and API key security.
- Design idempotency by external order before creating real connectors.

### Suggested Phase 5 - First simulated connector

- Create a test webhook endpoint.
- Store simulated orders in Supabase.
- Implement an initial mapping engine.
- Generate audit logs visible to internal users.
- Avoid real Siigo integration until the commercial flow is validated.
