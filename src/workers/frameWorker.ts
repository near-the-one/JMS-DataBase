// Worker for processing video frames
let readableStream: ReadableStream<VideoFrame> | null = null;
let reader: ReadableStreamDefaultReader<VideoFrame> | null = null;

self.onmessage = async (e: MessageEvent) => {
  if (e.data?.type === "init") {
    // Receive the readable stream from main thread
    readableStream = e.data.readable as ReadableStream<VideoFrame>;
    reader = readableStream.getReader();

    // Start processing frames
    processFrames();
  }
};

async function processFrames() {
  if (!reader) return;

  try {
    while (true) {
      const { value: frame, done } = await reader.read();
      if (done) break;
      if (!frame) continue;

      // In the future, we would do image processing here.
      // For now, we just send a message back to the main thread to let it know we received a frame.
      self.postMessage({ type: "frame_received", timestamp: Date.now() });

      // Release frame memory
      frame.close();
    }
  } catch (err) {
    console.error("Worker frame processing error:", err);
    self.postMessage({ type: "error", message: String(err) });
  }
}