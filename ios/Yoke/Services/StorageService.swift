import Foundation
import Supabase

/// Storage service implementation
final class SupabaseStorageService: StorageServiceProtocol {
  private let client: SupabaseClient
  private let bucketName = "photos"

  init(client: SupabaseClient = SupabaseClientWrapper.shared.client) {
    self.client = client
  }

  /// Upload a photo
  func uploadPhoto(data: Data, userId: UUID, filename: String) async throws -> String {
    let path = "\(userId.uuidString)/\(filename)"

    try await client.storage
      .from(bucketName)
      .upload(path: path, file: data, options: FileOptions(contentType: "image/jpeg"))

    return path
  }

  /// Delete a photo
  func deletePhoto(path: String) async throws {
    try await client.storage
      .from(bucketName)
      .remove(paths: [path])
  }

  /// Get photo URL
  func getPhotoURL(path: String) -> URL? {
    try? client.storage
      .from(bucketName)
      .createSignedURL(path: path, expiresIn: 3600)
      .get()
  }
}

/// Storage errors
enum StorageError: LocalizedError {
  case uploadFailed
  case deleteFailed
  case invalidPath

  var errorDescription: String? {
    switch self {
    case .uploadFailed:
      return "Failed to upload photo. Please try again."
    case .deleteFailed:
      return "Failed to delete photo. Please try again."
    case .invalidPath:
      return "Invalid photo path."
    }
  }
}

