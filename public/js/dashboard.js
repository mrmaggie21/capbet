// Função para atualizar a tabela de jogos do Brasileirão
function updateBrazilianGamesTable(games) {
    const container = document.getElementById('serieAGamesContainer');
    if (!container) {
        console.error('Container de jogos da Série A não encontrado');
        return;
    }

    // Limpa o container
    container.innerHTML = '';

    // Atualiza o contador
    document.getElementById('serieACount').textContent = `${games.length} jogos`;

    if (!games || games.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    Nenhum jogo encontrado no momento
                </div>
            </div>`;
        return;
    }

    // Cria os cards para cada jogo
    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        
        const statusClass = game.status === 'live' ? 'bg-success' : 
                          game.status === 'scheduled' ? 'bg-warning' : 'bg-danger';
        
        const statusText = game.status === 'live' ? 'Em andamento' : 
                          game.status === 'scheduled' ? 'Não iniciado' : 'Finalizado';
        
        const scoreText = game.status === 'scheduled' ? 'vs' : `${game.home_score} x ${game.away_score}`;
        
        card.innerHTML = `
            <div class="arbitrage-card">
                <div class="arbitrage-header">
                    <span class="badge ${statusClass} position-absolute top-0 end-0 mt-2 me-2">
                        ${statusText}
                    </span>
                    <h5 class="card-title mb-2">Brasileirão Série A</h5>
                    <small class="text-muted">${formatDate(game.date)}</small>
                </div>
                <div class="arbitrage-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="text-center flex-grow-1">
                            <img src="${game.home_team_logo || '/img/team-placeholder.png'}" 
                                 alt="${game.home_team}" 
                                 class="team-logo mb-2" 
                                 style="width: 40px; height: 40px;">
                            <h6 class="mb-0 team-name">${game.home_team}</h6>
                        </div>
                        <div class="text-center px-3">
                            <h4 class="mb-0 score">
                                ${scoreText}
                            </h4>
                        </div>
                        <div class="text-center flex-grow-1">
                            <img src="${game.away_team_logo || '/img/team-placeholder.png'}" 
                                 alt="${game.away_team}" 
                                 class="team-logo mb-2" 
                                 style="width: 40px; height: 40px;">
                            <h6 class="mb-0 team-name">${game.away_team}</h6>
                        </div>
                    </div>
                </div>
                <div class="arbitrage-footer">
                    <div class="d-flex justify-content-between align-items-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="showGameStats('${game.home_team}', '${game.away_team}', '${game.game_id}')">
                            <i class="fas fa-chart-bar me-1"></i>
                            Estatísticas
                        </button>
                        <span class="badge bg-info">
                            <i class="fas fa-clock me-1"></i>
                            ${game.time || 'A definir'}
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
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

    const leagueName = getLeagueName(opportunity);

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
                                            <p class="mb-1"><strong>Competição:</strong> ${leagueName}</p>
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

// Função para verificar se a oportunidade atende aos critérios do usuário
function isValidOpportunity(opportunity, filterSummary = { total: 0, filtered: 0, reasons: [] }) {
    try {
        filterSummary.total++;
        
        // Log inicial da oportunidade
        console.log('Validando oportunidade:', {
            jogo: `${opportunity.home_team} vs ${opportunity.away_team}`,
            odds: {
                casa: opportunity.home_odds,
                fora: opportunity.away_odds,
                empate: opportunity.draw_odds
            },
            lucro: opportunity.profit_percentage,
            mercado: opportunity.market_key
        });

        // Verificações básicas de dados
        if (!opportunity.home_team || !opportunity.away_team) {
            filterSummary.reasons.push('Dados básicos ausentes');
            return false;
        }

        // Se não há configurações, aceita todas as oportunidades
        if (!currentConfig) {
            filterSummary.filtered++;
            return true;
        }

        // Verificar lucro mínimo
        if (currentConfig.minProfitPercentage !== undefined && opportunity.profit_percentage < currentConfig.minProfitPercentage) {
            filterSummary.reasons.push(`Lucro ${opportunity.profit_percentage}% abaixo do mínimo ${currentConfig.minProfitPercentage}%`);
            return false;
        }

        // Verificar limites de odds (apenas se as odds existirem)
        if (currentConfig.oddsLimits && (opportunity.home_odds || opportunity.away_odds)) {
            const odds = [opportunity.home_odds, opportunity.away_odds].filter(odd => odd !== undefined);
            if (opportunity.draw_odds) odds.push(opportunity.draw_odds);
            
            if (odds.length > 0) {
                const minOdd = Math.min(...odds);
                const maxOdd = Math.max(...odds);
                
                if (minOdd < currentConfig.oddsLimits.min || maxOdd > currentConfig.oddsLimits.max) {
                    filterSummary.reasons.push(`Odds (${minOdd.toFixed(2)} - ${maxOdd.toFixed(2)}) fora dos limites (${currentConfig.oddsLimits.min} - ${currentConfig.oddsLimits.max})`);
                    return false;
                }
            }
        }

        // Verificar tipo de arbitragem
        if (currentConfig.arbitrageTypes) {
            const isLive = !!opportunity.is_live;
            const isAsian = !!opportunity.is_asian;

            if (isLive && !currentConfig.arbitrageTypes.live) {
                filterSummary.reasons.push('Arbitragem ao vivo não permitida');
                return false;
            }
            if (!isLive && !currentConfig.arbitrageTypes.standard) {
                filterSummary.reasons.push('Arbitragem padrão não permitida');
                return false;
            }
            if (isAsian && !currentConfig.arbitrageTypes.asian) {
                filterSummary.reasons.push('Arbitragem asiática não permitida');
                return false;
            }
        }

        // Verificar casas de apostas (apenas se todas não estiverem permitidas)
        if (currentConfig.bookmakers && !currentConfig.bookmakers.all) {
            const bookmakers = [
                opportunity.home_bookmaker,
                opportunity.away_bookmaker,
                opportunity.draw_bookmaker
            ].filter(Boolean);

            const allBookmakersAllowed = bookmakers.every(bm => {
                if (!bm) return true;
                const isAllowed = currentConfig.bookmakers[bm.toLowerCase()];
                if (!isAllowed) {
                    filterSummary.reasons.push(`Casa de apostas ${bm} não permitida`);
                }
                return isAllowed;
            });
            
            if (!allBookmakersAllowed) return false;
        }

        // Se passou por todas as verificações
        filterSummary.filtered++;
        return true;
    } catch (error) {
        console.error('Erro ao validar oportunidade:', error);
        filterSummary.reasons.push('Erro ao validar oportunidade');
        return false;
    }
}

// Função para calcular os stakes baseado na configuração do usuário
function calculateStakes(opportunity, baseStake) {
    // Verificar se temos odds válidas
    const homeOdd = parseFloat(opportunity.home_odds || 0);
    const awayOdd = parseFloat(opportunity.away_odds || 0);
    const drawOdd = parseFloat(opportunity.draw_odds || 0);

    // Calcular probabilidades implícitas
    const homeProb = homeOdd > 0 ? 1 / homeOdd : 0;
    const awayProb = awayOdd > 0 ? 1 / awayOdd : 0;
    const drawProb = drawOdd > 0 ? 1 / drawOdd : 0;

    // Soma das probabilidades
    const totalProb = homeProb + awayProb + (drawOdd > 0 ? drawProb : 0);

    // Calcular stakes proporcionais
    const homeStake = (homeProb / totalProb) * baseStake;
    const awayStake = (awayProb / totalProb) * baseStake;
    const drawStake = drawOdd > 0 ? (drawProb / totalProb) * baseStake : 0;

    return {
        home: homeStake,
        away: awayStake,
        draw: drawStake,
        total: homeStake + awayStake + drawStake
    };
}

// Função para atualizar a tabela de arbitragem
function updateArbitrageTable(opportunities) {
    console.log('Atualizando tabela de arbitragem com', opportunities?.length || 0, 'oportunidades');
    const container = document.getElementById('arbitrageTableBody');
    if (!container) {
        console.error('Elemento arbitrageTableBody não encontrado');
        return;
    }
    container.innerHTML = '';

    if (!opportunities || opportunities.length === 0) {
        console.log('Nenhuma oportunidade para exibir');
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    Nenhuma oportunidade encontrada no momento.
                </div>
            </div>
        `;
        return;
    }

    // Filtrar oportunidades
    const filteredOpportunities = opportunities.filter(opp => {
        if (!opp) {
            console.warn('Oportunidade inválida:', opp);
            return false;
        }
        return isValidOpportunity(opp);
    });

    console.log('Oportunidades filtradas:', filteredOpportunities);

    // Se não houver oportunidades após o filtro, mostrar mensagem
    if (filteredOpportunities.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning text-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Nenhuma oportunidade atende aos critérios configurados.
                </div>
            </div>
        `;
        return;
    }

    // Mostrar oportunidades filtradas
    filteredOpportunities.forEach((opp, index) => {
        try {
            console.log(`Processando oportunidade ${index + 1}:`, opp);
            
            const col = document.createElement('div');
            col.className = 'col-12 col-md-6 col-lg-4 mb-4';
            
            const profitClass = opp.profit_percentage >= 2 ? 'bg-success' : 
                              opp.profit_percentage >= 1 ? 'bg-primary' : 'bg-warning';

            // Calcular valores para o card usando o baseStake da configuração
            const baseStake = currentConfig?.baseStake || 100;
            
            // Verificar e calcular stakes
            const stakes = {
                home: parseFloat(opp.suggested_stakes?.home || 0),
                away: parseFloat(opp.suggested_stakes?.away || 0),
                draw: parseFloat(opp.suggested_stakes?.draw || 0)
            };

            // Se não tiver stakes sugeridos, calcular baseado no baseStake
            if (stakes.home === 0 && stakes.away === 0 && stakes.draw === 0) {
                const homeOdd = parseFloat(opp.home_odds || 0);
                const awayOdd = parseFloat(opp.away_odds || 0);
                const drawOdd = parseFloat(opp.draw_odds || 0);

                const homeProb = homeOdd > 0 ? 1 / homeOdd : 0;
                const awayProb = awayOdd > 0 ? 1 / awayOdd : 0;
                const drawProb = drawOdd > 0 ? 1 / drawOdd : 0;

                const totalProb = homeProb + awayProb + (drawOdd > 0 ? drawProb : 0);

                stakes.home = (homeProb / totalProb) * baseStake;
                stakes.away = (awayProb / totalProb) * baseStake;
                stakes.draw = drawOdd > 0 ? (drawProb / totalProb) * baseStake : 0;
            }

            stakes.total = stakes.home + stakes.away + stakes.draw;
            
            // Calcular retornos
            const homeReturn = stakes.home * parseFloat(opp.home_odds || 0);
            const awayReturn = stakes.away * parseFloat(opp.away_odds || 0);
            const drawReturn = opp.draw_odds ? stakes.draw * parseFloat(opp.draw_odds) : 0;

            const expectedProfit = Math.max(homeReturn, awayReturn, drawReturn) - stakes.total;
            const roi = stakes.total > 0 ? ((expectedProfit / stakes.total) * 100) : 0;
            
            col.innerHTML = `
                <div class="arbitrage-card h-100">
                    <div class="arbitrage-header">
                        <div class="arbitrage-title">
                            <i class="fas fa-futbol me-2"></i>
                            ${opp.home_team} vs ${opp.away_team}
                        </div>
                        <div class="arbitrage-subtitle">
                            ${opp.league_name || 'Campeonato Brasileiro'}
                            ${opp.is_live ? `
                                <span class="badge bg-danger ms-2">
                                    <i class="fas fa-circle-dot me-1"></i>
                                    AO VIVO
                                </span>
                            ` : ''}
                        </div>
                        <span class="market-badge">
                            <i class="fas fa-${getMarketIcon(opp.market_key)} me-1"></i>
                            ${getMarketName(opp.market_key)}
                        </span>
                        <span class="profit-badge ${profitClass}">
                            ${opp.profit_percentage.toFixed(2)}%
                        </span>
                    </div>
                    <div class="arbitrage-body">
                        <div class="arbitrage-details">
                            <div class="row g-2">
                                <!-- Casa -->
                                <div class="col-12">
                                    <div class="detail-item">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <div class="detail-label">Casa - ${opp.home_bookmaker}</div>
                                                <div class="detail-value">${opp.home_odds?.toFixed(2) || 'N/A'}</div>
                                            </div>
                                            <div class="text-end">
                                                <div class="detail-label">Stake</div>
                                                <div class="detail-value">R$ ${stakes.home.toFixed(2)}</div>
                                                <div class="detail-label mt-1">Retorno</div>
                                                <div class="detail-value text-success">R$ ${homeReturn.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Fora -->
                                <div class="col-12">
                                    <div class="detail-item">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <div class="detail-label">Fora - ${opp.away_bookmaker}</div>
                                                <div class="detail-value">${opp.away_odds?.toFixed(2) || 'N/A'}</div>
                                            </div>
                                            <div class="text-end">
                                                <div class="detail-label">Stake</div>
                                                <div class="detail-value">R$ ${stakes.away.toFixed(2)}</div>
                                                <div class="detail-label mt-1">Retorno</div>
                                                <div class="detail-value text-success">R$ ${awayReturn.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                ${opp.draw_odds ? `
                                    <!-- Empate -->
                                    <div class="col-12">
                                        <div class="detail-item">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <div class="detail-label">Empate - ${opp.draw_bookmaker}</div>
                                                    <div class="detail-value">${opp.draw_odds.toFixed(2)}</div>
                                                </div>
                                                <div class="text-end">
                                                    <div class="detail-label">Stake</div>
                                                    <div class="detail-value">R$ ${stakes.draw.toFixed(2)}</div>
                                                    <div class="detail-label mt-1">Retorno</div>
                                                    <div class="detail-value text-success">R$ ${drawReturn.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}

                                <!-- Totais -->
                                <div class="col-6">
                                    <div class="detail-item">
                                        <div class="detail-label">Stake Total</div>
                                        <div class="detail-value">R$ ${stakes.total.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="detail-item">
                                        <div class="detail-label">Lucro Esperado</div>
                                        <div class="detail-value text-success">R$ ${expectedProfit.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="detail-item">
                                        <div class="detail-label">ROI</div>
                                        <div class="detail-value ${roi >= 2 ? 'text-success' : 'text-warning'}">${roi.toFixed(2)}%</div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="detail-item">
                                        <div class="detail-label">Probabilidade</div>
                                        <div class="detail-value">${((1/opp.home_odds + 1/opp.away_odds + (opp.draw_odds ? 1/opp.draw_odds : 0))*100).toFixed(2)}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="arbitrage-footer">
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                Atualizado ${moment(opp.timestamp).fromNow()}
                            </small>
                            ${opp.is_live ? `
                                <span class="badge bg-danger">
                                    <i class="fas fa-circle-dot me-1"></i>
                                    Placar: ${opp.home_score || 0} x ${opp.away_score || 0}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(col);
        } catch (error) {
            console.error(`Erro ao processar oportunidade ${index}:`, error);
        }
    });
}

// Função para mostrar resumo do filtro
function showFilterSummary(opportunities) {
    const filterSummary = {
        total: 0,
        filtered: 0,
        reasons: []
    };

    // Validar todas as oportunidades para gerar o resumo
    opportunities.forEach(opp => isValidOpportunity(opp, filterSummary));

    // Agrupar razões de filtro
    const reasonsSummary = filterSummary.reasons.reduce((acc, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
    }, {});

    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-filter me-2"></i>
                        Resumo dos Filtros
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card mb-3">
                                <div class="card-header bg-dark">
                                    <h6 class="mb-0">Estatísticas</h6>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <tbody>
                                                <tr>
                                                    <td>Total de oportunidades:</td>
                                                    <td class="text-end">${filterSummary.total}</td>
                                                </tr>
                                                <tr>
                                                    <td>Oportunidades após filtro:</td>
                                                    <td class="text-end">${filterSummary.filtered}</td>
                                                </tr>
                                                <tr>
                                                    <td>Taxa de aproveitamento:</td>
                                                    <td class="text-end">${((filterSummary.filtered/filterSummary.total)*100).toFixed(1)}%</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card mb-3">
                                <div class="card-header bg-dark">
                                    <h6 class="mb-0">Configurações Aplicadas</h6>
                                </div>
                                <div class="card-body">
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <tbody>
                                                <tr>
                                                    <td>Lucro mínimo:</td>
                                                    <td class="text-end">${currentConfig?.minProfitPercentage || 0}%</td>
                                                </tr>
                                                <tr>
                                                    <td>Todas as casas:</td>
                                                    <td class="text-end">${currentConfig?.bookmakers?.all ? 'Sim' : 'Não'}</td>
                                                </tr>
                                                <tr>
                                                    <td>Arbitragem ao vivo:</td>
                                                    <td class="text-end">${currentConfig?.arbitrageTypes?.live ? 'Sim' : 'Não'}</td>
                                                </tr>
                                                <tr>
                                                    <td>Arbitragem padrão:</td>
                                                    <td class="text-end">${currentConfig?.arbitrageTypes?.standard ? 'Sim' : 'Não'}</td>
                                                </tr>
                                                <tr>
                                                    <td>Odds mínima:</td>
                                                    <td class="text-end">${currentConfig?.oddsLimits?.min || 0}</td>
                                                </tr>
                                                <tr>
                                                    <td>Odds máxima:</td>
                                                    <td class="text-end">${currentConfig?.oddsLimits?.max || 0}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header bg-dark">
                            <h6 class="mb-0">Mercados Permitidos</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                ${Object.entries(currentConfig?.markets || {}).map(([key, enabled]) => `
                                    <div class="col-md-4 mb-2">
                                        <div class="d-flex align-items-center">
                                            <i class="fas fa-${enabled ? 'check text-success' : 'times text-danger'} me-2"></i>
                                            <span class="badge ${getBadgeClass(key)}">
                                                <i class="fas fa-${getMarketIcon(key)} me-1"></i>
                                                ${getMarketName(key)}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    ${Object.keys(reasonsSummary).length > 0 ? `
                        <div class="card mt-3">
                            <div class="card-header bg-dark">
                                <h6 class="mb-0">Razões de Filtro</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Motivo</th>
                                                <th class="text-end">Quantidade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${Object.entries(reasonsSummary).map(([reason, count]) => `
                                                <tr>
                                                    <td>${reason}</td>
                                                    <td class="text-end">${count}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ` : ''}
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

// Função para remover duplicatas
function removeDuplicateOpportunities(opportunities) {
    const uniqueMap = new Map();
    const duplicatesFound = [];
    
    opportunities.forEach(opp => {
        // Criar uma chave única mais robusta
        const key = generateOpportunityKey(opp);
        
        // Verificar se já existe uma oportunidade com essa chave
        if (uniqueMap.has(key)) {
            const existingOpp = uniqueMap.get(key);
            duplicatesFound.push({
                original: existingOpp,
                duplicate: opp,
                key: key
            });
            
            // Manter apenas a com maior lucro
            if (opp.profit_percentage > existingOpp.profit_percentage) {
                uniqueMap.set(key, opp);
                console.log(`Substituída oportunidade para ${key} - Novo lucro: ${opp.profit_percentage}% (anterior: ${existingOpp.profit_percentage}%)`);
            }
        } else {
            uniqueMap.set(key, opp);
            console.log(`Nova oportunidade única: ${key} - Lucro: ${opp.profit_percentage}%`);
        }
    });

    // Log do resumo de duplicatas
    if (duplicatesFound.length > 0) {
        console.log('Resumo de duplicatas encontradas:', {
            total: duplicatesFound.length,
            detalhes: duplicatesFound.map(d => ({
                jogo: `${d.original.home_team} vs ${d.original.away_team}`,
                lucroOriginal: d.original.profit_percentage,
                lucroDuplicata: d.duplicate.profit_percentage,
                chave: d.key
            }))
        });
    }

    // Retornar array com oportunidades únicas, ordenado por lucro
    return Array.from(uniqueMap.values())
        .sort((a, b) => b.profit_percentage - a.profit_percentage);
}

// Função para gerar chave única da oportunidade
function generateOpportunityKey(opp) {
    // Criar array com todos os elementos que compõem a chave
    const keyElements = [
        opp.home_team,
        opp.away_team,
        opp.market_key || 'default',
        opp.home_bookmaker,
        opp.away_bookmaker
    ];
    
    // Adicionar draw_bookmaker se existir
    if (opp.draw_bookmaker) {
        keyElements.push(opp.draw_bookmaker);
    }
    
    // Normalizar e ordenar casas de apostas para garantir consistência
    const bookmakers = [opp.home_bookmaker, opp.away_bookmaker, opp.draw_bookmaker]
        .filter(Boolean)
        .sort()
        .join('-');
    
    // Retornar chave única normalizada
    return `${opp.home_team}-${opp.away_team}-${opp.market_key || 'default'}-${bookmakers}`.toLowerCase();
}

// Função para mostrar mensagem quando não há oportunidades
function showNoOpportunitiesMessage(table, type, message) {
    const row = table.insertRow();
    row.innerHTML = `
        <td colspan="6" class="text-center">
            <div class="alert alert-${type} mb-0">
                <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                ${message}
                ${type === 'info' ? `
                    <button class="btn btn-sm btn-link text-info" onclick="showFilterInfo()">
                        Ver Detalhes
                    </button>
                ` : ''}
            </div>
        </td>
    `;
}

// Função para renderizar uma linha da tabela
function renderOpportunityRow(table, opportunity) {
    try {
        const row = table.insertRow();
        const profitClass = opportunity.profit_percentage >= 0 ? 'profit-positive' : 'profit-negative';
        const isLiveGame = opportunity.is_live;
        
        // Determinar informações adicionais do mercado
        const marketInfo = getMarketDisplayInfo(opportunity);
        const leagueName = getLeagueName(opportunity);
        
        row.innerHTML = `
            <td data-label="Jogo">
                <div class="d-flex flex-column">
                    <div class="d-flex align-items-center mb-1">
                        <span class="team-name">${opportunity.home_team} vs ${opportunity.away_team}</span>
                    </div>
                    <div class="d-flex gap-1 flex-wrap">
                        ${isLiveGame ? `
                            <span class="badge bg-danger">
                                <i class="fas fa-circle-dot me-1"></i>
                                AO VIVO
                            </span>
                            <span class="badge bg-dark">
                                <i class="fas fa-futbol me-1"></i>
                                ${opportunity.home_score} x ${opportunity.away_score}
                            </span>
                        ` : ''}
                        <span class="badge ${getBadgeClass(opportunity.market_key)}">
                            <i class="fas fa-${getMarketIcon(opportunity.market_key)} me-1"></i>
                            ${getMarketName(opportunity.market_key)}
                        </span>
                        <span class="badge bg-secondary">
                            <i class="fas fa-trophy me-1"></i>
                            ${leagueName}
                        </span>
                    </div>
                    ${marketInfo ? `
                        <small class="text-muted mt-1">
                            <i class="fas fa-info-circle me-1"></i>
                            ${marketInfo}
                        </small>
                    ` : ''}
                </div>
            </td>
            <td data-label="Odd Casa">
                <div class="odds-container">
                    <span class="odds-label">${opportunity.home_bookmaker}</span>
                    <span class="odds-value">${opportunity.home_odds.toFixed(2)}</span>
                    ${getOddInfo(opportunity, 'home')}
                </div>
            </td>
            <td data-label="Odd Fora">
                <div class="odds-container">
                    <span class="odds-label">${opportunity.away_bookmaker}</span>
                    <span class="odds-value">${opportunity.away_odds.toFixed(2)}</span>
                    ${getOddInfo(opportunity, 'away')}
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
                <div class="d-flex gap-1">
                    <button class="btn btn-sm ${isLiveGame ? 'btn-danger' : 'btn-info'} btn-details" 
                            onclick='${isLiveGame ? `showLiveArbitrageDetails(${JSON.stringify(opportunity)})` : `showDetails(${JSON.stringify(opportunity)})`}'>
                        <i class="fas fa-info-circle"></i>
                        <span class="d-none d-sm-inline ms-1">Info</span>
                    </button>
                    ${opportunity.market_key === 'player_props' ? `
                        <button class="btn btn-sm btn-secondary btn-details" onclick='showPlayerStats(${JSON.stringify(opportunity)})'>
                            <i class="fas fa-user"></i>
                            <span class="d-none d-sm-inline ms-1">Stats</span>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
    } catch (error) {
        console.error('Erro ao renderizar linha da oportunidade:', error);
    }
}

// Função auxiliar para obter informações de exibição do mercado
function getMarketDisplayInfo(opportunity) {
    if (opportunity.market_key === 'spreads' || opportunity.market_key === 'alternate_spreads') {
        return `Handicap: ${opportunity.home_point > 0 ? '+' : ''}${opportunity.home_point}`;
    } else if (opportunity.market_key === 'totals' || opportunity.market_key === 'alternate_totals') {
        return `Total: ${opportunity.total_value || 'N/A'}`;
    } else if (opportunity.market_key === 'player_props') {
        return `${opportunity.player_name || 'Jogador'}: ${opportunity.prop_value || 'N/A'}`;
    }
    return '';
}

// Função auxiliar para obter informações adicionais da odd
function getOddInfo(opportunity, type) {
    if (opportunity.market_key === 'spreads' || opportunity.market_key === 'alternate_spreads') {
        const point = type === 'home' ? opportunity.home_point : opportunity.away_point;
        return `<small class="text-muted">(${point > 0 ? '+' : ''}${point})</small>`;
    }
    return '';
}

// Função removida pois os detalhes agora são mostrados diretamente no card

// Função auxiliar para obter informações detalhadas do mercado
function getMarketInfo(opportunity) {
    switch(opportunity.market_key) {
        case 'h2h':
            return 'Mercado 1X2 - Resultado final do jogo (Casa, Empate, Fora)';
        case 'spreads':
            return `Handicap Asiático: ${opportunity.home_team} (${opportunity.home_point > 0 ? '+' : ''}${opportunity.home_point}) x ${opportunity.away_team} (${opportunity.away_point > 0 ? '+' : ''}${opportunity.away_point})`;
        case 'totals':
            return `Over/Under (Gols/Pontos): ${opportunity.total_value || 'N/A'}`;
        case 'h2h_q1':
            return 'Resultado 1X2 do Primeiro Quarto';
        case 'h2h_h1':
            return 'Resultado 1X2 do Primeiro Tempo';
        case 'outrights':
            return 'Vencedor do Campeonato/Torneio';
        case 'alternate_spreads':
            return `Handicap Asiático Alternativo: ${opportunity.home_team} (${opportunity.home_point > 0 ? '+' : ''}${opportunity.home_point}) x ${opportunity.away_team} (${opportunity.away_point > 0 ? '+' : ''}${opportunity.away_point})`;
        case 'alternate_totals':
            return `Over/Under Alternativo: ${opportunity.total_value || 'N/A'}`;
        case 'player_props':
            return `Estatísticas do Jogador - ${opportunity.player_name || 'Jogador'} - ${opportunity.prop_type || 'N/A'} (${opportunity.prop_value || 'N/A'})`;
        case 'draw_no_bet':
            return 'Chance Dupla (Sem Empate)';
        case 'double_chance':
            return 'Dupla Chance (1X, X2, 12)';
        case 'exact_score':
            return 'Placar Exato';
        case 'both_teams_to_score':
            return 'Ambas Equipes Marcam (Sim/Não)';
        case 'first_scorer':
            return 'Primeiro Jogador a Marcar';
        case 'last_scorer':
            return 'Último Jogador a Marcar';
        case 'anytime_scorer':
            return 'Jogador Marca a Qualquer Momento';
        case 'clean_sheet':
            return 'Clean Sheet (Não Sofrer Gols)';
        case 'winning_margin':
            return 'Margem de Vitória';
        case 'half_time_full_time':
            return 'Resultado Intervalo/Final';
        case 'race_to':
            return 'Corrida Para X Gols/Pontos';
        case 'corners':
            return 'Total de Escanteios';
        case 'cards':
            return 'Total de Cartões';
        case 'half_betting':
            return 'Aposta por Tempo/Período';
        default:
            return `Mercado: ${opportunity.market_key || 'Não especificado'}`;
    }
}

// Função para mostrar estatísticas do jogador
function showPlayerStats(opportunity) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-user me-2"></i>
                        Estatísticas do Jogador
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="card">
                        <div class="card-header bg-secondary text-white">
                            <h6 class="mb-0">${opportunity.player_name || 'Jogador'}</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Informações da Aposta</h6>
                                    <table class="table table-sm">
                                        <tbody>
                                            <tr>
                                                <td>Tipo:</td>
                                                <td>${opportunity.prop_type || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td>Linha:</td>
                                                <td>${opportunity.prop_value || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td>Mercado:</td>
                                                <td>${opportunity.prop_market || 'N/A'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6>Estatísticas da Temporada</h6>
                                    <table class="table table-sm">
                                        <tbody>
                                            <tr>
                                                <td>Média:</td>
                                                <td>${opportunity.season_average || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td>Últimos 5 jogos:</td>
                                                <td>${opportunity.last_5_average || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td>% Over:</td>
                                                <td>${opportunity.over_percentage ? opportunity.over_percentage + '%' : 'N/A'}</td>
                                            </tr>
                                        </tbody>
                                    </table>
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

// Atualizar a função de inicialização
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
    
    // Carregar dados iniciais apenas para os contadores
    Promise.all([
        fetch('/api/games?league=serie_a').then(res => res.json()).catch(() => []),
        fetch('/api/games?league=serie_b').then(res => res.json()).catch(() => []),
        fetch('/api/arbitrage').then(res => res.json()).catch(() => []),
        fetch('/api/live-arbitrage').then(res => res.json()).catch(() => [])
    ]).then(([serieAGames, serieBGames, arbitrageData, liveArbitrageData]) => {
        // Atualizar apenas os contadores nos cards
        document.getElementById('serieACount').textContent = `${serieAGames.length || 0} jogos`;
        document.getElementById('serieBCount').textContent = `${serieBGames.length || 0} jogos`;
        document.getElementById('opportunitiesCount').textContent = 
            `${(arbitrageData.length || 0) + (liveArbitrageData.length || 0)} oportunidades`;
    }).catch(error => {
        console.error('Erro ao carregar dados iniciais:', error);
        showToast('Erro ao carregar dados. Tente novamente.', 'error');
    });
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
            },
            markets: {
                h2h: 'boolean',
                spreads: 'boolean',
                totals: 'boolean',
                h2h_q1: 'boolean',
                h2h_h1: 'boolean',
                outrights: 'boolean',
                alternate_spreads: 'boolean',
                alternate_totals: 'boolean',
                player_props: 'boolean'
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

// Funções auxiliares para mercados
function getBadgeClass(marketKey) {
    switch(marketKey) {
        case 'h2h': return 'bg-primary';
        case 'spreads': return 'bg-success';
        case 'totals': return 'bg-info';
        case 'h2h_q1':
        case 'h2h_h1': return 'bg-warning';
        case 'outrights': return 'bg-dark';
        case 'alternate_spreads': return 'bg-success';
        case 'alternate_totals': return 'bg-info';
        case 'player_props': return 'bg-secondary';
        default: return 'bg-secondary';
    }
}

function getMarketIcon(marketKey) {
    switch(marketKey) {
        case 'h2h': return 'trophy';
        case 'spreads': return 'balance-scale';
        case 'totals': return 'chart-line';
        case 'h2h_q1': return 'hourglass-start';
        case 'h2h_h1': return 'clock';
        case 'outrights': return 'crown';
        case 'alternate_spreads': return 'balance-scale-right';
        case 'alternate_totals': return 'chart-bar';
        case 'player_props': return 'user';
        default: return 'futbol';
    }
}

function getMarketName(marketKey) {
    switch(marketKey) {
        case 'h2h': return 'Resultado Final';
        case 'spreads': return 'Handicap';
        case 'totals': return 'Over/Under';
        case 'h2h_q1': return '1º Quarto';
        case 'h2h_h1': return '1º Tempo';
        case 'outrights': return 'Campeão';
        case 'alternate_spreads': return 'Handicap Alt.';
        case 'alternate_totals': return 'Over/Under Alt.';
        case 'player_props': return 'Jogador';
        default: return 'Padrão';
    }
}

// Função para mostrar informações sobre os filtros
function showFilterInfo() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-filter me-2"></i>
                        Critérios de Filtro
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-info">
                        <h6>Configurações Atuais:</h6>
                        <ul class="mb-0">
                            <li>Lucro Mínimo: ${currentConfig?.minProfitPercentage}%</li>
                            <li>Odds: ${currentConfig?.oddsLimits?.min} a ${currentConfig?.oddsLimits?.max}</li>
                            <li>Stake Máxima: R$ ${currentConfig?.maxStakePerBet}</li>
                            <li>Stake Total Máxima: R$ ${currentConfig?.maxTotalStake}</li>
                        </ul>
                    </div>
                    <div class="alert alert-warning">
                        <h6>Tipos de Arbitragem Permitidos:</h6>
                        <ul class="mb-0">
                            <li>Padrão: ${currentConfig?.arbitrageTypes?.standard ? 'Sim' : 'Não'}</li>
                            <li>Ao Vivo: ${currentConfig?.arbitrageTypes?.live ? 'Sim' : 'Não'}</li>
                            <li>Asiática: ${currentConfig?.arbitrageTypes?.asian ? 'Sim' : 'Não'}</li>
                        </ul>
                    </div>
                    <p class="mb-0 text-muted">
                        <small>
                            <i class="fas fa-info-circle me-1"></i>
                            Ajuste estas configurações no menu de configurações do bot para ver mais oportunidades.
                        </small>
                    </p>
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

// Função para obter o nome formatado da liga
function getLeagueName(opportunity) {
    // Verifica primeiro o nome completo da liga
    if (opportunity.league_name) {
        return opportunity.league_name;
    }
    
    // Se não tiver nome completo, tenta usar a chave da liga
    if (opportunity.league_key) {
        // Mapeia as chaves conhecidas para nomes amigáveis
        const leagueMap = {
            'soccer_brazil_campeonato': 'Campeonato Brasileiro Série A',
            'soccer_brazil_serie_b': 'Campeonato Brasileiro Série B',
            'soccer_libertadores': 'CONMEBOL Libertadores',
            'soccer_copa_brasil': 'Copa do Brasil',
            'soccer_brazil_carioca': 'Campeonato Carioca',
            'soccer_brazil_paulista': 'Campeonato Paulista',
            'soccer_brazil_gaucho': 'Campeonato Gaúcho',
            'soccer_brazil_mineiro': 'Campeonato Mineiro',
            // Adicione mais mapeamentos conforme necessário
        };
        
        // Retorna o nome mapeado ou formata a chave para exibição
        return leagueMap[opportunity.league_key] || 
               opportunity.league_key
                   .replace('soccer_', '')
                   .replace(/_/g, ' ')
                   .split(' ')
                   .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                   .join(' ');
    }
    
    // Se não tiver nem nome nem chave, usa o sport_key para dar alguma informação
    if (opportunity.sport_key) {
        const sportMap = {
            'soccer': 'Futebol',
            'basketball': 'Basquete',
            'tennis': 'Tênis',
            'volleyball': 'Vôlei'
        };
        return sportMap[opportunity.sport_key] || opportunity.sport_key;
    }
    
    // Se não tiver nenhuma informação
    return 'Liga não especificada';
}

function formatDate(dateString) {
    return moment(dateString).tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm');
}

// Funções de navegação
function showNavigationCards() {
    const navigationCards = document.getElementById('navigationCards');
    const serieASection = document.getElementById('serieASection');
    const serieBSection = document.getElementById('serieBSection');
    const arbitrageSection = document.getElementById('arbitrageSection');

    // Mostrar cards de navegação
    navigationCards.classList.remove('d-none');

    // Esconder outras seções
    serieASection.classList.add('d-none');
    serieBSection.classList.add('d-none');
    arbitrageSection.classList.add('d-none');
}

function showGamesSection(section) {
    const card = event.currentTarget;
    card.classList.add('loading');

    // Esconder cards de navegação
    const navigationCards = document.getElementById('navigationCards');
    const serieASection = document.getElementById('serieASection');
    const serieBSection = document.getElementById('serieBSection');
    const arbitrageSection = document.getElementById('arbitrageSection');

    // Esconder todas as seções
    navigationCards.classList.add('d-none');
    serieASection.classList.add('d-none');
    serieBSection.classList.add('d-none');
    arbitrageSection.classList.add('d-none');

    // Carregar e mostrar a seção apropriada
    if (section === 'serieA') {
        serieASection.classList.remove('d-none');
        // Carregar jogos da Série A
        fetch('/api/games?league=serie_a')
            .then(response => response.json())
            .then(games => {
                updateBrazilianGamesTable(games);
                card.classList.remove('loading');
            })
            .catch(error => {
                console.error('Erro ao carregar jogos:', error);
                showToast('Erro ao carregar jogos. Tente novamente.', 'error');
                card.classList.remove('loading');
            });
    } else if (section === 'serieB') {
        serieBSection.classList.remove('d-none');
        // Carregar jogos da Série B
        fetch('/api/games?league=serie_b')
            .then(response => response.json())
            .then(games => {
                updateSerieBTable(games);
                card.classList.remove('loading');
            })
            .catch(error => {
                console.error('Erro ao carregar jogos:', error);
                showToast('Erro ao carregar jogos. Tente novamente.', 'error');
                card.classList.remove('loading');
            });
    }
}

// Variável para armazenar o intervalo de atualização
let arbitrageUpdateInterval;

// Função para iniciar a atualização automática
function startAutomaticUpdate() {
    // Limpar intervalo existente se houver
    if (arbitrageUpdateInterval) {
        clearInterval(arbitrageUpdateInterval);
    }

    // Primeira atualização imediata
    refreshArbitrageTable();

    // Configurar intervalo baseado nas configurações do usuário
    const updateInterval = currentConfig?.updateInterval || 30000; // Padrão: 30 segundos
    arbitrageUpdateInterval = setInterval(refreshArbitrageTable, updateInterval);

    console.log(`Atualização automática iniciada: intervalo de ${updateInterval}ms`);
}

// Função para parar a atualização automática
function stopAutomaticUpdate() {
    if (arbitrageUpdateInterval) {
        clearInterval(arbitrageUpdateInterval);
        arbitrageUpdateInterval = null;
        console.log('Atualização automática parada');
    }
}

// Atualizar a função showArbitrageSection
function showArbitrageSection() {
    const card = event.currentTarget;
    card.classList.add('loading');

    const navigationCards = document.getElementById('navigationCards');
    const serieASection = document.getElementById('serieASection');
    const serieBSection = document.getElementById('serieBSection');
    const arbitrageSection = document.getElementById('arbitrageSection');

    // Esconder todas as seções
    navigationCards.classList.add('d-none');
    serieASection.classList.add('d-none');
    serieBSection.classList.add('d-none');

    // Mostrar seção de arbitragem e iniciar atualização automática
    arbitrageSection.classList.remove('d-none');
    startAutomaticUpdate();
    card.classList.remove('loading');
}

// Atualizar a função showNavigationCards para parar a atualização
function showNavigationCards() {
    stopAutomaticUpdate();
    
    const navigationCards = document.getElementById('navigationCards');
    const serieASection = document.getElementById('serieASection');
    const serieBSection = document.getElementById('serieBSection');
    const arbitrageSection = document.getElementById('arbitrageSection');

    // Mostrar cards de navegação
    navigationCards.classList.remove('d-none');

    // Esconder outras seções
    serieASection.classList.add('d-none');
    serieBSection.classList.add('d-none');
    arbitrageSection.classList.add('d-none');
}

// Atualizar a função refreshArbitrageTable
async function refreshArbitrageTable() {
    try {
        console.log('Iniciando atualização da tabela de arbitragem');
        
        // Buscar dados de arbitragem
        const [arbitrageData, liveArbitrageData] = await Promise.all([
            fetch('/api/arbitrage')
                .then(res => res.json())
                .then(data => {
                    console.log(`Recebidas ${data.length} oportunidades padrão`);
                    return data;
                })
                .catch(err => {
                    console.error('Erro ao buscar arbitragem padrão:', err);
                    return [];
                }),
            fetch('/api/live-arbitrage')
                .then(res => res.json())
                .then(data => {
                    console.log(`Recebidas ${data.length} oportunidades ao vivo`);
                    return data;
                })
                .catch(err => {
                    console.error('Erro ao buscar arbitragem ao vivo:', err);
                    return [];
                })
        ]);

        // Combinar e remover duplicatas
        const allOpportunities = [...(liveArbitrageData || []), ...(arbitrageData || [])];
        const uniqueOpportunities = removeDuplicateOpportunities(allOpportunities);

        // Verificar novas oportunidades que atendem aos critérios
        const validOpportunities = uniqueOpportunities.filter(opp => isValidOpportunity(opp));
        
        // Comparar com as oportunidades anteriores para identificar novas
        const previousOpportunities = JSON.parse(localStorage.getItem('previousOpportunities') || '[]');
        const newOpportunities = validOpportunities.filter(opp => {
            const key = generateOpportunityKey(opp);
            return !previousOpportunities.some(prevOpp => generateOpportunityKey(prevOpp) === key);
        });

        // Notificar sobre novas oportunidades
        if (newOpportunities.length > 0) {
            newOpportunities.forEach(opp => {
                const message = `Nova oportunidade encontrada!\n${opp.home_team} vs ${opp.away_team}\nLucro: ${opp.profit_percentage.toFixed(2)}%`;
                sendBotNotification(message, 'success');
            });
        }

        // Atualizar oportunidades anteriores no localStorage
        localStorage.setItem('previousOpportunities', JSON.stringify(validOpportunities));

        // Atualizar contador
        const countElement = document.getElementById('opportunitiesCount');
        if (countElement) {
            countElement.textContent = `${validOpportunities.length} oportunidades`;
            
            // Adicionar classe de destaque se houver mudança no número
            const previousCount = parseInt(countElement.getAttribute('data-previous-count') || '0');
            if (previousCount !== validOpportunities.length) {
                countElement.classList.add('highlight');
                setTimeout(() => countElement.classList.remove('highlight'), 1000);
                countElement.setAttribute('data-previous-count', validOpportunities.length);
            }
        }

        // Atualizar tabela
        updateArbitrageTable(validOpportunities);
        
        console.log('Atualização da tabela concluída com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar dados:', error);
        sendBotNotification('Erro ao atualizar dados de arbitragem', 'error');
    }
}

// Função para atualizar a tabela de jogos da Série A
function updateSerieATable(games) {
    const container = document.getElementById('serieAGamesContainer');
    if (!container) {
        console.error('Container de jogos da Série A não encontrado');
        return;
    }

    // Limpa o container
    container.innerHTML = '';

    // Atualiza o contador
    document.getElementById('serieACount').textContent = `${games.length} jogos`;

    if (games.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    Nenhum jogo encontrado para a Série A
                </div>
            </div>`;
        return;
    }

    // Cria os cards para cada jogo
    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        
        const statusClass = game.status === 'live' ? 'bg-success' : 
                          game.status === 'scheduled' ? 'bg-warning' : 'bg-danger';
        
        const statusText = game.status === 'live' ? 'Em andamento' : 
                          game.status === 'scheduled' ? 'Não iniciado' : 'Finalizado';
        
        const scoreText = game.status === 'scheduled' ? 'vs' : `${game.home_score} x ${game.away_score}`;
        
        card.innerHTML = `
            <div class="arbitrage-card">
                <div class="arbitrage-header">
                    <span class="badge ${statusClass} position-absolute top-0 end-0 mt-2 me-2">
                        ${statusText}
                    </span>
                    <h5 class="card-title mb-2">Brasileirão Série A</h5>
                    <small class="text-muted">${formatDate(game.date)}</small>
                </div>
                <div class="arbitrage-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="text-center flex-grow-1">
                            <img src="${game.home_team_logo || '/img/team-placeholder.png'}" 
                                 alt="${game.home_team}" 
                                 class="team-logo mb-2" 
                                 style="width: 40px; height: 40px;">
                            <h6 class="mb-0 team-name">${game.home_team}</h6>
                        </div>
                        <div class="text-center px-3">
                            <h4 class="mb-0 score">
                                ${scoreText}
                            </h4>
                        </div>
                        <div class="text-center flex-grow-1">
                            <img src="${game.away_team_logo || '/img/team-placeholder.png'}" 
                                 alt="${game.away_team}" 
                                 class="team-logo mb-2" 
                                 style="width: 40px; height: 40px;">
                            <h6 class="mb-0 team-name">${game.away_team}</h6>
                        </div>
                    </div>
                </div>
                <div class="arbitrage-footer">
                    <div class="d-flex justify-content-between align-items-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="showGameStats('${game.home_team}', '${game.away_team}', '${game.game_id}')">
                            <i class="fas fa-chart-bar me-1"></i>
                            Estatísticas
                        </button>
                        <span class="badge bg-info">
                            <i class="fas fa-clock me-1"></i>
                            ${game.time || 'A definir'}
                        </span>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Função para atualizar a tabela de jogos da Série B
function updateSerieBTable(games) {
    console.log('Atualizando tabela Série B:', games);
    const table = document.getElementById('serieBTable').getElementsByTagName('tbody')[0];
    table.innerHTML = '';

    if (!games || games.length === 0) {
        const row = table.insertRow();
        row.innerHTML = `
            <td colspan="4" class="text-center">
                <div class="alert alert-info mb-0">
                    <i class="fas fa-info-circle me-2"></i>
                    Nenhum jogo encontrado no momento
                </div>
            </td>
        `;
        return;
    }

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
                <button class="btn btn-sm btn-warning btn-details" onclick='showGameStats("${game.home_team}", "${game.away_team}", "${game.game_id}")'>
                    <i class="fas fa-chart-bar"></i>
                    <span class="d-none d-sm-inline ms-1">Stats</span>
                </button>
            </td>
        `;
    });
}

// Remover os estilos dos cards de navegação que não são mais necessários
const navigationStyle = document.createElement('style');
navigationStyle.textContent = `
    .navigation-card {
        transition: all 0.3s ease;
        cursor: pointer;
    }

    .navigation-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .navigation-card.loading {
        opacity: 0.7;
        pointer-events: none;
    }
`;

document.head.appendChild(navigationStyle);