const { db } = require('../database');

// Função para obter lista de casas de apostas
async function getBookmakers() {
    try {
        // Buscar casas de apostas que têm odds registradas
        return await new Promise((resolve, reject) => {
            db.all(`
                SELECT DISTINCT
                    bookmaker as id,
                    bookmaker as name
                FROM odds_history
                WHERE timestamp >= datetime('now', '-24 hours')
                AND bookmaker IS NOT NULL
                ORDER BY bookmaker ASC
            `, [], (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar casas de apostas:', err);
                    reject(err);
                } else {
                    // Formatar nomes das casas
                    const bookmakers = rows.map(bm => ({
                        id: bm.id.toLowerCase().replace(/\s+/g, ''),
                        name: bm.name.charAt(0).toUpperCase() + bm.name.slice(1)
                    }));
                    console.log('Casas de apostas encontradas:', bookmakers.length);
                    resolve(bookmakers);
                }
            });
        });
    } catch (error) {
        console.error('Erro ao buscar casas de apostas:', error);
        return [];
    }
}

module.exports = {
    getBookmakers
}; 