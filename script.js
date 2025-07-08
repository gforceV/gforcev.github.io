// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Toggle Functionality ---
    function toggleMode() {
        document.body.classList.toggle('dark-mode');
        // Persist the mode
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    }

    // Apply saved theme on load, overriding default if a choice was made
    (function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-mode');
        } else if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            // No saved theme, default to dark mode
            document.body.classList.add('dark-mode');
        }
    })();

    // Expose toggleMode to the global scope so it can be called from onclick attribute
    window.toggleMode = toggleMode;

    // --- IP Address Fetching ---
    async function fetchIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            const ipAddressElement = document.getElementById('ip-address');
            if (ipAddressElement) {
                ipAddressElement.textContent = data.ip;
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
            hour12: true, // 12-hour format
            timeZone: 'America/Chicago' // Central Time
        };
        const timeString = now.toLocaleTimeString('en-US', options);
        const centralTimeElement = document.getElementById('central-time');
        if (centralTimeElement) {
            centralTimeElement.textContent = timeString;
        }
    }

    // --- Cloudflare Tunnel Status Functionality ---
    const tunnelStatusDiv = document.getElementById('tunnel-status');

    // IMPORTANT: Replace this with the actual URL of your deployed Cloudflare Worker.
    // This Worker will act as a secure proxy to the Cloudflare API.
    // Example: const workerUrl = 'https://your-tunnel-status-worker.your-username.workers.dev';
    const workerUrl = 'tunnel-status.isaac-g-swenson.workers.dev'; // <<< REPLACE THIS LINE WITH YOUR WORKER URL

    // Display a message if the Worker URL is not configured
    if (tunnelStatusDiv && (workerUrl === 'tunnel-status.isaac-g-swenson.workers.dev' || !workerUrl)) {
        tunnelStatusDiv.innerHTML = `
            <p class="text-red-600 font-semibold">
                Error: Cloudflare Worker URL is not configured.
                Please update 'script.js' with your deployed Worker's URL.
            </p>
        `;
        console.error("Cloudflare Worker URL is not configured in script.js.");
        // Do not proceed with tunnel status fetch if URL is missing
    } else if (tunnelStatusDiv) { // Only proceed if tunnelStatusDiv exists and workerUrl is set
        /**
         * Fetches the Cloudflare tunnel status from the deployed Worker.
         * @returns {Promise<Array>} A promise that resolves to an array of tunnel objects.
         */
        async function fetchTunnelStatus() {
            try {
                // Make a fetch request to your Cloudflare Worker
                const response = await fetch(workerUrl);

                // Check if the response was successful (status code 200-299)
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorText}`);
                }

                // Parse the JSON response
                const tunnels = await response.json();
                return tunnels;

            } catch (error) {
                // Log and re-throw the error for further handling
                console.error('Error fetching tunnel status from Worker:', error);
                throw error; // Propagate the error
            }
        }

        /**
         * Renders the tunnel status in the HTML.
         * @param {Array} tunnels - An array of tunnel objects.
         */
        function renderTunnelStatus(tunnels) {
            let statusHtml = '';

            // Check if tunnels array is valid and not empty
            if (tunnels && tunnels.length > 0) {
                tunnels.forEach(tunnel => {
                    // Determine icon and color based on tunnel status
                    const tunnelStatusColor = tunnel.status === 'healthy' ? 'text-green-600' : 'text-red-600';
                    const tunnelIcon = tunnel.status === 'healthy' ? '✅' : '❌';

                    statusHtml += `
                        <div class="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                            <h3 class="text-xl font-semibold mb-2 flex items-center">
                                <span class="${tunnelStatusColor} mr-2">${tunnelIcon}</span>
                                ${tunnel.name} (<span class="${tunnelStatusColor}">${tunnel.status}</span>)
                            </h3>
                            <p class="text-sm text-gray-600 mb-3">ID: <code class="bg-gray-100 p-1 rounded text-xs">${tunnel.id}</code></p>
                            <h4 class="text-lg font-medium text-gray-800 mb-2">Connections:</h4>
                            <ul class="list-disc list-inside space-y-1 text-gray-700">
                    `;

                    // Render connections for each tunnel
                    if (tunnel.connections && tunnel.connections.length > 0) {
                        tunnel.connections.forEach(conn => {
                            const connStatusColor = conn.status === 'healthy' ? 'text-green-500' : 'text-red-500';
                            const connIcon = conn.status === 'healthy' ? '🟢' : '🔴';
                            statusHtml += `
                                <li class="flex items-center">
                                    <span class="${connStatusColor} mr-2">${connIcon}</span>
                                    <span class="font-medium">${conn.colo}</span>:
                                    <span class="${connStatusColor} ml-1">${conn.status}</span>
                                    ${conn.is_pending_reconnect ? '<span class="text-orange-500 ml-2">(Reconnecting)</span>' : ''}
                                </li>
                            `;
                        });
                    } else {
                        statusHtml += '<li class="text-gray-500">No active connections reported.</li>';
                    }
                    statusHtml += `
                            </ul>
                        </div>
                    `;
                });
            } else {
                // Message if no tunnels are found or data is empty
                statusHtml = `
                    <p class="text-orange-600 font-semibold">
                        No Cloudflare tunnels found or data is currently unavailable.
                    </p>
                    <p class="text-sm text-gray-500 mt-2">
                        Please ensure your tunnels are active and the Cloudflare Worker is correctly configured.
                    </p>
                `;
            }

            // Update the HTML content of the tunnel status div
            if (tunnelStatusDiv) {
                tunnelStatusDiv.innerHTML = statusHtml;
            }
        }

        // Initial fetch and render when the page loads
        fetchTunnelStatus()
            .then(renderTunnelStatus) // On success, render the tunnels
            .catch(error => {
                // On error, display an error message to the user
                if (tunnelStatusDiv) {
                    tunnelStatusDiv.innerHTML = `
                        <p class="text-red-600 font-semibold">
                            Failed to load tunnel status. Please try again later.
                        </p>
                        <p class="text-sm text-gray-500 mt-2">
                            Details: ${error.message}
                        </p>
                    `;
                }
            });

        // Optionally, refresh the status periodically (e.g., every 5 minutes)
        setInterval(() => {
            fetchTunnelStatus()
                .then(renderTunnelStatus)
                .catch(error => console.error('Periodic fetch error:', error));
        }, 300000); // 300000 ms = 5 minutes
    }


    // --- Call initial functions when the page loads ---
    // The DOMContentLoaded listener handles initial calls.
    fetchIPAddress();
    updateCentralTime(); // Initial call
    setInterval(updateCentralTime, 1000); // Update every second
});
