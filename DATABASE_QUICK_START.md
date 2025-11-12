# Database Quick Start Guide

## 🚀 Quick Access

### 1. Supabase Dashboard (Easiest Way)

**Go directly to your project**:
```
https://supabase.com/dashboard/project/tytryjjishpdlztwrjfg
```

**View Tables**:
- Click **Table Editor** → View all tables and data
- Click **SQL Editor** → Run SQL queries
- Click **Authentication** → View users
- Click **Storage** → View uploaded files

### 2. Check Database from Command Line

```bash
# Install dependencies for scripts
cd scripts
npm install

# Run database check script
npm run check-db
```

### 3. View Database Schema

The database schema is defined in:
```
supabase/migrations/001_initial_schema.sql
```

## 📊 What's in the Database?

### Tables
1. **profiles** - User profiles (name, email, age, bio, photo)
2. **duos** - Duo pairs (two users matched together)
3. **swipes** - Swipe actions (likes/passes)
4. **matches** - Matches (mutual likes between duos)
5. **messages** - Chat messages (group chat messages)

### Storage
- **photos** bucket - User and duo photos

## 🔍 Common Queries

### View All Users
```sql
SELECT * FROM profiles;
```

### View All Duos
```sql
SELECT * FROM duos;
```

### View All Matches
```sql
SELECT * FROM matches;
```

### View All Messages
```sql
SELECT * FROM messages ORDER BY created_at DESC;
```

## 🎯 Next Steps

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/tytryjjishpdlztwrjfg
2. **Check Table Editor**: View all tables and data
3. **Run SQL Queries**: Test queries in SQL Editor
4. **Monitor Data**: Watch data as users interact with the app

## 📚 Full Documentation

See `DATABASE_GUIDE.md` for complete database documentation.

