// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "Yoke",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "Yoke",
            targets: ["Yoke"]),
    ],
    dependencies: [
        // Supabase Swift SDK
        .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0"),
    ],
    targets: [
        .target(
            name: "Yoke",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
            ]),
        .testTarget(
            name: "YokeTests",
            dependencies: ["Yoke"]),
    ]
)

