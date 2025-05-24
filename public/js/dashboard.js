// Função para atualizar a tabela de jogos do Brasileirão
function updateBrazilianGamesTable(games) {
    console.log('Atualizando tabela de jogos:', games);
    const table = document.getElementById('brazilianGamesTable').getElementsByTagName('tbody')[0];
    table.innerHTML = '';

    // Atualiza o contador de jogos
    document.getElementById('gamesCount').textContent = `${games.length} jogos`;

    games.forEach(game => {
        const row = table.insertRow();
        const scoreText = game.status === 'scheduled' ? 'Não Iniciado' : `${game.home_score} x ${game.away_score}`;
        const scoreClass = game.status === 'scheduled' ? 'bg-secondary' : 'bg-success';
        
        row.innerHTML = `
            <td data-label="Mandante">
                <div class="d-flex align-items-center">
                    <span class="team-name">${game.home_team}</span>
                </div>
            </td>
            <td data-label="Visitante">
                <div class="d-flex align-items-center">
                    <span class="team-name">${game.away_team}</span>
                </div>
            </td>
            <td data-label="Placar">
                <span class="badge ${scoreClass}">${scoreText}</span>
            </td>
            <td data-label="Ações">
                <button class="btn btn-sm btn-primary btn-details" onclick='showGameStats("${game.home_team}", "${game.away_team}", "${game.game_id}")'>
                    <i class="fas fa-chart-bar"></i>
                    <span class="d-none d-sm-inline ms-1">Stats</span>
                </button>
            </td>
        `;
    });
}

// Variável global para armazenar o intervalo de atualização do modal
let statsUpdateInterval;

// Função para mostrar estatísticas do jogo
async function showGameStats(homeTeam, awayTeam, gameId) {
    try {
        // Função para atualizar os dados do modal
        async function updateModalStats() {
            const [homeStats, awayStats, gameScore] = await Promise.all([
                fetch(`/api/team-stats/${encodeURIComponent(homeTeam)}`).then(res => res.json()),
                fetch(`/api/team-stats/${encodeURIComponent(awayTeam)}`).then(res => res.json()),
                fetch(`/api/game-score/${encodeURIComponent(gameId)}`).then(res => res.json())
            ]);

            // Atualizar placar
            const scoreElement = document.getElementById('game-score');
            if (gameScore.status === 'in_progress' || gameScore.status === 'finished') {
                scoreElement.textContent = `${gameScore.home_score} x ${gameScore.away_score}`;
                scoreElement.className = 'badge bg-success';
            } else {
                scoreElement.textContent = 'Não Iniciado';
                scoreElement.className = 'badge bg-secondary';
            }

            // Atualizar status do jogo
            const statusElement = document.getElementById('game-status');
            let statusText = 'Não Iniciado';
            let statusClass = 'bg-secondary';
            
            switch (gameScore.status) {
                case 'in_progress':
                    statusText = 'Em Andamento';
                    statusClass = 'bg-primary';
                    break;
                case 'finished':
                    statusText = 'Finalizado';
                    statusClass = 'bg-success';
                    break;
                case 'postponed':
                    statusText = 'Adiado';
                    statusClass = 'bg-warning';
                    break;
                case 'cancelled':
                    statusText = 'Cancelado';
                    statusClass = 'bg-danger';
                    break;
            }
            statusElement.textContent = statusText;
            statusElement.className = `badge ${statusClass}`;

            // Atualizar estatísticas do time da casa
            document.getElementById('home-current-odd').textContent = homeStats.current_odd?.toFixed(2) || 'N/A';
            document.getElementById('home-avg-odd').textContent = homeStats.avg_odd?.toFixed(2) || 'N/A';
            document.getElementById('home-min-odd').textContent = homeStats.min_odd?.toFixed(2) || 'N/A';
            document.getElementById('home-max-odd').textContent = homeStats.max_odd?.toFixed(2) || 'N/A';
            document.getElementById('home-variation').textContent = `${homeStats.variation?.toFixed(2) || 'N/A'}%`;
            document.getElementById('home-variation').className = `text-end ${homeStats.variation >= 0 ? 'text-success' : 'text-danger'}`;
            document.getElementById('home-bookmakers-tbody').innerHTML = generateBookmakerRows(homeStats.bookmakers);

            // Atualizar estatísticas do time visitante
            document.getElementById('away-current-odd').textContent = awayStats.current_odd?.toFixed(2) || 'N/A';
            document.getElementById('away-avg-odd').textContent = awayStats.avg_odd?.toFixed(2) || 'N/A';
            document.getElementById('away-min-odd').textContent = awayStats.min_odd?.toFixed(2) || 'N/A';
            document.getElementById('away-max-odd').textContent = awayStats.max_odd?.toFixed(2) || 'N/A';
            document.getElementById('away-variation').textContent = `${awayStats.variation?.toFixed(2) || 'N/A'}%`;
            document.getElementById('away-variation').className = `text-end ${awayStats.variation >= 0 ? 'text-success' : 'text-danger'}`;
            document.getElementById('away-bookmakers-tbody').innerHTML = generateBookmakerRows(awayStats.bookmakers);

            // Atualizar timestamp
            document.getElementById('last-update-time').textContent = moment().format('DD/MM/YYYY HH:mm:ss');
        }

        // Criar modal com as estatísticas
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            ${homeTeam} vs ${awayTeam}
                            <div class="mt-2">
                                <span id="game-score" class="badge bg-secondary">...</span>
                                <span id="game-status" class="badge bg-secondary ms-2">...</span>
                            </div>
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0">${homeTeam} (Mandante)</h6>
                                    </div>
                                    <div class="card-body">
                                        <table class="table table-sm">
                                            <tbody>
                                                <tr>
                                                    <td>Odd Atual:</td>
                                                    <td id="home-current-odd" class="text-end">...</td>
                                                </tr>
                                                <tr>
                                                    <td>Média:</td>
                                                    <td id="home-avg-odd" class="text-end">...</td>
                                                </tr>
                                                <tr>
                                                    <td>Mínima:</td>
                                                    <td id="home-min-odd" class="text-end">...</td>
                                                </tr>
                                                <tr>
                                                    <td>Máxima:</td>
                                                    <td id="home-max-odd" class="text-end">...</td>
                                                </tr>
                                                <tr>
                                                    <td>Variação:</td>
                                                    <td id="home-variation" class="text-end">...</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div class="mt-3">
                                            <h6>Casas de Apostas</h6>
                                            <div class="table-responsive">
                                                <table class="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Casa</th>
                                                            <th>Odd</th>
                                                            <th>Atualização</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="home-bookmakers-tbody">
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <h6 class="mb-0">${awayTeam} (Visitante)</h6>
                                    </div>
                                    <div class="card-body">
                                        <table class="table table-sm">
                                            <tbody>
                                                <tr>
                                                    <td>Odd Atual:</td>
                                                    <td id="away-current-odd" class="text-end">...</td>
                                                </tr>
                                                <tr>
                                                    <td>Média:</td>
                                                    <td id="away-avg-odd" class="text-end">...</td>
                                                </tr>
                                                <tr>
                                                    <td>Mínima:</td>
                                                    <td id="away-min-odd" class="text-end">...</td>
                                                </tr>
                                                <tr>
                                                    <td>Máxima:</td>
                                                    <td id="away-max-odd" class="text-end">...</td>
                                                </tr>
                                                <tr>
                                                    <td>Variação:</td>
                                                    <td id="away-variation" class="text-end">...</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div class="mt-3">
                                            <h6>Casas de Apostas</h6>
                                            <div class="table-responsive">
                                                <table class="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Casa</th>
                                                            <th>Odd</th>
                                                            <th>Atualização</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="away-bookmakers-tbody">
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-12">
                                <div class="alert alert-info">
                                    <small>
                                        <i class="fas fa-info-circle"></i>
                                        Última atualização: <span id="last-update-time"></span>
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        
        // Iniciar atualização dos dados
        await updateModalStats();
        
        // Configurar intervalo de atualização (a cada 5 segundos)
        statsUpdateInterval = setInterval(updateModalStats, 5000);
        
        // Mostrar modal
        modalInstance.show();
        
        // Limpar intervalo quando o modal for fechado
        modal.addEventListener('hidden.bs.modal', () => {
            clearInterval(statsUpdateInterval);
            document.body.removeChild(modal);
        });
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        alert('Erro ao carregar estatísticas. Tente novamente.');
    }
}

