# 📊 Real-Time Network Latency & Ping Monitor Dashboard

A premium, lightweight, pure client-side network monitoring dashboard built using **Vanilla JS + CSS**. It measures latency and renders connection quality metrics, Jitter, and live interactive graphs using **Chart.js** and **Lucide Icons** directly from the browser.

---

## ✨ Features

- **⚡ Real-Time Polling & Graphing**: Polls latency targets every 2 seconds and updates a custom smooth line chart (powered by Chart.js).
- **📋 Dynamic Connection Quality**: Classifies connection latency automatically:
  - `< 30ms`: `Excellent` (Green)
  - `30-60ms`: `Good` (Teal)
  - `60-100ms`: `Fair` (Amber)
  - `100ms+`: `Poor` (Orange)
  - `timeout`: `Offline` (Red)
- **🔀 Real-Time Jitter Calculation**: Calculates delay variation metrics on the fly using the mathematical variance formula: `Sum(|Ping_i - Ping_{i-1}|) / (N - 1)`.
- **⚠️ Spike Detection Warnings**: Instantly displays an inline warning card when latency spikes above `100ms` or jumps by more than `50ms` between cycles.
- **🛡️ Custom Target Monitoring**: Supports any hostname or IP with an optional port (e.g. `aternos.me:64032`).
- **🌙 Soft Light/Dark Mode Switch**: Includes an elegant, low-contrast slate-blue light mode to prevent eye strain. Preferences are persisted in `localStorage`.
- **📂 Scrollable Chronological Logs**: Keeps a rolling history of the last 20 events. The table is automatically capped and scrolls to the bottom to display new events in real time.

---

## 📁 Project Structure

```text
pingMonitoring/
├── index.html            # Main dashboard visual shell layout
├── README.md             # Project documentation
└── assets/
    ├── css/
    │   └── style.css     # Glassmorphic premium dark/light stylesheet
    └── js/
        └── app-js.js     # Controller fetching latency updates & drawing charts
```

---

## 🛠️ Prerequisites

To run this project locally, you don't need any special backend or database! It's a pure client-side application. Any modern web browser is sufficient.

---

## 🚀 How to Run the Dashboard

Because this is a pure front-end web app, you have two easy options to run it:

### Option 1: Simple Local Server (Recommended)
Running via a simple local HTTP server ensures all assets load properly without strict file URL restrictions.

If you have **Python** installed:
```bash
python -m http.server 8000
```
If you have **Node.js** installed:
```bash
npx serve
```
If you have **PHP** installed:
```bash
php -S localhost:8000
```
Then navigate to **http://localhost:8000** in your browser.

### Option 2: Direct File Open
You can simply double-click the `index.html` file in your file explorer to open it directly in your web browser.

---

## 🔒 Target Checking Note
Since this monitor runs entirely in the browser, latency checks are performed using the browser's `fetch` API. For custom target hosts (especially non-HTTP servers), the browser uses a CORS-free connection attempt to measure the TCP connection timing, providing a fast estimation of network latency to the target.
