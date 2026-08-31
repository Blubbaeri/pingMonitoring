# Real-Time Network Latency Monitor

A lightweight, client-side network monitoring dashboard built with Vanilla JavaScript and CSS. It measures latency and renders connection quality metrics, jitter, and live interactive graphs directly in the browser.

## Features

- **Real-Time Polling & Graphing**: Polls latency targets periodically and updates a smooth line chart powered by Chart.js.
- **Dynamic Connection Quality**: Classifies connection latency automatically into Excellent, Good, Fair, Poor, or Offline categories.
- **Real-Time Jitter Calculation**: Calculates delay variation metrics on the fly using mathematical variance.
- **Spike Detection Warnings**: Instantly displays an inline warning card when latency spikes or jumps significantly between cycles.
- **Custom Target Monitoring**: Supports any hostname or IP with an optional port.
- **Light/Dark Mode**: Includes an elegant light mode to prevent eye strain. Preferences are persisted locally.
- **Scrollable Chronological Logs**: Keeps a rolling history of recent events. The table is automatically capped and scrolls to the bottom to display new events in real time.

## Architecture

This is a pure front-end application with no backend or database required. It runs entirely in the browser using the Fetch API.

- `index.html`: Main dashboard layout and structure.
- `assets/css/style.css`: Stylesheet with responsive design and theme support.
- `assets/js/app-js.js`: Core logic for fetching latency updates and rendering charts.

## Getting Started

Because this is a pure front-end web app, you can run it using any local HTTP server.

**Option 1: Python**
```bash
python -m http.server 8000
```

**Option 2: Node.js**
```bash
npx serve
```

**Option 3: PHP**
```bash
php -S localhost:8000
```

Once the server is running, navigate to `http://localhost:8000` in your web browser. Alternatively, you can simply open the `index.html` file directly in your browser.

## Technical Details

Since this monitor runs entirely in the browser, latency checks are performed using the browser's native `fetch` API. For custom target hosts (especially non-HTTP servers), the browser uses a CORS-free connection attempt to measure the TCP connection timing, providing a fast estimation of network latency to the target.
