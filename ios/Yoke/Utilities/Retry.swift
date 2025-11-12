import Foundation

enum RetryPolicy {
  static func withBackoff<T>(
    maxAttempts: Int = 3,
    baseDelay: TimeInterval = 0.25,
    _ op: @escaping () async throws -> T
  ) async throws -> T {
    var attempt = 0
    var lastError: Error?
    while attempt < maxAttempts {
      do { return try await op() } catch {
        lastError = error
        attempt += 1
        if attempt < maxAttempts {
          let delay = baseDelay * pow(2, Double(attempt - 1))
          try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        }
      }
    }
    throw lastError ?? URLError(.unknown)
  }
}

