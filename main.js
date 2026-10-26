const app = document.querySelector("#app");
const homeScreen = document.querySelector("#home-screen");
const levelsScreen = document.querySelector("#levels-screen");
const gameScreen = document.querySelector("#game-screen");
const playButton = document.querySelector("#play-button");
const homeButton = document.querySelector("#home-button");
const levelsHomeButton = document.querySelector("#levels-home-button");
const gameLevelsButton = document.querySelector("#game-levels-button");
const winLevelsButton = document.querySelector("#win-levels-button");
const restartButton = document.querySelector("#restart-button");
const settingsButton = document.querySelector("#settings-button");
const settingsDialog = document.querySelector("#settings-dialog");
const closeSettingsButton = document.querySelector("#close-settings");
const topLevelsButton = document.querySelector("#top-levels-button");
const progressButton = document.querySelector("#progress-button");
const progressDialog = document.querySelector("#progress-dialog");
const closeProgressButton = document.querySelector("#close-progress");
const progressLevelsButton = document.querySelector("#progress-levels-button");
const controlsButton = document.querySelector("#controls-button");
const controlsDialog = document.querySelector("#controls-dialog");
const closeControlsButton = document.querySelector("#close-controls");
const reducedMotionToggle = document.querySelector("#reduced-motion");
const showGuideToggle = document.querySelector("#show-guide");
const showTrailToggle = document.querySelector("#show-trail");
const levelGrid = document.querySelector("#level-grid");
const progressCount = document.querySelector("#progress-count");
const progressCleared = document.querySelector("#progress-cleared");
const progressBest = document.querySelector("#progress-best");
const progressHits = document.querySelector("#progress-hits");
const currentLevelLabel = document.querySelector("#current-level");
const difficultyLabel = document.querySelector("#difficulty-label");
const timerLabel = document.querySelector("#timer");
const deathsLabel = document.querySelector("#deaths");
const bestTimeLabel = document.querySelector("#best-time");
const keyCounter = document.querySelector("#key-counter");
const keysCollectedLabel = document.querySelector("#keys-collected");
const gameFootnote = document.querySelector("#game-footnote");
const canvas = document.querySelector("#maze-canvas");
const stage = document.querySelector("#game-stage");
const readyMessage = document.querySelector("#ready-message");
const winMessage = document.querySelector("#win-message");
const winTitle = document.querySelector("#win-title");
const winCopy = document.querySelector("#win-copy");
const completeButton = document.querySelector("#complete-button");
const toast = document.querySelector("#toast");
const context = canvas instanceof HTMLCanvasElement ? canvas.getContext("2d") : null;

if (
  !(app instanceof HTMLElement) ||
  !(homeScreen instanceof HTMLElement) ||
  !(levelsScreen instanceof HTMLElement) ||
  !(gameScreen instanceof HTMLElement) ||
  !(settingsDialog instanceof HTMLDialogElement) ||
  !(reducedMotionToggle instanceof HTMLInputElement) ||
  !(showGuideToggle instanceof HTMLInputElement) ||
  !(showTrailToggle instanceof HTMLInputElement) ||
  !(canvas instanceof HTMLCanvasElement) ||
  !context
) {
  throw new Error("Mousegame could not initialize its screens.");
}

const STORAGE = {
  theme: "mousegame-theme",
  motion: "mousegame-reduced-motion",
  progress: "mousegame-progress",
  cursor: "mousegame-cursor",
  effect: "mousegame-screen-effect",
  guide: "mousegame-show-guide",
  trail: "mousegame-show-trail",
  backdrop: "mousegame-backdrop",
};
const WIDTH = 1000;
const HEIGHT = 560;
const START = { x: 42, y: HEIGHT / 2 };
const GOAL = { x: 930, y: HEIGHT / 2 - 42, width: 42, height: 84 };
const WALL_WIDTH = 14;
const CURSOR_RADIUS = 7;
const THEME_NAMES = ["blue", "forest", "plum", "sunset"];
const LEVEL_NAMES = [
  "First steps", "Key turn", "Crossfire", "Switchback", "Twin gates",
  "Pinball", "The Fork", "The Coil", "Crossroads", "Spiral Vault",
  "The Weave", "Dead-end Docks", "The Crown", "Split Gallery", "Hexlock",
  "The Ladder", "Twin Spires", "Keyworks", "The Labyrinth", "The Gauntlet",
];
const themeButtons = [...document.querySelectorAll("[data-theme-choice]")];
const cursorStyleButtons = [...document.querySelectorAll("[data-cursor-style]")];
const effectButtons = [...document.querySelectorAll("[data-screen-effect]")];
const backdropButtons = [...document.querySelectorAll("[data-backdrop]")];
const state = {
  level: 1,
  unlocked: 20,
  completed: [],
  bestTimes: {},
  totalDeaths: 0,
  walls: [],
  gates: [],
  keys: [],
  doors: [],
  hazards: [],
  cursor: { ...START },
  lastPosition: { ...START },
  deaths: 0,
  keysCollected: 0,
  started: false,
  awaitingStart: false,
  won: false,
  startedAt: 0,
  elapsed: 0,
  timerInterval: 0,
  toastTimeout: 0,
  particles: [],
  particleFrame: 0,
  gameFrame: 0,
  gameStartedAt: 0,
  keyboardFrameAt: 0,
  cursorTrail: [],
  pressedKeys: new Set(),
  guidePath: null,
  guidePaths: null,
};

function readProgress() {
  const saved = localStorage.getItem(STORAGE.progress);

  if (!saved) {
    return;
  }

  try {
    const progress = JSON.parse(saved);
    if (Array.isArray(progress.completed)) {
      state.completed = progress.completed.filter((level) => Number.isInteger(level) && level >= 1 && level <= 20);
    }
    if (Number.isInteger(progress.totalDeaths) && progress.totalDeaths >= 0) {
      state.totalDeaths = progress.totalDeaths;
    }
    if (progress.bestTimes && typeof progress.bestTimes === "object" && !Array.isArray(progress.bestTimes)) {
      state.bestTimes = Object.fromEntries(
        Object.entries(progress.bestTimes).filter(
          ([level, time]) => /^\d+$/.test(level) && Number(level) >= 1 && Number(level) <= 20 && Number.isFinite(time) && time >= 0,
        ),
      );
    }
  } catch (error) {
    localStorage.removeItem(STORAGE.progress);
  }
}

function setBackdrop(backdrop) {
  if (!["plain", "dots", "grid"].includes(backdrop)) {
    return;
  }
  app.dataset.backdrop = backdrop;
  localStorage.setItem(STORAGE.backdrop, backdrop);
  for (const button of backdropButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.backdrop === backdrop));
  }
}

function saveProgress() {
  localStorage.setItem(
    STORAGE.progress,
    JSON.stringify({
      unlocked: 20,
      completed: state.completed,
      bestTimes: state.bestTimes,
      totalDeaths: state.totalDeaths,
    }),
  );
}

