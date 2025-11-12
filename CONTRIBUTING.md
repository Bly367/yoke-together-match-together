# Contributing to Yoke

Thank you for your interest in contributing to Yoke! This document provides guidelines and instructions for contributing.

---

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Follow the project's coding standards

---

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/yoke-together-match-together.git
   cd yoke-together-match-together
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Add your Supabase credentials
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for detailed setup instructions.

---

## Code Style

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types (use `unknown` if necessary)
- Define interfaces for all data structures
- Use JSDoc comments for public APIs

### React

- Use functional components only
- Use hooks for state and side effects
- Follow the Service → Hook → Component pattern
- No direct Supabase calls in components

### Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase starting with `use` (`useAuth.ts`)
- **Services**: camelCase ending with `.service.ts` (`auth.service.ts`)
- **Utilities**: camelCase (`utils.ts`)
- **Constants**: UPPER_SNAKE_CASE (`LOCATION_CACHE_KEY`)

### File Organization

```
src/
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── services/       # Service functions
├── lib/            # Utility functions
├── pages/          # Page components
└── integrations/   # External integrations
```

---

## Architecture Guidelines

### Service → Hook → Component Pattern

**Always follow this pattern:**

1. **Service** (`services/*.ts`): Pure function that calls Supabase
2. **Hook** (`hooks/*.ts`): Wraps service with React Query
3. **Component** (`pages/*.tsx`): Uses hook to get data

**Example:**

```typescript
// ✅ Good: Service function
// services/example.service.ts
export async function getExampleData(id: string) {
  const { data, error } = await supabase.from('table').select().eq('id', id).single();
  if (error) throw error;
  return data;
}

// ✅ Good: Hook wraps service
// hooks/useExample.ts
export function useExample(id: string) {
  return useQuery({
    queryKey: ['example', id],
    queryFn: () => getExampleData(id),
  });
}

// ✅ Good: Component uses hook
// pages/Example.tsx
const { data, isLoading } = useExample(id);
```

**❌ Bad: Direct Supabase call in component**

```typescript
// ❌ Don't do this
const { data } = await supabase.from('table').select();
```

### DRY Principle

- Extract repeated code into shared utilities
- Reuse existing services and hooks
- Don't duplicate logic across files

### Error Handling

- Services throw errors with descriptive messages
- Hooks handle errors and expose them to components
- Components display user-friendly error messages

---

## Pull Request Process

### Before Submitting

1. **Update Documentation**
   - Update API.md if adding/changing services
   - Update README.md if changing setup
   - Add JSDoc comments to new functions

2. **Run Tests**
   ```bash
   npm run test
   npm run lint
   ```

3. **Check TypeScript**
   ```bash
   npm run type-check
   ```

4. **Test Locally**
   - Test the feature thoroughly
   - Test error cases
   - Test edge cases

### PR Checklist

- [ ] Code follows the architecture pattern
- [ ] No direct Supabase calls in components
- [ ] TypeScript types are correct
- [ ] JSDoc comments added for public APIs
- [ ] Error handling implemented
- [ ] No code duplication
- [ ] Tests pass (if applicable)
- [ ] Documentation updated
- [ ] No console.logs or debug code

### PR Description

Include:
- What changes were made
- Why the changes were needed
- How to test the changes
- Screenshots (if UI changes)

---

## Testing

### Writing Tests

- Write unit tests for services
- Write integration tests for hooks
- Test error cases and edge cases

### Running Tests

```bash
npm run test        # Run all tests
npm run test:watch  # Watch mode
npm run test:coverage # Coverage report
```

---

## Documentation

### Code Documentation

- Add JSDoc comments to all public service functions
- Document parameters, return types, and errors
- Include usage examples for complex functions

### API Documentation

- Update `API.md` when adding/changing services
- Follow the existing format
- Include type definitions

### Architecture Documentation

- Update `ARCHITECTURE.md` for architectural changes
- Document design decisions
- Update diagrams if needed

---

## Commit Messages

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add redirect after login
fix(location): invalidate cache on privacy change
docs(api): add sendMessage documentation
refactor(matching): optimize match query
```

---

## Questions?

- Check existing documentation
- Review existing code for patterns
- Ask in issues or discussions
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions

---

**Thank you for contributing to Yoke!** 🎉

