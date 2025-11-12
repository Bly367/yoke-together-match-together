import Foundation

/// Protocol for authentication service operations
protocol AuthServiceProtocol {
  /// Sign up with email and password
  func signUp(email: String, password: String, name: String) async throws -> User

  /// Sign in with email and password
  func signIn(email: String, password: String) async throws -> User

  /// Sign out current user
  func signOut() async throws

  /// Get current user
  func getCurrentUser() async throws -> User?

  /// Update user profile
  func updateProfile(_ user: User) async throws -> User
}

/// Protocol for matching service operations
protocol MatchingServiceProtocol {
  /// Create a duo
  func createDuo(member1ID: UUID, member2ID: UUID, tagline: String?, bio: String?, interests: [String]) async throws -> Duo

  /// Get a duo by ID
  func getDuo(id: UUID) async throws -> Duo

  /// Get duos for matching (excluding swiped ones)
  func getAvailableDuos(for duoID: UUID, limit: Int) async throws -> [Duo]

  /// Swipe on a duo (like or pass)
  func swipe(swiperDuoID: UUID, swipedDuoID: UUID, action: SwipeAction) async throws -> Swipe

  /// Get matches for a duo
  func getMatches(for duoID: UUID) async throws -> [Match]

  /// Get a match by ID
  func getMatch(id: UUID) async throws -> Match
}

/// Protocol for chat service operations
protocol ChatServiceProtocol {
  /// Get messages for a match
  func getMessages(for matchID: UUID, limit: Int) async throws -> [Message]

  /// Send a message
  func sendMessage(matchID: UUID, senderID: UUID, content: String) async throws -> Message

  /// Subscribe to new messages for a match
  func subscribeToMessages(matchID: UUID, onNewMessage: @escaping (Message) -> Void) async throws -> AsyncStream<Message>
}

/// Protocol for storage service operations
protocol StorageServiceProtocol {
  /// Upload a photo
  func uploadPhoto(data: Data, userId: UUID, filename: String) async throws -> String

  /// Delete a photo
  func deletePhoto(path: String) async throws

  /// Get photo URL
  func getPhotoURL(path: String) -> URL?
}

/// Container for all service dependencies using protocol-based dependency injection
struct Services {
  let auth: AuthServiceProtocol
  let matching: MatchingServiceProtocol
  let chat: ChatServiceProtocol
  let storage: StorageServiceProtocol
}