// Função auxiliar para gerar linhas da tabela de casas de apostas
function generateBookmakerRows(bookmakers) {
    if (!bookmakers || bookmakers.length === 0) {
        return '<tr><td colspan="3" class="text-center">Nenhuma casa de apostas disponível</td></tr>';
    }

    return bookmakers.map(bm => `
        <tr>
            <td data-label="Casa">
                <div class="d-flex align-items-center">
                    <span>${bm.name}</span>
                </div>
            </td>
            <td data-label="Odd" class="text-end">
                <span class="odds-value">${bm.odd.toFixed(2)}</span>
            </td>
            <td data-label="Atualização" class="text-end">
                <small class="text-muted">
                    ${moment(bm.updated_at).format('HH:mm:ss')}
                </small>
            </td>
        </tr>
    `).join('');
}

// Função para mostrar detalhes da oportunidade de arbitragem ao vivo
function showLiveArbitrageDetails(opportunity) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    
    // Calcular valores de apostas e retornos
    const baseStake = 100;
    const totalStake = opportunity.suggested_stakes.winning + 
                      opportunity.suggested_stakes.losing + 
                      opportunity.suggested_stakes.draw;
    
    const winningReturn = opportunity.suggested_stakes.winning * opportunity.winning_odds.odds;
    const losingReturn = opportunity.suggested_stakes.losing * opportunity.losing_odds.odds;
    const drawReturn = opportunity.suggested_stakes.draw * opportunity.draw_odds.odds;

    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Oportunidade de Arbitragem ao Vivo</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-danger mb-3">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Atenção:</strong> Este é um jogo ao vivo com placar ${opportunity.home_score} x ${opportunity.away_score}.
                        As odds podem mudar rapidamente.
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <div class="card mb-3">
                                <div class="card-body">
                                    <h6 class="card-title">Informações do Jogo</h6>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <p class="mb-1"><strong>Partida:</strong> ${opportunity.home_team} vs ${opportunity.away_team}</p>
                                            <p class="mb-1"><strong>Placar Atual:</strong> ${opportunity.home_score} x ${opportunity.away_score}</p>
                                            <p class="mb-1"><strong>Time Vencendo:</strong> ${opportunity.winning_team}</p>
                                            <p class="mb-1"><strong>Lucro Potencial:</strong> <span class="${opportunity.profit_percentage >= 0 ? 'text-success' : 'text-danger'}">${parseFloat(opportunity.profit_percentage).toFixed(2)}%</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card mb-3">
                                <div class="card-body">
                                    <h6 class="card-title">Odds Disponíveis</h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Resultado</th>
                                                    <th>Casa de Apostas</th>
                                                    <th>Odd</th>
                                                    <th>Probabilidade</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>Time Vencendo (${opportunity.winning_team})</td>
                                                    <td>${opportunity.winning_odds.bookmaker}</td>
                                                    <td>${opportunity.winning_odds.odds.toFixed(2)}</td>
                                                    <td>${((1/opportunity.winning_odds.odds)*100).toFixed(2)}%</td>
                                                </tr>
                                                <tr>
                                                    <td>Time Perdendo</td>
                                                    <td>${opportunity.losing_odds.bookmaker}</td>
                                                    <td>${opportunity.losing_odds.odds.toFixed(2)}</td>
                                                    <td>${((1/opportunity.losing_odds.odds)*100).toFixed(2)}%</td>
                                                </tr>
                                                <tr>
                                                    <td>Empate</td>
                                                    <td>${opportunity.draw_odds.bookmaker}</td>
                                                    <td>${opportunity.draw_odds.odds.toFixed(2)}</td>
                                                    <td>${((1/opportunity.draw_odds.odds)*100).toFixed(2)}%</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">Simulação de Apostas (Base: R$ ${baseStake.toFixed(2)})</h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Resultado</th>
                                                    <th>Valor Aposta</th>
                                                    <th>Odd</th>
                                                    <th>Retorno</th>
                                                    <th>Lucro</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>Time Vencendo (${opportunity.winning_team})</td>
                                                    <td>R$ ${opportunity.suggested_stakes.winning.toFixed(2)}</td>
                                                    <td>${opportunity.winning_odds.odds.toFixed(2)}</td>
                                                    <td>R$ ${winningReturn.toFixed(2)}</td>
                                                    <td class="text-success">R$ ${(winningReturn - totalStake).toFixed(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td>Time Perdendo</td>
                                                    <td>R$ ${opportunity.suggested_stakes.losing.toFixed(2)}</td>
                                                    <td>${opportunity.losing_odds.odds.toFixed(2)}</td>
                                                    <td>R$ ${losingReturn.toFixed(2)}</td>
                                                    <td class="text-success">R$ ${(losingReturn - totalStake).toFixed(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td>Empate</td>
                                                    <td>R$ ${opportunity.suggested_stakes.draw.toFixed(2)}</td>
                                                    <td>${opportunity.draw_odds.odds.toFixed(2)}</td>
                                                    <td>R$ ${drawReturn.toFixed(2)}</td>
                                                    <td class="text-success">R$ ${(drawReturn - totalStake).toFixed(2)}</td>
                                                </tr>
                                            </tbody>
                                            <tfoot>
                                                <tr class="table-info">
                                                    <td><strong>Total</strong></td>
                                                    <td><strong>R$ ${totalStake.toFixed(2)}</strong></td>
                                                    <td>-</td>
                                                    <td>-</td>
                                                    <td class="text-success"><strong>R$ ${(winningReturn - totalStake).toFixed(2)}</strong></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    <div class="alert alert-info mt-3">
                                        <h6 class="mb-2">Informações Adicionais</h6>
                                        <ul class="mb-0">
                                            <li>ROI (Retorno sobre Investimento): ${((winningReturn/totalStake - 1) * 100).toFixed(2)}%</li>
                                            <li>Valor mínimo recomendado por casa: R$ ${Math.min(opportunity.suggested_stakes.winning, opportunity.suggested_stakes.losing, opportunity.suggested_stakes.draw).toFixed(2)}</li>
                                            <li>Soma das probabilidades: ${((1/opportunity.winning_odds.odds + 1/opportunity.losing_odds.odds + 1/opportunity.draw_odds.odds)*100).toFixed(2)}%</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// Função para atualizar a tabela de arbitragem
function updateArbitrageTable(opportunities) {
    console.log('Atualizando tabela de arbitragem:', opportunities);
    const table = document.getElementById('arbitrageTable').getElementsByTagName('tbody')[0];
    table.innerHTML = '';

    // Atualiza o contador de oportunidades
    document.getElementById('opportunitiesCount').textContent = `${opportunities.length} oportunidades`;

    opportunities.forEach(opportunity => {
        const row = table.insertRow();
        const profitClass = opportunity.profit_percentage >= 0 ? 'profit-positive' : 'profit-negative';
        const isLiveGame = opportunity.home_score !== undefined;
        
        row.innerHTML = `
            <td data-label="Jogo">
                <div class="d-flex flex-column">
                    <span class="mb-1">${opportunity.home_team} vs ${opportunity.away_team}</span>
                    ${isLiveGame ? `
                        <div class="d-flex gap-1">
                            <span class="badge bg-danger">AO VIVO</span>
                            <span class="badge bg-dark">${opportunity.home_score} x ${opportunity.away_score}</span>
                        </div>
                    ` : ''}
                </div>
            </td>
            <td data-label="Odd Casa">
                <div class="odds-container">
                    <span class="odds-label">${opportunity.home_bookmaker}</span>
                    <span class="odds-value">${opportunity.home_odds.toFixed(2)}</span>
                </div>
            </td>
            <td data-label="Odd Fora">
                <div class="odds-container">
                    <span class="odds-label">${opportunity.away_bookmaker}</span>
                    <span class="odds-value">${opportunity.away_odds.toFixed(2)}</span>
                </div>
            </td>
            ${opportunity.draw_odds ? `
                <td data-label="Odd Empate">
                    <div class="odds-container">
                        <span class="odds-label">${opportunity.draw_bookmaker}</span>
                        <span class="odds-value">${opportunity.draw_odds.toFixed(2)}</span>
                    </div>
                </td>
            ` : '<td data-label="Odd Empate">-</td>'}
            <td data-label="Lucro" class="${profitClass}">
                ${parseFloat(opportunity.profit_percentage).toFixed(2)}%
            </td>
            <td data-label="Detalhes">
                <button class="btn btn-sm ${isLiveGame ? 'btn-danger' : 'btn-info'} btn-details" 
                        onclick='${isLiveGame ? `showLiveArbitrageDetails(${JSON.stringify(opportunity)})` : `showDetails(${JSON.stringify(opportunity)})`}'>
                    <i class="fas fa-info-circle"></i>
                    <span class="d-none d-sm-inline ms-1">Info</span>
                </button>
            </td>
        `;
    });
}

// Função para mostrar detalhes da oportunidade
function showDetails(opportunity) {
    console.log('Mostrando detalhes:', opportunity);
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    
    // Calcular valores de apostas e retornos
    const baseStake = 100;
    const homeStake = baseStake * (opportunity.away_odds / (opportunity.home_odds + opportunity.away_odds + opportunity.draw_odds));
    const awayStake = baseStake * (opportunity.home_odds / (opportunity.home_odds + opportunity.away_odds + opportunity.draw_odds));
    const drawStake = baseStake * (opportunity.home_odds / (opportunity.home_odds + opportunity.away_odds + opportunity.draw_odds));
    
    const totalInvestment = homeStake + awayStake + drawStake;
    const homeReturn = homeStake * opportunity.home_odds;
    const awayReturn = awayStake * opportunity.away_odds;
    const drawReturn = drawStake * opportunity.draw_odds;

    const homeProfitClass = homeReturn - totalInvestment >= 0 ? 'text-success' : 'text-danger';
    const awayProfitClass = awayReturn - totalInvestment >= 0 ? 'text-success' : 'text-danger';
    const drawProfitClass = drawReturn - totalInvestment >= 0 ? 'text-success' : 'text-danger';
    const totalProfitClass = homeReturn - totalInvestment >= 0 ? 'text-success' : 'text-danger';

    modal.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Detalhes da Arbitragem</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-12">
                            <div class="card mb-3">
                                <div class="card-body">
                                    <h6 class="card-title">Informações do Jogo</h6>
                                    <div class="row">
                                        <div class="col-12">
                                            <p class="mb-1"><strong>Partida:</strong> ${opportunity.home_team} vs ${opportunity.away_team}</p>
                                            <p class="mb-1"><strong>Lucro Potencial:</strong> <span class="${opportunity.profit_percentage >= 0 ? 'text-success' : 'text-danger'}">${parseFloat(opportunity.profit_percentage).toFixed(2)}%</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="card mb-3">
                                <div class="card-body">
                                    <h6 class="card-title">Odds Disponíveis</h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Resultado</th>
                                                    <th>Casa</th>
                                                    <th>Odd</th>
                                                    <th>%</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>${opportunity.home_team}</td>
                                                    <td>${opportunity.home_bookmaker}</td>
                                                    <td>${opportunity.home_odds.toFixed(2)}</td>
                                                    <td>${((1/opportunity.home_odds)*100).toFixed(1)}%</td>
                                                </tr>
                                                <tr>
                                                    <td>${opportunity.away_team}</td>
                                                    <td>${opportunity.away_bookmaker}</td>
                                                    <td>${opportunity.away_odds.toFixed(2)}</td>
                                                    <td>${((1/opportunity.away_odds)*100).toFixed(1)}%</td>
                                                </tr>
                                                <tr>
                                                    <td>Empate</td>
                                                    <td>${opportunity.draw_bookmaker}</td>
                                                    <td>${opportunity.draw_odds.toFixed(2)}</td>
                                                    <td>${((1/opportunity.draw_odds)*100).toFixed(1)}%</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="card">
                                <div class="card-body">
                                    <h6 class="card-title">Simulação (Base: R$ ${baseStake.toFixed(2)})</h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Resultado</th>
                                                    <th>Aposta</th>
                                                    <th>Odd</th>
                                                    <th>Retorno</th>
                                                    <th>Lucro</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>${opportunity.home_team}</td>
                                                    <td>R$ ${homeStake.toFixed(2)}</td>
                                                    <td>${opportunity.home_odds.toFixed(2)}</td>
                                                    <td>R$ ${homeReturn.toFixed(2)}</td>
                                                    <td class="${homeProfitClass}">R$ ${(homeReturn - totalInvestment).toFixed(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td>${opportunity.away_team}</td>
                                                    <td>R$ ${awayStake.toFixed(2)}</td>
                                                    <td>${opportunity.away_odds.toFixed(2)}</td>
                                                    <td>R$ ${awayReturn.toFixed(2)}</td>
                                                    <td class="${awayProfitClass}">R$ ${(awayReturn - totalInvestment).toFixed(2)}</td>
                                                </tr>
                                                <tr>
                                                    <td>Empate</td>
                                                    <td>R$ ${drawStake.toFixed(2)}</td>
                                                    <td>${opportunity.draw_odds.toFixed(2)}</td>
                                                    <td>R$ ${drawReturn.toFixed(2)}</td>
                                                    <td class="${drawProfitClass}">R$ ${(drawReturn - totalInvestment).toFixed(2)}</td>
                                                </tr>
                                            </tbody>
                                            <tfoot>
                                                <tr class="table-info">
                                                    <td><strong>Total</strong></td>
                                                    <td><strong>R$ ${totalInvestment.toFixed(2)}</strong></td>
                                                    <td>-</td>
                                                    <td>-</td>
                                                    <td class="${totalProfitClass}"><strong>R$ ${(homeReturn - totalInvestment).toFixed(2)}</strong></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    <div class="alert alert-info mt-3">
                                        <h6 class="mb-2">Informações Adicionais</h6>
                                        <div class="row g-2">
                                            <div class="col-12 col-sm-6">
                                                <div class="d-flex justify-content-between">
                                                    <span>ROI:</span>
                                                    <strong class="${((homeReturn/totalInvestment - 1) * 100) >= 0 ? 'text-success' : 'text-danger'}">
                                                        ${((homeReturn/totalInvestment - 1) * 100).toFixed(2)}%
                                                    </strong>
                                                </div>
                                            </div>
                                            <div class="col-12 col-sm-6">
                                                <div class="d-flex justify-content-between">
                                                    <span>Valor mínimo por casa:</span>
                                                    <strong>R$ ${Math.min(homeStake, awayStake, drawStake).toFixed(2)}</strong>
                                                </div>
                                            </div>
                                            <div class="col-12">
                                                <div class="d-flex justify-content-between">
                                                    <span>Soma das probabilidades:</span>
                                                    <strong>${((1/opportunity.home_odds + 1/opportunity.away_odds + 1/opportunity.draw_odds)*100).toFixed(2)}%</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// Configuração do Bot
let botConfigModal;
let currentConfig = {};

// Variável para controlar o estado inicial
let isFirstLoad = true;

// Função para solicitar permissão de notificação
async function requestNotificationPermission() {
    try {
        if (!("Notification" in window)) {
            throw new Error("Este navegador não suporta notificações desktop");
        }

        let permission = Notification.permission;
        
        if (permission === "default") {
            permission = await Notification.requestPermission();
        }
        
        return permission === "granted";
    } catch (error) {
        console.error('Erro ao solicitar permissão de notificação:', error);
        return false;
    }
}

// Função para enviar notificação desktop
async function sendDesktopNotification(title, message, icon = "/img/logo.png") {
    try {
        if (!await requestNotificationPermission()) {
            console.warn('Permissão para notificações não concedida');
            return false;
        }

        const options = {
            body: message,
            icon: icon,
            badge: icon,
            tag: 'capbet-notification',
            requireInteraction: true,
            silent: false,
            timestamp: Date.now()
        };

        const notification = new Notification(title, options);

        notification.onclick = function() {
            window.focus();
            notification.close();
        };

        return true;
    } catch (error) {
        console.error('Erro ao enviar notificação desktop:', error);
        return false;
    }
}

// Atualizar a função sendBotNotification
async function sendBotNotification(message, type = 'info') {
    try {
        // Verifica configurações do usuário
        if (!currentConfig) {
            console.warn('Configurações não carregadas para notificações');
            return;
        }

        // Notificação Desktop
        if (currentConfig.notifications.desktop) {
            await sendDesktopNotification('CAPBET Bot', message);
        }

        // Notificação Telegram
        if (currentConfig.notifications.telegram) {
            try {
                const response = await fetch('/api/send-notification/telegram', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `🤖 CAPBET Bot\n\n${message}`,
                        botToken: currentConfig.notifications.telegramConfig.botToken,
                        chatId: currentConfig.notifications.telegramConfig.chatId
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Erro ao enviar notificação Telegram');
                }
            } catch (error) {
                console.error('Erro ao enviar notificação Telegram:', error);
            }
        }

        // Notificação Email
        if (currentConfig.notifications.email) {
            try {
                const response = await fetch('/api/send-notification/email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        subject: 'CAPBET Bot - Notificação',
                        message: message,
                        to: currentConfig.notifications.emailConfig.to,
                        from: currentConfig.notifications.emailConfig.from
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Erro ao enviar notificação Email');
                }
            } catch (error) {
                console.error('Erro ao enviar notificação Email:', error);
            }
        }

        // Toast notification
        showToast(message, type);
    } catch (error) {
        console.error('Erro ao enviar notificações:', error);
    }
}

// Atualizar a função de teste de notificação desktop
async function testDesktopNotification() {
    try {
        const success = await sendDesktopNotification(
            'Teste de Notificação CAPBET',
            'Esta é uma notificação de teste do sistema CAPBET.\nClique para retornar ao dashboard.'
        );

        if (success) {
            showToast('Notificação desktop enviada!', 'success');
        } else {
            throw new Error("Não foi possível enviar a notificação desktop");
        }
    } catch (error) {
        console.error('Erro ao testar notificação desktop:', error);
        showToast('Erro ao enviar notificação desktop: ' + error.message, 'error');
    }
}

// Atualizar a função de inicialização para incluir notificações
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página carregada, iniciando dashboard');
    
    // Verificar autenticação
    checkAuth();
    
    // Inicializa o modal de configuração
    botConfigModal = new bootstrap.Modal(document.getElementById('botConfigModal'));

    // Configura os listeners para os checkboxes de notificação
    const emailNotification = document.getElementById('emailNotification');
    const telegramNotification = document.getElementById('telegramNotification');
    
    if (emailNotification) {
        emailNotification.addEventListener('change', function() {
            const emailConfig = document.getElementById('emailConfig');
            if (emailConfig) {
                emailConfig.classList.toggle('d-none', !this.checked);
            }
        });
    }

    if (telegramNotification) {
        telegramNotification.addEventListener('change', function() {
            const telegramConfig = document.getElementById('telegramConfig');
            if (telegramConfig) {
                telegramConfig.classList.toggle('d-none', !this.checked);
            }
        });
    }

    // Carregar configurações iniciais
    loadBotConfig().then(() => {
        // Notificar início do bot
        sendBotNotification('Bot iniciado! Começando busca por oportunidades...', 'success');
    }).catch(error => {
        console.error('Erro ao carregar configurações iniciais:', error);
        showToast('Erro ao carregar configurações iniciais: ' + error.message, 'error');
    });
    
    // Carregar dados iniciais
    Promise.all([
        fetch('/api/current-games').then(res => res.json()),
        fetch('/api/arbitrage').then(res => res.json()),
        fetch('/api/live-arbitrage').then(res => res.json())
    ]).then(([gamesData, arbitrageData, liveArbitrageData]) => {
        console.log('Dados iniciais recebidos:', {
            games: gamesData.length,
            arbitrage: arbitrageData.length,
            liveArbitrage: liveArbitrageData.length
        });
        updateBrazilianGamesTable(gamesData);
        updateArbitrageTable([...liveArbitrageData, ...arbitrageData]);
        
        // Notificar quantidade de oportunidades apenas se não for a primeira carga
        if (!isFirstLoad) {
            const totalOpps = arbitrageData.length + liveArbitrageData.length;
            if (totalOpps > 0) {
                sendBotNotification(`Encontradas ${totalOpps} oportunidades de arbitragem!`, 'success');
            }
        }
        isFirstLoad = false;
    }).catch(error => {
        console.error('Erro ao carregar dados iniciais:', error);
        if (error.response?.status === 401) {
            window.location.href = '/login';
        }
    });
    
    // Atualizar dados a cada intervalo configurado
    setInterval(() => {
        console.log('Atualizando dados...');
        sendBotNotification('Iniciando nova busca por oportunidades...', 'info');
        
        Promise.all([
            fetch('/api/current-games').then(res => res.json()),
            fetch('/api/arbitrage').then(res => res.json()),
            fetch('/api/live-arbitrage').then(res => res.json())
        ]).then(([gamesData, arbitrageData, liveArbitrageData]) => {
            updateBrazilianGamesTable(gamesData);
            updateArbitrageTable([...liveArbitrageData, ...arbitrageData]);
            
            // Notificar novas oportunidades
            const totalOpps = arbitrageData.length + liveArbitrageData.length;
            if (totalOpps > 0) {
                sendBotNotification(`Encontradas ${totalOpps} oportunidades de arbitragem!`, 'success');
            }
        }).catch(error => {
            console.error('Erro ao atualizar dados:', error);
            if (error.response?.status === 401) {
                window.location.href = '/login';
            }
            sendBotNotification('Erro ao buscar oportunidades: ' + error.message, 'error');
        });
    }, currentConfig?.updateInterval || 30000);
});

function showBotConfig() {
    loadBotConfig().then(() => {
        botConfigModal.show();
    }).catch(error => {
        console.error('Erro ao mostrar configurações:', error);
        showToast('Erro ao carregar configurações: ' + error.message, 'error');
    });
}

// Função para carregar bookmakers da API
async function loadBookmakers() {
    try {
        const response = await fetch('/api/bookmakers');
        if (!response.ok) {
            throw new Error('Erro ao carregar casas de apostas');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao carregar bookmakers:', error);
        showToast('Erro ao carregar casas de apostas: ' + error.message, 'error');
        return [];
    }
}

// Função para atualizar a seção de bookmakers no formulário
function updateBookmakersSection(bookmakers) {
    const container = document.getElementById('bookmakersContainer');
    if (!container) {
        console.error('Container de bookmakers não encontrado');
        return;
    }

    // Limpar container
    container.innerHTML = '';

    // Adicionar opção "Todas"
    const allBookmakersDiv = document.createElement('div');
    allBookmakersDiv.className = 'mb-3';
    allBookmakersDiv.innerHTML = `
        <div class="form-check">
            <input type="checkbox" class="form-check-input" id="allBookmakers" name="bookmakers.all">
            <label class="form-check-label" for="allBookmakers">
                <strong>Todas as Casas de Apostas</strong>
            </label>
        </div>
    `;
    container.appendChild(allBookmakersDiv);

    // Adicionar linha divisória
    const divider = document.createElement('hr');
    divider.className = 'my-3';
    container.appendChild(divider);

    // Criar container para bookmakers individuais
    const individualBookmakersDiv = document.createElement('div');
    individualBookmakersDiv.id = 'individualBookmakers';
    individualBookmakersDiv.className = 'row';

    // Adicionar cada bookmaker
    bookmakers.forEach(bm => {
        const bookmakerDiv = document.createElement('div');
        bookmakerDiv.className = 'col-md-6 mb-2';
        bookmakerDiv.innerHTML = `
            <div class="form-check">
                <input type="checkbox" class="form-check-input individual-bookmaker" 
                       id="bookmaker_${bm.id}" 
                       name="bookmakers.${bm.id}"
                       ${currentConfig?.bookmakers?.[bm.id] ? 'checked' : ''}>
                <label class="form-check-label" for="bookmaker_${bm.id}">
                    ${bm.name}
                </label>
            </div>
        `;
        individualBookmakersDiv.appendChild(bookmakerDiv);
    });

    container.appendChild(individualBookmakersDiv);

    // Configurar comportamento do checkbox "Todas"
    const allCheckbox = document.getElementById('allBookmakers');
    const individualCheckboxes = document.querySelectorAll('.individual-bookmaker');

    allCheckbox.addEventListener('change', function() {
        individualCheckboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
            checkbox.disabled = this.checked;
        });
    });

    // Verificar estado inicial do checkbox "Todas"
    if (currentConfig?.bookmakers?.all) {
        allCheckbox.checked = true;
        individualCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            checkbox.disabled = true;
        });
    }

    // Atualizar estado do checkbox "Todas" baseado nos individuais
    function updateAllCheckbox() {
        const allChecked = Array.from(individualCheckboxes).every(cb => cb.checked);
        allCheckbox.checked = allChecked;
    }

    individualCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateAllCheckbox);
    });
}

