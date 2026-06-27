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

## Supabase

Run the Synkro block from `supabase/schema.sql`.

If the old Spanish-column version was already created, the schema includes a migration block that copies old values into the new English columns.

Expected table:

```text
public.synkro_leads
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

## Current file isolation

```text
web/synkro/index.html
web/synkro/app.js
web/synkro/leads.html
web/synkro/leads.js
web/synkro/styles.css
api/synkro/leads.js
docs/synkro-phases.md
docs/synkro-setup.md
```

The compatibility URLs `/synkro.html` and `/synkro-leads.html` are kept through Vercel rewrites.
