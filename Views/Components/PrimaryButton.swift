import SwiftUI

struct PrimaryButton: View {
  let title: String
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      Text(title)
        .fontWeight(.semibold)
        .padding(.vertical, Theme.Spacing.md)
        .padding(.horizontal, Theme.Spacing.xl)
        .background(Theme.Color.yolkYellow)
        .foregroundColor(.black)
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.lg, style: .continuous))
        .shadow(radius: 1, y: 1)
    }
    .buttonStyle(.plain)
  }
}

