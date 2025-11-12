import Foundation

/// Message model for group chat
struct Message: Identifiable, Codable, Equatable {
  let id: UUID
  let matchID: UUID
  let senderID: UUID
  let content: String
  let createdAt: Date

  // Optional: populated when fetched with relations
  var sender: User?

  enum CodingKeys: String, CodingKey {
    case id
    case matchID = "match_id"
    case senderID = "sender_id"
    case content
    case createdAt = "created_at"
  }

  init(
    id: UUID = UUID(),
    matchID: UUID,
    senderID: UUID,
    content: String,
    createdAt: Date = Date(),
    sender: User? = nil
  ) {
    self.id = id
    self.matchID = matchID
    self.senderID = senderID
    self.content = content
    self.createdAt = createdAt
    self.sender = sender
  }
}

