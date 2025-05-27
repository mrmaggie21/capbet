require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const schedule = require('node-schedule');
const { startServer } = require('./server');
const { saveOdds, saveArbitrageOpportunity } = require('./database');

// Configuração do bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_HOST = 'https://api.the-odds-api.com';
const REFRESH_INTERVAL = process.env.REFRESH_INTERVAL || 300000; // 5 minutos por padrão

// Cache para armazenar os usuários ativos
const activeUsers = new Set();

// Função para calcular oportunidades de arbitragem
function calculateArbitrage(odds) {
    console.log(`Calculando arbitragem para ${odds.length} jogos`);
    const arbitrageOpportunities = [];
    
    for (const game of odds) {
        const bookmakerOdds = {};
        
        // Agrupa as odds por resultado
        game.bookmakers.forEach(bookmaker => {
            const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
            if (h2hMarket) {
                h2hMarket.outcomes.forEach(outcome => {
                    if (!bookmakerOdds[outcome.name]) {
                        bookmakerOdds[outcome.name] = [];
                    }
                    bookmakerOdds[outcome.name].push({
                        bookmaker: bookmaker.title,
                        odds: outcome.price
                    });
                });
            }
        });

        // Encontra as melhores odds para cada resultado
        for (const [team, odds] of Object.entries(bookmakerOdds)) {
            const bestOdds = odds.reduce((best, current) => 
                current.odds > best.odds ? current : best
            );
            bookmakerOdds[team] = bestOdds;
        }

        // Calcula a arbitragem
        const outcomes = Object.values(bookmakerOdds);
        if (outcomes.length >= 2) {
            const arbitrageSum = outcomes.reduce((sum, outcome) => 
                sum + (1 / outcome.odds), 0
            );

            if (arbitrageSum < 1) {
                const profit = ((1 / arbitrageSum) - 1) * 100;
                const opportunity = {
                    game_id: game.id,
                    home_team: game.home_team,
                    away_team: game.away_team,
                    odds: bookmakerOdds,
                    profit: profit.toFixed(2),
                    commence_time: game.commence_time
                };
                
                arbitrageOpportunities.push(opportunity);
                saveArbitrageOpportunity(opportunity);
                console.log(`Oportunidade de arbitragem encontrada: ${game.home_team} vs ${game.away_team} - Lucro: ${profit.toFixed(2)}% - Data: ${new Date(game.commence_time).toLocaleString()}`);
            }
        }

        // Salvar odds no banco de dados
        saveOdds(game);
    }

    return arbitrageOpportunities;
}

// Função para buscar odds
async function fetchOdds(sport = 'soccer_brazil_campeonato') {
    try {
        console.log(`Buscando odds para ${sport}`);
        const response = await axios.get(`${ODDS_API_HOST}/v4/sports/${sport}/odds`, {
            params: {
                apiKey: ODDS_API_KEY,
                regions: 'eu',
                markets: 'h2h',
                oddsFormat: 'decimal'
            }
        });
        console.log(`Odds recebidas: ${response.data.length} jogos`);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar odds:', error.message);
        if (error.response) {
            console.error('Resposta da API:', error.response.data);
        }
        return [];
    }
}

// Função para buscar esportes disponíveis
async function fetchSports() {
    try {
        console.log('Buscando esportes disponíveis');
        const response = await axios.get(`${ODDS_API_HOST}/v4/sports`, {
            params: {
                apiKey: ODDS_API_KEY
            }
        });
        console.log(`Esportes encontrados: ${response.data.length}`);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar esportes:', error.message);
        if (error.response) {
            console.error('Resposta da API:', error.response.data);
        }
        return [];
    }
}

// Função para enviar atualizações aos usuários
async function sendArbitrageUpdates() {
    console.log('Iniciando atualização de odds e arbitragem');
    const odds = await fetchOdds();
    const opportunities = calculateArbitrage(odds);

    activeUsers.forEach(userId => {
        if (opportunities.length > 0) {
            opportunities.forEach(opp => {
                const message = `🎯 Oportunidade de Arbitragem Encontrada!\n\n` +
                    `🏆 Jogo: ${opp.home_team} vs ${opp.away_team}\n` +
                    `⏰ Data: ${new Date(opp.commence_time).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/Sao_Paulo'
                    })}\n` +
                    `💰 Lucro Potencial: ${opp.profit}%\n\n` +
                    `📊 Melhores Odds:\n` +
                    Object.entries(opp.odds).map(([team, data]) => 
                        `${team}: ${data.odds} (${data.bookmaker})`
                    ).join('\n');

                bot.sendMessage(userId, message);
            });
        }
    });
}

// Comandos do bot
bot.onText(/\/start/, (msg) => {
    const userId = msg.from.id;
    activeUsers.add(userId);
    bot.sendMessage(userId, 
        'Bem-vindo ao Bot de Arbitragem! 🤖\n\n' +
        'Você receberá notificações sobre oportunidades de arbitragem.\n' +
        'Use /stop para parar as notificações.\n' +
        'Use /sports para ver os esportes disponíveis.'
    );
});

bot.onText(/\/stop/, (msg) => {
    const userId = msg.from.id;
    activeUsers.delete(userId);
    bot.sendMessage(userId, 'Notificações desativadas. Use /start para ativá-las novamente.');
});

bot.onText(/\/sports/, async (msg) => {
    const userId = msg.from.id;
    const sports = await fetchSports();
    
    const message = sports
        .filter(sport => sport.active)
        .map(sport => `${sport.title} (${sport.key})`)
        .join('\n');

    bot.sendMessage(userId, 
        '🎮 Esportes Disponíveis:\n\n' + message
    );
});

// Executa uma atualização inicial
sendArbitrageUpdates();

// Agenda a verificação periódica de oportunidades
schedule.scheduleJob(`*/${REFRESH_INTERVAL/60000} * * * *`, sendArbitrageUpdates);

// Inicia o servidor do dashboard
startServer();

console.log('Bot de arbitragem e dashboard iniciados!'); 