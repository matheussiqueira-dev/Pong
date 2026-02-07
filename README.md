# Pong por Gestos

Pong 2D com controle de raquete por gesto de mao em tempo real, projetado para demos rapidas com baixa latencia, leitura visual clara e curva de aprendizado minima.

## Objetivo

Entregar uma experiencia interativa que funcione bem em apresentacoes, eventos e portfolio tecnico:

- Controle 1D intuitivo (eixo Y da mao -> eixo Y da raquete).
- Feedback visual imediato.
- Arquitetura modular e facil de evoluir.
- Boa performance em maquinas comuns.

## Principais recursos

- Tracking de mao com MediaPipe Hands.
- Suavizacao de movimento para reduzir jitter.
- Deadzone para evitar micro-oscilacao.
- Fallback automatico quando a mao nao e detectada.
- Modo demo automatico (sem camera).
- Ajuste de sensibilidade em tempo real.
- HUD com estado de tracking e latencia estimada.
- Janela espelhada da webcam com esqueleto tecnico da mao.

## Como funciona o controle por gestos

Fluxo do input:

1. Captura da camera em tempo real.
2. Deteccao de landmarks da mao (1 mao).
3. Extracao da coordenada vertical da palma.
4. Aplicacao de filtro exponencial + deadzone.
5. Mapeamento direto para a raquete do jogador.

Decisao de UX: usar apenas o eixo Y torna o controle natural, previsivel e facil para qualquer publico.

## Arquitetura

Separacao por camadas para manter responsabilidade unica:

- `src/vision/CameraCapture.js`: captura de webcam.
- `src/vision/HandTracker.js`: interface com MediaPipe Hands.
- `src/vision/GestureController.js`: processamento do sinal gestual e estado de tracking.
- `src/game/PongEngine.js`: regras do jogo (fisica, colisao, pontuacao, IA).
- `src/render/CanvasRenderer.js`: renderizacao Canvas 2D e feedback visual.
- `src/app/AppController.js`: orquestracao de app, eventos de UI e ciclo principal.
- `src/config/gameConfig.js`: parametros centrais de jogo e tracking.
- `src/utils/math.js`: utilitarios puros reutilizaveis.

Diretrizes aplicadas:

- Clean Architecture pragmatica.
- SOLID sem overengineering.
- Dominio isolado de detalhes de camera/render.

## Stack tecnica

- HTML5
- CSS3
- JavaScript (ES Modules)
- Canvas 2D API
- MediaPipe Hands
- MediaPipe Camera Utils

## Estrutura do projeto

```text
.
|-- index.html
|-- src/
|   |-- app/
|   |-- config/
|   |-- game/
|   |-- render/
|   |-- utils/
|   `-- vision/
`-- README.md
```

## Como executar localmente

Pre-requisito: navegador moderno com suporte a camera e permissao de acesso.

1. Clone o repositorio:

```bash
git clone https://github.com/matheussiqueira-dev/Pong.git
cd Pong
```

2. Rode um servidor local (necessario para ES Modules e camera):

```bash
python -m http.server 5173
```

ou

```bash
npx serve .
```

3. Abra:

- `http://localhost:5173`

4. Clique em `Iniciar com camera` e permita webcam.

## Controles

- Movimento da mao para cima/baixo: move a raquete.
- `D`: alterna modo demo automatico.
- `R`: reinicia a partida.

## Qualidade e performance

- Loop com passo fixo no dominio do jogo para consistencia fisica.
- Renderizacao desacoplada da logica.
- Processamento de input com suavizacao configuravel.
- Fallback para manter a demo funcional mesmo sem tracking estavel.

## Evolucoes recomendadas

- Calibracao inicial por usuario.
- Modo competitivo com dificuldade progressiva.
- Multiplayer local (teclado/gamepad + gesto).
- Overlay tecnico com FPS e metricas de tracking.
- Deploy HTTPS para acesso direto em dispositivos moveis.

## Autor

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
