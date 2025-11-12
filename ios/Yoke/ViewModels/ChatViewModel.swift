import Foundation
import SwiftUI

/// Chat view model
@MainActor
final class ChatViewModel: ObservableObject {
  @Published var messages: [Message] = []
  @Published var newMessage: String = ""
  @Published var isLoading: Bool = false
  @Published var errorMessage: String?
  @Published var isSending: Bool = false

  private let chatService: ChatServiceProtocol
  let matchID: UUID
  let currentUserID: UUID
  private var messageTask: Task<Void, Never>?

  init(chatService: ChatServiceProtocol, matchID: UUID, currentUserID: UUID) {
    self.chatService = chatService
    self.matchID = matchID
    self.currentUserID = currentUserID
    Task {
      await loadMessages()
      await subscribeToMessages()
    }
  }

  deinit {
    messageTask?.cancel()
  }

  /// Load messages for the match
  func loadMessages() async {
    isLoading = true
    errorMessage = nil

    do {
      messages = try await chatService.getMessages(for: matchID)
    } catch {
      errorMessage = error.localizedDescription
    }

    isLoading = false
  }

  /// Send a message
  func sendMessage() async {
    guard !newMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return
    }

    let content = newMessage
    newMessage = ""
    isSending = true
    errorMessage = nil

    do {
      let message = try await chatService.sendMessage(
        matchID: matchID,
        senderID: currentUserID,
        content: content
      )
      messages.append(message)
    } catch {
      errorMessage = error.localizedDescription
      newMessage = content // Restore message on error
    }

    isSending = false
  }

  /// Subscribe to new messages
  private func subscribeToMessages() async {
    messageTask?.cancel()

    messageTask = Task {
      do {
        let stream = try await chatService.subscribeToMessages(matchID: matchID) { [weak self] message in
          Task { @MainActor in
            self?.messages.append(message)
          }
        }

        for try await message in stream {
          await MainActor.run {
            if !messages.contains(where: { $0.id == message.id }) {
              messages.append(message)
            }
          }
        }
      } catch {
        await MainActor.run {
          errorMessage = error.localizedDescription
        }
      }
    }
  }
}

