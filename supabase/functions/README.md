# Supabase Edge Functions Draft

These functions are a migration-ready draft for moving AI logic out of Next.js routes.

## Included

- `chat`
  Receives chat payloads and calls OpenAI Responses API.
- `profile-portrait`
  Generates user portrait summaries from diary entries.
- `_shared/openai.ts`
  Shared OpenAI helpers for Edge Functions.

## Why this exists

Right now the web app still uses:

- `src/app/api/chat/route.ts`
- `src/app/api/profile-portrait/route.ts`

These files keep the current web app working.

The `supabase/functions/*` folder is the next step for iOS migration:

- mobile can call Edge Functions directly
- web can later switch from `/api/*` to Supabase function URLs
- OpenAI logic becomes independent from Next.js

## Before using

Set Edge Function secrets:

```bash
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set OPENAI_MODEL=gpt-5-mini
```

## Example deploy

```bash
supabase functions deploy chat
supabase functions deploy profile-portrait
```

## Recommended next step

After deploying, update `src/frontend/api/*` so web can call either:

- Next.js routes now
- Edge Functions later

without changing page components again.
