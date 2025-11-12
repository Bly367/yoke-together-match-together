import Foundation

/// Protocol for matching service operations
protocol MatchingServiceProtocol { 
  // TODO: Add matching service signatures
}

/// Protocol for chat service operations
protocol ChatServiceProtocol { 
  // TODO: Add chat service signatures
}

/// Protocol for authentication service operations
protocol AuthServiceProtocol { 
  // TODO: Add auth service signatures
}

/// Protocol for storage service operations
protocol StorageServiceProtocol { 
  // TODO: Add storage service signatures
}

/// Container for all service dependencies using protocol-based dependency injection
struct Services {
  let auth: AuthServiceProtocol
  let matching: MatchingServiceProtocol
  let chat: ChatServiceProtocol
  let storage: StorageServiceProtocol
}

