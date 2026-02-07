# Gesture Pong Pro

Aplicacao fullstack para demo interativa de Pong 2D controlado por gestos de mao, com foco em baixa latencia, UX de alto contraste e arquitetura pronta para evolucao.

## Visao geral

O projeto foi estruturado para atender dois objetivos:

- Entregar uma experiencia de apresentacao rapida e intuitiva (camera + gesto vertical da mao).
- Sustentar evolucao de produto com backend versionado para telemetria e leaderboard.

### Publico-alvo

- Eventos, demos tecnicas e showcases de produto.
- Portfolio de frontend interativo + visao computacional.
- Experimentacao de interfaces naturais (gestos).

## Arquitetura e decisoes tecnicas

### Frontend (Clean Architecture pragmatica)

- `src/app/AppController.js`
  - Orquestracao da aplicacao (loop, estados, integracao entre camadas).
- `src/app/UIFacade.js`
  - Camada de UI desacoplada da logica de dominio.
- `src/game/PongEngine.js`
  - Regras de negocio: fisica, colisao, pontuacao, fim de partida.
- `src/render/CanvasRenderer.js`
  - Renderizacao do jogo em Canvas 2D.
- `src/render/WebcamMirrorRenderer.js`
  - Espelhamento da webcam + esqueleto tecnico da mao.
- `src/vision/CameraCapture.js`, `src/vision/HandTracker.js`, `src/vision/GestureController.js`
  - Captura de video, tracking da mao e processamento/suavizacao de input.
- `src/services/BackendClient.js`
  - Cliente HTTP para API (`/api/v1`).

### Backend (Node.js, REST versionada)

- `backend/server.js`
  - API REST com rotas versionadas (`/api/v1`).
  - Validacao de payload, CORS configuravel, rate limiting em memoria, tratamento de erros.
- `backend/store/SessionStore.js`
  - Persistencia simples em JSON com escrita atomica.
- `backend/config.js`
  - Config central via variaveis de ambiente.

### Principios aplicados

- SOLID e separacao de responsabilidades.
- DRY em componentes de UI e acesso a dados.
- Contratos de API claros com versionamento.
- Evolucao incremental sem overengineering.

## Regra de rastreamento e descoberta online

Nenhuma estrutura existente de rastreamento, indexacao ou descoberta foi removida/alterada de forma a quebrar comportamento.

- Scripts e integracoes de terceiros existentes foram preservados.
- Mudancas visuais e estruturais foram isoladas da camada de metadata/rastreamento.

## Stack

- HTML5
- CSS3
- JavaScript (ES Modules)
- Canvas 2D API
- MediaPipe Hands (`@mediapipe/hands`)
- MediaPipe Camera Utils (`@mediapipe/camera_utils`)
- Node.js (HTTP API)
- Node Test Runner (`node:test`)

## Estrutura do projeto

```text
.
|-- backend/
|   |-- config.js
|   |-- server.js
|   |-- data/
|   `-- store/
|-- src/
|   |-- app/
|   |-- config/
|   |-- game/
|   |-- render/
|   |-- services/
|   |-- utils/
|   `-- vision/
|-- tests/
|-- index.html
|-- package.json
`-- README.md
```

## Funcionalidades implementadas

- Controle por gesto vertical da mao (1D).
- Suavizacao de movimento com deadzone para reduzir jitter.
- Fallback automatico para controle assistido quando tracking falha.
- Webcam espelhada com esqueleto tecnico da mao.
- Modo demo automatico.
- Fim de partida por objetivo de pontuacao.
- Telemetria de sessao com persistencia em backend.
- Leaderboard exibido na interface.
- Indicadores tecnicos em tempo real (tracking, latencia, FPS, estado da API).

## API (v1)

Base URL: `http://127.0.0.1:8787/api/v1`

- `GET /health`
  - Health check da API.
- `GET /config`
  - Configuracoes publicas da API.
- `GET /leaderboard?limit=7`
  - Top partidas ordenadas por desempenho.
- `GET /sessions`
  - Lista completa de sessoes registradas.
- `POST /sessions`
  - Registra uma sessao finalizada.

Payload de exemplo (`POST /sessions`):

```json
{
  "playerScore": 7,
  "aiScore": 4,
  "winner": "player",
  "durationMs": 92000,
  "controlMode": "gesture",
  "trackingLatencyMs": 33
}
```

## Instalacao e execucao

### Pre-requisitos

- Node.js 18+
- Navegador moderno com suporte a webcam

### 1) Instalar dependencias (somente se adicionar libs extras no futuro)

```bash
npm install
```

### 2) Rodar frontend

```bash
npm run start:web
```

Frontend em geral: `http://127.0.0.1:3000` ou porta informada pelo `serve`.

### 3) Rodar backend

```bash
npm run start:api
```

API em: `http://127.0.0.1:8787`.

## Testes e validacao

Executar toda a suite:

```bash
npm test
```

Validar sintaxe principal:

```bash
npm run check
```

## Deploy

### Frontend

- Servir arquivos estaticos em CDN/edge (Cloudflare Pages, Vercel, Netlify, Nginx).
- Habilitar HTTPS para acesso a webcam em producao.

### Backend

- Deploy Node.js (Render, Railway, Fly.io, VPS, container).
- Configurar variaveis:
  - `API_HOST`
  - `API_PORT`
  - `API_CORS_ORIGINS`
  - `API_WRITE_KEY` (opcional, recomendado em producao)

## Boas praticas adotadas

- UI com contraste elevado, sem comprometer legibilidade a distancia.
- Componentizacao e separacao entre dominio, render e infraestrutura.
- Validacao de dados na API.
- Rate limiting para reduzir abuso.
- Persistencia atomica de dados.
- Tratamento de falhas com fallback de experiencia.

## Melhorias futuras

- Autenticacao de usuarios e perfis.
- Persistencia em banco relacional/NoSQL.
- Observabilidade completa (tracing, metrics, dashboards).
- Modo multiplayer e torneios.
- Exportacao de estatisticas por sessao.
- Testes E2E no navegador.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
