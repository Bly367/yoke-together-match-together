# Changelog

All notable changes to the Yoke project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Comprehensive API documentation (`API.md`)
- Architecture documentation (`ARCHITECTURE.md`)
- Contributing guide (`CONTRIBUTING.md`)
- Documentation index (`docs/INDEX.md`)
- Product Requirements Document (`PRD.md`)
- Location cache invalidation on privacy changes
- Redirect after login functionality
- Improved route prefetching (preloads React components)
- Optimized location client-side filtering (batch processing, reduced limit)

### Changed
- Location service: Improved client-side filtering performance
  - Reduced limit from 500 to 200 profiles
  - Added batch processing with yield points
  - Filter by `location_visible` in query instead of client-side
- Route prefetching: Now actually preloads React components instead of just static assets
- ProtectedRoute: Stores redirect path in sessionStorage for reliability

### Fixed
- Location cache not invalidated when privacy settings change
- Redirect after login not working (now checks both location.state and sessionStorage)
- Duplicate validation logic in JoinDuo component (extracted to shared function)

---

## [1.0.0] - 2024-12-19

### Added
- Initial release
- Authentication (sign up, sign in, sign out)
- User profiles with photo upload
- Duo creation and management
- Swipe-based matching system
- Real-time chat with read receipts
- Location services with privacy controls
- Protected routes
- Code splitting and lazy loading
- Keyboard shortcuts
- Route transitions

---

## Version History

- **1.0.0** (2024-12-19): Initial release

---

**Note:** This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

