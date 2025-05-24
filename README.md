# Bot de Arbitragem Esportiva

Este é um bot do Telegram que monitora oportunidades de arbitragem em apostas esportivas usando a API The Odds.

## Funcionalidades

- Monitoramento automático de odds
- Cálculo de oportunidades de arbitragem
- Notificações via Telegram
- Suporte a múltiplos esportes
- Atualização em tempo real

## Pré-requisitos

- Node.js v14 ou superior
- NPM ou Yarn
- Token do Bot do Telegram
- Chave de API do The Odds API

## Configuração

1. Clone o repositório:
```bash
git clone [seu-repositorio]
cd [seu-repositorio]
```

2. Instale as dependências:
```bash
npm install
```

3. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```
TELEGRAM_BOT_TOKEN=seu_token_do_telegram
ODDS_API_KEY=sua_chave_api_the_odds
REFRESH_INTERVAL=300000
```

Para obter as chaves necessárias:
- Token do Telegram: Fale com [@BotFather](https://t.me/BotFather) no Telegram
- Chave da API The Odds: Registre-se em [The Odds API](https://the-odds-api.com)

## Uso

1. Inicie o bot:
```bash
npm start
```

2. No Telegram, procure pelo seu bot e inicie uma conversa.

3. Comandos disponíveis:
- `/start` - Inicia o monitoramento
- `/stop` - Para o monitoramento
- `/sports` - Lista os esportes disponíveis

## Como funciona

O bot monitora continuamente as odds de diferentes casas de apostas e calcula possíveis oportunidades de arbitragem. Quando uma oportunidade é encontrada, ele notifica os usuários ativos via Telegram com os detalhes da aposta e o lucro potencial.

## Contribuição

Sinta-se à vontade para contribuir com o projeto. Abra uma issue ou envie um pull request com suas melhorias.

## Licença

MIT 