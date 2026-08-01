// WebCodecs API 型定義（標準 lib に未含のため）
interface MediaStreamTrackProcessor extends EventTarget {
  readonly readable: ReadableStream<VideoFrame>;
  readonly writable: WritableStream<MediaStreamTrack>;
}

interface VideoFrame {
  readonly timestamp: number;
  readonly duration?: number;
  readonly codedWidth: number;
  readonly codedHeight: number;
  readonly visibleRect: DOMRectInit;
  readonly format: VideoPixelFormat;
  // 必要に応じてメソッド追加
}

type VideoPixelFormat =
  | "I420" | "I420A" | "I422" | "I444"
  | "NV12" | "RGBA" | "RGBX" | "BGRA" | "BGRX";