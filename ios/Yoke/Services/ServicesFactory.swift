import Foundation

/// Factory for creating service instances
enum ServicesFactory {
  /// Create services with default implementations
  static func create() -> Services {
    // All services use the shared Supabase client (via default parameter)
    let auth = SupabaseAuthService()
    let matching = SupabaseMatchingService()
    let chat = SupabaseChatService()
    let storage = SupabaseStorageService()

    return Services(
      auth: auth,
      matching: matching,
      chat: chat,
      storage: storage
    )
  }
}
