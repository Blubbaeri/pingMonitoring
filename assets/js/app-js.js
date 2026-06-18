// app-js.js

document.addEventListener('DOMContentLoaded', () => {
    let pingChart = null;
    const historyLimit = 30;
    const tableLimit = 20; // rolling table limit
    let pollInterval = null;
    let lastPing = null;
    let lastLogTime = null;
    let lastStatsUpdateTime = 0;

    const TEST_URL = 'https://connectivitycheck.gstatic.com/generate_204';

    // Elements
    const statusText = document.getElementById('status-value');
    const statusIcon = document.getElementById('status-icon');
    const statusDot = document.getElementById('status-dot');
    
    const latencyValue = document.getElementById('latency-value');
    const latencyIcon = document.getElementById('latency-icon');
    
    const jitterValue = document.getElementById('jitter-value');
    const jitterIcon = document.getElementById('jitter-icon');
    
    const tableBody = document.getElementById('logs-table-body');
    const tableWrapper = document.querySelector('.table-wrapper');
    
    const spikeWarning = document.getElementById('spike-warning');
    const statMin = document.getElementById('stat-min');
    const statAvg = document.getElementById('stat-avg');
    const statMax = document.getElementById('stat-max');
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
        
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
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
                    label: 'Latency (ms)',
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
        
        updateSummaryStats(true);
    }

    // Update UI Cards
    function updateUICards(status, quality, latency) {
        const qLower = quality.toLowerCase();
        const stateClass = `state-${qLower}`;
        const iconClass = `icon-${qLower}`;
        
        // Status Card
        statusText.className = `stat-value ${stateClass}`;
        statusText.textContent = quality;
        statusIcon.className = `stat-icon-wrapper ${iconClass}`;
        
        // Status dot in header
        statusDot.className = `pulse-indicator ${status}`;

        // Latency Card
        latencyValue.innerHTML = latency !== null 
            ? `${latency} ms <span style="font-size: 0.85rem; font-weight: 500; display: block; margin-top: 0.2rem;" class="${stateClass}">${quality}</span>` 
            : `— <span style="font-size: 0.85rem; font-weight: 500; display: block; margin-top: 0.2rem;" class="state-offline">Offline</span>`;
        latencyValue.className = `stat-value ${stateClass}`;
        latencyIcon.className = `stat-icon-wrapper ${iconClass}`;
    }

    // Check for high latency spike
    function checkSpike(currentPing) {
        if (currentPing === null) {
            spikeWarning.style.display = 'none';
            return;
        }
        
        const isSpike = currentPing > 100 || (lastPing !== null && (currentPing - lastPing) >= 50);
        
        if (isSpike) {
            spikeWarning.style.display = 'flex';
        } else {
            spikeWarning.style.display = 'none';
        }
        
        lastPing = currentPing;
    }

    // Update summary statistics & Jitter card
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
        
        // Update stats (real-time recalculation)
        const minVal = Math.min(...activeData);
        const maxVal = Math.max(...activeData);
        const sumVal = activeData.reduce((acc, curr) => acc + curr, 0);
        const avgVal = Math.round(sumVal / activeData.length);
        
        statMin.textContent = `${minVal} ms`;
        statAvg.textContent = `${avgVal} ms`;
        statMax.textContent = `${maxVal} ms`;

        // Calculate Jitter (average difference between consecutive delays)
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

    // Append logs to table
    function appendLogToTable(time, ping, status, quality) {
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

        while (tableBody.children.length > tableLimit) {
            tableBody.removeChild(tableBody.firstChild);
        }

        if (tableWrapper) {
            tableWrapper.scrollTop = tableWrapper.scrollHeight;
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

        pingChart.update('none');
        updateSummaryStats(false);
    }

    // Measure latency client-side using gstatic generate_204 endpoint
    async function measureLatency() {
        const start = performance.now();
        try {
            await fetch(TEST_URL + '?t=' + Date.now(), {
                mode: 'no-cors',
                cache: 'no-store'
            });
            return Math.round(performance.now() - start);
        } catch (error) {
            console.warn('Latency measurement failed:', error);
            return null;
        }
    }

    // Monitor Network Cycle
    async function monitorNetwork() {
        const latency = await measureLatency();
        const timeStr = new Date().toLocaleTimeString();
        
        if (latency === null) {
            updateUICards('offline', 'Offline', null);
            checkSpike(null);
            addChartData(timeStr, null);
            appendLogToTable(timeStr, null, 'offline', 'Offline');
            if (lastUpdateTime) {
                lastUpdateTime.textContent = timeStr;
            }
            return;
        }

        let quality = 'Poor';
        let status = 'online';

        if (latency < 30) {
            quality = 'Excellent';
        } else if (latency < 60) {
            quality = 'Good';
        } else if (latency < 100) {
            quality = 'Fair';
        }

        updateUICards(status, quality, latency);
        checkSpike(latency);
        addChartData(timeStr, latency);
        appendLogToTable(timeStr, latency, status, quality);

        if (lastUpdateTime) {
            lastUpdateTime.textContent = timeStr;
        }
    }

    // Start live polling loop
    function startPolling() {
        if (pollInterval) clearInterval(pollInterval);
        
        // Execute immediately
        monitorNetwork();
        
        // Poll every 2 seconds
        pollInterval = setInterval(monitorNetwork, 2000);
    }

    // Run Startup Initialization
    function initDashboard() {
        initChart([]);
        
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Guide modal controls
        const guideToggle = document.getElementById('guide-toggle');
        const guideModal = document.getElementById('guide-modal');
        const guideClose = document.getElementById('guide-close');

        if (guideToggle && guideModal && guideClose) {
            guideToggle.addEventListener('click', () => {
                guideModal.style.display = 'flex';
            });

            guideClose.addEventListener('click', () => {
                guideModal.style.display = 'none';
            });

            window.addEventListener('click', (e) => {
                if (e.target === guideModal) {
                    guideModal.style.display = 'none';
                }
            });
        }

        startPolling();
    }

    initDashboard();
});
