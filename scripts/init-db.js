const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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

// Garante que o diretório data existe
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'odds.db');

// Criar ou conectar ao banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao criar banco de dados:', err);
        process.exit(1);
    }
    console.log('Banco de dados criado/conectado com sucesso');
    initDatabase();
});

function initDatabase() {
    db.serialize(() => {
        // Criar tabelas
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`DROP TABLE IF EXISTS user_configs`);
        db.run(`CREATE TABLE IF NOT EXISTS user_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            config_json TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

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
            game_id TEXT UNIQUE,
            home_team TEXT,
            away_team TEXT,
            home_score INTEGER DEFAULT 0,
            away_score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'scheduled',
            start_time DATETIME,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Inserir dados de exemplo para jogos
        const sampleGames = [
            {
                game_id: 'game1',
                home_team: 'Flamengo',
                away_team: 'Palmeiras',
                sport_key: 'soccer_brazil_campeonato',
                bookmaker: 'bet365',
                home_odds: 2.1,
                away_odds: 3.2,
                draw_odds: 3.5
            },
            {
                game_id: 'game2',
                home_team: 'São Paulo',
                away_team: 'Corinthians',
                sport_key: 'soccer_brazil_campeonato',
                bookmaker: 'betfair',
                home_odds: 2.4,
                away_odds: 2.9,
                draw_odds: 3.3
            },
            {
                game_id: 'game3',
                home_team: 'Cruzeiro',
                away_team: 'Atlético-MG',
                sport_key: 'soccer_brazil_serie_b',
                bookmaker: 'bet365',
                home_odds: 2.2,
                away_odds: 3.1,
                draw_odds: 3.4
            },
            {
                game_id: 'game4',
                home_team: 'Vasco',
                away_team: 'Botafogo',
                sport_key: 'soccer_brazil_serie_b',
                bookmaker: 'betfair',
                home_odds: 2.3,
                away_odds: 3.0,
                draw_odds: 3.2
            }
        ];

        // Inserir jogos na tabela odds_history
        const insertOdds = db.prepare(`
            INSERT INTO odds_history (
                game_id, home_team, away_team, bookmaker,
                home_odds, away_odds, draw_odds, sport_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        sampleGames.forEach(game => {
            insertOdds.run(
                game.game_id,
                game.home_team,
                game.away_team,
                game.bookmaker,
                game.home_odds,
                game.away_odds,
                game.draw_odds,
                game.sport_key
            );
        });

        insertOdds.finalize();

        // Inserir placares na tabela game_scores
        const insertScores = db.prepare(`
            INSERT OR REPLACE INTO game_scores (
                game_id, home_team, away_team,
                home_score, away_score, status, start_time
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        sampleGames.forEach(game => {
            insertScores.run(
                game.game_id,
                game.home_team,
                game.away_team,
                0,
                0,
                'scheduled'
            );
        });

        insertScores.finalize();

        // Verificar se o usuário admin já existe
        db.get(`SELECT id, username, password FROM users WHERE username = ?`, ['admin'], (err, row) => {
            if (err) {
                console.error('Erro ao verificar usuário admin:', err);
                process.exit(1);
            }

            if (!row) {
                // Criar usuário admin se não existir
                const hashedPassword = crypto.createHash('sha256').update('admin123').digest('hex');
                console.log('Criando usuário admin com hash:', hashedPassword);
                
                db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, ['admin', hashedPassword], function(err) {
                    if (err) {
                        console.error('Erro ao criar usuário admin:', err);
                        process.exit(1);
                    }
                    
                    console.log('Usuário admin criado com sucesso, ID:', this.lastID);
                    createUserConfig(this.lastID);
                });
            } else {
                console.log('Usuário admin já existe:', row);
                createUserConfig(row.id);
            }
        });
    });
}

function createUserConfig(userId) {
    // Verificar se já existe configuração
    db.get(`SELECT id FROM user_configs WHERE user_id = ?`, [userId], (err, row) => {
        if (err) {
            console.error('Erro ao verificar configurações:', err);
            process.exit(1);
        }

        if (!row) {
            // Inserir configurações padrão
            db.run(
                `INSERT INTO user_configs (user_id, config_json) VALUES (?, ?)`,
                [userId, JSON.stringify(defaultConfig)],
                (err) => {
                    if (err) {
                        console.error('Erro ao criar configurações:', err);
                    } else {
                        console.log('Configurações padrão criadas com sucesso');
                    }
                    finishSetup();
                }
            );
        } else {
            console.log('Configurações já existem');
            finishSetup();
        }
    });
}

function finishSetup() {
    // Fechar conexão
    db.close((err) => {
        if (err) {
            console.error('Erro ao fechar banco de dados:', err);
        } else {
            console.log('Inicialização concluída com sucesso');
        }
        process.exit(0);
    });
} 