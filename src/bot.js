const { getArbitrageOpportunities, getLiveArbitrageOpportunities, getCurrentGames } = require('./database');

class ArbitrageBot {
    constructor() {
        this.isRunning = false;
        this.updateInterval = 30000; // 30 segundos por padrão
        this.opportunities = [];
        this.games = [];
        this.callbacks = {
            onNewOpportunities: [],
            onError: []
        };
    }

    // Iniciar o bot
    start() {
        if (this.isRunning) {
            console.log('Bot já está em execução');
            return;
        }

        console.log('Iniciando bot de arbitragem...');
        this.isRunning = true;
        this.update();
        
        // Configurar intervalo de atualização
        this.intervalId = setInterval(() => {
            this.update();
        }, this.updateInterval);
    }

    // Parar o bot
    stop() {
        if (!this.isRunning) {
            console.log('Bot já está parado');
            return;
        }

        console.log('Parando bot de arbitragem...');
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    // Atualizar intervalo
    setUpdateInterval(interval) {
        this.updateInterval = interval;
        if (this.isRunning && this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = setInterval(() => {
                this.update();
            }, this.updateInterval);
        }
    }

    // Registrar callbacks
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }

    // Remover callback
    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }

    // Atualizar dados
    async update() {
        try {
            console.log('Atualizando dados do bot...');

            // Buscar dados em paralelo
            const [arbitrageData, liveArbitrageData, gamesData] = await Promise.all([
                getArbitrageOpportunities(),
                getLiveArbitrageOpportunities(),
                getCurrentGames()
            ]);

            // Atualizar dados
            const newOpportunities = [...arbitrageData, ...liveArbitrageData];
            this.opportunities = newOpportunities;
            this.games = gamesData;

            // Notificar sobre novas oportunidades
            this.callbacks.onNewOpportunities.forEach(callback => {
                callback({
                    opportunities: newOpportunities,
                    games: gamesData,
                    timestamp: new Date()
                });
            });

            console.log(`Atualização concluída:
            - Oportunidades: ${newOpportunities.length}
            - Jogos: ${gamesData.length}
            `);
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            this.callbacks.onError.forEach(callback => {
                callback(error);
            });
        }
    }

    // Obter dados atuais
    getData() {
        return {
            opportunities: this.opportunities,
            games: this.games,
            isRunning: this.isRunning,
            updateInterval: this.updateInterval
        };
    }
}

// Criar instância única do bot
const bot = new ArbitrageBot();

module.exports = bot; 