const express = require('express');
const path = require('path');
const session = require('express-session');
const { getRecentOdds, getArbitrageOpportunities, getCurrentGames, getTeamOddsHistory, getTeamStats, getGameScore, saveGameScore, getLiveArbitrageOpportunities, createUser, validateUser, getUserConfig, saveUserConfig } = require('./database');
const configManager = require('./config');
const bot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para processar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração da sessão
app.use(session({
    secret: 'capbet-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    },
    name: 'capbet.sid'
}));

// Middleware para verificar autenticação
function requireAuth(req, res, next) {
    console.log('Verificando autenticação:', req.session);
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Não autorizado' });
    }
}

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rota para a página de login
app.get('/login', (req, res) => {
    if (req.session.userId) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, '../public/login.html'));
    }
});

// Rota para a página principal (protegida)
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    } else {
        res.redirect('/login');
    }
});

// API para login
app.post('/api/login', async (req, res) => {
    console.log('Tentativa de login:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
        console.log('Credenciais faltando');
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }
    
    try {
        const userId = await validateUser(username, password);
        console.log('Resultado da validação:', userId);
        
        if (userId) {
            req.session.userId = userId;
            req.session.username = username;
            await new Promise((resolve) => req.session.save(resolve));
            console.log('Sessão criada:', req.session);
            res.json({ success: true });
        } else {
            console.log('Validação falhou');
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// API para logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// API para registro (desativado por padrão)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }
    
    const success = createUser(username, password);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// API para obter configurações do bot (por usuário)
app.get('/api/bot-config', requireAuth, async (req, res) => {
    try {
        const config = await getUserConfig(req.session.userId);
        res.json(config);
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para atualizar configurações do bot (por usuário)
app.post('/api/bot-config', requireAuth, async (req, res) => {
    try {
        console.log('Recebendo novas configurações:', req.body);
        const config = await saveUserConfig(req.session.userId, req.body);
        
        // Atualizar intervalo do bot se necessário
        if (config.updateInterval) {
            bot.setUpdateInterval(config.updateInterval);
        }
        
        console.log('Configurações salvas com sucesso');
        res.json({ success: true, config });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

// API para obter odds recentes
app.get('/api/odds', requireAuth, async (req, res) => {
    try {
        const odds = await getRecentOdds();
        console.log(`Odds encontradas: ${odds.length}`);
        res.json(odds);
    } catch (error) {
        console.error('Erro ao buscar odds:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para obter jogos atuais do Brasileirão
app.get('/api/current-games', requireAuth, (req, res) => {
    const data = bot.getData();
    res.json(data.games);
});

// API para obter histórico de odds por time
app.get('/api/team-history/:team', requireAuth, async (req, res) => {
    try {
        const history = await getTeamOddsHistory(req.params.team);
        console.log(`Histórico encontrado para ${req.params.team}: ${history.length} registros`);
        res.json(history);
    } catch (error) {
        console.error('Erro ao buscar histórico do time:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para obter estatísticas de um time
app.get('/api/team-stats/:team', requireAuth, async (req, res) => {
    try {
        const stats = await getTeamStats(req.params.team);
        console.log(`Estatísticas encontradas para ${req.params.team}:`, stats);
        res.json(stats);
    } catch (error) {
        console.error('Erro ao buscar estatísticas do time:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para obter oportunidades de arbitragem
app.get('/api/arbitrage', requireAuth, async (req, res) => {
    try {
        // Buscar configurações do usuário
        const userConfig = await getUserConfig(req.session.userId);
        
        // Filtrar oportunidades baseado nas configurações
        const opportunities = bot.getData().opportunities;
        const filteredOpportunities = opportunities.filter(opp => {
            // Log para cada oportunidade
            console.log('\nAnalisando oportunidade:', {
                times: `${opp.home_team} vs ${opp.away_team}`,
                lucro: opp.profit_percentage,
                casas: [opp.home_bookmaker, opp.away_bookmaker, opp.draw_bookmaker].filter(Boolean)
            });

            // Verificar lucro mínimo
            if (opp.profit_percentage < userConfig.minProfitPercentage) {
                console.log(`Filtrado por lucro mínimo: ${opp.profit_percentage}% < ${userConfig.minProfitPercentage}%`);
                return false;
            }

            // Verificar se as casas de apostas estão habilitadas
            const bookmakers = [opp.home_bookmaker, opp.away_bookmaker];
            if (opp.draw_bookmaker) bookmakers.push(opp.draw_bookmaker);
            
            // Se "todas" estiver marcado, aceita qualquer casa
            if (!userConfig.bookmakers.all) {
                const allBookmakersEnabled = bookmakers.every(bm => {
                    const bmKey = bm.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const isEnabled = userConfig.bookmakers[bmKey];
                    if (!isEnabled) {
                        console.log(`Casa de apostas desabilitada: ${bm}`);
                    }
                    return isEnabled;
                });
                
                if (!allBookmakersEnabled) {
                    return false;
                }
            }

            // Verificar tipo de arbitragem
            if (opp.home_score !== undefined) { // É uma arbitragem ao vivo
                if (!userConfig.arbitrageTypes.live) {
                    console.log('Filtrado: arbitragem ao vivo desabilitada');
                    return false;
                }
            } else { // É uma arbitragem padrão
                if (!userConfig.arbitrageTypes.standard) {
                    console.log('Filtrado: arbitragem padrão desabilitada');
                    return false;
                }
            }

            // Verificar limites de odds
            const odds = [opp.home_odds, opp.away_odds];
            if (opp.draw_odds) odds.push(opp.draw_odds);
            
            const allOddsWithinLimits = odds.every(odd => {
                const isWithinLimits = odd >= userConfig.oddsLimits.min && odd <= userConfig.oddsLimits.max;
                if (!isWithinLimits) {
                    console.log(`Odd fora dos limites: ${odd} (min: ${userConfig.oddsLimits.min}, max: ${userConfig.oddsLimits.max})`);
                }
                return isWithinLimits;
            });
            
            if (!allOddsWithinLimits) {
                return false;
            }

            // Verificar esporte
            if (!userConfig.sports.soccer) {
                console.log('Filtrado: futebol desabilitado');
                return false;
            }

            // Verificar liga específica
            const league = opp.sport_key || 'soccer_brazil_campeonato';
            if (!userConfig.leagues[league]) {
                console.log(`Filtrado: liga desabilitada (${league})`);
                return false;
            }

            console.log('Oportunidade aceita!');
            return true;
        });

        console.log(`\nResumo do filtro:
        - Total de oportunidades: ${opportunities.length}
        - Oportunidades após filtro: ${filteredOpportunities.length}
        - Configurações aplicadas:
          * Lucro mínimo: ${userConfig.minProfitPercentage}%
          * Todas as casas: ${userConfig.bookmakers.all ? 'Sim' : 'Não'}
          * Arbitragem ao vivo: ${userConfig.arbitrageTypes.live ? 'Sim' : 'Não'}
          * Arbitragem padrão: ${userConfig.arbitrageTypes.standard ? 'Sim' : 'Não'}
          * Odds: min ${userConfig.oddsLimits.min} / max ${userConfig.oddsLimits.max}
        `);

        res.json(filteredOpportunities);
    } catch (error) {
        console.error('Erro ao buscar oportunidades:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para obter oportunidades de arbitragem ao vivo
app.get('/api/live-arbitrage', requireAuth, (req, res) => {
    const data = bot.getData();
    const liveOpportunities = data.opportunities.filter(opp => opp.home_score !== undefined);
    res.json(liveOpportunities);
});

// API para obter placar do jogo
app.get('/api/game-score/:gameId', requireAuth, async (req, res) => {
    try {
        const score = await getGameScore(req.params.gameId);
        console.log(`Placar encontrado para jogo ${req.params.gameId}:`, score);
        res.json(score);
    } catch (error) {
        console.error('Erro ao buscar placar:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para atualizar placar do jogo
app.post('/api/game-score', requireAuth, async (req, res) => {
    try {
        const gameData = req.body;
        await saveGameScore(gameData);
        console.log('Placar atualizado:', gameData);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar placar:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para testar notificação por email
app.post('/api/test-notification/email', requireAuth, async (req, res) => {
    try {
        const { to, from } = req.body;
        
        if (!to || !from) {
            return res.status(400).json({ error: 'Configurações de email incompletas' });
        }

        // Aqui você pode usar nodemailer ou outro serviço de email
        // Por enquanto, apenas simularemos o envio
        console.log('Simulando envio de email de teste:', { to, from });
        
        // Simula um delay de 1 segundo
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res.json({ 
            success: true, 
            message: 'Email de teste enviado com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao testar email:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para testar notificação do Telegram
app.post('/api/test-notification/telegram', requireAuth, async (req, res) => {
    try {
        const { botToken, chatId } = req.body;
        
        if (!botToken || !chatId) {
            return res.status(400).json({ error: 'Configurações do Telegram incompletas' });
        }

        // Envia mensagem de teste para o Telegram
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: '🎲 CAPBET - Mensagem de Teste\n\nSe você está vendo esta mensagem, a configuração do bot está funcionando corretamente!'
            })
        });

        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.description || 'Erro ao enviar mensagem para o Telegram');
        }

        res.json({ 
            success: true, 
            message: 'Mensagem de teste enviada com sucesso' 
        });
    } catch (error) {
        console.error('Erro ao testar Telegram:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para enviar notificação por email
app.post('/api/send-notification/email', requireAuth, async (req, res) => {
    try {
        const { subject, message, to, from } = req.body;
        
        if (!to || !from || !subject || !message) {
            return res.status(400).json({ error: 'Parâmetros incompletos' });
        }

        // Aqui você pode usar nodemailer ou outro serviço de email
        // Por enquanto, apenas simularemos o envio
        console.log('Enviando email:', { to, from, subject, message });
        
        // Simula um delay de 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para enviar notificação do Telegram
app.post('/api/send-notification/telegram', requireAuth, async (req, res) => {
    try {
        const { message, botToken, chatId } = req.body;
        
        if (!botToken || !chatId || !message) {
            return res.status(400).json({ error: 'Parâmetros incompletos' });
        }

        // Envia mensagem para o Telegram
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();
        
        if (!data.ok) {
            throw new Error(data.description || 'Erro ao enviar mensagem para o Telegram');
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao enviar mensagem Telegram:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para obter lista de bookmakers disponíveis
app.get('/api/bookmakers', requireAuth, async (req, res) => {
    try {
        // Lista de bookmakers disponíveis
        // Aqui você pode carregar dinamicamente do banco de dados se necessário
        const bookmakers = [
            { id: 'bet365', name: 'Bet365' },
            { id: 'betfair', name: 'Betfair' },
            { id: 'pinnacle', name: 'Pinnacle' },
            { id: 'williamhill', name: 'William Hill' },
            { id: 'sportingbet', name: 'Sportingbet' },
            { id: 'betway', name: 'Betway' },
            { id: '1xbet', name: '1xBet' },
            { id: '888sport', name: '888sport' },
            { id: 'marathonbet', name: 'MarathonBet' },
            { id: 'coral', name: 'Coral' },
            { id: 'ladbrokes', name: 'Ladbrokes' },
            { id: 'unibet', name: 'Unibet' },
            { id: 'bwin', name: 'Bwin' },
            { id: 'paddypower', name: 'Paddy Power' }
        ];

        res.json(bookmakers);
    } catch (error) {
        console.error('Erro ao buscar bookmakers:', error);
        res.status(500).json({ error: error.message });
    }
});

function startServer() {
    // Iniciar o bot antes de iniciar o servidor
    bot.start();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Dashboard disponível em http://localhost:${PORT}`);
        console.log('Diretório público:', path.join(__dirname, '../public'));
    });
}

// Garantir que o bot seja parado quando o servidor for encerrado
process.on('SIGINT', () => {
    console.log('Encerrando servidor e bot...');
    bot.stop();
    process.exit();
});

process.on('SIGTERM', () => {
    console.log('Encerrando servidor e bot...');
    bot.stop();
    process.exit();
});

module.exports = { startServer };