// Atualizar a função loadBotConfig para incluir carregamento de bookmakers
async function loadBotConfig() {
    try {
        console.log('Carregando configurações do bot...');
        const [configResponse, bookmakers] = await Promise.all([
            fetch('/api/bot-config'),
            loadBookmakers()
        ]);
        
        if (!configResponse.ok) {
            throw new Error(`Erro ao carregar configurações: ${configResponse.status}`);
        }
        
        currentConfig = await configResponse.json();
        console.log('Configurações carregadas:', currentConfig);
        
        // Atualizar seção de bookmakers
        updateBookmakersSection(bookmakers);
        
        // Preenche o formulário com as configurações atuais
        const form = document.getElementById('botConfigForm');
        if (!form) {
            console.error('Formulário de configurações não encontrado');
            return;
        }
        
        // Função auxiliar para preencher campos aninhados
        function fillNestedFields(obj, prefix = '') {
            Object.entries(obj).forEach(([key, value]) => {
                if (key === 'bookmakers') return; // Pular bookmakers pois já foram tratados
                
                const fieldName = prefix ? `${prefix}.${key}` : key;
                
                if (typeof value === 'object' && value !== null) {
                    fillNestedFields(value, fieldName);
                } else {
                    const input = form.querySelector(`[name="${fieldName}"]`);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = value;
                            input.dispatchEvent(new Event('change'));
                        } else if (input.type === 'number') {
                            input.value = value || 0;
                        } else {
                            input.value = value || '';
                        }
                    }
                }
            });
        }

        fillNestedFields(currentConfig);

        // Atualiza a visibilidade das configurações de notificação
        const emailConfig = document.getElementById('emailConfig');
        const telegramConfig = document.getElementById('telegramConfig');
        
        if (emailConfig) {
            emailConfig.classList.toggle('d-none', !currentConfig.notifications?.email);
        }
        
        if (telegramConfig) {
            telegramConfig.classList.toggle('d-none', !currentConfig.notifications?.telegram);
        }

        // Adiciona botões de teste
        addTestButtons();

        console.log('Formulário atualizado com as configurações');
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        showToast('Erro ao carregar configurações: ' + error.message, 'error');
    }
}

