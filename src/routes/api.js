const express = require('express');
const router = express.Router();
const { getConfig, updateConfig } = require('../database');
const { getArbitrageOpportunities, getLiveArbitrageOpportunities } = require('../services/arbitrage');
const { getGames } = require('../services/games');
const { getBookmakers } = require('../services/bookmakers');
const { sendEmailNotification, sendTelegramNotification } = require('../services/notifications');

// Rota para obter configurações do bot
router.get('/bot-config', (req, res) => {
    const config = getConfig();
    res.json(config);
});

// Rota para atualizar configurações do bot
router.post('/bot-config', (req, res) => {
    try {
        const newConfig = updateConfig(req.body);
        res.json({ success: true, config: newConfig });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Rota para obter oportunidades de arbitragem
router.get('/arbitrage', async (req, res) => {
    try {
        const opportunities = await getArbitrageOpportunities();
        res.json(opportunities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para obter oportunidades de arbitragem ao vivo
router.get('/live-arbitrage', async (req, res) => {
    try {
        const opportunities = await getLiveArbitrageOpportunities();
        res.json(opportunities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para obter jogos
router.get('/games', async (req, res) => {
    try {
        const { league } = req.query;
        const games = await getGames(league);
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rota para obter casas de apostas
router.get('/bookmakers', async (req, res) => {
    try {
        const bookmakers = await getBookmakers();
        res.json(bookmakers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotas para testar notificações
router.post('/test-notification/email', async (req, res) => {
    try {
        const { to, from } = req.body;
        await sendEmailNotification({
            to,
            from,
            subject: 'CAPBET - Teste de Notificação',
            message: 'Esta é uma mensagem de teste do sistema CAPBET.'
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/test-notification/telegram', async (req, res) => {
    try {
        const { botToken, chatId } = req.body;
        await sendTelegramNotification({
            botToken,
            chatId,
            message: '🤖 CAPBET - Teste de Notificação\n\nEsta é uma mensagem de teste do sistema CAPBET.'
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; 