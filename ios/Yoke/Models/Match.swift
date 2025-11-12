import Foundation

/// Match model representing a mutual like between two duos
struct Match: Identifiable, Codable, Equatable {
  let id: UUID
  let duo1ID: UUID
  let duo2ID: UUID
  let matchedAt: Date
  var isActive: Bool

  // Optional: populated when fetched with relations
  var duo1: Duo?
  var duo2: Duo?

  enum CodingKeys: String, CodingKey {
    case id
    case duo1ID = "duo1_id"
    case duo2ID = "duo2_id"
    case matchedAt = "matched_at"
    case isActive = "is_active"
  }

  init(
    id: UUID = UUID(),
    duo1ID: UUID,
    duo2ID: UUID,
    matchedAt: Date = Date(),
    isActive: Bool = true,
    duo1: Duo? = nil,
    duo2: Duo? = nil
  ) {
    self.id = id
    self.duo1ID = duo1ID
    self.duo2ID = duo2ID
    self.matchedAt = matchedAt
    self.isActive = isActive
    self.duo1 = duo1
    self.duo2 = duo2
  }

  /// Get the other duo's ID
  func otherDuoID(than duoID: UUID) -> UUID? {
    if duo1ID == duoID {
      return duo2ID
    } else if duo2ID == duoID {
      return duo1ID
    }
    return nil
  }
}

/// Swipe action model
struct Swipe: Identifiable, Codable, Equatable {
  let id: UUID
  let swiperDuoID: UUID
  let swipedDuoID: UUID
  let action: SwipeAction
  let createdAt: Date

  enum CodingKeys: String, CodingKey {
    case id
    case swiperDuoID = "swiper_duo_id"
    case swipedDuoID = "swiped_duo_id"
    case action
    case createdAt = "created_at"
  }

  init(
    id: UUID = UUID(),
    swiperDuoID: UUID,
    swipedDuoID: UUID,
    action: SwipeAction,
    createdAt: Date = Date()
  ) {
    self.id = id
    self.swiperDuoID = swiperDuoID
    self.swipedDuoID = swipedDuoID
    self.action = action
    self.createdAt = createdAt
  }
}

/// Swipe action type
enum SwipeAction: String, Codable {
  case like
  case pass
}

