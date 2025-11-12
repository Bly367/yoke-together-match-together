import Foundation
import Supabase

/// Supabase client wrapper
struct SupabaseClientWrapper {
  static let shared = SupabaseClientWrapper()

  let client: SupabaseClient

  private init() {
    let url = URL(string: Configuration.supabaseURL)!
    let key = Configuration.supabaseAnonKey
    
    // Initialize Supabase client
    // Note: Update this based on actual Supabase Swift SDK version
    // Common patterns:
    // - SupabaseClient(supabaseURL: url, supabaseKey: key)
    // - SupabaseClient(configuration: config)
    self.client = SupabaseClient(
      supabaseURL: url,
      supabaseKey: key
    )
  }
}

/// Configuration helper for environment variables
enum Configuration {
  /// Supabase project URL
  static var supabaseURL: String {
    // Try environment variable first
    if let url = ProcessInfo.processInfo.environment["SUPABASE_URL"] {
      return url
    }
    
    // Try Info.plist
    if let url = Bundle.main.infoDictionary?["SUPABASE_URL"] as? String {
      return url
    }
    
    // Fatal error if not found (will help catch configuration issues early)
    fatalError("SUPABASE_URL not found. Please set it in environment variables or Info.plist")
  }

  /// Supabase anonymous key
  static var supabaseAnonKey: String {
    // Try environment variable first
    if let key = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] {
      return key
    }
    
    // Try Info.plist
    if let key = Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String {
      return key
    }
    
    // Fatal error if not found
    fatalError("SUPABASE_ANON_KEY not found. Please set it in environment variables or Info.plist")
  }
}
