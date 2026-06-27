# Synkro MVP API

## Purpose

This phase creates the first technical MVP layer for Synkro without connecting a real ERP yet.

It receives simulated e-commerce orders, validates tenant API keys, stores the order, creates a queued sync attempt, and writes an audit log.

## Environment variables

```text
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SYNKRO_ADMIN_TOKEN=<private-token-for-internal-tools>
```

## Supabase setup

Run the Synkro tables from `supabase/schema.sql`.

Then create a sandbox tenant. Replace `synkro_demo_api_key` with a private value you will use only for webhook tests.

```sql
insert into public.synkro_tenants (name, api_key_hash)
values (
  'Demo tenant',
  encode(digest('synkro_demo_api_key', 'sha256'), 'hex')
)
on conflict (api_key_hash) do nothing;
```

## Webhook endpoint

```text
POST /api/synkro/webhooks/orders
```

Required header:

```text
x-synkro-api-key: synkro_demo_api_key
```

Example payload:

```json
{
  "platform": "shopify",
  "externalOrderId": "SHOP-1001",
  "currency": "COP",
  "subtotal": 120000,
  "tax": 22800,
  "total": 142800,
  "customer": {
    "name": "Cliente Demo",
    "email": "cliente@example.com",
    "phone": "3001234567",
    "document": "123456789"
  },
  "items": [
    {
      "sku": "CAMISETA-001",
      "name": "Camiseta",
      "quantity": 2,
      "unitPrice": 60000,
      "tax": 11400
    }
  ]
}
```

Expected response:

```json
{
  "ok": true,
  "message": "Orden recibida y encolada en sandbox."
}
```

If the same `platform + externalOrderId` is sent again for the same tenant, Synkro returns the existing order and does not duplicate it.

## Internal sync attempts endpoint

```text
GET /api/synkro/sync-attempts
```

Required header:

```text
Authorization: Bearer <SYNKRO_ADMIN_TOKEN>
```

Optional query params:

```text
status=queued
tenantId=<uuid>
limit=50
```

## Production test with curl

```bash
curl -X POST "https://studios.manantiallodge.com/api/synkro/webhooks/orders" \
  -H "Content-Type: application/json" \
  -H "x-synkro-api-key: synkro_demo_api_key" \
  -d '{
    "platform": "shopify",
    "externalOrderId": "SHOP-1001",
    "currency": "COP",
    "subtotal": 120000,
    "tax": 22800,
    "total": 142800,
    "customer": {
      "name": "Cliente Demo",
      "email": "cliente@example.com",
      "phone": "3001234567",
      "document": "123456789"
    },
    "items": [
      {
        "sku": "CAMISETA-001",
        "name": "Camiseta",
        "quantity": 2,
        "unitPrice": 60000,
        "tax": 11400
      }
    ]
  }'
```

## What this does not do yet

- It does not connect Shopify, WooCommerce, Siigo, Alegra, or World Office directly.
- It does not transform the order into a real invoice yet.
- It does not retry failed attempts yet.
- It does not expose a visual dashboard for sync attempts yet.

Those items should be handled in the next product phases.
