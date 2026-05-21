# Sappy Bird

A browser-based Flappy Bird-style game built with Vite, TypeScript, plain CSS, and the HTML5 Canvas API. The game loop uses `requestAnimationFrame` with delta-time movement, high-DPI canvas scaling, localStorage best score persistence, simple Web Audio API sound effects, and production PWA support for offline play.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

## Build

```bash
npm run build
```

## Offline / Add to Home Screen

Production builds include a web app manifest, iOS home-screen metadata, app icons, and a service worker. After the game is opened once from a secure URL, Safari on iOS can add it to the Home Screen and launch it offline.

For a local production check:

```bash
npm run build
npm run preview
```

Then open the preview URL. Service workers require HTTPS in normal hosting, though `localhost` is allowed for local testing.

## App Updates

The deployed app publishes `version.json` and checks it in the background while online. If a new version is detected during a round, the player can finish that round. After the round, the game blocks restart and asks the player to close and reopen Sappy Bird so the Home Screen PWA can activate the update.

## Backend Visitor Counter

The game silently records one visit per browser session by POSTing to `/api/visit`. Firebase Hosting rewrites that path to the `recordSappyBirdVisit` Cloud Function, which increments:

- `analytics/sappyBird.totalVisits`
- `analytics/sappyBird.uniqueVisitors`
- `analytics/sappyBird.lastVisitedAt`
- `analytics/sappyBird/visitors/{visitorId}.visitCount`

This is backend-only and is not displayed in the game UI. If the player is offline, the visit is kept pending locally and retried when the browser comes back online.

## Controls

- Press `Space`
- Click the canvas
- Tap on touch screens

Use the same control to start, flap, and restart after game over.

## Project Structure

```text
src/
  main.ts      App entry point and game bootstrap
  Game.ts      Game loop, state management, scoring, collisions, rendering
  Bird.ts      Bird physics, rotation, collision box, drawing
  Pipe.ts      Pipe spawning data, movement, scoring checks, drawing
  Input.ts     Keyboard, mouse, and touch input handling
  Sound.ts     Small optional Web Audio API sound manager
  utils.ts     Shared math and drawing helpers
  style.css    Responsive page and canvas styling
  Analytics.ts Silent backend visitor counter beacon
public/
  manifest.webmanifest  PWA metadata
  sw.js                 Offline cache service worker
  icons/                Home-screen icons
functions/
  index.js              Firebase Function that increments Firestore analytics
```

## Gameplay Notes

- Movement is frame-rate independent through delta time.
- Large frame deltas are clamped to prevent jumps after tab switching.
- Gameplay coordinates stay fixed at `432 x 768`, while CSS scales the canvas responsively.
- The canvas is rendered at device-pixel-ratio resolution for sharper graphics.
- Best score is stored with localStorage and persists after refresh.
