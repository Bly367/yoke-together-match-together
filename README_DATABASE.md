# Database Quick Reference

## 📍 Where is Everything Stored?

**Database**: Hosted on Supabase Cloud (PostgreSQL)
- **Project ID**: `tytryjjishpdlztwrjfg`
- **URL**: `https://tytryjjishpdlztwrjfg.supabase.co`
- **Location**: Cloud-hosted (managed by Supabase)

**Storage**: Supabase Storage (for photos)
- **Bucket**: `photos`
- **Location**: Supabase Storage

## 🔍 How to Check the Database

### Option 1: Supabase Dashboard (Easiest)

1. **Go to**: https://supabase.com/dashboard/project/tytryjjishpdlztwrjfg
2. **Click**: **Table Editor** → View all tables and data
3. **Click**: **SQL Editor** → Run SQL queries
4. **Click**: **Authentication** → View users
5. **Click**: **Storage** → View uploaded files

### Option 2: Command Line Script

```bash
# Install dependencies
cd scripts
npm install

# Run database check
npm run check-db
```

### Option 3: SQL Queries in Dashboard

Go to **SQL Editor** and run:

```sql
-- View all profiles
SELECT * FROM profiles;

-- View all duos
SELECT * FROM duos;

-- View all matches
SELECT * FROM matches;

-- View all messages
SELECT * FROM messages ORDER BY created_at DESC;

-- View all swipes
SELECT * FROM swipes ORDER BY created_at DESC;
```

## 📊 Database Tables

1. **profiles** - User profiles (name, email, age, bio, photo)
2. **duos** - Duo pairs (two users matched together)
3. **swipes** - Swipe actions (likes/passes)
4. **matches** - Matches (mutual likes between duos)
5. **messages** - Chat messages (group chat messages)

## 🚀 Quick Start

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/tytryjjishpdlztwrjfg
2. **Apply Schema**: Run `supabase/migrations/001_initial_schema.sql` in SQL Editor
3. **View Data**: Check Table Editor to see all tables
4. **Test Queries**: Run SQL queries in SQL Editor

## 📚 Full Documentation

- **DATABASE_GUIDE.md** - Complete database documentation
- **DATABASE_QUICK_START.md** - Quick start guide
- **supabase/migrations/001_initial_schema.sql** - Database schema

