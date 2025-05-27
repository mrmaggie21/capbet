const winston = require('winston');
const path = require('path');

// Configuração do formato dos logs
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Criar logger
const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        // Logs de erro
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Logs de arbitragem
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/arbitrage.log'),
            maxsize: 5242880,
            maxFiles: 5
        }),
        // Logs de duplicatas
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/duplicates.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

// Adicionar logs no console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Funções específicas para logging de arbitragem
const arbitrageLogger = {
    // Log de nova oportunidade encontrada
    newOpportunity: (opportunity) => {
        logger.info('Nova oportunidade de arbitragem encontrada', {
            type: 'new_opportunity',
            game: `${opportunity.home_team} vs ${opportunity.away_team}`,
            profit: opportunity.profit_percentage,
            bookmakers: {
                home: opportunity.home_bookmaker,
                away: opportunity.away_bookmaker,
                draw: opportunity.draw_bookmaker
            },
            odds: {
                home: opportunity.home_odds,
                away: opportunity.away_odds,
                draw: opportunity.draw_odds
            },
            key: `${opportunity.home_team}-${opportunity.away_team}-${opportunity.market_key}`
        });
    },

    // Log de duplicata encontrada
    duplicateFound: (original, duplicate) => {
        logger.info('Duplicata encontrada', {
            type: 'duplicate_found',
            original: {
                game: `${original.home_team} vs ${original.away_team}`,
                profit: original.profit_percentage,
                key: `${original.home_team}-${original.away_team}-${original.market_key}`
            },
            duplicate: {
                game: `${duplicate.home_team} vs ${duplicate.away_team}`,
                profit: duplicate.profit_percentage,
                key: `${duplicate.home_team}-${duplicate.away_team}-${duplicate.market_key}`
            },
            action: 'mantida oportunidade com maior lucro'
        });
    },

    // Log de filtro aplicado
    filterApplied: (filterSummary) => {
        logger.info('Filtro aplicado às oportunidades', {
            type: 'filter_applied',
            total: filterSummary.total,
            filtered: filterSummary.filtered,
            reasons: filterSummary.reasons
        });
    },

    // Log de atualização de dados
    updateSummary: (summary) => {
        logger.info('Resumo da atualização', {
            type: 'update_summary',
            totalOpportunities: summary.total,
            uniqueOpportunities: summary.unique,
            duplicatesRemoved: summary.total - summary.unique,
            timestamp: new Date().toISOString()
        });
    },

    // Log de erro
    error: (error, context) => {
        logger.error('Erro no sistema de arbitragem', {
            type: 'arbitrage_error',
            error: error.message,
            stack: error.stack,
            context
        });
    }
};

module.exports = {
    logger,
    arbitrageLogger
}; 