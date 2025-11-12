import Foundation
import SwiftUI

/// Matchmaking view model
@MainActor
final class MatchmakingViewModel: ObservableObject {
  @Published var availableDuos: [Duo] = []
  @Published var currentDuo: Duo?
  @Published var isLoading: Bool = false
  @Published var errorMessage: String?
  @Published var isMatch: Bool = false
  @Published var matchedDuo: Duo?

  private let matchingService: MatchingServiceProtocol
  private let currentDuoID: UUID

  init(matchingService: MatchingServiceProtocol, currentDuoID: UUID) {
    self.matchingService = matchingService
    self.currentDuoID = currentDuoID
    Task {
      await loadAvailableDuos()
    }
  }

  /// Load available duos for matching
  func loadAvailableDuos() async {
    isLoading = true
    errorMessage = nil

    do {
      availableDuos = try await matchingService.getAvailableDuos(for: currentDuoID)
      currentDuo = availableDuos.first
    } catch {
      errorMessage = error.localizedDescription
    }

    isLoading = false
  }

  /// Swipe on current duo
  func swipe(action: SwipeAction) async {
    guard let duo = currentDuo else { return }

    isLoading = true
    errorMessage = nil

    do {
      _ = try await matchingService.swipe(
        swiperDuoID: currentDuoID,
        swipedDuoID: duo.id,
        action: action
      )

      // If it's a like, check if it's a match
      if action == .like {
        // Check for match (the backend will create it automatically)
        // For now, we'll just move to next duo
        // In production, you might want to check matches immediately
      }

      // Move to next duo
      moveToNextDuo()
    } catch {
      errorMessage = error.localizedDescription
    }

    isLoading = false
  }

  /// Move to next available duo
  private func moveToNextDuo() {
    if let index = availableDuos.firstIndex(where: { $0.id == currentDuo?.id }) {
      let nextIndex = index + 1
      if nextIndex < availableDuos.count {
        currentDuo = availableDuos[nextIndex]
      } else {
        // No more duos, reload
        Task {
          await loadAvailableDuos()
        }
      }
    }
  }

  /// Pass on current duo
  func pass() async {
    await swipe(action: .pass)
  }

  /// Like current duo
  func like() async {
    await swipe(action: .like)
  }
}

