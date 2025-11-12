# Duo Request System Implementation

## Overview

Implemented a complete duo invitation/request system where:
1. Users send duo requests to other users
2. Recipients can accept or reject requests
3. When accepted, the duo is automatically created
4. Either member can leave a duo at any time
5. Users can cancel pending requests they sent

## Database Schema

### New Table: `duo_requests`
- `id` - UUID primary key
- `requester_id` - User who sent the request
- `requested_id` - User who received the request
- `status` - 'pending', 'accepted', 'rejected', 'cancelled'
- `message` - Optional message from requester
- `created_at`, `updated_at` - Timestamps

### Database Triggers
- **Auto-create duo**: When a request is accepted, automatically creates the duo
- **Auto-cancel**: When a request is accepted, cancels other pending requests between the same users
- **Unique constraint**: Prevents multiple pending requests between the same users

## Service Layer (`duoRequest.service.ts`)

### Functions:
- `createDuoRequest()` - Send a request to another user
- `getDuoRequests()` - Get all requests (sent and received)
- `getPendingRequests()` - Get pending requests received by user
- `acceptDuoRequest()` - Accept a request (creates duo via trigger)
- `rejectDuoRequest()` - Reject a request
- `cancelDuoRequest()` - Cancel a request you sent
- `leaveDuo()` - Leave a duo (deactivates it)

## Hooks (`useDuoRequests.ts`)

- `useDuoRequests()` - Get all requests
- `usePendingRequests()` - Get pending requests (auto-refreshes every 30s)
- `useCreateDuoRequest()` - Send a request
- `useAcceptDuoRequest()` - Accept a request
- `useRejectDuoRequest()` - Reject a request
- `useCancelDuoRequest()` - Cancel a request
- `useLeaveDuo()` - Leave a duo

## UI Changes

### 1. DuoSetup Page
- **Changed**: Now sends a request instead of creating duo directly
- **Flow**: Find friend → Fill duo details → Send request
- **Message**: Includes duo name, tagline, bio, interests in the request message

### 2. New Page: DuoRequests
- **Route**: `/duo-requests`
- **Shows**:
  - Pending requests received (with Accept/Reject buttons)
  - Sent requests (with status badges and Cancel button)
- **Features**:
  - Real-time updates (refetches every 30s)
  - Shows requester/requested user info
  - Displays request message if provided

### 3. Profile Page Updates
- **Added**: Badge showing pending request count (links to requests page)
- **Added**: "Requests" button in duos section
- **Added**: "Leave" button for each duo (deactivates it)
- **Kept**: "Delete" button (permanently deletes duo)

## How It Works

### Sending a Request
1. User goes to Duo Setup
2. Finds friend by email
3. Fills in duo details (name, tagline, bio, interests)
4. Clicks "Create Duo" → Sends request instead
5. Other user receives notification

### Accepting a Request
1. User sees pending request in DuoRequests page or Profile badge
2. Clicks "Accept"
3. Database trigger automatically:
   - Creates the duo
   - Sets it as active
   - Cancels other pending requests between these users
4. Both users can now see the duo

### Leaving a Duo
1. User goes to Profile page
2. Finds the duo they want to leave
3. Clicks "Leave" button
4. Duo is deactivated (not deleted)
5. Other member can reactivate it if they want

## Migration Steps

### 1. Run Migration
```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/009_duo_requests.sql
```

This creates:
- `duo_requests` table
- Indexes for performance
- Triggers for auto-creating duos
- RLS policies

### 2. Test the Flow
1. User A sends request to User B
2. User B sees request in Profile badge or DuoRequests page
3. User B accepts → Duo is created
4. Either user can leave the duo

## Key Features

✅ **Request System**: No more instant duo creation  
✅ **Accept/Reject**: Recipients control whether to form a duo  
✅ **Leave Functionality**: Either member can leave anytime  
✅ **Cancel Requests**: Requesters can cancel pending requests  
✅ **Auto-Cleanup**: Triggers handle duo creation and cleanup  
✅ **Real-time Updates**: Pending requests refresh every 30s  
✅ **UI Integration**: Badge on Profile shows pending count  

## Notes

- **Backward Compatibility**: Existing duos continue to work
- **Request Message**: Optional, includes duo details if provided
- **Leave vs Delete**: 
  - Leave = deactivates (can be reactivated)
  - Delete = permanently removes
- **Active Duo**: Only one active duo per user (enforced by trigger from migration 008)

