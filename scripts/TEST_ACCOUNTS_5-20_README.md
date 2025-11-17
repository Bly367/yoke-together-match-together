# Test Accounts Setup Guide (test5-test20)

This guide explains how to create 16 test accounts (test5@yoke.test through test20@yoke.test) with realistic dating app profiles.

## Step 1: Create Auth Users

You need to create the authentication users first. You have three options:

### Option A: Supabase Dashboard (Recommended - Easiest)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User** (or **Invite User**)
4. Create each user with:
   - **Email**: `test5@yoke.test` through `test20@yoke.test`
   - **Password**: `password123` (for all accounts)
   - **Auto Confirm User**: ✅ (check this box so users don't need email verification)

Repeat for all 16 accounts (test5 through test20).

### Option B: Use the App Signup Flow

1. Open your app's signup page
2. Sign up with each email (test5@yoke.test through test20@yoke.test)
3. Use password: `password123` for all accounts

### Option C: Bulk Create via Supabase Admin API (Advanced)

If you have access to the Supabase Admin API, you can create users programmatically. See the Supabase documentation for details.

## Step 2: Run the Profile Setup Script

Once all 16 auth users are created:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file: `scripts/create-test-accounts-5-20.sql`
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
6. Verify no errors appear

## What the Script Creates

The script will populate:

- ✅ **16 Profiles** with realistic data:
  - Names, ages, bios
  - Gender and preferences
  - Height, education, religion, political views
  - Lifestyle habits (drinking, smoking, exercise)
  - Relationship goals, kids preferences
  - Languages, ethnicity, occupation, pets

- ✅ **16 User Preferences** (matching criteria):
  - Age ranges, distance preferences
  - Height preferences
  - Education, religion, political preferences
  - Lifestyle preferences
  - Relationship goals, kids preferences

- ✅ **User Interests** (3-4 interests per user):
  - Hobbies, activities, passions
  - Based on their profiles and occupations

- ✅ **8 Active Duos** (paired users):
  - Emma & James (test5 & test6)
  - Sophia & Michael (test7 & test8)
  - Olivia & David (test9 & test10)
  - Isabella & William (test11 & test12)
  - Ava & Alexander (test13 & test14)
  - Mia & Benjamin (test15 & test16)
  - Charlotte & Lucas (test17 & test18)
  - Amelia & Henry (test19 & test20)

- ✅ **3 Sample Matches** between duos

## Test Account Summary

| Email | Name | Age | Gender | Preference | Occupation | Has Duo | Has Match |
|-------|------|-----|--------|-------------|------------|---------|-----------|
| test5@yoke.test | Emma | 24 | woman | men | Yoga Instructor | ✅ | ✅ |
| test6@yoke.test | James | 29 | man | women | Software Engineer | ✅ | ✅ |
| test7@yoke.test | Sophia | 26 | woman | men | Marketing Manager | ✅ | ✅ |
| test8@yoke.test | Michael | 31 | man | women | Physician | ✅ | ✅ |
| test9@yoke.test | Olivia | 23 | woman | men | Graduate Student | ✅ | ✅ |
| test10@yoke.test | David | 28 | man | women | Musician | ✅ | ✅ |
| test11@yoke.test | Isabella | 27 | woman | men | Chef | ✅ | ✅ |
| test12@yoke.test | William | 30 | man | women | Financial Analyst | ✅ | ✅ |
| test13@yoke.test | Ava | 25 | woman | men | Graphic Designer | ✅ | ✅ |
| test14@yoke.test | Alexander | 32 | man | women | Architect | ✅ | ✅ |
| test15@yoke.test | Mia | 24 | woman | men | Teacher | ✅ | ✅ |
| test16@yoke.test | Benjamin | 27 | man | women | Data Scientist | ✅ | ✅ |
| test17@yoke.test | Charlotte | 28 | woman | men | Attorney | ✅ | ✅ |
| test18@yoke.test | Lucas | 26 | man | women | Personal Trainer | ✅ | ✅ |
| test19@yoke.test | Amelia | 29 | woman | men | Registered Nurse | ✅ | ✅ |
| test20@yoke.test | Henry | 33 | man | women | Entrepreneur | ✅ | ✅ |

**Password for all accounts**: `password123`

## Verification

After running the script, you should see a summary message like:

```
═══════════════════════════════════════════════════════════
✅ Test Accounts Setup Complete (test5-test20)!
═══════════════════════════════════════════════════════════
Profiles Created: 16
Preferences Created: 16
Interests Created: 50+
Active Duos: 8
Active Matches: 3
═══════════════════════════════════════════════════════════
```

## Testing the Accounts

1. **Login**: Use any test account email and password `password123`
2. **View Profiles**: Check that profiles are populated with realistic data
3. **Test Matching**: Verify that matching algorithm works with the preferences
4. **Test Duos**: Check that duos are properly paired
5. **Test Chat**: Use the matches to test messaging functionality

## Troubleshooting

### Error: "Missing test users"
- Make sure you've created all 16 auth users first
- Verify emails are exactly: test5@yoke.test through test20@yoke.test
- Check Supabase Dashboard → Authentication → Users

### Error: "Row-level security policy violation"
- The script should handle RLS, but if you see this error, you may need to temporarily disable RLS or run as a database admin
- Check that your RLS policies allow profile creation

### Profiles not created
- Verify the auth users exist in `auth.users` table
- Check that the profile trigger is set up (see `scripts/create-profile-trigger.sql`)
- Run the script again - it uses `ON CONFLICT` so it's safe to re-run

## Notes

- All accounts use the same password (`password123`) for easy testing
- Profiles are designed to mimic a real dating app with diverse demographics
- Duos are paired based on complementary interests and compatibility
- Some matches are pre-created to test the chat functionality
- The script is idempotent - safe to run multiple times

