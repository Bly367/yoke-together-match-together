import Foundation
import SwiftUI

/// Authentication view model
@MainActor
final class AuthViewModel: ObservableObject {
  @Published var email: String = ""
  @Published var password: String = ""
  @Published var name: String = ""
  @Published var isLoading: Bool = false
  @Published var errorMessage: String?
  @Published var currentUser: User?
  @Published var isAuthenticated: Bool = false

  private let authService: AuthServiceProtocol

  init(authService: AuthServiceProtocol) {
    self.authService = authService
    Task {
      await checkAuthStatus()
    }
  }

  /// Check if user is authenticated
  func checkAuthStatus() async {
    do {
      currentUser = try await authService.getCurrentUser()
      isAuthenticated = currentUser != nil
    } catch {
      isAuthenticated = false
    }
  }

  /// Sign up with email and password
  func signUp() async {
    guard !email.isEmpty, !password.isEmpty, !name.isEmpty else {
      errorMessage = "Please fill in all fields"
      return
    }

    isLoading = true
    errorMessage = nil

    do {
      currentUser = try await authService.signUp(email: email, password: password, name: name)
      isAuthenticated = true
      // Clear form
      email = ""
      password = ""
      name = ""
    } catch {
      errorMessage = error.localizedDescription
      isAuthenticated = false
    }

    isLoading = false
  }

  /// Sign in with email and password
  func signIn() async {
    guard !email.isEmpty, !password.isEmpty else {
      errorMessage = "Please fill in all fields"
      return
    }

    isLoading = true
    errorMessage = nil

    do {
      currentUser = try await authService.signIn(email: email, password: password)
      isAuthenticated = true
      // Clear form
      email = ""
      password = ""
    } catch {
      errorMessage = error.localizedDescription
      isAuthenticated = false
    }

    isLoading = false
  }

  /// Sign out
  func signOut() async {
    isLoading = true

    do {
      try await authService.signOut()
      currentUser = nil
      isAuthenticated = false
    } catch {
      errorMessage = error.localizedDescription
    }

    isLoading = false
  }

  /// Update user profile
  func updateProfile(_ user: User) async {
    isLoading = true
    errorMessage = nil

    do {
      currentUser = try await authService.updateProfile(user)
    } catch {
      errorMessage = error.localizedDescription
    }

    isLoading = false
  }
}

