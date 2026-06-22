// State Management
let stream = null;
let isSoundEnabled = true;
let activeFilter = { id: 'normal', name: 'Normal', filter: 'none' };
let layoutShots = 4;
let capturedPhotos = []; // Stores raw (unfiltered) Canvas elements for maximum post-capture editing flexibility
let isCapturing = false;
// activeDownloadUrl reference removed, now handled on-demand
let thumbnailTimer = null;
let currentTheme = { bg: '#ffffff', fg: '#121212', name: 'classic' };

// Filter Presets
const filterPresets = [
  { id: 'normal', name: 'Normal', filter: 'none' },
  { id: 'sepia', name: 'Retro Sepia', filter: 'sepia(0.85) contrast(1.15) brightness(0.95)' },
  { id: 'noir', name: 'B&W Noir', filter: 'grayscale(1) contrast(1.4) brightness(0.9)' },
  { id: 'cyber', name: 'Cyberpunk', filter: 'contrast(1.15) saturate(1.35) hue-rotate(330deg) brightness(0.82)' },
  { id: 'vhs', name: 'VHS Glitch', filter: 'saturate(0.55) contrast(1.25) brightness(1.05) sepia(0.1) hue-rotate(-15deg)' },
  { id: 'sunset', name: 'Warm Sunset', filter: 'sepia(0.2) saturate(1.6) contrast(1.1) brightness(0.95)' },
  { id: 'mist', name: 'Cool Mist', filter: 'saturate(0.8) contrast(0.9) hue-rotate(15deg) brightness(1.05)' },
  { id: 'dream', name: 'Neon Dream', filter: 'saturate(1.3) contrast(1.05) brightness(0.92) hue-rotate(-10deg) sepia(0.1)' }
];

// Synth Engine (Web Audio API)
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playCountdownBeep() {
  if (!isSoundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now); // A5 note
  
  gainNode.gain.setValueAtTime(0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1); // 100ms decay
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start(now);
  osc.stop(now + 0.1);
}

function playShutterSound() {
  if (!isSoundEnabled) return;
  initAudio();
  const now = audioCtx.currentTime;
  
  // White noise buffer for mechanical mirror shutter rattle
  const bufferSize = audioCtx.sampleRate * 0.12; // 120ms
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = buffer;
  
  const highpass = audioCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.setValueAtTime(1000, now);
  
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.35, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  
  noiseNode.connect(highpass);
  highpass.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  
  // Sine oscillator sweep for camera "thud" body click
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.08); // slide down
  
  oscGain.gain.setValueAtTime(0.4, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  
  osc.connect(oscGain);
  oscGain.connect(audioCtx.destination);
  
  noiseNode.start(now);
  osc.start(now);
  
  noiseNode.stop(now + 0.12);
  osc.stop(now + 0.08);
}

// DOM References
const screenLanding = document.getElementById('screen-landing');
const screenWorkspace = document.getElementById('screen-workspace');
const screenExport = document.getElementById('screen-export');

const videoPreview = document.getElementById('webcam-preview');
const statusLabel = document.getElementById('status-label');
const flashOverlay = document.getElementById('flash-overlay');
const countdownDisplay = document.getElementById('countdown-display');
const thumbnailGrid = document.getElementById('thumbnail-grid');
const timelineProgress = document.getElementById('timeline-progress');

// Controls Elements
const btnStartBooth = document.getElementById('btn-start-booth');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const btnExitWorkspace = document.getElementById('btn-exit-workspace');
const btnTriggerCapture = document.getElementById('btn-trigger-capture');
const btnRestart = document.getElementById('btn-restart');

// Customizer Elements
const stripCanvas = document.getElementById('strip-canvas');
const inputBorderWidth = document.getElementById('input-border-width');
const inputWatermark = document.getElementById('input-watermark');
const checkIncludeDate = document.getElementById('check-include-date');
const btnDownloadStrip = document.getElementById('btn-download-strip');
const btnPrintStrip = document.getElementById('btn-print-strip');
// btnClearStickers removed

// Onboarding & Page Navigation
btnStartBooth.addEventListener('click', async () => {
  initAudio();
  screenLanding.classList.remove('active');
  setTimeout(async () => {
    screenLanding.style.display = 'none';
    screenWorkspace.style.display = 'flex';
    setTimeout(() => screenWorkspace.classList.add('active'), 50);
    await startCamera();
  }, 300);
});

