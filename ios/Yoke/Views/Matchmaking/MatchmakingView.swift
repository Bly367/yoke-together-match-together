import SwiftUI

struct MatchmakingView: View {
  @StateObject private var viewModel: MatchmakingViewModel

  init(viewModel: MatchmakingViewModel) {
    _viewModel = StateObject(wrappedValue: viewModel)
  }

  var body: some View {
    NavigationView {
      VStack(spacing: Theme.Spacing.lg) {
        if viewModel.isLoading && viewModel.currentDuo == nil {
          ProgressView()
            .scaleEffect(1.5)
        } else if let duo = viewModel.currentDuo {
          DuoCard(duo: duo)

          // Action buttons
          HStack(spacing: Theme.Spacing.xl) {
            // Pass button
            Button(action: {
              Task {
                await viewModel.pass()
              }
            }) {
              Image(systemName: "xmark")
                .font(.title2)
                .foregroundColor(.red)
                .frame(width: 60, height: 60)
                .background(Color.white)
                .clipShape(Circle())
                .shadow(radius: 2)
            }
            .disabled(viewModel.isLoading)

            // Like button
            Button(action: {
              Task {
                await viewModel.like()
              }
            }) {
              Image(systemName: "heart.fill")
                .font(.title2)
                .foregroundColor(.white)
                .frame(width: 70, height: 70)
                .background(Theme.Color.yolkYellow)
                .clipShape(Circle())
                .shadow(radius: 2)
            }
            .disabled(viewModel.isLoading)
          }
          .padding(.top, Theme.Spacing.xl)
        } else {
          VStack(spacing: Theme.Spacing.md) {
            Text("No more duos")
              .font(.title2)
              .foregroundColor(.secondary)
            Text("Check back later for more matches!")
              .font(.caption)
              .foregroundColor(.secondary)
          }
        }

        if let errorMessage = viewModel.errorMessage {
          Text(errorMessage)
            .foregroundColor(.red)
            .font(.caption)
            .padding()
        }
      }
      .padding()
      .navigationTitle("Discover Duos")
      .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
          NavigationLink(destination: MatchesView()) {
            Image(systemName: "message.fill")
          }
        }
      }
    }
  }
}

/// Duo card component
struct DuoCard: View {
  let duo: Duo

  var body: some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.md) {
      // Member photos
      HStack(spacing: Theme.Spacing.lg) {
        MemberPhoto(user: duo.member1)
        MemberPhoto(user: duo.member2)
      }
      .frame(maxWidth: .infinity)

      // Info
      VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
        if let tagline = duo.tagline {
          Text(tagline)
            .font(.title2)
            .fontWeight(.bold)
        }

        if let bio = duo.bio {
          Text(bio)
            .font(.body)
            .foregroundColor(.secondary)
        }

        if !duo.interests.isEmpty {
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Spacing.sm) {
              ForEach(duo.interests, id: \.self) { interest in
                Text(interest)
                  .font(.caption)
                  .padding(.horizontal, Theme.Spacing.md)
                  .padding(.vertical, Theme.Spacing.sm)
                  .background(Theme.Color.gray.opacity(0.3))
                  .clipShape(Capsule())
              }
            }
          }
        }
      }
      .padding(.horizontal, Theme.Spacing.lg)
    }
    .padding(.vertical, Theme.Spacing.lg)
    .background(Color.white)
    .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.xl))
    .shadow(radius: 4)
  }
}

/// Member photo component
struct MemberPhoto: View {
  let user: User?

  var body: some View {
    VStack(spacing: Theme.Spacing.sm) {
      if let photoURL = user?.photoURL, let url = URL(string: photoURL) {
        AsyncImage(url: url) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          Circle()
            .fill(Theme.Color.gray.opacity(0.3))
        }
        .frame(width: 100, height: 100)
        .clipShape(Circle())
      } else {
        Circle()
          .fill(Theme.Color.gray.opacity(0.3))
          .frame(width: 100, height: 100)
          .overlay {
            Image(systemName: "person.fill")
              .font(.title)
              .foregroundColor(.secondary)
          }
      }

      if let user = user {
        Text(user.name)
          .font(.headline)
        if let age = user.age {
          Text("\(age)")
            .font(.caption)
            .foregroundColor(.secondary)
        }
      }
    }
  }
}

