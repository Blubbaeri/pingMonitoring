# 📊 Real-Time Network Latency & Ping Monitor Dashboard

A premium, lightweight, self-contained network monitoring dashboard built using **Native PHP** and **Vanilla JS + CSS**. It parses system ping outputs dynamically (supporting both Windows and Linux environments) and renders connection quality metrics, Jitter, packet loss, and live interactive graphs using **Chart.js** and **Lucide Icons**.

---

## ✨ Features

- **⚡ Real-Time Polling & Graphing**: Polls latency targets every 2 seconds and updates a custom smooth line chart (powered by Chart.js).
- **📋 Dynamic Connection Quality**: Classifies connection latency automatically:
  - `< 30ms`: `Excellent` (Green)
  - `30-50ms`: `Good` (Teal)
  - `50-100ms`: `Fair` (Amber)
  - `100ms+`: `Poor` (Orange)
  - `timeout`: `Offline` (Red)
- **🔀 Real-Time Jitter Calculation**: Calculates delay variation metrics on the fly using the mathematical variance formula: `Sum(|Ping_i - Ping_{i-1}|) / (N - 1)`.
- **⚠️ Spike Detection Warnings**: Instantly displays an inline warning card when latency spikes above `100ms` or jumps by more than `50ms` between cycles.
- **🛡️ Strict Input Whitelisting**: Employs robust server-side target input filtering (`FILTER_VALIDATE_IP` + strict domain name regex whitelist) to safely block command injections.
- **🌙 Soft Light/Dark Mode Switch**: Includes an elegant, low-contrast slate-blue light mode to prevent eye strain. Preferences are persisted in `localStorage`.
- **📂 Scrollable Chronological Logs**: Keeps a rolling history of the last 20 events. The table is automatically capped and scrolls to the bottom to display new events in real time.

---

## 📁 Project Structure

```text
ping-monitor/
├── index.php             # Main dashboard visual shell layout
├── api/
│   └── ping.php          # Backend entry point outputting JSON payloads
├── includes/
│   └── helper.php        # Core OS-based execution, parser & JSON logger helper
├── data/
│   └── ping-log.json     # Rolling log file database caching history
└── assets/
    ├── css/
    │   └── style.css     # Glassmorphic premium dark/light stylesheet
    └── js/
        └── app.js        # Controller fetching API updates & drawing charts
```

---

## 🛠️ Prerequisites

To run this project locally, you only need **PHP** installed on your system (PHP 7.4 or higher recommended). No database configuration or additional package managers are required.

---

## 🚀 How to Run the Dashboard

### 1. Start PHP's Built-In Web Server
Open your terminal or command prompt inside the project folder (`ping-monitor`) and execute the following command:

```bash
php -S localhost:8000
```

### 2. Access the Dashboard
Open your web browser and navigate to:
👉 **[http://localhost:8000](http://localhost:8000)**

### 3. Customize target
You can monitor any custom target (IP address or Domain name) by typing it into the input box at the top (e.g. `google.com`, `1.1.1.1`, `8.8.8.8`) and clicking **Update Target**.

---

## 🔒 Security Note
This project performs target validation in both frontend and backend to block shell argument manipulation. Only standard hostnames (e.g. `google.com`) and standard IPv4/IPv6 addresses are accepted. Any weird characters or path traversal elements will be safely caught and filtered.
"# pingMonitoring" 
