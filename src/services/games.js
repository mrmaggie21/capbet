const { db } = require('../database');

// Função para obter jogos de uma liga específica
async function getGames(league) {
    try {
        // Mapear liga para sport_key
        const sportKeyMap = {
            'serie_a': 'soccer_brazil_campeonato',
            'serie_b': 'soccer_brazil_serie_b'
        };
        
        const sportKey = sportKeyMap[league];
        if (!sportKey) {
            throw new Error('Liga não suportada');
        }

        // Buscar jogos reais do banco de dados
        const games = await new Promise((resolve, reject) => {
            db.all(`
                SELECT DISTINCT
                    g.id as game_id,
                    g.home_team,
                    g.away_team,
                    g.status,
                    g.home_score,
                    g.away_score,
                    g.league_key as league,
                    g.start_time
                FROM games g
                WHERE g.sport_key = ?
                AND g.start_time >= datetime('now', '-2 hours')
                ORDER BY g.start_time ASC
            `, [sportKey], (err, rows) => {
                if (err) {
                    console.error('Erro na query:', err);
                    reject(err);
                } else {
                    console.log(`Encontrados ${rows.length} jogos para ${league}`);
                    resolve(rows);
                }
            });
        });

        return games;
    } catch (error) {
        console.error('Erro ao buscar jogos:', error);
        return [];
    }
}

module.exports = {
    getGames
}; 