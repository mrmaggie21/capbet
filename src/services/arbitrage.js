const { getConfig, db } = require('../database');

// Função para calcular oportunidades de arbitragem
async function calculateArbitrage(odds) {
    const arbitrageOpportunities = [];
    
    for (let i = 0; i < odds.length; i++) {
        for (let j = i + 1; j < odds.length; j++) {
            const odd1 = odds[i];
            const odd2 = odds[j];
            
            // Verifica se são do mesmo jogo mas casas diferentes
            if (odd1.game_id === odd2.game_id && odd1.bookmaker !== odd2.bookmaker) {
                // Calcula a margem de arbitragem
                const margin = (1/odd1.odds + 1/odd2.odds) * 100;
                
                // Se a margem for menor que 100%, temos uma oportunidade
                if (margin < 100) {
                    const profit = (100 - margin);
                    
                    arbitrageOpportunities.push({
                        home_team: odd1.home_team,
                        away_team: odd1.away_team,
                        home_odds: odd1.odds,
                        away_odds: odd2.odds,
                        home_bookmaker: odd1.bookmaker,
                        away_bookmaker: odd2.bookmaker,
                        profit_percentage: profit,
                        market_key: odd1.market_key,
                        is_live: odd1.is_live,
                        league_key: odd1.league_key,
                        sport_key: 'soccer',
                        sport_name: 'Futebol',
                        suggested_stakes: calculateStakes(odd1.odds, odd2.odds, 100)
                    });
                }
            }
        }
    }
    
    return arbitrageOpportunities;
}

// Função para calcular stakes sugeridas
function calculateStakes(odd1, odd2, totalStake = 100) {
    const stake1 = (totalStake * odd2) / (odd1 + odd2);
    const stake2 = (totalStake * odd1) / (odd1 + odd2);
    
    return {
        winning: parseFloat(stake1.toFixed(2)),
        losing: parseFloat(stake2.toFixed(2)),
        draw: 0
    };
}

// Função para obter oportunidades de arbitragem
async function getArbitrageOpportunities() {
    try {
        const config = getConfig();
        
        // Buscar odds reais do banco de dados
        const odds = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    oh.game_id,
                    oh.home_team,
                    oh.away_team,
                    oh.home_odds as odds,
                    oh.bookmaker,
                    'h2h' as market_key,
                    CASE WHEN gs.status = 'in_progress' THEN 1 ELSE 0 END as is_live,
                    oh.sport_key as league_key,
                    gs.home_score,
                    gs.away_score,
                    gs.status
                FROM odds_history oh
                LEFT JOIN game_scores gs ON oh.game_id = gs.game_id
                WHERE oh.timestamp >= datetime('now', '-30 minutes')
                AND oh.home_odds > 1.0
                AND oh.sport_key LIKE 'soccer%'
                ORDER BY oh.timestamp DESC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const opportunities = await calculateArbitrage(odds);
        return opportunities.filter(opp => opp.profit_percentage >= config.minProfitPercentage);
    } catch (error) {
        console.error('Erro ao buscar oportunidades de arbitragem:', error);
        return [];
    }
}

// Função para obter oportunidades de arbitragem ao vivo
async function getLiveArbitrageOpportunities() {
    try {
        const config = getConfig();
        
        // Buscar odds ao vivo do banco de dados
        const liveOdds = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    oh.game_id,
                    oh.home_team,
                    oh.away_team,
                    oh.home_odds as odds,
                    oh.bookmaker,
                    'h2h' as market_key,
                    1 as is_live,
                    oh.sport_key as league_key,
                    gs.home_score,
                    gs.away_score,
                    gs.status
                FROM odds_history oh
                INNER JOIN game_scores gs ON oh.game_id = gs.game_id
                WHERE gs.status = 'in_progress'
                AND oh.timestamp >= datetime('now', '-5 minutes')
                AND oh.home_odds > 1.0
                AND oh.sport_key LIKE 'soccer%'
                ORDER BY oh.timestamp DESC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const opportunities = await calculateArbitrage(liveOdds);
        return opportunities.filter(opp => opp.profit_percentage >= config.minProfitPercentage);
    } catch (error) {
        console.error('Erro ao buscar oportunidades de arbitragem ao vivo:', error);
        return [];
    }
}

module.exports = {
    getArbitrageOpportunities,
    getLiveArbitrageOpportunities
}; 