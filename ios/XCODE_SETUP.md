# Xcode Project Setup Guide

## ⚠️ Important: You Still Need to Create the Xcode Project

All Swift source files are ready, but **you need to create the Xcode project file** because:
- Xcode project files (`.xcodeproj`) cannot be generated programmatically
- The project file contains build settings, file references, and target configurations
- You'll create it once, then all future changes can be committed to git

## Quick Setup (5 Steps)

### Step 1: Create Xcode Project

1. Open **Xcode**
2. File → **New** → **Project**
3. Select **iOS** → **App**
4. Configure:
   - **Product Name**: `Yoke`
   - **Team**: (Your development team)
   - **Organization Identifier**: `com.yoke` (or your own)
   - **Interface**: `SwiftUI`
   - **Language**: `Swift`
   - **Storage**: `None`
   - **Minimum Deployment**: `iOS 17.0`
5. **Save location**: Choose your repository root (`/Users/brianly/Yoke/yoke-together-match-together/ios/`)
6. Click **Create**

**Important**: This will create `ios/Yoke.xcodeproj` - this file should be committed to git.

### Step 2: Add Existing Swift Files to Project

1. In Xcode, right-click on the **Yoke** folder (blue folder icon) in the Project Navigator
2. Select **Add Files to "Yoke"...**
3. Navigate to `ios/Yoke/` folder
4. Select all folders:
   - `App/`
   - `Models/`
   - `Services/`
   - `ViewModels/`
   - `Views/`
   - `Theme/`
   - `Utilities/`
   - `Info.plist`
5. Make sure:
   - ✅ **"Copy items if needed"** is **UNCHECKED** (files already exist)
   - ✅ **"Create groups"** is selected
   - ✅ **"Add to targets: Yoke"** is checked
6. Click **Add**

### Step 3: Add Supabase Swift SDK

1. In Xcode, select your project (blue icon at top)
2. Select the **Yoke** target
3. Go to **Package Dependencies** tab
4. Click **+** button
5. Enter URL: `https://github.com/supabase/supabase-swift`
6. Select version: **Up to Next Major Version** → `2.0.0` or latest
7. Click **Add Package**
8. Select **Supabase** product
9. Click **Add Package**

### Step 4: Configure Build Settings

1. Select **Yoke** project (blue icon)
2. Select **Yoke** target
3. Go to **General** tab
4. Set **Minimum Deployments** to `iOS 17.0`
5. Go to **Info** tab
6. Verify `Info.plist` is included

### Step 5: Configure Environment Variables

#### Option A: Add to Info.plist (Recommended)

1. In Xcode, open `Info.plist`
2. Add keys:
   - `SUPABASE_URL` (String) → Your Supabase project URL
   - `SUPABASE_ANON_KEY` (String) → Your Supabase anon key

#### Option B: Xcode Scheme Environment Variables

1. Product → **Scheme** → **Edit Scheme**
2. Select **Run** → **Arguments**
3. Under **Environment Variables**, add:
   - `SUPABASE_URL` = `your_supabase_url`
   - `SUPABASE_ANON_KEY` = `your_supabase_anon_key`

### Step 6: Set Info.plist as Source

1. Select `Info.plist` in Project Navigator
2. In File Inspector (right panel), check **Target Membership**: `Yoke`
3. Make sure it's not in **Copy Bundle Resources** (should be in **Compile Sources** or just referenced)

Actually, `Info.plist` should be automatically recognized by Xcode if it's in the project root.

### Step 7: Build and Run

1. Select a simulator (iPhone 15 Pro recommended)
2. Press **Cmd+R** to build and run
3. Fix any compilation errors:
   - Supabase client initialization may need adjustment
   - API calls may need SDK-specific syntax
   - Check [Supabase Swift SDK docs](https://github.com/supabase/supabase-swift)

### Step 8: Commit Xcode Project to Git

Once everything works:

```bash
# Add the Xcode project file
git add ios/Yoke.xcodeproj/

# Commit all changes
git commit -m "Add iOS app with Xcode project"

# Push to remote
git push origin main
```

## Project Structure After Setup

```
ios/
├── Yoke.xcodeproj/          # Xcode project (created by you)
│   └── project.pbxproj      # Project file (committed to git)
└── Yoke/                    # Source files (already in git)
    ├── App/
    ├── Models/
    ├── Services/
    ├── ViewModels/
    ├── Views/
    ├── Theme/
    ├── Utilities/
    └── Info.plist
```

## After First Commit

Once you've committed the Xcode project:

1. **Clone from another location**:
   ```bash
   git clone <your-repo-url>
   cd yoke-together-match-together
   cd ios
   open Yoke.xcodeproj
   ```

2. **Xcode will automatically**:
   - Resolve Swift Package dependencies
   - Configure build settings
   - Open the project

3. **Just configure environment variables**:
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Info.plist
   - Or use Xcode scheme environment variables

## Troubleshooting

### "No such module 'Supabase'"
- Make sure Supabase Swift SDK is added as package dependency
- Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)
- Restart Xcode

### "SUPABASE_URL not found"
- Add to Info.plist or Xcode scheme environment variables
- Make sure keys are spelled correctly

### "Cannot find type 'SupabaseClient'"
- Check Supabase Swift SDK version
- Update `SupabaseClient.swift` based on actual SDK API
- See [Supabase Swift SDK docs](https://github.com/supabase/supabase-swift)

### Build Errors
- Check that all files are added to target
- Verify Swift version compatibility
- Check that iOS deployment target is 17.0+

## Next Steps

1. ✅ Create Xcode project (Step 1)
2. ✅ Add files to project (Step 2)
3. ✅ Add Supabase SDK (Step 3)
4. ✅ Configure environment variables (Step 5)
5. ✅ Build and run (Step 7)
6. ✅ Commit to git (Step 8)
7. ✅ Clone and open in Xcode from anywhere!

## Summary

- ✅ All Swift source files are ready in git
- ⚠️ You need to create the Xcode project file once
- ✅ After committing the Xcode project, you can clone and open anywhere
- ✅ All future changes can be committed to git normally

The Xcode project file is the only thing missing - create it once, commit it, and then you can clone and open the project from anywhere!

