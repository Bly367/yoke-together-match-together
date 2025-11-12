# Product Requirements Document (PRD)
## Yoke - Private Messaging & Group Games

**Version:** 1.0  
**Last Updated:** 2024-12-19  
**Status:** Draft - Ready for Review

---

## 1. Product Overview

### 1.1 Vision
This PRD extends the Yoke application with three major features:
1. **Private Messaging (1-on-1)**: Direct messaging between individual users, independent of matches
2. **Group Games**: Interactive games that matched duos (4 people) can play together within their match context
3. **Advanced Filtering & Preferences**: Comprehensive matching preferences and filters similar to top-tier dating apps

### 1.2 Core Value Proposition
- **Private Conversations**: Users can have private 1-on-1 conversations with other users they've met through matches
- **Social Engagement**: Games provide fun, interactive ways for matched groups to break the ice and connect
- **Precise Matching**: Advanced filtering and preferences help users find more compatible matches, similar to top-tier dating apps
- **Enhanced User Experience**: More communication options, engagement features, and better matching increase user retention

### 1.3 Relationship to Existing Features
- **Private Messaging** complements the existing group chat (match messages) by enabling direct user-to-user communication
- **Group Games** enhance the match experience by providing structured activities within existing matches
- **Advanced Filtering** replaces and significantly expands the current basic preferences system (gender/preference) with comprehensive matching criteria
- All features leverage existing infrastructure (Supabase, React Query, real-time subscriptions)

---

## 2. Technical Architecture

### 2.1 Architecture Pattern
Both features follow the existing **Model → Service → Hook → Component** pattern:
- **Services**: Supabase operations (database, real-time subscriptions)
- **Hooks**: React Query for data fetching and state management
- **Components**: Presentational UI components

### 2.2 Integration Points
- **Authentication**: Uses existing `useAuth` hook
- **Real-time**: Uses Supabase Realtime (same pattern as match messages)
- **Storage**: Uses Supabase Storage for game assets (if needed)
- **Routing**: Extends existing route structure

---

## 3. Feature 1: Private Messaging (1-on-1)

### 3.1 Overview
Private messaging enables direct communication between two individual users, independent of matches. Users can message anyone they've matched with (through any match).

### 3.2 User Stories

#### 3.2.1 Conversation Initiation
- **US-PM-001:** As a user, I want to start a private conversation with another user from a match, so I can have a 1-on-1 conversation
- **US-PM-002:** As a user, I want to see a list of all my private conversations, so I can easily navigate between them
- **US-PM-003:** As a user, I want to see which users I can message (users from my matches), so I know who I can contact

#### 3.2.2 Message Sending & Receiving
- **US-PM-004:** As a user, I want to send private messages to another user, so we can communicate privately
- **US-PM-005:** As a user, I want to receive real-time private messages, so I can respond immediately
- **US-PM-006:** As a user, I want to see read receipts for my private messages, so I know when they've been read
- **US-PM-007:** As a user, I want to see typing indicators in private conversations, so I know when someone is typing

#### 3.2.3 Message Management
- **US-PM-008:** As a user, I want to edit my private messages, so I can correct mistakes
- **US-PM-009:** As a user, I want to delete my private messages, so I can remove unwanted messages
- **US-PM-010:** As a user, I want to see unread message counts for private conversations, so I know which conversations need attention

#### 3.2.4 Privacy & Safety
- **US-PM-011:** As a user, I want to block users from sending me private messages, so I can control who contacts me
- **US-PM-012:** As a user, I want to report inappropriate private messages, so I can help maintain a safe environment

### 3.3 Functional Requirements

#### 3.3.1 Database Schema

**REQ-PM-001:** Create `private_conversations` table
```sql
CREATE TABLE public.private_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user1_id, user2_id),
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);
```

**REQ-PM-002:** Create `private_messages` table
```sql
CREATE TABLE public.private_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  attachment_size INTEGER,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_sender CHECK (sender_id IN (user1_id, user2_id)),
  CONSTRAINT valid_recipient CHECK (recipient_id IN (user1_id, user2_id))
);
```

**REQ-PM-003:** Create `private_message_reads` table
```sql
CREATE TABLE public.private_message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.private_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);
```

**REQ-PM-004:** Create `private_conversation_reads` table
```sql
CREATE TABLE public.private_conversation_reads (
  conversation_id UUID NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);
```

**REQ-PM-005:** Create indexes for performance
```sql
CREATE INDEX idx_private_conversations_user1 ON public.private_conversations(user1_id);
CREATE INDEX idx_private_conversations_user2 ON public.private_conversations(user2_id);
CREATE INDEX idx_private_conversations_updated ON public.private_conversations(updated_at DESC);
CREATE INDEX idx_private_messages_conversation ON public.private_messages(conversation_id);
CREATE INDEX idx_private_messages_created ON public.private_messages(created_at DESC);
CREATE INDEX idx_private_messages_sender ON public.private_messages(sender_id);
CREATE INDEX idx_private_messages_recipient ON public.private_messages(recipient_id);
```

#### 3.3.2 Conversation Creation

**REQ-PM-006:** Users can only create conversations with users they've matched with
- Query matches to find all users the current user has matched with
- Validate that both users exist and are active
- Create conversation with canonical ordering (user1_id < user2_id) to prevent duplicates

**REQ-PM-007:** Conversation creation is idempotent
- If conversation already exists, return existing conversation
- Use canonical ordering to ensure uniqueness

**REQ-PM-008:** Conversation creation requires both users to be in at least one match together
- Validate match relationship before allowing conversation creation
- This ensures users can only message people they've matched with

#### 3.3.3 Message Operations

**REQ-PM-009:** Send private message
- Validate conversation exists and user is a participant
- Validate message content (length, moderation)
- Apply rate limiting (reuse existing rate limit service)
- Create message record
- Update conversation `last_message_at` and `updated_at`
- Trigger real-time subscription

**REQ-PM-010:** Get private messages for conversation
- Paginated retrieval (50 messages per page)
- Order by `created_at` ASC (oldest first)
- Exclude deleted messages (`deleted_at IS NULL`)
- Include sender profile information

**REQ-PM-011:** Edit private message
- Only sender can edit
- Update `content` and `edited_at`
- Preserve original `created_at`
- Trigger real-time update

**REQ-PM-012:** Delete private message
- Soft delete (set `deleted_at`)
- Only sender can delete
- Trigger real-time update

#### 3.3.4 Read Receipts

