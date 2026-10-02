# Chess to GM ♛

Juego para aprender ajedrez desde cero hasta Gran Maestro. Estética "neón real + píxel": letreros de neón dorados y carmesí sobre una pared de noche, letra de píxel y piezas clásicas.

- **Problemas**: un mapa con 168 puzzles reales de Lichess (400–2500) ordenados por dificultad en 8 salas del castillo. Cada problema resuelto abre el siguiente; los superados se pueden repetir sin ganar puntos. Con pistas, racha y valoración propia (fallar el mismo problema solo penaliza la primera vez).
- **Aperturas**: 12 aperturas explicadas jugada a jugada, con modo práctica y estrellas.
- **Bots**: 11 rivales de 100 a 2000 de ELO (más un ELO a medida), jugando con blancas, negras o aleatorio.
- **Modos**: variantes amistosas que no tocan el ELO, contra bots o amigos. La primera es **Caballería** (todos los peones son caballos); añadir otra es una entrada en `data/variants.ts` con su posición inicial. Y **La Reina**, un incremental de eliminación en pixel art (ver abajo).
- **La Reina** (`#/reina`): partidas contra reloj en las que eres una reina y cazas las piezas que van apareciendo. Clic/toque o WASD + Q/E/Z/C para moverte; Espacio para el frenesí, que cruza el tablero llevándose toda la fila. Los muros cortan el deslizamiento. El tablero nunca se queda vacío: por debajo de un mínimo de piezas, aparecen al instante. Hay críticos, piezas doradas, hitos de combo con premio (x5, x10, x25…), objetos sueltos y cofres. El oro se gasta en un **mapa de mejoras** de 69 nodos en 8 ramas alrededor de la corona (`game/tree.ts`; cada nodo abre los de al lado):
  - Reina: ataque, velocidad, stamina, alcance, lanza y golpe doble.
  - Oro: codicia, críticos, premio gordo, doradas, cofres, hucha y Midas.
  - Tiempo: reloj, combo, botín, cronófago y prórroga.
  - Frenesí: onda expansiva, demoledora y desatada.
  - Ejército: ritmo, cantidad, rangos, oleadas y reino.
  - Caballo (tecla 1 o clic derecho): salto en L por encima de muros, coz y bombas que revientan muros, con gran bomba, cadena y racimo.
  - Alfil (tecla 2): rayos diagonales, en 8 direcciones, perforantes y con eco.
  - Rey y torre: aura pasiva y enroque (tecla 3), que salta a la pieza más valiosa.

  Las estadísticas salen de sumar los nodos sobre `BASE_STATS` (`game/stats.ts`). La lógica es TypeScript puro en `features/queen/game/` (`queen-game.ts`). Todo se dibuja en un único canvas con sprites de 16×16: las piezas de `data/pixel-pieces.json` (las mismas que el tablero Píxel) y los objetos de `render/fx-sprites.ts`. El progreso se guarda en `chess-to-gm.queen.v1`.
- **Amigos**: partidas P2P por enlace o código QR, sin servidor propio, con chat y frases rápidas.
- **Chat con los bots**: saludan, contestan cuando les escribes y comentan tus jugadas más llamativas.
- **Feedback de jugadas**: brillante (!!), genial (!), la mejor (★), excelente (👍), buena (✓), teoría (libro), imprecisión (?!), ocasión perdida (✕), error (?) y error grave (??).
- **Resumen y revisión**: precisión, recuento por tipo de jugada, gráfica de evaluación y momentos clave. En la revisión, cada jugada trae su nota, cómo cambian tus opciones de ganar, la jugada hecha frente a la mejor y la línea del motor paso a paso. Tus fallos se pueden **reintentar** sobre el tablero (el motor corrige el intento) y hay un modo **práctica** que los encadena todos.
- **Portada**: el rival que te toca, tu última partida, el siguiente problema y un escaparate que reproduce en bucle partidas célebres (la de la Ópera, la Inmortal y la Siempreviva).
- **Progresión**: ELO, XP, niveles, 10 rangos propios y 6 tableros con piezas a juego: Neón, Píxel y Madera de inicio; Graffiti (nivel 4), Synthwave (7) y Trono (10) se desbloquean.

