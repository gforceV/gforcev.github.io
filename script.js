document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle Functionality ---
    function toggleMode() {
        const body = document.body;
        body.classList.toggle('dark-mode');
        body.classList.toggle('light-mode');
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    }

    // Apply saved theme on load, default to dark mode if none saved
    (function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.add('dark-mode');
        }
    })();

    // Expose toggleMode to the global scope
    window.toggleMode = toggleMode;

    // --- IP Address Fetching ---
    async function fetchIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            const ipAddressElement = document.getElementById('ip-address');
            if (ipAddressElement) {
                ipAddressElement.textContent = data.ip || 'Unable to fetch IP address';
            }
        } catch (error) {
            const ipAddressElement = document.getElementById('ip-address');
            if (ipAddressElement) {
                ipAddressElement.textContent = 'Unable to fetch IP address';
            }
            console.error('Error fetching IP address:', error);
        }
    }

    // --- Central Time Update ---
    function updateCentralTime() {
        const now = new Date();
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'America/Chicago'
        };
        const timeString = now.toLocaleTimeString('en-US', options);
        const centralTimeElement = document.getElementById('central-time');
        if (centralTimeElement) {
            centralTimeElement.textContent = timeString;
        }
    }

    // --- Cloudflare Tunnel Status Functionality ---
    const tunnelStatusDiv = document.getElementById('tunnel-status');
    const tunnelStatusLabel = document.getElementById('tunnel-status-label');
    const workerUrl = 'https://tunnel-status.isaac-g-swenson.workers.dev'; // Replace with your actual Cloudflare Worker URL

    if (tunnelStatusDiv) {
        async function fetchTunnelStatus() {
            try {
                const response = await fetch(workerUrl);
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
                }
                const tunnels = await response.json();
                return tunnels;
            } catch (error) {
                console.error('Error fetching tunnel status from Worker:', error);
                throw error;
            }
        }

        function renderTunnelStatus(tunnels) {
            let statusHtml = '';
            const tunnelLabels = {
                'SwensonNet': 'Site 0',
                'pi_remote_backup': 'Site 1'
            };

            let allHealthy = true;
            if (tunnels && tunnels.length > 0) {
                tunnels.forEach(tunnel => {
                    if (tunnel.status !== 'healthy') {
                        allHealthy = false;
                    }
                });
            }

            if (tunnelStatusLabel) {
                tunnelStatusLabel.classList.remove('text-tunnel-healthy', 'text-tunnel-unhealthy');
                tunnelStatusLabel.classList.add(allHealthy ? 'text-tunnel-healthy' : 'text-tunnel-unhealthy');
            }

            if (tunnels && tunnels.length > 0) {
                tunnels.forEach(tunnel => {
                    const label = tunnelLabels[tunnel.name] || tunnel.name;
                    const statusSymbol = tunnel.status === 'healthy' ? '🟢' : '🔴';
                    const tunnelStatusClass = tunnel.status === 'healthy' ? 'text-tunnel-healthy' : 'text-tunnel-unhealthy';

                    statusHtml += `
                        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex-1 min-w-[200px]">
                            <h3 class="text-lg font-semibold flex items-center ${tunnelStatusClass}">
                                ${statusSymbol} ${label}: <span class="${tunnelStatusClass} ml-2">${tunnel.status}</span>
                            </h3>
                        </div>
                    `;
                });
            } else {
                statusHtml = `
                    <p class="text-orange-600 dark:text-orange-400 font-semibold">
                        No Cloudflare tunnels found or data is currently unavailable.
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Please ensure your tunnels are active and the Cloudflare Worker is correctly configured.
                    </p>
                `;
            }

            if (tunnelStatusDiv) {
                tunnelStatusDiv.innerHTML = statusHtml;
            }
        }

        fetchTunnelStatus()
            .then(renderTunnelStatus)
            .catch(error => {
                if (tunnelStatusDiv) {
                    tunnelStatusDiv.innerHTML = `
                        <p class="text-red-600 dark:text-red-400 font-semibold">
                            Failed to load tunnel status. Please try again later.
                        </p>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Details: ${error.message}
                        </p>
                    `;
                }
            });

        setInterval(() => {
            fetchTunnelStatus()
                .then(renderTunnelStatus)
                .catch(error => console.error('Periodic fetch error:', error));
        }, 300000);
    }

    // --- Initial Calls ---
    fetchIPAddress();
    updateCentralTime();
    setInterval(updateCentralTime, 1000);
});
