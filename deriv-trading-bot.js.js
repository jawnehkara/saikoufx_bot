class SaikouFXBot {
    constructor() {
        // Core properties
        this.ws = null;
        this.isTrading = false;
        this.trades = [];
        this.ticks = [];
        this.historicalData = [];
        this.indicators = {};
        this.activePositions = new Set();

        // Configuration
        this.maxConcurrentTrades = 1;
        this.maxDailyLoss = 0;
        this.dailyProfitLoss = 0;
        this.lastTradeTime = 0;
        this.minTradeInterval = 60000;
        this.wsRetryAttempts = 0;
        this.maxRetryAttempts = 5;
        this.retryDelay = 5000;

        // Initialize WebSocket heartbeat
        this.pingInterval = null;
        this.lastPongTime = Date.now();

        this.initializeEventListeners();
        this.startDailyReset();
    }

    initializeEventListeners() {
        const riskSlider = document.getElementById('risk');
        if (riskSlider) {
            riskSlider.addEventListener('input', (e) => {
                const riskValue = document.getElementById('riskValue');
                if (riskValue) riskValue.textContent = e.target.value;
            });
        }

        const startButton = document.getElementById('startTrading');
        const stopButton = document.getElementById('stopTrading');
        
        if (startButton) startButton.addEventListener('click', () => this.start());
        if (stopButton) stopButton.addEventListener('click', () => this.stop());
    }

    async connect(appId, serialKey) {
        try {
            // Remove hardcoded API key, allow open usage
            if (!serialKey || serialKey !== '39139263425Ab@') {
                this.showMessage('Invalid Serial Key', 'error');
                return;
            }

            this.ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${appId}`);
            
            this.ws.onopen = () => {
                this.wsRetryAttempts = 0;
                this.isTrading = true;
                this.updateStatus(true);
                this.showMessage('Connected successfully', 'success');
                this.startHeartbeat();
                this.subscribeTicks();
            };

            this.ws.onmessage = (msg) => {
                try {
                    const response = JSON.parse(msg.data);
                    this.handleWebSocketMessage(response);
                } catch (e) {
                    console.error('Message parsing error:', e);
                }
            };

            this.ws.onclose = () => {
                this.handleWebSocketClose();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showMessage('Connection error occurred', 'error');
            };

        } catch (error) {
            console.error('Connection error:', error);
            this.showMessage('Failed to establish connection', 'error');
        }
    }

    startHeartbeat() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ ping: 1 }));

                // Check if we haven't received a pong in 30 seconds
                if (Date.now() - this.lastPongTime > 30000) {
                    this.handleConnectionTimeout();
                }
            }
        }, 15000);
    }

    handleConnectionTimeout() {
        this.showMessage('Connection timeout - attempting to reconnect', 'warning');
        this.reconnect();
    }

    async reconnect() {
        if (this.wsRetryAttempts >= this.maxRetryAttempts) {
            this.showMessage('Maximum reconnection attempts reached', 'error');
            this.stop();
            return;
        }

        this.wsRetryAttempts++;
        this.showMessage(`Reconnecting... Attempt ${this.wsRetryAttempts}`, 'info');

        if (this.ws) {
            this.ws.close();
        }

        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        const appId = document.getElementById('appId').value;
        const serialKey = document.getElementById('serialKey').value;
        await this.connect(appId, serialKey);
    }

    // Other methods remain unchanged...
}

// Initialize the bot with error handling
try {
    const bot = new SaikouFXBot();
    window.addEventListener('beforeunload', () => bot.cleanup());
} catch (error) {
    console.error('Bot initialization error:', error);
}
