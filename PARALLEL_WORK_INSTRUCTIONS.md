# Parallel Work Instructions for Second Agent

## Current Status
**Primary Agent:** Working on PostGIS migration, Rate limiting documentation, and JSDoc improvements

**Your Tasks (Non-Conflicting):**
1. ✅ **Accessibility Improvements** (standards-4)
2. ✅ **Service Worker Implementation** (efficiency-2)
3. ✅ **TypeScript Strict Mode** (quality-4)

---

## Task 1: Accessibility Improvements (Priority: MEDIUM)

### Files to Modify:
- `src/pages/Matchmaking.tsx`
- `src/pages/Chat.tsx`
- `src/pages/Messages.tsx`
- `src/components/ui/button.tsx` (if exists)
- All form inputs and interactive elements

### Requirements:
1. **Add ARIA labels** to all interactive elements:
   ```tsx
   <Button aria-label="Send message" aria-describedby="message-input-description">
   ```

2. **Keyboard navigation** improvements:
   - Ensure all interactive elements are keyboard accessible
   - Add focus management for modals
   - Add keyboard shortcuts documentation

3. **Screen reader support**:
   - Add `aria-hidden="true"` to decorative icons
   - Add `sr-only` class for screen reader only text
   - Ensure proper heading hierarchy

4. **Focus management**:
   - Trap focus in modals
   - Return focus after modal closes
   - Visible focus indicators

### Example Pattern:
```tsx
<Button
  aria-label="Send message"
  aria-describedby="message-input-description"
  onClick={handleSend}
>
  <Send aria-hidden="true" />
  <span className="sr-only">Send message</span>
</Button>
```

### Reference:
- See `PROFESSIONAL_CODE_REVIEW.md` section 3.5
- WCAG 2.1 AA compliance target

---

## Task 2: Service Worker Implementation (Priority: MEDIUM)

### Files to Create:
- `public/sw.js` or use Workbox plugin
- `src/lib/serviceWorker.ts` - Registration logic

### Requirements:
1. **Install Workbox**:
   ```bash
   npm install workbox-window workbox-precaching workbox-routing workbox-strategies
   ```

2. **Configure in vite.config.ts**:
   ```typescript
   import { VitePWA } from 'vite-plugin-pwa';
   
   plugins: [
     VitePWA({
       registerType: 'autoUpdate',
       workbox: {
         globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
         runtimeCaching: [
           {
             urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
             handler: 'NetworkFirst',
             options: {
               cacheName: 'supabase-cache',
               expiration: {
                 maxEntries: 50,
                 maxAgeSeconds: 60 * 60 * 24, // 24 hours
               },
             },
           },
         ],
       },
     }),
   ],
   ```

3. **Register in App.tsx**:
   ```typescript
   import { registerSW } from 'virtual:pwa-register';
   
   React.useEffect(() => {
     registerSW({
       immediate: true,
       onRegistered(r) {
         console.log('SW Registered: ', r);
       },
       onRegisterError(error) {
         console.log('SW registration error', error);
      },
    });
  }, []);
  ```

4. **Cache Strategy**:
   - Static assets: Cache First
   - API calls: Network First with fallback
   - Images: Cache First with expiration

### Reference:
- See `PROFESSIONAL_CODE_REVIEW.md` section 4.2
- Workbox documentation: https://developers.google.com/web/tools/workbox

---

## Task 3: TypeScript Strict Mode (Priority: LOW)

### Files to Modify:
- `tsconfig.json`

### Requirements:
1. **Enable strict mode**:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "strictBindCallApply": true,
       "strictPropertyInitialization": true,
       "noImplicitThis": true,
       "alwaysStrict": true
     }
   }
   ```

2. **Fix any type errors** that arise:
   - Replace `any` types with proper types
   - Add type guards where needed
   - Fix null/undefined checks

3. **Test build**:
   ```bash
   npm run build
   ```

### Reference:
- TypeScript strict mode docs: https://www.typescriptlang.org/tsconfig#strict

---

## Files to Avoid (Primary Agent Working On):
- ❌ `supabase/migrations/*` - PostGIS migration
- ❌ `src/services/location.service.ts` - Will be updated after migration
- ❌ `src/lib/validation.ts` - Already complete
- ❌ `src/lib/monitoring.ts` - Already complete
- ❌ `src/components/FeatureErrorBoundary.tsx` - Already complete
- ❌ `vite.config.ts` - Security headers already done (but you can add PWA plugin)

---

## Communication Protocol:
1. **Before starting**: Check `IMPLEMENTATION_STATUS.md` for latest updates
2. **During work**: Update `IMPLEMENTAL_STATUS.md` with your progress
3. **After completion**: Mark tasks as complete in the TODO list
4. **Conflicts**: If you need to modify a file the primary agent is working on, coordinate first

---

## Success Criteria:

### Accessibility:
- ✅ All interactive elements have ARIA labels
- ✅ Keyboard navigation works for all features
- ✅ Focus management implemented for modals
- ✅ Screen reader tested (or at least structured correctly)

### Service Worker:
- ✅ Service worker registers successfully
- ✅ Offline functionality works
- ✅ Cache strategy implemented
- ✅ Update notifications work

### TypeScript Strict Mode:
- ✅ Strict mode enabled
- ✅ No type errors
- ✅ Build passes successfully
- ✅ All `any` types replaced

---

## Questions?
If you encounter any conflicts or need clarification, check:
1. `IMPLEMENTATION_STATUS.md` - Current progress
2. `PROFESSIONAL_CODE_REVIEW.md` - Original requirements
3. `IMPLEMENTATION_COMPLETE.md` - What's already done

Good luck! 🚀