function setTheme(theme) {
  if (!THEME_NAMES.includes(theme)) {
    return;
  }

  app.dataset.theme = theme;
  localStorage.setItem(STORAGE.theme, theme);
  for (const button of themeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme instanceof HTMLMetaElement) {
    metaTheme.content = getComputedStyle(app).getPropertyValue("--page").trim();
  }
  renderMaze();
}

function setCursorStyle(style) {
  if (!["classic", "neon", "mono"].includes(style)) {
    return;
  }
  app.dataset.cursor = style;
  localStorage.setItem(STORAGE.cursor, style);
  for (const button of cursorStyleButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.cursorStyle === style));
  }
  renderMaze();
}

function setScreenEffect(effect) {
  if (!["none", "rgb", "mono"].includes(effect)) {
    return;
  }
  app.dataset.effect = effect;
  localStorage.setItem(STORAGE.effect, effect);
  for (const button of effectButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.screenEffect === effect));
  }
}

function showScreen(screen) {
  homeScreen.hidden = screen !== "home";
  levelsScreen.hidden = screen !== "levels";
  gameScreen.hidden = screen !== "game";
  if (screen !== "game") {
    state.pressedKeys.clear();
    state.keyboardFrameAt = 0;
    window.clearInterval(state.timerInterval);
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(state.toastTimeout);
  state.toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function renderLevels() {
  levelGrid.replaceChildren();
  progressCount.textContent = "20 / 20 unlocked";

  for (let level = 1; level <= 20; level += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-tile";
    const number = document.createElement("span");
    number.className = "level-tile__number";
    number.textContent = String(level).padStart(2, "0");
    const name = document.createElement("span");
    name.className = "level-tile__name";
    name.textContent = LEVEL_NAMES[level - 1];
    const details = document.createElement("span");
    details.className = "level-tile__details";
    const keys = getLevelKeyCount(level);
    const hazardCount = getLevelHazardCount(level);
    details.textContent = `${keys} keys · ${hazardCount} hazards`;
    button.append(number, name, details);
    button.setAttribute("aria-label", `Level ${level}${state.completed.includes(level) ? ", complete" : ""}`);

    if (level === state.level) {
      button.classList.add("level-tile--current");
    }
    if (state.completed.includes(level)) {
      button.classList.add("level-tile--complete");
    }
    button.addEventListener("click", () => startLevel(level));

    levelGrid.append(button);
  }
}

function renderProgressDialog() {
  progressCleared.textContent = `${state.completed.length} / 20`;
  const personalBests = Object.values(state.bestTimes);
  progressBest.textContent = personalBests.length
    ? formatTime(Math.min(...personalBests))
    : "--:--";
  progressHits.textContent = String(state.totalDeaths);
}

function getLevelKeyCount(level) {
  if (level <= 1) {
    return 0;
  }
  if (level <= 6) {
    return Math.min(8, Math.ceil(level / 3));
  }
  return Math.min(8, 2 + Math.floor((level - 7) / 2));
}

function getLevelHazardCount(level) {
  if (level <= 1) {
    return 0;
  }
  if (level <= 6) {
    return Math.min(42, 2 + level * 2);
  }
  return Math.min(38, 12 + (level - 7) * 2);
}

function createMaze(level) {
  if (level >= 7) {
    return createAdvancedMaze(level);
  }
  const count = Math.min(24, 3 + level);
  const gapHeight = Math.max(34, 226 - level * 9.3);
  const amplitude = Math.min(150, 72 + level * 4);
  const walls = [
    { x: 0, y: 0, width: WIDTH, height: WALL_WIDTH },
    { x: 0, y: HEIGHT - WALL_WIDTH, width: WIDTH, height: WALL_WIDTH },
    { x: 0, y: WALL_WIDTH, width: WALL_WIDTH, height: HEIGHT / 2 - WALL_WIDTH - 30 },
    { x: 0, y: HEIGHT / 2 + 30, width: WALL_WIDTH, height: HEIGHT / 2 - WALL_WIDTH - 30 },
    { x: WIDTH - WALL_WIDTH, y: WALL_WIDTH, width: WALL_WIDTH, height: GOAL.y - WALL_WIDTH },
    {
      x: WIDTH - WALL_WIDTH,
      y: GOAL.y + GOAL.height,
      width: WALL_WIDTH,
      height: HEIGHT - WALL_WIDTH - GOAL.y - GOAL.height,
    },
  ];
  const gates = [];
  const keys = [];
  const doors = [];
  const hazards = [];
  const lockCount = getLevelKeyCount(level);
  const layout = (level - 1) % 5;

  for (let index = 0; index < count; index += 1) {
    const progress = count === 1 ? 0 : index / (count - 1);
    const x = 145 + progress * 710;
    const wave = layout === 0
      ? Math.sin(progress * Math.PI * (2 + level * 0.11) + level * 0.37)
      : layout === 1
        ? Math.sign(Math.sin(progress * Math.PI * (3 + level * 0.09) + level * 0.2))
        : Math.sin(progress * Math.PI * (4 + level * 0.13) + index * 1.2);
    const zigzag = (index + level) % 2 === 0 ? 0.36 : -0.36;
    const centerY = Math.max(
      66 + gapHeight / 2,
      Math.min(HEIGHT - 66 - gapHeight / 2, HEIGHT / 2 + wave * amplitude + zigzag * amplitude),
    );
    const gapTop = centerY - gapHeight / 2;
    const locked = index < lockCount
      ? index
      : -1;
    gates.push({ x, centerY, gapHeight, gapTop, keyIndex: locked });
    walls.push(
      { x, y: WALL_WIDTH, width: WALL_WIDTH, height: gapTop - WALL_WIDTH },
      { x, y: gapTop + gapHeight, width: WALL_WIDTH, height: HEIGHT - WALL_WIDTH - (gapTop + gapHeight) },
    );
    if (locked >= 0) {
      doors.push({ x, y: gapTop, width: WALL_WIDTH, height: gapHeight, keyIndex: locked, unlocked: false });
      keys.push({
        x: x - Math.max(20, Math.min(34, 710 / (count + 1) * 0.68)),
        y: centerY,
        collected: false,
        doorIndex: locked,
      });
    }
  }

  for (let room = 0; level > 1 && room <= count; room += 1) {
    const left = room === 0 ? 38 : gates[room - 1].x + WALL_WIDTH + 12;
    const right = room === count ? WIDTH - 28 : gates[room].x - 12;
    const roomWidth = right - left;
    if (roomWidth < 32) {
      continue;
    }

    const roomCenter = room === 0
      ? gates[0].centerY
      : room === count
        ? gates[count - 1].centerY
        : (gates[room - 1].centerY + gates[room].centerY) / 2;
    const side = (room + level) % 2;
    const narrowGap = Math.max(34, gapHeight * (layout === 4 ? 0.36 : 0.54));

    if (layout === 0 || layout === 2 || layout === 4) {
      const x = left + roomWidth * (layout === 4 ? 0.38 : 0.52);
      const gapCenter = side === 0 ? Math.max(38, roomCenter - 90) : Math.min(HEIGHT - 38, roomCenter + 90);
      const top = Math.max(WALL_WIDTH, gapCenter - narrowGap / 2);
      const bottom = Math.min(HEIGHT - WALL_WIDTH, gapCenter + narrowGap / 2);
      walls.push(
        { x, y: WALL_WIDTH, width: WALL_WIDTH, height: top - WALL_WIDTH },
        { x, y: bottom, width: WALL_WIDTH, height: HEIGHT - WALL_WIDTH - bottom },
      );
    } else if (layout === 1) {
      const y = Math.max(52, Math.min(HEIGHT - 52, roomCenter + (side === 0 ? -34 : 34)));
      const opening = Math.max(28, roomWidth * 0.23);
      const leftLength = (roomWidth - opening) * 0.53;
      walls.push(
        { x: left, y, width: leftLength, height: WALL_WIDTH },
        { x: left + leftLength + opening, y, width: roomWidth - leftLength - opening, height: WALL_WIDTH },
      );
    } else {
      const firstX = left + roomWidth * 0.32;
      const secondX = left + roomWidth * 0.68;
      const gapOffset = Math.min(6, narrowGap * 0.15) * (side === 0 ? -1 : 1);
      const firstGap = roomCenter + gapOffset;
      const secondGap = roomCenter - gapOffset;
      const firstTop = Math.max(WALL_WIDTH, firstGap - narrowGap / 2);
      const firstBottom = Math.min(HEIGHT - WALL_WIDTH, firstGap + narrowGap / 2);
      const secondTop = Math.max(WALL_WIDTH, secondGap - narrowGap / 2);
      const secondBottom = Math.min(HEIGHT - WALL_WIDTH, secondGap + narrowGap / 2);
      walls.push(
        { x: firstX, y: WALL_WIDTH, width: WALL_WIDTH, height: firstTop - WALL_WIDTH },
        { x: firstX, y: firstBottom, width: WALL_WIDTH, height: HEIGHT - WALL_WIDTH - firstBottom },
        { x: secondX, y: WALL_WIDTH, width: WALL_WIDTH, height: secondTop - WALL_WIDTH },
        { x: secondX, y: secondBottom, width: WALL_WIDTH, height: HEIGHT - WALL_WIDTH - secondBottom },
      );
    }
  }

  const hazardCount = getLevelHazardCount(level);
  const hazardTypes = ["orb", "sweeper", "spinner", "diamond", "pulse"];
  for (let index = 0; index < hazardCount; index += 1) {
    const roomIndex = Math.min(count, 1 + Math.floor(index * count / hazardCount));
    const roomLeft = roomIndex === 0 ? 34 : gates[roomIndex - 1].x + WALL_WIDTH + 12;
    const roomRight = roomIndex === count ? WIDTH - 34 : gates[roomIndex].x - 12;
    const roomWidth = Math.max(24, roomRight - roomLeft);
    hazards.push({
      x: roomLeft + roomWidth / 2 + Math.sin(index * 1.91) * roomWidth * 0.2,
      centerY: HEIGHT / 2 + Math.sin(index * 2.13 + level) * amplitude * 0.5,
      amplitude: Math.min(HEIGHT / 2 - 30, 45 + level * 3 + (index % 3) * 18),
      horizontalAmplitude: Math.max(0, roomWidth * 0.38),
      radius: Math.min(16, 9 + Math.floor(level / 4)),
      phase: index * 1.73 + level * 0.41,
      speed: 0.0022 + level * 0.00042 + index * 0.00009,
      axis: index % 3 === 0 ? "x" : "y",
      type: hazardTypes[(index + level - 1) % hazardTypes.length],
      length: 24 + (index % 4) * 9 + level,
    });
  }

  return { walls, gates, keys, doors, hazards };
}

function createAdvancedMaze(level) {
  const layouts = [
    [7, 5], [8, 5], [7, 7], [9, 5], [8, 7], [7, 5], [9, 7],
    [8, 5], [7, 7], [9, 5], [8, 7], [8, 7], [9, 7], [8, 7],
  ];
  const [columns, rows] = layouts[level - 7];
  const cellWidth = WIDTH / columns;
  const cellHeight = HEIGHT / rows;
  const corridor = Math.max(38, 50 - (level - 7) * 0.8);
  const middleRow = Math.floor(rows / 2);
  const startNode = middleRow * columns;
  const goalNode = middleRow * columns + columns - 1;
  const keyCount = getLevelKeyCount(level);
  const seedBase = level * 104729 + columns * 7919 + rows * 1543;
  const nodePoint = (node) => ({
    x: (node % columns + 0.5) * cellWidth,
    y: (Math.floor(node / columns) + 0.5) * cellHeight,
  });
  const directions = [
    { dc: 1, dr: 0, name: "right" },
    { dc: -1, dr: 0, name: "left" },
    { dc: 0, dr: 1, name: "down" },
    { dc: 0, dr: -1, name: "up" },
  ];
  const edgeKey = (first, second) => first < second ? `${first}:${second}` : `${second}:${first}`;

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function carveTree(seed) {
    const random = seededRandom(seed);
    const visited = new Set([startNode]);
    const edges = new Set();
    const stack = [startNode];
    const style = (level - 7) % 7;
    while (stack.length) {
      const current = stack[stack.length - 1];
      const column = current % columns;
      const row = Math.floor(current / columns);
      const choices = directions
        .map((direction) => ({
          node: (row + direction.dr) * columns + column + direction.dc,
          ...direction,
        }))
        .filter((entry) =>
          entry.dc + column >= 0 &&
          entry.dc + column < columns &&
          entry.dr + row >= 0 &&
          entry.dr + row < rows &&
          !visited.has(entry.node),
        );

      if (!choices.length) {
        stack.pop();
        continue;
      }

      const patterns = [
        ["right", "down", "left", "up"],
        ["down", "right", "up", "left"],
        ["up", "left", "down", "right"],
        ["left", "up", "right", "down"],
        ["right", "up", "left", "down"],
        ["down", "left", "up", "right"],
        ["up", "right", "down", "left"],
      ];
      const ranks = new Map(patterns[style].map((direction, index) => [direction, index]));
      const weights = new Map(
        choices.map((choice) => [choice.name, ranks.get(choice.name) * 0.35 + random() * 4]),
      );
      choices.sort((first, second) => weights.get(first.name) - weights.get(second.name));

      const next = choices[0].node;
      visited.add(next);
      edges.add(edgeKey(current, next));
      stack.push(next);
    }
    return edges;
  }

  function findRoute(edges) {
    const parents = new Map([[startNode, -1]]);
    const queue = [startNode];
    for (let index = 0; index < queue.length && !parents.has(goalNode); index += 1) {
      const node = queue[index];
      const column = node % columns;
      const row = Math.floor(node / columns);
      for (const { dc, dr } of directions) {
        const nextColumn = column + dc;
        const nextRow = row + dr;
        if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) {
          continue;
        }
        const next = nextRow * columns + nextColumn;
        if (edges.has(edgeKey(node, next)) && !parents.has(next)) {
          parents.set(next, node);
          queue.push(next);
        }
      }
    }
    if (!parents.has(goalNode)) {
      throw new Error(`Level ${level} maze has no route to its exit.`);
    }
    const route = [];
    for (let node = goalNode; node !== -1; node = parents.get(node)) {
      route.push(node);
    }
    return route.reverse();
  }

  let edges;
  let route;
  for (let attempt = 0; attempt < 128; attempt += 1) {
    edges = carveTree(seedBase + attempt * 1009);
    route = findRoute(edges);
    if (route.length - 1 >= keyCount * 2 + 2) {
      break;
    }
  }
  if (route.length - 1 < keyCount * 2 + 2) {
    throw new Error(`Level ${level} could not generate a long enough key route.`);
  }

  const routeSet = new Set(route);
  const random = seededRandom(seedBase + 65537);
  const loopTarget = Math.min(8, 1 + Math.floor((level - 7) / 2));
  let loopsAdded = 0;
  for (let node = 0; node < columns * rows && loopsAdded < loopTarget; node += 1) {
    if (routeSet.has(node)) {
      continue;
    }
    const column = node % columns;
    const row = Math.floor(node / columns);
    const neighbors = directions
      .map(({ dc, dr }) => ({ column: column + dc, row: row + dr }))
      .filter(({ column: nextColumn, row: nextRow }) =>
        nextColumn >= 0 &&
        nextColumn < columns &&
        nextRow >= 0 &&
        nextRow < rows,
      )
      .map(({ column: nextColumn, row: nextRow }) => nextRow * columns + nextColumn)
      .filter((neighbor) => !routeSet.has(neighbor) && !edges.has(edgeKey(node, neighbor)));
    if (neighbors.length) {
      const neighbor = neighbors[Math.floor(random() * neighbors.length)];
      edges.add(edgeKey(node, neighbor));
      loopsAdded += 1;
    }
  }

  const walls = [
    { x: 0, y: 0, width: WIDTH, height: WALL_WIDTH },
    { x: 0, y: HEIGHT - WALL_WIDTH, width: WIDTH, height: WALL_WIDTH },
    { x: 0, y: WALL_WIDTH, width: WALL_WIDTH, height: HEIGHT / 2 - WALL_WIDTH - 30 },
    { x: 0, y: HEIGHT / 2 + 30, width: WALL_WIDTH, height: HEIGHT / 2 - WALL_WIDTH - 30 },
    { x: WIDTH - WALL_WIDTH, y: WALL_WIDTH, width: WALL_WIDTH, height: GOAL.y - WALL_WIDTH },
    {
      x: WIDTH - WALL_WIDTH,
      y: GOAL.y + GOAL.height,
      width: WALL_WIDTH,
      height: HEIGHT - WALL_WIDTH - GOAL.y - GOAL.height,
    },
  ];
  const doors = Array(keyCount);
  const keys = [];
  const gates = [];
  const doorEdges = new Map();
  const doorEdgeIndexes = [];
  const routeEdgeCount = route.length - 1;
  for (let index = 0; index < keyCount; index += 1) {
    const edgeIndex = Math.floor((index + 1) * routeEdgeCount / (keyCount + 1));
    doorEdgeIndexes.push(edgeIndex);
    doorEdges.set(edgeKey(route[edgeIndex], route[edgeIndex + 1]), index);
    const keyNodeIndex = index === 0 ? 0 : doorEdgeIndexes[index - 1] + 1;
    const point = nodePoint(route[keyNodeIndex]);
    keys.push({ ...point, collected: false, doorIndex: index });
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const node = row * columns + column;
      const center = nodePoint(node);
      if (column < columns - 1) {
        const next = node + 1;
        const boundaryX = (column + 1) * cellWidth;
        const doorIndex = doorEdges.get(edgeKey(node, next));
        if (edges.has(edgeKey(node, next)) && doorIndex === undefined) {
          gates.push({ x: boundaryX, centerY: center.y, gapHeight: corridor, gapTop: center.y - corridor / 2, keyIndex: -1 });
        } else if (doorIndex !== undefined) {
          doors[doorIndex] = {
            x: boundaryX - WALL_WIDTH / 2,
            y: center.y - corridor / 2,
            width: WALL_WIDTH,
            height: corridor,
            keyIndex: doorIndex,
            unlocked: false,
          };
        } else {
          walls.push({
            x: boundaryX - WALL_WIDTH / 2,
            y: row * cellHeight + WALL_WIDTH / 2,
            width: WALL_WIDTH,
            height: cellHeight - WALL_WIDTH,
          });
        }
      }
      if (row < rows - 1) {
        const next = node + columns;
        const boundaryY = (row + 1) * cellHeight;
        const doorIndex = doorEdges.get(edgeKey(node, next));
        if (edges.has(edgeKey(node, next)) && doorIndex === undefined) {
          gates.push({ x: center.x, centerY: boundaryY, gapHeight: corridor, gapTop: boundaryY - corridor / 2, keyIndex: -1 });
        } else if (doorIndex !== undefined) {
          doors[doorIndex] = {
            x: center.x - corridor / 2,
            y: boundaryY - WALL_WIDTH / 2,
            width: corridor,
            height: WALL_WIDTH,
            keyIndex: doorIndex,
            unlocked: false,
          };
        } else {
          walls.push({
            x: column * cellWidth + WALL_WIDTH / 2,
            y: boundaryY - WALL_WIDTH / 2,
            width: cellWidth - WALL_WIDTH,
            height: WALL_WIDTH,
          });
        }
      }
    }
  }

  const routeKeyNodes = new Set(keys.map((key) => Math.floor(key.y / cellHeight) * columns + Math.floor(key.x / cellWidth)));
  const candidates = Array.from({ length: columns * rows }, (_, node) => node)
    .filter((node) => node !== startNode && node !== goalNode && !routeKeyNodes.has(node));
  const routeCandidates = candidates.filter((node) => routeSet.has(node));
  const sideCandidates = candidates.filter((node) => !routeSet.has(node));
  for (let index = routeCandidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [routeCandidates[index], routeCandidates[swap]] = [routeCandidates[swap], routeCandidates[index]];
  }
  for (let index = sideCandidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [sideCandidates[index], sideCandidates[swap]] = [sideCandidates[swap], sideCandidates[index]];
  }

  const requestedHazards = getLevelHazardCount(level);
  const hazardCount = Math.min(requestedHazards, candidates.length);
  const routeHazardCount = Math.ceil(hazardCount * 0.55);
  const pickedRouteCount = Math.min(routeCandidates.length, routeHazardCount);
  const pickedSideCount = Math.min(sideCandidates.length, hazardCount - pickedRouteCount);
  const hazardNodes = [
    ...routeCandidates.slice(0, pickedRouteCount),
    ...sideCandidates.slice(0, pickedSideCount),
    ...routeCandidates.slice(pickedRouteCount),
    ...sideCandidates.slice(pickedSideCount),
  ].slice(0, hazardCount);
  const hazardTypes = ["orb", "sweeper", "spinner", "diamond", "pulse"];
  const hazards = hazardNodes.map((node, index) => {
    const point = nodePoint(node);
    const horizontalRoom = Math.max(0, (cellWidth - corridor) / 2 - 11);
    const verticalRoom = Math.max(0, (cellHeight - corridor) / 2 - 11);
    return {
      x: point.x,
      centerY: point.y,
      amplitude: Math.max(20, Math.min(verticalRoom, 8 + level * 0.45)),
      horizontalAmplitude: Math.max(20, Math.min(horizontalRoom, 8 + level * 0.35)),
      radius: Math.min(11, 8 + Math.floor((level - 7) / 6)),
      phase: index * 1.73 + level * 0.41,
      speed: 0.002 + level * 0.00015 + index * 0.00004,
      axis: index % 2 === 0 ? "x" : "y",
      type: hazardTypes[(index + level) % hazardTypes.length],
      length: Math.min(42, 22 + (index % 4) * 4 + level * 0.35),
    };
  });

  const keyPathIndexes = keys.map((key) => Math.floor(key.y / cellHeight) * columns + Math.floor(key.x / cellWidth))
    .map((node) => route.indexOf(node));
  const guidePaths = keyPathIndexes.map((pathIndex, index) => {
    const fromIndex = index === 0 ? -1 : keyPathIndexes[index - 1];
    return [
      ...(fromIndex < 0 ? [{ x: START.x, y: START.y }] : []),
      ...route.slice(Math.max(0, fromIndex), pathIndex + 1).map(nodePoint),
    ];
  });
  const lastKeyIndex = keyPathIndexes[keyPathIndexes.length - 1];
  guidePaths.push([
    ...route.slice(lastKeyIndex).map(nodePoint),
    { x: GOAL.x, y: GOAL.y + GOAL.height / 2 },
  ]);
  return {
    walls,
    gates,
    keys,
    doors,
    hazards,
    guidePaths,
  };
}

