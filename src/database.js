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
    // Primeiro, vamos fazer backup dos dados existentes
    db.serialize(() => {
        // Criar tabela temporária para backup
        db.run(`CREATE TABLE IF NOT EXISTS arbitrage_opportunities_backup AS SELECT * FROM arbitrage_opportunities`);
        
        // Dropar a tabela antiga
        db.run(`DROP TABLE IF EXISTS arbitrage_opportunities`);
        
        // Criar a nova tabela com a coluna commence_time
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
            commence_time DATETIME,
            sport_key TEXT DEFAULT 'soccer_brazil_campeonato',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Restaurar dados do backup
        db.run(`INSERT INTO arbitrage_opportunities (
            id, game_id, home_team, away_team,
            home_odds, away_odds, draw_odds,
            home_bookmaker, away_bookmaker, draw_bookmaker,
            profit_percentage, commence_time, sport_key, timestamp
        ) SELECT * FROM arbitrage_opportunities_backup`);
        
        // Remover tabela de backup
        db.run(`DROP TABLE IF EXISTS arbitrage_opportunities_backup`);
    });

    // Criar outras tabelas se não existirem
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

    db.run(`CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        home_team TEXT,
        away_team TEXT,
        sport_key TEXT DEFAULT 'soccer_brazil_campeonato',
        league_key TEXT,
        home_score INTEGER DEFAULT 0,
        away_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'scheduled',
        start_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    // Formata a data para o formato ISO
    const commence_time = new Date(opportunity.commence_time).toISOString();

    // Prepara a query
    const query = `
        INSERT INTO arbitrage_opportunities (
            game_id, home_team, away_team,
            home_odds, away_odds, draw_odds,
            home_bookmaker, away_bookmaker, draw_bookmaker,
            profit_percentage, commence_time, sport_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
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
        commence_time,
        sportKey
    ];

    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) {
                console.error('Erro ao salvar oportunidade:', err);
                reject(err);
            } else {
                console.log('Oportunidade salva com sucesso!');
                resolve(this.lastID);
            }
        });
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

function getCurrentGames(sportKey = 'soccer_brazil_campeonato') {
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
            WHERE oh.sport_key = ?
            AND oh.timestamp >= datetime('now', '-1 day')
            ORDER BY oh.timestamp DESC
        `, [sportKey], (err, rows) => {
            if (err) {
                console.error('Erro ao buscar jogos:', err);
                reject(err);
            } else {
                const games = rows.map(row => ({
                    ...row,
                    home_score: row.home_score || 0,
                    away_score: row.away_score || 0,
                    status: row.status || 'scheduled'
                }));
                console.log(`Jogos encontrados para ${sportKey}:`, games);
                resolve(games);
            }
        });
    });
}

// Função para formatar o nome da liga
function getFormattedLeagueName(league) {
    const leagueMap = {
        'soccer_brazil_campeonato': 'Campeonato Brasileiro Série A',
        'soccer_brazil_serie_b': 'Campeonato Brasileiro Série B',
        'soccer_libertadores': 'CONMEBOL Libertadores',
        'soccer_copa_brasil': 'Copa do Brasil',
        'soccer_brazil_carioca': 'Campeonato Carioca',
        'soccer_brazil_paulista': 'Campeonato Paulista',
        'soccer_brazil_gaucho': 'Campeonato Gaúcho',
        'soccer_brazil_mineiro': 'Campeonato Mineiro'
    };

    return leagueMap[league] || league;
}

// Atualizar a função que busca oportunidades de arbitragem
async function getArbitrageOpportunities(limit = 50, sportKey = 'soccer_brazil_campeonato') {
    try {
        console.log(`Buscando oportunidades de arbitragem para ${sportKey}, limite: ${limit}`);
        const opportunities = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    id,
                    game_id,
                    home_team,
                    away_team,
                    home_odds,
                    away_odds,
                    draw_odds,
                    home_bookmaker,
                    away_bookmaker,
                    draw_bookmaker,
                    profit_percentage,
                    commence_time,
                    timestamp,
                    sport_key
                FROM arbitrage_opportunities
                WHERE sport_key = ?
                AND timestamp >= datetime('now', '-1 hour')
                ORDER BY timestamp DESC
                LIMIT ?
            `;
            console.log('Executando query:', query);
            db.all(query, [sportKey, limit], (err, rows) => {
                if (err) {
                    console.error('Erro na query:', err);
                    reject(err);
                } else {
                    console.log(`${rows.length} oportunidades encontradas no banco`);
                    resolve(rows);
                }
            });
        });

        // Adicionar o nome formatado da liga e formatar a data
        const formattedOpportunities = opportunities.map(opp => ({
            ...opp,
            league_name: getFormattedLeagueName(opp.sport_key),
            commence_time: opp.commence_time
        }));

        console.log('Oportunidades formatadas:', formattedOpportunities.length);
        return formattedOpportunities;
    } catch (error) {
        console.error('Erro ao buscar oportunidades de arbitragem:', error);
        throw error;
    }
}

// Atualizar a função que busca oportunidades ao vivo
async function getLiveArbitrageOpportunities(limit = 50) {
    try {
        const opportunities = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    id,
                    game_id,
                    home_team,
                    away_team,
                    home_odds,
                    away_odds,
                    draw_odds,
                    home_bookmaker,
                    away_bookmaker,
                    draw_bookmaker,
                    profit_percentage,
                    commence_time,
                    timestamp,
                    sport_key
                FROM arbitrage_opportunities
                WHERE game_id IN (
                    SELECT game_id FROM game_scores
                    WHERE status = 'in_progress'
                )
                ORDER BY timestamp DESC
                LIMIT ?
            `, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Adicionar o nome formatado da liga e formatar a data
        return opportunities.map(opp => ({
            ...opp,
            league_name: getFormattedLeagueName(opp.sport_key),
            commence_time: opp.commence_time
        }));
    } catch (error) {
        console.error('Erro ao buscar oportunidades de arbitragem ao vivo:', error);
        throw error;
    }
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
    minProfitPercentage: 0.1,
    baseStake: 100,
    maxStakePerBet: 1000,
    maxTotalStake: 5000,
    arbitrageTypes: {
        standard: true,
        live: true,
        asian: false
    },
    bookmakers: {
        all: true,
        bet365: true,
        betfair: true,
        pinnacle: true,
        williamhill: true,
        betway: true,
        sportingbet: true,
        rivalo: true,
        netbet: true
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
        soccer: true
    },
    leagues: {
        soccer_brazil_campeonato: true,
        soccer_brazil_serie_b: true,
        soccer_libertadores: false,
        soccer_copa_brasil: false
    },
    markets: {
        h2h: true,
        spreads: true,
        totals: true,
        h2h_h1: true,
        draw_no_bet: true,
        double_chance: true,
        both_teams_to_score: true,
        half_time_full_time: true,
        half_betting: true
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
                                    leagues: { ...defaultConfig.leagues, ...config.leagues },
                                    markets: { ...defaultConfig.markets, ...config.markets }
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
                    leagues: { ...defaultConfig.leagues, ...config.leagues },
                    markets: { ...defaultConfig.markets, ...config.markets }
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