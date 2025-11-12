# Single Active Duo Enforcement Fix

## Problem
Some accounts had more than one active duo at the same time, which violates the business rule that each user should only have one active duo.

## Solution
Implemented **database-level enforcement** using a trigger, plus improved application-level logic.

## Changes Made

### 1. Database Trigger (Migration 008)
Created a trigger that automatically enforces the rule at the database level:

- **Trigger**: `enforce_single_active_duo_trigger`
- **Function**: `enforce_single_active_duo()`
- **Behavior**: When a duo is set to `is_active = true`, automatically deactivates all other active duos for **both members** of that duo
- **Runs**: BEFORE INSERT or UPDATE on `is_active` column

This ensures the rule is enforced even if:
- Someone updates duos directly in the database
- There are race conditions
- Multiple requests happen simultaneously

### 2. Application-Level Improvements

Updated three functions in `duo.service.ts`:

1. **`createDuo()`**: Now checks for active duos for both member1 and member2 positions
2. **`setActiveDuo()`**: Already had logic, but now handles both members properly
3. **`updateDuo()`**: NEW - Added logic to deactivate other duos when `is_active` is set to `true`

### 3. Data Fix Script
The migration includes a script that fixes any existing data violations by keeping only the most recently created active duo per user.

## How to Apply

### Step 1: Run the Migration
```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/008_enforce_single_active_duo.sql
```

This will:
- Create the trigger function
- Create the trigger
- Fix any existing data violations

### Step 2: Verify
After running the migration, verify that:
1. Each user has at most one active duo
2. When you set a duo as active, other duos are automatically deactivated
3. When you create a new duo, old active duos are deactivated

## How It Works

### Database Level (Trigger)
```sql
-- When a duo is set to is_active = true:
1. Find all other active duos where member1 is in this duo
2. Find all other active duos where member2 is in this duo  
3. Deactivate all of them
4. Then allow the new duo to be set as active
```

### Application Level
The application code also deactivates other duos before setting one as active, providing:
- Immediate consistency (no delay)
- Better error handling
- Clear error messages

## Testing

1. **Create New Duo**: Create a new duo - old active duo should be deactivated
2. **Set Active**: Click "Set as Active" on an inactive duo - other active duos should be deactivated
3. **Update Directly**: Try updating a duo's `is_active` directly in database - trigger should enforce the rule
4. **Multiple Users**: Test with duos where both members have other duos - both should be handled

## Notes

- The trigger handles **both members** of a duo, so if Alice & Bob have a duo, and Alice also has a duo with Charlie, activating Alice & Bob will deactivate Alice & Charlie
- The trigger runs **BEFORE** the insert/update, so it's atomic
- The application code provides immediate feedback, while the trigger provides ultimate enforcement

