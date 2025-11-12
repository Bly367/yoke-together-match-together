import Foundation

/// Duo model representing a pair of users
struct Duo: Identifiable, Codable, Equatable {
  let id: UUID
  let member1ID: UUID
  let member2ID: UUID
  var name: String?
  var tagline: String?
  var bio: String?
  var photoURL: String?
  var interests: [String]
  var isActive: Bool
  let createdAt: Date
  var updatedAt: Date

  // Optional: populated when fetched with relations
  var member1: User?
  var member2: User?

  enum CodingKeys: String, CodingKey {
    case id
    case member1ID = "member1_id"
    case member2ID = "member2_id"
    case name
    case tagline
    case bio
    case photoURL = "photo_url"
    case interests
    case isActive = "is_active"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  init(
    id: UUID = UUID(),
    member1ID: UUID,
    member2ID: UUID,
    name: String? = nil,
    tagline: String? = nil,
    bio: String? = nil,
    photoURL: String? = nil,
    interests: [String] = [],
    isActive: Bool = true,
    createdAt: Date = Date(),
    updatedAt: Date = Date(),
    member1: User? = nil,
    member2: User? = nil
  ) {
    self.id = id
    self.member1ID = member1ID
    self.member2ID = member2ID
    self.name = name
    self.tagline = tagline
    self.bio = bio
    self.photoURL = photoURL
    self.interests = interests
    self.isActive = isActive
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.member1 = member1
    self.member2 = member2
  }

  /// Check if a user is a member of this duo
  func isMember(userID: UUID) -> Bool {
    member1ID == userID || member2ID == userID
  }

  /// Get the other member's ID
  func otherMemberID(than userID: UUID) -> UUID? {
    if member1ID == userID {
      return member2ID
    } else if member2ID == userID {
      return member1ID
    }
    return nil
  }
}

