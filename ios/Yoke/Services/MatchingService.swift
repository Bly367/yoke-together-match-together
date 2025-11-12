import Foundation
import Supabase

/// Matching service implementation
final class SupabaseMatchingService: MatchingServiceProtocol {
  private let client: SupabaseClient

  init(client: SupabaseClient = SupabaseClientWrapper.shared.client) {
    self.client = client
  }

  /// Create a duo
  func createDuo(member1ID: UUID, member2ID: UUID, tagline: String?, bio: String?, interests: [String]) async throws -> Duo {
    let duoData: [String: Any] = [
      "member1_id": member1ID.uuidString,
      "member2_id": member2ID.uuidString,
      "tagline": tagline as Any,
      "bio": bio as Any,
      "interests": interests
    ]

    let response: [Duo] = try await client
      .from("duos")
      .insert(duoData)
      .select()
      .execute()
      .value

    guard let duo = response.first else {
      throw MatchingError.creationFailed
    }

    return duo
  }

  /// Get a duo by ID
  func getDuo(id: UUID) async throws -> Duo {
    let response: [Duo] = try await client
      .from("duos")
      .select()
      .eq("id", value: id.uuidString)
      .single()
      .execute()
      .value

    return response
  }

  /// Get duos for matching (excluding swiped ones)
  func getAvailableDuos(for duoID: UUID, limit: Int = 20) async throws -> [Duo] {
    // Get all swiped duo IDs
    let swipesResponse: [Swipe] = try await client
      .from("swipes")
      .select("swiped_duo_id")
      .eq("swiper_duo_id", value: duoID.uuidString)
      .execute()
      .value

    let swipedDuoIDs = swipesResponse.map { $0.swipedDuoID.uuidString }

    // Get available duos (active, not swiped, not self)
    var query = client
      .from("duos")
      .select()
      .eq("is_active", value: true)
      .neq("id", value: duoID.uuidString)
      .limit(limit)

    if !swipedDuoIDs.isEmpty {
      query = query.not("id", in: swipedDuoIDs)
    }

    let response: [Duo] = try await query
      .execute()
      .value

    return response
  }

  /// Swipe on a duo (like or pass)
  func swipe(swiperDuoID: UUID, swipedDuoID: UUID, action: SwipeAction) async throws -> Swipe {
    let swipeData: [String: Any] = [
      "swiper_duo_id": swiperDuoID.uuidString,
      "swiped_duo_id": swipedDuoID.uuidString,
      "action": action.rawValue
    ]

    let response: [Swipe] = try await client
      .from("swipes")
      .insert(swipeData)
      .select()
      .execute()
      .value

    guard let swipe = response.first else {
      throw MatchingError.swipeFailed
    }

    return swipe
  }

  /// Get matches for a duo
  func getMatches(for duoID: UUID) async throws -> [Match] {
    let response: [Match] = try await client
      .from("matches")
      .select()
      .or("duo1_id.eq.\(duoID.uuidString),duo2_id.eq.\(duoID.uuidString)")
      .eq("is_active", value: true)
      .order("matched_at", ascending: false)
      .execute()
      .value

    return response
  }

  /// Get a match by ID
  func getMatch(id: UUID) async throws -> Match {
    let response: [Match] = try await client
      .from("matches")
      .select()
      .eq("id", value: id.uuidString)
      .single()
      .execute()
      .value

    return response
  }
}

/// Matching errors
enum MatchingError: LocalizedError {
  case creationFailed
  case swipeFailed
  case duoNotFound
  case matchNotFound

  var errorDescription: String? {
    switch self {
    case .creationFailed:
      return "Failed to create duo. Please try again."
    case .swipeFailed:
      return "Failed to process swipe. Please try again."
    case .duoNotFound:
      return "Duo not found."
    case .matchNotFound:
      return "Match not found."
    }
  }
}