// Atualizar a função saveBotConfig para incluir bookmakers
async function saveBotConfig() {
    try {
        const form = document.getElementById('botConfigForm');
        const formData = new FormData(form);
        const config = {};

        // Processar bookmakers
        const bookmakers = {};
        const allBookmakers = formData.get('bookmakers.all') === 'on';
        bookmakers.all = allBookmakers;

        if (!allBookmakers) {
            document.querySelectorAll('.individual-bookmaker').forEach(checkbox => {
                const bookmarkerId = checkbox.id.replace('bookmaker_', '');
                bookmakers[bookmarkerId] = checkbox.checked;
            });
        }

        // Estrutura base das configurações
        const configStructure = {
            updateInterval: 'number',
            minProfitPercentage: 'number',
            baseStake: 'number',
            maxStakePerBet: 'number',
            maxTotalStake: 'number',
            arbitrageTypes: {
                standard: 'boolean',
                live: 'boolean',
                asian: 'boolean'
            },
            notifications: {
                email: 'boolean',
                telegram: 'boolean',
                desktop: 'boolean',
                emailConfig: {
                    to: 'string',
                    from: 'string'
                },
                telegramConfig: {
                    botToken: 'string',
                    chatId: 'string'
                }
            },
            oddsLimits: {
                min: 'number',
                max: 'number'
            },
            sports: {
                soccer: 'boolean',
                basketball: 'boolean',
                tennis: 'boolean',
                volleyball: 'boolean'
            },
            leagues: {
                soccer_brazil_campeonato: 'boolean',
                soccer_brazil_serie_b: 'boolean',
                soccer_libertadores: 'boolean',
                soccer_copa_brasil: 'boolean'
            }
        };

        // Função para construir objeto com tipo correto
        function buildConfigObject(data, structure, prefix = '') {
            const result = {};
            
            for (const [key, type] of Object.entries(structure)) {
                if (key === 'bookmakers') continue; // Pular bookmakers pois já foram tratados
                
                const fullKey = prefix ? `${prefix}.${key}` : key;
                
                if (typeof type === 'object') {
                    result[key] = buildConfigObject(data, type, fullKey);
                } else {
                    const value = data.get(fullKey);
                    if (value !== undefined) {
                        switch (type) {
                            case 'boolean':
                                result[key] = value === 'on' || value === 'true';
                                break;
                            case 'number':
                                result[key] = Number(value) || 0;
                                break;
                            default:
                                result[key] = value;
                        }
                    }
                }
            }
            
            return result;
        }

        // Construir objeto de configuração
        const configData = buildConfigObject(formData, configStructure);
        configData.bookmakers = bookmakers;

        console.log('Enviando configurações para o servidor:', configData);

        const response = await fetch('/api/bot-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configData)
        });

        if (!response.ok) {
            throw new Error(`Erro ao salvar configurações: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            currentConfig = data.config;
            botConfigModal.hide();
            showToast('Configurações salvas com sucesso', 'success');
        } else {
            throw new Error(data.error || 'Erro ao salvar configurações');
        }
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showToast('Erro ao salvar configurações: ' + error.message, 'error');
    }
}

// Função para mostrar toast
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0 fade show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });

    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toastContainer.removeChild(toast);
    });
}

// Função para mostrar/esconder loading
function toggleLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('d-none', !show);
    }
}

// Função para inicializar tooltips
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            trigger: 'hover'
        });
    });
}

// Função para fazer logout
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao fazer logout. Tente novamente.');
    }
}

// Função para verificar autenticação
async function checkAuth() {
    try {
        const response = await fetch('/api/current-games');
        if (response.status === 401) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/login';
    }
}

// Funções para testar notificações
async function testEmailNotification() {
    try {
        const response = await fetch('/api/test-notification/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: document.querySelector('[name="notifications.emailConfig.to"]').value,
                from: document.querySelector('[name="notifications.emailConfig.from"]').value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showToast('Email de teste enviado com sucesso!', 'success');
        } else {
            throw new Error(data.error || 'Erro ao enviar email de teste');
        }
    } catch (error) {
        console.error('Erro ao testar email:', error);
        showToast('Erro ao enviar email de teste: ' + error.message, 'error');
    }
}

async function testTelegramNotification() {
    try {
        const response = await fetch('/api/test-notification/telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                botToken: document.querySelector('[name="notifications.telegramConfig.botToken"]').value,
                chatId: document.querySelector('[name="notifications.telegramConfig.chatId"]').value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showToast('Mensagem de teste enviada para o Telegram!', 'success');
        } else {
            throw new Error(data.error || 'Erro ao enviar mensagem de teste');
        }
    } catch (error) {
        console.error('Erro ao testar Telegram:', error);
        showToast('Erro ao enviar mensagem de teste: ' + error.message, 'error');
    }
}

// Função para adicionar botões de teste
function addTestButtons() {
    // Email
    const emailConfig = document.getElementById('emailConfig');
    if (emailConfig && !document.getElementById('testEmailBtn')) {
        const testEmailBtn = document.createElement('button');
        testEmailBtn.id = 'testEmailBtn';
        testEmailBtn.type = 'button';
        testEmailBtn.className = 'btn btn-sm btn-info mt-2';
        testEmailBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Testar Email';
        testEmailBtn.onclick = testEmailNotification;
        emailConfig.appendChild(testEmailBtn);
    }

    // Telegram
    const telegramConfig = document.getElementById('telegramConfig');
    if (telegramConfig && !document.getElementById('testTelegramBtn')) {
        const testTelegramBtn = document.createElement('button');
        testTelegramBtn.id = 'testTelegramBtn';
        testTelegramBtn.type = 'button';
        testTelegramBtn.className = 'btn btn-sm btn-info mt-2';
        testTelegramBtn.innerHTML = '<i class="fab fa-telegram"></i> Testar Telegram';
        testTelegramBtn.onclick = testTelegramNotification;
        telegramConfig.appendChild(testTelegramBtn);
    }

    // Desktop
    const desktopNotification = document.getElementById('desktopNotification');
    if (desktopNotification && !document.getElementById('testDesktopBtn')) {
        const testDesktopBtn = document.createElement('button');
        testDesktopBtn.id = 'testDesktopBtn';
        testDesktopBtn.type = 'button';
        testDesktopBtn.className = 'btn btn-sm btn-info ms-2';
        testDesktopBtn.innerHTML = '<i class="fas fa-bell"></i> Testar';
        testDesktopBtn.onclick = testDesktopNotification;
        desktopNotification.parentElement.appendChild(testDesktopBtn);
    }
}

 