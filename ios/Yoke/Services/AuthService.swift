import Foundation
import Supabase

/// Authentication service implementation
final class SupabaseAuthService: AuthServiceProtocol {
  private let client: SupabaseClient

  init(client: SupabaseClient = SupabaseClientWrapper.shared.client) {
    self.client = client
  }

  /// Sign up with email and password
  func signUp(email: String, password: String, name: String) async throws -> User {
    let response = try await client.auth.signUp(
      email: email,
      password: password,
      data: ["name": name]
    )

    guard let session = response.session, let user = session.user else {
      throw AuthError.signUpFailed
    }

    // Create profile
    let profile = User(
      id: user.id,
      email: email,
      name: name
    )

    try await createProfile(profile)
    return profile
  }

  /// Sign in with email and password
  func signIn(email: String, password: String) async throws -> User {
    let response = try await client.auth.signIn(
      email: email,
      password: password
    )

    guard let session = response.session, let user = session.user else {
      throw AuthError.signInFailed
    }

    // Fetch profile
    return try await getProfile(userID: user.id)
  }

  /// Sign out current user
  func signOut() async throws {
    try await client.auth.signOut()
  }

  /// Get current user
  func getCurrentUser() async throws -> User? {
    guard let session = try await client.auth.session else {
      return nil
    }

    return try await getProfile(userID: session.user.id)
  }

  /// Update user profile
  func updateProfile(_ user: User) async throws -> User {
    let updateData: [String: Any] = [
      "name": user.name,
      "age": user.age as Any,
      "bio": user.bio as Any,
      "photo_url": user.photoURL as Any,
      "updated_at": ISO8601DateFormatter().string(from: Date())
    ]

    try await client
      .from("profiles")
      .update(updateData)
      .eq("id", value: user.id.uuidString)
      .execute()

    return try await getProfile(userID: user.id)
  }

  // MARK: - Private Helpers

  private func createProfile(_ user: User) async throws {
    let profileData: [String: Any] = [
      "id": user.id.uuidString,
      "email": user.email,
      "name": user.name,
      "age": user.age as Any,
      "bio": user.bio as Any,
      "photo_url": user.photoURL as Any
    ]

    try await client
      .from("profiles")
      .insert(profileData)
      .execute()
  }

  private func getProfile(userID: UUID) async throws -> User {
    let response: [User] = try await client
      .from("profiles")
      .select()
      .eq("id", value: userID.uuidString)
      .execute()
      .value

    guard let profile = response.first else {
      throw AuthError.profileNotFound
    }

    return profile
  }
}

/// Authentication errors
enum AuthError: LocalizedError {
  case signUpFailed
  case signInFailed
  case profileNotFound
  case invalidCredentials

  var errorDescription: String? {
    switch self {
    case .signUpFailed:
      return "Failed to create account. Please try again."
    case .signInFailed:
      return "Failed to sign in. Please check your credentials."
    case .profileNotFound:
      return "User profile not found."
    case .invalidCredentials:
      return "Invalid email or password."
    }
  }
}

