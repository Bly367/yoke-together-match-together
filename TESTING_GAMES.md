# 🎮 Testing Guide: Group Games

This guide walks you through testing all 5 group games in the Yoke app.

## Prerequisites

1. **Database Setup**
   - Ensure migration `018_group_games.sql` has been applied
   - Verify tables exist: `games`, `game_sessions`, `game_session_players`, `game_actions`, `game_results`
   - Check that RLS policies are enabled

2. **Environment**
   - Supabase project configured with correct credentials
   - Development server running: `npm run dev`
   - At least 2 test users (or 2 duos = 4 users total)

## Quick Start: Testing a Single Game

### Step 1: Create Test Users & Duos

1. **Sign up as User 1** (or use existing account)
   - Go to `/auth`
   - Create account: `test1@example.com`
   - Complete profile (add photos, bio, etc.)
   - Create a duo (add partner)

2. **Sign up as User 2** (in incognito/private window)
   - Go to `/auth`
   - Create account: `test2@example.com`
   - Complete profile
   - Create a duo (add partner)

### Step 2: Create a Match

1. **As User 1:**
   - Go to `/matchmaking`
   - Swipe right on User 2's duo
   - Wait for match (or have User 2 also swipe right)

2. **Verify Match:**
   - Go to `/messages` (or `/matches`)
   - You should see the match with User 2's duo

### Step 3: Start a Game Session

1. **Open Chat:**
   - Click on the match
   - You'll be in the chat view (`/chat/:matchId`)

2. **Open Games Dialog:**
   - Look for a "Games" button or icon in the chat interface
   - Click it to open the games selection dialog

3. **Select a Game:**
   - Choose one of the 5 games:
     - **Two Truths and a Lie**
     - **Would You Rather**
     - **This or That**
     - **Compatibility Quiz**
     - **Trivia Challenge**

4. **Create Session:**
   - Click "Start Game" or similar button
   - This creates a game session and navigates to `/chat/:matchId/games/:sessionId`

### Step 4: Join the Game (as User 2)

1. **As User 2:**
   - Open the same match chat
   - You should see a notification or game invitation
   - Click to join the game session

2. **Verify Players:**
   - Both duos (4 players total) should be in the lobby
   - Check that all players are listed

### Step 5: Start the Game

1. **As the creator:**
   - Click "Start Game" button in the lobby
   - Game state initializes
   - Game-specific UI appears

## Testing Each Game Type

### 🎯 Two Truths and a Lie

**Test Flow:**
1. All players submit 3 statements (2 true, 1 false)
2. Each player selects which statement is the lie
3. Players guess which statement is the lie for each other player
4. Results show who guessed correctly

**What to Check:**
- ✅ All players can submit statements
- ✅ Can't submit until all 3 statements are filled
- ✅ Can't submit until lie index is selected
- ✅ Phase transitions: submitting → guessing → results
- ✅ Can select a player to guess their lie
- ✅ Can see all statements for selected player
- ✅ Can submit guess
- ✅ Results show correct scores
- ✅ Game completes properly

**Test Cases:**
- Submit with empty statements → Should show error
- Submit without selecting lie → Should show error
- Try to guess before all submissions → Should be blocked
- Try to guess twice → Should be blocked

### 🎲 Would You Rather

**Test Flow:**
1. All players vote on "Would You Rather" question (A or B)
2. Results show vote counts
3. Repeat for 5 rounds
4. Final results show total points

**What to Check:**
- ✅ Question displays with Option A and Option B
- ✅ Can vote for either option
- ✅ Can't vote twice
- ✅ Shows waiting state when others haven't voted
- ✅ Results show vote counts correctly
- ✅ Can proceed to next round
- ✅ Round counter increments (1/5, 2/5, etc.)
- ✅ Game completes after 5 rounds
- ✅ Final results show all players with scores

**Test Cases:**
- Try to vote twice → Should be blocked
- Try to proceed before all votes → Should be blocked
- Check that questions don't repeat (or handle gracefully)

### ⚡ This or That

**Test Flow:**
1. All players choose between two options (A or B)
2. Results show choice counts
3. Repeat for 10 rounds
4. Final results show total points

**What to Check:**
- ✅ Two options display clearly
- ✅ Can choose either option
- ✅ Can't choose twice
- ✅ Shows waiting state when others haven't chosen
- ✅ Results show choice counts correctly
- ✅ Can proceed to next round
- ✅ Round counter increments (1/10, 2/10, etc.)
- ✅ Game completes after 10 rounds
- ✅ Final results show all players with scores

**Test Cases:**
- Try to choose twice → Should be blocked
- Try to proceed before all choices → Should be blocked

### 💕 Compatibility Quiz

**Test Flow:**
1. All players answer multiple-choice questions
2. After each question, compatibility is calculated
3. Repeat for 5 questions
4. Final results show compatibility matrix

**What to Check:**
- ✅ Question displays with multiple choice options
- ✅ Can select an option
- ✅ Can't answer twice
- ✅ Shows waiting state when others haven't answered
- ✅ Can proceed to next question
- ✅ Question counter increments (1/5, 2/5, etc.)
- ✅ Game completes after 5 questions
- ✅ Final results show compatibility percentages
- ✅ Compatibility matrix displays correctly

**Test Cases:**
- Try to answer twice → Should be blocked
- Try to proceed before all answers → Should be blocked
- Verify compatibility percentages are calculated correctly

### 🧠 Trivia Challenge

