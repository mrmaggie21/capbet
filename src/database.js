const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Garante que o diretório data existe
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(path.join(dataDir, 'odds.db'), (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conectado ao banco de dados SQLite');
        createTables();
    }
});

function createTables() {
    db.run(`CREATE TABLE IF NOT EXISTS odds_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT,
        home_team TEXT,
        away_team TEXT,
        bookmaker TEXT,
        home_odds REAL,
        away_odds REAL,
        draw_odds REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        sport_key TEXT DEFAULT 'soccer_brazil_campeonato'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT,
        home_team TEXT,
        away_team TEXT,
        home_odds REAL,
        away_odds REAL,
        draw_odds REAL,
        home_bookmaker TEXT,
        away_bookmaker TEXT,
        draw_bookmaker TEXT,
        profit_percentage REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        sport_key TEXT DEFAULT 'soccer_brazil_campeonato'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS game_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT,
        home_team TEXT,
        away_team TEXT,
        home_score INTEGER DEFAULT 0,
        away_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'scheduled',
        start_time DATETIME,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_id)
    )`);

    // Tabela de usuários
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabela de configurações por usuário
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_configs (
            user_id INTEGER NOT NULL,
            config_json TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
}

function saveOdds(gameData, sportKey = 'soccer_brazil_campeonato') {
    const stmt = db.prepare(`
        INSERT INTO odds_history (
            game_id, home_team, away_team, bookmaker,
            home_odds, away_odds, draw_odds, sport_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    gameData.bookmakers.forEach(bookmaker => {
        const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
        if (h2hMarket) {
            const odds = {
                home: 0,
                away: 0,
                draw: 0
            };

            h2hMarket.outcomes.forEach(outcome => {
                if (outcome.name === gameData.home_team) odds.home = outcome.price;
                else if (outcome.name === gameData.away_team) odds.away = outcome.price;
                else odds.draw = outcome.price;
            });

            stmt.run(
                gameData.id,
                gameData.home_team,
                gameData.away_team,
                bookmaker.title,
                odds.home,
                odds.away,
                odds.draw,
                sportKey
            );
        }
    });

    stmt.finalize();
}

function saveArbitrageOpportunity(opportunity, sportKey = 'soccer_brazil_campeonato') {
    console.log('Salvando oportunidade:', opportunity);
    
    // Encontra as odds para cada resultado
    const homeTeamOdds = opportunity.odds[opportunity.home_team] || { odds: 0, bookmaker: '' };
    const awayTeamOdds = opportunity.odds[opportunity.away_team] || { odds: 0, bookmaker: '' };
    const drawOdds = opportunity.odds.Draw || { odds: 0, bookmaker: '' };

    // Prepara a query
    const query = `
        INSERT INTO arbitrage_opportunities (
            game_id, home_team, away_team,
            home_odds, away_odds, draw_odds,
            home_bookmaker, away_bookmaker, draw_bookmaker,
            profit_percentage, sport_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Executa a query diretamente
    db.run(query, [
        opportunity.game_id,
        opportunity.home_team,
        opportunity.away_team,
        homeTeamOdds.odds,
        awayTeamOdds.odds,
        drawOdds.odds,
        homeTeamOdds.bookmaker,
        awayTeamOdds.bookmaker,
        drawOdds.bookmaker,
        parseFloat(opportunity.profit),
        sportKey
    ], function(err) {
        if (err) {
            console.error('Erro ao salvar oportunidade:', err);
            console.error('Dados:', {
                game_id: opportunity.game_id,
                home_team: opportunity.home_team,
                away_team: opportunity.away_team,
                home_odds: homeTeamOdds.odds,
                away_odds: awayTeamOdds.odds,
                draw_odds: drawOdds.odds,
                home_bookmaker: homeTeamOdds.bookmaker,
                away_bookmaker: awayTeamOdds.bookmaker,
                draw_bookmaker: drawOdds.bookmaker,
                profit: parseFloat(opportunity.profit)
            });
        }
    });
}

function getRecentOdds(limit = 100, sportKey = 'soccer_brazil_campeonato') {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM odds_history
            WHERE sport_key = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `, [sportKey, limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getTeamOddsHistory(team, limit = 50) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM odds_history
            WHERE (home_team = ? OR away_team = ?)
            AND sport_key = 'soccer_brazil_campeonato'
            ORDER BY timestamp DESC
            LIMIT ?
        `, [team, team, limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getCurrentGames() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT DISTINCT 
                oh.home_team, 
                oh.away_team, 
                oh.game_id,
                gs.home_score,
                gs.away_score,
                gs.status,
                gs.start_time
            FROM odds_history oh
            LEFT JOIN game_scores gs ON oh.game_id = gs.game_id
            WHERE oh.sport_key = 'soccer_brazil_campeonato'
            AND oh.timestamp >= datetime('now', '-1 day')
            ORDER BY oh.timestamp DESC
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(row => ({
                ...row,
                home_score: row.home_score || 0,
                away_score: row.away_score || 0,
                status: row.status || 'scheduled'
            })));
        });
    });
}

