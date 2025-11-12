# Database Guide - Yoke App

## 📍 Where is Everything Stored?

### Database Location
- **Hosted on**: Supabase Cloud (PostgreSQL)
- **Location**: Cloud-hosted (managed by Supabase)
- **Project ID**: `tytryjjishpdlztwrjfg`
- **URL**: `https://tytryjjishpdlztwrjfg.supabase.co`

### Data Storage
- **Database**: PostgreSQL (Supabase managed)
- **Storage**: Supabase Storage (for photos/files)
- **Authentication**: Supabase Auth (user accounts)
- **Realtime**: Supabase Realtime (for chat messages)

## 🔍 How to Check the Database

### Method 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**:
   - Visit: https://supabase.com/dashboard
   - Sign in with your account
   - Select your project: `tytryjjishpdlztwrjfg`

2. **View Tables**:
   - Click on **Table Editor** in the left sidebar
   - You'll see all tables:
     - `profiles` - User profiles
     - `duos` - Duo pairs
     - `swipes` - Swipe actions (likes/passes)
     - `matches` - Matches (mutual likes)
     - `messages` - Chat messages

3. **View Data**:
   - Click on any table to view rows
   - Edit data directly in the dashboard
   - Add new rows manually

4. **Run SQL Queries**:
   - Click on **SQL Editor** in the left sidebar
   - Write and execute SQL queries
   - View query results

5. **Check Authentication**:
   - Click on **Authentication** → **Users**
   - View all registered users
   - Manage user accounts

6. **View Storage**:
   - Click on **Storage** in the left sidebar
   - View uploaded photos
   - Manage storage buckets

### Method 2: SQL Editor (In Supabase Dashboard)

1. **Go to SQL Editor**:
   - Click on **SQL Editor** in Supabase Dashboard
   - Click **New Query**

2. **View All Tables**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

3. **View All Profiles**:
   ```sql
   SELECT * FROM profiles;
   ```

4. **View All Duos**:
   ```sql
   SELECT * FROM duos;
   ```

5. **View All Matches**:
   ```sql
   SELECT * FROM matches;
   ```

6. **View All Messages**:
   ```sql
   SELECT * FROM messages 
   ORDER BY created_at DESC 
   LIMIT 50;
   ```

7. **View All Swipes**:
   ```sql
   SELECT * FROM swipes 
   ORDER BY created_at DESC;
   ```

### Method 3: Using Supabase CLI

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login**:
   ```bash
   supabase login
   ```

3. **Link Project**:
   ```bash
   supabase link --project-ref tytryjjishpdlztwrjfg
   ```

4. **Query Database**:
   ```bash
   supabase db query "SELECT * FROM profiles;"
   ```

### Method 4: Using Node.js Script

See `scripts/check-database.ts` for a utility script to query the database.

## 📊 Database Schema

### Tables

1. **profiles** - User profiles
   - `id` (UUID) - Primary key, references auth.users
   - `email` (TEXT) - User email
   - `name` (TEXT) - User name
   - `age` (INTEGER) - User age
   - `bio` (TEXT) - User bio
   - `photo_url` (TEXT) - Profile photo URL
   - `location` (POINT) - User location (PostGIS)
   - `created_at` (TIMESTAMP) - Creation timestamp
   - `updated_at` (TIMESTAMP) - Update timestamp

2. **duos** - Duo pairs
   - `id` (UUID) - Primary key
   - `member1_id` (UUID) - First member ID
   - `member2_id` (UUID) - Second member ID
   - `name` (TEXT) - Duo name
   - `tagline` (TEXT) - Duo tagline
   - `bio` (TEXT) - Duo bio
   - `photo_url` (TEXT) - Duo photo URL
   - `interests` (TEXT[]) - Array of interests
   - `is_active` (BOOLEAN) - Is duo active
   - `created_at` (TIMESTAMP) - Creation timestamp
   - `updated_at` (TIMESTAMP) - Update timestamp

