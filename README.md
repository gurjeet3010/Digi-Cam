# 📷 DigiCam — Retro Photobooth & Strip Generator

> A modern retro-inspired digital photobooth that runs entirely in your browser — no installs, no uploads, 100% private.

🔗 **Live Demo:** [digi-cam.vercel.app](https://digi-cam.vercel.app)

---

## ✨ Features

- **4-Shot & 3-Shot Strip Modes** — Automatically captures a classic sequence of photos with a 3-second countdown between each shot
- **Live GPU Filters** — Apply real-time effects including Glitch, Cyberpunk, Noir, Sepia, and Warm Vintage directly on the webcam feed
- **Customizable Strip Templates** — Choose from multiple border themes (Classic, Noir, Cyber, Lavender, Peach, Sage), border sizes, label fonts (Modern, Mono, Serif, Cursive), and optional date stamp watermarks
- **Audio Synthesis** — Shutter sound feedback for an authentic photobooth feel
- **High-Res Download** — Export your photo strip as a JPG with one click
- **Print Support** — Print your photo strip directly from the browser
- **Mobile Compatible** — Fully responsive design works on smartphones and tablets; uses the device's front/rear camera seamlessly
- **100% Local Processing** — All photo capture and rendering happens on-device; nothing is sent to any server

---

## 🚀 Getting Started

### Prerequisites

- A modern browser (Chrome, Firefox, Edge, Safari) — on desktop **or** mobile
- A webcam (desktop) or front/rear camera (mobile)

### Run Locally

```bash
# Clone the repository
git clone https://github.com/gurjeet3010/Digi-Cam.git

# Navigate into the project folder
cd Digi-Cam

# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open `http://localhost:3000` (or the port shown in your terminal) in your browser.

### Build for Production

```bash
npm run build
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript |
| Webcam & Filters | WebRTC / Canvas API (GPU-accelerated) |
| Responsive Design | CSS Flexbox/Grid — works on mobile & desktop |
| Deployment | Vercel |

---

## 📸 How to Use

1. **Grant webcam access** when prompted by your browser
2. **Select a layout** — 4-Shot Classic Strip or 3-Shot Shorter Strip
3. **Pick a filter** from the live filter presets
4. Click **Take Photos** to start the 3-second countdown sequence
5. Wait for all shots to capture automatically
6. **Customize your strip** — border theme, size, font, and watermark
7. **Download** the high-res JPG or **Print** directly from the browser

---

## 🔒 Privacy

All photo capture and processing happens locally in your browser using the Canvas API. No images are uploaded to any server at any point.

---

## 📁 Project Structure

```
Digi-Cam/
├── index.html          # Main app entry point
├── style.css           # Styling and themes
├── script.js           # Webcam capture, filters, strip generation
└── README.md
```

---

## 🌐 Deployment

This project is deployed on **Vercel**. To deploy your own fork:

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Vercel auto-detects the project and deploys — no configuration needed

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👩‍💻 Author

**Gurjeet Kaur**
- GitHub: [@gurjeet3010](https://github.com/gurjeet3010)
- LinkedIn: [gurjeet-kaur3010](https://linkedin.com/in/gurjeet-kaur3010)

---

*Made with ❤️ and a love for retro aesthetics*
