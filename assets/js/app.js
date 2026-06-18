// app.js

document.addEventListener('DOMContentLoaded', () => {
    let pingChart = null;
    const historyLimit = 30;
    const tableLimit = 20; // Changed table limit to 20 rows
    let currentHost = '8.8.8.8';
    let pollInterval = null;
    let lastPing = null;
    let lastLogTime = null;
    let lastStatsUpdateTime = 0; // Track 5-minute interval for summary stats

    // Elements
    const statusText = document.getElementById('status-value');
    const statusIcon = document.getElementById('status-icon');
    const statusDot = document.getElementById('status-dot');
    
    const latencyValue = document.getElementById('latency-value');
    const latencyIcon = document.getElementById('latency-icon');
    
    const lossValue = document.getElementById('loss-value');
    const lossIcon = document.getElementById('loss-icon');
    
    const jitterValue = document.getElementById('jitter-value');
    const jitterIcon = document.getElementById('jitter-icon');
    
    const currentHostBadge = document.getElementById('current-host-badge');
    const tableBody = document.getElementById('logs-table-body');
    const tableWrapper = document.querySelector('.table-wrapper');
    const hostInput = document.getElementById('host-input');
    const hostForm = document.getElementById('host-form');
    
    // Banner, summary widgets, error messages, and theme toggle
    const spikeWarning = document.getElementById('spike-warning');
    const statMin = document.getElementById('stat-min');
    const statAvg = document.getElementById('stat-avg');
    const statMax = document.getElementById('stat-max');
    const hostError = document.getElementById('host-error');
    const lastUpdateTime = document.getElementById('last-update-time');
    const themeToggle = document.getElementById('theme-toggle');

    // Theme toggle logic initialization
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.innerHTML = '<i data-lucide="sun" style="width: 18px; height: 18px;"></i>';
    } else {
        document.body.classList.remove('light-mode');
        themeToggle.innerHTML = '<i data-lucide="moon" style="width: 18px; height: 18px;"></i>';
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        themeToggle.innerHTML = isLight 
            ? '<i data-lucide="sun" style="width: 18px; height: 18px;"></i>' 
            : '<i data-lucide="moon" style="width: 18px; height: 18px;"></i>';
        
        // Re-trigger Lucide icon renderer for new icon markup
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        // Dynamic chart ticks styling matching theme transition
        if (pingChart) {
            const tickColor = isLight ? '#475569' : '#9ca3af';
            pingChart.options.scales.x.ticks.color = tickColor;
            pingChart.options.scales.y.ticks.color = tickColor;
            pingChart.options.scales.y.grid.color = isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.04)';
            pingChart.update();
        }
    });

    // Initialize Chart
    function initChart(initialData = []) {
        const ctx = document.getElementById('pingChart').getContext('2d');
        
        const labels = initialData.map(d => d.time);
        const dataValues = initialData.map(d => d.ping);
        const isLight = document.body.classList.contains('light-mode');
        const tickColor = isLight ? '#475569' : '#9ca3af';
        const gridColor = isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.04)';

        pingChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ping Latency (ms)',
                    data: dataValues,
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: context => {
                        const val = context.raw;
                        return val === null ? '#f43f5e' : '#3b82f6';
                    },
                    pointBorderColor: '#0b0f19',
                    pointBorderWidth: 1.5,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#111928',
                        titleFont: { family: 'Outfit', size: 12 },
                        bodyFont: { family: 'Outfit', size: 12 },
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: tickColor,
                            maxTicksLimit: 8,
                            autoSkip: true,
                            maxRotation: 0,
                            minRotation: 0,
                            font: {
                                family: 'Outfit',
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: {
                            color: tickColor,
                            font: { family: 'Outfit', size: 11 },
                            callback: value => value + ' ms'
                        }
                    }
                }
            }
        });
        
        updateSummaryStats(true); // Force calculate stats initially
    }

    // Update UI Cards
    function updateUICards(status, quality, ping, loss) {
        const qLower = quality.toLowerCase();
        const stateClass = `state-${qLower}`;
        const iconClass = `icon-${qLower}`;
        
        // Status Card
        statusText.className = `stat-value ${stateClass}`;
        statusText.textContent = quality;
        statusIcon.className = `stat-icon-wrapper ${iconClass}`;
        
        // Target status pulse dot in header (online, unstable, offline)
        statusDot.className = `pulse-indicator ${status}`;

        // Latency Card - shows latency and Quality badge inline
        latencyValue.innerHTML = ping !== null 
            ? `${ping} ms <span style="font-size: 0.85rem; font-weight: 500; display: block; margin-top: 0.2rem;" class="${stateClass}">${quality}</span>` 
            : `— <span style="font-size: 0.85rem; font-weight: 500; display: block; margin-top: 0.2rem;" class="state-offline">Offline</span>`;
        latencyValue.className = `stat-value ${stateClass}`;
        latencyIcon.className = `stat-icon-wrapper ${iconClass}`;

        // Loss Card
        lossValue.textContent = `${loss}%`;
        const lossStatus = loss > 0 ? (loss === 100 ? 'offline' : 'unstable') : 'online';
        lossValue.className = `stat-value state-${lossStatus}`;
        lossIcon.className = `stat-icon-wrapper icon-${lossStatus}`;
    }

    // Check for high latency spike
    function checkSpike(currentPing) {
        if (currentPing === null) {
            spikeWarning.style.display = 'none';
            return;
        }
        
        // Trigger if current ping > 100ms or there is a sudden spike of >= 50ms compared to previous ping
        const isSpike = currentPing > 100 || (lastPing !== null && (currentPing - lastPing) >= 50);
        
        if (isSpike) {
            spikeWarning.style.display = 'flex';
        } else {
            spikeWarning.style.display = 'none';
        }
        
        lastPing = currentPing;
    }

    // Update min, average, max, and jitter stats
    function updateSummaryStats(force = false) {
        if (!pingChart) return;
        
        const activeData = pingChart.data.datasets[0].data.filter(val => val !== null);
        if (activeData.length === 0) {
            statMin.textContent = '—';
            statAvg.textContent = '—';
            statMax.textContent = '—';
            
            jitterValue.innerHTML = `— <span style="font-size: 0.85rem; font-weight: 500; display: block; margin-top: 0.2rem;" class="state-offline">Offline</span>`;
            jitterValue.className = 'stat-value state-offline';
            jitterIcon.className = 'stat-icon-wrapper icon-offline';
            return;
        }
        
        // Calculate and place Min, Avg, Max only if forced or 5 minutes (300000ms) have passed
        const now = Date.now();
        if (force || lastStatsUpdateTime === 0 || (now - lastStatsUpdateTime) >= 300000) {
            lastStatsUpdateTime = now;
            const minVal = Math.min(...activeData);
            const maxVal = Math.max(...activeData);
            const sumVal = activeData.reduce((acc, curr) => acc + curr, 0);
            const avgVal = Math.round(sumVal / activeData.length);
            
            statMin.textContent = `${minVal} ms`;
            statAvg.textContent = `${avgVal} ms`;
            statMax.textContent = `${maxVal} ms`;
        }

        // Calculate Jitter (average difference between consecutive delays) - runs on every poll
        let totalDiff = 0;
        let diffCount = 0;
        for (let i = 1; i < activeData.length; i++) {
            totalDiff += Math.abs(activeData[i] - activeData[i-1]);
            diffCount++;
        }
        const jitterVal = diffCount > 0 ? Math.round(totalDiff / diffCount) : 0;
        
        let jitterStatus = 'Stable';
        let jitterClass = 'state-excellent';
        let jitterIconClass = 'icon-excellent';
        
        if (jitterVal > 30) {
            jitterStatus = 'Unstable';
            jitterClass = 'state-poor';
            jitterIconClass = 'icon-poor';
        } else if (jitterVal > 10) {
            jitterStatus = 'Moderate';
            jitterClass = 'state-fair';
            jitterIconClass = 'icon-fair';
        }
        
        jitterValue.innerHTML = `${jitterVal} ms <span style="font-size: 0.85rem; font-weight: 500; display: block; margin-top: 0.2rem;" class="${jitterClass}">${jitterStatus}</span>`;
        jitterValue.className = `stat-value ${jitterClass}`;
        jitterIcon.className = `stat-icon-wrapper ${jitterIconClass}`;
    }

    // Append logs to history table at the bottom (oldest to newest, latest entry visible)
    function appendLogToTable(time, ping, status, quality) {
        // Prevent duplicate log rendering
        if (lastLogTime === time) return;
        lastLogTime = time;

        const row = document.createElement('tr');
        const displayPing = ping !== null ? `${ping} ms` : 'Timed Out';
        const qLower = quality.toLowerCase();
        
        row.innerHTML = `
            <td>${time}</td>
            <td><span class="badge ${qLower}">${quality}</span></td>
            <td class="font-medium">${displayPing}</td>
        `;

        tableBody.appendChild(row);

        // Limit table rows to tableLimit (20). Remove oldest from the top
        while (tableBody.children.length > tableLimit) {
            tableBody.removeChild(tableBody.firstChild);
        }

        // Auto-scroll the log container down to make the newest entry visible
        if (tableWrapper) {
            tableWrapper.scrollTop = tableWrapper.scrollHeight;
        }
    }

    // Populate logs table in chronological order (oldest at top, newest at bottom)
    function populateLogsTable(logs) {
        tableBody.innerHTML = '';
        lastLogTime = null; // reset log time marker for rendering
        
        // Loop normally so history populates oldest-first (newer items at bottom)
        for (let i = 0; i < logs.length; i++) {
            const logEntry = logs[i];
            const quality = logEntry.quality || (logEntry.status === 'offline' ? 'Offline' : 'Excellent');
            appendLogToTable(logEntry.time, logEntry.ping, logEntry.status, quality);
        }
    }

    // Add entry to chart
    function addChartData(time, ping) {
        if (!pingChart) return;
        
        pingChart.data.labels.push(time);
        pingChart.data.datasets[0].data.push(ping);

        if (pingChart.data.labels.length > historyLimit) {
            pingChart.data.labels.shift();
            pingChart.data.datasets[0].data.shift();
        }

        pingChart.update('none'); // Update without full animation for smoother real-time feel
        updateSummaryStats(false); // Check stats updates normally (throttled to 5 mins)
    }

    // Fetch and Ping single test cycle
    async function executePingCycle() {
        try {
            const response = await fetch(`api/ping.php?host=${encodeURIComponent(currentHost)}&t=${Date.now()}`);
            if (!response.ok) throw new Error('API server error');
            const data = await response.json();
            
            if (data.error) {
                // Show inline host target error instead of breaking the app
                hostError.textContent = data.error;
                hostError.style.display = 'block';
                
                statusText.className = 'stat-value state-offline';
                statusText.textContent = 'Invalid Target';
                statusIcon.className = 'stat-icon-wrapper icon-offline';
                return;
            } else {
                hostError.style.display = 'none';
            }
            
            updateUICards(data.status, data.quality, data.ping, data.packet_loss);
            checkSpike(data.ping);
            addChartData(data.time, data.ping);
            appendLogToTable(data.time, data.ping, data.status, data.quality);
            
            // Update last updated time indicator
            if (lastUpdateTime) {
                lastUpdateTime.textContent = data.time;
            }
        } catch (error) {
            console.error('Failed to run ping cycle:', error);
            updateUICards('offline', 'Offline', null, 100);
            checkSpike(null);
        }
    }

    // Initialize Dashboard data
    async function initDashboard() {
        try {
            // Load base config target badge
            currentHostBadge.textContent = currentHost;
            hostError.style.display = 'none';
            
            // Try load current JSON logs history to populate on start
            const response = await fetch(`data/ping-log.json?t=${Date.now()}`);
            if (response.ok) {
                const logs = await response.json();
                
                // Filter logs to match only the current active host
                const filteredLogs = logs.filter(l => (l.host === currentHost) || (!l.host && currentHost === '8.8.8.8'));
                
                initChart(filteredLogs);
                populateLogsTable(filteredLogs);
                
                if (filteredLogs.length > 0) {
                    const lastLog = filteredLogs[filteredLogs.length - 1];
                    const loss = lastLog.status === 'offline' ? 100 : 0;
                    const quality = lastLog.quality || (lastLog.status === 'offline' ? 'Offline' : 'Excellent');
                    updateUICards(lastLog.status, quality, lastLog.ping, loss);
                    checkSpike(lastLog.ping);
                }
            } else {
                initChart([]);
            }
        } catch (e) {
            console.warn('Could not load starting log data, initializing clean chart:', e);
            initChart([]);
        }

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Start live polling loop
        startPolling();
    }

    function startPolling() {
        if (pollInterval) clearInterval(pollInterval);
        
        // Execute immediately
        executePingCycle();
        
        // Poll every 2 seconds
        pollInterval = setInterval(executePingCycle, 2000);
    }

    // Handle Custom Host Form submit
    hostForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputVal = hostInput.value.trim();
        if (inputVal) {
            // Strict regex match to mirror backend validation
            const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(inputVal);
            const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(inputVal);
            
            if (!isIP && !isDomain) {
                hostError.textContent = 'Invalid target format. Use hostname or IP only (e.g. google.com or 8.8.8.8).';
                hostError.style.display = 'block';
                return;
            }
            
            hostError.style.display = 'none';
            currentHost = inputVal;
            currentHostBadge.textContent = currentHost;
            lastPing = null;
            lastStatsUpdateTime = 0; // Force recalculation on host shift
            
            // Clear current chart data
            if (pingChart) {
                pingChart.data.labels = [];
                pingChart.data.datasets[0].data = [];
                pingChart.update();
            }
            tableBody.innerHTML = '';
            
            // Reset polling
            startPolling();
        }
    });

    // Guide modal controls
    const guideToggle = document.getElementById('guide-toggle');
    const guideModal = document.getElementById('guide-modal');
    const guideClose = document.getElementById('guide-close');

    guideToggle.addEventListener('click', () => {
        guideModal.style.display = 'flex';
    });

    guideClose.addEventListener('click', () => {
        guideModal.style.display = 'none';
    });

    // Close modal by clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === guideModal) {
            guideModal.style.display = 'none';
        }
    });

    // Run Startup Initialization
    initDashboard();

});