**REQ-PM-013:** Track message reads
- Create `private_message_reads` record when user views message
- Update `private_conversation_reads.last_read_at` when user views conversation
- Real-time updates for read receipts

**REQ-PM-014:** Unread message count
- Calculate unread count per conversation
- Exclude messages where `read_at` exists for current user
- Exclude messages sent by current user
- Display unread count in conversation list

#### 3.3.5 Real-Time Features

**REQ-PM-015:** Real-time message subscriptions
- Subscribe to `private_messages` INSERT and UPDATE events
- Filter by `conversation_id` for active conversation
- Update React Query cache on new/updated messages

**REQ-PM-016:** Real-time typing indicators
- Use Supabase Realtime channels for typing indicators
- Channel name: `private_conversation:{conversation_id}`
- Broadcast typing status with user ID
- Show typing indicator for other user only

**REQ-PM-017:** Real-time conversation list updates
- Subscribe to conversation updates (new messages)
- Update conversation list when `last_message_at` changes
- Update unread counts in real-time

#### 3.3.6 Privacy & Safety

**REQ-PM-018:** Block users from private messaging
- Integrate with existing blocking system (if exists)
- Filter blocked users from conversation list
- Prevent blocked users from sending messages
- Show "User has blocked you" message if blocked

**REQ-PM-019:** Report inappropriate messages
- Integrate with existing reporting system (if exists)
- Allow reporting of private messages
- Store report with message context

### 3.4 UI/UX Requirements

#### 3.4.1 Navigation

**REQ-PM-020:** Add "Private Messages" to bottom navigation
- New icon/tab for private messages
- Show unread count badge on tab
- Navigate to private messages list

**REQ-PM-021:** Private messages list page
- List all conversations sorted by `last_message_at` DESC
- Show user avatar, name, last message preview, timestamp
- Show unread count badge
- Search/filter conversations
- Empty state when no conversations

