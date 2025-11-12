import SwiftUI

@main
struct YokeApp: App {
  @StateObject private var authViewModel: AuthViewModel
  @State private var services: Services

  init() {
    // Initialize services
    let servicesFactory = ServicesFactory.create()
    services = servicesFactory

    // Initialize auth view model
    let authVM = AuthViewModel(authService: servicesFactory.auth)
    _authViewModel = StateObject(wrappedValue: authVM)
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(authViewModel)
        .environment(\.services, services)
    }
  }
}

/// Content view that handles navigation based on auth state
struct ContentView: View {
  @EnvironmentObject var authViewModel: AuthViewModel

  var body: some View {
    Group {
      if authViewModel.isAuthenticated {
        MainTabView()
      } else {
        AuthView(viewModel: authViewModel)
      }
    }
    .onAppear {
      Task {
        await authViewModel.checkAuthStatus()
      }
    }
  }
}

/// Main tab view for authenticated users
struct MainTabView: View {
  @EnvironmentObject var authViewModel: AuthViewModel
  @Environment(\.services) var services

  var body: some View {
    TabView {
      if let currentUser = authViewModel.currentUser,
         let currentDuoID = getCurrentDuoID(for: currentUser.id) {
        MatchmakingView(
          viewModel: MatchmakingViewModel(
            matchingService: services.matching,
            currentDuoID: currentDuoID
          )
        )
        .tabItem {
          Label("Discover", systemImage: "heart.fill")
        }

        MatchesView(
          matchingService: services.matching,
          currentDuoID: currentDuoID,
          currentUserID: currentUser.id
        )
        .tabItem {
          Label("Matches", systemImage: "message.fill")
        }

        ProfileView(viewModel: authViewModel)
          .tabItem {
            Label("Profile", systemImage: "person.fill")
          }
      } else {
        Text("Please create a duo first")
          .tabItem {
            Label("Discover", systemImage: "heart.fill")
          }
      }
    }
  }

  private func getCurrentDuoID(for userID: UUID) -> UUID? {
    // TODO: Fetch user's duo from database
    // For now, return nil (user needs to create a duo first)
    // In production, query duos table for duos where member1_id or member2_id == userID
    return nil
  }
}

/// Environment key for services
private struct ServicesKey: EnvironmentKey {
  static var defaultValue: Services {
    ServicesFactory.create()
  }
}

/// Profile view
struct ProfileView: View {
  @ObservedObject var viewModel: AuthViewModel

  var body: some View {
    NavigationView {
      Form {
        if let user = viewModel.currentUser {
          Section("Profile") {
            Text("Name: \(user.name)")
            Text("Email: \(user.email)")
            if let age = user.age {
              Text("Age: \(age)")
            }
            if let bio = user.bio {
              Text("Bio: \(bio)")
            }
          }

          Section("Actions") {
            Button("Sign Out") {
              Task {
                await viewModel.signOut()
              }
            }
            .foregroundColor(.red)
          }
        }
      }
      .navigationTitle("Profile")
    }
  }
}

/// Environment key for services
private struct ServicesKey: EnvironmentKey {
  static let defaultValue = ServicesFactory.create()
}

extension EnvironmentValues {
  var services: Services {
    get { self[ServicesKey.self] }
    set { self[ServicesKey.self] = newValue }
  }
}

