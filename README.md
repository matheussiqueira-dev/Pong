# Gesture Pong

Demo interativa de Pong 2D controlada por gestos da mao em tempo real.  
O objetivo e entregar uma experiencia de apresentacao simples, intuitiva e com baixa latencia para demos publicas.

## Visao geral do projeto

- Controle natural por gesto vertical (1D): mao sobe/desce e raquete acompanha no eixo Y.
- Feedback visual imediato no canvas.
- Fallback robusto para modo automatico quando a mao nao e detectada.
- Estrutura modular para facilitar manutencao e evolucao.

## Conceito de controle por gestos

O input do jogador usa apenas a coordenada `Y` da palma da mao detectada pelo MediaPipe Hands:

- Captura de landmarks da mao.
- Extracao da posicao vertical da palma (media de pontos estaveis).
- Suavizacao por filtro exponencial para reduzir jitter.
- Aplicacao de deadzone para evitar micro-oscilacoes.
- Mapeamento direto para a posicao da raquete do jogador.

Esse modelo reduz curva de aprendizado e funciona bem para demos em eventos.

## Arquitetura e decisoes tecnicas

Arquitetura em camadas, com separacao de responsabilidades:

- `src/vision/CameraCapture.js`
  - Camada de captura de video da webcam.
- `src/vision/HandTracker.js`
  - Camada de processamento MediaPipe Hands.
- `src/vision/GestureController.js`
  - Orquestra captura + tracking e aplica suavizacao/deadzone.
- `src/game/PongEngine.js`
  - Regras de dominio do Pong: fisica, colisao, pontuacao, reset de rodada, IA adversaria.
- `src/render/CanvasRenderer.js`
  - Renderizacao 2D de jogo, placar, indicadores e estados visuais.
- `src/app/AppController.js`
  - Orquestra ciclo da aplicacao, eventos UI e roteamento de input (gestual/auto).
- `src/config/gameConfig.js`
  - Parametros centrais de jogo e tracking.
- `src/utils/math.js`
  - Utilitarios matematicos reutilizaveis.

Principios aplicados:

- Clean Architecture leve: dominio (engine) independente de detalhes de UI/camera.
- SOLID pragmatica: classes coesas, baixo acoplamento e extensao simples.
- Sem overengineering: foco em demo rapida, legivel e performatica.

## Tecnologias utilizadas

- HTML5 + CSS3
- JavaScript (ES Modules)
- Canvas 2D API
- MediaPipe Hands (`@mediapipe/hands`)
- MediaPipe Camera Utils (`@mediapipe/camera_utils`)

## Instrucoes de execucao

1. Abra um terminal na pasta do projeto.
2. Suba um servidor local (necessario para camera e modulos ES).

Opcao com Python:

```bash
python -m http.server 5173
```

Opcao com Node:

```bash
npx serve .
```

3. Acesse no navegador:

- `http://localhost:5173` (Python)
- ou a porta exibida pelo `serve`.

4. Clique em **Iniciar com camera** e permita acesso a webcam.

Atalhos:

- `D`: alterna modo demo automatico
- `R`: reinicia partida

## Possiveis evolucoes futuras

- Selecao de mao dominante (esquerda/direita).
- Modo multiplayer local com segundo input (teclado/gamepad).
- Ajuste dinamico de dificuldade da IA.
- Detector de gestos adicionais (pausar, reiniciar, menu).
- Telemetria de latencia e FPS em painel tecnico.
- Deploy web com HTTPS para uso em dispositivos moveis.

Autoria: Matheus Siqueira
Website: https://www.matheussiqueira.dev/