**REQ-PM-022:** Private conversation page
- Similar UI to existing Chat page
- Show user profile header (other user's info)
- Message list with sender/recipient distinction
- Message input at bottom
- Real-time updates

#### 3.4.2 Conversation Initiation

**REQ-PM-023:** Start conversation from match
- Add "Message" button on match user profiles
- Check if conversation exists, create if not
- Navigate to conversation page

**REQ-PM-024:** Start conversation from user list
- Show "Messageable Users" list (users from matches)
- Filter out users with existing conversations
- Create conversation on click

### 3.5 Technical Implementation

#### 3.5.1 Service Layer

**REQ-PM-025:** Create `src/services/privateMessaging.service.ts`
- `createPrivateConversation(user1Id, user2Id)`
- `getPrivateConversations(userId)`
- `getPrivateMessages(conversationId, limit, offset)`
- `sendPrivateMessage(conversationId, senderId, recipientId, content, attachment?)`
- `editPrivateMessage(messageId, content)`
- `deletePrivateMessage(messageId)`
- `markPrivateMessagesAsRead(conversationId, userId)`
- `getUnreadPrivateMessageCount(conversationId, userId)`
- `subscribeToPrivateMessages(conversationId, callback)`
- `subscribeToPrivateConversations(userId, callback)`
- `broadcastTypingIndicator(conversationId, userId, isTyping)`
- `subscribeToTypingIndicators(conversationId, callback)`

#### 3.5.2 Hook Layer

**REQ-PM-026:** Create `src/hooks/usePrivateMessaging.ts`
- `usePrivateConversations()` - Get all conversations
- `usePrivateMessages(conversationId)` - Get messages with pagination
- `useSendPrivateMessage()` - Send message mutation
- `useEditPrivateMessage()` - Edit message mutation
- `useDeletePrivateMessage()` - Delete message mutation
- `useMarkPrivateMessagesAsRead()` - Mark as read mutation
- `usePrivateMessageTyping(conversationId)` - Typing indicator hook

#### 3.5.3 Component Layer

**REQ-PM-027:** Create `src/pages/PrivateMessages.tsx`
- Conversation list page
- Search/filter functionality
- Unread count badges
- Empty state

**REQ-PM-028:** Create `src/pages/PrivateChat.tsx`
- Individual conversation page
- Message list (reuse VirtualizedMessageList if possible)
- Message input
- Typing indicators
- Read receipts

**REQ-PM-029:** Create `src/components/PrivateConversationItem.tsx`
- Conversation list item component
- Avatar, name, preview, timestamp, unread badge

**REQ-PM-030:** Update `src/lib/routes.ts`
- Add routes: `/private-messages`, `/private-chat/:conversationId`

**REQ-PM-031:** Update `src/components/BottomNavigation.tsx`
- Add "Private Messages" tab with unread count badge

### 3.6 RLS Policies

**REQ-PM-032:** Row Level Security for `private_conversations`
- Users can only view conversations they're a participant in
- Users can only create conversations they're a participant in
- Users can update `last_message_at` and `updated_at` only

**REQ-PM-033:** Row Level Security for `private_messages`
- Users can only view messages from conversations they're in
- Users can only send messages to conversations they're in
- Users can only edit/delete their own messages

**REQ-PM-034:** Row Level Security for read receipts
- Users can only view/update their own read receipts

---

## 4. Feature 2: Group Games

### 4.1 Overview
Group games provide interactive, fun activities that matched duos (4 people) can play together within their match context. Games help break the ice and create shared experiences.

### 4.2 User Stories

#### 4.2.1 Game Discovery & Selection
- **US-GAME-001:** As a user, I want to see available games in a match, so I can choose what to play
- **US-GAME-002:** As a user, I want to see game descriptions and rules, so I know how to play
- **US-GAME-003:** As a user, I want to see which games are popular or recommended, so I can discover fun games

#### 4.2.2 Game Sessions
- **US-GAME-004:** As a user, I want to start a game session in a match, so we can all play together
- **US-GAME-005:** As a user, I want to join an active game session, so I can participate
- **US-GAME-006:** As a user, I want to see who's playing in a game session, so I know who's participating
- **US-GAME-007:** As a user, I want to leave a game session, so I can exit if needed

#### 4.2.3 Gameplay
- **US-GAME-008:** As a user, I want to see my turn/action in a game, so I know when to play
- **US-GAME-009:** As a user, I want to see other players' actions in real-time, so I can follow the game
- **US-GAME-010:** As a user, I want to see game results/scores, so I know who won or how we did
- **US-GAME-011:** As a user, I want to play multiple rounds of a game, so we can keep playing

#### 4.2.4 Game History
- **US-GAME-012:** As a user, I want to see game history for a match, so I can see what we've played
- **US-GAME-013:** As a user, I want to see game statistics (wins, scores), so I can track performance

### 4.3 Game Types

#### 4.3.1 Initial Game Set

**REQ-GAME-001:** Implement "Two Truths and a Lie"
- Each player submits 3 statements (2 true, 1 false)
- Other players guess which is the lie
- Points for correct guesses
- Simple turn-based gameplay

**REQ-GAME-002:** Implement "Would You Rather"
- System generates "Would You Rather" questions
- Each player votes on their choice
- Results shown to all players
- Discussion prompts

**REQ-GAME-003:** Implement "This or That"
- Quick-fire comparison questions
- Each player chooses between two options
- Results aggregated and shown
- Fast-paced, multiple rounds

**REQ-GAME-004:** Implement "Compatibility Quiz"
- Questions about preferences, values, interests
- Each player answers independently
- Results show compatibility percentages between players
- Ice-breaker focused

**REQ-GAME-005:** Implement "Trivia Challenge"
- Multiple choice trivia questions
- All players answer simultaneously
- Points for correct answers
- Leaderboard at end

#### 4.3.2 Game Design Principles

**REQ-GAME-006:** All games must support 4 players
- Games designed for exactly 4 players (2 duos)
- Handle player absence gracefully (allow 3 players minimum)

**REQ-GAME-007:** Games should be asynchronous-friendly
- Players can take turns at their own pace
- No strict time limits (optional timers)
- Game state persists between sessions

**REQ-GAME-008:** Games should encourage interaction
- Results visible to all players
- Discussion prompts included
- Shared experiences emphasized

### 4.4 Functional Requirements

#### 4.4.1 Database Schema

**REQ-GAME-009:** Create `games` table (game definitions)
```sql
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  rules TEXT NOT NULL,
  min_players INTEGER DEFAULT 2,
  max_players INTEGER DEFAULT 4,
  estimated_duration_minutes INTEGER,
  category TEXT, -- 'ice-breaker', 'trivia', 'comparison', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**REQ-GAME-010:** Create `game_sessions` table (active game instances)
```sql
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  current_turn_user_id UUID REFERENCES public.profiles(id),
  game_state JSONB, -- Flexible game-specific state
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**REQ-GAME-011:** Create `game_session_players` table (players in sessions)
```sql
CREATE TABLE public.game_session_players (
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (session_id, user_id)
);
```

**REQ-GAME-012:** Create `game_actions` table (player actions in games)
```sql
CREATE TABLE public.game_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'submit_answer', 'vote', 'guess', etc.
  action_data JSONB NOT NULL, -- Flexible action-specific data
  round_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**REQ-GAME-013:** Create `game_results` table (completed game results)
```sql
CREATE TABLE public.game_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  final_score INTEGER DEFAULT 0,
  rank INTEGER, -- 1st, 2nd, 3rd, 4th place
  achievements TEXT[], -- Array of achievement strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**REQ-GAME-014:** Create indexes for performance
```sql
CREATE INDEX idx_game_sessions_match ON public.game_sessions(match_id);
CREATE INDEX idx_game_sessions_status ON public.game_sessions(status);
CREATE INDEX idx_game_sessions_game ON public.game_sessions(game_id);
CREATE INDEX idx_game_session_players_session ON public.game_session_players(session_id);
CREATE INDEX idx_game_session_players_user ON public.game_session_players(user_id);
CREATE INDEX idx_game_actions_session ON public.game_actions(session_id);
CREATE INDEX idx_game_actions_user ON public.game_actions(user_id);
CREATE INDEX idx_game_results_session ON public.game_results(session_id);
```

#### 4.4.2 Game Session Management

**REQ-GAME-015:** Create game session
- Validate match exists and user is a participant
- Validate game exists and is active
- Create session with `status='waiting'`
- Add creator as first player
- Initialize game state based on game type

**REQ-GAME-016:** Join game session
- Validate session exists and is in `waiting` or `active` status
- Validate user is a participant in the match
- Validate session hasn't reached max players
- Add user to `game_session_players`
- Update session status to `active` if min players reached

**REQ-GAME-017:** Leave game session
- Set `left_at` timestamp for player
- Set `is_active=false` for player
- If active players < min_players, set session status to `abandoned`
- Update game state if needed

**REQ-GAME-018:** Start game session
- Validate all required players have joined
- Set session status to `active`
- Set `started_at` timestamp
- Initialize game state (first round, turn order, etc.)

**REQ-GAME-019:** Complete game session
- Set session status to `completed`
- Set `completed_at` timestamp
- Calculate final scores and ranks
- Create `game_results` records for all players

#### 4.4.3 Gameplay Actions

**REQ-GAME-020:** Submit game action
- Validate session is active
- Validate user is an active player
- Validate action is valid for current game state
- Create `game_actions` record
- Update `game_state` JSONB field
- Update `current_turn_user_id` if turn-based
- Trigger real-time update

**REQ-GAME-021:** Get game state
- Return current `game_state` JSONB
- Include player information
- Include current turn/round information
- Include action history

**REQ-GAME-022:** Get game actions
- Retrieve all actions for a session
- Order by `created_at` ASC
- Include user profile information
- Filter by round if needed

#### 4.4.4 Real-Time Features

**REQ-GAME-023:** Real-time game session updates
- Subscribe to `game_sessions` UPDATE events
- Subscribe to `game_actions` INSERT events
- Subscribe to `game_session_players` INSERT/UPDATE events
- Update React Query cache on changes

**REQ-GAME-024:** Real-time player presence
- Track active players in session
- Show who's currently viewing/playing
- Update when players join/leave

### 4.5 UI/UX Requirements

#### 4.5.1 Game Discovery

**REQ-GAME-025:** Games list in match
- Show available games in match chat or dedicated games tab
- Display game name, description, estimated duration
- Show "Play" button for each game
- Show active sessions if any

**REQ-GAME-026:** Game details modal/page
- Show full game description
- Show rules/how to play
- Show estimated duration
- Show "Start Game" button

#### 4.5.2 Game Session UI

**REQ-GAME-027:** Game session page
- Show game name and status
- Show active players (avatars, names)
- Show game-specific UI (questions, answers, results, etc.)
- Show action buttons (submit, vote, etc.)
- Show game state (current round, turn, etc.)

**REQ-GAME-028:** Game-specific components
- Create reusable game component structure
- Each game type has its own component
- Common elements: player list, timer (optional), action buttons
- Results display component

**REQ-GAME-029:** Game history in match
- Show list of completed games
- Show winners, scores, dates
- Allow viewing past game results

#### 4.5.3 Navigation

**REQ-GAME-030:** Add games to match chat
- Add "Games" tab or section in match chat
- Show active and available games
- Quick access to start/join games

**REQ-GAME-031:** Game session routing
- Route: `/match/:matchId/game/:sessionId`
- Navigate from games list or match chat
- Back button returns to match chat

### 4.6 Technical Implementation

#### 4.6.1 Service Layer

**REQ-GAME-032:** Create `src/services/games.service.ts`
- `getAvailableGames()`
- `getGameById(gameId)`
- `createGameSession(matchId, gameId, createdBy)`
- `joinGameSession(sessionId, userId)`
- `leaveGameSession(sessionId, userId)`
- `startGameSession(sessionId)`
- `getGameSession(sessionId)`
- `getGameSessionsForMatch(matchId)`
- `submitGameAction(sessionId, userId, actionType, actionData)`
- `getGameActions(sessionId)`
- `completeGameSession(sessionId)`
- `subscribeToGameSession(sessionId, callback)`
- `subscribeToGameActions(sessionId, callback)`

#### 4.6.2 Game-Specific Services

**REQ-GAME-033:** Create game-specific service modules
- `src/services/games/twoTruthsAndLie.service.ts`
- `src/services/games/wouldYouRather.service.ts`
- `src/services/games/thisOrThat.service.ts`
- `src/services/games/compatibilityQuiz.service.ts`
- `src/services/games/triviaChallenge.service.ts`

Each service exports:
- `initializeGameState()` - Set up initial game state
- `validateAction(gameState, action)` - Validate player action
- `processAction(gameState, action)` - Update game state
- `checkGameComplete(gameState)` - Check if game is finished
- `calculateResults(gameState, actions)` - Calculate final scores

#### 4.6.3 Hook Layer

**REQ-GAME-034:** Create `src/hooks/useGames.ts`
- `useAvailableGames()` - Get all available games
- `useGameSession(sessionId)` - Get game session
- `useGameSessionsForMatch(matchId)` - Get sessions for match
- `useCreateGameSession()` - Create session mutation
- `useJoinGameSession()` - Join session mutation
- `useSubmitGameAction()` - Submit action mutation
- `useGameActions(sessionId)` - Get actions with real-time

#### 4.6.4 Component Layer

**REQ-GAME-035:** Create `src/pages/GameSession.tsx`
- Main game session page
- Game-specific component renderer
- Player list
- Action buttons
- Results display

**REQ-GAME-036:** Create `src/components/games/` directory
- `GamesList.tsx` - List of available games
- `GameCard.tsx` - Individual game card
- `GameSessionLobby.tsx` - Waiting/joining screen
- `TwoTruthsAndLie.tsx` - Game component
- `WouldYouRather.tsx` - Game component
- `ThisOrThat.tsx` - Game component
- `CompatibilityQuiz.tsx` - Game component
- `TriviaChallenge.tsx` - Game component
- `GameResults.tsx` - Results display component

**REQ-GAME-037:** Create `src/components/GamePlayerList.tsx`
- Show active players in session
- Show scores if available
- Show turn indicator

**REQ-GAME-038:** Update `src/pages/Chat.tsx`
- Add "Games" tab or section
- Show available games and active sessions

**REQ-GAME-039:** Update `src/lib/routes.ts`
- Add route: `/match/:matchId/game/:sessionId`

### 4.7 RLS Policies

**REQ-GAME-040:** Row Level Security for `games`
- All users can view active games
- Only admins can create/update games (future)

**REQ-GAME-041:** Row Level Security for `game_sessions`
- Users can only view sessions for matches they're in
- Users can only create sessions for matches they're in
- Users can only update sessions they created or are players in

**REQ-GAME-042:** Row Level Security for `game_session_players`
- Users can only view players for sessions they're in
- Users can only join sessions for matches they're in
- Users can only update their own player record

**REQ-GAME-043:** Row Level Security for `game_actions`
- Users can only view actions for sessions they're in
- Users can only create actions for sessions they're active players in

**REQ-GAME-044:** Row Level Security for `game_results`
- Users can only view results for sessions they were players in

---

## 5. Feature 3: Advanced Filtering & Preferences

### 5.1 Overview
Advanced filtering and preferences system that enables users to set comprehensive matching criteria similar to top-tier dating apps (Tinder, Bumble, Hinge). This replaces the current basic gender/preference system with detailed filters for demographics, lifestyle, values, and dealbreakers.

### 5.2 Current State Analysis

**Existing System:**
- Basic `gender` field: 'man', 'woman', 'non-binary', 'prefer-not-to-say'
- Basic `preference` field: 'men', 'women', 'both'
- No age range preferences
- No distance/radius preferences
- No lifestyle filters
- No advanced matching criteria

**Limitations:**
- Too simplistic for modern dating app expectations
- Users cannot filter by important criteria (age, distance, lifestyle, etc.)
- Matching algorithm is too basic
- No dealbreaker system
- No preference priority system

### 5.3 User Stories

#### 5.3.1 Profile Information
- **US-FILTER-001:** As a user, I want to specify my height, so matches can see this information
- **US-FILTER-002:** As a user, I want to specify my education level, so I can match with people with similar backgrounds
- **US-FILTER-003:** As a user, I want to specify my religion, so I can match with people who share my values
- **US-FILTER-004:** As a user, I want to specify my political views, so I can match with compatible people
- **US-FILTER-005:** As a user, I want to specify my drinking/smoking habits, so I can find compatible matches
- **US-FILTER-006:** As a user, I want to specify my exercise/fitness level, so I can match with people with similar lifestyles
- **US-FILTER-007:** As a user, I want to specify my relationship goals (casual, serious, etc.), so I can find people looking for the same thing
- **US-FILTER-008:** As a user, I want to specify if I have/want kids, so I can match with compatible people
- **US-FILTER-009:** As a user, I want to specify languages I speak, so I can match with people I can communicate with
- **US-FILTER-010:** As a user, I want to specify my ethnicity/race, so I can express my identity

#### 5.3.2 Matching Preferences
- **US-FILTER-011:** As a user, I want to set my preferred age range, so I only see matches within my desired age group
- **US-FILTER-012:** As a user, I want to set my preferred distance/radius, so I only see matches within my desired location range
- **US-FILTER-013:** As a user, I want to set preferences for height range, so I can filter matches by height
- **US-FILTER-014:** As a user, I want to set preferences for education level, so I can match with people with similar education
- **US-FILTER-015:** As a user, I want to set preferences for religion, so I can match with people who share my values
- **US-FILTER-016:** As a user, I want to set preferences for political views, so I can match with compatible people
- **US-FILTER-017:** As a user, I want to set preferences for lifestyle factors (drinking, smoking, exercise), so I can find compatible matches
- **US-FILTER-018:** As a user, I want to set preferences for relationship goals, so I can find people looking for the same thing
- **US-FILTER-019:** As a user, I want to set preferences for kids (have/want), so I can match with compatible people
- **US-FILTER-020:** As a user, I want to set preferences for languages, so I can match with people I can communicate with

#### 5.3.3 Dealbreakers
- **US-FILTER-021:** As a user, I want to mark certain preferences as dealbreakers, so I never see matches that don't meet those criteria
- **US-FILTER-022:** As a user, I want to see which filters are dealbreakers vs preferences, so I understand my matching criteria
- **US-FILTER-023:** As a user, I want to easily toggle dealbreakers on/off, so I can adjust my matching strictness

#### 5.3.4 Interest-Based Matching
- **US-FILTER-024:** As a user, I want to select multiple interests/hobbies, so I can match with people who share my interests
- **US-FILTER-025:** As a user, I want to see compatibility scores based on shared interests, so I know how well I match with someone
- **US-FILTER-026:** As a user, I want to filter matches by specific interests, so I can find people with particular hobbies

#### 5.3.5 Filtering UI
- **US-FILTER-027:** As a user, I want to see all my filters in one place, so I can easily review and update them
- **US-FILTER-028:** As a user, I want to quickly toggle filters on/off, so I can experiment with different matching criteria
- **US-FILTER-029:** As a user, I want to see how many matches I'll see with current filters, so I can adjust if needed
- **US-FILTER-030:** As a user, I want to save filter presets, so I can quickly switch between different matching strategies

### 5.4 Functional Requirements

#### 5.4.1 Database Schema

**REQ-FILTER-001:** Extend `profiles` table with demographic fields
```sql
-- Add demographic fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height_inches INTEGER CHECK (height_inches BETWEEN 36 AND 96), -- 3-8 feet
  ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN (
    'high-school', 'some-college', 'associates', 'bachelors', 
    'masters', 'phd', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS religion TEXT CHECK (religion IN (
    'christianity', 'islam', 'judaism', 'hinduism', 'buddhism', 
    'sikhism', 'atheist', 'agnostic', 'spiritual', 'other', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS political_views TEXT CHECK (political_views IN (
    'very-liberal', 'liberal', 'moderate', 'conservative', 
    'very-conservative', 'libertarian', 'other', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS drinking_habit TEXT CHECK (drinking_habit IN (
    'never', 'rarely', 'socially', 'often', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS smoking_habit TEXT CHECK (smoking_habit IN (
    'never', 'socially', 'regularly', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS exercise_frequency TEXT CHECK (exercise_frequency IN (
    'never', 'rarely', '1-2-times-week', '3-5-times-week', 
    'daily', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS relationship_goal TEXT CHECK (relationship_goal IN (
    'casual-dating', 'serious-relationship', 'marriage', 
    'friendship', 'not-sure', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS has_kids TEXT CHECK (has_kids IN (
    'yes', 'no', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS wants_kids TEXT CHECK (wants_kids IN (
    'yes', 'no', 'maybe', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of language codes
  ADD COLUMN IF NOT EXISTS ethnicity TEXT CHECK (ethnicity IN (
    'asian', 'black', 'hispanic', 'middle-eastern', 'native-american', 
    'pacific-islander', 'white', 'mixed', 'other', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS pets TEXT[] DEFAULT ARRAY[]::TEXT[]; -- Array of pet types
```

**REQ-FILTER-002:** Create `user_preferences` table (matching preferences)
```sql
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Age preferences
  min_age INTEGER CHECK (min_age >= 18 AND min_age <= 100),
  max_age INTEGER CHECK (max_age >= 18 AND max_age <= 100),
  
  -- Distance preferences (in miles/kilometers)
  max_distance_miles INTEGER DEFAULT 50 CHECK (max_distance_miles > 0),
  
  -- Height preferences (in inches)
  min_height_inches INTEGER CHECK (min_height_inches BETWEEN 36 AND 96),
  max_height_inches INTEGER CHECK (max_height_inches BETWEEN 36 AND 96),
  
  -- Education preferences (array of acceptable values)
  education_levels TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Religion preferences
  religions TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Political preferences
  political_views TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Lifestyle preferences
  drinking_habits TEXT[] DEFAULT ARRAY[]::TEXT[],
  smoking_habits TEXT[] DEFAULT ARRAY[]::TEXT[],
  exercise_frequencies TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Relationship preferences
  relationship_goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Kids preferences
  has_kids_preference TEXT CHECK (has_kids_preference IN ('yes', 'no', 'either', 'prefer-not-to-say')),
  wants_kids_preference TEXT CHECK (wants_kids_preference IN ('yes', 'no', 'maybe', 'either', 'prefer-not-to-say')),
  
  -- Language preferences
  languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Ethnicity preferences
  ethnicities TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Dealbreakers (JSONB for flexibility)
  dealbreakers JSONB DEFAULT '{}'::JSONB,
  -- Example dealbreaker structure:
  -- {
  --   "age": true,
  --   "distance": true,
  --   "smoking": true,
  --   "has_kids": true
  -- }
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_age_range CHECK (min_age <= max_age),
  CONSTRAINT valid_height_range CHECK (min_height_inches <= max_height_inches)
);
```

**REQ-FILTER-003:** Create `user_interests` table (for interest-based matching)
```sql
CREATE TABLE public.user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest TEXT NOT NULL, -- e.g., 'hiking', 'cooking', 'travel', 'music', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest)
);

-- Create interest categories table (for organization)
CREATE TABLE public.interest_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'sports', 'music', 'food', 'travel'
  display_name TEXT NOT NULL,
  icon TEXT, -- Icon identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create predefined interests table
CREATE TABLE public.predefined_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.interest_categories(id),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**REQ-FILTER-004:** Create indexes for performance
```sql
-- Indexes for user_preferences
CREATE INDEX idx_user_preferences_user ON public.user_preferences(user_id);
CREATE INDEX idx_user_preferences_age ON public.user_preferences(min_age, max_age);
CREATE INDEX idx_user_preferences_distance ON public.user_preferences(max_distance_miles);

-- Indexes for user_interests
CREATE INDEX idx_user_interests_user ON public.user_interests(user_id);
CREATE INDEX idx_user_interests_interest ON public.user_interests(interest);

-- Indexes for profile filtering
CREATE INDEX idx_profiles_age ON public.profiles(age) WHERE age IS NOT NULL;
CREATE INDEX idx_profiles_height ON public.profiles(height_inches) WHERE height_inches IS NOT NULL;
CREATE INDEX idx_profiles_education ON public.profiles(education_level) WHERE education_level IS NOT NULL;
CREATE INDEX idx_profiles_religion ON public.profiles(religion) WHERE religion IS NOT NULL;
CREATE INDEX idx_profiles_relationship_goal ON public.profiles(relationship_goal) WHERE relationship_goal IS NOT NULL;
```

#### 5.4.2 Preference Management

**REQ-FILTER-005:** Update user profile with demographic information
- Allow users to set all demographic fields during profile setup
- Make fields optional (users can skip if they prefer)
- Validate field values against allowed enums
- Update profile completeness calculation to include new fields

**REQ-FILTER-006:** Create/update user preferences
- Create `user_preferences` record when user sets preferences
- Update preferences when user changes them
- Validate preference ranges (age, height, distance)
- Handle array fields (education, religion, etc.)

**REQ-FILTER-007:** Dealbreaker system
- Store dealbreakers in JSONB field
- Dealbreakers are hard filters (exclude from results completely)
- Regular preferences are soft filters (affect ranking but don't exclude)
- Allow users to toggle dealbreakers on/off per filter

**REQ-FILTER-008:** Interest management
- Allow users to select multiple interests from predefined list
- Support custom interests (user-entered)
- Categorize interests for better organization
- Limit number of interests per user (e.g., max 20)

#### 5.4.3 Matching Algorithm

**REQ-FILTER-009:** Apply filters to matchmaking query
- Filter by age range (dealbreaker if set as dealbreaker)
- Filter by distance (dealbreaker if set as dealbreaker)
- Filter by height range (dealbreaker if set as dealbreaker)
- Filter by education level (dealbreaker if set as dealbreaker)
- Filter by religion (dealbreaker if set as dealbreaker)
- Filter by political views (dealbreaker if set as dealbreaker)
- Filter by lifestyle factors (drinking, smoking, exercise)
- Filter by relationship goals
- Filter by kids preferences
- Filter by languages
- Filter by ethnicity

**REQ-FILTER-010:** Compatibility scoring
- Calculate compatibility score based on:
  - Shared interests (weighted)
  - Matching preferences (demographics, lifestyle)
  - Distance (closer = higher score)
  - Age difference (closer = higher score)
- Return matches sorted by compatibility score

**REQ-FILTER-011:** Duo-level matching logic
- For duo matching, check preferences of all 4 individuals
- At least one person in duo A must match preferences with at least one person in duo B
- At least one person in duo B must match preferences with at least one person in duo A
- Apply dealbreakers strictly (if any dealbreaker fails, exclude match)

**REQ-FILTER-012:** Database-level filtering (performance)
- Create RPC function for filtered matchmaking query
- Use PostGIS for distance filtering (if available)
- Use indexes for efficient filtering
- Return paginated results

#### 5.4.4 Filter UI Components

**REQ-FILTER-013:** Preferences settings page
- Comprehensive form for all preference types
- Organized by category (Demographics, Lifestyle, Values, etc.)
- Clear visual distinction between preferences and dealbreakers
- Save/cancel functionality
- Show match count estimate

**REQ-FILTER-014:** Quick filter bar (in matchmaking)
- Quick access to common filters (age, distance)
- Visual filter indicators (badges/chips)
- Clear filters button
- Filter count indicator

**REQ-FILTER-015:** Advanced filters modal
- Expandable sections for each filter category
- Range sliders for age, height, distance
- Multi-select dropdowns for categorical filters
- Toggle switches for dealbreakers
- Reset to defaults option

**REQ-FILTER-016:** Interest selection UI
- Grid/list of interest categories
- Search/filter interests
- Selected interests shown as chips
- Remove interest functionality
- Popular interests highlighted

### 5.5 UI/UX Requirements

#### 5.5.1 Profile Setup Enhancement

**REQ-FILTER-017:** Enhanced profile setup flow
- Multi-step form with sections:
  1. Basic info (name, age, bio, photo)
  2. Demographics (height, education, religion, etc.)
  3. Lifestyle (drinking, smoking, exercise, etc.)
  4. Values (political views, relationship goals, kids)
  5. Interests (select multiple)
  6. Preferences (matching criteria)
- Progress indicator
- Save draft functionality
- Skip optional sections

#### 5.5.2 Preferences Page

**REQ-FILTER-018:** Dedicated preferences page
- Accessible from profile/settings
- Organized sections:
  - About Me (demographics, lifestyle)
  - I'm Looking For (matching preferences)
  - Dealbreakers
  - Interests
- Visual preview of how filters affect matching
- Match count estimate

#### 5.5.3 Matchmaking Integration

**REQ-FILTER-019:** Filter indicators in matchmaking
- Show active filters as badges
- Filter count indicator
- "Adjust filters" button
- Empty state when no matches (with filter adjustment prompt)

**REQ-FILTER-020:** Match card enhancements
- Show compatibility score/percentage
- Show shared interests
- Show why match appeared (e.g., "Matches your age preference")
- Filter match reasons

### 5.6 Technical Implementation

#### 5.6.1 Service Layer

**REQ-FILTER-021:** Create `src/services/preferences.service.ts`
- `updateUserDemographics(userId, demographics)`
- `getUserPreferences(userId)`
- `updateUserPreferences(userId, preferences)`
- `getUserInterests(userId)`
- `addUserInterest(userId, interest)`
- `removeUserInterest(userId, interest)`
- `getPredefinedInterests()`
- `getInterestCategories()`
- `calculateCompatibility(userId1, userId2)`
- `getFilteredDuos(userId, filters)`
- `getMatchCountEstimate(userId, filters)`

**REQ-FILTER-022:** Create `src/services/matching.service.ts` (enhanced)
- Extend existing matching service
- `getFilteredDuosForMatchmaking(userId, filters)` - Database-level filtering
- `applyFilters(duos, preferences)` - Client-side filtering fallback
- `calculateCompatibilityScore(duoA, duoB, preferences)` - Scoring algorithm

#### 5.6.2 Hook Layer

**REQ-FILTER-023:** Create `src/hooks/usePreferences.ts`
- `useUserPreferences(userId)` - Get preferences
- `useUpdatePreferences()` - Update preferences mutation
- `useUserInterests(userId)` - Get interests
- `useAddInterest()` - Add interest mutation
- `useRemoveInterest()` - Remove interest mutation
- `usePredefinedInterests()` - Get predefined interests
- `useMatchCountEstimate(filters)` - Get match count estimate

**REQ-FILTER-024:** Update `src/hooks/useMatching.ts`
- Integrate filtering into existing matching hook
- `useFilteredDuos(filters)` - Get filtered duos for matchmaking
- Real-time updates when filters change

#### 5.6.3 Component Layer

**REQ-FILTER-025:** Create `src/pages/Preferences.tsx`
- Main preferences page
- Sections for all preference types
- Dealbreaker toggles
- Save/cancel buttons

**REQ-FILTER-026:** Create `src/components/preferences/` directory
- `DemographicsSection.tsx` - Demographics form
- `LifestyleSection.tsx` - Lifestyle preferences
- `ValuesSection.tsx` - Values and relationship goals
- `InterestsSection.tsx` - Interest selection
- `MatchingPreferencesSection.tsx` - Matching criteria
- `DealbreakersSection.tsx` - Dealbreaker toggles
- `FilterBar.tsx` - Quick filter bar for matchmaking
- `AdvancedFiltersModal.tsx` - Advanced filters modal
- `InterestSelector.tsx` - Interest selection component
- `RangeSlider.tsx` - Reusable range slider component
- `MultiSelectDropdown.tsx` - Multi-select dropdown component

**REQ-FILTER-027:** Update `src/pages/ProfileSetup.tsx`
- Add new sections for demographics, lifestyle, values, interests
- Multi-step form with progress indicator
- Save draft functionality

**REQ-FILTER-028:** Update `src/pages/Matchmaking.tsx`
- Integrate filter bar
- Apply filters to duo queries
- Show filter indicators
- Show compatibility scores on cards
- Show shared interests

**REQ-FILTER-029:** Update `src/lib/preferences.ts`
- Extend existing preference matching logic
- Add new compatibility calculation functions
- Add filter application functions
- Maintain backward compatibility with existing system

### 5.7 RLS Policies

**REQ-FILTER-030:** Row Level Security for `user_preferences`
- Users can only view/update their own preferences
- Users can view other users' preferences (for matching) but not modify

**REQ-FILTER-031:** Row Level Security for `user_interests`
- Users can view all interests (for matching)
- Users can only modify their own interests

**REQ-FILTER-032:** Row Level Security for profile extensions
- Users can update their own demographic fields
- Users can view other users' demographic fields (for matching)

### 5.8 Migration Strategy

**REQ-FILTER-033:** Backward compatibility
- Existing `gender` and `preference` fields remain
- New preferences system extends existing system
- Migrate existing preferences to new system automatically
- Default preferences for users without preferences set

**REQ-FILTER-034:** Data migration
- Create migration script to:
  - Add new columns to profiles table
  - Create new tables (user_preferences, user_interests)
  - Migrate existing data if possible
  - Set default values for new fields

---

## 6. Integration & Dependencies

### 6.1 Existing Feature Integration

**REQ-INT-001:** Private messaging integrates with matches
- Users can only message people from their matches
- Match context preserved (can see which match users met through)

**REQ-INT-002:** Games integrate with matches
- Games are scoped to matches
- All match participants can join games
- Game history visible in match context

**REQ-INT-003:** Advanced filtering integrates with matchmaking
- Filters apply to matchmaking queries
- Compatibility scoring affects match ranking
- Dealbreakers exclude matches completely
- Interests affect compatibility scores

**REQ-INT-004:** All features use existing infrastructure
- Reuse rate limiting service
- Reuse moderation service
- Reuse storage service for attachments
- Follow existing error handling patterns
- Extend existing preference system

### 6.2 New Dependencies

**REQ-DEP-001:** No new major dependencies required
- Use existing Supabase Realtime
- Use existing React Query
- Use existing UI components (shadcn/ui)

**REQ-DEP-002:** Optional: Game question/trivia data
- Consider external API for trivia questions (if needed)
- Or seed database with question sets

---

## 7. Non-Functional Requirements

### 7.1 Performance

**NFR-PERF-001:** Private messages pagination
- Load 50 messages per page
- Infinite scroll for older messages
- Virtualized message list for performance

**NFR-PERF-002:** Game state updates
- Real-time updates within 500ms
- Efficient JSONB queries for game state
- Indexed queries for game sessions

**NFR-PERF-003:** Conversation list performance
- Load conversations with last message preview
- Efficient query with proper indexes
- Virtualized list if many conversations

### 7.2 Security

**NFR-SEC-001:** Private message privacy
- RLS policies prevent unauthorized access
- Users can only see their own conversations
- Blocked users cannot send messages

**NFR-SEC-002:** Game session security
- Only match participants can join games
- Validate all game actions server-side
- Prevent game state manipulation

**NFR-SEC-003:** Content moderation
- Apply existing moderation to private messages
- Rate limiting on all actions
- Report functionality for abuse

### 7.3 Reliability

**NFR-REL-001:** Game state persistence
- Game state stored in database
- Recoverable if connection lost
- Handle player disconnections gracefully

**NFR-REL-002:** Real-time reliability
- Fallback to polling if WebSocket fails
- Retry logic for failed actions
- Graceful degradation

### 7.4 Scalability

**NFR-SCAL-001:** Database indexes
- All foreign keys indexed
- Frequently queried fields indexed
- JSONB indexes for game state queries (if needed)

**NFR-SCAL-002:** Real-time subscriptions
- Efficient channel subscriptions
- Cleanup on component unmount
- Limit concurrent subscriptions

---

## 8. Implementation Phases

### Phase 1: Private Messaging Foundation (Week 1-2)

**Priority:** High  
**Deliverables:**
1. Database schema and migrations
2. RLS policies
3. Service layer (`privateMessaging.service.ts`)
4. Hook layer (`usePrivateMessaging.ts`)
5. Basic UI (conversation list, chat page)
6. Real-time message subscriptions

**Acceptance Criteria:**
- Users can create conversations with matched users
- Users can send/receive private messages
- Real-time updates work
- Read receipts tracked
- Unread counts displayed

### Phase 2: Private Messaging Polish (Week 3)

**Priority:** Medium  
**Deliverables:**
1. Message editing/deletion
2. Typing indicators
3. Search/filter conversations
4. UI polish and empty states
5. Integration with bottom navigation

**Acceptance Criteria:**
- All message management features work
- UI is polished and user-friendly
- Performance is optimized

### Phase 3: Games Foundation (Week 4-5)

**Priority:** High  
**Deliverables:**
1. Database schema and migrations
2. RLS policies
3. Service layer (`games.service.ts`)
4. Hook layer (`useGames.ts`)
5. Game discovery UI
6. Game session creation/joining
7. Real-time game updates

**Acceptance Criteria:**
- Users can see available games
- Users can create/join game sessions
- Real-time updates work
- Basic game state management

### Phase 4: Game Implementation (Week 6-8)

**Priority:** High  
**Deliverables:**
1. Implement "Two Truths and a Lie"
2. Implement "Would You Rather"
3. Implement "This or That"
4. Implement "Compatibility Quiz"
5. Implement "Trivia Challenge"
6. Game results and history

**Acceptance Criteria:**
- All 5 games are playable
- Game logic works correctly
- Results are calculated accurately
- Game history is tracked

### Phase 5: Advanced Filtering Foundation (Week 9-10)

**Priority:** High  
**Deliverables:**
1. Database schema and migrations (extend profiles, create user_preferences, user_interests)
2. RLS policies
3. Service layer (`preferences.service.ts`)
4. Hook layer (`usePreferences.ts`)
5. Enhanced profile setup flow
6. Basic preferences page
7. Filter integration with matchmaking

**Acceptance Criteria:**
- Users can set demographic information
- Users can set matching preferences
- Filters apply to matchmaking queries
- Basic compatibility scoring works
- Backward compatible with existing system

### Phase 6: Advanced Filtering Features (Week 11-12)

**Priority:** High  
**Deliverables:**
1. Dealbreaker system
2. Interest-based matching
3. Compatibility scoring algorithm
4. Advanced filters UI (modal, filter bar)
5. Interest selection UI
6. Match count estimation
7. Filter presets

**Acceptance Criteria:**
- Dealbreakers work correctly
- Interest matching works
- Compatibility scores are accurate
- UI is intuitive and user-friendly
- Performance is optimized

### Phase 7: Polish & Optimization (Week 13-14)

**Priority:** Medium  
**Deliverables:**
1. UI/UX improvements across all features
2. Performance optimization
3. Error handling improvements
4. Testing
5. Documentation
6. Migration scripts

**Acceptance Criteria:**
- All features are polished and performant
- Comprehensive error handling
- Good test coverage
- Documentation complete
- Migration scripts tested

---

## 8. Success Metrics

### 8.1 Private Messaging Metrics

- **Engagement:** % of users who send at least one private message
- **Retention:** % of users who continue private conversations
- **Response Rate:** Average time to respond to private messages
- **Conversation Length:** Average messages per conversation

### 8.2 Games Metrics

- **Adoption:** % of matches that have at least one game session
- **Engagement:** Average games played per match
- **Completion Rate:** % of game sessions that complete
- **Replay Rate:** % of users who play multiple games

### 8.3 Advanced Filtering Metrics

- **Adoption:** % of users who set preferences beyond basic gender/preference
- **Filter Usage:** Average number of filters set per user
- **Match Quality:** % increase in match acceptance rate with filters
- **Dealbreaker Usage:** % of users who set at least one dealbreaker
- **Interest Matching:** % of matches with shared interests

### 8.4 Technical Metrics

- **Performance:** Message delivery < 500ms
- **Reliability:** 99.9% uptime for real-time features
- **Error Rate:** < 1% error rate for game actions
- **Load Time:** Game session load < 2 seconds
- **Filter Query Performance:** Matchmaking queries with filters < 1 second

---

## 9. Risks & Mitigations

### 9.1 Technical Risks

**Risk:** Real-time performance with many concurrent game sessions  
**Mitigation:** Use efficient subscriptions, limit concurrent sessions per user, optimize queries

**Risk:** Game state complexity in JSONB  
**Mitigation:** Use structured game state schemas, validate state transitions, version game state format

**Risk:** Private messaging spam/abuse  
**Mitigation:** Rate limiting, blocking system, reporting functionality, moderation

### 9.2 Product Risks

**Risk:** Low game adoption  
**Mitigation:** Make games easy to discover, show in match chat prominently, start with simple games

**Risk:** Games feel forced or awkward  
**Mitigation:** Make games optional, provide clear instructions, design for fun and engagement

**Risk:** Too many filters reduce match pool significantly  
**Mitigation:** Show match count estimates, warn users when filters are too restrictive, provide filter suggestions

**Risk:** Complex filtering UI confuses users  
**Mitigation:** Progressive disclosure, clear defaults, tooltips and help text, user testing

---

## 10. Future Enhancements

### 10.1 Private Messaging Enhancements
- Voice messages
- Video calls
- Message reactions
- Message forwarding
- Group private conversations (3+ users)

### 10.2 Games Enhancements
- More game types (20 Questions, Never Have I Ever, etc.)
- Custom game creation
- Tournament mode
- Game achievements/badges
- Leaderboards across all matches
- Mobile-optimized game UIs

### 10.3 Advanced Filtering Enhancements
- AI-powered compatibility matching
- Personality tests integration
- Advanced search (search by specific criteria)
- Filter suggestions based on user behavior
- Preference learning (adjust preferences based on swipe patterns)
- Verified badges/preferences
- Filter analytics dashboard

---

## 11. Acceptance Criteria Summary

### Private Messaging
- ✅ Users can create private conversations with matched users
- ✅ Users can send/receive private messages in real-time
- ✅ Read receipts and unread counts work correctly
- ✅ Message editing/deletion works
- ✅ Typing indicators work
- ✅ Privacy and safety features (blocking, reporting) work
- ✅ UI is polished and user-friendly

### Group Games
- ✅ Users can discover and select games in matches
- ✅ Users can create and join game sessions
- ✅ All 5 initial games are playable
- ✅ Real-time game updates work
- ✅ Game results and history are tracked
- ✅ UI is intuitive and engaging

### Advanced Filtering & Preferences
- ✅ Users can set comprehensive demographic information
- ✅ Users can set matching preferences (age, distance, height, etc.)
- ✅ Dealbreakers work correctly (exclude matches completely)
- ✅ Interest-based matching works
- ✅ Compatibility scoring is accurate
- ✅ Filters apply to matchmaking queries
- ✅ Filter UI is intuitive and user-friendly
- ✅ Match count estimates are shown
- ✅ Backward compatible with existing preference system
- ✅ Performance is optimized (queries < 1 second)

---

**Document Status:** ✅ Complete  
**Review Status:** Ready for Review  
**Last Updated:** 2024-12-19