**Test Flow:**
1. All players answer trivia questions
2. Results show who got it right
3. Points awarded for correct answers
4. Repeat for 10 rounds
5. Final results show rankings

**What to Check:**
- ✅ Question displays with category badge
- ✅ Multiple choice options (A, B, C, D)
- ✅ Can select an answer
- ✅ Can't answer twice
- ✅ Shows waiting state when others haven't answered
- ✅ Results show correct answer
- ✅ Shows who got it right
- ✅ Points awarded correctly
- ✅ Round counter increments (1/10, 2/10, etc.)
- ✅ Game completes after 10 rounds
- ✅ Final results show rankings with scores

**Test Cases:**
- Try to answer twice → Should be blocked
- Try to proceed before all answers → Should be blocked
- Verify correct answers award points
- Verify incorrect answers don't award points

## Testing Real-time Updates

### Test Multi-Player Synchronization

1. **Open game in two browsers/windows:**
   - Browser 1: User 1
   - Browser 2: User 2

2. **Test real-time updates:**
   - User 1 submits an action
   - User 2 should see the update immediately (without refresh)
   - User 2 submits an action
   - User 1 should see the update immediately

3. **What to Check:**
   - ✅ Actions appear in real-time
   - ✅ Game state updates synchronously
   - ✅ Phase transitions happen for all players
   - ✅ Results appear for all players simultaneously

## Testing Edge Cases

### Game Session Management

1. **Leave Game:**
   - Join a game session
   - Click "Leave Game"
   - Verify player is marked inactive
   - Verify session status updates if players < min_players

2. **Abandoned Session:**
   - Start a game with 4 players
   - Have 2 players leave
   - Verify session status becomes "abandoned"

3. **Complete Game:**
   - Play through entire game
   - Verify session status becomes "completed"
   - Verify results are saved
   - Verify can view results after completion

### Error Handling

1. **Network Errors:**
   - Disconnect internet
   - Try to submit action
   - Should show error message
   - Reconnect and verify can continue

2. **Invalid Actions:**
   - Try to submit invalid action data
   - Should show validation error
   - Should not update game state

3. **Concurrent Actions:**
   - Have multiple players submit simultaneously
   - Verify all actions are processed
   - Verify game state is consistent

## Testing UI/UX

### Visual Consistency

1. **Check Yoke Aesthetic:**
   - ✅ Colors: Yolk yellow, Peach, Cream
   - ✅ Rounded corners (1.25rem)
   - ✅ Soft shadows
   - ✅ Smooth animations
   - ✅ Consistent button styles
   - ✅ Proper spacing and padding

2. **Responsive Design:**
   - ✅ Test on mobile (375px width)
   - ✅ Test on tablet (768px width)
   - ✅ Test on desktop (1920px width)
   - ✅ Verify layouts adapt correctly

3. **Accessibility:**
   - ✅ Keyboard navigation works
   - ✅ Screen reader friendly
   - ✅ Focus states visible
   - ✅ Color contrast meets WCAG AA

## Debugging Tips

### Check Browser Console

1. **Open DevTools:**
   - Press F12 or Cmd+Option+I
   - Go to Console tab

2. **Look for:**
   - React Query cache updates
   - Supabase real-time subscriptions
   - Action processing logs
   - Error messages

### Check Network Tab

1. **Monitor Requests:**
   - Game session queries
   - Action submissions
   - State updates
   - Real-time subscriptions

2. **Check Response:**
   - Verify data structure
   - Check for errors
   - Verify RLS policies allow access

### Check Database

1. **In Supabase Dashboard:**
   - Go to Table Editor
   - Check `game_sessions` table
   - Check `game_actions` table
   - Check `game_results` table
   - Verify data is being saved correctly

## Common Issues & Solutions

### Issue: Game state not initializing

**Solution:**
- Check that session status is "active"
- Verify game state is set when starting game
- Check browser console for errors
- Verify player IDs are correct

### Issue: Actions not processing

**Solution:**
- Check action validation
- Verify action type matches game type
- Check that all required players have joined
- Verify RLS policies allow action creation

### Issue: Real-time updates not working

**Solution:**
- Check Supabase real-time is enabled
- Verify subscription is active
- Check network connection
- Refresh page and rejoin session

### Issue: Game not completing

**Solution:**
- Check completion conditions in game service
- Verify all rounds/phases are completed
- Check that results calculation runs
- Verify session status updates to "completed"

## Testing Checklist

- [ ] Can create game session from match chat
- [ ] Can join game session
- [ ] Can start game (all players ready)
- [ ] Two Truths and a Lie works end-to-end
- [ ] Would You Rather works end-to-end
- [ ] This or That works end-to-end
- [ ] Compatibility Quiz works end-to-end
- [ ] Trivia Challenge works end-to-end
- [ ] Real-time updates work
- [ ] Results display correctly
- [ ] Can leave game session
- [ ] Abandoned sessions handled correctly
- [ ] Error handling works
- [ ] UI matches Yoke aesthetic
- [ ] Responsive design works
- [ ] No console errors
- [ ] Database saves correctly

## Next Steps

After testing:
1. Document any bugs found
2. Test with more players (if possible)
3. Test performance with many actions
4. Test on different devices/browsers
5. Gather user feedback

---

**Need Help?**
- Check `src/services/games.service.ts` for game logic
- Check `src/hooks/useGames.ts` for React Query hooks
- Check `supabase/migrations/018_group_games.sql` for database schema
- Review game-specific service files in `src/services/games/`

