# Yoke iOS App

SwiftUI + Supabase iOS app for duo matching and realtime group chat.

## Prerequisites

- Xcode 15.0 or later
- iOS 17.0+ deployment target
- Swift 6.0
- macOS 14.0+ (for development)
- Supabase account and project

## Setup

### 1. Open the Project

```bash
cd ios
open Yoke.xcodeproj
```

### 2. Install Dependencies

This project uses Swift Package Manager. Dependencies will be resolved automatically when you open the project in Xcode.

**Required Packages:**
- `supabase-swift` - Supabase client for Swift
- (Add via Xcode: File → Add Package Dependencies)

### 3. Configure Environment Variables

1. Create a `.env` file in the `ios` directory (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Add your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. For production, add these to Xcode scheme environment variables or use a configuration file.

### 4. Run Database Migrations

1. Apply the database schema to your Supabase project:
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or manually run the SQL migration file
   # supabase/migrations/001_initial_schema.sql
   ```

### 5. Configure Info.plist

Add the following keys to `Info.plist`:
- `NSLocationWhenInUseUsageDescription` - "We need your location to find nearby duos"
- `NSCameraUsageDescription` - "We need camera access to upload profile photos"
- `NSPhotoLibraryUsageDescription` - "We need photo library access to upload profile photos"

### 6. Build and Run

1. Select a simulator or connected device
2. Press `Cmd+R` to build and run
3. The app will launch on the selected device/simulator

## Project Structure

```
ios/
├── Yoke/
│   ├── App/
│   │   └── YokeApp.swift          # App entry point
│   ├── Models/                    # Data models
│   │   ├── User.swift
│   │   ├── Duo.swift
│   │   ├── Match.swift
│   │   └── Message.swift
│   ├── Services/                  # Business logic & API calls
│   │   ├── ServiceLocators.swift
│   │   ├── AuthService.swift
│   │   ├── MatchingService.swift
│   │   ├── ChatService.swift
│   │   └── StorageService.swift
│   ├── ViewModels/                # ViewModels (Observable)
│   │   ├── AuthViewModel.swift
│   │   ├── MatchmakingViewModel.swift
│   │   └── ChatViewModel.swift
│   ├── Views/                     # SwiftUI Views
│   │   ├── Auth/
│   │   ├── Matchmaking/
│   │   ├── Chat/
│   │   └── Components/
│   ├── Theme/                     # Design system
│   │   └── Theme.swift
│   ├── Utilities/                 # Helpers
│   │   └── Retry.swift
│   └── Resources/
│       ├── Info.plist
│       └── Assets.xcassets
└── Yoke.xcodeproj
```

## Architecture

This app follows a clean, layered architecture:

- **Models**: Value types (structs) with Codable
- **Services**: Protocol-based, dependency-injected services
- **ViewModels**: @MainActor, Observable classes that manage state
- **Views**: Stateless SwiftUI views that display data

### Key Principles

1. **DRY**: No duplication of functions or logic
2. **Protocol-Based**: All services use protocols for testability
3. **Dependency Injection**: Services are injected, not singletons
4. **Value Types**: Models are structs when possible
5. **Async/Await**: Modern Swift concurrency throughout

## Features

- ✅ Authentication (email/password)
- ✅ Profile creation
- ✅ Duo creation (pair with friend)
- ✅ Location-based matching
- ✅ Swipe-based matching
- ✅ Realtime chat
- ✅ Push notifications (via APNs)
- ✅ Photo uploads

## Development

### Running Tests

```bash
# Run all tests
xcodebuild test -scheme Yoke -destination 'platform=iOS Simulator,name=iPhone 15'

# Or use Xcode's test navigator (Cmd+6)
```

### Code Style

This project uses SwiftLint. Configuration is in `.swiftlint.yml` at the root.

Run SwiftLint:
```bash
swiftlint
```

### Database Schema

See `supabase/migrations/001_initial_schema.sql` for the complete database schema.

## Deployment

### App Store

1. Archive the app in Xcode
2. Upload to App Store Connect
3. Submit for review

### TestFlight

1. Archive the app
2. Upload to App Store Connect
3. Add internal/external testers

## Environment Variables

For different environments, use Xcode schemes:
- **Development**: `.env` file or Xcode scheme environment variables
- **Staging**: Scheme-specific environment variables
- **Production**: App Store Connect build settings

## Troubleshooting

### Build Errors

- Ensure all Swift Package dependencies are resolved
- Check that iOS deployment target is 17.0+
- Verify environment variables are set correctly

### Supabase Connection Issues

- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check Supabase project dashboard for API status
- Ensure RLS policies are correctly configured

### Location Services

- Add location permissions to Info.plist
- Test on a real device (simulator location may not work)
- Verify location services are enabled in Settings

## Contributing

1. Follow the `.cursorrules` guidelines
2. Write tests for new features
3. Keep code DRY and maintainable
4. Update documentation as needed

## License

[Your License Here]

