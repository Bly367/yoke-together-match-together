import SwiftUI

struct ChatView: View {
  @StateObject private var viewModel: ChatViewModel
  let match: Match

  init(viewModel: ChatViewModel, match: Match) {
    _viewModel = StateObject(wrappedValue: viewModel)
    self.match = match
  }

  var body: some View {
    VStack(spacing: 0) {
      // Messages list
      ScrollViewReader { proxy in
        ScrollView {
          LazyVStack(spacing: Theme.Spacing.md) {
            ForEach(viewModel.messages) { message in
              MessageBubble(message: message, isCurrentUser: message.senderID == viewModel.currentUserID)
                .id(message.id)
            }
          }
          .padding()
        }
        .onChange(of: viewModel.messages.count) { _ in
          if let lastMessage = viewModel.messages.last {
            withAnimation {
              proxy.scrollTo(lastMessage.id, anchor: .bottom)
            }
          }
        }
      }

      // Message input
      HStack(spacing: Theme.Spacing.md) {
        TextField("Type a message...", text: $viewModel.newMessage)
          .textFieldStyle(.roundedBorder)
          .onSubmit {
            Task {
              await viewModel.sendMessage()
            }
          }

        Button(action: {
          Task {
            await viewModel.sendMessage()
          }
        }) {
          Image(systemName: "arrow.up.circle.fill")
            .font(.title2)
            .foregroundColor(Theme.Color.yolkYellow)
        }
        .disabled(viewModel.newMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isSending)
      }
      .padding()
      .background(Color.white)
    }
    .navigationTitle("Chat")
    .navigationBarTitleDisplayMode(.inline)
    .overlay {
      if viewModel.isLoading {
        ProgressView()
          .scaleEffect(1.5)
      }
    }
  }
}

/// Message bubble component
struct MessageBubble: View {
  let message: Message
  let isCurrentUser: Bool

  var body: some View {
    HStack {
      if isCurrentUser {
        Spacer()
      }

      VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: Theme.Spacing.sm) {
        Text(message.content)
          .padding(.horizontal, Theme.Spacing.md)
          .padding(.vertical, Theme.Spacing.sm)
          .background(isCurrentUser ? Theme.Color.yolkYellow : Theme.Color.gray.opacity(0.2))
          .foregroundColor(isCurrentUser ? .black : .primary)
          .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.lg))

        Text(message.createdAt, style: .time)
          .font(.caption2)
          .foregroundColor(.secondary)
      }

      if !isCurrentUser {
        Spacer()
      }
    }
  }
}

