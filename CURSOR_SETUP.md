# Yoke Web App - Cursor Setup Guide

## ✅ What's Been Done

1. **Removed all iOS files** - All Swift/iOS code has been removed
2. **Updated .cursorrules** - Now configured for React + TypeScript + Supabase
3. **Cleaned up .gitignore** - Removed iOS-specific ignores
4. **Created service structure** - Added `src/services/` directory with auth service
5. **Created hooks structure** - Added `src/hooks/` directory with useAuth hook
6. **Updated README** - Web app documentation
7. **Database schema** - Still available in `supabase/migrations/001_initial_schema.sql`

## 🚀 Getting Started

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### Step 3: Apply Database Schema

1. Go to your Supabase Dashboard → SQL Editor
2. Run the SQL from `supabase/migrations/001_initial_schema.sql`
3. Create a storage bucket named "photos" in Supabase Storage

### Step 4: Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   └── ...          # Custom components
├── hooks/           # Custom React hooks
│   ├── useAuth.ts   # Authentication hooks
│   └── README.md    # Hooks documentation
├── services/        # Service functions for Supabase
│   ├── auth.service.ts  # Authentication services
│   └── README.md    # Services documentation
├── lib/             # Utility functions
├── pages/           # Page components
│   ├── Auth.tsx
│   ├── Chat.tsx
│   ├── Matchmaking.tsx
│   └── ...
├── integrations/    # Supabase client and types
│   └── supabase/
└── assets/          # Static assets
```

## 🏗️ Architecture

### Data Flow

```
Component → Hook → Service → Supabase
```

- **Components**: Presentational components (pages and UI components)
- **Hooks**: Data fetching and state management (using React Query)
- **Services**: Supabase operations (authentication, database, storage)
- **Lib**: Utility functions (formatting, validation, type guards)

### Key Principles

1. **DRY**: No duplication of functions or logic
2. **Type Safety**: Use TypeScript for all code
3. **React Query**: Use React Query for data fetching and caching
4. **Component Composition**: Reusable components in `src/components/`
5. **Service Layer**: All Supabase operations in `src/services/`
6. **Custom Hooks**: All data fetching logic in `src/hooks/`

## 📝 Working in Cursor

### .cursorrules

The `.cursorrules` file is configured for:
- React + TypeScript + Supabase
- DRY principles
- Component composition
- Service layer architecture
- React Query for data fetching

### Adding New Features

1. **Create a service** in `src/services/` for Supabase operations
2. **Create a hook** in `src/hooks/` for data fetching
3. **Create a component** in `src/components/` or `src/pages/`
4. **Use the hook** in your component

### Example: Adding a New Feature

```typescript
// 1. Create service (src/services/matching.service.ts)
export async function getDuos() {
  const { data, error } = await supabase.from('duos').select();
  if (error) throw error;
  return data;
}

// 2. Create hook (src/hooks/useMatchmaking.ts)
export function useDuos() {
  return useQuery({
    queryKey: ['duos'],
    queryFn: getDuos,
  });
}

// 3. Use in component
const { data: duos, isLoading } = useDuos();
```

## 🔧 Next Steps

1. **Apply database schema** - Run the SQL migration in Supabase
2. **Configure environment variables** - Add Supabase credentials to `.env`
3. **Update Auth.tsx** - Use the new `useAuth` hook instead of direct Supabase calls
4. **Create matching services** - Add matching, chat, and storage services
5. **Create matching hooks** - Add hooks for matchmaking, chat, and storage
6. **Update pages** - Use the new hooks in your pages

## 📚 Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)

## 🎯 Current Status

- ✅ Database schema ready
- ✅ Auth service created
- ✅ Auth hook created
- ✅ Project structure ready
- ⚠️ Need to update pages to use new hooks
- ⚠️ Need to create matching/chat services
- ⚠️ Need to create matching/chat hooks

## 💡 Tips

1. **Use React Query** - All data fetching should use React Query
2. **Type everything** - Use TypeScript types for all data
3. **Reuse components** - Extract repeated UI patterns into components
4. **Service layer** - Keep all Supabase operations in services
5. **Error handling** - Handle errors properly in hooks and components

## 🐛 Troubleshooting

### "Cannot find module '@/services/auth.service'"
- Make sure `tsconfig.json` has path aliases configured
- Check that the file exists in `src/services/`

### "Supabase client not found"
- Make sure `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Restart the dev server after changing `.env`

### "Database error"
- Make sure the database schema is applied
- Check RLS policies in Supabase
- Verify table names match the schema

## 🎉 You're Ready!

You can now work on the web app in Cursor. The project is set up with:
- ✅ React + TypeScript + Supabase
- ✅ Service layer architecture
- ✅ React Query for data fetching
- ✅ Component composition
- ✅ DRY principles

Start by updating your pages to use the new hooks and services!

