const fs = require('fs');
const path = require('path');

const defaultConfig = {
    // Configurações gerais
    updateInterval: 30000, // Intervalo de atualização em milissegundos
    minProfitPercentage: 2.0, // Lucro mínimo para notificar oportunidade
    
    // Configurações de apostas
    baseStake: 100, // Valor base para cálculos de apostas
    maxStakePerBet: 1000, // Valor máximo por aposta
    maxTotalStake: 5000, // Valor máximo total em apostas simultâneas
    
    // Configurações de arbitragem
    arbitrageTypes: {
        standard: true, // Arbitragem padrão (1x2)
        live: true, // Arbitragem ao vivo
        asian: false // Arbitragem com handicap asiático
    },
    
    // Casas de apostas habilitadas
    bookmakers: {
        bet365: true,
        betfair: true,
        pinnacle: true,
        williamhill: true,
        '1xbet': true,
        // Adicione mais casas conforme necessário
    },
    
    // Configurações de notificação
    notifications: {
        email: false,
        telegram: false,
        desktop: true,
        emailConfig: {
            to: '',
            from: ''
        },
        telegramConfig: {
            botToken: '',
            chatId: ''
        }
    },
    
    // Limites de odds
    oddsLimits: {
        min: 1.1,
        max: 10.0
    },
    
    // Esportes monitorados
    sports: {
        soccer: true,
        basketball: false,
        tennis: false,
        volleyball: false
    },
    
    // Ligas/competições monitoradas
    leagues: {
        'soccer_brazil_campeonato': true,
        'soccer_brazil_serie_b': true,
        'soccer_libertadores': true,
        'soccer_copa_brasil': true
    }
};

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '../data/bot_config.json');
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const savedConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                return { ...defaultConfig, ...savedConfig };
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
        }
        return defaultConfig;
    }

    saveConfig(newConfig) {
        try {
            const mergedConfig = { ...this.config, ...newConfig };
            fs.writeFileSync(this.configPath, JSON.stringify(mergedConfig, null, 2));
            this.config = mergedConfig;
            return true;
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            return false;
        }
    }

    getConfig() {
        return this.config;
    }

    updateConfig(newConfig) {
        return this.saveConfig(newConfig);
    }
}

module.exports = new ConfigManager(); 