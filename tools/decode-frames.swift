import Foundation
import AVFoundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// decode <video> <outDir> <maxWidth>  — walks EVERY frame in order via AVAssetReader
let a = CommandLine.arguments
guard a.count >= 4, let maxW = Int(a[3]) else { exit(2) }
let url = URL(fileURLWithPath: a[1])
let outDir = URL(fileURLWithPath: a[2], isDirectory: true)
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let asset = AVURLAsset(url: url)
let sem = DispatchSemaphore(value: 0)
var track: AVAssetTrack?
var natural = CGSize.zero
var transform = CGAffineTransform.identity
Task {
    track = try? await asset.loadTracks(withMediaType: .video).first
    if let t = track {
        natural = (try? await t.load(.naturalSize)) ?? .zero
        transform = (try? await t.load(.preferredTransform)) ?? .identity
    }
    sem.signal()
}
sem.wait()
guard let track else { exit(3) }

let rotated = natural.applying(transform)
let outW = abs(rotated.width), outH = abs(rotated.height)
let scale = min(1.0, Double(maxW) / Double(outW))
let w = Int((outW * scale).rounded()), h = Int((outH * scale).rounded())

let reader = try AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
])
output.alwaysCopiesSampleData = false
reader.add(output)
reader.startReading()

let ctxSpace = CGColorSpaceCreateDeviceRGB()
var i = 0
while let sb = output.copyNextSampleBuffer() {
    guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
    CVPixelBufferLockBaseAddress(pb, .readOnly)
    let bw = CVPixelBufferGetWidth(pb), bh = CVPixelBufferGetHeight(pb)
    let base = CVPixelBufferGetBaseAddress(pb)
    let bpr = CVPixelBufferGetBytesPerRow(pb)
    guard let src = CGContext(data: base, width: bw, height: bh, bitsPerComponent: 8,
                              bytesPerRow: bpr, space: ctxSpace,
                              bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue |
                                          CGBitmapInfo.byteOrder32Little.rawValue)?.makeImage() else {
        CVPixelBufferUnlockBaseAddress(pb, .readOnly); continue
    }
    CVPixelBufferUnlockBaseAddress(pb, .readOnly)

    guard let dstCtx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8,
                                 bytesPerRow: 0, space: ctxSpace,
                                 bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { continue }
    dstCtx.interpolationQuality = .high
    // apply the track's preferred transform into the destination box
    dstCtx.translateBy(x: CGFloat(w) / 2, y: CGFloat(h) / 2)
    let angle = atan2(transform.b, transform.a)
    dstCtx.rotate(by: -angle)
    let drawW = abs(angle) > 0.01 && abs(abs(angle) - .pi) > 0.01 ? CGFloat(h) : CGFloat(w)
    let drawH = abs(angle) > 0.01 && abs(abs(angle) - .pi) > 0.01 ? CGFloat(w) : CGFloat(h)
    dstCtx.draw(src, in: CGRect(x: -drawW / 2, y: -drawH / 2, width: drawW, height: drawH))
    guard let img = dstCtx.makeImage() else { continue }

    let dst = outDir.appendingPathComponent(String(format: "f-%04d.png", i))
    if let d = CGImageDestinationCreateWithURL(dst as CFURL, UTType.png.identifier as CFString, 1, nil) {
        CGImageDestinationAddImage(d, img, nil)
        CGImageDestinationFinalize(d)
    }
    i += 1
}
print("decoded \(i) frames at \(w)x\(h); reader status \(reader.status.rawValue)")
