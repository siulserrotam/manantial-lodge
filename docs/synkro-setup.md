# Synkro setup guide

## Hostinger DNS

Use this when the domain is managed in Hostinger and the project is deployed in Vercel.

### Recommended record

```text
Type: CNAME
Name: synkro
Value: cname.vercel-dns.com
TTL: 14400
```

If Vercel shows a different target in the domain screen, use the exact value Vercel recommends.

### Steps

1. Open Hostinger DNS manager for `manantiallodge.com`.
2. In `Tipo`, choose `CNAME`.
3. In `Nombre`, write `synkro`.
4. In `Valor`, write `cname.vercel-dns.com`.
5. Leave TTL as `14400`.
6. Click `Anadir registro`.
7. Return to Vercel and click `Refresh` on the domain.

DNS propagation can take a few minutes and sometimes longer.

## Vercel

1. Open the `manantial-lodge` project.
2. Go to `Settings -> Domains`.
3. Add:

```text
synkro.manantiallodge.com
```

4. Confirm the project production branch is `produccion`.
5. Add the environment variable:

```text
SYNKRO_ADMIN_TOKEN=<a-long-private-token>
```

6. Redeploy production after adding the variable.

The sandbox webhook does not need a Vercel environment variable for each tenant. Tenant keys are stored as SHA-256 hashes in Supabase.

## Supabase

Run the Synkro block from `supabase/schema.sql`.

If the old Spanish-column version was already created, the schema includes a migration block that copies old values into the new English columns.

Expected table:

```text
public.synkro_leads
public.synkro_tenants
public.synkro_integrations
public.synkro_external_orders
public.synkro_sync_attempts
public.synkro_audit_logs
```

Main columns:

```text
name
email
phone
company
ecommerce_platform
erp_system
monthly_orders
message
commercial_note
score
urgency
owner
next_contact_at
ecommerce_validated
erp_validated
source
status
created_at
updated_at
```

Create a sandbox tenant API key:

```sql
insert into public.synkro_tenants (name, api_key_hash)
values (
  'Demo tenant',
  encode(digest('synkro_demo_api_key', 'sha256'), 'hex')
)
on conflict (api_key_hash) do nothing;
```

Use the plain value `synkro_demo_api_key` only when testing the webhook request header.

## Validation

Public landing:

```text
https://synkro.manantiallodge.com
https://studios.manantiallodge.com/synkro.html
```

Internal lead follow-up:

```text
https://studios.manantiallodge.com/synkro-leads.html
```

Use the same value configured in `SYNKRO_ADMIN_TOKEN` as the administrative token.

Internal sync dashboard:

```text
https://studios.manantiallodge.com/synkro-sync.html
```

Use the same `SYNKRO_ADMIN_TOKEN`. The dashboard shows the orders received by the sandbox webhook and their audit events.

Sandbox order webhook:

```text
POST https://studios.manantiallodge.com/api/synkro/webhooks/orders
Header: x-synkro-api-key: synkro_demo_api_key
```

Internal sync attempts:

```text
GET https://studios.manantiallodge.com/api/synkro/internal?resource=sync-attempts
Header: Authorization: Bearer <SYNKRO_ADMIN_TOKEN>
```

Internal audit logs:

```text
GET https://studios.manantiallodge.com/api/synkro/internal?resource=audit-logs&externalOrderId=<order_uuid>
Header: Authorization: Bearer <SYNKRO_ADMIN_TOKEN>
```

## Current file isolation

```text
web/synkro/index.html
web/synkro/app.js
web/synkro/leads.html
web/synkro/leads.js
web/synkro/sync.html
web/synkro/sync.js
web/synkro/styles.css
api/synkro/leads.js
api/synkro/_security.js
api/synkro/internal.js
api/synkro/orders.js
docs/synkro-phases.md
docs/synkro-setup.md
docs/synkro-mvp-api.md
```

The compatibility URLs `/synkro.html` and `/synkro-leads.html` are kept through Vercel rewrites.
