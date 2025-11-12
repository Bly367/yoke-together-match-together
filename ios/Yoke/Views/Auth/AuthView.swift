import SwiftUI

struct AuthView: View {
  @StateObject private var viewModel: AuthViewModel
  @State private var isSignUp: Bool = false

  init(viewModel: AuthViewModel) {
    _viewModel = StateObject(wrappedValue: viewModel)
  }

  var body: some View {
    VStack(spacing: Theme.Spacing.xl) {
      // Logo/Header
      VStack(spacing: Theme.Spacing.md) {
        Text("🥚 Yoke")
          .font(.system(size: 48, weight: .bold))
        Text("Meet together. Match together.")
          .font(.title2)
          .foregroundColor(.secondary)
      }
      .padding(.top, Theme.Spacing.xl * 2)

      // Form
      VStack(spacing: Theme.Spacing.lg) {
        if isSignUp {
          TextField("Name", text: $viewModel.name)
            .textFieldStyle(.roundedBorder)
            .autocapitalization(.words)
        }

        TextField("Email", text: $viewModel.email)
          .textFieldStyle(.roundedBorder)
          .keyboardType(.emailAddress)
          .autocapitalization(.none)
          .autocorrectionDisabled()

        SecureField("Password", text: $viewModel.password)
          .textFieldStyle(.roundedBorder)

        if let errorMessage = viewModel.errorMessage {
          Text(errorMessage)
            .foregroundColor(.red)
            .font(.caption)
        }

        PrimaryButton(title: isSignUp ? "Sign Up" : "Sign In") {
          Task {
            if isSignUp {
              await viewModel.signUp()
            } else {
              await viewModel.signIn()
            }
          }
        }
        .disabled(viewModel.isLoading)

        Button(action: { isSignUp.toggle() }) {
          Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
            .font(.caption)
            .foregroundColor(.blue)
        }
      }
      .padding(.horizontal, Theme.Spacing.xl)

      Spacer()
    }
    .overlay {
      if viewModel.isLoading {
        ProgressView()
          .scaleEffect(1.5)
      }
    }
  }
}

