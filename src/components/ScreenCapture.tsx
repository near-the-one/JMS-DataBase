import { useState, useRef, useCallback, useEffect } from "react";
import frameWorkerUrl from "../workers/frameWorker.ts?url";

// Type definitions for MediaStreamTrackProcessor and VideoFrame (Web Codecs API)
interface MediaStreamTrackProcessor {
  readable: ReadableStream<VideoFrame>;
}

interface VideoFrame {
  displayWidth: number;
  displayHeight: number;
  timestamp: number;
  close(): void;
}

interface DebugInfo {
  captureState: string;
  fps: number;
  frameSize: string;
  workerState: string;
  lastReceived: string;
}

function detectMediaTrackProcessorSupport(): boolean {
  return typeof window !== "undefined" && "MediaStreamTrackProcessor" in window;
}

export default function ScreenCapture() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    captureState: "停止中",
    fps: 0,
    frameSize: "N/A",
    workerState: "停止中",
    lastReceived: "N/A",
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const processorRef = useRef<MediaStreamTrackProcessor | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<VideoFrame> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateFps = useCallback(() => {
    if (!mountedRef.current) return;
    const now = Date.now();
    const elapsed = now - lastFpsUpdateRef.current;
    if (elapsed >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / elapsed);
      setDebugInfo((prev) => ({ ...prev, fps }));
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }
  }, []);

  const processFrames = useCallback(async () => {
    const reader = readerRef.current;
    if (!reader) return;

    try {
      while (true) {
        const { value: frame, done } = await reader.read();
        if (done) break;
        if (!frame) continue;

        frameCountRef.current++;
        updateFps();

        // Update frame size
        setDebugInfo((prev) => ({
          ...prev,
          frameSize: `${frame.displayWidth}x${frame.displayHeight}`,
        }));

        // Transfer frame to worker
        if (workerRef.current) {
          workerRef.current.postMessage({ type: "frame", frame }, [frame]);
        }

        // Close frame to release memory
        frame.close();
      }
    } catch (err) {
      console.error("Frame processing error:", err);
      setError("フレーム取得中にエラーが発生しました");
      setDebugInfo((prev) => ({
        ...prev,
        workerState: "エラー",
      }));
    }
  }, [updateFps]);

  const handleStop = useCallback(() => {
    console.log('handleStop called');
    // Stop the track
    if (trackRef.current) {
      try {
        trackRef.current.stop();
      } catch {
        // Ignore errors on stop
      }
      trackRef.current = null;
    }
    // Terminate the worker
    if (workerRef.current) {
      workerRef.current.terminate();
    }
    workerRef.current = null;
    // Set the video srcObject to null
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Cancel reader
    if (readerRef.current) {
      if (typeof readerRef.current.cancel === 'function') {
        readerRef.current.cancel().catch(() => {});
      }
      readerRef.current = null;
    }
    // Reset processor ref
    processorRef.current = null;
    // Set stream to null
    setStream(null);
    // Reset refs for frame counting
    frameCountRef.current = 0;
    lastFpsUpdateRef.current = Date.now();
    // Just set the state to stopped for now
    setDebugInfo({
      captureState: "停止中",
      fps: 0,
      frameSize: "N/A",
      workerState: "停止中",
      lastReceived: "N/A",
    });
    setError(null);
  }, []);

  const handleStart = useCallback(async () => {
    setError(null);
    try {
      // Check browser support
      if (!detectMediaTrackProcessorSupport()) {
        throw new Error("このブラウザは画面共有に対応していません。Chrome または Edge をお使いください。");
      }

      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      console.log('getDisplayMedia succeeded:', mediaStream);

      // Get video track
      const tracks = mediaStream.getVideoTracks();
      if (tracks.length === 0) {
        throw new Error("ビデオトラックが見つかりません");
      }
      const track = tracks[0];
      trackRef.current = track;

      // Listen for track ended track)
      track.onended = () => {
        handleStop();
      };

      // Set stream state
      setStream(mediaStream);

      if (videoRef.current) {
        // videoRef.current.srcObject = mediaStream;
      }

      // Set state to 共有中 early to ensure it's updated before worker creation
      console.log('Setting state to 共有中');
      setDebugInfo((prev) => ({
        ...prev,
        captureState: "共有中",
        workerState: "実行中",
      }));
      // Wait for microtask to let the state update process
      await Promise.resolve();

      // Dispatch an ended event to verify the handler works
      // This is for testing purposes — in real usage, the browser fires this event

      // Create MediaStreamTrackProcessor
      const ProcessorConstructor = (window as { MediaStreamTrackProcessor?: { new (init: { track: MediaStreamTrack }): MediaStreamTrackProcessor } }).MediaStreamTrackProcessor;
      if (!ProcessorConstructor) {
        throw new Error("MediaStreamTrackProcessor is not supported");
      }
      const processor = new ProcessorConstructor({ track });
      console.log('MediaStreamTrackProcessor created:', processor);
      processorRef.current = processor;

      // Get readable stream
      const readable = processor.readable;
      readerRef.current = readable.getReader();

      // Ensure only one worker exists to avoid duplicate listeners
      if (workerRef.current) {
        console.warn('Existing worker detected, terminating before creating a new one');
        workerRef.current.terminate();
        workerRef.current = null;
      }

      const worker = new Worker(frameWorkerUrl, { type: "module" });
      console.log('Worker created:', worker);
      workerRef.current = worker;

      // Attach listeners (addEventListener allows removal if needed)
      const handleMessage = (e: MessageEvent) => {
        if (e.data?.type === "frame_received") {
          setDebugInfo((prev) => ({
            ...prev,
            lastReceived: new Date().toLocaleTimeString(),
          }));
        }
      };
      const handleError = () => {
        setError("Workerでエラーが発生しました");
        setDebugInfo((prev) => ({
          ...prev,
          workerState: "エラー",
        }));
      };
      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      // Transfer readable stream to worker
      worker.postMessage({ type: "init", readable }, [readable]);

      // Start processing frames (for debug overlay - FPS and frame size)
      processFrames();
    } catch (err: unknown) {
      console.error('handleStart error:', err);
      const message =
        err instanceof Error && err.name === "NotAllowedError"
          ? "共有が拒否されました"
          : String(err);
      setError(message);
    }
  }, [processFrames, handleStop]);

  // Cleanup on unmount or when stream changes
  useEffect(() => {
    const video = videoRef.current; // Copy ref value to use inside cleanup
    const worker = workerRef.current;
    const track = trackRef.current;
    const reader = readerRef.current;

    return () => {
      // Stop track
      if (track) {
        try {
          track.stop();
        } catch {
          // Ignore errors on stop
        }
      }
      // Cancel reader
      if (reader) {
        if (typeof reader.cancel === 'function') {
          reader.cancel().catch(() => {});
        }
      }
      // Reset processor ref
      processorRef.current = null;
      // Stop stream tracks
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore errors
          }
        });
      }
      // Reset video and worker using the copied variables
      if (video) {
        video.srcObject = null;
      }
      if (worker) {
        worker.terminate();
      }
      // Reset refs for frame counting
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = Date.now();
    };
  }, [stream]); // Include stream in the dependency array

  return (
    <div>
      <div>
        <button onClick={handleStart} disabled={stream !== null}>
          開始
        </button>
        <button onClick={handleStop} disabled={stream === null}>
          停止
        </button>
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <video
        data-testid="capture-video"
        ref={videoRef}
        autoPlay
        muted
        style={{ width: "100%", maxWidth: "640px" }}
      />
      <div data-testid="debug-overlay">
        <div>共有状態: {debugInfo.captureState}</div>
        <div>FPS: {debugInfo.fps}</div>
        <div>フレームサイズ: {debugInfo.frameSize}</div>
        <div>Worker状態: {debugInfo.workerState}</div>
        <div>最終受信時刻: {debugInfo.lastReceived}</div>
      </div>
    </div>
  );
}