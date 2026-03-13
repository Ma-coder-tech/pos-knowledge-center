# Knowledge Base Center For ISV

This workspace contains the implementation baseline for the v1 support knowledge platform:
- API contract in `docs/v1-api-contract.md`
- SQL reference schema in `db/schema.sql`
- Drizzle schema in `src/db/schema.ts`
- Zod API contracts in `src/api/contracts.ts`

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`.
3. Run `npm install`.
4. Run `npm run typecheck`.
5. Generate migrations with `npm run db:generate`.
6. Start the API with `npm run dev`.

## Notes

- The Drizzle schema is the typed source of truth for application development.
- The raw SQL schema remains useful for review and for any manual migration pieces such as tuned vector indexes.
- The raw SQL schema currently remains the authoritative place for the `pgcrypto` and `vector` extension setup and for the circular published-version foreign key.
- The current scaffold is intentionally backend-first. It establishes the domain model and validation layer before UI work begins.

## API Notes

- The development API uses the `x-tenant-id` header for tenant scoping until auth is implemented.
- Create a tenant first with `POST /api/v1/tenants`.
- Use the returned tenant ID in subsequent requests.

Example:

```sh
curl -X POST http://localhost:3000/api/v1/tenants \
  -H 'content-type: application/json' \
  -d '{"name":"Demo POS","slug":"demo-pos","timezone":"Africa/Kigali"}'
```

## Next Recommended Step

Implement the next backend slices for:
- media
- troubleshooting flows
- solved issue capture
- search and chat
