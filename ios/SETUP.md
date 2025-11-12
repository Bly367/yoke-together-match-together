# Yoke iOS App Setup Guide

## Prerequisites

- **Xcode 15.0+** (download from Mac App Store)
- **macOS 14.0+** (for development)
- **iOS 17.0+** deployment target
- **Swift 6.0**
- **Supabase account** and project

## Step 1: Create Xcode Project

Since we can't create Xcode project files programmatically, you'll need to create the project manually:

1. Open Xcode
2. File → New → Project
3. Select "iOS" → "App"
4. Configure:
   - **Product Name**: Yoke
   - **Team**: (Your development team)
   - **Organization Identifier**: com.yoke (or your own)
   - **Interface**: SwiftUI
   - **Language**: Swift
   - **Storage**: None (we'll use Supabase)
   - **Minimum Deployment**: iOS 17.0
5. Save to `ios/Yoke.xcodeproj`

## Step 2: Add Swift Files to Project

1. In Xcode, right-click on the project → "Add Files to Yoke..."
2. Add all files from `ios/Yoke/`:
   - Models/
   - Services/
   - ViewModels/
   - Views/
   - Theme/
   - Utilities/
   - App/

## Step 3: Add Supabase Swift SDK

1. In Xcode, select your project
2. Go to "Package Dependencies" tab
3. Click "+" to add a package
4. Enter: `https://github.com/supabase/supabase-swift`
5. Select version: "Up to Next Major Version" → "2.0.0"
6. Add the "Supabase" product to your target

## Step 4: Configure Environment Variables

### Option A: Info.plist (Recommended for Development)

1. Open `Info.plist` in Xcode
2. Add these keys:
   - `SUPABASE_URL` (String) → Your Supabase project URL
   - `SUPABASE_ANON_KEY` (String) → Your Supabase anon key

### Option B: Xcode Scheme Environment Variables

1. Product → Scheme → Edit Scheme
2. Run → Arguments → Environment Variables
3. Add:
   - `SUPABASE_URL` = `your_supabase_url`
   - `SUPABASE_ANON_KEY` = `your_supabase_anon_key`

### Option C: Configuration File (Advanced)

Create a `Config.plist` file and load it at runtime (see `Configuration.swift`).

## Step 5: Update Info.plist Permissions

The `Info.plist` file already includes the necessary permissions:
- Location Services
- Camera
- Photo Library

Make sure these are present in your Xcode project's Info.plist.

## Step 6: Fix Supabase Client Initialization

The Supabase Swift SDK API may vary. Update `SupabaseClient.swift` based on the actual SDK version:

```swift
import Foundation
import Supabase

struct SupabaseClientWrapper {
  static let shared = SupabaseClientWrapper()
  
  let client: SupabaseClient
  
  private init() {
    let url = URL(string: Configuration.supabaseURL)!
    let key = Configuration.supabaseAnonKey
    
    // Update this based on actual Supabase Swift SDK API
    self.client = SupabaseClient(
      supabaseURL: url,
      supabaseKey: key
    )
  }
}
```

Check the [Supabase Swift SDK documentation](https://github.com/supabase/supabase-swift) for the correct initialization syntax.

## Step 7: Apply Database Schema

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link your project: `supabase link --project-ref your-project-ref`
4. Apply migration: `supabase db push`

Or manually run the SQL migration file:
- `supabase/migrations/001_initial_schema.sql`

## Step 8: Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named "photos"
3. Set it to public (or configure RLS policies)

## Step 9: Build and Run

1. Select a simulator (iPhone 15 Pro recommended)
2. Press `Cmd+R` to build and run
3. The app should launch on the simulator

## Step 10: Fix Any Compilation Errors

The code structure is complete, but you may need to:

1. **Fix Supabase Client API calls**: Update service methods based on actual SDK API
2. **Fix model decoding**: Adjust `Codable` implementations if needed
3. **Fix async/await syntax**: Ensure all async calls are properly awaited
4. **Add missing imports**: Some files may need additional imports

## Common Issues

### "SUPABASE_URL not found"
- Make sure environment variables are set in Info.plist or scheme
- Check that `Configuration.swift` is reading from the correct source

### "Cannot find 'SupabaseClient' in scope"
- Make sure Supabase Swift SDK is added as a package dependency
- Check that the import statement is correct: `import Supabase`

### "Type 'User' does not conform to protocol 'Codable'"
- Check that all properties in User model are Codable
- May need to add custom `CodingKeys` enum

### Database connection errors
- Verify Supabase URL and key are correct
- Check that RLS policies are correctly configured
- Ensure database schema is applied

## Next Steps

1. **Test Authentication**: Sign up and sign in
2. **Create Profile**: Update user profile
3. **Create Duo**: Implement duo creation flow
4. **Test Matching**: Swipe on duos
5. **Test Chat**: Send messages in matches

## Resources

- [Supabase Swift SDK](https://github.com/supabase/supabase-swift)
- [Supabase Documentation](https://supabase.com/docs)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Swift Concurrency](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html)

