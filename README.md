# KhangFlash — The IELTS Dictionary & Study Deck

This is your complete, self-contained KhangFlash website packaged and configured for 1-click deployment on **Vercel** (or Netlify / Cloudflare Pages).

---

## What is in this project?
- **Vocabulary Database (`data.json`)**: 4MB comprehensive IELTS dictionary & card database.
- **Study Catalog (`study-catalog.json`)**: Topics, grammar units, and learning tracks.
- **All Core Pages**:
  - `dashboard.html` (Main overview and study dashboard)
  - `flashcard.html` (Spaced repetition study deck)
  - `due.html` (Due review queue)
  - `grammar.html` (Grammar units & exercises)
  - `library.html`, `games.html`, `schedule.html`, `grammar-games.html`
- **Serverless API (`/api`)**:
  - `/api/study.js`: Handles progress saving and study statistics.
  - `/api/session.js`: Keeps the user in authenticated owner mode (no guest locks).
  - `/api/practice.js`: Handles practice notebook and exercises.
- **Configuration**:
  - `vercel.json`: Clean URL rewrites and route handling.
  - `index.html`: Root redirect to `/dashboard.html`.

---

## How to Deploy to Vercel (Free)

### Method 1: Via GitHub (Recommended — Automatic Updates)
1. Create a new repository on [GitHub](https://github.com/new) (e.g. `khangflash`).
2. Push this folder to your repository:
   ```bash
   cd C:\Users\a\.gemini\antigravity\scratch\khangflash
   git init
   git add .
   git commit -m "Initial commit of KhangFlash"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/khangflash.git
   git push -u origin main
   ```
3. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
4. Click **"Add New..."** → **"Project"**.
5. Select your `khangflash` repository and click **"Deploy"**.
6. In about 30 seconds, Vercel will give you a live production link (e.g., `https://khangflash.vercel.app`) with free SSL. Every time you push changes to GitHub, Vercel will redeploy automatically!

---

### Method 2: Via Vercel CLI (Instant from Terminal)
1. Open PowerShell and install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Navigate to this folder and run:
   ```bash
   cd C:\Users\a\.gemini\antigravity\scratch\khangflash
   vercel
   ```
3. Follow the simple prompts (press Enter for defaults). Your site will be deployed directly!