function getArbitrageOpportunities(limit = 50, sportKey = 'soccer_brazil_campeonato') {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM arbitrage_opportunities
            WHERE sport_key = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `, [sportKey, limit], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getTeamStats(team) {
    return new Promise((resolve, reject) => {
        db.all(`
            WITH team_odds AS (
                SELECT 
                    CASE 
                        WHEN home_team = ? THEN home_odds 
                        WHEN away_team = ? THEN away_odds 
                    END as odd,
                    bookmaker,
                    timestamp
                FROM odds_history
                WHERE (home_team = ? OR away_team = ?)
                AND timestamp >= datetime('now', '-1 day')
            )
            SELECT 
                AVG(odd) as avg_odd,
                MIN(odd) as min_odd,
                MAX(odd) as max_odd,
                (SELECT odd FROM team_odds ORDER BY timestamp DESC LIMIT 1) as current_odd
            FROM team_odds
            WHERE odd IS NOT NULL
        `, [team, team, team, team], async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                // Buscar odds atuais por casa de apostas
                const bookmakers = await new Promise((resolve, reject) => {
                    db.all(`
                        SELECT DISTINCT 
                            bookmaker as name,
                            CASE 
                                WHEN home_team = ? THEN home_odds 
                                WHEN away_team = ? THEN away_odds 
                            END as odd,
                            timestamp as updated_at
                        FROM odds_history
                        WHERE (home_team = ? OR away_team = ?)
                        AND timestamp >= datetime('now', '-1 hour')
                        ORDER BY timestamp DESC
                    `, [team, team, team, team], (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                const stats = rows[0];
                if (!stats.current_odd) {
                    resolve({
                        current_odd: 0,
                        avg_odd: 0,
                        min_odd: 0,
                        max_odd: 0,
                        variation: 0,
                        bookmakers: []
                    });
                    return;
                }

                // Calcular variação
                const variation = ((stats.current_odd - stats.avg_odd) / stats.avg_odd) * 100;

                resolve({
                    current_odd: stats.current_odd,
                    avg_odd: stats.avg_odd,
                    min_odd: stats.min_odd,
                    max_odd: stats.max_odd,
                    variation: variation,
                    bookmakers: bookmakers.filter(bm => bm.odd !== null)
                });
            } catch (error) {
                reject(error);
            }
        });
    });
}

function saveGameScore(gameData) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT OR REPLACE INTO game_scores (
                game_id, home_team, away_team,
                home_score, away_score, status, start_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(query, [
            gameData.id,
            gameData.home_team,
            gameData.away_team,
            gameData.home_score || 0,
            gameData.away_score || 0,
            gameData.status || 'scheduled',
            gameData.start_time
        ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function getGameScore(gameId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT 
                home_team,
                away_team,
                home_score,
                away_score,
                status,
                start_time,
                timestamp as last_update
            FROM game_scores
            WHERE game_id = ?
        `, [gameId], (err, row) => {
            if (err) reject(err);
            else resolve(row || {
                home_score: 0,
                away_score: 0,
                status: 'scheduled'
            });
        });
    });
}