## Puesta en marcha

```bash
npm install
npm start            # http://localhost:4300
npm run start:lan    # accesible desde otros dispositivos de tu red (para probar el QR con el móvil)
npm run build        # build de producción en dist/
```

> Requiere Node 22.12+. Usa Angular 21 (Angular 22 exige Node 22.22.3 o superior).

## Estructura

```
src/
├─ styles/                 Estilos globales: tokens, base, componentes y temas de tablero
└─ app/
   ├─ core/
   │  ├─ models/           Tipos e interfaces
   │  ├─ chess/            Lógica pura: clasificación de jugadas, comentarios, libro de aperturas
   │  ├─ engine/           Stockfish en Web Worker, análisis y cerebro de los bots
   │  ├─ progression/      Fórmulas de ELO, XP y niveles
   │  ├─ repositories/     Persistencia (localStorage) tras una interfaz intercambiable
   │  └─ services/         Perfil, historial, recompensas, sonido, multijugador
   ├─ data/                Bots, aperturas, rangos, tableros, puzzles y el camino de salas (puzzle-path.ts)
   ├─ shared/components/   Tablero, barra y gráfica de evaluación, lista de jugadas…
   ├─ layout/              Cabecera
   └─ features/            Una carpeta por pantalla
scripts/
├─ build-pieces.mjs        Diseña las piezas en SVG (o en píxeles, el tema Píxel) y las exporta a WebP con sharp (npm run pieces)
├─ pieces/                 Geometría de las piezas y materiales de cada tema
├─ build-puzzles.mjs       Genera el banco de puzzles desde la base de datos de Lichess
└─ build-icons.mjs         Extrae los iconos de game-icons.net que usa la app (npm run icons)
public/
└─ pieces/<tema>/          Piezas WebP generadas (256 px, con su sombra o resplandor incluidos)
```

Stockfish no está en el repositorio: es la dependencia npm `stockfish` y `angular.json` copia sus dos ficheros (`.js` + `.wasm`) a `/engine` al compilar. Es código generado por Emscripten; el código propio que habla con él es `core/engine/uci-engine.ts`.

Cada componente tiene su `.ts`, `.html` y `.scss` por separado. Los estilos comunes viven en `src/styles/`: tokens de color, mixins del estilo "juego" (`outlined`, `frame`, `chunky`, `parchment`, `neon-text`, `selector`, `neon-hover`, que se importan con `@use 'mixins' as *;`) y las piezas reutilizables (`.panel`, `.ribbon`, `.btn`, `.parchment`…).

Al pasar el ratón nada se levanta, crece ni se aclara. Las tarjetas que llevan a algún sitio muestran el cursor de selección de recreativa (`selector`: cuatro esquinas de píxel que laten), los enlaces de texto se encienden como un neón (`neon-hover`) y los botones solo se hunden al pulsarlos (`chunky`). El graffiti se reserva para pintadas sueltas ("¡nuevo!", "¡para ti!"), no para textos de interfaz.

Los temas de tablero están en `src/styles/_board-themes.scss`: cada uno define las variables que lee el componente Board (casillas, marco, ribete, resaltados) y, si quiere, un decorado en `.board__fx` (la rejilla del neón, las pintadas del graffiti). Sus piezas salen de `scripts/pieces/palettes.mjs`: Graffiti son pegatinas con borde blanco (`sticker`), Synthwave un cromado con horizonte continuo (`horizon`) y Píxel los sprites de `data/pixel-pieces.json` ampliados sin suavizar.

## Cómo funciona

