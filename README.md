# 🍌 BananaGram & Jubilee: Proof of Participation

> **Most software is built around information. Jubilee organizes participation.**

BananaGram is a parent-focused, zero-frustration Telegram fork that integrates **Jubilee — Proof of Participation**. Built for overwhelmed parents and tight-knit neighborhood circles, it treats every genuine act of contribution—whether child care, meal rescue, tool sharing, transportation, music, or code—as a first-class object in a living community ecology.

---

## 🌟 Core Philosophy: Participation as a First-Class Object

```
Participant
     │
     ▼
Shared Basket (Offer)
     │
     ▼
Possibility Seeds (Join & Need)
     │
     ▼
Witness Ledger (Remember & Receipts)
     │
     ▼
Community Capacities (Forest View)
```

1. **Offer What You Can**: Shared neighborhood basket for tools, skills, time, care, food, and creative capacities without money or market scores.
2. **Join What Is Growing**: Possibility seeds with stage lifecycles (*Seed → Sprout → Growing → Flowering → Harvest → Compost*). Every seed asks: *"If this succeeds... what becomes possible next?"*
3. **Remember What Happened**: Append-only Witness Ledger storing SHA-256 hash-linked receipts (`#rcpt-1`, `#rcpt-2`) for community trust and participation tracking (UX prototype).
4. **Forest View**: Visual topology graphing how individual acts of participation fork and unlock community capacities over time.

---

## ✨ Features Overview

### 1. 💬 Telegram Porch & Ambient Participation
- **Zero-Drama Chat Channels**: Pre-seeded with *BananaBot 🍌*, *First Campfire 🔥*, *Co-Parent Chat*, and *Pantry Rescue*.
- **Inline Bot Triggers**:
  - `/offer <item>` — Instantly adds an item to the Shared Basket and records a witness receipt.
  - `/need <item>` — Plants a new possibility seed in the circle.
  - `/remember <event>` — Appends a SHA-256 hash-linked receipt to the Witness Ledger.
  - `@jubilee` — Interacts directly with the neighborhood participation graph.

### 2. ⚡ 2-Minute Pantry Rescue (Gemini 3.6 Flash)
- **Instant Recipe Generator**: Snap a photo of your fridge or type available ingredients (e.g., *1 banana, slice of cheddar, cracker*).
- **Toddler Sensory Safe**: Generates 3-step recipes tailored to child age and pickiness level with strict allergy safety checks.
- **1-Tap Share**: Send recipes directly to active chats or co-parents with one touch.

### 3. 📸 Bnana Photo Album & AI Meal Logs
- High-speed photo sharing for meals, fridge snapshots, playdates, and kid smiles.
- **Background Gemini Analysis**: Gemini inspects photos to verify texture safety, allergy compliance, and nutritional balance.
- **1-Tap Chat Sharing**: Attach photo logs with AI notes directly to family threads.

### 4. 👨‍👩‍👧 Simplified Parent Group Management
- Effortless group creation for co-parents, grandparents, and playdate groups.
- **Streamlined Notification Rules**: Choose between *All Updates*, *SOS Alerts Only*, *Quiet Hours (8pm-7am)*, or *Mute*.
- **Background Gemini Thread Summarizer**: Distills 50+ unread parent messages into a 5-second summary with key takeaways and action items.

### 5. 🚨 Meltdown SOS Reset
- One-tap emergency guidance during active toddler crying or sensory overload.
- Offers 3-step calm routines, comforting white noise audio loops, and instant co-parent alert dispatches.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Web Audio API
- **Backend**: Express.js server (`server.ts`) with Vite middleware
- **AI Integration**: Google GenAI SDK (`@google/genai`) using Gemini 3.6 Flash (`gemini-3.6-flash`)

---

## 🚦 Getting Started Locally

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/bananagram-messenger.git
   cd bananagram-messenger
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and add your Gemini API Key:
   ```bash
   cp .env.example .env
   ```
   In `.env`:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 📦 Build & Production Deployment

To build the application for production deployment:

```bash
# Build Vite frontend and bundle Express server with esbuild
npm run build

# Start production server
npm start
```

---

## 📄 License

MIT License. Built with love for communities and parents everywhere 💛