function getThemeColor(variable) {
  return getComputedStyle(app).getPropertyValue(variable).trim();
}

function getHazardPosition(hazard, time = performance.now()) {
  if (hazard.type === "diamond") {
    return {
      x: hazard.x + Math.sin(time * hazard.speed + hazard.phase) * hazard.horizontalAmplitude,
      y: hazard.centerY + Math.cos(time * hazard.speed * 0.83 + hazard.phase) * hazard.amplitude,
    };
  }
  if (hazard.axis === "x") {
    return {
      x: hazard.x + Math.sin(time * hazard.speed + hazard.phase) * hazard.horizontalAmplitude,
      y: hazard.centerY,
    };
  }
  return {
    x: hazard.x,
    y: hazard.centerY + Math.sin(time * hazard.speed + hazard.phase) * hazard.amplitude,
  };
}

function renderMaze() {
  if (!context || !canvas) {
    return;
  }

  const floor = getThemeColor("--surface");
  const line = getThemeColor("--line");
  const accent = getThemeColor("--accent");
  const muted = getThemeColor("--muted");
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = floor;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.save();
  context.strokeStyle = line;
  context.globalAlpha = 0.52;
  context.lineWidth = 1;
  context.setLineDash([2, 12]);
  context.beginPath();
  for (let x = 45; x < WIDTH; x += 40) {
    context.moveTo(x, 20);
    context.lineTo(x, HEIGHT - 20);
  }
  context.stroke();
  context.restore();

  if (showGuideToggle.checked) {
    const path = state.guidePaths
      ? state.guidePaths[Math.min(state.keysCollected, state.guidePaths.length - 1)]
      : [{ x: START.x, y: START.y }];
    if (!state.guidePaths) {
      for (const gate of state.gates) {
        path.push({ x: gate.x - 10, y: gate.centerY }, { x: gate.x + 24, y: gate.centerY });
      }
      path.push({ x: GOAL.x - 8, y: START.y });
    }
    if (path.length > 1) {
      context.save();
      context.strokeStyle = accent;
      context.globalAlpha = state.guidePaths ? 0.11 : 0.19;
      context.lineWidth = 2;
      context.setLineDash([5, 9]);
      context.beginPath();
      path.forEach((point, index) => {
        if (index === 0) {
          context.moveTo(point.x, point.y);
        } else {
          context.lineTo(point.x, point.y);
        }
      });
      context.stroke();
      context.restore();
    }
  }

  context.fillStyle = "#dc514b";
  for (const wall of state.walls) {
    context.fillRect(wall.x, wall.y, wall.width, wall.height);
    context.fillStyle = "#f0786f";
    if (wall.width >= wall.height) {
      context.fillRect(wall.x, wall.y, wall.width, 3);
    } else {
      context.fillRect(wall.x, wall.y, 3, wall.height);
    }
    context.fillStyle = "#dc514b";
  }

  for (const door of state.doors) {
    if (door.unlocked) {
      context.save();
      context.globalAlpha = 0.32;
      context.strokeStyle = "#e6a83d";
      context.lineWidth = 2;
      context.setLineDash([4, 5]);
      context.strokeRect(door.x, door.y, door.width, door.height);
      context.restore();
      continue;
    }

    context.fillStyle = "#91632d";
    context.fillRect(door.x - 2, door.y, door.width + 4, door.height);
    context.fillStyle = "#dca84e";
    context.fillRect(door.x + 2, door.y, door.width - 4, door.height);
    context.fillStyle = "#ffe4a2";
    for (let y = door.y + 8; y < door.y + door.height; y += 16) {
      context.fillRect(door.x + 4, y, door.width - 8, 2);
    }
    context.save();
    context.translate(door.x + door.width / 2, door.y + door.height / 2);
    context.fillStyle = "#fff5d8";
    context.beginPath();
    context.arc(0, -3, 4, Math.PI, 0);
    context.strokeStyle = "#fff5d8";
    context.lineWidth = 2;
    context.stroke();
    context.fillRect(-5, -3, 10, 9);
    context.restore();
  }

  const time = performance.now();
  for (const hazard of state.hazards) {
    const position = getHazardPosition(hazard, time);
    context.save();
    const pulse = hazard.type === "pulse" ? 0.65 + (Math.sin(time * hazard.speed * 3 + hazard.phase) + 1) * 0.45 : 1;
    const radius = hazard.radius * pulse;

    if (hazard.type === "sweeper") {
      context.lineCap = "round";
      context.lineWidth = 8;
      context.strokeStyle = "rgba(225, 78, 72, 0.28)";
      context.beginPath();
      context.moveTo(position.x - hazard.length / 2, position.y);
      context.lineTo(position.x + hazard.length / 2, position.y);
      context.stroke();
      context.lineWidth = 4;
      context.strokeStyle = "#b52f38";
      context.beginPath();
      context.moveTo(position.x - hazard.length / 2, position.y);
      context.lineTo(position.x + hazard.length / 2, position.y);
      context.stroke();
      for (const end of [-1, 1]) {
        context.beginPath();
        context.arc(position.x + end * hazard.length / 2, position.y, 5, 0, Math.PI * 2);
        context.fillStyle = "#ffb2a8";
        context.fill();
      }
    } else {
      context.beginPath();
      context.arc(position.x, position.y, radius + 5, 0, Math.PI * 2);
      context.fillStyle = hazard.type === "pulse" ? "rgba(181, 88, 225, 0.17)" : "rgba(219, 85, 71, 0.14)";
      context.fill();

      if (hazard.type === "spinner") {
        context.translate(position.x, position.y);
        context.rotate(time * hazard.speed * 2 + hazard.phase);
        context.strokeStyle = "#d94268";
        context.lineWidth = 5;
        context.lineCap = "round";
        for (let arm = 0; arm < 4; arm += 1) {
          context.rotate(Math.PI / 2);
          context.beginPath();
          context.moveTo(0, 0);
          context.lineTo(hazard.radius + 7, 0);
          context.stroke();
          context.beginPath();
          context.arc(hazard.radius + 7, 0, 3, 0, Math.PI * 2);
          context.fillStyle = "#ffe0a2";
          context.fill();
        }
      } else if (hazard.type === "diamond") {
        context.translate(position.x, position.y);
        context.rotate(Math.PI / 4 + time * hazard.speed);
        context.fillStyle = "#9a4bd0";
        context.strokeStyle = "#f3d9ff";
        context.lineWidth = 2;
        context.fillRect(-radius * 0.75, -radius * 0.75, radius * 1.5, radius * 1.5);
        context.strokeRect(-radius * 0.75, -radius * 0.75, radius * 1.5, radius * 1.5);
      } else {
        context.beginPath();
        context.arc(position.x, position.y, radius, 0, Math.PI * 2);
        context.fillStyle = hazard.type === "pulse" ? "#a643c8" : "#e4554e";
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = "#fff2ee";
        context.stroke();
        context.beginPath();
        context.arc(position.x - 2, position.y - 2, Math.max(2, radius / 4), 0, Math.PI * 2);
        context.fillStyle = "#fff4ec";
        context.fill();
      }
    }
    context.restore();
  }

  for (const key of state.keys) {
    if (!key.collected) {
      drawKey(key.x, key.y, time);
    }
  }

  const hasAllKeys = state.keys.every((key) => key.collected);
  context.fillStyle = hasAllKeys ? "#48a76c" : "#869c8e";
  context.strokeStyle = hasAllKeys ? "#2d8050" : "#687d70";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(GOAL.x, GOAL.y, GOAL.width, GOAL.height, 8);
  context.fill();
  context.stroke();
  context.strokeStyle = "#f7fff8";
  context.lineWidth = 3;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(GOAL.x + 13, GOAL.y + 42);
  context.lineTo(GOAL.x + 19, GOAL.y + 48);
  context.lineTo(GOAL.x + 30, GOAL.y + 34);
  context.stroke();

  if (!hasAllKeys) {
    context.save();
    context.fillStyle = "#fff";
    context.strokeStyle = "#52695d";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(GOAL.x + GOAL.width / 2, GOAL.y + GOAL.height / 2, 7, Math.PI, 0);
    context.stroke();
    context.fillRect(GOAL.x + GOAL.width / 2 - 9, GOAL.y + GOAL.height / 2 - 1, 18, 13);
    context.restore();
  }

  context.beginPath();
  context.arc(START.x, START.y, 11, 0, Math.PI * 2);
  context.fillStyle = accent;
  context.fill();
  context.beginPath();
  context.arc(START.x, START.y, 4, 0, Math.PI * 2);
  context.fillStyle = floor;
  context.fill();

  if (showTrailToggle.checked && state.cursorTrail.length > 1) {
    context.save();
    context.strokeStyle = getCursorColor();
    context.lineWidth = app.dataset.cursor === "neon" ? 4 : 2;
    context.globalAlpha = 0.24;
    context.lineCap = "round";
    context.beginPath();
    state.cursorTrail.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.stroke();
    context.restore();
  }
  drawCursor(state.cursor.x, state.cursor.y);

  for (const particle of state.particles) {
    context.globalAlpha = Math.max(0, particle.life);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;

  context.fillStyle = muted;
  context.font = "600 14px 'DM Sans', sans-serif";
  context.textAlign = "center";
  context.fillText("START", 54, START.y + 35);
  context.fillText("FINISH", GOAL.x + GOAL.width / 2, GOAL.y - 12);
}

function getCursorColor() {
  if (app.dataset.cursor === "neon") {
    return "#08a7df";
  }
  if (app.dataset.cursor === "mono") {
    return "#232323";
  }
  return getThemeColor("--accent");
}

function drawKey(x, y, time) {
  context.save();
  context.translate(x, y + Math.sin(time / 230 + x) * 2);
  context.rotate(-Math.PI / 2);
  context.strokeStyle = "#f0ac36";
  context.fillStyle = "#ffd26f";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.beginPath();
  context.arc(0, -7, 7, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(0, 14);
  context.lineTo(6, 14);
  context.moveTo(0, 9);
  context.lineTo(5, 9);
  context.stroke();
  context.beginPath();
  context.arc(0, -7, 2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawCursor(x, y) {
  context.save();
  context.translate(x, y);
  const cursorStyle = app.dataset.cursor;
  const cursorColor = cursorStyle === "mono"
    ? "#252525"
    : cursorStyle === "neon"
      ? "#16c7ef"
      : getCursorColor();

  context.beginPath();
  context.arc(0, 0, 9, 0, Math.PI * 2);
  context.fillStyle = "rgba(17, 34, 46, 0.34)";
  context.fill();

  context.beginPath();
  context.arc(0, 0, 6, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = "#183248";
  context.stroke();

  context.beginPath();
  context.arc(0, 0, 2.5, 0, Math.PI * 2);
  context.fillStyle = cursorColor;
  context.fill();
  context.restore();
}

function startLevel(level) {
  if (level < 1 || level > state.unlocked) {
    return;
  }

  window.clearInterval(state.timerInterval);
  window.cancelAnimationFrame(state.gameFrame);
  state.level = level;
  const maze = createMaze(level);
  state.walls = maze.walls;
  state.gates = maze.gates;
  state.keys = maze.keys;
  state.doors = maze.doors;
  state.hazards = maze.hazards;
  state.guidePaths = maze.guidePaths ?? null;
  state.cursor = { ...START };
  state.lastPosition = { ...START };
  state.cursorTrail = [];
  state.deaths = 0;
  state.keysCollected = 0;
  state.started = false;
  state.awaitingStart = true;
  state.won = false;
  state.elapsed = 0;
  state.startedAt = 0;
  state.gameStartedAt = performance.now();
  state.keyboardFrameAt = 0;
  state.pressedKeys.clear();
  state.particles = [];
  currentLevelLabel.textContent = String(level);
  difficultyLabel.textContent = level === 1
    ? "Warm up"
    : level < 5
      ? "Getting tricky"
      : level < 9
        ? "Hard"
        : level < 14
          ? "Expert"
          : level < 18
            ? "Brutal"
            : "Almost impossible";
  deathsLabel.textContent = "0";
  timerLabel.textContent = "00:00";
  bestTimeLabel.textContent = state.bestTimes[level] ? formatTime(state.bestTimes[level]) : "--:--";
  keyCounter.hidden = state.keys.length === 0;
  keysCollectedLabel.textContent = `0 / ${state.keys.length}`;
  gameFootnote.textContent = state.keys.length > 0
    ? `Collect ${state.keys.length} ${state.keys.length === 1 ? "key" : "keys"}, dodge hazards. Move with your mouse, WASD, or arrow keys.`
    : state.hazards.length > 0
      ? "Dodge moving hazards. Touch red and start over. Move with mouse, WASD, or arrows."
      : "Move with your mouse, WASD, or arrow keys. Touch red and start over.";
  readyMessage.hidden = false;
  readyMessage.lastElementChild.textContent = "Move to the start";
  winMessage.hidden = true;
  stage.classList.remove("is-hit", "is-win");
  showScreen("game");
  renderMaze();
  animateGame();
}

function animateGame() {
  if (gameScreen.hidden || state.won) {
    return;
  }

  const now = performance.now();
  if (state.pressedKeys.size > 0) {
    const elapsed = state.keyboardFrameAt
      ? Math.min(50, now - state.keyboardFrameAt)
      : 0;
    const directions = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
    };
    let directionX = 0;
    let directionY = 0;
    for (const key of state.pressedKeys) {
      const direction = directions[key];
      if (direction) {
        directionX += direction[0];
        directionY += direction[1];
      }
    }
    const magnitude = Math.hypot(directionX, directionY);
    if (magnitude > 0 && elapsed > 0) {
      const distance = (300 * elapsed) / 1000 / magnitude;
      moveTo(
        state.cursor.x + directionX * distance,
        state.cursor.y + directionY * distance,
      );
    }
  }
  state.keyboardFrameAt = now;

  if (
    state.started &&
    !state.awaitingStart &&
    state.hazards.some((hazard) => {
      const position = getHazardPosition(hazard);
      return Math.hypot(state.cursor.x - position.x, state.cursor.y - position.y) <= hazard.radius + CURSOR_RADIUS;
    })
  ) {
    hitWall("hazard");
  }

  renderMaze();
  state.gameFrame = window.requestAnimationFrame(animateGame);
}

function startTimer() {
  if (state.started) {
    return;
  }

  state.started = true;
  state.startedAt = performance.now();
  readyMessage.hidden = true;
  state.timerInterval = window.setInterval(() => {
    state.elapsed = performance.now() - state.startedAt;
    timerLabel.textContent = formatTime(state.elapsed);
  }, 150);
}

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function collides(x, y, time = performance.now()) {
  if (x < 14 + CURSOR_RADIUS || x > WIDTH - 14 - CURSOR_RADIUS ||
      y < 14 + CURSOR_RADIUS || y > HEIGHT - 14 - CURSOR_RADIUS) {
    return true;
  }

  if (state.walls.some((wall) =>
    x + CURSOR_RADIUS > wall.x &&
    x - CURSOR_RADIUS < wall.x + wall.width &&
    y + CURSOR_RADIUS > wall.y &&
    y - CURSOR_RADIUS < wall.y + wall.height,
  )) {
    return true;
  }

  if (state.doors.some((door) =>
    !door.unlocked &&
    x + CURSOR_RADIUS > door.x &&
    x - CURSOR_RADIUS < door.x + door.width &&
    y + CURSOR_RADIUS > door.y &&
    y - CURSOR_RADIUS < door.y + door.height,
  )) {
    return true;
  }

  return state.hazards.some((hazard) => {
    const position = getHazardPosition(hazard, time);
    if (hazard.type === "sweeper") {
      const closestX = Math.max(position.x - hazard.length / 2, Math.min(position.x + hazard.length / 2, x));
      return Math.hypot(x - closestX, y - position.y) <= hazard.radius / 2 + CURSOR_RADIUS;
    }

    const pulse = hazard.type === "pulse"
      ? 0.65 + (Math.sin(time * hazard.speed * 3 + hazard.phase) + 1) * 0.45
      : 1;
    return Math.hypot(x - position.x, y - position.y) <= hazard.radius * pulse + CURSOR_RADIUS;
  });
}

function isAtStart(x, y) {
  return Math.hypot(x - START.x, y - START.y) <= 25;
}

function makeParticles(x, y, color, count) {
  if (reducedMotionToggle.checked) {
    state.particles = [];
    renderMaze();
    return;
  }

  state.particles = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 4;
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      size: 2 + Math.random() * 3,
      color,
    };
  });
  window.cancelAnimationFrame(state.particleFrame);
  const animate = () => {
    state.particles = state.particles.filter((particle) => particle.life > 0.04);
    for (const particle of state.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life -= 0.025;
    }
    renderMaze();
    if (state.particles.length) {
      state.particleFrame = window.requestAnimationFrame(animate);
    }
  };
  state.particleFrame = window.requestAnimationFrame(animate);
}

function hitWall(cause = "wall") {
  if (state.awaitingStart || state.won) {
    return;
  }

  state.deaths += 1;
  state.totalDeaths += 1;
  state.pressedKeys.clear();
  saveProgress();
  deathsLabel.textContent = String(state.deaths);
  state.cursor = { ...START };
  state.lastPosition = { ...START };
  state.cursorTrail = [];
  state.awaitingStart = true;
  readyMessage.lastElementChild.textContent = "Return to start";
  readyMessage.hidden = false;
  stage.classList.remove("is-hit");
  void stage.offsetWidth;
  stage.classList.add("is-hit");
  window.setTimeout(() => stage.classList.remove("is-hit"), 380);
  renderMaze();
  makeParticles(START.x, START.y, cause === "hazard" ? "#ed9056" : "#dc514b", 16);
  if (cause === "hazard") {
    showToast("A moving hazard got you!");
  }
}

function finishLevel() {
  if (state.won) {
    return;
  }

  state.won = true;
  window.clearInterval(state.timerInterval);
  window.cancelAnimationFrame(state.gameFrame);
  state.elapsed = state.started ? performance.now() - state.startedAt : state.elapsed;
  timerLabel.textContent = formatTime(state.elapsed);
  state.cursor = { ...START };
  state.lastPosition = { ...START };
  state.cursorTrail = [];
  state.awaitingStart = true;
  renderMaze();
  if (!state.completed.includes(state.level)) {
    state.completed.push(state.level);
  }
  const previousBest = state.bestTimes[state.level];
  if (previousBest === undefined || state.elapsed < previousBest) {
    state.bestTimes[state.level] = state.elapsed;
  }
  saveProgress();
  winTitle.textContent = state.level === 20 ? "All 20 cleared!" : "Nice work!";
  winCopy.textContent = `${formatTime(state.elapsed)} · ${state.deaths} deaths`;
  completeButton.textContent = state.level === 20 ? "Back to levels →" : "Complete & continue →";
  winMessage.hidden = false;
  stage.classList.add("is-win");
  makeParticles(GOAL.x + GOAL.width / 2, GOAL.y + GOAL.height / 2, "#48a76c", 32);
}

function moveTo(x, y) {
  if (gameScreen.hidden || state.won) {
    return;
  }

  if (state.awaitingStart) {
    if (isAtStart(x, y)) {
      state.awaitingStart = false;
      state.cursor = { x, y };
      state.lastPosition = { x, y };
      state.cursorTrail = [{ x, y }];
      readyMessage.hidden = true;
      startTimer();
      renderMaze();
    }
    return;
  }

  const from = state.lastPosition;
  const distance = Math.hypot(x - from.x, y - from.y);
  const steps = Math.max(1, Math.ceil(distance / 3));

  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    const sampleX = from.x + (x - from.x) * progress;
    const sampleY = from.y + (y - from.y) * progress;
    if (collides(sampleX, sampleY, performance.now())) {
      hitWall();
      return;
    }
    for (const key of state.keys) {
      if (!key.collected && Math.hypot(sampleX - key.x, sampleY - key.y) <= 18) {
        key.collected = true;
        const door = state.doors[key.doorIndex];
        if (!door) {
          throw new Error(`The door for key ${key.doorIndex + 1} is missing.`);
        }
        door.unlocked = true;
        state.keysCollected += 1;
        keysCollectedLabel.textContent = `${state.keysCollected} / ${state.keys.length}`;
        makeParticles(key.x, key.y, "#f0ac36", 10);
        showToast(`Key ${state.keysCollected} collected — room unlocked!`);
      }
    }
  }

  if (distance > 0) {
    startTimer();
  }
  state.cursor = { x, y };
  state.lastPosition = { x, y };
  if (distance > 0) {
    state.cursorTrail.push({ x, y });
    if (state.cursorTrail.length > 12) {
      state.cursorTrail.shift();
    }
  }
  renderMaze();

  const insideGoal =
    x + CURSOR_RADIUS >= GOAL.x &&
    x - CURSOR_RADIUS <= GOAL.x + GOAL.width &&
    y + CURSOR_RADIUS >= GOAL.y &&
    y - CURSOR_RADIUS <= GOAL.y + GOAL.height;
  if (insideGoal) {
    if (state.keys.every((key) => key.collected)) {
      finishLevel();
    } else {
      showToast(`Find all ${state.keys.length} keys first`);
    }
  }
}

