

# Deploy Migrations and Edge Functions

## What needs to happen

1. **Run migration `20260328000000_scoring_audit_engine_v1.sql`** — adds `raw_input` (TEXT) and `duration_ms` (INTEGER) columns to `scoring_audit` table
2. **Run migration `20260328000001_scoring_block_prompts_v040.sql`** — inserts 16 scoring block prompts into `prompt_versions` table
3. **Fix TypeScript build errors in edge functions** before deploying:
   - `_shared/ipe_types.ts` line 608: type predicate `v is number` conflicts with `ILValue` type — fix by removing the type predicate or casting
   - `ipe-questionnaire-engine/index.ts`: Supabase client infers table types as `never` — fix by casting the client to `any` for these operations (same pattern used in `ipe-eco`)
4. **Deploy all edge functions** — ipe-eco, ipe-pill-session, ipe-questionnaire-engine, ipe-scoring-block, ipe-scoring, lucid-engine

## Technical Details

### ipe_types.ts fix (line 608)
Change the filter to avoid the type predicate issue:
```typescript
const valid = values.filter((v) => v !== null && v !== undefined) as number[];
```

### ipe-questionnaire-engine/index.ts fix
Add `as any` casts on all Supabase `.from()` calls where the generated types don't include the table schema (same pattern already used in `ipe-eco/index.ts`):
```typescript
const { data: cycle } = await (supabase as any).from("ipe_cycles")...
const { data: existingState } = await (supabase as any).from("questionnaire_state")...
// etc for all .from() calls
```

### Deployment order
1. Run both SQL migrations via migration tool
2. Fix TS errors in `_shared/ipe_types.ts` and `ipe-questionnaire-engine/index.ts`
3. Deploy all 6 edge functions
4. Test `ipe-questionnaire-engine` with a curl call to verify

