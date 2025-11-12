import Foundation

/// User profile model
struct User: Identifiable, Codable, Equatable {
  let id: UUID
  let email: String
  var name: String
  var age: Int?
  var bio: String?
  var photoURL: String?
  var location: Location?
  var locationUpdatedAt: Date?
  let createdAt: Date
  var updatedAt: Date

  enum CodingKeys: String, CodingKey {
    case id
    case email
    case name
    case age
    case bio
    case photoURL = "photo_url"
    case location
    case locationUpdatedAt = "location_updated_at"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  init(
    id: UUID,
    email: String,
    name: String,
    age: Int? = nil,
    bio: String? = nil,
    photoURL: String? = nil,
    location: Location? = nil,
    locationUpdatedAt: Date? = nil,
    createdAt: Date = Date(),
    updatedAt: Date = Date()
  ) {
    self.id = id
    self.email = email
    self.name = name
    self.age = age
    self.bio = bio
    self.photoURL = photoURL
    self.location = location
    self.locationUpdatedAt = locationUpdatedAt
    self.createdAt = createdAt
    self.updatedAt = updatedAt
  }
}

/// Location model for geolocation
struct Location: Codable, Equatable {
  let latitude: Double
  let longitude: Double

  init(latitude: Double, longitude: Double) {
    self.latitude = latitude
    self.longitude = longitude
  }
  
  // Decode from PostGIS point format (if needed)
  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    // PostGIS points come as strings like "POINT(longitude latitude)" or as arrays
    if let string = try? container.decode(String.self) {
      // Parse PostGIS point string
      let components = string.replacingOccurrences(of: "POINT(", with: "")
        .replacingOccurrences(of: ")", with: "")
        .split(separator: " ")
      guard components.count == 2,
            let lon = Double(components[0]),
            let lat = Double(components[1]) else {
        throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid PostGIS point format")
      }
      self.longitude = lon
      self.latitude = lat
    } else {
      // Try array format
      var container = try decoder.unkeyedContainer()
      self.longitude = try container.decode(Double.self)
      self.latitude = try container.decode(Double.self)
    }
  }
  
  func encode(to encoder: Encoder) throws {
    // Encode as PostGIS point string
    var container = encoder.singleValueContainer()
    try container.encode("POINT(\(longitude) \(latitude))")
  }
}