function pointerPosition(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * WIDTH,
    y: ((event.clientY - bounds.top) / bounds.height) * HEIGHT,
  };
}

function handlePointerMove(event) {
  const position = pointerPosition(event);
  moveTo(position.x, position.y);
}

function handleKeyboardMove(event) {
  const target = event.target;
  if (
    settingsDialog.open ||
    progressDialog.open ||
    controlsDialog.open ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return;
  }
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(key) ||
      gameScreen.hidden ||
      state.won) {
    return;
  }

  event.preventDefault();
  state.pressedKeys.add(key);
}

playButton.addEventListener("click", () => {
  renderLevels();
  showScreen("levels");
});

homeButton.addEventListener("click", () => showScreen("home"));
levelsHomeButton.addEventListener("click", () => showScreen("home"));
gameLevelsButton.addEventListener("click", () => {
  renderLevels();
  showScreen("levels");
});
winLevelsButton.addEventListener("click", () => {
  renderLevels();
  showScreen("levels");
});
restartButton.addEventListener("click", () => startLevel(state.level));
completeButton.addEventListener("click", () => {
  renderLevels();
  if (state.level < 20) {
    startLevel(state.level + 1);
  } else {
    showScreen("levels");
  }
});

topLevelsButton.addEventListener("click", () => {
  renderLevels();
  showScreen("levels");
});
progressButton.addEventListener("click", () => {
  renderProgressDialog();
  progressDialog.showModal();
});
progressLevelsButton.addEventListener("click", () => {
  progressDialog.close();
  renderLevels();
  showScreen("levels");
});
controlsButton.addEventListener("click", () => controlsDialog.showModal());
settingsButton.addEventListener("click", () => settingsDialog.showModal());
closeSettingsButton.addEventListener("click", () => settingsDialog.close());
closeProgressButton.addEventListener("click", () => progressDialog.close());
closeControlsButton.addEventListener("click", () => controlsDialog.close());
settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) {
    settingsDialog.close();
  }
});
for (const dialog of [progressDialog, controlsDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}

for (const button of themeButtons) {
  button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
}

for (const button of cursorStyleButtons) {
  button.addEventListener("click", () => setCursorStyle(button.dataset.cursorStyle));
}

for (const button of effectButtons) {
  button.addEventListener("click", () => setScreenEffect(button.dataset.screenEffect));
}

for (const button of backdropButtons) {
  button.addEventListener("click", () => setBackdrop(button.dataset.backdrop));
}

showTrailToggle.addEventListener("change", () => {
  localStorage.setItem(STORAGE.trail, String(showTrailToggle.checked));
  renderMaze();
});

showGuideToggle.addEventListener("change", () => {
  localStorage.setItem(STORAGE.guide, String(showGuideToggle.checked));
  renderMaze();
});

reducedMotionToggle.addEventListener("change", () => {
  app.classList.toggle("reduce-motion", reducedMotionToggle.checked);
  localStorage.setItem(STORAGE.motion, String(reducedMotionToggle.checked));
});

canvas.addEventListener("pointermove", handlePointerMove);
window.addEventListener("keydown", handleKeyboardMove);
window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  state.pressedKeys.delete(key);
});
window.addEventListener("blur", () => state.pressedKeys.clear());

readProgress();
state.unlocked = 20;
saveProgress();
const savedTheme = localStorage.getItem(STORAGE.theme);
setTheme(THEME_NAMES.includes(savedTheme) ? savedTheme : "blue");
const savedCursorStyle = localStorage.getItem(STORAGE.cursor);
setCursorStyle(["classic", "neon", "mono"].includes(savedCursorStyle) ? savedCursorStyle : "classic");
const savedScreenEffect = localStorage.getItem(STORAGE.effect);
setScreenEffect(["none", "rgb", "mono"].includes(savedScreenEffect) ? savedScreenEffect : "none");
const savedBackdrop = localStorage.getItem(STORAGE.backdrop);
setBackdrop(["plain", "dots", "grid"].includes(savedBackdrop) ? savedBackdrop : "dots");
reducedMotionToggle.checked = localStorage.getItem(STORAGE.motion) === "true";
showGuideToggle.checked = localStorage.getItem(STORAGE.guide) !== "false";
showTrailToggle.checked = localStorage.getItem(STORAGE.trail) !== "false";
app.classList.toggle("reduce-motion", reducedMotionToggle.checked);
renderLevels();
showScreen("home");