btnExitWorkspace.addEventListener('click', () => {
  stopCamera();
  screenWorkspace.classList.remove('active');
  setTimeout(() => {
    screenWorkspace.style.display = 'none';
    screenLanding.style.display = 'flex';
    setTimeout(() => screenLanding.classList.add('active'), 50);
  }, 300);
});

btnRestart.addEventListener('click', async () => {
  screenExport.classList.remove('active');
  setTimeout(async () => {
    screenExport.style.display = 'none';
    screenWorkspace.style.display = 'flex';
    setTimeout(() => screenWorkspace.classList.add('active'), 50);
    resetWorkspace();
    await startCamera();
  }, 300);
});

// Camera Operations
let mockInterval = null;

async function startCamera() {
  statusLabel.textContent = "INITIALIZING STREAM...";
  
  const constraints = {
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  try {
    // Attempt standard webcam access
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoPreview.srcObject = stream;
    // Explicitly play to prevent mobile browser autoplay blocks
    videoPreview.play().catch(e => console.warn("Video play deferred:", e));
    statusLabel.textContent = "LIVE STREAM";
    
    videoPreview.onloadedmetadata = () => {
      generateFilterThumbnails();
      startThumbnailLoop();
    };
  } catch (err) {
    console.warn("Camera hardware access denied/unavailable. Starting virtual video stream...", err);
    startMockCameraStream();
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  videoPreview.srcObject = null;
  if (mockInterval) {
    clearInterval(mockInterval);
    mockInterval = null;
  }
  if (thumbnailTimer) {
    clearInterval(thumbnailTimer);
    thumbnailTimer = null;
  }
}

// Mock Stream fallback for sandboxed browser checks
function startMockCameraStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  
  let frameAngle = 0;
  mockInterval = setInterval(() => {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#100c25');
    grad.addColorStop(1, '#05030f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw visual grid patterns
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    
    // Aesthetic frame highlights
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Orb Animation
    const ox = canvas.width / 2 + Math.cos(frameAngle) * 140;
    const oy = canvas.height / 2 + Math.sin(frameAngle * 1.6) * 90;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(ox, oy, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Orb 2
    const ox2 = canvas.width / 2 - Math.cos(frameAngle * 1.2) * 140;
    const oy2 = canvas.height / 2 - Math.sin(frameAngle * 0.8) * 90;
    ctx.shadowColor = '#ff2a74';
    ctx.fillStyle = '#ff2a74';
    ctx.beginPath();
    ctx.arc(ox2, oy2, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Clean shadow settings
    ctx.shadowBlur = 0;

    // Time overlays
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '600 16px "Space Grotesk"';
    ctx.textAlign = 'left';
    ctx.fillText("REC ●", 50, 65);
    
    const timeStr = new Date().toLocaleTimeString();
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, canvas.width - 50, 65);

    ctx.textAlign = 'center';
    ctx.font = '700 24px "Space Grotesk"';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText("CAMERA SIMULATOR ACTIVE", canvas.width / 2, canvas.height / 2);
    
    frameAngle += 0.05;
  }, 1000 / 30);
  
  // Capture canvas output stream
  stream = canvas.captureStream(30);
  videoPreview.srcObject = stream;
  // Explicitly play mock stream
  videoPreview.play().catch(e => console.warn("Mock video play deferred:", e));
  statusLabel.textContent = "VIRTUAL FEED";
  
  // Make sure video metadata load trigger
  videoPreview.onloadedmetadata = () => {
    generateFilterThumbnails();
    startThumbnailLoop();
  };
}

// Sidebar dynamic filter cards loading
function generateFilterThumbnails() {
  const container = document.getElementById('filters-container');
  container.innerHTML = '';
  
  filterPresets.forEach(preset => {
    const card = document.createElement('div');
    card.className = `filter-card ${activeFilter.id === preset.id ? 'active' : ''}`;
    card.dataset.filterId = preset.id;
    
    const canvas = document.createElement('canvas');
    canvas.className = 'filter-preview-canvas';
    canvas.width = 160;
    canvas.height = 120;
    
    const name = document.createElement('span');
    name.className = 'filter-name';
    name.textContent = preset.name;
    
    card.appendChild(canvas);
    card.appendChild(name);
    container.appendChild(card);
    
    // Initial card setup with vectors
    drawStaticThumbnail(canvas, preset.filter);
    
    card.addEventListener('click', () => {
      if (isCapturing) return; // Prevent selection changes during triggers
      document.querySelectorAll('.filter-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      activeFilter = preset;
      videoPreview.style.filter = preset.filter;
    });
  });
}

function drawStaticThumbnail(canvas, filterString) {
  const ctx = canvas.getContext('2d');
  ctx.filter = filterString;
  
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#5f27cd');
  grad.addColorStop(1, '#ff9ff3');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height * 0.6, 25, 0, Math.PI * 2);
  ctx.fillStyle = '#feca57';
  ctx.fill();
  
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(0, canvas.height * 0.75, canvas.width, canvas.height * 0.25);
}

function startThumbnailLoop() {
  if (thumbnailTimer) clearInterval(thumbnailTimer);
  thumbnailTimer = setInterval(() => {
    if (!isCapturing && stream) {
      updateFilterThumbnailsLive();
    }
  }, 1200);
}

function updateFilterThumbnailsLive() {
  const cards = document.querySelectorAll('.filter-card');
  cards.forEach(card => {
    const canvas = card.querySelector('.filter-preview-canvas');
    if (!canvas) return;
    const preset = filterPresets.find(p => p.id === card.dataset.filterId);
    if (!preset) return;
    
    const ctx = canvas.getContext('2d');
    ctx.save();
    
    const videoWidth = videoPreview.videoWidth || 640;
    const videoHeight = videoPreview.videoHeight || 480;
    const targetRatio = 4 / 3;
    
    let sWidth, sHeight, sx, sy;
    const currentRatio = videoWidth / videoHeight;
    
    if (currentRatio > targetRatio) {
      sHeight = videoHeight;
      sWidth = videoHeight * targetRatio;
      sx = (videoWidth - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = videoWidth;
      sHeight = videoWidth / targetRatio;
      sx = 0;
      sy = (videoHeight - sHeight) / 2;
    }

    // Mirror standard preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.filter = preset.filter;
    ctx.drawImage(videoPreview, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  });
}

// Layout Mode Toggling
document.querySelectorAll('.preset-selector .btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (isCapturing) return;
    document.querySelectorAll('.preset-selector .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    layoutShots = parseInt(btn.dataset.shots, 10);
    resetTimelineSlots();
  });
});

function resetTimelineSlots() {
  thumbnailGrid.innerHTML = '';
  timelineProgress.textContent = `0 / ${layoutShots} Captures`;
  for (let i = 0; i < layoutShots; i++) {
    const slot = document.createElement('div');
    slot.className = 'thumb-slot empty';
    slot.dataset.index = i;
    
    const num = document.createElement('span');
    num.className = 'slot-num';
    num.textContent = i + 1;
    
    slot.appendChild(num);
    thumbnailGrid.appendChild(slot);
  }
}

// Volume Sound Toggle
btnSoundToggle.addEventListener('click', () => {
  isSoundEnabled = !isSoundEnabled;
  btnSoundToggle.querySelector('.icon').textContent = isSoundEnabled ? '🔊' : '🔇';
  btnSoundToggle.classList.toggle('active', !isSoundEnabled);
});

// Capture Sequence Execution
btnTriggerCapture.addEventListener('click', () => {
  if (isCapturing) return;
  startCaptureSequence();
});

async function startCaptureSequence() {
  isCapturing = true;
  capturedPhotos = [];
  btnTriggerCapture.disabled = true;
  document.querySelectorAll('.preset-selector .btn, .filter-card').forEach(el => el.style.pointerEvents = 'none');
  
  resetTimelineSlots();

  for (let shot = 0; shot < layoutShots; shot++) {
    // Highlight timeline index slot
    const slot = thumbnailGrid.querySelector(`[data-index="${shot}"]`);
    if (slot) slot.classList.add('active-slot');
    
    statusLabel.textContent = `GET READY (SHOT ${shot + 1}/${layoutShots})`;

    // 3 Second Countdown Loop
    for (let count = 3; count > 0; count--) {
      countdownDisplay.textContent = count;
      countdownDisplay.classList.remove('countdown-active');
      void countdownDisplay.offsetWidth; // Trigger DOM reflow
      countdownDisplay.classList.add('countdown-active');
      
      playCountdownBeep();
      await sleep(1000);
    }
    
    // Capture Frame Instantly on 0
    countdownDisplay.classList.remove('countdown-active');
    triggerShutterFlash();
    playShutterSound();
    
    // Save Frame
    const snapshotCanvas = captureFrame();
    capturedPhotos.push(snapshotCanvas);
    
    // Update active slot thumbnail UI preview
    if (slot) {
      slot.classList.remove('active-slot', 'empty');
      slot.classList.add('captured');
      
      const img = document.createElement('img');
      img.src = snapshotCanvas.toDataURL('image/jpeg');
      // Apply active visual filter preview to matches
      img.style.filter = activeFilter.filter;
      slot.appendChild(img);
    }
    
    timelineProgress.textContent = `${shot + 1} / ${layoutShots} Captures`;

    // Visual Pause between shots
    if (shot < layoutShots - 1) {
      statusLabel.textContent = "HOLD POSE...";
      await sleep(1800);
    }
  }

  statusLabel.textContent = "PROCESSING STRIP...";
  await sleep(1000);

  // Transition to Export Window
  isCapturing = false;
  btnTriggerCapture.disabled = false;
  document.querySelectorAll('.preset-selector .btn, .filter-card').forEach(el => el.style.pointerEvents = 'auto');
  
  stopCamera();
  
  screenWorkspace.classList.remove('active');
  setTimeout(() => {
    screenWorkspace.style.display = 'none';
    screenExport.style.display = 'flex';
    setTimeout(() => screenExport.classList.add('active'), 50);
    generateStripCanvas();
  }, 300);
}

function triggerShutterFlash() {
  flashOverlay.classList.remove('flash-active');
  void flashOverlay.offsetWidth; // Reflow
  flashOverlay.classList.add('flash-active');
}

function captureFrame() {
  const canvas = document.createElement('canvas');
  const videoWidth = videoPreview.videoWidth || 640;
  const videoHeight = videoPreview.videoHeight || 480;
  
  // Target a standard 4:3 landscape aspect ratio (1.333)
  const targetRatio = 4 / 3;
  
  let sWidth, sHeight, sx, sy;
  const currentRatio = videoWidth / videoHeight;
  
  if (currentRatio > targetRatio) {
    // Source is wider than 4:3 (e.g. 16:9). Crop sides.
    sHeight = videoHeight;
    sWidth = videoHeight * targetRatio;
    sx = (videoWidth - sWidth) / 2;
    sy = 0;
  } else {
    // Source is taller than 4:3 (e.g. 9:16). Crop top/bottom.
    sWidth = videoWidth;
    sHeight = videoWidth / targetRatio;
    sx = 0;
    sy = (videoHeight - sHeight) / 2;
  }
  
  canvas.width = sWidth;
  canvas.height = sHeight;
  
  const ctx = canvas.getContext('2d');
  
  ctx.save();
  // Draw mirrored snapshot to match workspace stream coordinates
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoPreview, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
  ctx.restore();
  
  return canvas;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetWorkspace() {
  capturedPhotos = [];
  resetTimelineSlots();
  videoPreview.style.filter = 'none';
  activeFilter = { id: 'normal', name: 'Normal', filter: 'none' };
  statusLabel.textContent = "LIVE STREAM";
}

// ==========================================================================
// STRIP COLLAGE GENERATOR ENGINE
// ==========================================================================
function generateStripCanvas() {
  if (capturedPhotos.length === 0) return;

  const ctx = stripCanvas.getContext('2d');
  
  // Custom styling settings
  const borderWidth = parseInt(inputBorderWidth.value, 10);
  const watermarkText = inputWatermark.value.trim().toUpperCase();
  const includeDate = checkIncludeDate.checked;
  const activeFont = document.querySelector('.btn-font.active').dataset.font;

  // Single Frame Sizing (Proportion base height = 3/4 width)
  const singleWidth = 600;
  const singleHeight = Math.round(singleWidth * (capturedPhotos[0].height / capturedPhotos[0].width));

  // Collage calculations
  const horizontalPadding = borderWidth;
  const verticalSpacing = borderWidth;
  
  const watermarkPadding = watermarkText !== "" || includeDate ? 130 : 0;
  
  const totalWidth = singleWidth + (2 * horizontalPadding);
  const totalHeight = (singleHeight * capturedPhotos.length) + 
                      (verticalSpacing * (capturedPhotos.length + 1)) + 
                      watermarkPadding;

  stripCanvas.width = totalWidth;
  stripCanvas.height = totalHeight;

  // 1. Draw Strip Background
  ctx.fillStyle = currentTheme.bg;
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // 2. Draw Frames with Filters
  capturedPhotos.forEach((frameCanvas, idx) => {
    const dx = horizontalPadding;
    const dy = verticalSpacing + idx * (singleHeight + verticalSpacing);
    
    ctx.save();
    // Apply selected preset filter directly onto canvas renderer context
    ctx.filter = activeFilter.filter;
    ctx.drawImage(frameCanvas, dx, dy, singleWidth, singleHeight);
    ctx.restore();
    
    // Draw fine stroke border around each frame for clean polaroid edge feel
    ctx.strokeStyle = currentTheme.name === 'classic' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx, dy, singleWidth, singleHeight);
  });

  // 3. Draw Watermark banner
  if (watermarkPadding > 0) {
    const textCenterY = totalHeight - (watermarkPadding / 2);
    
    ctx.fillStyle = currentTheme.fg;
    ctx.textAlign = 'center';
    
    // Draw Name Label
    if (watermarkText !== "") {
      ctx.font = `800 28px ${activeFont}`;
      ctx.fillText(watermarkText, totalWidth / 2, textCenterY - 10);
    }
    
    // Draw Date Label
    if (includeDate) {
      const today = new Date();
      const options = { year: 'numeric', month: 'short', day: '2-digit' };
      const dateString = today.toLocaleDateString('en-US', options).toUpperCase();
      
      ctx.font = `600 16px ${activeFont}`;
      ctx.fillStyle = currentTheme.name === 'classic' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)';
      ctx.fillText(dateString, totalWidth / 2, textCenterY + 22);
    }
  }

  // 4. Render Active Stickers - removed

  // 5. Mirror to Image Element for mobile-friendly save (long-press/tap)
  const stripImage = document.getElementById('strip-image');
  if (stripImage) {
    stripImage.src = stripCanvas.toDataURL('image/jpeg', 0.95);
  }

}

// Customizer Theme Pickers
document.querySelectorAll('.theme-picker .btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.theme-picker .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    currentTheme = {
      bg: btn.dataset.bg,
      fg: btn.dataset.fg,
      name: btn.dataset.theme
    };
    generateStripCanvas();
  });
});

