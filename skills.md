# Technical Component Workings (skills.md)

This document explains the inner workings, configuration, and execution flow of the core Web APIs and architecture styles used in the DigiCam Photobooth application.

---

## 1. Camera Stream Management (MediaDevices API)
- **API**: `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })`
- **Working**:
  - Request access to the user's front-facing camera.
  - Bind the resulting `MediaStream` object directly to a hidden or displayed HTML5 `<video autoplay playsinline>` element's `srcObject` property.
  - Listen for the `loadedmetadata` event to ensure the video width and height are active, allowing us to align layout canvases dynamically.

---

## 2. Real-time Visual Filters (CSS Filter Engine)
- **Mechanism**: Modern GPU-accelerated CSS `filter` rules.
- **Working**:
  - CSS filters (`grayscale`, `sepia`, `hue-rotate`, `contrast`, `saturate`, `brightness`) are applied directly to the `<video>` element.
  - Since CSS filters are processed on the GPU via native compositing layers, they achieve a lockstep 60 FPS without introducing processing latency or CPU load.
  - A preset mapping dictionary in `app.js` translates active visual filters into CSS filter strings (e.g. `sepia(0.8) contrast(1.2) brightness(0.9)`) and Canvas rendering filters.

---

## 3. Audio Effects Engine (Web Audio API Synthesizer)
- **API**: `window.AudioContext` or `window.webkitAudioContext`
- **Why Synth**: Avoids downloading, caching, or triggering CORS errors for audio asset files.
- **Countdown Beep Working**:
  - Create an `OscillatorNode` set to a `sine` wave at `880Hz` (A5 note) or `1000Hz`.
  - Connect it to a `GainNode` for volume control.
  - Schedule an envelope to start at volume `0.3` and decay to `0.0` within `100ms`, then stop the oscillator.
- **Shutter Snap Working**:
  - **White Noise Generator**: Create an `AudioBuffer` filled with random float values between `-1.0` and `1.0` (simulating visual static/noise).
  - **Filter**: Run the noise through a `BiquadFilterNode` configured as a high-pass filter (cutoff around `1000Hz`) to simulate the metallic snap of a shutter mirror.
  - **Volume Envelope**: Apply a rapid decay gain envelope (fading from `0.8` to `0.0` within `150ms`).
  - **Slap Element**: Parallel-synth a short, low-frequency sine sweep (frequency sliding from `150Hz` down to `40Hz` in `80ms`) to add the physical "thud" sound of the camera shutter body.

---

## 4. Strip Processing Engine (HTML5 Canvas 2D)
- **API**: `HTMLCanvasElement` and `CanvasRenderingContext2D`
- **Step-by-Step Compilation**:
  1. **Dimensions Calculation**:
     - Photobooth strips have a specific vertical aspect ratio (e.g., 1:4 width-to-height ratio).
     - If each captured photo is `640 x 480` (4:3 ratio), a 4-photo vertical strip requires a canvas size of `width = 640 + 2 * padding` and `height = (480 * 4) + (5 * padding) + textHeaderSpace`.
  2. **Image Drawing**:
     - For each captured frame stored in memory as an image bitmap/canvas:
       - Apply the chosen filter to the Canvas context using `ctx.filter = cssFilterString` before rendering.
       - Draw the image frame using `ctx.drawImage()`.
  3. **Decorative Additions**:
     - Render background colors or grids using `ctx.fillStyle` and `ctx.fillRect`.
     - Render white/black borders around each picture segment to mimic physical paper prints.
     - Add watermark text at the bottom (e.g., custom name, localized date-time) using `ctx.font`, `ctx.textAlign = 'center'`, and `ctx.fillText()`.
  4. **Base64 Packaging**:
     - Call `canvas.toDataURL('image/jpeg', 0.95)` to compile the drawing operations into a compact, high-quality, base64-encoded image string ready for direct client-side downloading.
