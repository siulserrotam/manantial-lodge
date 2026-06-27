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

### Phase 4 - MVP technical architecture

- Multi-tenant model with `synkro_tenants`.
- API key hash validation for sandbox webhooks.
- Integration model with `synkro_integrations`.
- External order model with `synkro_external_orders`.
- Sync attempt model with `synkro_sync_attempts`.
- Audit log model with `synkro_audit_logs`.
- Simulated order webhook: `POST /api/synkro/webhooks/orders`.
- Internal sync attempts endpoint: `GET /api/synkro/internal?resource=sync-attempts`.
- Idempotency by tenant plus platform plus external order ID.
- Documentation in `docs/synkro-mvp-api.md`.

### Phase 5 - Internal sync dashboard

- Internal page `web/synkro/sync.html`.
- Compatibility URL `/synkro-sync.html`.
- Internal navigation between leads and sync attempts.
- Protected audit endpoint `GET /api/synkro/internal?resource=audit-logs`.
- Sync dashboard filters by status, platform, and date.
- Metrics for queued, processing, success, and failed attempts.
- JSON detail view for normalized order payloads.
- Audit event view per external order.
- CSV export for sync attempts.

## Missing

### Before continuing product work

- Configure `synkro.manantiallodge.com` in Vercel and Hostinger DNS.
- Execute or update the Supabase schema for `synkro_leads` and the MVP sync tables.
- Create `SYNKRO_ADMIN_TOKEN` in Vercel environment variables.
- Test real lead capture in production.
- Create a sandbox tenant API key hash for webhook tests.
- Decide whether Synkro should be indexed or temporarily marked as `noindex`.
- Adjust ROI assumptions: monthly operator cost, minutes per order, and target subscription price.

### Suggested Phase 6 - Retry and status operations

- Add a protected retry endpoint for failed attempts.
- Allow marking attempts as `processing`, `success`, or `failed`.
- Record every manual operation in `synkro_audit_logs`.
- Add status badges with failure reasons in the dashboard.

### Suggested Phase 7 - Mapping engine

- Implement an initial mapping engine.
- Normalize customers, taxes, products, and payments.
- Define product matching by SKU.
- Define validation errors before ERP submission.
- Avoid real Siigo integration until the commercial flow is validated.
