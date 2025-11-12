import SwiftUI

struct MatchesView: View {
  @State private var matches: [Match] = []
  @State private var isLoading: Bool = false
  @State private var errorMessage: String?

  let matchingService: MatchingServiceProtocol
  let currentDuoID: UUID
  let currentUserID: UUID

  var body: some View {
    NavigationView {
      List {
        ForEach(matches) { match in
          NavigationLink(destination: ChatView(
            viewModel: ChatViewModel(
              chatService: ServicesFactory.create().chat,
              matchID: match.id,
              currentUserID: currentUserID
            ),
            match: match
          )) {
            MatchRow(match: match)
          }
        }
      }
      .navigationTitle("Matches")
      .onAppear {
        Task {
          await loadMatches()
        }
      }
      .overlay {
        if isLoading {
          ProgressView()
            .scaleEffect(1.5)
        }
      }
    }
  }

  private func loadMatches() async {
    isLoading = true
    errorMessage = nil

    do {
      matches = try await matchingService.getMatches(for: currentDuoID)
    } catch {
      errorMessage = error.localizedDescription
    }

    isLoading = false
  }
}

/// Match row component
struct MatchRow: View {
  let match: Match

  var body: some View {
    HStack(spacing: Theme.Spacing.md) {
      // Duo photos
      HStack(spacing: -Theme.Spacing.sm) {
        if let duo = match.duo1 {
          MemberPhoto(user: duo.member1)
            .frame(width: 40, height: 40)
          MemberPhoto(user: duo.member2)
            .frame(width: 40, height: 40)
        }
      }

      // Duo info
      VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
        if let duo = match.duo1 {
          Text(duo.tagline ?? "New Match")
            .font(.headline)
          Text("Matched \(match.matchedAt, style: .relative)")
            .font(.caption)
            .foregroundColor(.secondary)
        }
      }

      Spacer()
    }
    .padding(.vertical, Theme.Spacing.sm)
  }
}