3. **swipes** - Swipe actions
   - `id` (UUID) - Primary key
   - `swiper_duo_id` (UUID) - Swiper duo ID
   - `swiped_duo_id` (UUID) - Swiped duo ID
   - `action` (TEXT) - Action type (like/pass)
   - `created_at` (TIMESTAMP) - Creation timestamp

4. **matches** - Matches (mutual likes)
   - `id` (UUID) - Primary key
   - `duo1_id` (UUID) - First duo ID
   - `duo2_id` (UUID) - Second duo ID
   - `matched_at` (TIMESTAMP) - Match timestamp
   - `is_active` (BOOLEAN) - Is match active

5. **messages** - Chat messages
   - `id` (UUID) - Primary key
   - `match_id` (UUID) - Match ID
   - `sender_id` (UUID) - Sender user ID
   - `content` (TEXT) - Message content
   - `created_at` (TIMESTAMP) - Creation timestamp

## 🔐 Security (RLS Policies)

All tables have Row Level Security (RLS) enabled:
- **profiles**: Users can read all profiles, update only their own
- **duos**: Users can read all active duos, update only their own
- **swipes**: Users can view swipes from their duos
- **matches**: Users can view matches for their duos
- **messages**: Users can view messages for their matches

## 📁 Storage

### Photos Storage
- **Bucket**: `photos`
- **Location**: Supabase Storage
- **Path**: `{user_id}/{filename}`
- **Access**: Public or RLS-protected

## 🛠️ Useful SQL Queries

### Get All Users with Profiles
```sql
SELECT 
  p.*,
  u.email,
  u.created_at as user_created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id;
```

### Get All Duos with Member Names
```sql
SELECT 
  d.*,
  p1.name as member1_name,
  p2.name as member2_name
FROM duos d
JOIN profiles p1 ON d.member1_id = p1.id
JOIN profiles p2 ON d.member2_id = p2.id;
```

### Get All Matches with Duo Info
```sql
SELECT 
  m.*,
  d1.tagline as duo1_tagline,
  d2.tagline as duo2_tagline
FROM matches m
JOIN duos d1 ON m.duo1_id = d1.id
JOIN duos d2 ON m.duo2_id = d2.id;
```

### Get Message Count per Match
```sql
SELECT 
  match_id,
  COUNT(*) as message_count
FROM messages
GROUP BY match_id;
```

### Get Most Active Users
```sql
SELECT 
  p.name,
  COUNT(DISTINCT d.id) as duo_count,
  COUNT(DISTINCT s.id) as swipe_count
FROM profiles p
LEFT JOIN duos d ON (p.id = d.member1_id OR p.id = d.member2_id)
LEFT JOIN swipes s ON (s.swiper_duo_id = d.id OR s.swiped_duo_id = d.id)
GROUP BY p.id, p.name
ORDER BY swipe_count DESC;
```

## 🔧 Database Management

### Apply Schema
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `supabase/migrations/001_initial_schema.sql`

### Reset Database
⚠️ **Warning**: This will delete all data!
```sql
-- Drop all tables (in order)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS swipes CASCADE;
DROP TABLE IF EXISTS duos CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
```

### Backup Database
1. Go to Supabase Dashboard → Database → Backups
2. Create a backup or restore from a backup

## 📍 Quick Access Links

Your Supabase Project ID: `tytryjjishpdlztwrjfg`

- **Dashboard**: https://supabase.com/dashboard/project/tytryjjishpdlztwrjfg
- **Table Editor**: https://supabase.com/dashboard/project/tytryjjishpdlztwrjfg/editor
- **SQL Editor**: https://supabase.com/dashboard/project/tytryjjishpdlztwrjfg/sql
- **Authentication**: https://supabase.com/dashboard/project/tytryjjishpdlztwrjfg/auth/users
- **Storage**: https://supabase.com/dashboard/project/tytryjjishpdlztwrjfg/storage/buckets

## 🎯 Next Steps

1. **Apply Database Schema**: Run the migration SQL in Supabase Dashboard
2. **Check Tables**: View tables in Table Editor
3. **Test Queries**: Run SQL queries in SQL Editor
4. **Monitor Data**: Check data as users sign up and interact
5. **Manage Storage**: View uploaded photos in Storage

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/sql-editor)