- **Motor**: Stockfish 19 (WASM, versión lite de un solo hilo) en dos Web Workers: uno analiza y otro piensa las jugadas de los bots. Analizar una partida de 30-40 jugadas lleva un par de segundos.
- **Bots por debajo de 1320**: Stockfish no baja de ese ELO, así que la fuerza se simula reduciendo la profundidad, eligiendo entre varias candidatas con aleatoriedad ponderada y metiendo despistes ocasionales (`core/engine/bot-brain.ts`).
- **Clasificación**: compara la probabilidad de victoria antes y después de cada jugada (fórmula de Lichess) y añade la detección de sacrificios, de jugadas únicas y de oportunidades perdidas (`core/chess/classification.ts`).
- **Revisión** (`features/review/`): el contenedor guarda el estado (jugada, vista del tablero, reintento, práctica) y lo reparte entre la portada (`review-overview`), el comentario de cada jugada (`coach-card`) y el reintento (`retry-card`). Las reglas de qué es un momento clave o un fallo corregible están en `review.rules.ts`.
- **Multijugador**: WebRTC con PeerJS. Jugadas, chat, tablas y revanchas viajan por el mismo canal de datos. El servidor público de PeerJS solo pone en contacto a los dos navegadores; la partida va directamente entre ellos. Desde `localhost` el QR no funcionará en otro dispositivo: usa `npm run start:lan` o publícala en un hosting.

## Rendimiento

Para que el scroll y las animaciones vayan a 60 fps:

- Nada de `filter: drop-shadow()` en piezas o iconos repetidos: las sombras de las piezas van horneadas en la imagen (`scripts/pieces/palettes.mjs`, `SHADOWS`) y el contorno de los iconos es un trazo SVG (`--icon-stroke`).
- Las piezas se publican como WebP, no como SVG: con 72 piezas distintas en pantalla (la página de Tableros), interpretar y rasterizar SVG con degradados, texturas y sombra bloqueaba el hilo principal ~260 ms; con imágenes son ~70 ms.
- El fondo de la página es una capa `position: fixed` (`body::before`), no `background-attachment: fixed`, que repinta toda la pantalla en cada scroll.
- Las animaciones infinitas de los tableros (el parpadeo del neón, el barrido de Synthwave, el destello de Trono) solo animan `opacity` y `transform`.
- El resplandor de neón (`neon-text`, `neon-box` en `_mixins.scss`) se pinta con sombras desenfocadas: solo en letreros sueltos (títulos, la sección activa, la Reina), nunca en elementos repetidos. Las esquinas de píxel son un `clip-path`, que no cuesta pintar.

## Hacia usuarios y base de datos

El perfil y el historial se guardan en `localStorage` mediante `ProfileRepository` y `GameRepository` (`core/repositories`). Para usar un backend basta con crear implementaciones HTTP de esas dos clases y cambiar los providers en `app.config.ts`. El resto de la app no necesita cambios.

## Regenerar recursos

```bash
npm run pieces                      # piezas WebP (tras tocar scripts/pieces/*)
npm run pieces -- --preview hoja.png  # además, hoja de muestra con todas las piezas
npm run puzzles -- puzzles.csv      # banco de puzzles (ver instrucciones en el script)
npm run icons                       # iconos (tras añadir uno en scripts/build-icons.mjs)
```

## Créditos y licencias

- [Stockfish.js](https://github.com/nmrugg/stockfish.js) (GPLv3).
- Puzzles de la [base de datos de Lichess](https://database.lichess.org/) (CC0).
- [chess.js](https://github.com/jhlywa/chess.js), [PeerJS](https://peerjs.com/), [qrcode](https://github.com/soldair/node-qrcode).
- Iconos de [game-icons.net](https://game-icons.net/) (CC BY 3.0) por Lorc, Delapouite y otros autores, vía `@iconify-json/game-icons`.
- Fuentes [Jersey 10](https://fonts.google.com/specimen/Jersey+10), [Alegreya Sans](https://fonts.google.com/specimen/Alegreya+Sans) y [Permanent Marker](https://fonts.google.com/specimen/Permanent+Marker) (SIL OFL / Apache 2.0), vía Fontsource.
- Piezas, tableros, rangos y bots: diseño propio.
