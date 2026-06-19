# Tech Stack Comparisons & Pitfalls (mistakes.md)

This document details why specific architectural choices were made for the DigiCam Photobooth, comparing them to common alternative stacks, and illustrating how typical implementation mistakes are avoided.

---

## 1. Real-time Filters: CSS/Canvas vs. CNN (TensorFlow.js)

| Feature | Chosen Stack: CSS & Canvas 2D | Alternative: CNN / TensorFlow.js |
| :--- | :--- | :--- |
| **GPU/CPU Overhead** | Low (uses native browser composition layers). | High (requires heavy tensor operations on WebGL). |
| **Network Payload** | 0 KB (built-in browser rendering). | 5MB to 50MB (deep learning model weights). |
| **Framerate** | Locked 60 FPS. | 10–25 FPS (device dependent). |
| **Styling Variety** | High (unlimited combination of color-matrix adjustments). | Single-Style (rigid style-transfer models). |

### The "Mistake" of using CNNs for standard photobooths:
Integrating a Convolutional Neural Network (CNN) for basic color grading, vintage sepia, noise overlay, or contrast adjustments is a massive anti-pattern. A CNN introduces lag, heats up mobile devices, drains battery, and forces the user to wait for megabytes of model parameters to download over mobile data. CSS and basic Canvas math achieve the exact same color profiles instantly. 
*(Note: CNNs are only justified when the specific product goal is complex shape-based manipulation, such as face-swapping or smart background segmentation.)*

---

## 2. Collage Processing: Client-Side Canvas vs. Backend Rendering

| Feature | Chosen Stack: Client Canvas | Alternative: Backend Processing (Node/Python) |
| :--- | :--- | :--- |
| **Network Overhead** | Low (only download final image). | High (requires uploading 3-4 raw camera frames). |
| **Processing Latency**| Instant (rendered in microseconds locally). | Seconds (upload time + server queue + download time). |
| **Privacy & Security**| High (camera data never leaves the user device). | Low (server stores/processes raw video frames). |
| **Hosting Costs** | $0 (static hosting on Github Pages/Vercel). | Variable (requires active node/python CPU compute). |

### The "Mistake" of using Backend Processing:
Relying on a backend server (e.g., uploading photos to a Python FastAPI or Node server running Sharp/Pillow) is a common architectural mistake. It creates a point of failure when a user's network connection drops or is slow, resulting in timeout errors. It also raises privacy concerns (storing photos on external servers) and incurs server costs. Client-side HTML5 Canvas handles this locally and instantly.

---

## 3. Audio Effects: Web Audio Synth vs. Static Audio Assets

| Feature | Chosen Stack: Synthesized Audio | Alternative: Static Audio Files (`.mp3` / `.wav`) |
| :--- | :--- | :--- |
| **Network Requests** | None (computed dynamically). | 1 request per asset (e.g., shutter.mp3, beep.mp3). |
| **CORS / Path Errors** | Impossible (no remote fetch). | High risk (relative asset pathing, CDN failures). |
| **Latency/Delay** | Sub-millisecond (instant triggers). | Variable (depends on browser buffer / loading state). |
| **Customizability** | High (can change pitch/speed via code).| None (fixed audio file assets). |

### The "Mistake" of using Static Audio Assets:
Using standard `<audio>` tags pointing to `.mp3` files frequently breaks in web applications. If the user starts the camera capture sequence before the audio files are fully cached, the countdown beeps will either fail or trigger out of sync with the visual countdown numbers. Furthermore, mobile browsers block audio playback unless initiated by direct user gesture; the Web Audio API context allows us to unlock a single audio engine on the start button click and run synthetic sounds with microsecond accuracy.

---

## 4. UI Frameworks: Vanilla SPA vs. Massive JS Frameworks (React/Vue/Angular)

| Feature | Chosen Stack: Vanilla JS / CSS | Alternative: Framework Stack (Vite + React) |
| :--- | :--- | :--- |
| **Bundle Size** | ~15 KB (raw files). | ~150 KB+ (react, react-dom, build-boilerplate). |
| **Compilation/Build**| None (runs directly in browser). | Mandatory (npm install, bundlers, dist outputs). |
| **DOM Overhead** | Minimal (surgical class-based toggling). | Virtual DOM reconciliation loops. |

### The "Mistake" of using JS Frameworks for simple SPAs:
For a camera photobooth website, installing React/Vue, setting up webpack/vite, and carrying node_modules dependency baggage is unnecessary. Vanilla JS is much easier to read, has zero build step, is immediately testable, and guarantees that our camera and Canvas references map directly to standard DOM elements without framework lifecycle complexity.