function getLiveArbitrageOpportunities() {
    return new Promise((resolve, reject) => {
        db.all(`
            WITH live_games AS (
                SELECT 
                    game_id,
                    home_team,
                    away_team,
                    home_score,
                    away_score
                FROM game_scores
                WHERE status = 'in_progress'
                AND ((home_score = 2 AND away_score = 1) OR (home_score = 1 AND away_score = 2))
            ),
            current_odds AS (
                SELECT 
                    oh.game_id,
                    oh.home_team,
                    oh.away_team,
                    oh.bookmaker,
                    oh.home_odds,
                    oh.away_odds,
                    oh.draw_odds,
                    oh.timestamp,
                    ROW_NUMBER() OVER (PARTITION BY oh.game_id, oh.bookmaker ORDER BY oh.timestamp DESC) as rn
                FROM odds_history oh
                JOIN live_games lg ON oh.game_id = lg.game_id
                WHERE oh.timestamp >= datetime('now', '-5 minutes')
            )
            SELECT 
                co.*,
                lg.home_score,
                lg.away_score
            FROM current_odds co
            JOIN live_games lg ON co.game_id = lg.game_id
            WHERE rn = 1
            ORDER BY co.timestamp DESC
        `, [], async (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            try {
                const opportunities = [];
                const groupedByGame = {};

                // Agrupar odds por jogo
                rows.forEach(row => {
                    if (!groupedByGame[row.game_id]) {
                        groupedByGame[row.game_id] = {
                            game_id: row.game_id,
                            home_team: row.home_team,
                            away_team: row.away_team,
                            home_score: row.home_score,
                            away_score: row.away_score,
                            bookmakers: []
                        };
                    }
                    groupedByGame[row.game_id].bookmakers.push({
                        name: row.bookmaker,
                        home_odds: row.home_odds,
                        away_odds: row.away_odds,
                        draw_odds: row.draw_odds
                    });
                });

                // Analisar oportunidades para cada jogo
                Object.values(groupedByGame).forEach(game => {
                    const isHomeWinning = game.home_score > game.away_score;
                    const bestOdds = {
                        winning_team: { odds: 0, bookmaker: '' },
                        losing_team: { odds: 0, bookmaker: '' },
                        draw: { odds: 0, bookmaker: '' }
                    };

                    // Encontrar as melhores odds
                    game.bookmakers.forEach(bm => {
                        if (isHomeWinning) {
                            if (bm.away_odds > bestOdds.losing_team.odds) {
                                bestOdds.losing_team = { odds: bm.away_odds, bookmaker: bm.name };
                            }
                            if (bm.home_odds > bestOdds.winning_team.odds) {
                                bestOdds.winning_team = { odds: bm.home_odds, bookmaker: bm.name };
                            }
                        } else {
                            if (bm.home_odds > bestOdds.losing_team.odds) {
                                bestOdds.losing_team = { odds: bm.home_odds, bookmaker: bm.name };
                            }
                            if (bm.away_odds > bestOdds.winning_team.odds) {
                                bestOdds.winning_team = { odds: bm.away_odds, bookmaker: bm.name };
                            }
                        }
                        if (bm.draw_odds > bestOdds.draw.odds) {
                            bestOdds.draw = { odds: bm.draw_odds, bookmaker: bm.name };
                        }
                    });

                    // Calcular arbitragem
                    const winningStake = 100; // Aposta base de 100
                    const losingStake = winningStake * (bestOdds.winning_team.odds / bestOdds.losing_team.odds);
                    const drawStake = winningStake * (bestOdds.winning_team.odds / bestOdds.draw.odds);
                    const totalStake = winningStake + losingStake + drawStake;
                    const potentialReturn = winningStake * bestOdds.winning_team.odds;
                    const profit = ((potentialReturn / totalStake) - 1) * 100;

                    // Se houver oportunidade de lucro
                    if (profit > 0) {
                        opportunities.push({
                            game_id: game.game_id,
                            home_team: game.home_team,
                            away_team: game.away_team,
                            home_score: game.home_score,
                            away_score: game.away_score,
                            profit_percentage: profit,
                            winning_team: isHomeWinning ? game.home_team : game.away_team,
                            winning_odds: bestOdds.winning_team,
                            losing_odds: bestOdds.losing_team,
                            draw_odds: bestOdds.draw,
                            suggested_stakes: {
                                winning: Math.round(winningStake),
                                losing: Math.round(losingStake),
                                draw: Math.round(drawStake)
                            }
                        });
                    }
                });

                resolve(opportunities);
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Funções para gerenciar usuários
function createUser(username, password) {
    const hashedPassword = require('crypto').createHash('sha256').update(password).digest('hex');
    try {
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        stmt.run(username, hashedPassword);
        return true;
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        return false;
    }
}

function validateUser(username, password) {
    console.log('Tentando validar usuário:', username);
    const hashedPassword = require('crypto').createHash('sha256').update(password).digest('hex');
    console.log('Hash da senha:', hashedPassword);
    
    return new Promise((resolve, reject) => {
        db.get('SELECT id, username, password FROM users WHERE username = ?', [username], (err, user) => {
            if (err) {
                console.error('Erro ao buscar usuário:', err);
                reject(err);
                return;
            }
            
            console.log('Usuário encontrado:', user);
            
            if (!user) {
                console.log('Usuário não encontrado');
                resolve(null);
                return;
            }
            
            if (user.password === hashedPassword) {
                console.log('Senha correta, retornando id:', user.id);
                resolve(user.id);
            } else {
                console.log('Senha incorreta');
                resolve(null);
            }
        });
    });
}

// Configurações padrão do usuário
const defaultConfig = {
    updateInterval: 5000,
    minProfitPercentage: 1.0,
    baseStake: 100,
    maxStakePerBet: 1000,
    maxTotalStake: 5000,
    arbitrageTypes: {
        standard: true,
        live: true,
        asian: false
    },
    bookmakers: {
        bet365: true,
        betfair: true,
        pinnacle: true,
        williamhill: false
    },
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
    oddsLimits: {
        min: 1.1,
        max: 10.0
    },
    sports: {
        soccer: true,
        basketball: false,
        tennis: false,
        volleyball: false
    },
    leagues: {
        soccer_brazil_campeonato: true,
        soccer_brazil_serie_b: false,
        soccer_libertadores: true,
        soccer_copa_brasil: true
    }
};

function getUserConfig(userId) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Buscando configurações para usuário:', userId);
            
            // Primeiro verifica se o usuário existe
            db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
                if (err) {
                    console.error('Erro ao verificar usuário:', err);
                    reject(new Error('Erro ao verificar usuário'));
                    return;
                }

                if (!user) {
                    console.error('Usuário não encontrado:', userId);
                    reject(new Error('Usuário não encontrado'));
                    return;
                }

                // Busca a configuração mais recente do usuário
                db.get(
                    `SELECT config_json, updated_at 
                     FROM user_configs 
                     WHERE user_id = ? 
                     ORDER BY updated_at DESC 
                     LIMIT 1`,
                    [userId],
                    async (err, row) => {
                        if (err) {
                            console.error('Erro ao buscar configuração:', err);
                            reject(err);
                            return;
                        }

                        if (!row) {
                            console.log('Nenhuma configuração encontrada, criando configuração padrão');
                            try {
                                // Se não encontrar configuração, criar uma nova com valores padrão
                                await new Promise((resolve, reject) => {
                                    const configJson = JSON.stringify(defaultConfig);
                                    db.run(
                                        'INSERT INTO user_configs (user_id, config_json, updated_at) VALUES (?, ?, datetime("now"))',
                                        [userId, configJson],
                                        (err) => {
                                            if (err) reject(err);
                                            else resolve();
                                        }
                                    );
                                });
                                console.log('Configuração padrão criada com sucesso');
                                resolve(defaultConfig);
                            } catch (error) {
                                console.error('Erro ao criar configuração padrão:', error);
                                reject(error);
                            }
                        } else {
                            try {
                                console.log('Configuração encontrada, atualizada em:', row.updated_at);
                                const config = JSON.parse(row.config_json);
                                // Mescla com as configurações padrão para garantir que todos os campos existam
                                const fullConfig = {
                                    ...defaultConfig,
                                    ...config,
                                    arbitrageTypes: { ...defaultConfig.arbitrageTypes, ...config.arbitrageTypes },
                                    bookmakers: { ...defaultConfig.bookmakers, ...config.bookmakers },
                                    notifications: {
                                        ...defaultConfig.notifications,
                                        ...config.notifications,
                                        emailConfig: { ...defaultConfig.notifications.emailConfig, ...config.notifications?.emailConfig },
                                        telegramConfig: { ...defaultConfig.notifications.telegramConfig, ...config.notifications?.telegramConfig }
                                    },
                                    oddsLimits: { ...defaultConfig.oddsLimits, ...config.oddsLimits },
                                    sports: { ...defaultConfig.sports, ...config.sports },
                                    leagues: { ...defaultConfig.leagues, ...config.leagues }
                                };
                                console.log('Configuração processada:', fullConfig);
                                resolve(fullConfig);
                            } catch (error) {
                                console.error('Erro ao fazer parse do JSON:', error);
                                reject(new Error('Configuração inválida no banco de dados'));
                            }
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Erro ao buscar configuração:', error);
            reject(error);
        }
    });
}

function saveUserConfig(userId, config) {
    return new Promise((resolve, reject) => {
        try {
            // Validar se o userId existe
            db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
                if (err) {
                    console.error('Erro ao verificar usuário:', err);
                    reject(new Error('Erro ao verificar usuário'));
                    return;
                }

                if (!user) {
                    reject(new Error('Usuário não encontrado'));
                    return;
                }

                // Validar e mesclar com configurações padrão
                const validConfig = {
                    ...defaultConfig,
                    ...config,
                    // Garantir que objetos aninhados sejam mesclados corretamente
                    arbitrageTypes: { ...defaultConfig.arbitrageTypes, ...config.arbitrageTypes },
                    bookmakers: { ...defaultConfig.bookmakers, ...config.bookmakers },
                    notifications: {
                        ...defaultConfig.notifications,
                        ...config.notifications,
                        emailConfig: { ...defaultConfig.notifications.emailConfig, ...config.notifications?.emailConfig },
                        telegramConfig: { ...defaultConfig.notifications.telegramConfig, ...config.notifications?.telegramConfig }
                    },
                    oddsLimits: { ...defaultConfig.oddsLimits, ...config.oddsLimits },
                    sports: { ...defaultConfig.sports, ...config.sports },
                    leagues: { ...defaultConfig.leagues, ...config.leagues }
                };

                // Converter para JSON
                const configJson = JSON.stringify(validConfig);

                // Inserir nova configuração com timestamp atualizado
                db.run(
                    'INSERT INTO user_configs (user_id, config_json, updated_at) VALUES (?, ?, datetime("now"))',
                    [userId, configJson],
                    function(err) {
                        if (err) {
                            console.error('Erro ao salvar configuração:', err);
                            reject(new Error('Erro ao salvar configuração no banco de dados'));
                            return;
                        }

                        console.log('Configuração salva com sucesso para usuário:', userId);
                        resolve(validConfig);
                    }
                );
            });
        } catch (error) {
            console.error('Erro ao processar configuração:', error);
            reject(new Error('Erro ao processar configuração'));
        }
    });
}

module.exports = {
    db,
    saveOdds,
    saveArbitrageOpportunity,
    getRecentOdds,
    getCurrentGames,
    getArbitrageOpportunities,
    getTeamOddsHistory,
    getTeamStats,
    saveGameScore,
    getGameScore,
    getLiveArbitrageOpportunities,
    createUser,
    validateUser,
    getUserConfig,
    saveUserConfig
}; 