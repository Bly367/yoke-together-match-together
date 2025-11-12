import Foundation
import Supabase

/// Chat service implementation
final class SupabaseChatService: ChatServiceProtocol {
  private let client: SupabaseClient

  init(client: SupabaseClient = SupabaseClientWrapper.shared.client) {
    self.client = client
  }

  /// Get messages for a match
  func getMessages(for matchID: UUID, limit: Int = 50) async throws -> [Message] {
    let response: [Message] = try await client
      .from("messages")
      .select()
      .eq("match_id", value: matchID.uuidString)
      .order("created_at", ascending: false)
      .limit(limit)
      .execute()
      .value

    return response.reversed() // Return in chronological order
  }

  /// Send a message
  func sendMessage(matchID: UUID, senderID: UUID, content: String) async throws -> Message {
    let messageData: [String: Any] = [
      "match_id": matchID.uuidString,
      "sender_id": senderID.uuidString,
      "content": content
    ]

    let response: [Message] = try await client
      .from("messages")
      .insert(messageData)
      .select()
      .execute()
      .value

    guard let message = response.first else {
      throw ChatError.sendFailed
    }

    return message
  }

  /// Subscribe to new messages for a match
  func subscribeToMessages(matchID: UUID, onNewMessage: @escaping (Message) -> Void) async throws -> AsyncStream<Message> {
    AsyncStream { continuation in
      let channel = client.realtime.channel("match:\(matchID.uuidString)")

      channel.on("postgres_changes", filter: "match_id=eq.\(matchID.uuidString)") { payload in
        if let change = payload.change,
           let data = try? JSONSerialization.data(withJSONObject: change.newRecord),
           let message = try? JSONDecoder().decode(Message.self, from: data) {
          continuation.yield(message)
        }
      }

      channel.subscribe { status, error in
        if status == .subscribed {
          // Subscription successful
        } else if let error = error {
          continuation.finish(throwing: error)
        }
      }

      continuation.onTermination = { @Sendable _ in
        channel.unsubscribe()
      }
    }
  }
}

/// Chat errors
enum ChatError: LocalizedError {
  case sendFailed
  case subscriptionFailed
  case messageNotFound

  var errorDescription: String? {
    switch self {
    case .sendFailed:
      return "Failed to send message. Please try again."
    case .subscriptionFailed:
      return "Failed to subscribe to messages."
    case .messageNotFound:
      return "Message not found."
    }
  }
}

