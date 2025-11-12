import SwiftUI

enum Theme {
  enum Color {
    static let yolkYellow = Color(red: 0xF9/255, green: 0xD6/255, blue: 0x48/255)
    static let cream      = Color(red: 0xFF/255, green: 0xFD/255, blue: 0xF7/255)
    static let peach      = Color(red: 0xFF/255, green: 0xD9/255, blue: 0xB3/255)
    static let warmBrown  = Color(red: 0xB0/255, green: 0x7B/255, blue: 0x4F/255)
    static let gray       = Color(red: 0xE5/255, green: 0xE5/255, blue: 0xE5/255)
  }
  enum Radius {
    static let lg: CGFloat = 20
    static let xl: CGFloat = 28
  }
  enum Spacing {
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
  }
}

