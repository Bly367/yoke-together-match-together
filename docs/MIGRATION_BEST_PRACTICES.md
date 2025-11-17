# Migration Best Practices

This document outlines best practices for creating Supabase migrations to prevent common linter warnings and security issues.

---

## 🔒 Function Security: Always Set search_path

**CRITICAL:** Every function must include `SET search_path` to prevent search_path injection attacks.

### Standard Functions

```sql
CREATE OR REPLACE FUNCTION my_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public  -- REQUIRED: Always include this!
AS $$
BEGIN
  -- function body
END;
$$;
```

### SECURITY DEFINER Functions

```sql
CREATE OR REPLACE FUNCTION my_secure_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- REQUIRED: Always include this!
AS $$
BEGIN
  -- function body
END;
$$;
```

### Why This Matters

- **Security:** Prevents search_path injection attacks
- **Reliability:** Ensures functions always use the expected schema
- **Compliance:** Required by Supabase security best practices
- **Linter:** Prevents "Function Search Path Mutable" warnings

### Common Mistakes to Avoid

❌ **WRONG** - Missing SET search_path:
```sql
CREATE OR REPLACE FUNCTION my_function()
RETURNS TRIGGER AS $$
BEGIN
  -- function body
END;
$$ LANGUAGE plpgsql;
```

✅ **CORRECT** - Includes SET search_path:
```sql
CREATE OR REPLACE FUNCTION my_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- function body
END;
$$;
```

---

## 📋 Checklist for New Migrations

Before committing a migration, verify:

- [ ] All functions include `SET search_path = public` (or `SET search_path = ''` for SECURITY DEFINER functions that don't need public schema)
- [ ] RLS policies are created for all tables with RLS enabled
- [ ] Functions have appropriate SECURITY DEFINER or SECURITY INVOKER settings
- [ ] Comments are added to explain non-obvious logic
- [ ] Migration is idempotent (can be run multiple times safely)

---

## 🔍 Related Documentation

- [Supabase Linter Warnings](./SUPABASE_LINTER_WARNINGS.md) - Explanation of expected warnings
- [Supabase Database Linter Docs](https://supabase.com/docs/guides/database/database-linter) - Official documentation

---

**Last Updated:** 2024-12-19