// Customizer Property Listeners
inputBorderWidth.addEventListener('input', generateStripCanvas);
inputWatermark.addEventListener('input', generateStripCanvas);
checkIncludeDate.addEventListener('change', generateStripCanvas);

// Font Pickers
document.querySelectorAll('.font-selector .btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.font-selector .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    generateStripCanvas();
  });
});

// Sticker Placer Overlay Engine - removed

// Export Download - Handled by generating a high-quality Blob on-demand
btnDownloadStrip.addEventListener('click', (e) => {
  e.preventDefault();

  // Prevent double clicks during generation
  if (btnDownloadStrip.classList.contains('generating')) return;
  btnDownloadStrip.classList.add('generating');

  const originalHTML = btnDownloadStrip.innerHTML;
  btnDownloadStrip.style.pointerEvents = 'none';
  btnDownloadStrip.innerHTML = '<span>Generating High-Res JPG...</span>';

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `photobooth-strip-${stamp}.jpg`;

  stripCanvas.toBlob((blob) => {
    btnDownloadStrip.classList.remove('generating');
    btnDownloadStrip.style.pointerEvents = 'auto';
    btnDownloadStrip.innerHTML = originalHTML;

    if (!blob) {
      alert("Failed to generate the high-res image. Please try again.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up the object URL after download is initiated
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 150);
  }, 'image/jpeg', 0.98); // High quality (98%)
});

// Export Direct Print
btnPrintStrip.addEventListener('click', () => {
  const dataUrl = stripCanvas.toDataURL('image/jpeg');
  
  // Open dynamic print popup iframe window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Popup blocker blocked printing. Please allow popups for this site.");
    return;
  }
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Photo Strip</title>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #fff;
          }
          img {
            max-width: 100%;
            height: auto;
            max-height: 98vh;
            box-shadow: none;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
          @media print {
            body { margin: 0; padding: 0; }
            img { max-height: 100vh; }
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print(); window.close();" />
      </body>
    </html>
  `);
  printWindow.document.close();
});
