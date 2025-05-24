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

        db.run(`CREATE TABLE IF NOT EXISTS user_configs (
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