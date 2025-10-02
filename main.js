import {
  MIN_CAMPUS_WIDTH_UNITS,
  MIN_CAMPUS_HEIGHT_UNITS,
  CAMPUS_PADDING_UNITS_X,
  CAMPUS_PADDING_UNITS_Y,
  STARTING_CASH,
  DAY_TICKS,
  CANVAS_CELL,
  AXIS_LETTERS,
  SAVE_VERSION,
  SAVE_SLOT_COUNT,
  SAVE_STORAGE_KEY_PREFIX,
  VIEW_MODE_STORAGE_KEY,
  ISO_TILE_WIDTH,
  ISO_TILE_HEIGHT,
  ISO_WALL_HEIGHT,
  NEW_ROOM_HIGHLIGHT_TICKS,
  MIN_SHOWCASE_ZOOM,
  MAX_SHOWCASE_ZOOM,
  SHOWCASE_PAN_PADDING,
  AUDIO_SETTINGS_STORAGE_KEY,
  DEFAULT_AUDIO_SETTINGS,
  BACKGROUND_MUSIC_DURATION,
  CORRIDOR_OFFSET_FROM_BOTTOM,
  ENTRANCE_X,
  AGENT_PATIENT_SPEED,
  AGENT_STAFF_SPEED,
  TREATMENT_DURATION_TICKS,
} from "./js/constants.js";
import {
  PROPERTY_PARCELS,
  ROOM_SIZE_LIBRARY,
  ROOM_INTERIOR_LIBRARY,
  ROOM_MACHINE_LIBRARY,
  ROOM_DECOR_LIBRARY,
  roomCatalog,
  baseSeverityMap,
  defaultDesignProfile,
} from "./js/data/roomData.js";
import { staffCatalog } from "./js/data/staffData.js";
import {
  billingProfiles,
  patientNames,
  loanOffers,
  researchProjects,
  marketingCampaigns,
  ailments,
  emergencyCases,
  objectives,
  restoreObjectives,
} from "./js/data/gameData.js";
import {
  deepClone,
  clamp,
  hashString,
  shiftColor,
  hexToRgb,
  withAlpha,
} from "./js/utils/helpers.js";
import { createRenderEngine } from "./js/graphics/renderEngine.js";

const showcaseAnimation = {
  time: 0,
  pulse: 0,
  wave: 0,
};

const ISO_BASE_YAW = Math.PI / 4;
const ISO_CAMERA_PITCH = Math.atan(
  ((ISO_WALL_HEIGHT * Math.SQRT1_2) / (ISO_TILE_HEIGHT / 2)) || 1
);
const ISO_HORIZONTAL_SCALE = ISO_TILE_WIDTH / Math.SQRT2;
const ISO_VERTICAL_SCALE = ISO_WALL_HEIGHT / Math.sin(ISO_CAMERA_PITCH);
const LIGHT_AZIMUTH = (-Math.PI * 2) / 3;
const LIGHT_DIRECTION = {
  x: Math.cos(LIGHT_AZIMUTH),
  y: Math.sin(LIGHT_AZIMUTH),
};
const ROTATION_SENSITIVITY = 0.0042;
const ROTATION_KEY_STEP = Math.PI / 18;

const storage = (() => {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    const testKey = "__pph_storage_check__";
    window.localStorage.setItem(testKey, "ok");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (error) {
    return null;
  }
})();

const isStorageAvailable = Boolean(storage);

const getSaveSlotKey = (slot) => `${SAVE_STORAGE_KEY_PREFIX}:${slot}`;

const sanitizeSaveLabel = (value = "") => value.trim().slice(0, 60);

const formatDateTime = (timestamp) => {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    return "";
  }
};

const createPropertyState = () =>
  PROPERTY_PARCELS.map((parcel) => ({ ...parcel, owned: parcel.cost === 0 }));

const getParcelAt = (x, y) =>
  state.properties.find(
    (parcel) =>
      x >= parcel.x &&
      x < parcel.x + parcel.width &&
      y >= parcel.y &&
      y < parcel.y + parcel.height
  ) ?? null;

const isTileUnlocked = (x, y) => {
  const parcel = getParcelAt(x, y);
  return Boolean(parcel && parcel.owned);
};

const getPropertyById = (id) => state.properties.find((parcel) => parcel.id === id);
const getOwnedProperties = () => state.properties.filter((parcel) => parcel.owned);

const createShellForParcel = (parcel) => {
  if (!parcel) return null;
  const marginX = Math.max(2, Math.round(parcel.width / 10));
  const marginY = Math.max(2, Math.round(parcel.height / 8));
  const width = clamp(parcel.width - marginX * 2, 6, Math.max(6, parcel.width - 2));
  const height = clamp(parcel.height - marginY * 2, 6, Math.max(6, parcel.height - 2));
  const shellMarginX = Math.max(1, Math.floor((parcel.width - width) / 2));
  const shellMarginY = Math.max(1, Math.floor((parcel.height - height) / 2));
  const shellX = parcel.x + shellMarginX;
  const shellY = parcel.y + shellMarginY;
  const doorIndex = clamp(Math.round(ENTRANCE_X - shellX - 0.5), 0, width - 1);
  const windows = [];
  const addWindows = (wall, span, spacing) => {
    const safeSpacing = Math.max(2, spacing);
    for (let index = 1; index < span - 1; index += safeSpacing) {
      if (wall === "south" && Math.abs(index - doorIndex) <= 1) {
        continue;
      }
      windows.push({ wall, index });
    }
  };
  addWindows("north", width, Math.round(width / 6));
  addWindows("south", width, Math.round(width / 5));
  addWindows("east", height, Math.round(height / 4));
  addWindows("west", height, Math.round(height / 4));
  return {
    id: `shell-${parcel.id}`,
    x: shellX,
    y: shellY,
    width,
    height,
    doors: [{ wall: "south", index: doorIndex }],
    windows,
  };
};

const deriveCampusShells = () => {
  const atrium = getPropertyById("atrium");
  if (atrium?.owned) {
    const shell = createShellForParcel(atrium);
    return shell ? [shell] : [];
  }
  const fallback = getOwnedProperties()[0];
  const shell = createShellForParcel(fallback);
  return shell ? [shell] : [];
};

const state = {
  grid: [],
  gridWidth: MIN_CAMPUS_WIDTH_UNITS,
  gridHeight: MIN_CAMPUS_HEIGHT_UNITS,
  rooms: [],
  staff: [],
  candidates: [],
  patientsOnSite: [],
  activePatients: [],
  marketingEffects: [],
  projects: deepClone(researchProjects),
  campaigns: deepClone(marketingCampaigns),
  objectives: restoreObjectives(),
  queue: [],
  billingRecords: [],
  loans: [],
  installmentPlans: [],
  properties: createPropertyState(),
  shells: [],
  litter: 0,
  ambience: { environment: 0, welfare: 0, morale: 0, reputation: 0 },
  staffAgents: [],
  stats: {
    day: 1,
    tick: 0,
    cash: STARTING_CASH,
    reputation: 50,
    patientsTreated: 0,
    cleanliness: 75,
    efficiency: 60,
    morale: 70,
    grounds: 72,
    plantCare: 78,
    revenueToday: 0,
    expensesToday: 0,
    environmentScore: 55,
    welfareScore: 55,
  },
};

const createEmptyGrid = (width, height) =>
  Array.from({ length: height }, () => Array(width).fill(null));

const resizeGrid = (width, height) => {
  const previousWidth = state.gridWidth;
  const previousHeight = state.gridHeight;
  if (state.grid.length === 0) {
    state.grid = createEmptyGrid(width, height);
  } else {
    const newGrid = createEmptyGrid(width, height);
    for (let y = 0; y < Math.min(previousHeight, height); y += 1) {
      for (let x = 0; x < Math.min(previousWidth, width); x += 1) {
        newGrid[y][x] = state.grid[y]?.[x] ?? null;
      }
    }
    state.grid = newGrid;
  }
  state.gridWidth = width;
  state.gridHeight = height;
};

const getGridWidth = () => state.gridWidth;
const getGridHeight = () => state.gridHeight;
const getCorridorY = () => getGridHeight() - CORRIDOR_OFFSET_FROM_BOTTOM;

const getOwnedParcelExtents = () => {
  const owned = getOwnedProperties();
  if (!owned.length) {
    return { maxX: 0, maxY: 0 };
  }
  let maxX = 0;
  let maxY = 0;
  owned.forEach((parcel) => {
    maxX = Math.max(maxX, parcel.x + parcel.width);
    maxY = Math.max(maxY, parcel.y + parcel.height);
  });
  return { maxX, maxY };
};

const computeDynamicGridDimensions = () => {
  const viewportWidth =
    typeof window !== "undefined" && typeof window.innerWidth === "number"
      ? window.innerWidth
      : 1280;
  const viewportHeight =
    typeof window !== "undefined" && typeof window.innerHeight === "number"
      ? window.innerHeight
      : 720;
  const viewportWidthUnits = Math.ceil((viewportWidth / CANVAS_CELL) * 1.6);
  const viewportHeightUnits = Math.ceil((viewportHeight / CANVAS_CELL) * 1.25);
  const { maxX, maxY } = getOwnedParcelExtents();
  const campusWidth = Math.ceil(maxX + CAMPUS_PADDING_UNITS_X);
  const campusHeight = Math.ceil(maxY + CAMPUS_PADDING_UNITS_Y);
  const width = Math.max(MIN_CAMPUS_WIDTH_UNITS, viewportWidthUnits, campusWidth);
  const height = Math.max(
    MIN_CAMPUS_HEIGHT_UNITS,
    viewportHeightUnits,
    campusHeight
  );
  return { width, height };
};

const ensureGridCapacity = () => {
  const { width, height } = computeDynamicGridDimensions();
  const needsResize =
    width !== state.gridWidth || height !== state.gridHeight || state.grid.length === 0;
  if (needsResize) {
    resizeGrid(width, height);
  }
  return needsResize;
};

const elements = {
  grid: document.querySelector("#grid"),
  hospitalCanvas: document.querySelector("#hospital-canvas"),
  buildOptions: document.querySelector("#build-options"),
  buildMenu: document.querySelector("#build-menu"),
  buildMenuTabs: Array.from(document.querySelectorAll("[data-build-tab]")),
  buildMenuPanels: {
    rooms: document.querySelector("#build-menu-rooms"),
    structure: document.querySelector("#build-menu-structure"),
    interiors: document.querySelector("#build-menu-interiors"),
    amenities: document.querySelector("#build-menu-amenities"),
  },
  buildHint: document.querySelector("#live-build-hint"),
  liveBuild: {
    overlay: document.querySelector("#live-build-overlay"),
    hint: document.querySelector("#live-build-hint"),
    footnote: document.querySelector("#live-build-footnote"),
    palette: document.querySelector("#live-build-rooms"),
  },
  property: {
    market: document.querySelector("#property-market"),
    owned: document.querySelector("#property-owned"),
  },
  lotOverview: {
    openButton: document.querySelector("#open-lot-overview"),
    modal: document.querySelector("#lot-overview-menu"),
    list: document.querySelector("#lot-overview-list"),
  },
  hospitalOverview: {
    openButton: document.querySelector("#open-hospital-overview"),
    modal: document.querySelector("#hospital-overview-menu"),
    metrics: document.querySelector("#hospital-overview-metrics"),
  },
  zoom: {
    container: document.querySelector("#hospital-zoom-controls"),
    indicator: document.querySelector("#hospital-zoom-indicator"),
    reset: document.querySelector("#reset-hospital-zoom"),
  },
  viewHint: document.querySelector("#hospital-view-hint"),
  statDay: document.querySelector("#stat-day"),
  statCash: document.querySelector("#stat-cash"),
  statReputation: document.querySelector("#stat-reputation"),
  statTreated: document.querySelector("#stat-treated"),
  statEnvironment: document.querySelector("#stat-environment"),
  statWelfare: document.querySelector("#stat-welfare"),
  patientQueue: document.querySelector("#patient-queue"),
  overviewSummary: {
    cleanliness: document.querySelector("#overview-cleanliness"),
    efficiency: document.querySelector("#overview-efficiency"),
    morale: document.querySelector("#overview-morale"),
    grounds: document.querySelector("#overview-grounds"),
    plant: document.querySelector("#overview-plants"),
  },
  eventLog: document.querySelector("#event-log"),
  staffCandidates: document.querySelector("#staff-candidates"),
  staffRoster: document.querySelector("#staff-roster"),
  researchProjects: document.querySelector("#research-projects"),
  marketingCampaigns: document.querySelector("#marketing-campaigns"),
  dailyReport: document.querySelector("#daily-report"),
  objectives: document.querySelector("#objectives"),
  billingLedger: document.querySelector("#billing-ledger"),
  finance: {
    loanOffers: document.querySelector("#loan-offers"),
    activeLoans: document.querySelector("#active-loans"),
    receivables: document.querySelector("#receivables-summary"),
  },
  meters: {
    cleanliness: document.querySelector("#meter-cleanliness"),
    efficiency: document.querySelector("#meter-efficiency"),
    morale: document.querySelector("#meter-morale"),
    grounds: document.querySelector("#meter-grounds"),
    plant: document.querySelector("#meter-plants"),
  },
  policies: {
    fastTrack: document.querySelector("#policy-fast-track"),
    overtime: document.querySelector("#policy-overtime"),
  },
  designer: {
    size: document.querySelector("#designer-size"),
    theme: document.querySelector("#designer-theme"),
    machines: document.querySelector("#designer-machines"),
    decor: document.querySelector("#designer-decor"),
    summary: document.querySelector("#designer-summary"),
    apply: document.querySelector("#designer-apply"),
  },
  builtRooms: document.querySelector("#built-rooms"),
  viewButtons: Array.from(document.querySelectorAll("[data-view-mode]")),
  patientDetail: {
    panel: document.querySelector("#patient-detail"),
    name: document.querySelector("#patient-detail-name"),
    status: document.querySelector("#patient-detail-status"),
    mood: document.querySelector("#patient-detail-mood"),
    profile: document.querySelector("#patient-detail-profile"),
    healthBar: document.querySelector("#patient-detail-health"),
    healthValue: document.querySelector("#patient-detail-health-value"),
    diagnosisBar: document.querySelector("#patient-detail-diagnosis"),
    diagnosisValue: document.querySelector("#patient-detail-diagnosis-value"),
    patienceBar: document.querySelector("#patient-detail-patience"),
    patienceValue: document.querySelector("#patient-detail-patience-value"),
    ailment: document.querySelector("#patient-detail-ailment"),
    queue: document.querySelector("#patient-detail-queue"),
    cures: document.querySelector("#patient-detail-cures"),
    curesEmpty: document.querySelector("#patient-detail-cures-empty"),
    notes: document.querySelector("#patient-detail-notes"),
    close: document.querySelector("#patient-detail-close"),
  },
  save: {
    modal: document.querySelector("#save-modal"),
    slotList: document.querySelector("#save-slot-list"),
    message: document.querySelector("#save-menu-message"),
    openButton: document.querySelector("#open-save-menu"),
  },
  audio: {
    musicToggle: document.querySelector("#toggle-music"),
    sfxToggle: document.querySelector("#toggle-sfx"),
  },
};

const menuOptions = Array.from(
  document.querySelectorAll(".menu-option:not([data-modal]):not([data-audio-toggle])")
);

const renderEngine = createRenderEngine({ tileSize: CANVAS_CELL });

let selectedRoom = null;
let patientIdCounter = 1;
let roomIdCounter = 1;
let staffIdCounter = 1;
let hospitalCtx = null;
let blueprintBuffer = null;
let emptyTileSprite = null;
let lockedTileSprite = null;
let isoMapperCache = null;
let viewMode = "showcase";
let showcaseZoom = 1;
let showcasePanX = 0;
let showcasePanY = 0;
let showcaseRotation = 0;
let isShowcasePanning = false;
let showcasePanPointerId = null;
let showcasePanLastPoint = null;
let isShowcaseRotating = false;
let showcaseRotatePointerId = null;
let showcaseRotateLastPoint = null;
let lastFocusedBeforeSaveMenu = null;
let lastFocusedBeforeLotOverview = null;
let lastFocusedBeforeHospitalOverview = null;
let selectedPatientId = null;
let audioSettings = { ...DEFAULT_AUDIO_SETTINGS };
let audioContextInstance = null;
let musicGainNode = null;
let sfxGainNode = null;
let backgroundMusicSource = null;
let backgroundMusicBuffer = null;
let hasBoundGlobalUiSfx = false;
let audioUnlockBound = false;

const invalidateCanvasCache = () => {
  blueprintBuffer = null;
  emptyTileSprite = null;
  lockedTileSprite = null;
  isoMapperCache = null;
  renderEngine.invalidate();
};

const loadAudioSettings = () => {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AUDIO_SETTINGS,
      ...(typeof parsed === "object" && parsed ? parsed : {}),
    };
  } catch (error) {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
};

const saveAudioSettings = () => {
  try {
    localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(audioSettings));
  } catch (error) {
    // Ignore storage failures (e.g. private mode)
  }
};

const ensureAudioContext = () => {
  if (audioContextInstance) {
    return audioContextInstance;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  audioContextInstance = new AudioContextClass();
  musicGainNode = audioContextInstance.createGain();
  sfxGainNode = audioContextInstance.createGain();
  musicGainNode.gain.value = audioSettings.music ? 0.4 : 0;
  sfxGainNode.gain.value = audioSettings.sfx ? 0.7 : 0;
  musicGainNode.connect(audioContextInstance.destination);
  sfxGainNode.connect(audioContextInstance.destination);
  return audioContextInstance;
};

const resumeAudioContext = () => {
  const context = ensureAudioContext();
  if (!context) {
    return null;
  }
  if (context.state === "suspended") {
    context.resume();
  }
  return context;
};

const getBackgroundMusicBuffer = () => {
  const context = ensureAudioContext();
  if (!context) {
    return null;
  }
  if (backgroundMusicBuffer) {
    return backgroundMusicBuffer;
  }
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * BACKGROUND_MUSIC_DURATION);
  const buffer = context.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const slowLfoA = (Math.sin(2 * Math.PI * 0.125 * t) + 1) / 2;
    const slowLfoB = (Math.sin(2 * Math.PI * 0.25 * t + Math.PI / 3) + 1) / 2;
    const voiceA = Math.sin(2 * Math.PI * 220 * t);
    const voiceB = Math.sin(2 * Math.PI * 275 * t);
    const voiceC = Math.sin(2 * Math.PI * 330 * t);
    const shimmer = Math.sin(2 * Math.PI * 440 * t) * 0.12 * slowLfoB;
    const pad = voiceA * 0.4 * slowLfoA + voiceB * 0.28 * slowLfoB + voiceC * 0.22;
    data[i] = (pad + shimmer) * 0.3;
  }
  backgroundMusicBuffer = buffer;
  return buffer;
};

const startBackgroundMusic = () => {
  if (!audioSettings.music) {
    return;
  }
  const context = resumeAudioContext();
  const buffer = getBackgroundMusicBuffer();
  if (!context || !buffer || backgroundMusicSource) {
    return;
  }
  const now = context.currentTime;
  musicGainNode.gain.cancelScheduledValues(now);
  musicGainNode.gain.setValueAtTime(Math.max(0, musicGainNode.gain.value), now);
  musicGainNode.gain.linearRampToValueAtTime(0.4, now + 0.6);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(musicGainNode);
  source.onended = () => {
    if (backgroundMusicSource === source) {
      backgroundMusicSource = null;
    }
  };
  source.start(now + 0.05);
  backgroundMusicSource = source;
};

const stopBackgroundMusic = () => {
  if (!audioContextInstance || !musicGainNode) {
    return;
  }
  const context = audioContextInstance;
  const now = context.currentTime;
  musicGainNode.gain.cancelScheduledValues(now);
  musicGainNode.gain.setValueAtTime(Math.max(0, musicGainNode.gain.value), now);
  musicGainNode.gain.linearRampToValueAtTime(0, now + 0.4);
  if (backgroundMusicSource) {
    const source = backgroundMusicSource;
    backgroundMusicSource = null;
    source.stop(now + 0.45);
  }
};

const SFX_PRESETS = {
  ui: { start: 520, end: 640, duration: 0.18, volume: 0.32, type: "triangle" },
  positive: { start: 660, end: 880, duration: 0.32, volume: 0.36, type: "sine" },
  warning: { start: 440, end: 520, duration: 0.24, volume: 0.34, type: "sawtooth" },
  negative: { start: 420, end: 260, duration: 0.28, volume: 0.34, type: "triangle" },
};

const playSfx = (tone = "ui") => {
  if (!audioSettings.sfx) {
    return;
  }
  const context = ensureAudioContext();
  if (!context || !sfxGainNode || context.state === "suspended") {
    return;
  }
  const preset = SFX_PRESETS[tone] ?? SFX_PRESETS.ui;
  const oscillator = context.createOscillator();
  oscillator.type = preset.type;
  const gain = context.createGain();
  const startTime = context.currentTime + 0.001;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(preset.volume, startTime + 0.01);
  gain.gain.linearRampToValueAtTime(0, startTime + preset.duration);
  oscillator.frequency.setValueAtTime(preset.start, startTime);
  oscillator.frequency.linearRampToValueAtTime(preset.end, startTime + preset.duration);
  oscillator.connect(gain);
  gain.connect(sfxGainNode);
  oscillator.start(startTime);
  oscillator.stop(startTime + preset.duration + 0.05);
};

const updateAudioToggleButtons = () => {
  const { musicToggle, sfxToggle } = elements.audio;
  if (musicToggle) {
    musicToggle.setAttribute("aria-pressed", audioSettings.music ? "true" : "false");
    musicToggle.textContent = `Music: ${audioSettings.music ? "On" : "Off"}`;
  }
  if (sfxToggle) {
    sfxToggle.setAttribute("aria-pressed", audioSettings.sfx ? "true" : "false");
    sfxToggle.textContent = `Sound Effects: ${audioSettings.sfx ? "On" : "Off"}`;
  }
};

const handleGlobalUiClickForSfx = (event) => {
  if (!audioSettings.sfx) {
    return;
  }
  const actionable = event.target.closest("button, [role=\"button\"], .build-chip");
  if (!actionable) {
    return;
  }
  if (actionable.hasAttribute("data-audio-toggle")) {
    return;
  }
  resumeAudioContext();
  playSfx("ui");
};

const bindGlobalUiSfx = () => {
  if (hasBoundGlobalUiSfx) {
    return;
  }
  document.addEventListener("click", handleGlobalUiClickForSfx);
  hasBoundGlobalUiSfx = true;
};

const setupAudioUnlock = () => {
  if (audioUnlockBound) {
    return;
  }
  const unlock = () => {
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
    const context = resumeAudioContext();
    if (!context) {
      return;
    }
    const targetContext = context;
    requestAnimationFrame(() => {
      if (audioSettings.music) {
        startBackgroundMusic();
      } else if (musicGainNode) {
        musicGainNode.gain.setValueAtTime(0, targetContext.currentTime);
      }
    });
  };
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
  audioUnlockBound = true;
};

const disableUnsupportedAudioToggle = (button, label) => {
  if (!button) {
    return;
  }
  button.textContent = `${label}: Unsupported`;
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-disabled", "true");
  button.disabled = true;
};

const setupAudioControls = () => {
  audioSettings = loadAudioSettings();
  const audioSupported = Boolean(window.AudioContext || window.webkitAudioContext);
  if (!audioSupported) {
    disableUnsupportedAudioToggle(elements.audio.musicToggle, "Music");
    disableUnsupportedAudioToggle(elements.audio.sfxToggle, "Sound Effects");
    return;
  }
  updateAudioToggleButtons();
  bindGlobalUiSfx();
  setupAudioUnlock();
  const { musicToggle, sfxToggle } = elements.audio;
  if (musicToggle) {
    musicToggle.addEventListener("click", () => {
      audioSettings.music = !audioSettings.music;
      updateAudioToggleButtons();
      saveAudioSettings();
      if (audioSettings.music) {
        resumeAudioContext();
        startBackgroundMusic();
        playSfx("positive");
      } else {
        stopBackgroundMusic();
      }
    });
  }
  if (sfxToggle) {
    sfxToggle.addEventListener("click", () => {
      audioSettings.sfx = !audioSettings.sfx;
      const context = ensureAudioContext();
      if (context && sfxGainNode) {
        const now = context.currentTime;
        sfxGainNode.gain.cancelScheduledValues(now);
        sfxGainNode.gain.setValueAtTime(Math.max(0, sfxGainNode.gain.value), now);
        const target = audioSettings.sfx ? 0.7 : 0;
        sfxGainNode.gain.linearRampToValueAtTime(target, now + 0.15);
      }
      updateAudioToggleButtons();
      saveAudioSettings();
      if (audioSettings.sfx) {
        resumeAudioContext();
        playSfx("positive");
      }
    });
  }
};

const computeWheelZoomFactor = (deltaY) => {
  if (!deltaY) return 1;
  const magnitude = clamp(Math.abs(deltaY) / 400, 0.08, 0.45);
  const step = 1 + magnitude;
  return deltaY < 0 ? step : 1 / step;
};

const constrainShowcasePan = () => {
  const width = getGridWidth() * CANVAS_CELL;
  const height = getGridHeight() * CANVAS_CELL;
  const horizontalAllowance = Math.max(0, (width - width / showcaseZoom) / 2);
  const verticalAllowance = Math.max(0, (height - height / showcaseZoom) / 2);
  const limitX = horizontalAllowance + width * SHOWCASE_PAN_PADDING;
  const limitY = verticalAllowance + height * SHOWCASE_PAN_PADDING;
  showcasePanX = clamp(showcasePanX, -limitX, limitX);
  showcasePanY = clamp(showcasePanY, -limitY, limitY);
};

const normalizeRotation = (angle) => {
  if (!Number.isFinite(angle)) {
    return 0;
  }
  let normalized = angle % (Math.PI * 2);
  if (normalized > Math.PI) {
    normalized -= Math.PI * 2;
  } else if (normalized < -Math.PI) {
    normalized += Math.PI * 2;
  }
  return normalized;
};

const setShowcaseRotation = (value, { forceRender = false } = {}) => {
  const normalized = normalizeRotation(value);
  const changed = Math.abs(normalized - showcaseRotation) > 0.0001;
  if (!changed && !forceRender) {
    return;
  }
  showcaseRotation = normalized;
  isoMapperCache = null;
  constrainShowcasePan();
  renderHospitalCanvas();
};

const adjustShowcaseRotation = (delta) => {
  if (!delta) return;
  setShowcaseRotation(showcaseRotation + delta);
};

const updateShowcaseZoomIndicator = () => {
  const container = elements.zoom?.container;
  const indicator = elements.zoom?.indicator;
  if (!container || !indicator) return;
  if (viewMode !== "showcase") {
    container.setAttribute("hidden", "true");
    elements.viewHint?.setAttribute("hidden", "true");
    return;
  }
  container.removeAttribute("hidden");
  elements.viewHint?.removeAttribute("hidden");
  indicator.textContent = `${Math.round(showcaseZoom * 100)}%`;
};

const setShowcaseZoom = (
  value,
  { focusX = null, focusY = null, skipPanAdjustment = false, forceRender = false } = {}
) => {
  const previous = showcaseZoom;
  const clamped = clamp(value, MIN_SHOWCASE_ZOOM, MAX_SHOWCASE_ZOOM);
  const changed = Math.abs(clamped - showcaseZoom) > 0.001;
  if (changed && focusX !== null && focusY !== null && !skipPanAdjustment) {
    const width = getGridWidth() * CANVAS_CELL;
    const height = getGridHeight() * CANVAS_CELL;
    const centerX = width / 2;
    const centerY = height / 2;
    const deltaX = (focusX - centerX) * (1 / clamped - 1 / previous);
    const deltaY = (focusY - centerY) * (1 / clamped - 1 / previous);
    showcasePanX += deltaX;
    showcasePanY += deltaY;
  }
  showcaseZoom = clamped;
  constrainShowcasePan();
  updateShowcaseZoomIndicator();
  if (changed || forceRender) {
    renderHospitalCanvas();
  }
};

const adjustShowcaseZoom = (factor, options = {}) => {
  setShowcaseZoom(showcaseZoom * factor, options);
};

const isBuildSelectionActive = () => Boolean(selectedRoom ?? designerState.blueprint);

const getShowcaseWorldPoint = (offsetX, offsetY, rect) => {
  const width = getGridWidth() * CANVAS_CELL;
  const height = getGridHeight() * CANVAS_CELL;
  const canvasX = rect.width ? (offsetX / rect.width) * width : offsetX;
  const canvasY = rect.height ? (offsetY / rect.height) * height : offsetY;
  const centerX = width / 2;
  const centerY = height / 2;
  return {
    x: (canvasX - centerX) / showcaseZoom + centerX - showcasePanX,
    y: (canvasY - centerY) / showcaseZoom + centerY - showcasePanY,
  };
};

const getShowcaseTileFromOffset = (offsetX, offsetY, rect) => {
  if (!rect) return null;
  if (offsetX < 0 || offsetY < 0 || offsetX > rect.width || offsetY > rect.height) {
    return null;
  }
  const world = getShowcaseWorldPoint(offsetX, offsetY, rect);
  const mapper = getIsoMapper();
  const { x, y } = mapper.unproject(world.x, world.y);
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  if (tileX < 0 || tileY < 0 || tileX >= getGridWidth() || tileY >= getGridHeight()) {
    return null;
  }
  return { x: tileX, y: tileY };
};

const getShowcaseTileFromEvent = (event) => {
  const canvas = event.currentTarget || elements.hospitalCanvas;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  return getShowcaseTileFromOffset(offsetX, offsetY, rect);
};

const findPatientNearTile = (tile) => {
  if (!tile) return null;
  const center = { x: tile.x + 0.5, y: tile.y + 0.5 };
  let closest = null;
  let bestDistance = Infinity;
  state.patientsOnSite.forEach((patient) => {
    if (!patient.position) return;
    const distance = distanceBetween(center, patient.position);
    if (distance < bestDistance && distance <= 1.1) {
      closest = patient;
      bestDistance = distance;
    }
  });
  return closest;
};

const handleCanvasClick = (event) => {
  if (viewMode !== "showcase") return;
  if (isShowcasePanning || buildPreviewState.active) return;
  const tile = getShowcaseTileFromEvent(event);
  const patient = findPatientNearTile(tile);
  if (patient) {
    setSelectedPatient(patient);
  } else {
    clearSelectedPatient();
  }
};

const resolveDoorPlacement = (room, x, y) => {
  if (!room) return null;
  const frontY = room.y + room.height;
  if (y === frontY || y === frontY - 1) {
    const index = clamp(x - room.x, 0, Math.max(0, room.width - 1));
    return { wall: "south", index };
  }
  return null;
};

const resolveWindowPlacement = (room, x, y) => {
  if (!room) return null;
  const westX = room.x;
  const eastX = room.x + room.width - 1;
  if (x === westX || x === westX - 1) {
    const index = clamp(y - room.y, 0, Math.max(0, room.height - 1));
    return { wall: "west", index };
  }
  if (x === eastX || x === eastX + 1) {
    const index = clamp(y - room.y, 0, Math.max(0, room.height - 1));
    return { wall: "east", index };
  }
  const northY = room.y;
  if (y === northY || y === northY - 1) {
    const index = clamp(x - room.x, 0, Math.max(0, room.width - 1));
    return { wall: "north", index };
  }
  return null;
};

const placeDoorAt = (room, x, y) => {
  const placement = resolveDoorPlacement(room, x, y);
  if (!placement) {
    if (elements.liveBuild?.footnote) {
      elements.liveBuild.footnote.textContent = "Doors must be placed along the front edge of the room.";
    }
    return true;
  }
  if (room.doors.some((door) => door.wall === placement.wall && door.index === placement.index)) {
    if (elements.liveBuild?.footnote) {
      elements.liveBuild.footnote.textContent = "A door already exists on that panel.";
    }
    return true;
  }
  room.doors.push(placement);
  room.doorInstalled = true;
  const blueprint = getBlueprint(room.type);
  logEvent(
    `${blueprint?.name ?? "Room"} door added on ${describeStructureLocation(room, placement)}.`,
    "positive"
  );
  setStructurePlacementMode("idle", room.id);
  renderHospitalCanvas();
  renderBuildMenuStructure();
  renderBuildMenuInteriors();
  updateBuildTabStates();
  setBuildMenuTab("interiors");
  recalculateAmbience();
  updateStats();
  return true;
};

const placeWindowAt = (room, x, y) => {
  const placement = resolveWindowPlacement(room, x, y);
  if (!placement) {
    if (elements.liveBuild?.footnote) {
      elements.liveBuild.footnote.textContent = "Click a room wall panel to install a window.";
    }
    return true;
  }
  if (room.windows.some((window) => window.wall === placement.wall && window.index === placement.index)) {
    if (elements.liveBuild?.footnote) {
      elements.liveBuild.footnote.textContent = "A window already occupies that panel.";
    }
    return true;
  }
  room.windows.push(placement);
  const blueprint = getBlueprint(room.type);
  logEvent(
    `${blueprint?.name ?? "Room"} window added on ${describeStructureLocation(room, placement)}.`,
    "positive"
  );
  renderHospitalCanvas();
  renderBuildMenuStructure();
  renderBuildMenuInteriors();
  return true;
};

const handleStructurePlacementClick = (x, y) => {
  if (!isStructurePlacementActive()) {
    return false;
  }
  const room = ensureRoomStructure(getRoomById(buildFlowState.activeRoomId));
  if (!room) {
    setStructurePlacementMode("idle");
    return false;
  }
  switch (buildFlowState.mode) {
    case "placing-door":
      return placeDoorAt(room, x, y);
    case "placing-window":
      return placeWindowAt(room, x, y);
    default:
      return false;
  }
};

const handleCanvasWheel = (event) => {
  if (viewMode !== "showcase") {
    return;
  }
  event.preventDefault();
  const factor = computeWheelZoomFactor(event.deltaY);
  if (factor !== 1) {
    const rect = event.currentTarget.getBoundingClientRect();
    const focusX = event.clientX - rect.left;
    const focusY = event.clientY - rect.top;
    adjustShowcaseZoom(factor, { focusX, focusY });
  }
};

const handleCanvasDoubleClick = (event) => {
  if (viewMode !== "showcase") return;
  event.preventDefault();
  resetShowcaseView();
};

const resetShowcaseView = () => {
  endShowcasePan();
  endShowcaseRotation();
  showcasePanX = 0;
  showcasePanY = 0;
  setShowcaseRotation(0);
  setShowcaseZoom(1, { skipPanAdjustment: true, forceRender: true });
};

const beginShowcaseRotation = (pointerId, clientX, clientY, target) => {
  endShowcasePan();
  isShowcaseRotating = true;
  showcaseRotatePointerId = pointerId ?? null;
  showcaseRotateLastPoint = { x: clientX, y: clientY };
  target?.setPointerCapture?.(pointerId ?? undefined);
  elements.hospitalCanvas?.classList.add("is-rotating");
};

const updateShowcaseRotationFromPointer = (event) => {
  if (!isShowcaseRotating || event.pointerId !== showcaseRotatePointerId) {
    return false;
  }
  const last = showcaseRotateLastPoint ?? { x: event.clientX, y: event.clientY };
  const deltaX = event.clientX - last.x;
  if (Math.abs(deltaX) < 0.01) {
    return true;
  }
  showcaseRotateLastPoint = { x: event.clientX, y: event.clientY };
  adjustShowcaseRotation(deltaX * ROTATION_SENSITIVITY);
  return true;
};

const endShowcaseRotation = () => {
  if (!isShowcaseRotating) return;
  isShowcaseRotating = false;
  showcaseRotatePointerId = null;
  showcaseRotateLastPoint = null;
  elements.hospitalCanvas?.classList.remove("is-rotating");
};

const endShowcasePan = () => {
  isShowcasePanning = false;
  showcasePanPointerId = null;
  showcasePanLastPoint = null;
  elements.hospitalCanvas?.classList.remove("is-panning");
};

const handleCanvasPointerDown = (event) => {
  if (viewMode !== "showcase") return;
  const isMouse = event.pointerType === "mouse";
  const isPrimaryButton = isMouse ? event.button === 0 : true;
  if (isPrimaryButton && isStructurePlacementActive()) {
    const tile = getShowcaseTileFromEvent(event);
    if (tile && handleStructurePlacementClick(tile.x, tile.y)) {
      event.preventDefault();
      return;
    }
  }
  if (isPrimaryButton && isBuildSelectionActive()) {
    const tile = getShowcaseTileFromEvent(event);
    if (tile) {
      const began = beginBuildPreview(event.pointerId ?? null, tile.x, tile.y, event.currentTarget);
      if (began) {
        event.preventDefault();
        return;
      }
    }
  }
  if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 1 && event.button !== 2) {
    return;
  }
  const wantsRotate =
    (isMouse && (event.button === 2 || (event.button === 0 && event.altKey))) ||
    (!isMouse && event.altKey);
  if (wantsRotate) {
    event.preventDefault();
    beginShowcaseRotation(event.pointerId, event.clientX, event.clientY, event.currentTarget);
    return;
  }
  const wantsPan =
    (!isMouse || event.button === 0 || event.button === 1) && !event.altKey && !isShowcaseRotating;
  if (!wantsPan) {
    return;
  }
  isShowcasePanning = true;
  showcasePanPointerId = event.pointerId;
  showcasePanLastPoint = { x: event.clientX, y: event.clientY };
  elements.hospitalCanvas?.classList.add("is-panning");
  event.currentTarget.setPointerCapture?.(event.pointerId);
  event.preventDefault();
};

const handleCanvasPointerMove = (event) => {
  if (
    buildPreviewState.active &&
    (buildPreviewState.pointerId === null || event.pointerId === buildPreviewState.pointerId)
  ) {
    const tile = getShowcaseTileFromEvent(event);
    if (tile) {
      updateBuildPreviewBounds(tile.x, tile.y);
    }
    event.preventDefault();
    return;
  }
  if (!buildPreviewState.active && isBuildSelectionActive()) {
    const tile = getShowcaseTileFromEvent(event);
    setBuildHover(tile);
  }
  if (updateShowcaseRotationFromPointer(event)) {
    event.preventDefault();
    return;
  }
  if (!isShowcasePanning || event.pointerId !== showcasePanPointerId) {
    return;
  }
  const last = showcasePanLastPoint ?? { x: event.clientX, y: event.clientY };
  const deltaX = event.clientX - last.x;
  const deltaY = event.clientY - last.y;
  if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) {
    return;
  }
  showcasePanLastPoint = { x: event.clientX, y: event.clientY };
  showcasePanX += deltaX / showcaseZoom;
  showcasePanY += deltaY / showcaseZoom;
  constrainShowcasePan();
  renderHospitalCanvas();
};

const handleCanvasPointerUp = (event) => {
  if (
    buildPreviewState.active &&
    (buildPreviewState.pointerId === null || event.pointerId === buildPreviewState.pointerId)
  ) {
    finalizeBuildPreview(true);
    if (isBuildSelectionActive()) {
      const tile = getShowcaseTileFromEvent(event);
      if (tile) {
        setBuildHover(tile);
      }
    } else {
      clearBuildHover();
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    event.preventDefault();
    return;
  }
  if (isShowcaseRotating && event.pointerId === showcaseRotatePointerId) {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    endShowcaseRotation();
    event.preventDefault();
    return;
  }
  if (event.pointerId !== showcasePanPointerId) {
    return;
  }
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  endShowcasePan();
};

const handleCanvasPointerCancel = (event) => {
  if (
    buildPreviewState.active &&
    (buildPreviewState.pointerId === null || event.pointerId === buildPreviewState.pointerId)
  ) {
    cancelBuildPreview();
  }
  if (!buildPreviewState.active) {
    clearBuildHover();
  }
  if (isShowcaseRotating && (!event.pointerId || event.pointerId === showcaseRotatePointerId)) {
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
    endShowcaseRotation();
    return;
  }
  if (event.pointerId && event.pointerId !== showcasePanPointerId) {
    return;
  }
  event.currentTarget?.releasePointerCapture?.(event.pointerId);
  endShowcasePan();
};

const handleCanvasPointerLeave = (event) => {
  if (!buildPreviewState.active) {
    clearBuildHover();
  }
  if (isShowcasePanning && event.pointerId === showcasePanPointerId) {
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
    endShowcasePan();
  }
};

const createOffscreenCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const getBlueprintBuffer = (width, height) => {
  if (!blueprintBuffer || blueprintBuffer.width !== width || blueprintBuffer.height !== height) {
    blueprintBuffer = createOffscreenCanvas(width, height);
    const ctx = blueprintBuffer.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    const backdrop = ctx.createLinearGradient(0, 0, width, height);
    backdrop.addColorStop(0, "#0f172a");
    backdrop.addColorStop(0.45, "#111d36");
    backdrop.addColorStop(1, "#0b1220");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.15,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.78
    );
    vignette.addColorStop(0, "rgba(56, 189, 248, 0.18)");
    vignette.addColorStop(0.45, "rgba(30, 64, 175, 0.15)");
    vignette.addColorStop(1, "rgba(8, 47, 73, 0.02)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(94, 234, 212, 0.2)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= getGridWidth(); gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * CANVAS_CELL, 0);
      ctx.lineTo(gx * CANVAS_CELL, height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= getGridHeight(); gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * CANVAS_CELL);
      ctx.lineTo(width, gy * CANVAS_CELL);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(94, 234, 212, 0.15)";
    for (let gy = 0; gy < getGridHeight(); gy++) {
      for (let gx = 0; gx < getGridWidth(); gx++) {
        ctx.beginPath();
        ctx.arc(gx * CANVAS_CELL, gy * CANVAS_CELL, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 0.3;
    ctx.setLineDash([6, 18]);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = "rgba(14, 165, 233, 0.18)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, height);
    ctx.moveTo(width, 0);
    ctx.lineTo(0, height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(125, 211, 252, 0.45)";
    ctx.lineWidth = 6;
    ctx.shadowColor = "rgba(56, 189, 248, 0.32)";
    ctx.shadowBlur = 18;
    ctx.strokeRect(6, 6, width - 12, height - 12);
    ctx.restore();

    ctx.save();
    ctx.font = "16px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(191, 219, 254, 0.45)";
    ctx.textBaseline = "top";
    ctx.fillText("Pulse Point Campus", 24, 18);
    ctx.font = "12px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(125, 211, 252, 0.65)";
    ctx.fillText("Blueprint Level 1", 24, 40);
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(148, 197, 255, 0.4)";
    ctx.fillText(`${getGridWidth()}×${getGridHeight()} units`, width - 24, height - 24);
    ctx.restore();
  }
  return blueprintBuffer;
};

const getEmptyTileSprite = () => {
  if (!emptyTileSprite) {
    const canvas = createOffscreenCanvas(CANVAS_CELL, CANVAS_CELL);
    const ctx = canvas.getContext("2d");
    const tileGradient = ctx.createLinearGradient(0, 0, CANVAS_CELL, CANVAS_CELL);
    tileGradient.addColorStop(0, withAlpha("#1e293b", 0.75));
    tileGradient.addColorStop(1, withAlpha("#020617", 0.55));
    ctx.fillStyle = tileGradient;
    drawRoundedRect(ctx, 2, 2, CANVAS_CELL - 4, CANVAS_CELL - 4, 8);
    ctx.fill();
    ctx.save();
    drawRoundedRect(ctx, 2, 2, CANVAS_CELL - 4, CANVAS_CELL - 4, 8);
    ctx.clip();
    const sheen = ctx.createLinearGradient(0, 2, 0, CANVAS_CELL - 2);
    sheen.addColorStop(0, "rgba(148, 197, 255, 0.28)");
    sheen.addColorStop(0.4, "rgba(148, 197, 255, 0.12)");
    sheen.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(2, 2, CANVAS_CELL - 4, CANVAS_CELL - 4);
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = "rgba(59, 130, 246, 0.18)";
    for (let offset = -CANVAS_CELL; offset < CANVAS_CELL * 2; offset += 6) {
      ctx.beginPath();
      ctx.moveTo(offset, 2);
      ctx.lineTo(offset - CANVAS_CELL, CANVAS_CELL - 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "rgba(226, 232, 240, 0.18)";
    ctx.beginPath();
    ctx.arc(CANVAS_CELL / 2, CANVAS_CELL / 2 + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, CANVAS_CELL - 1, CANVAS_CELL - 1);
    emptyTileSprite = canvas;
  }
  return emptyTileSprite;
};

const getLockedTileSprite = () => {
  if (!lockedTileSprite) {
    const canvas = createOffscreenCanvas(CANVAS_CELL, CANVAS_CELL);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    drawRoundedRect(ctx, 2, 2, CANVAS_CELL - 4, CANVAS_CELL - 4, 8);
    ctx.fill();
    ctx.save();
    drawRoundedRect(ctx, 2, 2, CANVAS_CELL - 4, CANVAS_CELL - 4, 8);
    ctx.clip();
    const hatch = ctx.createLinearGradient(0, 0, CANVAS_CELL, CANVAS_CELL);
    hatch.addColorStop(0, "rgba(148, 163, 184, 0.35)");
    hatch.addColorStop(1, "rgba(148, 163, 184, 0.05)");
    ctx.strokeStyle = hatch;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 5]);
    for (let offset = -CANVAS_CELL; offset < CANVAS_CELL * 2; offset += 6) {
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset - CANVAS_CELL, CANVAS_CELL);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(59, 130, 246, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(1.5, 1.5, CANVAS_CELL - 3, CANVAS_CELL - 3);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(148, 197, 255, 0.35)";
    ctx.font = "10px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("For", CANVAS_CELL / 2, CANVAS_CELL / 2 - 2);
    ctx.fillText("Sale", CANVAS_CELL / 2, CANVAS_CELL / 2 + 10);
    lockedTileSprite = canvas;
  }
  return lockedTileSprite;
};

const getRoomTileSprite = (theme, visualKey, visual) =>
  renderEngine.getRoomTileSprite(theme, visualKey, visual);

const CUSTOM_SIZE_ID_PATTERN = /^custom-(\d+)x(\d+)$/i;
const customSizeCache = new Map();

const createCustomLayoutOption = (width, height) => {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const cacheKey = `${safeWidth}x${safeHeight}`;
  if (customSizeCache.has(cacheKey)) {
    return customSizeCache.get(cacheKey);
  }
  const area = safeWidth * safeHeight;
  const areaBonus = Math.max(0, area - 1);
  const aspectRatio = safeWidth > safeHeight ? safeWidth / safeHeight : safeHeight / safeWidth;
  const stretchPenalty = Math.max(0, aspectRatio - 1) * 0.1;

  const costMultiplier = Number((1 + areaBonus * 0.3).toFixed(2));
  const upkeepMultiplier = Number((1 + areaBonus * 0.12 + stretchPenalty * 0.05).toFixed(2));
  const severityBonus = Number((Math.max(0, area - 2) * 0.35 - stretchPenalty * 0.3).toFixed(2));
  const environmentBonus = Number(
    Math.max(0.2, Math.min(1.6, 0.25 + areaBonus * 0.32 - stretchPenalty * 0.2)).toFixed(2)
  );

  const labelBase = safeWidth === safeHeight ? "Suite" : "Wing";
  const option = {
    id: `custom-${cacheKey}`,
    label: `Custom ${safeWidth}×${safeHeight} ${labelBase}`,
    width: safeWidth,
    height: safeHeight,
    costMultiplier,
    upkeepMultiplier,
    severityBonus: Math.max(0, severityBonus),
    environmentBonus,
    description: "Drag-sized layout tailored to your blueprint.",
  };
  customSizeCache.set(cacheKey, option);
  return option;
};

const getSizeOption = (id) => {
  if (!id) {
    return ROOM_SIZE_LIBRARY[0];
  }
  const preset = ROOM_SIZE_LIBRARY.find((option) => option.id === id);
  if (preset) {
    return preset;
  }
  const match = typeof id === "string" ? id.match(CUSTOM_SIZE_ID_PATTERN) : null;
  if (match) {
    return createCustomLayoutOption(Number(match[1]), Number(match[2]));
  }
  return ROOM_SIZE_LIBRARY[0];
};

const getRoomCapacity = (layout) => {
  const area = Math.max(1, layout.width * layout.height);
  const machineSlots = Math.max(1, Math.floor((area + 1) / 2));
  const decorSlots = Math.max(2, area + Math.max(1, Math.floor(area / 2)));
  return { machineSlots, decorSlots };
};

const enforceDesignerCapacities = () => {
  const layout = getSizeOption(designerState.sizeId);
  const capacity = getRoomCapacity(layout);
  const machines = Array.from(designerState.machines);
  const trimmedMachines = [];
  if (machines.includes("standard-kit")) {
    trimmedMachines.push("standard-kit");
  }
  machines.forEach((machine) => {
    if (machine === "standard-kit") return;
    if (trimmedMachines.length >= capacity.machineSlots) return;
    trimmedMachines.push(machine);
  });
  while (trimmedMachines.length > capacity.machineSlots) {
    trimmedMachines.pop();
  }
  if (!trimmedMachines.includes("standard-kit")) {
    trimmedMachines.unshift("standard-kit");
  }
  designerState.machines = new Set(trimmedMachines.slice(0, capacity.machineSlots));

  const decorations = Array.from(designerState.decorations);
  if (decorations.length > capacity.decorSlots) {
    designerState.decorations = new Set(decorations.slice(0, capacity.decorSlots));
  }
  return capacity;
};

const designerState = {
  blueprint: null,
  sizeId: ROOM_SIZE_LIBRARY[0].id,
  interiorId: ROOM_INTERIOR_LIBRARY[0].id,
  machines: new Set(["standard-kit"]),
  decorations: new Set(),
  editingRoomId: null,
  preview: null,
};

const buildFlowState = {
  activeRoomId: null,
  mode: "idle", // "idle" | "placing-door" | "placing-window"
};

let buildMenuTab = "rooms";

const buildPreviewState = {
  active: false,
  pointerId: null,
  captureElement: null,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  valid: false,
  justPlaced: false,
};

const buildHoverState = {
  active: false,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  valid: false,
};

const clearBuildHover = () => {
  if (!buildHoverState.active) {
    return;
  }
  buildHoverState.active = false;
  renderHospitalCanvas();
};

const setBuildHover = (tile) => {
  if (!tile) {
    clearBuildHover();
    return;
  }
  const layout = getSizeOption(designerState.sizeId);
  const layoutWidth = layout.width;
  const layoutHeight = layout.height;
  const maxX = Math.max(0, getGridWidth() - layoutWidth);
  const maxY = Math.max(0, getGridHeight() - layoutHeight);
  const clampedX = clamp(tile.x, 0, maxX);
  const clampedY = clamp(tile.y, 0, maxY);
  const valid = canPlaceFootprint(clampedX, clampedY, layoutWidth, layoutHeight);
  if (
    buildHoverState.active &&
    buildHoverState.x === clampedX &&
    buildHoverState.y === clampedY &&
    buildHoverState.width === layoutWidth &&
    buildHoverState.height === layoutHeight &&
    buildHoverState.valid === valid
  ) {
    return;
  }
  buildHoverState.active = true;
  buildHoverState.x = clampedX;
  buildHoverState.y = clampedY;
  buildHoverState.width = layoutWidth;
  buildHoverState.height = layoutHeight;
  buildHoverState.valid = valid;
  renderHospitalCanvas();
};

const resetBuildPreview = () => {
  buildPreviewState.active = false;
  buildPreviewState.pointerId = null;
  buildPreviewState.captureElement = null;
  buildPreviewState.startX = 0;
  buildPreviewState.startY = 0;
  buildPreviewState.x = 0;
  buildPreviewState.y = 0;
  buildPreviewState.width = 0;
  buildPreviewState.height = 0;
  buildPreviewState.valid = false;
  buildPreviewState.justPlaced = false;
  buildHoverState.active = false;
  updateGridPreviewHighlight();
};

const getInteriorTheme = (id) =>
  ROOM_INTERIOR_LIBRARY.find((theme) => theme.id === id) ?? ROOM_INTERIOR_LIBRARY[0];

const getMachineDefinition = (id) =>
  ROOM_MACHINE_LIBRARY.find((machine) => machine.id === id) ?? ROOM_MACHINE_LIBRARY[0];

const getDecorationDefinition = (id) =>
  ROOM_DECOR_LIBRARY.find((decor) => decor.id === id) ?? ROOM_DECOR_LIBRARY[0];

const summarizeRoomDesign = ({ blueprint, sizeId, layoutOverride, interiorId, machines, decorations }) => {
  const sizeOption = layoutOverride ?? getSizeOption(sizeId);
  const interior = getInteriorTheme(interiorId);
  const machineDefs = machines.map(getMachineDefinition);
  const decorDefs = decorations.map(getDecorationDefinition);

  const baseCost = Math.round(blueprint.cost * sizeOption.costMultiplier);
  const interiorCost = interior.cost;
  const machineCost = machineDefs.reduce((sum, machine) => sum + machine.cost, 0);
  const decorCost = decorDefs.reduce((sum, decor) => sum + decor.cost, 0);
  const totalCost = baseCost + interiorCost + machineCost + decorCost;

  const baseUpkeep = blueprint.upkeep * sizeOption.upkeepMultiplier + interior.upkeep;
  const machineUpkeep = machineDefs.reduce((sum, machine) => sum + machine.upkeep, 0);
  const decorUpkeep = decorDefs.reduce((sum, decor) => sum + decor.upkeep, 0);
  const totalUpkeep = Math.round(baseUpkeep + machineUpkeep + decorUpkeep);

  const capacity = getRoomCapacity(sizeOption);

  const severityBoost =
    sizeOption.severityBonus +
    machineDefs.reduce((sum, machine) => sum + machine.severityBoost, 0) +
    (interior.modifiers?.severityBoost ?? 0);

  const environmentBoost =
    sizeOption.environmentBonus +
    (interior.modifiers?.environment ?? 0) +
    decorDefs.reduce((sum, decor) => sum + decor.environment, 0);
  const welfareBoost =
    (interior.modifiers?.welfare ?? 0) +
    machineDefs.reduce((sum, machine) => sum + (machine.welfareBoost ?? 0), 0) +
    decorDefs.reduce((sum, decor) => sum + decor.welfare, 0);
  const moraleBoost =
    (interior.modifiers?.morale ?? 0) + decorDefs.reduce((sum, decor) => sum + decor.morale, 0);
  const reputationBoost = (interior.modifiers?.reputation ?? 0) + decorDefs.reduce(
    (sum, decor) => sum + decor.reputation,
    0
  );

  return {
    sizeOption,
    interior,
    machines: machineDefs,
    decorations: decorDefs,
    totalCost,
    baseCost,
    interiorCost,
    machineCost,
    decorCost,
    upkeep: totalUpkeep,
    capacity,
    severityBoost,
    environmentBoost,
    welfareBoost,
    moraleBoost,
    reputationBoost,
  };
};

const roomVisuals = {
  reception: {
    color: "#f59e0b",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 4, py + CANVAS_CELL - 18, CANVAS_CELL - 8, 12);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(px + 6, py + 10, CANVAS_CELL - 12, 6);
    },
  },
  triage: {
    color: "#38bdf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, 10);
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(px + 8, py + CANVAS_CELL - 22, CANVAS_CELL - 16, 14);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(px + CANVAS_CELL / 2 - 6, py + 10, 12, 4);
    },
  },
  gp: {
    color: "#60a5fa",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(px + 8, py + 12, 20, 14);
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(px + CANVAS_CELL - 24, py + CANVAS_CELL - 24, 16, 12);
    },
  },
  psychiatry: {
    color: "#22d3ee",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0e7490";
      ctx.fillRect(px + 6, py + 10, CANVAS_CELL - 12, 12);
      ctx.fillStyle = "#cffafe";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + CANVAS_CELL - 18, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  pediatrics: {
    color: "#f472b6",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fecdd3";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, CANVAS_CELL - 24);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 10);
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 8, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  maternity: {
    color: "#f9a8d4",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fdf2f8";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 16);
      ctx.fillStyle = "#ec4899";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + CANVAS_CELL / 2 + 6, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#be123c";
      ctx.fillRect(px + CANVAS_CELL / 2 - 10, py + CANVAS_CELL - 22, 20, 8);
    },
  },
  pharmacy: {
    color: "#34d399",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#064e3b";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, 12);
      ctx.fillStyle = "#bbf7d0";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 20, CANVAS_CELL - 20, 10);
    },
  },
  dermatology: {
    color: "#fb7185",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fecdd3";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 28);
      ctx.fillStyle = "#9f1239";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(px + CANVAS_CELL - 18, py + 10, 10, 18);
    },
  },
  ward: {
    color: "#f472b6",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fecdd3";
      ctx.fillRect(px + 8, py + 10, CANVAS_CELL - 16, 12);
      ctx.fillStyle = "#9d174d";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
    },
  },
  gastro: {
    color: "#f97316",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fed7aa";
      ctx.fillRect(px + 6, py + 8, CANVAS_CELL - 12, 14);
      ctx.fillStyle = "#7c2d12";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 22, CANVAS_CELL - 20, 12);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + CANVAS_CELL / 2 - 6, py + 10, 12, CANVAS_CELL - 36);
    },
  },
  dialysis: {
    color: "#22d3ee",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 10, py + 8, CANVAS_CELL - 20, CANVAS_CELL - 24);
      ctx.fillStyle = "#67e8f9";
      ctx.fillRect(px + CANVAS_CELL / 2 - 14, py + CANVAS_CELL - 20, 28, 10);
      ctx.fillStyle = "#06b6d4";
      ctx.fillRect(px + 8, py + 12, 8, 24);
      ctx.fillRect(px + CANVAS_CELL - 16, py + 12, 8, 24);
    },
  },
  diagnostics: {
    color: "#a855f7",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#ede9fe";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + CANVAS_CELL / 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(px + 6, py + 6, 10, 10);
    },
  },
  cardiology: {
    color: "#f87171",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fee2e2";
      ctx.fillRect(px + 8, py + 10, CANVAS_CELL - 16, 12);
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath();
      ctx.moveTo(px + CANVAS_CELL / 2, py + 16);
      ctx.lineTo(px + CANVAS_CELL - 10, py + CANVAS_CELL / 2);
      ctx.lineTo(px + 10, py + CANVAS_CELL / 2);
      ctx.closePath();
      ctx.fill();
    },
  },
  orthopedics: {
    color: "#facc15",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 8, py + 12, CANVAS_CELL - 16, 12);
      ctx.fillStyle = "#a16207";
      ctx.fillRect(px + CANVAS_CELL / 2 - 4, py + 8, 8, CANVAS_CELL - 24);
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
    },
  },
  neurology: {
    color: "#818cf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#c7d2fe";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, CANVAS_CELL - 24);
      ctx.fillStyle = "#3730a3";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + CANVAS_CELL / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4c1d95";
      ctx.fillRect(px + CANVAS_CELL / 2 - 6, py + CANVAS_CELL - 20, 12, 10);
    },
  },
  physiotherapy: {
    color: "#4ade80",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#166534";
      ctx.fillRect(px + 6, py + CANVAS_CELL - 20, CANVAS_CELL - 12, 10);
      ctx.fillStyle = "#bbf7d0";
      ctx.fillRect(px + CANVAS_CELL / 2 - 12, py + 8, 24, 8);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(px + CANVAS_CELL / 2 - 4, py + 16, 8, CANVAS_CELL - 36);
    },
  },
  oncology: {
    color: "#a855f7",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#ede9fe";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 24);
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(px + 12, py + CANVAS_CELL - 22, CANVAS_CELL - 24, 12);
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  burn: {
    color: "#ea580c",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fed7aa";
      ctx.fillRect(px + 8, py + 10, CANVAS_CELL - 16, CANVAS_CELL - 28);
      ctx.fillStyle = "#c2410c";
      ctx.fillRect(px + CANVAS_CELL / 2 - 12, py + CANVAS_CELL - 24, 24, 12);
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 16, 12, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  research: {
    color: "#38bdf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, 12);
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 22, CANVAS_CELL - 20, 10);
    },
  },
  dental: {
    color: "#fcd34d",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fef9c3";
      ctx.fillRect(px + 6, py + 8, CANVAS_CELL - 12, CANVAS_CELL - 26);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 22, CANVAS_CELL - 20, 10);
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 16, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  ophthalmology: {
    color: "#38bdf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 20);
      ctx.fillStyle = "#bfdbfe";
      ctx.fillRect(px + CANVAS_CELL / 2 - 10, py + CANVAS_CELL - 20, 20, 10);
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 8, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  surgery: {
    color: "#ef4444",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fee2e2";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 16);
      ctx.strokeStyle = "#991b1b";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 16);
      ctx.beginPath();
      ctx.moveTo(px + CANVAS_CELL / 2, py + 12);
      ctx.lineTo(px + CANVAS_CELL / 2, py + CANVAS_CELL - 12);
      ctx.stroke();
    },
  },
  icu: {
    color: "#facc15",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 6, py + 10, CANVAS_CELL - 12, 12);
      ctx.fillStyle = "#92400e";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
      ctx.fillStyle = "#166534";
      ctx.fillRect(px + CANVAS_CELL - 18, py + 8, 10, 26);
    },
  },
  emergency: {
    color: "#ef4444",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fee2e2";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, CANVAS_CELL - 12);
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(px + CANVAS_CELL / 2 - 3, py + 8, 6, CANVAS_CELL - 24);
      ctx.fillRect(px + 8, py + CANVAS_CELL / 2 - 3, CANVAS_CELL - 16, 6);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
    },
  },
  cafeteria: {
    color: "#22c55e",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#bbf7d0";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, 8);
      ctx.fillStyle = "#166534";
      ctx.fillRect(px + 8, py + CANVAS_CELL - 20, CANVAS_CELL - 16, 12);
    },
  },
  gourmet: {
    color: "#facc15",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 6, py + 10, CANVAS_CELL - 12, 10);
      ctx.fillStyle = "#92400e";
      ctx.fillRect(px + 8, py + CANVAS_CELL - 20, CANVAS_CELL - 16, 12);
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  giftshop: {
    color: "#c084fc",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#ede9fe";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 24);
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 20, CANVAS_CELL - 20, 12);
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(px + CANVAS_CELL / 2 - 6, py + 12, 12, 14);
    },
  },
  billing: {
    color: "#38bdf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, 10);
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 20, CANVAS_CELL - 20, 12);
    },
  },
  marketing: {
    color: "#fb923c",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fed7aa";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, 12);
      ctx.fillStyle = "#9a3412";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
    },
  },
  clowncare: {
    color: "#fbbf24",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(px + 6, py + 10, CANVAS_CELL - 12, CANVAS_CELL - 28);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 20, CANVAS_CELL - 20, 12);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  holotheatre: {
    color: "#22d3ee",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 6, py + 8, CANVAS_CELL - 12, CANVAS_CELL - 20);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(px + 8, py + CANVAS_CELL - 22, CANVAS_CELL - 16, 12);
      ctx.fillStyle = "rgba(250, 204, 21, 0.8)";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 16, 12, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  zen: {
    color: "#4ade80",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#bbf7d0";
      ctx.fillRect(px + 8, py + 10, CANVAS_CELL - 16, CANVAS_CELL - 28);
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(px + CANVAS_CELL / 2 - 8, py + CANVAS_CELL - 22, 16, 12);
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  securityoffice: {
    color: "#1e293b",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, CANVAS_CELL - 12);
      ctx.fillStyle = "#475569";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 20, CANVAS_CELL - 20, 10);
      ctx.fillStyle = "#f87171";
      ctx.fillRect(px + CANVAS_CELL / 2 - 6, py + 12, 12, 12);
    },
  },
  staffroom: {
    color: "#fb7185",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fecdd3";
      ctx.fillRect(px + 10, py + 10, CANVAS_CELL - 20, 14);
      ctx.fillStyle = "#9f1239";
      ctx.fillRect(px + 12, py + CANVAS_CELL - 20, CANVAS_CELL - 24, 10);
    },
  },
  radiology: {
    color: "#818cf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#e0e7ff";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + CANVAS_CELL / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4338ca";
      ctx.fillRect(px + 6, py + 6, 12, 12);
    },
  },
  default: {
    color: "#94a3b8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(px + 10, py + 10, CANVAS_CELL - 20, CANVAS_CELL - 20);
    },
  },
};

const ROOM_GLYPHS = {
  reception: "☎",
  triage: "⛑",
  gp: "🩺",
  psychiatry: "🧠",
  pediatrics: "🧸",
  maternity: "🤰",
  pharmacy: "💊",
  dermatology: "🌞",
  ward: "🛏️",
  gastro: "🥣",
  dialysis: "💧",
  diagnostics: "🔬",
  cardiology: "❤️",
  orthopedics: "🦴",
  neurology: "🧠",
  physiotherapy: "🧘",
  oncology: "🎗️",
  burn: "🔥",
  research: "🧪",
  dental: "🦷",
  ophthalmology: "👁️",
  surgery: "🩻",
  icu: "🚨",
  emergency: "🚑",
  cafeteria: "☕",
  gourmet: "🍽️",
  giftshop: "🎁",
  billing: "💳",
  marketing: "📣",
  clowncare: "🤡",
  holotheatre: "🎭",
  zen: "🪴",
  securityoffice: "🛡️",
  staffroom: "☕",
  radiology: "🩻",
  default: "🏥",
};

const logEvent = (message, tone = "neutral") => {
  const entry = document.createElement("li");
  entry.textContent = message;
  entry.classList.add(tone);
  elements.eventLog.prepend(entry);
  while (elements.eventLog.children.length > 8) {
    elements.eventLog.removeChild(elements.eventLog.lastElementChild);
  }
  if (tone !== "neutral") {
    const toneToSfx = {
      positive: "positive",
      negative: "negative",
      warning: "warning",
    };
    const sfxTone = toneToSfx[tone];
    if (sfxTone) {
      playSfx(sfxTone);
    }
  }
};

const formatCurrency = (value) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const calculateLoanSchedule = (offer) => {
  const principal = offer.amount;
  const dailyRate = offer.term ? offer.interestRate / offer.term : 0;
  if (!offer.term) {
    return { dailyPayment: principal, totalRepay: principal, dailyRate: 0 };
  }
  let dailyPayment;
  if (dailyRate <= 0) {
    dailyPayment = principal / offer.term;
  } else {
    const factor = Math.pow(1 + dailyRate, offer.term);
    dailyPayment = (principal * dailyRate * factor) / (factor - 1);
  }
  dailyPayment = Math.max(1, Math.round(dailyPayment));
  const totalRepay = dailyPayment * offer.term;
  return { dailyPayment, totalRepay, dailyRate };
};

const takeLoan = (offerId) => {
  const offer = loanOffers.find((item) => item.id === offerId);
  if (!offer) return;
  if (state.loans.some((loan) => loan.offerId === offer.id)) {
    logEvent("That loan product is already active.", "warning");
    return;
  }
  const schedule = calculateLoanSchedule(offer);
  const loan = {
    loanId: `loan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    offerId: offer.id,
    name: offer.name,
    principal: offer.amount,
    interestRate: offer.interestRate,
    term: offer.term,
    dailyRate: schedule.dailyRate,
    dailyPayment: schedule.dailyPayment,
    remainingBalance: offer.amount,
    daysRemaining: offer.term,
    totalPaid: 0,
    interestPaid: 0,
  };
  state.loans.push(loan);
  state.stats.cash += offer.amount;
  logEvent(`Secured ${offer.name} for ¤${formatCurrency(offer.amount)}.`, "positive");
  recordLedgerEvent({
    name: "Loan Draw",
    detail: offer.name,
    amount: offer.amount,
    tag: "Loan",
  });
  updateFinancePanels();
  updateStats();
};

const renderLoanOffers = () => {
  if (!elements.finance?.loanOffers) return;
  elements.finance.loanOffers.innerHTML = "";
  loanOffers.forEach((offer) => {
    const card = document.createElement("div");
    card.className = "loan-offer";
    const title = document.createElement("h4");
    title.textContent = offer.name;
    const desc = document.createElement("p");
    desc.textContent = offer.desc;
    const schedule = calculateLoanSchedule(offer);
    const terms = document.createElement("p");
    terms.innerHTML = `<strong>Amount:</strong> ¤${formatCurrency(offer.amount)} • <strong>Term:</strong> ${offer.term} days`;
    const payment = document.createElement("p");
    payment.innerHTML = `<strong>Daily:</strong> ¤${formatCurrency(schedule.dailyPayment)} • <strong>Interest:</strong> ${(offer.interestRate * 100).toFixed(1)}%`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Take Loan";
    if (state.loans.some((loan) => loan.offerId === offer.id)) {
      button.disabled = true;
      button.textContent = "Loan Active";
    }
    button.addEventListener("click", () => takeLoan(offer.id));
    card.append(title, desc, terms, payment, button);
    elements.finance.loanOffers.appendChild(card);
  });
};

const renderActiveLoans = () => {
  if (!elements.finance?.activeLoans) return;
  elements.finance.activeLoans.innerHTML = "";
  if (!state.loans.length) {
    const empty = document.createElement("li");
    empty.textContent = "No active loans";
    elements.finance.activeLoans.appendChild(empty);
    return;
  }
  state.loans.forEach((loan) => {
    const li = document.createElement("li");
    const balance = document.createElement("span");
    balance.innerHTML = `<span>Balance</span><span>¤${formatCurrency(Math.max(0, Math.round(loan.remainingBalance)))}</span>`;
    const payment = document.createElement("span");
    payment.innerHTML = `<span>Daily</span><span>¤${formatCurrency(loan.dailyPayment)}</span>`;
    const days = document.createElement("span");
    days.innerHTML = `<span>Days left</span><span>${Math.max(0, loan.daysRemaining)}</span>`;
    li.innerHTML = `<div><strong>${loan.name}</strong></div>`;
    li.append(balance, payment, days);
    elements.finance.activeLoans.appendChild(li);
  });
};

const renderReceivablesSummary = () => {
  if (!elements.finance?.receivables) return;
  const totalDeferred = state.installmentPlans.reduce((sum, plan) => sum + plan.remaining, 0);
  const activePlans = state.installmentPlans.length;
  elements.finance.receivables.innerHTML = `
    <div><strong>Outstanding:</strong> ¤${formatCurrency(Math.round(totalDeferred))}</div>
    <div><strong>Active Plans:</strong> ${activePlans}</div>
  `;
};

const updateFinancePanels = () => {
  renderLoanOffers();
  renderActiveLoans();
  renderReceivablesSummary();
};

const processLoans = () => {
  if (!state.loans.length) return;
  const remainingLoans = [];
  state.loans.forEach((loan) => {
    const interest = Math.round(loan.remainingBalance * loan.dailyRate);
    const scheduledPayment = Math.min(
      loan.dailyPayment,
      Math.round(loan.remainingBalance + interest)
    );
    const payment = Math.max(0, scheduledPayment);
    loan.remainingBalance = Math.max(0, loan.remainingBalance + interest - payment);
    loan.daysRemaining = Math.max(0, loan.daysRemaining - 1);
    loan.totalPaid += payment;
    loan.interestPaid += interest;
    state.stats.cash -= payment;
    state.stats.expensesToday += payment;
    recordLedgerEvent({
      name: "Loan Payment",
      detail: `${loan.name}${interest ? ` (¤${formatCurrency(interest)} interest)` : ""}`,
      amount: -payment,
      tag: "Loan",
    });
    if (loan.remainingBalance <= 1) {
      logEvent(`${loan.name} repaid in full.`, "positive");
    } else {
      remainingLoans.push(loan);
    }
  });
  state.loans = remainingLoans;
  updateFinancePanels();
};

const addInstallmentPlan = (plan) => {
  if (!plan || plan.remaining <= 0) return;
  const entry = {
    id: `plan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    patientName: plan.patientName,
    total: plan.total,
    remaining: plan.remaining,
    dailyPayment: plan.dailyPayment,
    daysRemaining: plan.daysRemaining,
  };
  state.installmentPlans.push(entry);
  logEvent(
    `${plan.patientName} set up installments for ¤${formatCurrency(plan.remaining)}.`,
    "neutral"
  );
  recordLedgerEvent({
    name: "Installment Plan",
    detail: `${plan.patientName} balance deferred`,
    amount: 0,
    tag: "Receivable",
  });
  updateFinancePanels();
};

const processInstallments = () => {
  if (!state.installmentPlans.length) return;
  const remainingPlans = [];
  state.installmentPlans.forEach((plan) => {
    const payment = Math.min(plan.dailyPayment, plan.remaining);
    if (payment > 0) {
      state.stats.cash += payment;
      state.stats.revenueToday += payment;
      recordLedgerEvent({
        name: "Installment Payment",
        detail: plan.patientName,
        amount: payment,
        tag: "Receivable",
      });
    }
    plan.remaining = Math.max(0, plan.remaining - payment);
    plan.daysRemaining = Math.max(0, plan.daysRemaining - 1);
    if (plan.remaining <= 0) {
      logEvent(`${plan.patientName} completed their installment plan.`, "positive");
    } else {
      remainingPlans.push(plan);
    }
  });
  state.installmentPlans = remainingPlans;
  updateFinancePanels();
};

const getBlueprint = (roomType) => roomCatalog.find((room) => room.id === roomType);

const getRoomById = (roomId) => state.rooms.find((room) => room.id === roomId);

const ensureRoomStructure = (room) => {
  if (!room) return room;
  if (!Array.isArray(room.doors)) {
    room.doors = [];
  }
  if (!Array.isArray(room.windows)) {
    room.windows = [];
  }
  room.wallsComplete = room.wallsComplete !== false;
  room.doorInstalled = Boolean(room.doorInstalled || room.doors.length);
  return room;
};

const setActiveInteriorRoom = (roomId) => {
  const room = ensureRoomStructure(getRoomById(roomId));
  buildFlowState.activeRoomId = room ? room.id : null;
  return room ?? null;
};

const getActiveInteriorRoom = () => ensureRoomStructure(getRoomById(buildFlowState.activeRoomId));

const isRoomWallsClosed = (room) => {
  const target = ensureRoomStructure(room);
  return Boolean(target && target.wallsComplete !== false);
};

const isRoomReadyForInterior = (room) => {
  const target = ensureRoomStructure(room);
  return Boolean(target && target.wallsComplete !== false && target.doorInstalled);
};

const isStructurePlacementActive = () => buildFlowState.mode !== "idle";

const setStructurePlacementMode = (mode = "idle", roomId = buildFlowState.activeRoomId) => {
  buildFlowState.mode = mode;
  if (roomId) {
    const target = ensureRoomStructure(getRoomById(roomId));
    buildFlowState.activeRoomId = target ? target.id : buildFlowState.activeRoomId;
  }
  if (!getRoomById(buildFlowState.activeRoomId)) {
    buildFlowState.activeRoomId = null;
  }
  updateBuildGuidance();
};

const describeStructureLocation = (room, fixture) => {
  if (!room || !fixture) return "Unknown";
  const wallLabels = { north: "North", south: "South", east: "East", west: "West" };
  const wallName = wallLabels[fixture.wall] ?? "Wall";
  const span = fixture.wall === "north" || fixture.wall === "south" ? room.width : room.height;
  const slot = clamp(fixture.index + 1, 1, span);
  return `${wallName} wall • Panel ${slot}`;
};

const applyInteriorThemeToRoom = (room, themeId) => {
  if (!room) return false;
  const blueprint = getBlueprint(room.type);
  if (!blueprint) return false;
  const layout = createCustomLayoutOption(room.width, room.height);
  const machines = room.machines?.length ? [...room.machines] : ["standard-kit"];
  if (!machines.includes("standard-kit")) {
    machines.unshift("standard-kit");
  }
  const decorations = room.decorations ?? [];
  const currentPreview = summarizeRoomDesign({
    blueprint,
    sizeId: room.sizeId ?? layout.id,
    layoutOverride: layout,
    interiorId: room.interiorId ?? themeId,
    machines,
    decorations,
  });
  const nextPreview = summarizeRoomDesign({
    blueprint,
    sizeId: room.sizeId ?? layout.id,
    layoutOverride: layout,
    interiorId: themeId,
    machines,
    decorations,
  });
  const costDelta = nextPreview.totalCost - currentPreview.totalCost;
  if (costDelta > 0 && state.stats.cash < costDelta) {
    logEvent(
      `Applying ${nextPreview.interior.label} requires ¤${formatCurrency(costDelta)} more funds.`,
      "negative"
    );
    return false;
  }
  if (costDelta > 0) {
    state.stats.cash -= costDelta;
    state.stats.expensesToday += costDelta;
  }
  room.interiorId = themeId;
  room.costInvested = Math.max(nextPreview.totalCost, room.costInvested ?? nextPreview.totalCost);
  room.upkeep = nextPreview.upkeep;
  room.reputationBoost = nextPreview.reputationBoost;
  room.environmentBoost = nextPreview.environmentBoost;
  room.welfareBoost = nextPreview.welfareBoost;
  room.moraleBoost = nextPreview.moraleBoost;
  room.severityBoost = nextPreview.severityBoost;
  room.severityCapacity = Math.max(
    0,
    Math.round((blueprint.baseSeverity ?? 0) + (nextPreview.severityBoost ?? 0))
  );
  const reputationDelta = (nextPreview.reputationBoost ?? 0) - (currentPreview.reputationBoost ?? 0);
  if (reputationDelta) {
    state.stats.reputation = clamp(state.stats.reputation + reputationDelta, 0, 100);
  }
  logEvent(
    `${blueprint.name} interior switched to ${nextPreview.interior.label}.`,
    "positive"
  );
  return true;
};

const highlightBuildSelection = (roomId) => {
  const container = elements.buildMenuPanels?.rooms ?? elements.buildOptions;
  if (container) {
    container.querySelectorAll("[data-room]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.room === roomId);
    });
  }
  if (elements.liveBuild?.palette) {
    elements.liveBuild.palette.querySelectorAll("[data-room]").forEach((button) => {
      const isActive = button.dataset.room === roomId;
      button.classList.toggle("selected", isActive);
      if (button.hasAttribute("aria-checked")) {
        button.setAttribute("aria-checked", isActive ? "true" : "false");
      }
    });
  }
};

const updateDesignerSummary = () => {
  if (!elements.designer.summary) return;
  const { summary, apply } = elements.designer;
  const blueprint = designerState.blueprint;
  if (!blueprint) {
    summary.innerHTML = "<p>Select a room blueprint to begin designing.</p>";
    designerState.preview = null;
    if (apply) {
      apply.disabled = true;
      apply.textContent = "Apply design to selected room";
    }
    return;
  }

  const machines = Array.from(designerState.machines);
  if (!machines.length) {
    machines.push("standard-kit");
  }
  const decorations = Array.from(designerState.decorations);
  const activeLayout = getSizeOption(designerState.sizeId);
  const preview = summarizeRoomDesign({
    blueprint,
    sizeId: designerState.sizeId,
    layoutOverride: activeLayout,
    interiorId: designerState.interiorId,
    machines,
    decorations,
  });
  designerState.preview = preview;

  const severityBase = blueprint.baseSeverity ?? 0;
  const severityCapacity = Math.max(0, Math.round(severityBase + preview.severityBoost));

  const layoutLine = document.createElement("div");
  layoutLine.innerHTML = `<strong>Layout:</strong> ${preview.sizeOption.label} • Theme ${preview.interior.label}`;
  const costLine = document.createElement("div");
  costLine.innerHTML = `<strong>Total Build Cost:</strong> ¤${formatCurrency(preview.totalCost)}`;
  const upkeepLine = document.createElement("div");
  upkeepLine.innerHTML = `<strong>Daily Upkeep:</strong> ¤${formatCurrency(preview.upkeep)}`;
  const machineLine = document.createElement("div");
  const machineNames = preview.machines.map((machine) => machine.label).join(", ");
  machineLine.innerHTML = `<strong>Equipment:</strong> ${machineNames || "Baseline kit"}`;
  const decorLine = document.createElement("div");
  const decorNames = preview.decorations.map((decor) => decor.label).join(", ");
  decorLine.innerHTML = `<strong>Decor:</strong> ${decorNames || "None"}`;

  const capacityLine = document.createElement("div");
  const capacity = preview.capacity ?? getRoomCapacity(activeLayout);
  capacityLine.innerHTML = `<strong>Capacity:</strong> Equipment ${
    preview.machines.length
  }/${capacity.machineSlots} • Decor ${preview.decorations.length}/${capacity.decorSlots}`;

  summary.innerHTML = "";
  summary.append(layoutLine, costLine, upkeepLine, machineLine, decorLine, capacityLine);

  const amenityDefs = preview.decorations.filter((decor) => decor.amenityType);
  if (amenityDefs.length) {
    const amenityLine = document.createElement("div");
    const amenityNames = [...new Set(amenityDefs.map((decor) => decor.amenityLabel ?? decor.label))];
    amenityLine.innerHTML = `<strong>Amenities:</strong> ${amenityNames.join(", ")}`;
    summary.appendChild(amenityLine);
  }
  const plantCount = preview.decorations.filter((decor) => decor.isPlant).length;
  if (plantCount) {
    const plantLine = document.createElement("div");
    plantLine.innerHTML = `<strong>Plants:</strong> ${plantCount} cared feature${plantCount > 1 ? "s" : ""}`;
    summary.appendChild(plantLine);
  }

  if (severityBase > 0) {
    const severityLine = document.createElement("div");
    severityLine.innerHTML = `<strong>Treatment Capacity:</strong> Severity ${severityCapacity}`;
    summary.appendChild(severityLine);
  }

  const ambienceLine = document.createElement("div");
  const env = preview.environmentBoost.toFixed(1);
  const welfare = preview.welfareBoost.toFixed(1);
  const morale = preview.moraleBoost.toFixed(1);
  const reputation = preview.reputationBoost.toFixed(1);
  ambienceLine.innerHTML = `<strong>Ambience Boosts:</strong> Env +${env}, Welfare +${welfare}, Morale +${morale}, Rep +${reputation}`;
  summary.appendChild(ambienceLine);

  if (designerState.editingRoomId) {
    const room = getRoomById(designerState.editingRoomId);
    if (room) {
      const baselineCost = room.costInvested ?? Math.round(room.baseCost ?? blueprint.cost);
      const delta = preview.totalCost - baselineCost;
      const deltaLine = document.createElement("div");
      if (delta > 0) {
        deltaLine.innerHTML = `<strong>Upgrade Cost:</strong> ¤${formatCurrency(delta)}`;
      } else if (delta < 0) {
        deltaLine.innerHTML = `<strong>Upgrade Cost:</strong> none (layout savings reinvested)`;
      } else {
        deltaLine.innerHTML = `<strong>Upgrade Cost:</strong> none`;
      }
      summary.prepend(deltaLine);
    }
  }

  if (apply) {
    apply.disabled = !designerState.editingRoomId;
    apply.textContent = designerState.editingRoomId
      ? "Apply design to room"
      : "Apply design to selected room";
  }
};

const updateDesignerOptions = () => {
  const blueprint = designerState.blueprint;
  const { size, theme, machines, decor } = elements.designer;
  if (!size || !theme || !machines || !decor) return;

  machines.classList.remove("designer-equipment-list");

  if (!blueprint) {
    size.innerHTML = "<option value=\"\">Select a room</option>";
    theme.innerHTML = "";
    machines.innerHTML = "<p>Select a room to view equipment.</p>";
    decor.innerHTML = "";
    updateDesignerSummary();
    return;
  }

  const profile = blueprint.designProfile ?? defaultDesignProfile;

  if (
    !profile.sizes.includes(designerState.sizeId) &&
    !(typeof designerState.sizeId === "string" && designerState.sizeId.startsWith("custom-"))
  ) {
    designerState.sizeId = profile.sizes[0];
  }
  size.innerHTML = "";
  profile.sizes.forEach((id) => {
    const option = document.createElement("option");
    const sizeOption = getSizeOption(id);
    option.value = id;
    option.textContent = `${sizeOption.label} (¤${formatCurrency(Math.round(blueprint.cost * sizeOption.costMultiplier))})`;
    size.appendChild(option);
  });
  if (typeof designerState.sizeId === "string" && designerState.sizeId.startsWith("custom-")) {
    const customOption = document.createElement("option");
    const layout = getSizeOption(designerState.sizeId);
    customOption.value = designerState.sizeId;
    customOption.textContent = `${layout.label} (¤${formatCurrency(Math.round(blueprint.cost * layout.costMultiplier))})`;
    size.appendChild(customOption);
  }
  size.value = designerState.sizeId;

  enforceDesignerCapacities();

  if (!profile.interiors.includes(designerState.interiorId)) {
    designerState.interiorId = profile.interiors[0];
  }
  theme.innerHTML = "";
  profile.interiors.forEach((id) => {
    const option = document.createElement("option");
    const interior = getInteriorTheme(id);
    option.value = id;
    option.textContent = `${interior.label} (¤${formatCurrency(interior.cost)})`;
    theme.appendChild(option);
  });
  theme.value = designerState.interiorId;

  machines.innerHTML = "";
  const machineIds = profile.machines.length ? profile.machines : ["standard-kit"];
  if (machineIds.length) {
    machines.classList.add("designer-equipment-list");
  }
  const baselineOnly = machineIds.every((id) => id === "standard-kit");
  machineIds.forEach((id) => {
    const def = getMachineDefinition(id);
    const label = document.createElement("label");
    label.className = "designer-equipment-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = id;
    checkbox.className = "designer-equipment-option__checkbox";
    checkbox.checked = designerState.machines.has(id);
    if (id === "standard-kit") {
      checkbox.disabled = true;
      designerState.machines.add(id);
    }

    const updateVisualState = () => {
      label.classList.toggle("is-selected", checkbox.checked);
      label.classList.toggle("is-disabled", checkbox.disabled);
    };

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        designerState.machines.add(id);
      } else {
        designerState.machines.delete(id);
        if (!designerState.machines.size) {
          designerState.machines.add("standard-kit");
        }
      }
      enforceDesignerCapacities();
      if (checkbox.checked && !designerState.machines.has(id) && elements.liveBuild?.footnote) {
        elements.liveBuild.footnote.textContent =
          "Maximum equipment slots reached. Expand the room to install more machines.";
      }
      machines.querySelectorAll("input[type=\"checkbox\"]").forEach((input) => {
        const machineId = input.value;
        const isSelected = designerState.machines.has(machineId);
        input.checked = isSelected;
        input.closest(".designer-equipment-option")?.classList.toggle("is-selected", isSelected);
      });
      updateDesignerSummary();
      updateBuildGuidance();
    });

    const art = renderEngine.createMachineCardArt(def);
    const body = document.createElement("div");
    body.className = "designer-equipment-option__body";
    const title = document.createElement("strong");
    title.textContent = def.label;
    const meta = document.createElement("div");
    meta.className = "designer-equipment-option__meta";
    const costMeta = document.createElement("span");
    costMeta.textContent = `¤${formatCurrency(def.cost)}`;
    meta.appendChild(costMeta);
    const upkeepMeta = document.createElement("span");
    upkeepMeta.textContent = `Upkeep ¤${formatCurrency(def.upkeep)}/day`;
    meta.appendChild(upkeepMeta);
    if (id === "standard-kit") {
      const badge = document.createElement("span");
      badge.className = "designer-equipment-option__badge";
      badge.textContent = "Required";
      meta.appendChild(badge);
    }

    const desc = document.createElement("p");
    desc.className = "designer-equipment-option__description";
    desc.textContent = def.description;

    const bonuses = [];
    if (def.severityBoost) {
      bonuses.push(`+${def.severityBoost} severity`);
    }
    if (def.welfareBoost) {
      bonuses.push(`+${def.welfareBoost} welfare`);
    }
    body.append(title);
    body.append(meta);
    body.append(desc);

    if (bonuses.length) {
      const bonusList = document.createElement("div");
      bonusList.className = "designer-equipment-option__bonuses";
      bonuses.forEach((labelText) => {
        const chip = document.createElement("span");
        chip.textContent = labelText;
        bonusList.appendChild(chip);
      });
      body.append(bonusList);
    }

    if (baselineOnly && id === "standard-kit") {
      const note = document.createElement("p");
      note.className = "designer-equipment-option__note";
      note.textContent = "Baseline kit installed. No specialist machines available for this room.";
      body.append(note);
    }

    label.append(checkbox, art, body);
    machines.appendChild(label);
    updateVisualState();
  });

  decor.innerHTML = "";
  profile.decor.forEach((id) => {
    const def = getDecorationDefinition(id);
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = id;
    checkbox.checked = designerState.decorations.has(id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        designerState.decorations.add(id);
      } else {
        designerState.decorations.delete(id);
      }
      enforceDesignerCapacities();
      if (checkbox.checked && !designerState.decorations.has(id) && elements.liveBuild?.footnote) {
        elements.liveBuild.footnote.textContent =
          "Decoration slots full. Increase the room size to place additional decor.";
      }
      decor.querySelectorAll("input[type=\"checkbox\"]").forEach((input) => {
        const decorId = input.value;
        const isSelected = designerState.decorations.has(decorId);
        input.checked = isSelected;
        input.closest("label")?.classList.toggle("is-selected", isSelected);
      });
      updateDesignerSummary();
      const amenitiesPanel = elements.buildMenuPanels?.amenities;
      if (amenitiesPanel) {
        amenitiesPanel.querySelectorAll(".build-chip").forEach((chip) => {
          chip.classList.toggle("selected", designerState.decorations.has(chip.dataset.decor));
        });
      }
    });
    const text = document.createElement("span");
    const details = [];
    if (def.environment) {
      details.push(`Env +${def.environment}`);
    }
    if (def.welfare) {
      details.push(`Welfare +${def.welfare}`);
    }
    if (def.morale) {
      details.push(`Morale +${def.morale}`);
    }
    if (def.reputation) {
      details.push(`Rep +${def.reputation}`);
    }
    if (def.amenityLabel) {
      details.push(def.amenityLabel);
    }
    if (def.isPlant) {
      details.push("Plant");
    }
    text.textContent = `${def.label} – ¤${formatCurrency(def.cost)}${
      details.length ? ` (${details.join(", ")})` : ""
    }`;
    label.append(checkbox, text);
    decor.appendChild(label);
  });

  updateDesignerSummary();
};

const setDesignerBlueprint = (blueprint, { resetSelections = true, editing = false } = {}) => {
  designerState.blueprint = blueprint;
  if (!editing) {
    designerState.editingRoomId = null;
  }
  if (!blueprint) {
    updateDesignerOptions();
    return;
  }
  const profile = blueprint.designProfile ?? defaultDesignProfile;
  if (resetSelections) {
    designerState.sizeId = profile.sizes[0];
    designerState.interiorId = profile.interiors[0];
    designerState.machines = new Set(profile.defaultMachines ?? ["standard-kit"]);
    if (!designerState.machines.size) {
      designerState.machines.add("standard-kit");
    }
    designerState.decorations = new Set();
  } else {
    if (!profile.sizes.includes(designerState.sizeId)) {
      designerState.sizeId = profile.sizes[0];
    }
    if (!profile.interiors.includes(designerState.interiorId)) {
      designerState.interiorId = profile.interiors[0];
    }
    designerState.machines = new Set(
      Array.from(designerState.machines).filter((id) => profile.machines.includes(id))
    );
    if (!designerState.machines.size) {
      designerState.machines.add("standard-kit");
    }
    designerState.decorations = new Set(
      Array.from(designerState.decorations).filter((id) => profile.decor.includes(id))
    );
  }
  enforceDesignerCapacities();
  updateDesignerOptions();
};

const loadRoomIntoDesigner = (room) => {
  const blueprint = getBlueprint(room.type);
  if (!blueprint) return;
  designerState.editingRoomId = room.id;
  designerState.sizeId = room.sizeId ?? blueprint.designProfile?.sizes?.[0] ?? ROOM_SIZE_LIBRARY[0].id;
  designerState.interiorId = room.interiorId ?? blueprint.designProfile?.interiors?.[0] ?? ROOM_INTERIOR_LIBRARY[0].id;
  designerState.machines = new Set(room.machines?.length ? room.machines : blueprint.designProfile?.defaultMachines ?? ["standard-kit"]);
  if (!designerState.machines.size) {
    designerState.machines.add("standard-kit");
  }
  designerState.decorations = new Set(room.decorations ?? []);
  selectedRoom = blueprint;
  setDesignerBlueprint(blueprint, { resetSelections: false, editing: true });
  highlightBuildSelection(blueprint.id);
  updateBuildGuidance();
  renderRoomManagement();
  setActiveInteriorRoom(room.id);
  renderBuildMenuStructure();
  renderBuildMenuInteriors();
  updateBuildTabStates();
};

const canPlaceFootprint = (x, y, width, height, ignoreRoom = null) => {
  if (x + width > getGridWidth() || y + height > getGridHeight()) return false;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (!isTileUnlocked(x + dx, y + dy)) {
        return false;
      }
      const occupant = state.grid[y + dy][x + dx];
      if (occupant && (!ignoreRoom || occupant.id !== ignoreRoom.id)) {
        return false;
      }
    }
  }
  return true;
};

const clearRoomFootprint = (room, width = room.width, height = room.height) => {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (state.grid[room.y + dy] && state.grid[room.y + dy][room.x + dx] === room) {
        state.grid[room.y + dy][room.x + dx] = null;
      }
    }
  }
};

const occupyRoomFootprint = (room) => {
  for (let dy = 0; dy < room.height; dy++) {
    for (let dx = 0; dx < room.width; dx++) {
      if (state.grid[room.y + dy]) {
        state.grid[room.y + dy][room.x + dx] = room;
      }
    }
  }
};

const hasPlacementForSize = (width, height, ignoreRoom = null) => {
  for (let y = 0; y <= getGridHeight() - height; y++) {
    for (let x = 0; x <= getGridWidth() - width; x++) {
      if (canPlaceFootprint(x, y, width, height, ignoreRoom)) {
        return true;
      }
    }
  }
  return false;
};

const recalculateAmbience = () => {
  const totals = state.rooms.reduce(
    (acc, room) => {
      acc.environment += room.environmentBoost ?? 0;
      acc.welfare += room.welfareBoost ?? 0;
      acc.morale += room.moraleBoost ?? 0;
      acc.reputation += room.reputationBoost ?? 0;
      return acc;
    },
    { environment: 0, welfare: 0, morale: 0, reputation: 0 }
  );
  state.ambience = totals;
  const snackComfort = getTotalAmenityCount("snack") * 0.5 + getTotalAmenityCount("hydration") * 0.4;
  const groundsPenalty = Math.max(0, (100 - state.stats.grounds) / 12 + (state.litter ?? 0) * 0.5);
  const plantBonus = (state.stats.plantCare - 70) / 10 + getTotalPlants() * 0.1;
  state.stats.environmentScore = clamp(55 + totals.environment * 6 + plantBonus - groundsPenalty, 0, 100);
  state.stats.welfareScore = clamp(55 + totals.welfare * 6 + snackComfort - groundsPenalty * 0.5, 0, 100);
};

const renderRoomManagement = () => {
  if (!elements.builtRooms) return;
  elements.builtRooms.innerHTML = "";
  if (!state.rooms.length) {
    const empty = document.createElement("li");
    empty.textContent = "No rooms constructed yet.";
    elements.builtRooms.appendChild(empty);
    return;
  }
  state.rooms.forEach((room) => {
    const blueprint = getBlueprint(room.type);
    const theme = getInteriorTheme(room.interiorId);
    const li = document.createElement("li");
    if (designerState.editingRoomId === room.id) {
      li.classList.add("active");
    }
    const header = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = blueprint?.name ?? room.type;
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit layout";
    editButton.addEventListener("click", () => loadRoomIntoDesigner(room));
    header.append(title, editButton);
    li.appendChild(header);

    const meta = document.createElement("div");
    meta.className = "built-room-meta";
    const sizeSpan = document.createElement("span");
    sizeSpan.textContent = `${room.width}×${room.height}`;
    const themeSpan = document.createElement("span");
    themeSpan.textContent = theme.label;
    const costSpan = document.createElement("span");
    costSpan.textContent = `Cost ¤${formatCurrency(room.costInvested ?? blueprint?.cost ?? 0)}`;
    const upkeepSpan = document.createElement("span");
    upkeepSpan.textContent = `Upkeep ¤${formatCurrency(room.upkeep ?? blueprint?.upkeep ?? 0)}`;
    const machinesSpan = document.createElement("span");
    machinesSpan.textContent = `Equipment ${room.machines?.length ?? 0}`;
    const decorSpan = document.createElement("span");
    decorSpan.textContent = `Decor ${room.decorations?.length ?? 0}`;
    meta.append(sizeSpan, themeSpan, costSpan, upkeepSpan, machinesSpan, decorSpan);
    li.appendChild(meta);

    const effects = document.createElement("div");
    effects.className = "built-room-effects";
    if (room.severityCapacity) {
      const severityTag = document.createElement("span");
      severityTag.textContent = `Severity ${room.severityCapacity}`;
      effects.appendChild(severityTag);
    }
    if (room.environmentBoost) {
      const envTag = document.createElement("span");
      envTag.textContent = `Env +${room.environmentBoost.toFixed(1)}`;
      effects.appendChild(envTag);
    }
    if (room.welfareBoost) {
      const welfareTag = document.createElement("span");
      welfareTag.textContent = `Welfare +${room.welfareBoost.toFixed(1)}`;
      effects.appendChild(welfareTag);
    }
    if (room.moraleBoost) {
      const moraleTag = document.createElement("span");
      moraleTag.textContent = `Morale +${room.moraleBoost.toFixed(1)}`;
      effects.appendChild(moraleTag);
    }
    if (room.reputationBoost) {
      const repTag = document.createElement("span");
      repTag.textContent = `Rep +${room.reputationBoost.toFixed(1)}`;
      effects.appendChild(repTag);
    }
    if (effects.children.length) {
      li.appendChild(effects);
    }

    const decorDefs = (room.decorations ?? []).map(getDecorationDefinition);
    const amenityDefs = decorDefs.filter((def) => def?.amenityType);
    if (amenityDefs.length) {
      const amenities = document.createElement("div");
      amenities.className = "built-room-amenities";
      [...new Set(amenityDefs.map((def) => def.amenityLabel ?? def.label))].forEach((label) => {
        const badge = document.createElement("span");
        badge.textContent = label;
        amenities.appendChild(badge);
      });
      li.appendChild(amenities);
    }
    const plantCount = decorDefs.filter((def) => def?.isPlant).length;
    if (plantCount) {
      const plants = document.createElement("div");
      plants.className = "built-room-amenities plant";
      const badge = document.createElement("span");
      badge.textContent = `${plantCount} plant${plantCount > 1 ? "s" : ""}`;
      plants.appendChild(badge);
      li.appendChild(plants);
    }

    elements.builtRooms.appendChild(li);
  });
};

const applyDesignToRoom = () => {
  if (!designerState.editingRoomId) return;
  const room = getRoomById(designerState.editingRoomId);
  if (!room) return;
  const blueprint = getBlueprint(room.type);
  if (!blueprint) return;
  const machines = Array.from(designerState.machines);
  if (!machines.length) {
    machines.push("standard-kit");
  }
  const decorations = Array.from(designerState.decorations);
  const layoutOverride = getSizeOption(designerState.sizeId);
  const preview = summarizeRoomDesign({
    blueprint,
    sizeId: designerState.sizeId,
    layoutOverride,
    interiorId: designerState.interiorId,
    machines,
    decorations,
  });

  const newWidth = preview.sizeOption.width;
  const newHeight = preview.sizeOption.height;
  if (!canPlaceFootprint(room.x, room.y, newWidth, newHeight, room)) {
    logEvent("Not enough free space around this room to apply the new layout.", "negative");
    return;
  }

  const previousCost = room.costInvested ?? Math.round(room.baseCost ?? blueprint.cost);
  const delta = preview.totalCost - previousCost;
  if (delta > 0 && state.stats.cash < delta) {
    logEvent(
      `Upgrading ${blueprint.name} requires ¤${formatCurrency(delta)} more funds.`,
      "negative"
    );
    return;
  }

  const oldWidth = room.width;
  const oldHeight = room.height;
  const previousReputationBoost = room.reputationBoost ?? 0;
  clearRoomFootprint(room, oldWidth, oldHeight);
  room.width = newWidth;
  room.height = newHeight;
  room.sizeId = preview.sizeOption.id;
  room.interiorId = designerState.interiorId;
  room.machines = machines;
  room.decorations = decorations;
  room.costInvested = preview.totalCost;
  room.upkeep = preview.upkeep;
  room.severityBoost = preview.severityBoost;
  room.builtAt = state.stats?.tick ?? 0;
  room.environmentBoost = preview.environmentBoost;
  room.welfareBoost = preview.welfareBoost;
  room.moraleBoost = preview.moraleBoost;
  room.reputationBoost = preview.reputationBoost;
  room.severityCapacity = Math.max(0, Math.round((blueprint.baseSeverity ?? 0) + preview.severityBoost));
  room.roleRequired = blueprint.roleRequired;
  occupyRoomFootprint(room);

  state.stats.reputation = clamp(
    state.stats.reputation + (preview.reputationBoost - previousReputationBoost),
    0,
    100
  );

  if (delta > 0) {
    state.stats.cash -= delta;
    state.stats.expensesToday += delta;
    logEvent(`${blueprint.name} upgraded for ¤${formatCurrency(delta)}.`, "positive");
  } else if (delta < 0) {
    logEvent(`${blueprint.name} redesign applied with no extra spend.`, "positive");
  } else {
    logEvent(`${blueprint.name} design refreshed.`, "positive");
  }

  renderRoomManagement();
  updateGrid();
  renderHospitalCanvas();
  recalculateAmbience();
  updateDesignerSummary();
  updateStats();
  renderBuildMenuStructure();
  renderBuildMenuInteriors();
  updateBuildTabStates();
  updateBuildGuidance();
};

const setBuildMode = (active) => {
  if (elements.grid) {
    elements.grid.classList.toggle("is-building", active);
  }
  if (elements.hospitalCanvas) {
    elements.hospitalCanvas.classList.toggle("is-building", active);
  }
  if (elements.liveBuild?.overlay) {
    elements.liveBuild.overlay.classList.toggle("is-building", active);
  }
  if (elements.liveBuild?.footnote) {
    elements.liveBuild.footnote.classList.toggle("active", active);
  }
};

const updateBuildGuidance = () => {
  if (!elements.buildHint) return;
  if (buildPreviewState.active) {
    updateBuildPreviewHint();
    return;
  }
  if (isStructurePlacementActive()) {
    const room = getActiveInteriorRoom();
    if (!room) {
      setStructurePlacementMode("idle");
      return;
    }
    const blueprint = getBlueprint(room.type);
    const roomLabel = blueprint?.name ?? "Room";
    if (buildFlowState.mode === "placing-door") {
      elements.buildHint.textContent = `Install a door for ${roomLabel}. Click a front wall panel to set the entry.`;
      if (elements.liveBuild?.footnote) {
        elements.liveBuild.footnote.textContent = "Doors must sit on the open edge facing the hospital floor. Click to place or press Esc to cancel.";
      }
    } else if (buildFlowState.mode === "placing-window") {
      elements.buildHint.textContent = `Add windows to ${roomLabel}. Click any side wall panel to install one.`;
      if (elements.liveBuild?.footnote) {
        elements.liveBuild.footnote.textContent = "Place windows along the visible walls. Continue clicking to add more or press Esc to finish.";
      }
    }
    setBuildMode(true);
    clearBuildHover();
    return;
  }
  if (designerState.editingRoomId) {
    const room = getRoomById(designerState.editingRoomId);
    const blueprint = designerState.blueprint ?? (room ? getBlueprint(room.type) : null);
    const sizeLabel = getSizeOption(designerState.sizeId).label;
    elements.buildHint.textContent = `Editing ${blueprint?.name ?? "room"} – ${sizeLabel}. Adjust options then press "Apply design to room".`;
    if (elements.liveBuild?.footnote) {
      elements.liveBuild.footnote.textContent =
        "Design changes apply instantly in the live hospital. Press Apply when ready or Esc to cancel.";
    }
    setBuildMode(false);
    clearBuildHover();
    return;
  }

  const blueprint = selectedRoom ?? designerState.blueprint;
  setBuildMode(Boolean(blueprint));
  if (blueprint) {
    const size = getSizeOption(designerState.sizeId);
    const theme = getInteriorTheme(designerState.interiorId);
    let hint = `Building: ${blueprint.name} – ${size.label}, ${theme.label}. Click and drag to shape the footprint.`;
    let footnote = `Start at your desired corner, then drag to adjust the ${size.width}×${size.height} layout (or larger). Stay within owned land to confirm, then release to build or press Esc to cancel.`;
    if (!hasPlacementForSize(size.width, size.height)) {
      const availableParcel = state.properties.find((parcel) => !parcel.owned);
      const parcelPrompt = availableParcel
        ? `Purchase ${availableParcel.name} from Hospital Grounds to unlock more space.`
        : "Adjust or relocate an existing room to free up space.";
      hint = `No free ${size.width}×${size.height} area for ${blueprint.name}. ${parcelPrompt}`;
      footnote = `Expand the campus or clear space before placing ${blueprint.name}.`;
    }
    elements.buildHint.textContent = hint;
    if (elements.liveBuild?.footnote) {
      elements.liveBuild.footnote.textContent = footnote;
    }
  } else {
    elements.buildHint.textContent = "Select a room type above to begin construction.";
    if (elements.liveBuild?.footnote) {
      elements.liveBuild.footnote.textContent =
        "Pick a room blueprint to start building directly on the live hospital floor.";
    }
    clearBuildHover();
  }
};

const clearBuildSelection = () => {
  resetBuildPreview();
  clearBuildHover();
  selectedRoom = null;
  designerState.editingRoomId = null;
  designerState.blueprint = null;
  designerState.machines = new Set(["standard-kit"]);
  designerState.decorations = new Set();
  buildFlowState.mode = "idle";
  buildFlowState.activeRoomId = null;
  updateBuildGuidance();
  updateDesignerSummary();
  updateDesignerOptions();
  renderRoomManagement();
  highlightBuildSelection(null);
  const container = elements.buildMenuPanels?.rooms ?? elements.buildOptions;
  if (container) {
    container
      .querySelectorAll("[data-room]")
      .forEach((btn) => btn.classList.remove("selected"));
  }
};

const renderBlueprintAxes = () => {
  if (!elements.axisX || !elements.axisY) return;
  elements.axisX.innerHTML = "";
  elements.axisY.innerHTML = "";
  for (let x = 0; x < getGridWidth(); x++) {
    const span = document.createElement("span");
    span.textContent = AXIS_LETTERS[x] ?? String(x + 1);
    elements.axisX.appendChild(span);
  }
  for (let y = 0; y < getGridHeight(); y++) {
    const span = document.createElement("span");
    span.textContent = String(y + 1);
    elements.axisY.appendChild(span);
  }
};

const setupGrid = () => {
  if (!elements.grid) return;
  elements.grid.innerHTML = "";
  renderBlueprintAxes();
  for (let y = 0; y < getGridHeight(); y++) {
    for (let x = 0; x < getGridWidth(); x++) {
      const cell = document.createElement("button");
      cell.className = "grid-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.x = x;
      cell.dataset.y = y;
      const coordLabel = `${AXIS_LETTERS[x] ?? x + 1}${y + 1}`;
      cell.dataset.coord = coordLabel;
      cell.setAttribute("aria-label", `Plot ${coordLabel}`);
      cell.title = `Plot ${coordLabel}`;
      const parcel = getParcelAt(x, y);
      if (parcel) {
        cell.dataset.parcelId = parcel.id;
        cell.dataset.parcelName = parcel.name;
      }
      cell.addEventListener("pointerdown", (event) => handleGridPointerDown(event, x, y));
      cell.addEventListener("pointerenter", () => handleGridPointerEnter(x, y));
      cell.addEventListener("pointerup", (event) => handleGridPointerUp(event, x, y));
      cell.addEventListener("click", (event) => handleGridCellClick(event, x, y));
      elements.grid.appendChild(cell);
    }
  }
};

const updateGrid = () => {
  if (!elements.grid) return;
  const cells = elements.grid.querySelectorAll(".grid-cell");
  cells.forEach((cell) => {
    const tileX = Number(cell.dataset.x);
    const tileY = Number(cell.dataset.y);
    const room = state.grid[tileY][tileX];
    const coord = cell.dataset.coord;
    const parcel = getParcelAt(tileX, tileY);
    const unlocked = isTileUnlocked(tileX, tileY);
    cell.classList.toggle("locked", !unlocked);
    if (!unlocked) {
      cell.classList.remove("room");
      cell.dataset.label = "";
      cell.dataset.origin = "false";
      cell.dataset.size = "";
      cell.textContent = "";
      cell.disabled = true;
      cell.dataset.status = "locked";
      cell.dataset.parcelName = parcel?.name ?? "";
      const parcelLabel = parcel ? `${parcel.name} – locked` : "Unzoned land";
      cell.setAttribute("aria-label", `Plot ${coord} (${parcelLabel})`);
      return;
    }
    cell.disabled = false;
    cell.dataset.status = "";
    cell.dataset.parcelName = parcel?.name ?? "";
    if (room) {
      const blueprint = getBlueprint(room.type);
      const label = blueprint?.name ?? room.type;
      const isOrigin = tileX === room.x && tileY === room.y;
      cell.classList.add("room");
      cell.dataset.label = label;
      cell.dataset.origin = isOrigin ? "true" : "false";
      cell.dataset.size = `${room.width}x${room.height}`;
      cell.textContent = "";
      const theme = getInteriorTheme(room.interiorId);
      if (isOrigin) {
        cell.setAttribute(
          "aria-label",
          `Plot ${coord} – ${label} (${room.width}×${room.height}, ${theme.label})`
        );
      } else {
        cell.setAttribute("aria-label", `Plot ${coord} – ${label} footprint`);
      }
    } else {
      cell.classList.remove("room");
      cell.dataset.label = "";
      cell.dataset.origin = "false";
      cell.dataset.size = "";
      cell.textContent = "";
      cell.setAttribute("aria-label", `Plot ${coord} (empty)`);
    }
  });
  updateGridPreviewHighlight();
};

const updateGridPreviewHighlight = () => {
  if (elements.grid) {
    const cells = elements.grid.querySelectorAll(".grid-cell");
    cells.forEach((cell) => {
      const tileX = Number(cell.dataset.x);
      const tileY = Number(cell.dataset.y);
      const inPreview =
        buildPreviewState.active &&
        tileX >= buildPreviewState.x &&
        tileX < buildPreviewState.x + buildPreviewState.width &&
        tileY >= buildPreviewState.y &&
        tileY < buildPreviewState.y + buildPreviewState.height;
      const isOrigin =
        inPreview && tileX === buildPreviewState.x && tileY === buildPreviewState.y;
      cell.classList.toggle("preview", inPreview);
      cell.classList.toggle("preview-origin", isOrigin);
      cell.classList.toggle("preview-invalid", inPreview && !buildPreviewState.valid);
      if (!inPreview && !cell.dataset.label && cell.textContent) {
        cell.textContent = "";
      }
      if (isOrigin && !cell.dataset.label) {
        cell.textContent = `${buildPreviewState.width}×${buildPreviewState.height}`;
      }
      if (!inPreview && cell.classList.contains("preview")) {
        cell.classList.remove("preview", "preview-origin", "preview-invalid");
      }
    });
  }
  renderHospitalCanvas();
};

const updateBuildPreviewHint = () => {
  if (!elements.buildHint) return;
  if (!buildPreviewState.active) {
    return;
  }
  const blueprint = selectedRoom ?? designerState.blueprint;
  const name = blueprint?.name ?? "room";
  const dims = `${buildPreviewState.width}×${buildPreviewState.height}`;
  const status = buildPreviewState.valid ? "Release to confirm." : "Space blocked.";
  elements.buildHint.textContent = `Placing ${name}: ${dims}. ${status}`;
  if (elements.liveBuild?.footnote) {
    elements.liveBuild.footnote.textContent = buildPreviewState.valid
      ? `Drag to adjust the footprint. Release to build a ${dims} layout.`
      : `Drag to adjust the footprint. Clear space to place a ${dims} layout.`;
  }
};

const cancelBuildPreview = () => {
  if (!buildPreviewState.active) return false;
  const capture = buildPreviewState.captureElement;
  const pointerId = buildPreviewState.pointerId;
  if (capture && typeof capture.releasePointerCapture === "function" && pointerId !== null) {
    try {
      capture.releasePointerCapture(pointerId);
    } catch (error) {
      /* noop */
    }
  }
  resetBuildPreview();
  updateBuildGuidance();
  return true;
};

const beginBuildPreview = (pointerId, x, y, target) => {
  if (designerState.editingRoomId) {
    logEvent("Apply or cancel the current room edit before placing new rooms.", "warning");
    return false;
  }
  const blueprint = selectedRoom ?? designerState.blueprint;
  if (!blueprint) {
    return false;
  }
  clearBuildHover();
  buildPreviewState.active = true;
  buildPreviewState.pointerId = pointerId;
  buildPreviewState.captureElement = target ?? null;
  buildPreviewState.startX = x;
  buildPreviewState.startY = y;
  buildPreviewState.x = x;
  buildPreviewState.y = y;
  buildPreviewState.width = 1;
  buildPreviewState.height = 1;
  buildPreviewState.valid = canPlaceFootprint(x, y, 1, 1);
  updateGridPreviewHighlight();
  updateBuildPreviewHint();
  if (target && typeof target.setPointerCapture === "function" && pointerId !== null) {
    try {
      target.setPointerCapture(pointerId);
    } catch (error) {
      /* ignore pointer capture errors */
    }
  }
  return true;
};

const updateBuildPreviewBounds = (x, y) => {
  if (!buildPreviewState.active) return;
  const clampedX = clamp(x, 0, getGridWidth() - 1);
  const clampedY = clamp(y, 0, getGridHeight() - 1);
  const minX = Math.min(buildPreviewState.startX, clampedX);
  const minY = Math.min(buildPreviewState.startY, clampedY);
  const maxX = Math.max(buildPreviewState.startX, clampedX);
  const maxY = Math.max(buildPreviewState.startY, clampedY);
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  buildPreviewState.x = minX;
  buildPreviewState.y = minY;
  buildPreviewState.width = width;
  buildPreviewState.height = height;
  buildPreviewState.valid = canPlaceFootprint(minX, minY, width, height);
  updateGridPreviewHighlight();
  updateBuildPreviewHint();
};

const finalizeBuildPreview = (commit = true) => {
  if (!buildPreviewState.active) return;
  const placement = {
    x: buildPreviewState.x,
    y: buildPreviewState.y,
    width: buildPreviewState.width,
    height: buildPreviewState.height,
    valid: buildPreviewState.valid,
    pointerId: buildPreviewState.pointerId,
    capture: buildPreviewState.captureElement,
  };
  if (
    placement.capture &&
    typeof placement.capture.releasePointerCapture === "function" &&
    placement.pointerId !== null
  ) {
    try {
      placement.capture.releasePointerCapture(placement.pointerId);
    } catch (error) {
      /* ignore */
    }
  }
  resetBuildPreview();
  let placed = false;
  if (commit && placement.valid) {
    const layout = createCustomLayoutOption(placement.width, placement.height);
    placed = placeRoomAt(placement.x, placement.y, layout, { fromDrag: true });
  } else {
    if (commit && !placement.valid) {
      logEvent("That footprint overlaps restricted space. Adjust the drag to find a clear area.", "negative");
    }
    updateBuildGuidance();
  }
  if (placed) {
    buildPreviewState.justPlaced = true;
    window.setTimeout(() => {
      buildPreviewState.justPlaced = false;
    }, 0);
  }
};

const handleGridPointerDown = (event, x, y) => {
  if (event.button !== 0 && event.pointerType !== "touch") {
    return;
  }
  const began = beginBuildPreview(event.pointerId ?? null, x, y, event.currentTarget);
  if (began) {
    event.preventDefault();
  }
};

const handleGridPointerEnter = (x, y) => {
  if (!buildPreviewState.active) return;
  updateBuildPreviewBounds(x, y);
};

const handleGridPointerUp = (event, x, y) => {
  if (!buildPreviewState.active) return;
  updateBuildPreviewBounds(x, y);
  finalizeBuildPreview(true);
  event.preventDefault();
};

const handleGridPointerMove = (event) => {
  if (!buildPreviewState.active || !elements.grid) return;
  const rect = elements.grid.getBoundingClientRect();
  if (!rect || rect.width === 0 || rect.height === 0) return;
  const relX = event.clientX - rect.left;
  const relY = event.clientY - rect.top;
  if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) {
    return;
  }
  const gridX = clamp(Math.floor((relX / rect.width) * getGridWidth()), 0, getGridWidth() - 1);
  const gridY = clamp(Math.floor((relY / rect.height) * getGridHeight()), 0, getGridHeight() - 1);
  updateBuildPreviewBounds(gridX, gridY);
};

const handleGlobalPointerUp = (event) => {
  if (!buildPreviewState.active) return;
  if (buildPreviewState.pointerId === null || event.pointerId === buildPreviewState.pointerId) {
    finalizeBuildPreview(true);
  }
};

const handleGlobalPointerCancel = (event) => {
  if (!buildPreviewState.active) return;
  if (buildPreviewState.pointerId === null || event.pointerId === buildPreviewState.pointerId) {
    cancelBuildPreview();
  }
};

const handleGridCellClick = (event, x, y) => {
  if (buildPreviewState.justPlaced) {
    buildPreviewState.justPlaced = false;
    event.preventDefault();
    return;
  }
  if (event.detail === 0) {
    handleBuildClick(x, y);
  } else if (!buildPreviewState.active) {
    handleBuildClick(x, y);
  }
};

const setupCanvas = () => {
  if (!elements.hospitalCanvas) return;
  const canvas = elements.hospitalCanvas;
  const width = getGridWidth() * CANVAS_CELL;
  const height = getGridHeight() * CANVAS_CELL;
  const scale = window.devicePixelRatio || 1;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  canvas.style.maxWidth = `${width}px`;
  hospitalCtx = canvas.getContext("2d");
  hospitalCtx.setTransform(1, 0, 0, 1, 0, 0);
  hospitalCtx.scale(scale, scale);
  canvas.dataset.viewMode = viewMode;
  if (!canvas.dataset.zoomBound) {
    canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
    canvas.addEventListener("dblclick", handleCanvasDoubleClick);
    canvas.addEventListener("pointerdown", handleCanvasPointerDown);
    canvas.addEventListener("pointermove", handleCanvasPointerMove);
    canvas.addEventListener("pointerup", handleCanvasPointerUp);
    canvas.addEventListener("pointercancel", handleCanvasPointerCancel);
    canvas.addEventListener("pointerleave", handleCanvasPointerLeave);
    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
    canvas.dataset.zoomBound = "true";
  }
  invalidateCanvasCache();
  updateShowcaseZoomIndicator();
};

const HUMAN_SKIN_TONES = ["#f1d4c1", "#e5b89a", "#cb916d", "#a76b47", "#7f4c2c", "#533321"];
const HUMAN_HAIR_TONES = ["#2b1f19", "#3b2c1e", "#4f3824", "#6d4b2d", "#8a623a", "#b98a58", "#d8b591", "#1f2937"];
const HUMAN_BASE_BODY_HEIGHT = 18;
const HUMAN_BASE_BODY_WIDTH = 10;

const deriveAvatarPalette = (seed, baseColor) => {
  const skin = HUMAN_SKIN_TONES[seed % HUMAN_SKIN_TONES.length];
  const hair = HUMAN_HAIR_TONES[(seed >> 3) % HUMAN_HAIR_TONES.length];
  const toneShift = ((seed % 7) - 3) * 0.04;
  const outfit = shiftColor(baseColor, toneShift);
  const shadow = shiftColor(outfit, -0.45);
  const accent = shiftColor(outfit, 0.35);
  const highlight = shiftColor(outfit, 0.2);
  const mid = shiftColor(outfit, -0.12);
  const trim = shiftColor(baseColor, 0.45);
  const fabricLight = shiftColor(outfit, 0.32);
  const fabricDark = shiftColor(outfit, -0.42);
  const shoe = shiftColor(baseColor, -0.6);
  const hairShine = shiftColor(hair, 0.22);
  return {
    skin,
    hair,
    hairShine,
    outfit,
    mid,
    highlight,
    accent,
    trim,
    shadow,
    fabricLight,
    fabricDark,
    shoe,
  };
};

const WALK_CYCLE_DISTANCE = 0.9;
const WALK_DECAY_RATE = 2.4;

const ensureAgentMotion = (agent) => {
  if (!agent) return null;
  if (!agent.motion) {
    agent.motion = {
      phase: Math.random() * Math.PI * 2,
      idlePhase: Math.random() * Math.PI * 2,
      intensity: 0,
      bob: 0,
      heading: 0,
      speed: 0,
    };
  }
  return agent.motion;
};

const updateAgentMotion = (agent, movement = 0, deltaSeconds = 1, headingX = 0, headingY = 0) => {
  const motion = ensureAgentMotion(agent);
  if (!motion) return null;
  const delta = Math.max(0.0001, deltaSeconds);
  const distance = Math.max(0, movement);
  if (distance > 0) {
    motion.phase = (motion.phase + (distance / WALK_CYCLE_DISTANCE) * Math.PI * 2) % (Math.PI * 2);
    motion.intensity = Math.min(1, motion.intensity + distance * 1.6);
    motion.speed = distance / delta;
    if (headingX !== 0 || headingY !== 0) {
      motion.heading = Math.atan2(headingY, headingX);
    }
  } else {
    motion.intensity = Math.max(0, motion.intensity - delta * WALK_DECAY_RATE);
    motion.speed = 0;
  }
  motion.idlePhase = (motion.idlePhase + delta * (0.7 + motion.intensity * 0.8)) % (Math.PI * 2);
  const walkBob = Math.sin(motion.phase * 2) * 2.6 * motion.intensity;
  const idleBob = Math.sin(motion.idlePhase) * (1 - motion.intensity) * 1.2;
  motion.bob = walkBob + idleBob;
  return motion;
};

const derivePoseFromMotion = (motion = {}) => {
  const intensity = Math.min(1, motion.intensity ?? 0);
  const phase = motion.phase ?? 0;
  const idlePhase = motion.idlePhase ?? 0;
  const stride = Math.sin(phase) * intensity;
  const counterStride = Math.sin(phase + Math.PI) * intensity;
  const arm = Math.sin(phase + Math.PI / 2) * intensity;
  const counterArm = Math.sin(phase - Math.PI / 2) * intensity;
  const idleSwing = Math.sin(idlePhase) * (1 - intensity) * 0.3;
  const lean = Math.cos(phase) * intensity * 0.2 + Math.sin(idlePhase * 0.5) * (1 - intensity) * 0.08;
  const headTilt = Math.sin(phase * 1.5) * intensity * 0.12 + Math.sin(idlePhase * 0.8) * (1 - intensity) * 0.12;
  return {
    frontLeg: stride + idleSwing * 0.6,
    backLeg: counterStride - idleSwing * 0.6,
    frontArm: -counterArm - idleSwing,
    backArm: -arm + idleSwing,
    bob: motion.bob ?? 0,
    lean,
    headTilt,
  };
};

const getAgentPose = (agent) => derivePoseFromMotion(agent?.motion);

const drawHumanFigure = (ctx, palette, { scale = 1, pose = {}, detail = {} } = {}) => {
  const bodyHeight = HUMAN_BASE_BODY_HEIGHT * scale;
  const bodyWidth = HUMAN_BASE_BODY_WIDTH * scale;
  const headRadius = 4 * scale;
  const {
    frontLeg = 0,
    backLeg = 0,
    frontArm = 0,
    backArm = 0,
    bob = 0,
    lean = 0,
    headTilt = 0,
  } = pose;
  const {
    type = "patient",
    role = null,
    emergency = false,
    trimColor: detailTrim,
    shoeColor: detailShoe,
    beltColor: detailBelt,
  } = detail;
  const legLength = bodyHeight * 0.55;
  const legWidth = bodyWidth * 0.28;
  const armLength = bodyHeight * 0.48;
  const armWidth = bodyWidth * 0.22;
  const shoulderY = bodyHeight * 0.22;
  const hipY = bodyHeight * 0.58;
  const accentWidth = bodyWidth * 0.52;
  const fabricAccent = palette.fabricLight ?? shiftColor(palette.outfit, 0.28);
  const fabricShadow = palette.fabricDark ?? shiftColor(palette.outfit, -0.36);
  const trimColor =
    detailTrim ?? (type === "staff" ? palette.accent : palette.highlight ?? fabricAccent);
  const beltColor = detailBelt ?? shiftColor(palette.mid ?? palette.outfit, -0.28);
  const shoeColor = detailShoe ?? palette.shoe ?? shiftColor(palette.shadow, -0.05);
  const sleeveColor = palette.mid ?? shiftColor(palette.outfit, -0.08);
  const cuffColor = shiftColor(trimColor, -0.2);

  const applyFabricTexture = (x, y, width, height, radius, spacing = 3.6 * scale, alpha = 0.14) => {
    ctx.save();
    ctx.translate(x, y);
    drawRoundedRect(ctx, 0, 0, width, height, radius);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = withAlpha(fabricAccent, 0.6);
    for (let offset = -height; offset < height * 2; offset += spacing) {
      ctx.beginPath();
      ctx.moveTo(-width, offset);
      ctx.lineTo(width * 2, offset + spacing * 0.5);
      ctx.lineTo(width * 2, offset + spacing);
      ctx.lineTo(-width, offset + spacing * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  ctx.save();
  const strideSpan = Math.abs(frontLeg - backLeg);
  ctx.fillStyle = withAlpha(palette.shadow, 0.48 + strideSpan * 0.12);
  ctx.beginPath();
  ctx.ellipse(0, 3.2 * scale, bodyWidth * (0.62 + strideSpan * 0.14), 2.9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -bodyHeight + bob * scale);

  const drawLeg = (offset, swing, depth = 0) => {
    ctx.save();
    ctx.translate(offset, hipY);
    ctx.rotate(swing * 0.45);
    const gradient = ctx.createLinearGradient(0, 0, 0, legLength);
    gradient.addColorStop(0, shiftColor(palette.mid ?? palette.outfit, depth ? -0.25 : 0.08));
    gradient.addColorStop(0.6, palette.outfit);
    gradient.addColorStop(1, shiftColor(fabricShadow, depth ? -0.1 : -0.02));
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, -legWidth / 2, 0, legWidth, legLength, legWidth * 0.5);
    ctx.fill();
    applyFabricTexture(
      -legWidth / 2,
      0,
      legWidth,
      legLength,
      legWidth * 0.5,
      3.2 * scale,
      depth ? 0.08 : 0.15
    );
    ctx.strokeStyle = withAlpha(palette.shadow, depth ? 0.35 : 0.28);
    ctx.lineWidth = 0.6 * scale;
    drawRoundedRect(ctx, -legWidth / 2, 0, legWidth, legLength, legWidth * 0.5);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(trimColor, depth ? 0.18 : 0.28);
    ctx.lineWidth = 0.5 * scale;
    ctx.beginPath();
    const knee = legLength * 0.55;
    ctx.moveTo(0, knee - 0.4 * scale);
    ctx.quadraticCurveTo(legWidth * 0.24, knee + 1.1 * scale, 0, knee + 2 * scale);
    ctx.stroke();
    const footLength = legWidth * 1.6;
    const footHeight = 2.4 * scale;
    const footGradient = ctx.createLinearGradient(
      -footLength,
      legLength + footHeight * 0.2,
      footLength,
      legLength + footHeight * 0.8
    );
    footGradient.addColorStop(0, shiftColor(shoeColor, 0.12));
    footGradient.addColorStop(0.6, shoeColor);
    footGradient.addColorStop(1, shiftColor(shoeColor, -0.32));
    ctx.fillStyle = footGradient;
    ctx.beginPath();
    ctx.ellipse(0, legLength + footHeight, footLength, footHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(palette.shadow, 0.35);
    ctx.lineWidth = 0.5 * scale;
    ctx.stroke();
    ctx.restore();
  };

  const drawArm = (offset, swing, depth = 0) => {
    ctx.save();
    ctx.translate(offset, shoulderY);
    ctx.rotate(swing * 0.5);
    const gradient = ctx.createLinearGradient(0, 0, 0, armLength);
    gradient.addColorStop(0, shiftColor(sleeveColor, depth ? -0.15 : 0.12));
    gradient.addColorStop(0.7, sleeveColor);
    gradient.addColorStop(1, shiftColor(sleeveColor, -0.22));
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, -armWidth / 2, 0, armWidth, armLength, armWidth * 0.65);
    ctx.fill();
    applyFabricTexture(
      -armWidth / 2,
      0,
      armWidth,
      armLength,
      armWidth * 0.6,
      3 * scale,
      depth ? 0.06 : 0.12
    );
    ctx.fillStyle = cuffColor;
    drawRoundedRect(
      ctx,
      -armWidth / 2,
      armLength - armWidth * 0.35,
      armWidth,
      armWidth * 0.35,
      armWidth * 0.45
    );
    ctx.fill();
    const handRadius = armWidth * 0.55;
    const handGradient = ctx.createRadialGradient(0, armLength + handRadius * 0.4, handRadius * 0.4, 0, armLength + handRadius * 0.4, handRadius);
    handGradient.addColorStop(0, shiftColor(palette.skin, 0.08));
    handGradient.addColorStop(1, shiftColor(palette.skin, -0.12));
    ctx.fillStyle = handGradient;
    ctx.beginPath();
    ctx.arc(0, armLength + armWidth * 0.2, handRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(shiftColor(palette.skin, -0.28), 0.35);
    ctx.lineWidth = 0.4 * scale;
    ctx.stroke();
    ctx.restore();
  };

  // Back limbs first for layering
  drawLeg(-bodyWidth * 0.22, backLeg, 1);
  drawArm(-bodyWidth * 0.55, backArm, 1);

  ctx.save();
  ctx.translate(0, shoulderY);
  ctx.rotate(lean * 0.15);
  ctx.translate(0, -shoulderY);

  const torsoGradient = ctx.createLinearGradient(-bodyWidth / 2, 0, bodyWidth / 2, bodyHeight);
  torsoGradient.addColorStop(0, shiftColor(palette.highlight ?? palette.outfit, 0.12));
  torsoGradient.addColorStop(0.45, palette.outfit);
  torsoGradient.addColorStop(1, shiftColor(fabricShadow, -0.05));
  ctx.fillStyle = torsoGradient;
  drawRoundedRect(ctx, -bodyWidth / 2, 0, bodyWidth, bodyHeight, 4.5 * scale);
  ctx.fill();
  applyFabricTexture(-bodyWidth / 2, 0, bodyWidth, bodyHeight, 4.5 * scale, 4.2 * scale, 0.12);

  const sheen = ctx.createLinearGradient(-bodyWidth / 2, 0, bodyWidth / 2, 0);
  sheen.addColorStop(0, withAlpha(trimColor, 0.08));
  sheen.addColorStop(0.5, withAlpha(trimColor, 0.24));
  sheen.addColorStop(1, withAlpha(trimColor, 0.08));
  ctx.fillStyle = sheen;
  drawRoundedRect(ctx, -bodyWidth / 2, 0, bodyWidth, bodyHeight, 4.5 * scale);
  ctx.fill();

  const accentGradient = ctx.createLinearGradient(
    -accentWidth / 2,
    bodyHeight * 0.28,
    accentWidth / 2,
    bodyHeight * 0.28
  );
  accentGradient.addColorStop(0, shiftColor(trimColor, 0.2));
  accentGradient.addColorStop(1, shiftColor(trimColor, -0.18));
  ctx.fillStyle = accentGradient;
  drawRoundedRect(ctx, -accentWidth / 2, bodyHeight * 0.36, accentWidth, bodyHeight * 0.18, 2.5 * scale);
  ctx.fill();

  ctx.fillStyle = beltColor;
  drawRoundedRect(
    ctx,
    -bodyWidth / 2 + 1.2 * scale,
    bodyHeight * 0.54,
    bodyWidth - 2.4 * scale,
    bodyHeight * 0.12,
    1.6 * scale
  );
  ctx.fill();
  ctx.fillStyle = shiftColor(beltColor, 0.18);
  ctx.fillRect(-bodyWidth * 0.08, bodyHeight * 0.56, bodyWidth * 0.16, bodyHeight * 0.04);

  if (type === "staff") {
    ctx.save();
    ctx.translate(bodyWidth * 0.18, bodyHeight * 0.32);
    drawRoundedRect(ctx, -3.5 * scale, -2 * scale, 7 * scale, 10 * scale, 1.8 * scale);
    ctx.fillStyle = "rgba(248, 250, 252, 0.92)";
    ctx.fill();
    ctx.fillStyle = withAlpha(trimColor, 0.65);
    ctx.fillRect(-2.4 * scale, -0.4 * scale, 4.8 * scale, 1.2 * scale);
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.fillRect(-2.4 * scale, 1.8 * scale, 4.8 * scale, 0.8 * scale);
    ctx.restore();
  }

  if (
    type === "staff" &&
    ["doctor", "surgeon", "dentist", "midwife"].includes(role ?? "")
  ) {
    ctx.save();
    ctx.translate(0, shoulderY * 0.2);
    ctx.strokeStyle = withAlpha("#d1d5db", 0.9);
    ctx.lineWidth = 1.1 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, headRadius * 1.15, Math.PI * 0.25, Math.PI * 0.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-headRadius * 0.8, headRadius * 0.6);
    ctx.lineTo(-headRadius * 0.8, headRadius * 0.95);
    ctx.stroke();
    ctx.fillStyle = withAlpha("#111827", 0.82);
    ctx.beginPath();
    ctx.arc(-headRadius * 0.8, headRadius * 1.02, 1.6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha("#d1d5db", 0.9);
    ctx.lineWidth = 0.8 * scale;
    ctx.stroke();
    ctx.restore();
  }

  if (type === "patient" && emergency) {
    ctx.save();
    ctx.translate(bodyWidth * 0.32, bodyHeight * 0.3);
    ctx.rotate(lean * 0.05);
    ctx.fillStyle = "rgba(248, 113, 113, 0.72)";
    ctx.fillRect(-1.6 * scale, -0.4 * scale, 3.2 * scale, 1.6 * scale);
    ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
    ctx.fillRect(-1.6 * scale, 0.2 * scale, 3.2 * scale, 0.4 * scale);
    ctx.restore();
  }

  ctx.strokeStyle = withAlpha(palette.shadow, 0.32);
  ctx.lineWidth = 0.6 * scale;
  drawRoundedRect(ctx, -bodyWidth / 2, 0, bodyWidth, bodyHeight, 4.5 * scale);
  ctx.stroke();
  ctx.restore();

  drawLeg(bodyWidth * 0.22, frontLeg, 0);
  drawArm(bodyWidth * 0.55, frontArm, 0);

  ctx.save();
  ctx.translate(0, -headRadius * 0.6);
  ctx.rotate(headTilt * 0.2);
  const faceGradient = ctx.createLinearGradient(-headRadius, -headRadius, headRadius, headRadius);
  faceGradient.addColorStop(0, withAlpha(shiftColor(palette.skin, 0.08), 0.96));
  faceGradient.addColorStop(1, withAlpha(shiftColor(palette.skin, -0.12), 0.98));
  ctx.fillStyle = faceGradient;
  ctx.beginPath();
  ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shiftColor(palette.skin, -0.08);
  ctx.beginPath();
  ctx.ellipse(-headRadius * 0.82, headRadius * 0.02, headRadius * 0.18, headRadius * 0.28, 0, 0, Math.PI * 2);
  ctx.ellipse(headRadius * 0.82, headRadius * 0.02, headRadius * 0.18, headRadius * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  const hairGradient = ctx.createLinearGradient(-headRadius, -headRadius, headRadius, headRadius);
  hairGradient.addColorStop(0, shiftColor(palette.hair, -0.1));
  hairGradient.addColorStop(0.5, palette.hair);
  hairGradient.addColorStop(1, palette.hairShine ?? shiftColor(palette.hair, 0.2));
  ctx.fillStyle = hairGradient;
  ctx.beginPath();
  ctx.arc(0, -headRadius * 0.38, headRadius * 1.12, Math.PI * 1.12, Math.PI * 1.88);
  ctx.quadraticCurveTo(headRadius * 0.95, headRadius * 0.26, 0, headRadius * 0.14);
  ctx.quadraticCurveTo(-headRadius * 0.95, headRadius * 0.26, -headRadius * 1.08, -headRadius * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha(shiftColor(palette.hair, -0.2), 0.5);
  ctx.lineWidth = 0.7 * scale;
  ctx.stroke();
  ctx.fillStyle = withAlpha(palette.hairShine ?? shiftColor(palette.hair, 0.3), 0.2);
  ctx.beginPath();
  ctx.ellipse(-headRadius * 0.2, -headRadius * 0.55, headRadius * 0.5, headRadius * 0.28, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
  ctx.beginPath();
  ctx.arc(-headRadius * 0.38, -headRadius * 0.12, headRadius * 0.18, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.38, -headRadius * 0.12, headRadius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.beginPath();
  ctx.arc(-headRadius * 0.32, -headRadius * 0.1, headRadius * 0.1, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.32, -headRadius * 0.1, headRadius * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(248, 250, 252, 0.9)";
  ctx.beginPath();
  ctx.arc(-headRadius * 0.26, -headRadius * 0.16, headRadius * 0.04, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.26, -headRadius * 0.16, headRadius * 0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = withAlpha(shiftColor(palette.hair, -0.15), 0.6);
  ctx.lineWidth = 0.5 * scale;
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.48, -headRadius * 0.32);
  ctx.quadraticCurveTo(-headRadius * 0.2, -headRadius * 0.22, -headRadius * 0.02, -headRadius * 0.26);
  ctx.moveTo(headRadius * 0.48, -headRadius * 0.32);
  ctx.quadraticCurveTo(headRadius * 0.2, -headRadius * 0.22, headRadius * 0.02, -headRadius * 0.26);
  ctx.stroke();

  ctx.fillStyle = withAlpha("#fda4af", 0.25);
  ctx.beginPath();
  ctx.arc(-headRadius * 0.48, headRadius * 0.28, headRadius * 0.24, 0, Math.PI * 2);
  ctx.arc(headRadius * 0.48, headRadius * 0.28, headRadius * 0.24, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = withAlpha(shiftColor(palette.skin, -0.2), 0.55);
  ctx.lineWidth = 0.45 * scale;
  ctx.beginPath();
  ctx.moveTo(0, headRadius * 0.05);
  ctx.quadraticCurveTo(headRadius * 0.12, headRadius * 0.34, 0, headRadius * 0.5);
  ctx.stroke();

  ctx.strokeStyle = withAlpha("#be123c", 0.4);
  ctx.lineWidth = 0.6 * scale;
  ctx.beginPath();
  ctx.moveTo(-headRadius * 0.4, headRadius * 0.32);
  ctx.quadraticCurveTo(0, headRadius * 0.42, headRadius * 0.4, headRadius * 0.26);
  ctx.stroke();

  ctx.restore();
  ctx.restore();
};

const drawMiniAvatar = (ctx, palette, { emergency = false } = {}) => {
  const scale = 0.65;
  const bodyWidth = HUMAN_BASE_BODY_WIDTH * scale;
  ctx.save();
  ctx.translate(0, -6);
  drawHumanFigure(ctx, palette, { scale, detail: { type: "patient", emergency } });
  ctx.restore();
  if (emergency) {
    ctx.save();
    ctx.translate(bodyWidth * 0.55, -18);
    ctx.fillStyle = "rgba(239, 68, 68, 0.92)";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(248, 250, 252, 0.95)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-1.8, 0);
    ctx.lineTo(1.8, 0);
    ctx.moveTo(0, -1.8);
    ctx.lineTo(0, 1.8);
    ctx.stroke();
    ctx.restore();
  }
};

const getPatientAvatarPalette = (patient) => {
  const baseColor = patient.profile?.color ?? "#38bdf8";
  const seed = hashString(`${patient.id}-${patient.name}-${patient.profile?.id ?? ""}`);
  return deriveAvatarPalette(seed, baseColor);
};

const getStaffAvatarPalette = (agent) => {
  const baseColor = STAFF_ROLE_COLORS[agent.staff?.role] ?? "#94a3b8";
  const identifier = `${agent.staff?.id ?? agent.id}-${agent.staff?.name ?? ""}`;
  const seed = hashString(identifier);
  return deriveAvatarPalette(seed, baseColor);
};

const drawPatientQueue = (ctx) => {
  const baseY = getGridHeight() * CANVAS_CELL - 26;
  const startX = 36;
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.6)";
  ctx.shadowBlur = 12;
  drawRoundedRect(ctx, startX - 24, baseY - 42, 480, 52, 18);
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.fillText("Patient Queue", startX - 12, baseY - 18);
  state.queue.slice(0, 10).forEach((patient, index) => {
    const px = startX + index * 44;
    const palette = getPatientAvatarPalette(patient);
    ctx.save();
    drawRoundedRect(ctx, px - 18, baseY - 18, 36, 36, 14);
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.fill();
    const frameGradient = ctx.createLinearGradient(px - 16, baseY - 16, px + 16, baseY + 16);
    frameGradient.addColorStop(0, withAlpha(palette.outfit, 0.25));
    frameGradient.addColorStop(1, withAlpha(palette.accent, 0.2));
    ctx.fillStyle = frameGradient;
    drawRoundedRect(ctx, px - 14, baseY - 14, 28, 28, 12);
    ctx.fill();
    ctx.save();
    ctx.translate(px, baseY + 6);
    drawMiniAvatar(ctx, palette, { emergency: patient.isEmergency });
    ctx.restore();
    ctx.restore();
  });
  ctx.restore();
};

const drawMoodGlow = (ctx, status) => {
  const palette = {
    hopeful: "rgba(59, 130, 246, 0.35)",
    urgent: "rgba(248, 113, 113, 0.45)",
    upset: "rgba(248, 113, 113, 0.55)",
    relieved: "rgba(74, 222, 128, 0.35)",
    calm: "rgba(148, 163, 184, 0.25)",
    anxious: "rgba(248, 113, 113, 0.45)",
    uneasy: "rgba(250, 204, 21, 0.35)",
    frail: "rgba(248, 113, 113, 0.55)",
    restless: "rgba(96, 165, 250, 0.35)",
    bored: "rgba(148, 163, 184, 0.18)",
  };
  const tone = palette[status] ?? palette.calm;
  ctx.save();
  const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
  gradient.addColorStop(0, tone);
  gradient.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(-20, -20, 40, 40);
  ctx.restore();
};

const drawPatientAgentsBlueprint = (ctx) => {
  ctx.save();
  ctx.globalAlpha = 0.9;
  state.patientsOnSite.forEach((patient) => {
    if (!patient.position) return;
    const px = patient.position.x * CANVAS_CELL;
    const py = patient.position.y * CANVAS_CELL;
    ctx.save();
    ctx.translate(px, py);
    if (patient.id === selectedPatientId) {
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawMoodGlow(ctx, patient.mood ?? patient.status);
    const palette = getPatientAvatarPalette(patient);
    const motion = ensureAgentMotion(patient);
    const pose = derivePoseFromMotion(motion);
    drawHumanFigure(ctx, palette, {
      scale: 0.85,
      pose,
      detail: { type: "patient", emergency: patient.isEmergency },
    });
    if (patient.isEmergency) {
      ctx.fillStyle = "rgba(239, 68, 68, 0.92)";
      ctx.beginPath();
      ctx.arc(6, -18, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(248, 250, 252, 0.95)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(4.2, -18);
      ctx.lineTo(7.8, -18);
      ctx.moveTo(6, -20.2);
      ctx.lineTo(6, -15.8);
      ctx.stroke();
    }
    ctx.restore();
  });
  ctx.restore();
};

const drawStaffAgentsBlueprint = (ctx) => {
  ctx.save();
  ctx.globalAlpha = 0.95;
  state.staffAgents.forEach((agent) => {
    if (!agent.position) return;
    const px = agent.position.x * CANVAS_CELL;
    const py = agent.position.y * CANVAS_CELL;
    ctx.save();
    ctx.translate(px, py);
    const palette = getStaffAvatarPalette(agent);
    const motion = ensureAgentMotion(agent);
    const pose = derivePoseFromMotion(motion);
    drawHumanFigure(ctx, palette, {
      scale: 0.75,
      pose,
      detail: { type: "staff", role: agent.staff?.role },
    });
    ctx.save();
    ctx.translate(0, -18);
    drawRoundedRect(ctx, -5, -5, 10, 10, 3);
    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.fill();
    ctx.fillStyle = withAlpha(palette.accent, 0.92);
    ctx.font = "700 8px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((agent.staff?.role ?? "").charAt(0).toUpperCase(), 0, 0);
    ctx.restore();
    ctx.restore();
  });
  ctx.restore();
};

const drawAgentsBlueprint = (ctx) => {
  drawPatientAgentsBlueprint(ctx);
  drawStaffAgentsBlueprint(ctx);
};

const drawRoomAura = (ctx, room) => {
  const theme = getInteriorTheme(room.interiorId);
  const visual = roomVisuals[room.type];
  const accent =
    theme.palette?.accent ??
    theme.palette?.mid ??
    visual?.color ??
    "#38bdf8";
  const centerX = (room.x + room.width / 2) * CANVAS_CELL;
  const centerY = (room.y + room.height / 2) * CANVAS_CELL;
  const radius = Math.max(room.width, room.height) * CANVAS_CELL * 0.9;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const aura = ctx.createRadialGradient(
    centerX,
    centerY,
    Math.max(CANVAS_CELL * 0.35, radius * 0.25),
    centerX,
    centerY,
    radius
  );
  aura.addColorStop(0, withAlpha(accent, 0.45));
  aura.addColorStop(0.6, withAlpha(shiftColor(accent, -0.1), 0.18));
  aura.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = aura;
  ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  ctx.restore();

  const ringRadius = Math.max(room.width, room.height) * CANVAS_CELL * 0.45;
  if (ringRadius > CANVAS_CELL * 0.6) {
    ctx.save();
    ctx.strokeStyle = withAlpha(accent, 0.28);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

const drawRoomVitals = (ctx, room) => {
  const metrics = [];
  if (room.environmentBoost) {
    metrics.push({ label: "Env", value: room.environmentBoost, color: "#4ade80" });
  }
  if (room.welfareBoost) {
    metrics.push({ label: "Wlf", value: room.welfareBoost, color: "#facc15" });
  }
  if (room.reputationBoost) {
    metrics.push({ label: "Rep", value: room.reputationBoost, color: "#38bdf8" });
  }
  if (!metrics.length) return;
  const originX = room.x * CANVAS_CELL;
  const originY = room.y * CANVAS_CELL;
  const width = room.width * CANVAS_CELL;
  const capsuleHeight = 16;
  const defaultY = originY + 34;
  const maxY = originY + room.height * CANVAS_CELL - capsuleHeight - 6;
  const baseY = Math.min(defaultY, maxY);
  const capsuleWidth = 44;
  const spacing = 6;
  const totalWidth = metrics.length * capsuleWidth + (metrics.length - 1) * spacing;
  let startX = originX + Math.max(6, (width - totalWidth) / 2);
  ctx.save();
  metrics.forEach((metric) => {
    const gradient = ctx.createLinearGradient(startX, baseY, startX, baseY + capsuleHeight);
    gradient.addColorStop(0, withAlpha(shiftColor(metric.color, 0.3), 0.9));
    gradient.addColorStop(1, withAlpha(shiftColor(metric.color, -0.25), 0.85));
    ctx.shadowColor = withAlpha(metric.color, 0.4);
    ctx.shadowBlur = 8;
    drawRoundedRect(ctx, startX, baseY, capsuleWidth, capsuleHeight, 7);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = withAlpha(metric.color, 0.65);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.font = "9px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${metric.label} +${Math.round(metric.value)}`, startX + capsuleWidth / 2, baseY + 11);
    startX += capsuleWidth + spacing;
  });
  ctx.restore();
};

const drawRoomMachines = (ctx, room) => {
  if (!room.machines?.length) return;
  const originX = room.x * CANVAS_CELL;
  const originY = room.y * CANVAS_CELL;
  const totalWidth = room.width * CANVAS_CELL;
  const baseY = originY + room.height * CANVAS_CELL - 18;
  const iconSize = 10;
  const count = room.machines.length;
  const spacing = count > 1 ? Math.min(24, (totalWidth - 20) / (count - 1)) : 0;
  const startX = originX + 10;
  room.machines.forEach((id, index) => {
    const def = getMachineDefinition(id);
    const x = startX + index * spacing;
    const gradient = ctx.createLinearGradient(x, baseY, x + iconSize, baseY + iconSize);
    gradient.addColorStop(0, shiftColor(def.color, 0.3));
    gradient.addColorStop(0.6, def.color);
    gradient.addColorStop(1, shiftColor(def.color, -0.25));
    ctx.save();
    ctx.shadowColor = withAlpha(def.color, 0.6);
    ctx.shadowBlur = 6;
    drawRoundedRect(ctx, x, baseY, iconSize, iconSize, 3);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = withAlpha("#0f172a", 0.65);
    ctx.stroke();
    ctx.restore();
  });

  if (room.severityCapacity) {
    ctx.save();
    drawRoundedRect(ctx, originX + 8, originY + 8, 40, 18, 6);
    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.fill();
    ctx.strokeStyle = "rgba(248, 250, 252, 0.25)";
    ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    ctx.font = "10px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`S${room.severityCapacity}`, originX + 28, originY + 20);
    ctx.restore();
  }
};

const drawRoomDecor = (ctx, room) => {
  if (!room.decorations?.length) return;
  const originX = room.x * CANVAS_CELL;
  const originY = room.y * CANVAS_CELL;
  const baseX = originX + room.width * CANVAS_CELL - 16;
  const maxY = originY + room.height * CANVAS_CELL - 16;
  room.decorations.slice(0, 4).forEach((id, index) => {
    const def = getDecorationDefinition(id);
    const y = originY + 14 + index * 14;
    if (y > maxY) return;
    const accent = shiftColor(def.color, 0.35);
    const gradient = ctx.createRadialGradient(baseX - 2, y - 2, 2, baseX, y, 8);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, shiftColor(def.color, -0.35));
    ctx.save();
    ctx.shadowColor = withAlpha(def.color, 0.5);
    ctx.shadowBlur = 8;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(baseX, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = withAlpha("#0f172a", 0.5);
    ctx.stroke();
    ctx.restore();
  });
};

const drawRoomLabel = (ctx, room) => {
  const blueprint = getBlueprint(room.type);
  const label = blueprint?.name ?? room.type;
  const theme = getInteriorTheme(room.interiorId);
  const accent = theme.palette?.accent ?? "#38bdf8";
  const originX = room.x * CANVAS_CELL;
  const originY = room.y * CANVAS_CELL;
  const width = room.width * CANVAS_CELL;
  ctx.save();
  drawRoundedRect(ctx, originX + 10, originY + 6, width - 20, 22, 8);
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.65);
  ctx.stroke();
  ctx.fillStyle = "rgba(248, 250, 252, 0.92)";
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, originX + width / 2, originY + 21);
  ctx.restore();
};

const getShellFixtureRect = (shell, fixture, thicknessFactor = 0.32, inset = 0.18) => {
  const cell = CANVAS_CELL;
  const wall = fixture.wall;
  const index = clamp(
    fixture.index ?? 0,
    0,
    (wall === "north" || wall === "south" ? shell.width : shell.height) - 1
  );
  if (wall === "north" || wall === "south") {
    const baseX = (shell.x + index) * cell;
    const span = cell;
    const width = span * Math.max(0.1, 1 - inset * 2);
    const x = baseX + span * inset;
    const height = cell * thicknessFactor;
    const y =
      wall === "north"
        ? shell.y * cell + 2
        : (shell.y + shell.height) * cell - height - 2;
    return { x, y, width, height };
  }
  const baseY = (shell.y + index) * cell;
  const span = cell;
  const height = span * Math.max(0.1, 1 - inset * 2);
  const y = baseY + span * inset;
  const width = cell * thicknessFactor;
  const x =
    wall === "west"
      ? shell.x * cell + 2
      : (shell.x + shell.width) * cell - width - 2;
  return { x, y, width, height };
};

const drawBlueprintShell = (ctx, shell) => {
  const px = shell.x * CANVAS_CELL;
  const py = shell.y * CANVAS_CELL;
  const width = shell.width * CANVAS_CELL;
  const height = shell.height * CANVAS_CELL;
  ctx.save();
  const fill = ctx.createLinearGradient(px, py, px + width, py + height);
  fill.addColorStop(0, "rgba(30, 64, 175, 0.16)");
  fill.addColorStop(0.5, "rgba(15, 23, 42, 0.12)");
  fill.addColorStop(1, "rgba(14, 165, 233, 0.18)");
  ctx.fillStyle = fill;
  ctx.fillRect(px + 6, py + 6, width - 12, height - 12);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(148, 197, 255, 0.65)";
  ctx.shadowColor = "rgba(56, 189, 248, 0.3)";
  ctx.shadowBlur = 14;
  ctx.strokeRect(px + 3, py + 3, width - 6, height - 6);
  ctx.restore();

  const windows = shell.windows ?? [];
  ctx.save();
  ctx.fillStyle = "rgba(148, 197, 255, 0.45)";
  windows.forEach((fixture) => {
    const rect = getShellFixtureRect(shell, fixture, 0.22, 0.24);
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  });
  ctx.restore();

  const doors = shell.doors ?? [];
  ctx.save();
  ctx.fillStyle = "rgba(96, 165, 250, 0.8)";
  doors.forEach((fixture) => {
    const rect = getShellFixtureRect(shell, fixture, 0.36, 0.12);
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  });
  ctx.restore();
};

const renderBlueprintCanvas = (ctx) => {
  const width = getGridWidth() * CANVAS_CELL;
  const height = getGridHeight() * CANVAS_CELL;
  ctx.clearRect(0, 0, width, height);
  const blueprintLayer = getBlueprintBuffer(width, height);
  ctx.drawImage(blueprintLayer, 0, 0);

  ctx.save();
  const corridorY = getCorridorY() * CANVAS_CELL;
  const walkwayGradient = ctx.createLinearGradient(0, corridorY - 18, 0, corridorY + 18);
  walkwayGradient.addColorStop(0, "rgba(15, 23, 42, 0)");
  walkwayGradient.addColorStop(0.5, "rgba(30, 64, 175, 0.18)");
  walkwayGradient.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = walkwayGradient;
  ctx.fillRect(0, corridorY - 18, width, 36);
  ctx.restore();

  const emptyTile = getEmptyTileSprite();
  const lockedTile = getLockedTileSprite();
  for (let y = 0; y < getGridHeight(); y++) {
    for (let x = 0; x < getGridWidth(); x++) {
      const px = x * CANVAS_CELL;
      const py = y * CANVAS_CELL;
      if (!isTileUnlocked(x, y)) {
        ctx.drawImage(lockedTile, px, py);
        continue;
      }
      const room = state.grid[y][x];
      if (room) {
        const visualKey = roomVisuals[room.type] ? room.type : "default";
        const visual = roomVisuals[visualKey] ?? roomVisuals.default;
        const theme = getInteriorTheme(room.interiorId);
        const sprite = getRoomTileSprite(theme, visualKey, visual);
        ctx.drawImage(sprite, px, py);
      } else {
        ctx.drawImage(emptyTile, px, py);
      }
    }
  }

  state.properties.forEach((parcel) => {
    const px = parcel.x * CANVAS_CELL;
    const py = parcel.y * CANVAS_CELL;
    const w = parcel.width * CANVAS_CELL;
    const h = parcel.height * CANVAS_CELL;
    ctx.save();
    if (parcel.owned) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.strokeRect(px + 2, py + 2, w - 4, h - 4);
    } else {
      const overlay = ctx.createLinearGradient(px, py, px + w, py + h);
      overlay.addColorStop(0, "rgba(30, 64, 175, 0.45)");
      overlay.addColorStop(1, "rgba(15, 23, 42, 0.7)");
      ctx.fillStyle = overlay;
      ctx.fillRect(px + 2, py + 2, w - 4, h - 4);
      ctx.strokeStyle = "rgba(148, 197, 255, 0.55)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 6]);
      ctx.strokeRect(px + 2, py + 2, w - 4, h - 4);
      ctx.fillStyle = "rgba(191, 219, 254, 0.85)";
      ctx.font = "14px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("For Sale", px + w / 2, py + h / 2);
    }
    ctx.restore();
  });

  state.shells.forEach((shell) => drawBlueprintShell(ctx, shell));

  state.rooms.forEach((room) => {
    drawRoomAura(ctx, room);
  });

  state.rooms.forEach((room) => {
    const theme = getInteriorTheme(room.interiorId);
    ctx.save();
    ctx.strokeStyle = withAlpha(theme.palette?.accent ?? "#94a3b8", 0.9);
    ctx.lineWidth = 2.5;
    ctx.shadowColor = withAlpha(theme.palette?.accent ?? "#94a3b8", 0.35);
    ctx.shadowBlur = 8;
    ctx.strokeRect(
      room.x * CANVAS_CELL + 3,
      room.y * CANVAS_CELL + 3,
      room.width * CANVAS_CELL - 6,
      room.height * CANVAS_CELL - 6
    );
    ctx.restore();
    drawRoomMachines(ctx, room);
    drawRoomDecor(ctx, room);
    drawRoomLabel(ctx, room);
    drawRoomVitals(ctx, room);
  });

  drawAgentsBlueprint(ctx);
  drawPatientQueue(ctx);
};

const createIsoMapper = (width, height) => {
  const gridWidth = getGridWidth();
  const gridHeight = getGridHeight();
  const centerX = gridWidth / 2;
  const centerY = gridHeight / 2;
  const yaw = showcaseRotation + ISO_BASE_YAW;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(ISO_CAMERA_PITCH);
  const sinPitch = Math.sin(ISO_CAMERA_PITCH);
  const projectRaw = (x, y, z = 0) => {
    const dx = x - centerX;
    const dy = y - centerY;
    const rotatedX = dx * cosYaw - dy * sinYaw;
    const rotatedY = dx * sinYaw + dy * cosYaw;
    const projectedY = rotatedY * cosPitch - z * sinPitch;
    const depth = rotatedY * sinPitch + z * cosPitch;
    return {
      x: rotatedX * ISO_HORIZONTAL_SCALE,
      y: projectedY * ISO_VERTICAL_SCALE,
      depth,
    };
  };

  const boundsCorners = [
    projectRaw(0, 0),
    projectRaw(gridWidth, 0),
    projectRaw(gridWidth, gridHeight),
    projectRaw(0, gridHeight),
    projectRaw(0, 0, 1),
    projectRaw(gridWidth, 0, 1),
    projectRaw(gridWidth, gridHeight, 1),
    projectRaw(0, gridHeight, 1),
  ];
  const minX = Math.min(...boundsCorners.map((point) => point.x));
  const maxX = Math.max(...boundsCorners.map((point) => point.x));
  const minY = Math.min(...boundsCorners.map((point) => point.y));
  const maxY = Math.max(...boundsCorners.map((point) => point.y));
  const offsetX = (width - (maxX - minX)) / 2 - minX;
  const verticalMargin = Math.max(52, height * 0.08);
  let offsetY = verticalMargin - minY;
  const bottom = maxY + offsetY;
  const maxBottom = height - verticalMargin;
  if (bottom > maxBottom) {
    offsetY -= bottom - maxBottom;
  }

  const project = (x, y, z = 0) => {
    const raw = projectRaw(x, y, z);
    return {
      x: raw.x + offsetX,
      y: raw.y + offsetY,
      depth: raw.depth,
    };
  };

  const unproject = (px, py) => {
    const localX = px - offsetX;
    const localY = py - offsetY;
    const rotatedX = localX / ISO_HORIZONTAL_SCALE;
    const rotatedY = localY / (ISO_VERTICAL_SCALE * cosPitch);
    const dx = rotatedX * cosYaw + rotatedY * sinYaw;
    const dy = -rotatedX * sinYaw + rotatedY * cosYaw;
    return {
      x: dx + centerX,
      y: dy + centerY,
    };
  };

  return { project, projectRaw, unproject, offsetX, offsetY, yaw, cosYaw, sinYaw };
};

const getIsoMapper = () => {
  const width = getGridWidth() * CANVAS_CELL;
  const height = getGridHeight() * CANVAS_CELL;
  if (
    !isoMapperCache ||
    isoMapperCache.width !== width ||
    isoMapperCache.height !== height ||
    isoMapperCache.rotation !== showcaseRotation
  ) {
    const mapper = createIsoMapper(width, height);
    isoMapperCache = { ...mapper, width, height, rotation: showcaseRotation };
  }
  return isoMapperCache;
};

const drawIsoPolygon = (ctx, points) => {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
};

const lerp = (a, b, t) => a + (b - a) * t;

const sampleIsoPoint = (corners, u, v) => {
  const top = {
    x: lerp(corners[0].x, corners[1].x, u),
    y: lerp(corners[0].y, corners[1].y, u),
  };
  const bottom = {
    x: lerp(corners[3].x, corners[2].x, u),
    y: lerp(corners[3].y, corners[2].y, u),
  };
  return {
    x: lerp(top.x, bottom.x, v),
    y: lerp(top.y, bottom.y, v),
  };
};

const drawIsoFloorTiling = (
  ctx,
  corners,
  columns,
  rows,
  { color, highlight, shadow, lineWidth = 1 } = {}
) => {
  if (!columns || !rows) return;
  const clampCount = (value) => Math.max(0, Math.floor(value));
  const verticalLines = clampCount(columns);
  const horizontalLines = clampCount(rows);
  if (verticalLines < 2 && horizontalLines < 2) return;

  const drawLines = (strokeStyle, offsetX = 0, offsetY = 0) => {
    if (!strokeStyle) return;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    for (let col = 1; col < verticalLines; col += 1) {
      const u = col / verticalLines;
      const start = sampleIsoPoint(corners, u, 0);
      const end = sampleIsoPoint(corners, u, 1);
      ctx.beginPath();
      ctx.moveTo(start.x + offsetX, start.y + offsetY);
      ctx.lineTo(end.x + offsetX, end.y + offsetY);
      ctx.stroke();
    }
    for (let row = 1; row < horizontalLines; row += 1) {
      const v = row / horizontalLines;
      const start = sampleIsoPoint(corners, 0, v);
      const end = sampleIsoPoint(corners, 1, v);
      ctx.beginPath();
      ctx.moveTo(start.x + offsetX, start.y + offsetY);
      ctx.lineTo(end.x + offsetX, end.y + offsetY);
      ctx.stroke();
    }
  };

  ctx.save();
  drawIsoPolygon(ctx, corners);
  ctx.clip();
  drawLines(color, 0, 0);
  drawLines(highlight, -0.8, -0.8);
  drawLines(shadow, 0.8, 0.8);
  ctx.restore();
};

const drawIsoFloorPattern = (ctx, corners, theme) => {
  renderEngine.renderInteriorPolygon(ctx, corners, theme ?? {});
};

const drawIsoConsole = (ctx, point, color) => {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(6, -3);
  ctx.lineTo(0, 0);
  ctx.lineTo(-6, -3);
  ctx.closePath();
  ctx.fillStyle = withAlpha(color, 0.82);
  ctx.fill();
  ctx.strokeStyle = withAlpha(shiftColor(color, -0.3), 0.65);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4, -5);
  ctx.lineTo(-1, -11);
  ctx.lineTo(1, -11);
  ctx.lineTo(4, -5);
  ctx.closePath();
  const topGradient = ctx.createLinearGradient(-4, -12, 4, -4);
  topGradient.addColorStop(0, withAlpha(color, 0.95));
  topGradient.addColorStop(1, withAlpha(shiftColor(color, -0.25), 0.85));
  ctx.fillStyle = topGradient;
  ctx.fill();
  ctx.restore();
};

const drawIsoPlant = (ctx, point, color) => {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-4, -6, -2, -2, 0, 0);
  ctx.bezierCurveTo(2, -2, 4, -6, 0, -10);
  ctx.fillStyle = withAlpha(color, 0.88);
  ctx.fill();
  ctx.restore();
};

const drawIsoSeating = (ctx, point, color) => {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.beginPath();
  ctx.moveTo(-5, -3);
  ctx.lineTo(5, -3);
  ctx.lineTo(3, 2);
  ctx.lineTo(-3, 2);
  ctx.closePath();
  ctx.fillStyle = withAlpha(color, 0.8);
  ctx.fill();
  ctx.strokeStyle = withAlpha(shiftColor(color, -0.35), 0.7);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
};

const getRoomGlyph = (type) => ROOM_GLYPHS[type] ?? ROOM_GLYPHS.default;

const lerpPoint = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const WALL_NORMALS = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

const buildWallGeometry = (corners, topCorners, room) => ({
  north: {
    bottomStart: corners[0],
    bottomEnd: corners[1],
    topStart: topCorners[0],
    topEnd: topCorners[1],
    length: Math.max(1, room.width),
  },
  east: {
    bottomStart: corners[1],
    bottomEnd: corners[2],
    topStart: topCorners[1],
    topEnd: topCorners[2],
    length: Math.max(1, room.height),
  },
  south: {
    bottomStart: corners[3],
    bottomEnd: corners[2],
    topStart: topCorners[3],
    topEnd: topCorners[2],
    length: Math.max(1, room.width),
  },
  west: {
    bottomStart: corners[0],
    bottomEnd: corners[3],
    topStart: topCorners[0],
    topEnd: topCorners[3],
    length: Math.max(1, room.height),
  },
});

const renderWallTexture = (
  ctx,
  geometry,
  { tone = "#1f2937", mortar, brightness = 0 } = {}
) => {
  const polygon = [geometry.bottomStart, geometry.bottomEnd, geometry.topEnd, geometry.topStart];
  const wallHeight = distance(geometry.bottomStart, geometry.topStart);
  const wallWidth = distance(geometry.bottomStart, geometry.bottomEnd);
  if (wallHeight <= 6 || wallWidth <= 6) return;

  const courseCount = Math.max(2, Math.round(wallHeight / 14));
  const brickCount = Math.max(2, Math.round(wallWidth / 32));
  const mortarTone = mortar ?? shiftColor(tone, -0.45);
  const horizontalStroke = withAlpha(shiftColor(mortarTone, 0.12 + brightness * 0.08), 0.32);
  const verticalStroke = withAlpha(shiftColor(mortarTone, 0.02 + brightness * 0.1), 0.28);
  const verticalAltStroke = withAlpha(shiftColor(mortarTone, -0.18 + brightness * 0.08), 0.26);
  const bandOpacity = 0.08 + brightness * 0.05;

  ctx.save();
  drawIsoPolygon(ctx, polygon);
  ctx.clip();

  for (let row = 0; row < courseCount; row += 1) {
    const t0 = row / courseCount;
    const t1 = (row + 1) / courseCount;
    const bottomLeft = lerpPoint(geometry.bottomStart, geometry.topStart, t0);
    const bottomRight = lerpPoint(geometry.bottomEnd, geometry.topEnd, t0);
    const topRight = lerpPoint(geometry.bottomEnd, geometry.topEnd, t1);
    const topLeft = lerpPoint(geometry.bottomStart, geometry.topStart, t1);
    const gradient = ctx.createLinearGradient(bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y);
    gradient.addColorStop(0, withAlpha(shiftColor(tone, 0.18 + brightness * 0.1), bandOpacity));
    gradient.addColorStop(1, withAlpha(shiftColor(tone, -0.26 + brightness * 0.08), bandOpacity + 0.04));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(bottomLeft.x, bottomLeft.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(topLeft.x, topLeft.y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = horizontalStroke;
  ctx.lineWidth = 1.05;
  for (let row = 1; row < courseCount; row += 1) {
    const t = row / courseCount;
    const start = lerpPoint(geometry.bottomStart, geometry.topStart, t);
    const end = lerpPoint(geometry.bottomEnd, geometry.topEnd, t);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  const spacing = wallWidth / brickCount;
  for (let row = 0; row < courseCount; row += 1) {
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    const startCol = offset === 0 ? 1 : 0;
    for (let col = startCol; col < brickCount; col += 1) {
      const along = offset + col * spacing;
      if (along <= 0 || along >= wallWidth) continue;
      const u = along / wallWidth;
      const base = lerpPoint(geometry.bottomStart, geometry.bottomEnd, u);
      const top = lerpPoint(geometry.topStart, geometry.topEnd, u);
      ctx.strokeStyle = (col + row) % 2 === 0 ? verticalStroke : verticalAltStroke;
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
    }
  }

  ctx.restore();
};

const sampleWallSegment = (wall, index, inset = 0.18) => {
  if (!wall || !wall.length) return null;
  const clampedIndex = clamp(index, 0, wall.length - 1);
  const span = Math.max(1, wall.length);
  const leftT = (clampedIndex + inset) / span;
  const rightT = (clampedIndex + 1 - inset) / span;
  const bottomLeft = lerpPoint(wall.bottomStart, wall.bottomEnd, leftT);
  const bottomRight = lerpPoint(wall.bottomStart, wall.bottomEnd, rightT);
  const topLeft = lerpPoint(wall.topStart, wall.topEnd, leftT);
  const topRight = lerpPoint(wall.topStart, wall.topEnd, rightT);
  return { bottomLeft, bottomRight, topLeft, topRight };
};

const drawIsoDoorPanel = (ctx, segment, accent) => {
  if (!segment) return;
  const { bottomLeft, bottomRight, topLeft, topRight } = segment;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bottomLeft.x, bottomLeft.y);
  ctx.lineTo(bottomRight.x, bottomRight.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.closePath();
  const fill = ctx.createLinearGradient(bottomLeft.x, bottomLeft.y, topRight.x, topRight.y);
  fill.addColorStop(0, withAlpha("#0f172a", 0.92));
  fill.addColorStop(1, withAlpha(shiftColor(accent, 0.2), 0.6));
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.65);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
};

const drawIsoWindowPanel = (ctx, segment, accent) => {
  if (!segment) return;
  const { bottomLeft, bottomRight, topLeft, topRight } = segment;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bottomLeft.x, bottomLeft.y);
  ctx.lineTo(bottomRight.x, bottomRight.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.closePath();
  const glass = ctx.createLinearGradient(bottomLeft.x, bottomLeft.y, topRight.x, topRight.y);
  glass.addColorStop(0, withAlpha("#f8fafc", 0.55));
  glass.addColorStop(1, withAlpha(accent, 0.18));
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.4);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  const mullionBottom = lerpPoint(bottomLeft, bottomRight, 0.5);
  const mullionTop = lerpPoint(topLeft, topRight, 0.5);
  ctx.beginPath();
  ctx.moveTo(mullionBottom.x, mullionBottom.y);
  ctx.lineTo(mullionTop.x, mullionTop.y);
  ctx.strokeStyle = withAlpha(accent, 0.3);
  ctx.lineWidth = 0.55;
  ctx.stroke();
  ctx.restore();
};

const drawIsoDoorway = (ctx, segment, accent, interiorPoint = null) => {
  if (!segment) return;
  const { bottomLeft, bottomRight, topLeft, topRight } = segment;
  const center = lerpPoint(bottomLeft, bottomRight, 0.5);
  const baseVec = {
    x: bottomRight.x - bottomLeft.x,
    y: bottomRight.y - bottomLeft.y,
  };
  const normal = {
    x: baseVec.y,
    y: -baseVec.x,
  };
  const magnitude = Math.hypot(normal.x, normal.y) || 1;
  let unitNormal = { x: normal.x / magnitude, y: normal.y / magnitude };
  if (interiorPoint) {
    const toInterior = { x: interiorPoint.x - center.x, y: interiorPoint.y - center.y };
    if (toInterior.x * unitNormal.x + toInterior.y * unitNormal.y > 0) {
      unitNormal = { x: -unitNormal.x, y: -unitNormal.y };
    }
  }
  const walkwayDepth = 34;
  const flare = { x: baseVec.x * 0.12, y: baseVec.y * 0.12 };
  const walkway = [
    { x: bottomLeft.x, y: bottomLeft.y },
    { x: bottomRight.x, y: bottomRight.y },
    {
      x: bottomRight.x + unitNormal.x * walkwayDepth + flare.x,
      y: bottomRight.y + unitNormal.y * walkwayDepth + flare.y,
    },
    {
      x: bottomLeft.x + unitNormal.x * walkwayDepth - flare.x,
      y: bottomLeft.y + unitNormal.y * walkwayDepth - flare.y,
    },
  ];
  ctx.save();
  drawIsoPolygon(ctx, walkway);
  const walkGradient = ctx.createLinearGradient(
    (walkway[0].x + walkway[1].x) / 2,
    (walkway[0].y + walkway[1].y) / 2,
    (walkway[2].x + walkway[3].x) / 2,
    (walkway[2].y + walkway[3].y) / 2
  );
  walkGradient.addColorStop(0, withAlpha(shiftColor(accent, 0.4), 0.32));
  walkGradient.addColorStop(1, withAlpha("#0f172a", 0.88));
  ctx.fillStyle = walkGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.4);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bottomLeft.x, bottomLeft.y);
  ctx.lineTo(bottomRight.x, bottomRight.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.closePath();
  const doorGradient = ctx.createLinearGradient(bottomLeft.x, bottomLeft.y, topRight.x, topRight.y);
  doorGradient.addColorStop(0, withAlpha("#0f172a", 0.96));
  doorGradient.addColorStop(1, withAlpha(shiftColor(accent, 0.2), 0.6));
  ctx.fillStyle = doorGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.68);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  const lintel = lerpPoint(topLeft, topRight, 0.5);
  const entryGlow = ctx.createRadialGradient(lintel.x, lintel.y - 6, 2, lintel.x, lintel.y - 6, 26);
  entryGlow.addColorStop(0, withAlpha(accent, 0.22));
  entryGlow.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = entryGlow;
  ctx.fill();
  ctx.restore();
};

const drawIsoRoomGlyph = (ctx, project, room, glyph, accent) => {
  if (!glyph) return;
  const center = project(room.x + room.width / 2, room.y + room.height / 2);
  ctx.save();
  const size = Math.max(18, room.width * 16);
  ctx.font = `600 ${size}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Symbol'`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = withAlpha(accent, 0.45);
  ctx.shadowBlur = 16;
  ctx.fillStyle = withAlpha(accent, 0.92);
  ctx.fillText(glyph, center.x, center.y - ISO_WALL_HEIGHT * 0.3);
  ctx.restore();
};

const drawIsoCampusShell = (ctx, project, shell) => {
  const corners = [
    project(shell.x, shell.y, 0),
    project(shell.x + shell.width, shell.y, 0),
    project(shell.x + shell.width, shell.y + shell.height, 0),
    project(shell.x, shell.y + shell.height, 0),
  ];
  const topCorners = [
    project(shell.x, shell.y, 1),
    project(shell.x + shell.width, shell.y, 1),
    project(shell.x + shell.width, shell.y + shell.height, 1),
    project(shell.x, shell.y + shell.height, 1),
  ];
  const interiorPoint = project(shell.x + shell.width / 2, shell.y + shell.height / 2, 0);
  const accent = "#60a5fa";
  const facadeBase = "#1f2937";
  const floorTone = "#334155";
  const capTone = "#475569";

  const wallGeometry = buildWallGeometry(corners, topCorners, shell);
  const walls = Object.entries(wallGeometry)
    .map(([id, geometry]) => {
      const brightness = clamp(
        0.34 + 0.54 * Math.max(0, WALL_NORMALS[id].x * LIGHT_DIRECTION.x + WALL_NORMALS[id].y * LIGHT_DIRECTION.y),
        0.28,
        0.88
      );
      const depth = (geometry.bottomStart.depth + geometry.bottomEnd.depth) / 2;
      return { id, geometry, brightness, depth };
    })
    .sort((a, b) => a.depth - b.depth);
  const frontWallId = walls[walls.length - 1]?.id ?? "south";

  const shadowOffset = {
    x: (LIGHT_DIRECTION.y - LIGHT_DIRECTION.x) * 22,
    y: (Math.abs(LIGHT_DIRECTION.x) + Math.abs(LIGHT_DIRECTION.y)) * 18 + 10,
  };
  const shadowPoints = corners.map((point) => ({
    x: point.x + shadowOffset.x,
    y: point.y + shadowOffset.y,
  }));
  ctx.save();
  ctx.globalAlpha = 0.26;
  drawIsoPolygon(ctx, shadowPoints);
  ctx.fillStyle = "rgba(8, 15, 32, 0.95)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawIsoPolygon(ctx, corners);
  const floorGradient = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
  floorGradient.addColorStop(0, withAlpha(shiftColor(floorTone, 0.28), 0.96));
  floorGradient.addColorStop(0.55, withAlpha(floorTone, 0.94));
  floorGradient.addColorStop(1, withAlpha(shiftColor(floorTone, -0.18), 0.97));
  ctx.fillStyle = floorGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.45);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  drawIsoFloorTiling(
    ctx,
    corners,
    Math.max(2, shell.width * 2),
    Math.max(2, shell.height * 2),
    {
      color: withAlpha(shiftColor(floorTone, -0.35), 0.32 + showcaseAnimation.pulse * 0.02),
      highlight: withAlpha(shiftColor(floorTone, 0.25), 0.18 + showcaseAnimation.wave * 0.015),
      shadow: withAlpha(shiftColor(floorTone, -0.55), 0.36),
      lineWidth: 0.9,
    }
  );

  const drawWallFixtures = (entry) => {
    const { id, geometry } = entry;
    const windows = (shell.windows ?? []).filter((fixture) => fixture.wall === id);
    windows.forEach((fixture) => {
      const segment = sampleWallSegment(geometry, fixture.index, id === frontWallId ? 0.22 : 0.18);
      if (!segment) return;
      drawIsoWindowPanel(ctx, segment, accent);
      const glowCenter = lerpPoint(segment.bottomLeft, segment.bottomRight, 0.5);
      ctx.save();
      const paneGlow = ctx.createRadialGradient(glowCenter.x, glowCenter.y - 6, 2, glowCenter.x, glowCenter.y - 6, 20);
      paneGlow.addColorStop(0, withAlpha(accent, 0.16));
      paneGlow.addColorStop(1, "rgba(15, 23, 42, 0)");
      ctx.fillStyle = paneGlow;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(glowCenter.x, glowCenter.y - 4, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    const doors = (shell.doors ?? []).filter((fixture) => fixture.wall === id);
    doors.forEach((fixture) => {
      const inset = id === frontWallId ? 0.24 : 0.18;
      const segment = sampleWallSegment(geometry, fixture.index, inset);
      if (!segment) return;
      if (id === frontWallId) {
        drawIsoDoorway(ctx, segment, accent, interiorPoint);
      } else {
        drawIsoDoorPanel(ctx, segment, accent);
      }
    });
  };

  walls.forEach((entry) => {
    const { geometry, brightness } = entry;
    const polygon = [geometry.bottomStart, geometry.bottomEnd, geometry.topEnd, geometry.topStart];
    ctx.save();
    drawIsoPolygon(ctx, polygon);
    const gradient = ctx.createLinearGradient(
      geometry.bottomStart.x,
      geometry.bottomStart.y,
      geometry.topStart.x,
      geometry.topStart.y
    );
    gradient.addColorStop(0, withAlpha(shiftColor(facadeBase, -0.3 + brightness * 0.08), 0.98));
    gradient.addColorStop(0.65, withAlpha(shiftColor(facadeBase, -0.12 + brightness * 0.18), 0.95));
    gradient.addColorStop(1, withAlpha(shiftColor(facadeBase, 0.18 + brightness * 0.22), 0.9));
    ctx.fillStyle = gradient;
    ctx.fill();
    renderWallTexture(ctx, geometry, {
      tone: shiftColor(facadeBase, brightness * 0.05),
      mortar: shiftColor(facadeBase, -0.48),
      brightness,
    });
    drawIsoPolygon(ctx, polygon);
    ctx.strokeStyle = withAlpha(shiftColor(accent, brightness * 0.18 - 0.1), 0.58);
    ctx.lineWidth = 1.05;
    ctx.stroke();
    ctx.restore();

    drawWallFixtures(entry);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(geometry.bottomStart.x, geometry.bottomStart.y);
    ctx.lineTo(geometry.bottomEnd.x, geometry.bottomEnd.y);
    ctx.strokeStyle = withAlpha(shiftColor(accent, brightness * 0.4 + 0.15), 0.35);
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
  });

  ctx.save();
  drawIsoPolygon(ctx, topCorners);
  const capGradient = ctx.createLinearGradient(topCorners[0].x, topCorners[0].y, topCorners[2].x, topCorners[2].y);
  capGradient.addColorStop(0, withAlpha(shiftColor(capTone, 0.22), 0.86));
  capGradient.addColorStop(1, withAlpha(shiftColor(capTone, -0.28), 0.92));
  ctx.fillStyle = capGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.38);
  ctx.lineWidth = 1.05;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  drawIsoPolygon(ctx, corners);
  const glow = ctx.createRadialGradient(interiorPoint.x, interiorPoint.y, 12, interiorPoint.x, interiorPoint.y, 120);
  glow.addColorStop(0, withAlpha(accent, 0.18));
  glow.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.restore();
};

const isRoomRecentlyBuilt = (room) => {
  if (!room || typeof room.builtAt !== "number") {
    return false;
  }
  const currentTick = state.stats?.tick ?? 0;
  return currentTick - room.builtAt < NEW_ROOM_HIGHLIGHT_TICKS;
};

const drawIsoTile = (ctx, project, x, y, { locked, occupant }) => {
  const p0 = project(x, y);
  const p1 = project(x + 1, y);
  const p2 = project(x + 1, y + 1);
  const p3 = project(x, y + 1);
  const points = [p0, p1, p2, p3];
  ctx.save();
  drawIsoPolygon(ctx, points);
  const theme = occupant ? getInteriorTheme(occupant.interiorId) : null;
  const baseColor = locked
    ? "#0f172a"
    : theme?.palette?.mid ?? theme?.palette?.base ?? "#1f2937";
  const shimmer = 0.25 + 0.15 * Math.sin(showcaseAnimation.time * 1.4 + (x + y) * 0.8);
  const gradient = ctx.createLinearGradient(p0.x, p0.y, p2.x, p2.y);
  gradient.addColorStop(
    0,
    withAlpha(
      shiftColor(baseColor, 0.35 + shimmer * 0.12),
      locked ? 0.9 : 0.6 + showcaseAnimation.pulse * 0.08
    )
  );
  gradient.addColorStop(
    1,
    withAlpha(
      shiftColor(baseColor, -0.32 - shimmer * 0.08),
      locked ? 0.95 : 0.82 + showcaseAnimation.wave * 0.06
    )
  );
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.lineWidth = locked ? 1.2 : 0.8;
  ctx.strokeStyle = withAlpha(locked ? "#94a3b8" : "#0f172a", locked ? 0.75 : 0.4);
  ctx.stroke();
  if (occupant) {
    const accent = theme?.palette?.accent ?? "#38bdf8";
    const accentGlow = 0.35 + showcaseAnimation.pulse * 0.2;
    ctx.strokeStyle = withAlpha(accent, accentGlow);
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (!locked) {
    const centerX = (p0.x + p2.x) / 2;
    const centerY = (p0.y + p2.y) / 2;
    const glow = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, 28);
    glow.addColorStop(0, `rgba(148, 197, 255, ${0.14 + showcaseAnimation.wave * 0.12})`);
    glow.addColorStop(1, "rgba(148, 197, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fill();
  }
  ctx.restore();
};

const drawIsoParcelFloor = (ctx, project, parcel) => {
  const corners = [
    project(parcel.x, parcel.y),
    project(parcel.x + parcel.width, parcel.y),
    project(parcel.x + parcel.width, parcel.y + parcel.height),
    project(parcel.x, parcel.y + parcel.height),
  ];
  ctx.save();
  drawIsoPolygon(ctx, corners);
  const base = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
  base.addColorStop(0, "rgba(30, 64, 175, 0.42)");
  base.addColorStop(0.5, "rgba(56, 189, 248, 0.18)");
  base.addColorStop(1, "rgba(8, 47, 73, 0.82)");
  ctx.fillStyle = base;
  ctx.fill();
  const centerX = (corners[0].x + corners[2].x) / 2;
  const centerY = (corners[0].y + corners[2].y) / 2;
  const glowRadius = Math.max(parcel.width, parcel.height) * 64;
  const glow = ctx.createRadialGradient(centerX, centerY, 12, centerX, centerY, glowRadius);
  glow.addColorStop(0, `rgba(148, 197, 255, ${0.14 + showcaseAnimation.pulse * 0.08})`);
  glow.addColorStop(1, "rgba(148, 197, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 197, 255, 0.28)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  drawIsoPolygon(ctx, corners);
  ctx.clip();
  const sweep = Math.max(3, parcel.height + 1);
  for (let i = 1; i <= sweep; i++) {
    const v = i / (sweep + 1);
    const start = sampleIsoPoint(corners, 0, v);
    const end = sampleIsoPoint(corners, 1, v);
    const shimmer = 0.08 + showcaseAnimation.wave * 0.05;
    ctx.strokeStyle = `rgba(148, 197, 255, ${shimmer})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  ctx.restore();
};

const drawIsoLockedParcel = (ctx, project, parcel) => {
  const corners = [
    project(parcel.x, parcel.y),
    project(parcel.x + parcel.width, parcel.y),
    project(parcel.x + parcel.width, parcel.y + parcel.height),
    project(parcel.x, parcel.y + parcel.height),
  ];
  ctx.save();
  drawIsoPolygon(ctx, corners);
  const overlay = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
  overlay.addColorStop(0, "rgba(15, 23, 42, 0.78)");
  overlay.addColorStop(1, "rgba(8, 25, 50, 0.9)");
  ctx.fillStyle = overlay;
  ctx.fill();
  ctx.setLineDash([12, 9]);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "rgba(148, 197, 255, 0.55)";
  ctx.stroke();
  ctx.restore();

  const labelPoint = project(
    parcel.x + parcel.width / 2,
    parcel.y + parcel.height / 2
  );
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "600 14px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(191, 219, 254, 0.92)";
  ctx.shadowColor = "rgba(15, 23, 42, 0.85)";
  ctx.shadowBlur = 8;
  ctx.fillText("For Sale", labelPoint.x, labelPoint.y - 6);
  ctx.font = "600 12px 'Segoe UI', sans-serif";
  ctx.fillText(`¤${formatCurrency(parcel.cost)}`, labelPoint.x, labelPoint.y + 12);
  ctx.restore();
};

const drawIsoBuildOverlay = (ctx, project, preview) => {
  if (!preview) return;
  const { x, y, width, height, valid } = preview;
  if (width <= 0 || height <= 0) {
    return;
  }
  const p0 = project(x, y);
  const p1 = project(x + width, y);
  const p2 = project(x + width, y + height);
  const p3 = project(x, y + height);
  const points = [p0, p1, p2, p3];
  ctx.save();
  drawIsoPolygon(ctx, points);
  ctx.fillStyle = valid ? "rgba(56, 189, 248, 0.22)" : "rgba(248, 113, 113, 0.26)";
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.setLineDash([12, 8]);
  ctx.strokeStyle = valid ? "rgba(148, 197, 255, 0.85)" : "rgba(248, 113, 113, 0.85)";
  ctx.stroke();
  ctx.restore();
  const center = project(x + width / 2, y + height / 2);
  ctx.save();
  ctx.font = "700 16px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
  ctx.textAlign = "center";
  ctx.shadowColor = valid ? "rgba(56, 189, 248, 0.45)" : "rgba(248, 113, 113, 0.45)";
  ctx.shadowBlur = 14;
  ctx.fillText(`${Math.round(width)}×${Math.round(height)}`, center.x, center.y - 6);
  ctx.restore();
};

const drawIsoRoomShowcase = (ctx, project, room) => {
  const corners = [
    project(room.x, room.y, 0),
    project(room.x + room.width, room.y, 0),
    project(room.x + room.width, room.y + room.height, 0),
    project(room.x, room.y + room.height, 0),
  ];
  const topCorners = [
    project(room.x, room.y, 1),
    project(room.x + room.width, room.y, 1),
    project(room.x + room.width, room.y + room.height, 1),
    project(room.x, room.y + room.height, 1),
  ];
  const theme = getInteriorTheme(room.interiorId);
  const accent = theme.palette?.accent ?? "#38bdf8";
  const mid = theme.palette?.mid ?? theme.palette?.base ?? "#475569";
  const baseTone = theme.palette?.base ?? "#1f2937";
  const glyph = getRoomGlyph(room.type);
  const recentlyBuilt = isRoomRecentlyBuilt(room);
  const wallGeometry = buildWallGeometry(corners, topCorners, room);
  const walls = Object.entries(wallGeometry)
    .map(([id, geometry]) => {
      const brightness = clamp(
        0.36 + 0.5 * Math.max(0, WALL_NORMALS[id].x * LIGHT_DIRECTION.x + WALL_NORMALS[id].y * LIGHT_DIRECTION.y),
        0.3,
        0.9
      );
      const depth = (geometry.bottomStart.depth + geometry.bottomEnd.depth) / 2;
      return { id, geometry, brightness, depth };
    })
    .sort((a, b) => a.depth - b.depth);
  const frontWallId = walls[walls.length - 1]?.id ?? "south";
  const center = project(room.x + room.width / 2, room.y + room.height / 2, 0);

  const shadowOffset = {
    x: (LIGHT_DIRECTION.y - LIGHT_DIRECTION.x) * 14,
    y: (Math.abs(LIGHT_DIRECTION.x) + Math.abs(LIGHT_DIRECTION.y)) * 12 + 6,
  };
  const shadowPoints = corners.map((point) => ({
    x: point.x + shadowOffset.x,
    y: point.y + shadowOffset.y,
  }));
  ctx.save();
  ctx.globalAlpha = 0.24;
  drawIsoPolygon(ctx, shadowPoints);
  ctx.fillStyle = "rgba(8, 15, 32, 0.92)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawIsoPolygon(ctx, corners);
  const floorGradient = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
  floorGradient.addColorStop(0, withAlpha(shiftColor(mid, 0.32), 0.97));
  floorGradient.addColorStop(0.6, withAlpha(mid, 0.94));
  floorGradient.addColorStop(1, withAlpha(shiftColor(mid, -0.18), 0.95));
  ctx.fillStyle = floorGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.68);
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.restore();

  drawIsoFloorPattern(ctx, corners, theme);

  const drawWallFixtures = (entry) => {
    const { id, geometry } = entry;
    const windows = (room.windows ?? []).filter((fixture) => fixture.wall === id);
    windows.forEach((fixture) => {
      if (id === frontWallId) {
        return;
      }
      const segment = sampleWallSegment(geometry, fixture.index, 0.18);
      if (!segment) return;
      drawIsoWindowPanel(ctx, segment, accent);
    });
    const doors = (room.doors ?? []).filter((fixture) => fixture.wall === id);
    doors.forEach((fixture) => {
      const inset = id === frontWallId ? 0.24 : 0.18;
      const segment = sampleWallSegment(geometry, fixture.index, inset);
      if (!segment) return;
      if (id === frontWallId) {
        drawIsoDoorway(ctx, segment, accent, center);
      } else {
        drawIsoDoorPanel(ctx, segment, accent);
      }
    });
  };

  walls.forEach((entry) => {
    const { geometry, brightness } = entry;
    const polygon = [geometry.bottomStart, geometry.bottomEnd, geometry.topEnd, geometry.topStart];
    ctx.save();
    drawIsoPolygon(ctx, polygon);
    const gradient = ctx.createLinearGradient(
      geometry.bottomStart.x,
      geometry.bottomStart.y,
      geometry.topStart.x,
      geometry.topStart.y
    );
    gradient.addColorStop(0, withAlpha(shiftColor(baseTone, -0.22 + brightness * 0.08), 0.97));
    gradient.addColorStop(0.65, withAlpha(shiftColor(baseTone, -0.08 + brightness * 0.2), 0.94));
    gradient.addColorStop(1, withAlpha(shiftColor(baseTone, 0.18 + brightness * 0.25), 0.9));
    ctx.fillStyle = gradient;
    ctx.fill();
    renderWallTexture(ctx, geometry, {
      tone: shiftColor(baseTone, brightness * 0.06),
      mortar: shiftColor(baseTone, -0.5),
      brightness,
    });
    drawIsoPolygon(ctx, polygon);
    ctx.strokeStyle = withAlpha(shiftColor(accent, brightness * 0.22 - 0.12), 0.52);
    ctx.lineWidth = 1.05;
    ctx.stroke();
    ctx.restore();

    drawWallFixtures(entry);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(geometry.bottomStart.x, geometry.bottomStart.y);
    ctx.lineTo(geometry.bottomEnd.x, geometry.bottomEnd.y);
    ctx.strokeStyle = withAlpha(shiftColor(accent, brightness * 0.35 + 0.12), 0.32);
    ctx.lineWidth = 0.85;
    ctx.stroke();
    ctx.restore();
  });

  ctx.save();
  drawIsoPolygon(ctx, corners);
  const interiorGlow = ctx.createRadialGradient(center.x, center.y, 8, center.x, center.y, Math.max(room.width, room.height) * 22);
  interiorGlow.addColorStop(0, withAlpha(accent, 0.28 + showcaseAnimation.pulse * 0.16));
  interiorGlow.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = interiorGlow;
  ctx.fill();
  ctx.restore();

  if (recentlyBuilt) {
    const elapsed = (state.stats?.tick ?? 0) - (room.builtAt ?? 0);
    const pulse = Math.sin((elapsed / NEW_ROOM_HIGHLIGHT_TICKS) * Math.PI) * 0.5 + 0.5;
    ctx.save();
    drawIsoPolygon(ctx, corners);
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2.2 + pulse * 1.2 + showcaseAnimation.wave * 0.8;
    ctx.strokeStyle = withAlpha(accent, 0.5 + pulse * 0.25 + showcaseAnimation.pulse * 0.18);
    ctx.stroke();
    ctx.restore();
  }

  drawIsoRoomGlyph(ctx, project, room, glyph, accent);

  const machineIds = (room.machines ?? []).filter((id) => id !== "standard-kit");
  const machineCount = Math.min(machineIds.length, 3);
  if (machineCount) {
    for (let i = 0; i < machineCount; i++) {
      const t = (i + 1) / (machineCount + 1);
      const point = sampleIsoPoint(corners, t, 0.3);
      const machineColor = getMachineDefinition(machineIds[i]).color ?? accent;
      drawIsoConsole(ctx, point, machineColor);
    }
  }

  const decorIds = (room.decorations ?? []).slice(0, 4);
  decorIds.forEach((id, index) => {
    const t = (index + 1) / (decorIds.length + 1);
    const point = sampleIsoPoint(corners, t, 0.75);
    const decor = getDecorationDefinition(id);
    const color = decor.color ?? accent;
    if (decor.isPlant) {
      drawIsoPlant(ctx, point, color);
    } else {
      drawIsoSeating(ctx, point, color);
    }
  });

  const blueprint = getBlueprint(room.type);
  const label = blueprint?.name ?? room.type;
  const labelWidth = Math.max(96, room.width * 30);
  const labelHeight = 24;
  const labelX = (corners[2].x + corners[3].x) / 2 - labelWidth / 2;
  const labelY = Math.max(corners[2].y, corners[3].y) + 12;
  ctx.save();
  drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 12);
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.45);
  ctx.stroke();
  ctx.fillStyle = "rgba(248, 250, 252, 0.96)";
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, labelX + labelWidth / 2, labelY + labelHeight / 2);
  ctx.restore();

  if (room.severityCapacity) {
    const badgeWidth = 72;
    const badgeHeight = 18;
    const badgeX = labelX + labelWidth / 2 - badgeWidth / 2;
    const badgeY = labelY - badgeHeight - 6;
    ctx.save();
    drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 9);
    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.fill();
    ctx.strokeStyle = withAlpha(accent, 0.35);
    ctx.stroke();
    ctx.fillStyle = withAlpha(accent, 0.9);
    ctx.font = "10px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`Severity ${room.severityCapacity}`, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    ctx.restore();
  }
};

const PATIENT_MARKER_RENDERERS = {
  legCast: (ctx) => {
    ctx.save();
    ctx.translate(4.4, 4.6);
    ctx.rotate(-0.22);
    drawRoundedRect(ctx, -3, -4, 6, 12, 3);
    ctx.fillStyle = "rgba(248, 250, 252, 0.95)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.75)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },
  fullCast: (ctx) => {
    ctx.save();
    ctx.translate(4.1, 2.5);
    ctx.rotate(-0.22);
    drawRoundedRect(ctx, -3, -6, 6, 16, 3);
    ctx.fillStyle = "rgba(248, 250, 252, 0.96)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.8)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2.6, -1.4);
    ctx.lineTo(2.6, 0.6);
    ctx.stroke();
    ctx.restore();
  },
  legBrace: (ctx) => {
    ctx.save();
    ctx.translate(4.2, 4.5);
    ctx.rotate(-0.18);
    drawRoundedRect(ctx, -3, -4, 5.4, 10, 2);
    ctx.fillStyle = "rgba(100, 116, 139, 0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(30, 41, 59, 0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-3, -1.4);
    ctx.lineTo(2.2, -2.1);
    ctx.moveTo(-3, 1.6);
    ctx.lineTo(2.1, 0.7);
    ctx.stroke();
    ctx.restore();
  },
  heartMonitor: (ctx) => {
    ctx.save();
    ctx.translate(0, -2.4);
    drawRoundedRect(ctx, -6.4, -2.6, 12.8, 5.4, 2.6);
    ctx.fillStyle = "rgba(30, 64, 175, 0.78)";
    ctx.fill();
    ctx.strokeStyle = "rgba(191, 219, 254, 0.85)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4.8, 0.2);
    ctx.lineTo(-2.2, -0.8);
    ctx.lineTo(-0.2, 1.4);
    ctx.lineTo(1.6, -0.6);
    ctx.lineTo(4.6, 0.4);
    ctx.strokeStyle = "rgba(248, 250, 252, 0.92)";
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  },
  headBand: (ctx) => {
    ctx.save();
    ctx.translate(0, -12.6);
    drawRoundedRect(ctx, -4.4, -1.4, 8.8, 2.8, 1.4);
    ctx.fillStyle = "rgba(248, 250, 252, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },
  burnWrap: (ctx) => {
    ctx.save();
    ctx.rotate(-0.05);
    drawRoundedRect(ctx, -6.2, -1.2, 12.4, 3.2, 1.4);
    ctx.fillStyle = "rgba(248, 250, 252, 0.78)";
    ctx.fill();
    ctx.strokeStyle = "rgba(248, 113, 113, 0.68)";
    ctx.lineWidth = 1;
    ctx.stroke();
    drawRoundedRect(ctx, -5.4, 3.1, 10.8, 3, 1.2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
  armSling: (ctx) => {
    ctx.save();
    ctx.translate(-3.8, -0.5);
    drawRoundedRect(ctx, -3.4, -1.2, 6.8, 5.8, 2.6);
    ctx.fillStyle = "rgba(226, 232, 240, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.2, -1.1);
    ctx.lineTo(4.6, -6.6);
    ctx.stroke();
    ctx.restore();
  },
  bellyWrap: (ctx) => {
    ctx.save();
    ctx.translate(0, 2.2);
    drawRoundedRect(ctx, -6.8, -1.8, 13.6, 6, 3);
    ctx.fillStyle = "rgba(254, 215, 170, 0.86)";
    ctx.fill();
    ctx.strokeStyle = "rgba(244, 114, 182, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },
  faceMask: (ctx) => {
    ctx.save();
    ctx.translate(0, -10.6);
    drawRoundedRect(ctx, -4.2, -1.1, 8.4, 4.6, 2.2);
    ctx.fillStyle = "rgba(148, 197, 255, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(30, 64, 175, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4.2, 0.1);
    ctx.lineTo(-6.1, -0.6);
    ctx.moveTo(4.2, 0.1);
    ctx.lineTo(6.1, -0.6);
    ctx.stroke();
    ctx.restore();
  },
  eyePatch: (ctx) => {
    ctx.save();
    ctx.translate(-1.7, -12.6);
    drawRoundedRect(ctx, -1.9, -1.5, 3.8, 3, 1.4);
    ctx.fillStyle = "rgba(30, 41, 59, 0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.restore();
  },
  armPort: (ctx) => {
    ctx.save();
    ctx.translate(7.6, -2.1);
    ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(59, 130, 246, 0.7)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  },
  rash: (ctx) => {
    ctx.save();
    ctx.fillStyle = "rgba(248, 113, 113, 0.68)";
    ctx.beginPath();
    ctx.arc(-3.2, -2.2, 1.2, 0, Math.PI * 2);
    ctx.arc(2.2, -1.2, 1, 0, Math.PI * 2);
    ctx.arc(0.4, 2.8, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  plaster: (ctx) => {
    ctx.save();
    ctx.translate(-2.2, -2.8);
    drawRoundedRect(ctx, -2.2, -0.9, 4.4, 1.8, 0.9);
    ctx.fillStyle = "rgba(253, 230, 138, 0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(217, 119, 6, 0.55)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  },
};

const PATIENT_AILMENT_MARKERS = {
  fractured: "legCast",
  asteroidache: "legCast",
  gravitygrind: "legCast",
  voidfracture: "fullCast",
  sprain: "legBrace",
  stiff: "legBrace",
  appendix: "bellyWrap",
  hypergly: "bellyWrap",
  warpbelly: "bellyWrap",
  stomavortex: "bellyWrap",
  spacecolic: "bellyWrap",
  lunarcramps: "bellyWrap",
  cardio: "heartMonitor",
  cardioblast: "heartMonitor",
  panic: "headBand",
  burnout: "headBand",
  neuroflash: "headBand",
  synapse: "headBand",
  brainflare: "headBand",
  soulstorm: "headBand",
  emberveil: "burnWrap",
  flareburst: "burnWrap",
  moonburn: "burnWrap",
  emberstorm: "burnWrap",
  nebularinse: "armPort",
  plasmabuild: "armPort",
  superbug: "armPort",
  toxicwave: "bellyWrap",
  quantumcells: "faceMask",
  supernova: "faceMask",
  cosmiccavity: "faceMask",
  jawsaw: "faceMask",
  galaxyglare: "eyePatch",
  nebulacurtain: "eyePatch",
  opticblast: "eyePatch",
  meteormeasles: "rash",
  solarrash: "rash",
  toybox: "plaster",
  voidmilk: "plaster",
  heartquake: "armSling",
};

const PATIENT_ROOM_MARKERS = {
  orthopedics: "legCast",
  physiotherapy: "legBrace",
  cardiology: "heartMonitor",
  neurology: "headBand",
  burn: "burnWrap",
  gastro: "bellyWrap",
  maternity: "bellyWrap",
  dialysis: "armPort",
  oncology: "faceMask",
  surgery: "armSling",
  dental: "faceMask",
  ophthalmology: "eyePatch",
  pediatrics: "plaster",
  dermatology: "rash",
  psychiatry: "headBand",
  icu: "armPort",
};

const getPatientMarkerId = (patient) => {
  if (!patient?.ailment) return null;
  const ailmentId = patient.ailment.id;
  if (ailmentId && PATIENT_AILMENT_MARKERS[ailmentId]) {
    return PATIENT_AILMENT_MARKERS[ailmentId];
  }
  const roomId = patient.ailment.room;
  if (roomId && PATIENT_ROOM_MARKERS[roomId]) {
    return PATIENT_ROOM_MARKERS[roomId];
  }
  if (patient.isEmergency) {
    return patient.ailment.severity >= 4 ? "heartMonitor" : "armSling";
  }
  return null;
};

const drawPatientSymptomMarker = (ctx, markerId) => {
  const renderer = PATIENT_MARKER_RENDERERS[markerId];
  if (renderer) {
    renderer(ctx);
  }
};

const drawIsoPatients = (ctx, project) => {
  state.patientsOnSite.forEach((patient) => {
    if (!patient.position) return;
    const point = project(patient.position.x, patient.position.y);
    ctx.save();
    ctx.translate(point.x, point.y);
    drawMoodGlow(ctx, patient.mood ?? patient.status);
    const palette = getPatientAvatarPalette(patient);
    const motion = ensureAgentMotion(patient);
    const pose = derivePoseFromMotion(motion);
    const strideSpan = Math.abs(pose.frontLeg - pose.backLeg);
    ctx.beginPath();
    ctx.ellipse(0, 8, 12 + strideSpan * 2.5, 5.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(8, 15, 32, 0.52)";
    ctx.fill();
    ctx.save();
    ctx.translate(0, -2);
    ctx.scale(0.92, 0.86);
    drawHumanFigure(ctx, palette, {
      scale: 0.9,
      pose,
      detail: { type: "patient", emergency: patient.isEmergency },
    });
    ctx.restore();

    if (patient.isEmergency) {
      ctx.save();
      ctx.translate(0, -16);
      ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(239, 68, 68, 0.92)";
      ctx.beginPath();
      ctx.arc(10, -4, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(248, 250, 252, 0.95)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8.6, -4);
      ctx.lineTo(11.4, -4);
      ctx.moveTo(10, -5.4);
      ctx.lineTo(10, -2.6);
      ctx.stroke();
      ctx.restore();
    }

    const markerId = getPatientMarkerId(patient);
    if (markerId) {
      ctx.save();
      ctx.translate(0, -12);
      drawPatientSymptomMarker(ctx, markerId);
      ctx.restore();
    }
    ctx.restore();
  });
};

const drawIsoStaff = (ctx, project) => {
  state.staffAgents.forEach((agent) => {
    if (!agent.position) return;
    const point = project(agent.position.x, agent.position.y);
    ctx.save();
    ctx.translate(point.x, point.y);
    const palette = getStaffAvatarPalette(agent);
    const motion = ensureAgentMotion(agent);
    const pose = derivePoseFromMotion(motion);
    const strideSpan = Math.abs(pose.frontLeg - pose.backLeg);
    ctx.beginPath();
    ctx.ellipse(0, 6.2, 10.8 + strideSpan * 2.2, 4.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(6, 12, 28, 0.55)";
    ctx.fill();
    ctx.save();
    ctx.translate(0, -1.5);
    ctx.scale(0.9, 0.84);
    drawHumanFigure(ctx, palette, {
      scale: 0.92,
      pose,
      detail: { type: "staff", role: agent.staff?.role },
    });
    ctx.restore();
    ctx.save();
    ctx.translate(0, -18);
    drawRoundedRect(ctx, -4.5, -4.5, 9, 9, 2.5);
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.fill();
    ctx.fillStyle = withAlpha(palette.accent, 0.9);
    ctx.font = "700 7px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((agent.staff?.role ?? "").charAt(0).toUpperCase(), 0, 0);
    ctx.restore();
    ctx.restore();
  });
};

const drawIsoAgents = (ctx, project) => {
  drawIsoPatients(ctx, project);
  drawIsoStaff(ctx, project);
};

const renderShowcaseCanvas = (ctx) => {
  const width = getGridWidth() * CANVAS_CELL;
  const height = getGridHeight() * CANVAS_CELL;
  ctx.clearRect(0, 0, width, height);

  const { pulse, wave, time } = showcaseAnimation;

  ctx.save();
  const centerX = width / 2;
  const centerY = height / 2;
  ctx.translate(centerX, centerY);
  ctx.scale(showcaseZoom, showcaseZoom);
  ctx.translate(-centerX + showcasePanX, -centerY + showcasePanY);

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, `rgba(6, 25, 48, ${0.82 + pulse * 0.14})`);
  background.addColorStop(0.65, `rgba(9, 32, 58, ${0.9 + wave * 0.06})`);
  background.addColorStop(1, "rgba(8, 18, 34, 0.98)");
  ctx.fillStyle = background;
  ctx.fillRect(-width, -height, width * 3, height * 3);

  const aurora = ctx.createLinearGradient(0, 0, width, height);
  aurora.addColorStop(0, `rgba(56, 189, 248, ${0.1 + wave * 0.12})`);
  aurora.addColorStop(1, "rgba(14, 165, 233, 0)");
  ctx.fillStyle = aurora;
  ctx.fillRect(-width, -height, width * 3, height * 3);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const pulseGlow = ctx.createRadialGradient(width / 2, height * 0.72, 48, width / 2, height, width * 0.75);
  pulseGlow.addColorStop(0, `rgba(59, 130, 246, ${0.05 + pulse * 0.12})`);
  pulseGlow.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = pulseGlow;
  ctx.fillRect(-width, height * 0.45, width * 3, height * 0.75);
  ctx.restore();

  if (wave > 0.2) {
    ctx.save();
    ctx.globalAlpha = 0.12 + pulse * 0.08;
    ctx.strokeStyle = "rgba(148, 197, 255, 0.25)";
    ctx.lineWidth = 1.2;
    const drift = (time * 12) % width;
    ctx.beginPath();
    ctx.moveTo(-width * 2 + drift, height * 0.62);
    ctx.lineTo(width * 2 + drift, height * 0.52);
    ctx.stroke();
    ctx.restore();
  }

  const { project } = getIsoMapper();

  const ownedParcels = state.properties.filter((parcel) => parcel.owned);
  ownedParcels.forEach((parcel) => drawIsoParcelFloor(ctx, project, parcel));

  state.shells.forEach((shell) => drawIsoCampusShell(ctx, project, shell));

  const previewOverlay = buildPreviewState.active
    ? {
        x: buildPreviewState.x,
        y: buildPreviewState.y,
        width: buildPreviewState.width,
        height: buildPreviewState.height,
        valid: buildPreviewState.valid,
      }
    : buildHoverState.active
    ? {
        x: buildHoverState.x,
        y: buildHoverState.y,
        width: buildHoverState.width,
        height: buildHoverState.height,
        valid: buildHoverState.valid,
      }
    : null;

  if (previewOverlay) {
    drawIsoBuildOverlay(ctx, project, previewOverlay);
  }

  const sortedRooms = [...state.rooms].sort((a, b) => {
    const centerA = project(a.x + a.width / 2, a.y + a.height / 2, 0);
    const centerB = project(b.x + b.width / 2, b.y + b.height / 2, 0);
    return (centerA.depth ?? 0) - (centerB.depth ?? 0);
  });
  sortedRooms.forEach((room) => drawIsoRoomShowcase(ctx, project, room));

  drawIsoAgents(ctx, project);

  state.properties
    .filter((parcel) => !parcel.owned)
    .forEach((parcel) => drawIsoLockedParcel(ctx, project, parcel));

  ctx.restore();

  ctx.save();
  const floorGlow = ctx.createLinearGradient(0, height - 140, 0, height);
  floorGlow.addColorStop(0, "rgba(15, 23, 42, 0)");
  floorGlow.addColorStop(1, "rgba(8, 47, 73, 0.65)");
  ctx.fillStyle = floorGlow;
  ctx.fillRect(0, height - 140, width, 140);
  ctx.restore();

  drawPatientQueue(ctx);
};

const renderHospitalCanvas = () => {
  if (!hospitalCtx) return;
  if (viewMode === "showcase") {
    renderShowcaseCanvas(hospitalCtx);
  } else {
    renderBlueprintCanvas(hospitalCtx);
  }
};

const updateViewModeButtons = () => {
  if (elements.hospitalCanvas) {
    elements.hospitalCanvas.setAttribute("data-view-mode", viewMode);
  }
  elements.viewButtons?.forEach((button) => {
    const isActive = button.dataset.viewMode === viewMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
};

const setViewMode = (mode, { persist = true } = {}) => {
  if (!mode || viewMode === mode) {
    updateViewModeButtons();
    return;
  }
  viewMode = mode;
  if (viewMode !== "showcase") {
    endShowcasePan();
  } else {
    constrainShowcasePan();
  }
  if (persist && isStorageAvailable) {
    try {
      storage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch (error) {
      // ignore storage failures silently
    }
  }
  updateViewModeButtons();
  updateShowcaseZoomIndicator();
  renderHospitalCanvas();
};

const setupViewToggle = () => {
  if (isStorageAvailable) {
    const savedMode = storage.getItem(VIEW_MODE_STORAGE_KEY);
    if (savedMode === "blueprint" || savedMode === "showcase") {
      viewMode = savedMode;
    }
  }
  updateViewModeButtons();
  elements.viewButtons?.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.viewMode;
      if (mode) {
        setViewMode(mode);
      }
    });
  });
};

const setupZoomControls = () => {
  if (elements.zoom?.reset) {
    elements.zoom.reset.addEventListener("click", resetShowcaseView);
  }
  updateShowcaseZoomIndicator();
};

const updateStats = () => {
  const {
    day,
    cash,
    reputation,
    patientsTreated,
    cleanliness,
    efficiency,
    morale,
    grounds,
    plantCare,
    environmentScore,
    welfareScore,
  } = state.stats;
  elements.statDay.textContent = day;
  elements.statCash.textContent = formatCurrency(cash);
  elements.statReputation.textContent = reputation;
  elements.statTreated.textContent = patientsTreated;
  elements.meters.cleanliness.value = cleanliness;
  elements.meters.efficiency.value = efficiency;
  elements.meters.morale.value = morale;
  if (elements.meters.grounds) {
    elements.meters.grounds.value = grounds;
  }
  if (elements.meters.plant) {
    elements.meters.plant.value = plantCare;
  }
  if (elements.overviewSummary) {
    if (elements.overviewSummary.cleanliness) {
      elements.overviewSummary.cleanliness.textContent = `${Math.round(cleanliness)}%`;
    }
    if (elements.overviewSummary.efficiency) {
      elements.overviewSummary.efficiency.textContent = `${Math.round(efficiency)}%`;
    }
    if (elements.overviewSummary.morale) {
      elements.overviewSummary.morale.textContent = `${Math.round(morale)}%`;
    }
    if (elements.overviewSummary.grounds) {
      elements.overviewSummary.grounds.textContent = `${Math.round(grounds)}%`;
    }
    if (elements.overviewSummary.plant) {
      elements.overviewSummary.plant.textContent = `${Math.round(plantCare)}%`;
    }
  }
  if (elements.statEnvironment) {
    elements.statEnvironment.textContent = Math.round(environmentScore);
  }
  if (elements.statWelfare) {
    elements.statWelfare.textContent = Math.round(welfareScore);
  }
  updatePropertyPurchaseButtons();
};

const syncQueuePositions = () => {
  state.queue.forEach((patient, index) => {
    if (!patient.position) {
      patient.position = { ...getEntrancePosition() };
    }
    if (["moving-to-room", "leaving", "in-treatment"].includes(patient.status)) {
      return;
    }
    const slot = getQueueSlotPosition(index);
    patient.queueIndex = index;
    if (patient.intent?.type === "roam") {
      return;
    }
    if (distanceBetween(patient.position, slot) > 0.05) {
      patient.path = createPath(patient.position, slot);
    } else {
      patient.position = { ...slot };
    }
    if (patient.status === "arriving" && distanceBetween(patient.position, slot) <= 0.05) {
      patient.status = "queuing";
    }
  });
};

const findPatientRoamSpot = (patient) => {
  const queueIndexRaw = patient.queueIndex ?? state.queue.indexOf(patient);
  const queueIndex = queueIndexRaw >= 0 ? queueIndexRaw : 0;
  const slot = getQueueSlotPosition(queueIndex);
  const baseX = clamp(Math.round(slot.x), 0, getGridWidth() - 1);
  const baseY = clamp(Math.round(slot.y), 0, getGridHeight() - 1);
  const corridorRow = clamp(Math.round(getCorridorY()), 0, getGridHeight() - 1);
  const radius = 4 + Math.min(queueIndex, 6);
  const candidates = [];
  for (let y = Math.max(0, baseY - radius); y <= Math.min(getGridHeight() - 1, baseY + radius); y++) {
    if (Math.abs(y - corridorRow) > 2) continue;
    for (let x = Math.max(0, baseX - radius); x <= Math.min(getGridWidth() - 1, baseX + radius); x++) {
      if (!isTileUnlocked(x, y)) continue;
      if (state.grid[y][x]) continue;
      const worldPoint = { x: x + 0.5, y: y + 0.5 };
      const tooClose = state.patientsOnSite.some(
        (other) => other !== patient && distanceBetween(other.position, worldPoint) < 0.6
      );
      if (tooClose) continue;
      const distance = distanceBetween(slot, worldPoint);
      candidates.push({ point: worldPoint, distance });
    }
  }
  if (!candidates.length) {
    return null;
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const sample = candidates.slice(0, Math.min(4, candidates.length));
  const pick = sample[Math.floor(Math.random() * sample.length)];
  return pick ? pick.point : null;
};

const updatePatientIntelligence = (patient, deltaSeconds) => {
  if (patient.status !== "queuing") {
    patient.intent = null;
    return;
  }
  if (patient.intent?.type === "roam") {
    if (patient.path?.length) {
      return;
    }
    patient.intent.waitTimer = (patient.intent.waitTimer ?? (1.5 + Math.random() * 2.5)) - deltaSeconds;
    if (patient.intent.waitTimer <= 0) {
      const slot = getQueueSlotPosition(patient.queueIndex ?? 0);
      patient.intent = { type: "return" };
      patient.path = createPath(patient.position, slot);
      patient.mood = patient.patience < 35 ? "anxious" : "focused";
      patient.brainCooldown = 6 + Math.random() * 6;
    }
    return;
  }
  if (patient.intent?.type === "return") {
    if (!patient.path?.length) {
      patient.intent = null;
      patient.mood = patient.patience < 40 ? "uneasy" : "calm";
      patient.brainCooldown = 5 + Math.random() * 5;
    }
    return;
  }
  patient.brainCooldown = Math.max(0, (patient.brainCooldown ?? 0) - deltaSeconds);
  if (patient.brainCooldown > 0) {
    return;
  }
  patient.brainCooldown = 6 + Math.random() * 6;
  const queueIndexRaw = patient.queueIndex ?? state.queue.indexOf(patient);
  const queueIndex = queueIndexRaw >= 0 ? queueIndexRaw : 0;
  const longQueue = state.queue.length > 2 && queueIndex >= 2;
  const patienceLow = patient.patience < 45;
  if ((longQueue || patienceLow) && Math.random() < 0.55) {
    const roamSpot = findPatientRoamSpot(patient);
    if (roamSpot) {
      patient.intent = { type: "roam", target: roamSpot, waitTimer: null };
      patient.path = createPath(patient.position, roamSpot);
      patient.mood = patienceLow ? "anxious" : "restless";
      return;
    }
  }
  if (patienceLow) {
    patient.mood = "impatient";
  } else if (Math.random() < 0.2) {
    patient.mood = "bored";
  }
};

const findPatientById = (id) => {
  if (id == null) return null;
  return (
    state.patientsOnSite.find((patient) => patient.id === id) ??
    state.queue.find((patient) => patient.id === id) ??
    state.activePatients.find((patient) => patient.id === id) ??
    null
  );
};

const getSelectedPatient = () => findPatientById(selectedPatientId);

const getRoomDisplayName = (roomType) => {
  if (!roomType) return "treatment room";
  const blueprint = getBlueprint(roomType);
  return blueprint?.name ?? roomType;
};

const formatPatientStatus = (patient) => {
  switch (patient.status) {
    case "arriving":
      return "Checking in";
    case "queuing": {
      const index = patient.queueIndex ?? state.queue.indexOf(patient);
      if (index > 0) {
        return `Waiting • ${index} ahead`;
      }
      if (index === 0) {
        return "Next in line";
      }
      return "Waiting in queue";
    }
    case "moving-to-room": {
      const room = state.rooms.find((entry) => entry.id === patient.targetRoomId);
      return `Heading to ${getRoomDisplayName(room?.type ?? patient.ailment?.room)}`;
    }
    case "in-treatment": {
      const room = state.rooms.find((entry) => entry.id === patient.targetRoomId);
      return `In treatment • ${getRoomDisplayName(room?.type ?? patient.ailment?.room)}`;
    }
    case "leaving":
      return "Leaving hospital";
    default:
      return patient.status ? patient.status.replace(/-/g, " ") : "Waiting";
  }
};

const buildPatientNotes = (patient) => {
  if (!patient) return "";
  if (patient.status === "in-treatment") {
    const room = state.rooms.find((entry) => entry.id === patient.targetRoomId);
    return `Currently receiving care inside ${getRoomDisplayName(room?.type ?? patient.ailment?.room)}.`;
  }
  if (patient.status === "moving-to-room") {
    const room = state.rooms.find((entry) => entry.id === patient.targetRoomId);
    return `Walking to ${getRoomDisplayName(room?.type ?? patient.ailment?.room)} for treatment.`;
  }
  if (patient.status === "leaving") {
    return "Heading home after their visit.";
  }
  if (patient.intent?.type === "roam") {
    return "Stretching their legs around the lobby to stay calm.";
  }
  if (patient.intent?.type === "return") {
    return "Rejoining the queue after a short walk.";
  }
  if (patient.status === "queuing") {
    const index = patient.queueIndex ?? state.queue.indexOf(patient);
    if (index > 1) {
      return `Passing the time with ${index} patients ahead of them.`;
    }
    if (index === 1) {
      return "Almost ready for the next room.";
    }
    return "Standing by for their call into the room.";
  }
  if (patient.status === "arriving") {
    return "Checking in with reception.";
  }
  return "Exploring the lobby while they wait.";
};

const refreshQueueSelectionStyles = () => {
  if (!elements.patientQueue) return;
  const items = elements.patientQueue.querySelectorAll("li[data-patient-id]");
  items.forEach((item) => {
    const id = Number.parseInt(item.dataset.patientId, 10);
    item.classList.toggle("selected", id === selectedPatientId);
  });
};

const updatePatientDetail = () => {
  const detail = elements.patientDetail;
  if (!detail?.panel) return;
  const patient = getSelectedPatient();
  if (!patient) {
    detail.panel.hidden = true;
    return;
  }
  seedPatientVitals(patient);
  detail.panel.hidden = false;
  detail.name.textContent = patient.name;
  detail.status.textContent = formatPatientStatus(patient);
  const moodLabel = (patient.mood ?? "calm").replace(/\b\w/g, (char) => char.toUpperCase());
  if (detail.mood) {
    detail.mood.textContent = moodLabel;
  }
  const profileColor = patient.profile?.color ?? "#f8fafc";
  if (detail.profile) {
    detail.profile.textContent = patient.profile?.label ?? "Standard";
    detail.profile.style.color = profileColor;
    detail.profile.style.borderColor = withAlpha(profileColor, 0.55);
    detail.profile.style.backgroundColor = withAlpha(profileColor, 0.18);
  }
  const healthValue = Math.round(clamp(patient.health ?? 0, 0, 100));
  if (detail.healthBar) {
    detail.healthBar.value = healthValue;
  }
  if (detail.healthValue) {
    detail.healthValue.textContent = `${healthValue}%`;
  }
  const diagnosisValue = Math.round(clamp(patient.diagnosisProgress ?? 0, 0, 100));
  if (detail.diagnosisBar) {
    detail.diagnosisBar.value = diagnosisValue;
  }
  if (detail.diagnosisValue) {
    detail.diagnosisValue.textContent = `${diagnosisValue}%`;
  }
  const patienceValue = Math.round(Math.max(0, patient.patience ?? 0));
  if (detail.patienceBar) {
    detail.patienceBar.value = patienceValue;
  }
  if (detail.patienceValue) {
    detail.patienceValue.textContent = patienceValue;
  }
  if (detail.ailment) {
    detail.ailment.textContent = patient.ailment?.name ?? "Unknown condition";
  }
  let queueSummary = "";
  if (patient.status === "queuing" || patient.status === "arriving") {
    const index = patient.queueIndex ?? state.queue.indexOf(patient);
    if (index >= 0) {
      queueSummary = `Queue position ${index + 1} of ${state.queue.length}`;
    } else {
      queueSummary = "Waiting for placement in the queue";
    }
  } else if (patient.status === "moving-to-room") {
    queueSummary = `Walking to ${getRoomDisplayName(patient.ailment?.room)}`;
  } else if (patient.status === "leaving") {
    queueSummary = "Exiting the hospital";
  }
  if (detail.queue) {
    detail.queue.textContent = queueSummary;
    detail.queue.hidden = !queueSummary;
  }
  const curesList = detail.cures;
  if (curesList) {
    curesList.innerHTML = "";
    const history = Array.isArray(patient.cureHistory) ? patient.cureHistory : [];
    if (!history.length) {
      if (detail.curesEmpty) {
        detail.curesEmpty.hidden = false;
      }
    } else {
      history.slice(0, 4).forEach((entry) => {
        const item = document.createElement("li");
        const method = entry.method ? ` • ${entry.method}` : "";
        const dayLabel = entry.day ? ` • Day ${entry.day}` : "";
        item.textContent = `${entry.label ?? "Treatment"} • ¤${formatCurrency(entry.charge ?? 0)}${method}${dayLabel}`;
        curesList.appendChild(item);
      });
      if (detail.curesEmpty) {
        detail.curesEmpty.hidden = true;
      }
    }
  }
  if (detail.notes) {
    detail.notes.textContent = buildPatientNotes(patient);
  }
  detail.panel.setAttribute("aria-label", `${patient.name} status card`);
  refreshQueueSelectionStyles();
};

const setSelectedPatient = (patient) => {
  if (!patient) {
    clearSelectedPatient();
    return;
  }
  selectedPatientId = patient.id;
  seedPatientVitals(patient);
  updatePatientDetail();
};

const clearSelectedPatient = () => {
  selectedPatientId = null;
  if (elements.patientDetail?.panel) {
    elements.patientDetail.panel.hidden = true;
  }
  refreshQueueSelectionStyles();
};

const maintainSelectedPatient = () => {
  if (!selectedPatientId) return;
  const patient = findPatientById(selectedPatientId);
  if (!patient) {
    clearSelectedPatient();
  }
};

const updateQueue = () => {
  elements.patientQueue.innerHTML = "";
  state.queue.forEach((patient) => {
    const li = document.createElement("li");
    if (patient.isEmergency) {
      li.classList.add("emergency");
    }
    li.dataset.patientId = String(patient.id);
    li.tabIndex = 0;
    const header = document.createElement("div");
    header.className = "queue-header";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = patient.name;
    const ailmentSpan = document.createElement("span");
    ailmentSpan.textContent = patient.ailment.name;
    header.append(nameSpan, ailmentSpan);

    const meta = document.createElement("div");
    meta.className = "queue-meta";

    const profileBadge = document.createElement("span");
    profileBadge.className = "queue-badge";
    profileBadge.textContent = patient.profile.label;
    profileBadge.style.color = patient.profile.color;
    meta.appendChild(profileBadge);

    if (patient.isEmergency) {
      const emergencyBadge = document.createElement("span");
      emergencyBadge.className = "queue-badge";
      emergencyBadge.textContent = "Emergency";
      emergencyBadge.style.color = "#ef4444";
      meta.appendChild(emergencyBadge);
    }

    const patience = document.createElement("span");
    patience.textContent = `Patience ${Math.max(0, Math.round(patient.patience))}`;
    meta.appendChild(patience);

    const mood = document.createElement("span");
    mood.className = "queue-mood";
    const intentLabel =
      patient.intent?.type === "roam"
        ? "exploring"
        : patient.intent?.type === "return"
        ? "rejoining"
        : null;
    mood.textContent = intentLabel ? `Mood ${patient.mood} • ${intentLabel}` : `Mood ${patient.mood}`;
    meta.appendChild(mood);

    const estimate = document.createElement("span");
    const preview = getBillingPreview(patient);
    estimate.textContent = `Charge ¤${formatCurrency(preview.charge)} • ${preview.methodLabel}`;
    const tooltipParts = [`Immediate ¤${formatCurrency(preview.netCash)}`];
    if (preview.receivable) {
      tooltipParts.push(`Deferred ¤${formatCurrency(preview.receivable)}`);
    }
    if (preview.financeFee) {
      tooltipParts.push(`Fee ¤${formatCurrency(preview.financeFee)}`);
    }
    estimate.title = tooltipParts.join(" • ");
    meta.appendChild(estimate);

    li.append(header, meta);
    li.addEventListener("click", () => setSelectedPatient(patient));
    li.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setSelectedPatient(patient);
      }
    });
    if (patient.id === selectedPatientId) {
      li.classList.add("selected");
    }
    elements.patientQueue.appendChild(li);
  });
  refreshQueueSelectionStyles();
  syncQueuePositions();
  renderHospitalCanvas();
  if (selectedPatientId) {
    updatePatientDetail();
  }
};

const updateObjectives = () => {
  elements.objectives.innerHTML = "";
  state.objectives.forEach((obj) => {
    const li = document.createElement("li");
    li.textContent = obj.text;
    if (obj.completed) {
      li.classList.add("completed");
      li.textContent += " ✔";
    }
    elements.objectives.appendChild(li);
  });
};

const describeParcelSize = (parcel) => `${parcel.width}×${parcel.height} units`;

const formatParcelExtent = (parcel) => {
  const startColumn = AXIS_LETTERS[parcel.x] ?? parcel.x + 1;
  const endColumn = AXIS_LETTERS[parcel.x + parcel.width - 1] ?? parcel.x + parcel.width;
  const startRow = parcel.y + 1;
  const endRow = parcel.y + parcel.height;
  return `${startColumn}${startRow} – ${endColumn}${endRow}`;
};

const renderLotOverviewList = () => {
  const list = elements.lotOverview?.list;
  if (!list) return;
  list.innerHTML = "";
  state.properties.forEach((parcel) => {
    const item = document.createElement("li");
    item.className = "lot-overview-item";
    const statusClass = parcel.owned ? "owned" : "locked";
    const statusLabel = parcel.owned
      ? parcel.cost > 0
        ? `Owned • ¤${formatCurrency(parcel.cost)}`
        : "Owned starter parcel"
      : `For sale • ¤${formatCurrency(parcel.cost)}`;
    item.innerHTML = `
      <header>
        <h4>${parcel.name}</h4>
        <span class="lot-status-badge ${statusClass}">${statusLabel}</span>
      </header>
      <p>${parcel.description}</p>
      <dl>
        <div><dt>Footprint</dt><dd>${describeParcelSize(parcel)}</dd></div>
        <div><dt>Span</dt><dd>${formatParcelExtent(parcel)}</dd></div>
      </dl>
    `;
    list.appendChild(item);
  });
};

const renderOwnedProperties = () => {
  if (!elements.property?.owned) return;
  const list = elements.property.owned;
  list.innerHTML = "";
  const owned = getOwnedProperties();
  if (!owned.length) {
    const empty = document.createElement("li");
    empty.textContent = "No parcels owned.";
    list.appendChild(empty);
  } else {
    owned.forEach((parcel) => {
      const item = document.createElement("li");
      item.innerHTML = `<strong>${parcel.name}</strong><span>${describeParcelSize(parcel)}</span>`;
      list.appendChild(item);
    });
  }
  renderLotOverviewList();
};

const renderPropertyMarket = () => {
  if (!elements.property?.market) return;
  const market = elements.property.market;
  market.innerHTML = "";
  const forSale = state.properties.filter((parcel) => !parcel.owned);
  if (!forSale.length) {
    const done = document.createElement("p");
    done.className = "property-complete";
    done.textContent = "All grounds have been purchased.";
    market.appendChild(done);
  } else {
    forSale.forEach((parcel) => {
      const card = document.createElement("article");
      card.className = "property-card";
      const heading = document.createElement("header");
      heading.innerHTML = `<h4>${parcel.name}</h4><span>${describeParcelSize(parcel)}</span>`;
      const body = document.createElement("p");
      body.textContent = parcel.description;
      const cta = document.createElement("button");
      cta.type = "button";
      cta.textContent = `Purchase for ¤${formatCurrency(parcel.cost)}`;
      cta.dataset.parcelId = parcel.id;
      cta.disabled = state.stats.cash < parcel.cost;
      cta.addEventListener("click", () => purchaseProperty(parcel.id));
      card.append(heading, body, cta);
      market.appendChild(card);
    });
  }
  updatePropertyPurchaseButtons();
  renderLotOverviewList();
};

const updatePropertyPurchaseButtons = () => {
  if (!elements.property?.market) return;
  elements.property.market.querySelectorAll("button[data-parcel-id]").forEach((button) => {
    const parcel = getPropertyById(button.dataset.parcelId);
    if (parcel) {
      button.disabled = parcel.owned || state.stats.cash < parcel.cost;
    }
  });
};

const purchaseProperty = (parcelId) => {
  const parcel = getPropertyById(parcelId);
  if (!parcel || parcel.owned) return;
  if (state.stats.cash < parcel.cost) {
    logEvent("Not enough cash to purchase that land parcel.", "negative");
    return;
  }
  parcel.owned = true;
  state.stats.cash -= parcel.cost;
  state.stats.expensesToday += parcel.cost;
  const gridExpanded = ensureGridCapacity();
  renderOwnedProperties();
  renderPropertyMarket();
  updateStats();
  updatePropertyPurchaseButtons();
  if (gridExpanded && elements.grid) {
    setupGrid();
  }
  setupCanvas();
  updateGrid();
  renderHospitalCanvas();
  updateBuildGuidance();
  const coord = `${AXIS_LETTERS[parcel.x] ?? parcel.x + 1}${parcel.y + 1}`;
  logEvent(
    `${parcel.name} purchased for ¤${formatCurrency(parcel.cost)}. New build area unlocks from ${coord}.`,
    "positive"
  );
};

const renderBuildMenuRooms = () => {
  const container = elements.buildMenuPanels?.rooms ?? elements.buildOptions;
  if (!container) return;
  container.innerHTML = "";
  roomCatalog.forEach((room) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.room = room.id;
    button.className = "build-card";
    const art = renderEngine.createRoomCardArt(room.id);
    const roles = room.roleRequired?.length
      ? room.roleRequired.map(formatStaffRole).join(", ")
      : "No staff required";
    const body = document.createElement("div");
    body.className = "build-card__body";
    const title = document.createElement("strong");
    title.textContent = room.name;
    const roleLabel = document.createElement("span");
    roleLabel.className = "build-card__roles";
    roleLabel.textContent = roles;
    const desc = document.createElement("p");
    desc.textContent = room.description;
    body.append(title, roleLabel, desc);
    const cost = document.createElement("span");
    cost.className = "build-card__cost";
    cost.textContent = `¤${formatCurrency(room.cost)}`;
    button.append(art, body, cost);
    button.addEventListener("click", () => {
      selectedRoom = room;
      setDesignerBlueprint(room, { resetSelections: true });
      highlightBuildSelection(room.id);
      updateBuildGuidance();
    });
    if (!designerState.editingRoomId && (selectedRoom?.id === room.id || designerState.blueprint?.id === room.id)) {
      button.classList.add("selected");
    }
    container.appendChild(button);
  });
  renderLiveBuildPalette();
};

const renderLiveBuildPalette = () => {
  const palette = elements.liveBuild?.palette;
  if (!palette) return;
  palette.innerHTML = "";
  roomCatalog.forEach((room) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.room = room.id;
    button.className = "live-build-room";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", "false");
    button.setAttribute("aria-label", `${room.name} blueprint`);
    const art = renderEngine.createRoomCardArt(room.id);
    const label = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = room.name;
    const meta = document.createElement("span");
    meta.textContent = `¤${formatCurrency(room.cost)}`;
    label.append(title, meta);
    button.append(art, label);
    button.addEventListener("click", () => {
      selectedRoom = room;
      setDesignerBlueprint(room, { resetSelections: true });
      highlightBuildSelection(room.id);
      updateBuildGuidance();
    });
    if (!designerState.editingRoomId && (selectedRoom?.id === room.id || designerState.blueprint?.id === room.id)) {
      button.classList.add("selected");
      button.setAttribute("aria-checked", "true");
    }
    palette.appendChild(button);
  });
};

const renderBuildMenuStructure = () => {
  const container = elements.buildMenuPanels?.structure;
  if (!container) return;
  container.innerHTML = "";

  if (!state.rooms.length) {
    const empty = document.createElement("p");
    empty.className = "structure-empty";
    empty.textContent = "Construct a room to manage doors and windows.";
    container.appendChild(empty);
    return;
  }

  let activeRoom = getActiveInteriorRoom();
  if (!activeRoom) {
    const firstRoom = state.rooms[0];
    if (firstRoom) {
      activeRoom = setActiveInteriorRoom(firstRoom.id);
    }
  }
  activeRoom = ensureRoomStructure(activeRoom);
  if (!activeRoom) {
    const empty = document.createElement("p");
    empty.className = "structure-empty";
    empty.textContent = "Select a room to adjust its doors and windows.";
    container.appendChild(empty);
    return;
  }

  const selector = document.createElement("div");
  selector.className = "structure-room-select";
  const selectorLabel = document.createElement("label");
  selectorLabel.setAttribute("for", "structure-room-select");
  selectorLabel.textContent = "Active room";
  const selectorControl = document.createElement("select");
  selectorControl.id = "structure-room-select";
  state.rooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room.id;
    const blueprint = getBlueprint(room.type);
    const coord = `${AXIS_LETTERS[room.x] ?? room.x + 1}${room.y + 1}`;
    const status = !isRoomWallsClosed(room)
      ? " – walls open"
      : !room.doorInstalled
      ? " – door needed"
      : "";
    option.textContent = `${blueprint?.name ?? room.type} • ${room.width}×${room.height} @ ${coord}${status}`;
    if (room.id === activeRoom.id) {
      option.selected = true;
    }
    selectorControl.appendChild(option);
  });
  selectorControl.addEventListener("change", (event) => {
    setActiveInteriorRoom(event.target.value);
    renderBuildMenuStructure();
    renderBuildMenuInteriors();
  });
  selector.append(selectorLabel, selectorControl);
  container.appendChild(selector);

  const status = document.createElement("p");
  status.className = "structure-status";
  if (!isRoomWallsClosed(activeRoom)) {
    status.textContent = "Complete the room footprint to enable door and window placement.";
    container.appendChild(status);
    return;
  }
  if (!activeRoom.doorInstalled) {
    status.textContent = "Install a door along the front wall to complete the room.";
  } else {
    status.textContent = "Door installed. Add windows or continue to the Interiors tab for styling.";
  }
  container.appendChild(status);

  const renderStructureList = (list, fixtures, onRemove) => {
    if (!fixtures.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "structure-list__empty";
      emptyItem.textContent = "No entries yet.";
      list.appendChild(emptyItem);
      return;
    }
    fixtures.forEach((fixture, index) => {
      const item = document.createElement("li");
      item.className = "structure-list__item";
      const label = document.createElement("span");
      label.textContent = describeStructureLocation(activeRoom, fixture);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "structure-list__remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => onRemove(index));
      item.append(label, remove);
      list.appendChild(item);
    });
  };

  const doorSection = document.createElement("section");
  doorSection.className = "structure-section";
  const doorHeader = document.createElement("div");
  doorHeader.className = "structure-section__header";
  const doorTitle = document.createElement("h4");
  doorTitle.textContent = "Doors";
  const doorButton = document.createElement("button");
  doorButton.type = "button";
  doorButton.className = "structure-section__action";
  doorButton.textContent = "Add door";
  if (isStructurePlacementActive() && buildFlowState.mode === "placing-door" && buildFlowState.activeRoomId === activeRoom.id) {
    doorButton.disabled = true;
  }
  doorButton.addEventListener("click", () => {
    setActiveInteriorRoom(activeRoom.id);
    setStructurePlacementMode("placing-door", activeRoom.id);
    renderBuildMenuStructure();
  });
  doorHeader.append(doorTitle, doorButton);
  const doorList = document.createElement("ul");
  doorList.className = "structure-list";
  renderStructureList(doorList, activeRoom.doors ?? [], (index) => {
    const removed = activeRoom.doors.splice(index, 1)[0];
    activeRoom.doorInstalled = activeRoom.doors.length > 0;
    renderHospitalCanvas();
    renderBuildMenuStructure();
    renderBuildMenuInteriors();
    recalculateAmbience();
    updateStats();
    updateBuildTabStates();
    if (removed) {
      const blueprint = getBlueprint(activeRoom.type);
      logEvent(
        `${blueprint?.name ?? "Room"} door removed from ${describeStructureLocation(activeRoom, removed)}.`,
        "neutral"
      );
    }
    if (!activeRoom.doorInstalled) {
      setStructurePlacementMode("placing-door", activeRoom.id);
      setBuildMenuTab("structure");
    } else {
      updateBuildGuidance();
    }
  });
  doorSection.append(doorHeader, doorList);
  container.appendChild(doorSection);

  const windowSection = document.createElement("section");
  windowSection.className = "structure-section";
  const windowHeader = document.createElement("div");
  windowHeader.className = "structure-section__header";
  const windowTitle = document.createElement("h4");
  windowTitle.textContent = "Windows";
  const windowButton = document.createElement("button");
  windowButton.type = "button";
  windowButton.className = "structure-section__action";
  windowButton.textContent = "Add window";
  if (isStructurePlacementActive() && buildFlowState.mode === "placing-window" && buildFlowState.activeRoomId === activeRoom.id) {
    windowButton.disabled = true;
  }
  windowButton.addEventListener("click", () => {
    setActiveInteriorRoom(activeRoom.id);
    setStructurePlacementMode("placing-window", activeRoom.id);
    renderBuildMenuStructure();
  });
  windowHeader.append(windowTitle, windowButton);
  const windowList = document.createElement("ul");
  windowList.className = "structure-list";
  renderStructureList(windowList, activeRoom.windows ?? [], (index) => {
    const removed = activeRoom.windows.splice(index, 1)[0];
    renderHospitalCanvas();
    renderBuildMenuStructure();
    if (removed) {
      const blueprint = getBlueprint(activeRoom.type);
      logEvent(
        `${blueprint?.name ?? "Room"} window removed from ${describeStructureLocation(activeRoom, removed)}.`,
        "neutral"
      );
    }
  });
  windowSection.append(windowHeader, windowList);
  container.appendChild(windowSection);

  if (!activeRoom.doorInstalled) {
    const lockNote = document.createElement("p");
    lockNote.className = "structure-empty";
    lockNote.textContent = "Install a door to unlock interior styling options.";
    container.appendChild(lockNote);
  }
};

const renderBuildMenuInteriors = () => {
  const container = elements.buildMenuPanels?.interiors;
  if (!container) return;
  container.innerHTML = "";

  const completedRooms = state.rooms
    .map((room) => ensureRoomStructure(room))
    .filter((room) => isRoomReadyForInterior(room));

  if (!completedRooms.length) {
    const empty = document.createElement("p");
    empty.className = "structure-empty";
    empty.textContent = "Finish a room with a door to unlock interior customization.";
    container.appendChild(empty);
    return;
  }

  let activeRoom = getActiveInteriorRoom();
  if (!isRoomReadyForInterior(activeRoom)) {
    activeRoom = setActiveInteriorRoom(completedRooms[0].id);
  }
  activeRoom = ensureRoomStructure(activeRoom);
  if (!activeRoom || !isRoomReadyForInterior(activeRoom)) {
    const empty = document.createElement("p");
    empty.className = "structure-empty";
    empty.textContent = "Select a completed room to adjust its interior.";
    container.appendChild(empty);
    return;
  }

  designerState.interiorId = activeRoom.interiorId ?? designerState.interiorId;
  if (elements.designer.theme) {
    elements.designer.theme.value = designerState.interiorId;
  }

  const selector = document.createElement("div");
  selector.className = "structure-room-select";
  const selectorLabel = document.createElement("label");
  selectorLabel.setAttribute("for", "interior-room-select");
  selectorLabel.textContent = "Interior room";
  const selectorControl = document.createElement("select");
  selectorControl.id = "interior-room-select";
  completedRooms.forEach((room) => {
    const option = document.createElement("option");
    option.value = room.id;
    const blueprint = getBlueprint(room.type);
    const coord = `${AXIS_LETTERS[room.x] ?? room.x + 1}${room.y + 1}`;
    option.textContent = `${blueprint?.name ?? room.type} • ${room.width}×${room.height} @ ${coord}`;
    if (room.id === activeRoom.id) {
      option.selected = true;
    }
    selectorControl.appendChild(option);
  });
  selectorControl.addEventListener("change", (event) => {
    setActiveInteriorRoom(event.target.value);
    renderBuildMenuInteriors();
  });
  selector.append(selectorLabel, selectorControl);
  container.appendChild(selector);

  const status = document.createElement("p");
  status.className = "structure-status";
  status.textContent = "Interior ready. Apply themes to boost ambience and style.";
  container.appendChild(status);

  const themeSection = document.createElement("section");
  themeSection.className = "structure-section";
  const themeHeader = document.createElement("div");
  themeHeader.className = "structure-section__header";
  const themeTitle = document.createElement("h4");
  themeTitle.textContent = "Interior themes";
  themeHeader.appendChild(themeTitle);
  themeSection.appendChild(themeHeader);

  const themeGrid = document.createElement("div");
  themeGrid.className = "structure-theme-grid";
  ROOM_INTERIOR_LIBRARY.forEach((theme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.interior = theme.id;
    button.className = "build-chip";
    const art = document.createElement("span");
    art.className = "build-chip__art";
    const previewUrl = renderEngine.createInteriorPreviewDataUrl(theme);
    if (previewUrl) {
      art.style.backgroundImage = `url(${previewUrl})`;
    }
    art.setAttribute("aria-hidden", "true");
    const textWrap = document.createElement("span");
    textWrap.className = "build-chip__text";
    const label = document.createElement("span");
    label.className = "build-chip__label";
    label.textContent = theme.label;
    const meta = document.createElement("span");
    meta.className = "build-chip__meta";
    meta.textContent = `¤${formatCurrency(theme.cost)} build • Upkeep ¤${formatCurrency(theme.upkeep)}/day`;
    textWrap.append(label, meta);
    button.append(art, textWrap);
    if (activeRoom.interiorId === theme.id) {
      button.classList.add("selected");
    }
    button.addEventListener("click", () => {
      if (activeRoom.interiorId === theme.id) {
        return;
      }
      if (applyInteriorThemeToRoom(activeRoom, theme.id)) {
        designerState.interiorId = theme.id;
        if (elements.designer.theme) {
          elements.designer.theme.value = theme.id;
        }
        renderBuildMenuInteriors();
        renderRoomManagement();
        recalculateAmbience();
        updateDesignerSummary();
        updateStats();
        renderHospitalCanvas();
      }
    });
    themeGrid.appendChild(button);
  });
  themeSection.appendChild(themeGrid);

  container.appendChild(themeSection);
};

const renderBuildMenuAmenities = () => {
  const container = elements.buildMenuPanels?.amenities;
  if (!container) return;
  container.innerHTML = "";
  ROOM_DECOR_LIBRARY.forEach((decor) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.decor = decor.id;
    button.className = "build-chip";
    button.innerHTML = `
      <span class="build-chip__swatch" style="--swatch-base:${decor.color ?? "#38bdf8"};"></span>
      <span class="build-chip__label">${decor.label}</span>
    `;
    button.title = decor.description;
    button.addEventListener("click", () => {
      if (designerState.decorations.has(decor.id)) {
        designerState.decorations.delete(decor.id);
        button.classList.remove("selected");
      } else {
        designerState.decorations.add(decor.id);
        button.classList.add("selected");
      }
      updateDesignerSummary();
      updateDesignerOptions();
    });
    if (designerState.decorations.has(decor.id)) {
      button.classList.add("selected");
    }
    container.appendChild(button);
  });
};

const isBuildTabEnabled = (tab) => {
  const button = elements.buildMenuTabs?.find((candidate) => candidate.dataset.buildTab === tab);
  return Boolean(button && !button.disabled);
};

const setBuildMenuTab = (tab) => {
  if (!elements.buildMenuPanels?.[tab]) {
    tab = "rooms";
  }
  if (!isBuildTabEnabled(tab)) {
    const fallback = elements.buildMenuTabs?.find((button) => !button.disabled);
    tab = fallback?.dataset.buildTab ?? "rooms";
  }
  buildMenuTab = tab;
  elements.buildMenuTabs?.forEach((button) => {
    const isActive = button.dataset.buildTab === tab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  if (elements.buildMenuPanels) {
    Object.entries(elements.buildMenuPanels).forEach(([key, panel]) => {
      if (!panel) return;
      panel.classList.toggle("active", key === tab);
      panel.setAttribute("aria-hidden", key === tab ? "false" : "true");
    });
  }
};

const updateBuildTabStates = () => {
  const hasRooms = state.rooms.length > 0;
  const hasCompletedRooms = state.rooms.some((room) => isRoomReadyForInterior(room));
  elements.buildMenuTabs?.forEach((button) => {
    const tab = button.dataset.buildTab;
    let disabled = false;
    let title = "";
    if (tab === "structure") {
      disabled = !hasRooms;
      title = disabled ? "Construct a room to manage its structure." : "";
    } else if (tab === "interiors") {
      disabled = !hasCompletedRooms;
      title = disabled ? "Install a door to unlock interior styling." : "";
    }
    button.disabled = disabled;
    button.classList.toggle("is-disabled", disabled);
    button.setAttribute("aria-disabled", disabled ? "true" : "false");
    if (disabled) {
      button.setAttribute("tabindex", "-1");
      button.setAttribute("aria-selected", "false");
      if (title) {
        button.title = title;
      }
    } else {
      button.removeAttribute("tabindex");
      if (title) {
        button.removeAttribute("title");
      }
    }
    if (!disabled && button.hasAttribute("title")) {
      button.removeAttribute("title");
    }
  });
  setBuildMenuTab(buildMenuTab);
};

const renderBuildOptions = () => {
  renderBuildMenuRooms();
  renderBuildMenuStructure();
  renderBuildMenuInteriors();
  renderBuildMenuAmenities();
  updateBuildTabStates();
  if (!designerState.editingRoomId && designerState.blueprint) {
    highlightBuildSelection(designerState.blueprint.id);
  }
  updateBuildGuidance();
};

const randomFrom = (array) => array[Math.floor(Math.random() * array.length)];

const distanceBetween = (a, b) => Math.hypot((b?.x ?? 0) - (a?.x ?? 0), (b?.y ?? 0) - (a?.y ?? 0));

const getEntrancePosition = () => ({ x: ENTRANCE_X, y: getCorridorY() });

const getExitPosition = () => ({ x: ENTRANCE_X - 2, y: getCorridorY() });

const getQueueSlotPosition = (index) => ({
  x: ENTRANCE_X + index * 0.85,
  y: getCorridorY(),
});

const getRoomDoorPosition = (room) => ({
  x: room.x + room.width / 2,
  y: room.y + room.height + 0.1,
});

const getRoomCenter = (room) => ({
  x: room.x + room.width / 2,
  y: room.y + room.height / 2,
});

const createPath = (start, end, options = {}) => {
  if (!start || !end) return [];
  const allowRoomIds = new Set(
    [options.allowRoomId, ...(Array.isArray(options.allowRoomIds) ? options.allowRoomIds : [])].filter(Boolean)
  );
  const startNode = {
    x: clamp(Math.floor(start.x), 0, getGridWidth() - 1),
    y: clamp(Math.floor(start.y), 0, getGridHeight() - 1),
  };
  const endNode = {
    x: clamp(Math.floor(end.x), 0, getGridWidth() - 1),
    y: clamp(Math.floor(end.y), 0, getGridHeight() - 1),
  };
  const startOccupant = state.grid[startNode.y]?.[startNode.x];
  if (startOccupant?.id) {
    allowRoomIds.add(startOccupant.id);
  }

  const walkable = (x, y) => {
    if (x < 0 || y < 0 || x >= getGridWidth() || y >= getGridHeight()) return false;
    if (!isTileUnlocked(x, y)) return false;
    const occupant = state.grid[y][x];
    if (!occupant) return true;
    return allowRoomIds.has(occupant.id);
  };

  const key = (node) => `${node.x},${node.y}`;
  const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  if (!walkable(startNode.x, startNode.y) || !walkable(endNode.x, endNode.y)) {
    allowRoomIds.add(state.grid[endNode.y]?.[endNode.x]?.id ?? "");
  }

  const open = [startNode];
  const cameFrom = new Map();
  const gScore = new Map([[key(startNode), 0]]);
  const fScore = new Map([[key(startNode), heuristic(startNode, endNode)]]);

  const nodeInOpen = (node) => open.some((entry) => entry.x === node.x && entry.y === node.y);

  while (open.length) {
    open.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
    const current = open.shift();
    if (current.x === endNode.x && current.y === endNode.y) {
      const pathNodes = [];
      let cursorKey = key(current);
      let cursor = current;
      while (cameFrom.has(cursorKey)) {
        pathNodes.unshift(cursor);
        cursor = cameFrom.get(cursorKey);
        cursorKey = key(cursor);
      }
      const path = [];
      let lastPoint = { ...start };
      pathNodes.forEach((node) => {
        const center = { x: node.x + 0.5, y: node.y + 0.5 };
        if (distanceBetween(lastPoint, center) > 0.01) {
          path.push(center);
          lastPoint = center;
        }
      });
      if (distanceBetween(lastPoint, end) > 0.01) {
        path.push({ ...end });
      }
      return path;
    }

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    neighbors.forEach((neighbor) => {
      if (!walkable(neighbor.x, neighbor.y)) {
        return;
      }
      const tentativeG = (gScore.get(key(current)) ?? Infinity) + 1;
      const neighborKey = key(neighbor);
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, endNode));
        if (!nodeInOpen(neighbor)) {
          open.push(neighbor);
        }
      }
    });
  }

  const fallback = [];
  const corner = { x: end.x, y: start.y };
  [corner, end].forEach((point) => {
    if (distanceBetween(start, point) > 0.01) {
      fallback.push({ x: point.x, y: point.y });
      start = point;
    }
  });
  return fallback;
};

const stepAgent = (agent, speed, deltaSeconds = 1) => {
  ensureAgentMotion(agent);
  if (!agent.path?.length) {
    updateAgentMotion(agent, 0, deltaSeconds);
    return true;
  }
  const target = agent.path[0];
  const dx = target.x - agent.position.x;
  const dy = target.y - agent.position.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) {
    agent.path.shift();
    return stepAgent(agent, speed, deltaSeconds);
  }
  const distanceThisFrame = Math.max(0, speed * deltaSeconds);
  const dirX = dx / distance;
  const dirY = dy / distance;
  const travel = Math.min(distanceThisFrame, distance);
  if (distance <= distanceThisFrame) {
    agent.position.x = target.x;
    agent.position.y = target.y;
    agent.path.shift();
  } else {
    agent.position.x += dirX * distanceThisFrame;
    agent.position.y += dirY * distanceThisFrame;
  }
  updateAgentMotion(agent, travel, deltaSeconds, dirX, dirY);
  if (distance <= distanceThisFrame) {
    return agent.path.length === 0;
  }
  return false;
};

const setAgentDestination = (agent, destination, options = {}) => {
  if (!agent.position) {
    agent.position = { ...getEntrancePosition() };
  }
  agent.destination = destination ? { ...destination } : null;
  agent.path = destination ? createPath(agent.position, destination, options) : [];
};

const countStaffByRole = (role) => state.staff.filter((member) => member.role === role).length;

const hasRoomBuilt = (type) => state.rooms.some((room) => room.type === type);

const STAFF_ROLE_LABELS = {
  doctor: "Doctor",
  nurse: "Nurse",
  assistant: "Assistant",
  janitor: "Custodian",
  facility: "Facility Manager",
  researcher: "Researcher",
  marketer: "Marketer",
  surgeon: "Surgeon",
  technician: "Technician",
  accountant: "Accountant",
  midwife: "Midwife",
  therapist: "Therapist",
  entertainer: "Entertainer",
  security: "Security",
  dentist: "Dentist",
  chef: "Chef",
};

const STAFF_ROLE_COLORS = {
  doctor: "#f97316",
  nurse: "#22d3ee",
  assistant: "#38bdf8",
  janitor: "#a3e635",
  facility: "#64748b",
  researcher: "#c084fc",
  marketer: "#facc15",
  surgeon: "#f87171",
  technician: "#60a5fa",
  accountant: "#fbbf24",
  midwife: "#f472b6",
  therapist: "#34d399",
  entertainer: "#fb7185",
  security: "#f97316",
  dentist: "#38bdf8",
  chef: "#facc15",
};

const formatStaffRole = (role) => STAFF_ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);

const getTotalAmenityCount = (amenityType) =>
  state.rooms.reduce((sum, room) => {
    if (!room.decorations?.length) return sum;
    const roomCount = room.decorations.reduce((acc, id) => {
      const def = getDecorationDefinition(id);
      return acc + (def.amenityType === amenityType ? 1 : 0);
    }, 0);
    return sum + roomCount;
  }, 0);

const getTotalPlants = () =>
  state.rooms.reduce((sum, room) => {
    if (!room.decorations?.length) return sum;
    const roomPlants = room.decorations.reduce((acc, id) => {
      const def = getDecorationDefinition(id);
      return acc + (def.isPlant ? 1 : 0);
    }, 0);
    return sum + roomPlants;
  }, 0);

const generateCandidate = () => {
  const blueprint = randomFrom(staffCatalog);
  const name = randomFrom(blueprint.namePool);
  const trait = randomFrom(blueprint.traits);
  const salary = Math.floor(
    blueprint.salary[0] + Math.random() * (blueprint.salary[1] - blueprint.salary[0])
  );
  return {
    id: staffIdCounter++,
    name,
    role: blueprint.role,
    trait,
    salary,
    morale: 80,
  };
};

const refreshCandidates = () => {
  state.candidates = Array.from({ length: 3 }, generateCandidate);
};

const renderCandidates = () => {
  elements.staffCandidates.innerHTML = "";
  const template = document.querySelector("#candidate-template");
  state.candidates.forEach((candidate) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".name").textContent = candidate.name;
    card.querySelector(".role").textContent = formatStaffRole(candidate.role);
    card.querySelector(".traits").textContent = `Trait: ${candidate.trait}`;
    card.querySelector(".cost").textContent = formatCurrency(candidate.salary);
    card.querySelector(".hire-button").addEventListener("click", () => hireStaff(candidate.id));
    elements.staffCandidates.appendChild(card);
  });
};

const renderRoster = () => {
  elements.staffRoster.innerHTML = "";
  state.staff.forEach((member) => {
    const li = document.createElement("li");
    const role = formatStaffRole(member.role);
    const morale = Math.round(member.morale);
    const trait = member.trait ? ` • Trait: ${member.trait}` : "";
    li.textContent = `${member.name} (${role}) • Morale ${morale}${trait}`;
    elements.staffRoster.appendChild(li);
  });
};

const renderProjects = () => {
  elements.researchProjects.innerHTML = "";
  const template = document.querySelector("#research-template");
  state.projects.forEach((project) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".name").textContent = project.name;
    card.querySelector(".desc").textContent = project.unlocked
      ? "Unlocked!"
      : project.desc;
    const progress = card.querySelector("progress");
    progress.value = project.progress;
    progress.max = 100;
    const button = card.querySelector(".invest-button");
    button.querySelector(".cost").textContent = formatCurrency(project.cost);
    button.disabled = project.unlocked;
    button.addEventListener("click", () => investResearch(project.id));
    elements.researchProjects.appendChild(card);
  });
};

const renderCampaigns = () => {
  elements.marketingCampaigns.innerHTML = "";
  const template = document.querySelector("#campaign-template");
  state.campaigns.forEach((campaign) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".name").textContent = campaign.name;
    card.querySelector(".desc").textContent = campaign.desc;
    const button = card.querySelector(".launch-button");
    button.querySelector(".cost").textContent = formatCurrency(campaign.cost);
    button.addEventListener("click", () => launchCampaign(campaign.id));
    elements.marketingCampaigns.appendChild(card);
  });
};

const renderBillingLedger = () => {
  if (!elements.billingLedger) return;
  elements.billingLedger.innerHTML = "";
  state.billingRecords.forEach((entry) => {
    const li = document.createElement("li");
    const amountClass = entry.amount >= 0 ? "positive" : "negative";
    if (entry.custom) {
      li.innerHTML = `
        <div class="ledger-row">
          <span>${entry.name}</span>
          <span class="amount ${amountClass}">¤${formatCurrency(entry.amount)}</span>
        </div>
        <div class="ledger-row">
          <span>${entry.detail ?? ""}</span>
          <span>${entry.tag ?? ""}</span>
        </div>
      `;
    } else {
      const rows = [
        `
          <div class="ledger-row">
            <span>${entry.name}</span>
            <span class="amount ${amountClass}">¤${formatCurrency(entry.amount)}</span>
          </div>
        `,
        `
          <div class="ledger-row">
            <span>${entry.ailment}</span>
            <span>${entry.profile}${entry.emergency ? " • Emergency" : ""}</span>
          </div>
        `,
        `
          <div class="ledger-row">
            <span>${entry.method ?? "Billing"}</span>
            <span>Charge ¤${formatCurrency(entry.charge ?? 0)}</span>
          </div>
        `,
      ];
      if (entry.deferred) {
        rows.push(`
          <div class="ledger-row">
            <span>Deferred Balance</span>
            <span>¤${formatCurrency(entry.deferred)}${entry.term ? ` • ${entry.term}d` : ""}</span>
          </div>
        `);
      }
      if (entry.financeFee) {
        rows.push(`
          <div class="ledger-row">
            <span>Processing Fee</span>
            <span class="amount negative">-¤${formatCurrency(entry.financeFee)}</span>
          </div>
        `);
      }
      li.innerHTML = rows.join("");
    }
    elements.billingLedger.appendChild(li);
  });
};

const recordLedgerEvent = ({ name, detail, amount, tag = "" }) => {
  state.billingRecords.unshift({
    custom: true,
    name,
    detail,
    amount,
    tag,
  });
  if (state.billingRecords.length > 8) {
    state.billingRecords.pop();
  }
  renderBillingLedger();
};

const createAutoSaveLabel = () => {
  const roomCount = state.rooms.length;
  const roomLabel = `${roomCount} room${roomCount === 1 ? "" : "s"}`;
  return `Day ${state.stats.day} • ${roomLabel} • ¤${formatCurrency(state.stats.cash)}`;
};

const createSaveSnapshot = (labelInput) => {
  const fallbackLabel = createAutoSaveLabel();
  const objectivesProgress = state.objectives.map((objective) => ({
    id: objective.id,
    completed: Boolean(objective.completed),
  }));
  const snapshot = {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    label: sanitizeSaveLabel(labelInput) || fallbackLabel,
    viewMode,
    counters: {
      patientIdCounter,
      roomIdCounter,
      staffIdCounter,
    },
    state: {
      rooms: deepClone(state.rooms),
      shells: deepClone(state.shells),
      staff: deepClone(state.staff),
      candidates: deepClone(state.candidates),
      queue: deepClone(state.queue),
      patientsOnSite: deepClone(state.patientsOnSite),
      activePatients: deepClone(state.activePatients),
      marketingEffects: deepClone(state.marketingEffects),
      projects: deepClone(state.projects),
      campaigns: deepClone(state.campaigns),
      objectives: objectivesProgress,
      billingRecords: deepClone(state.billingRecords),
      loans: deepClone(state.loans),
      installmentPlans: deepClone(state.installmentPlans),
      properties: deepClone(state.properties),
      litter: state.litter,
      ambience: deepClone(state.ambience),
      stats: deepClone(state.stats),
      policies: {
        fastTrack: elements.policies.fastTrack.checked,
        overtime: elements.policies.overtime.checked,
      },
    },
  };
  return snapshot;
};

const readSaveSlot = (slot) => {
  if (!isStorageAvailable) return null;
  try {
    const raw = storage.getItem(getSaveSlotKey(slot));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Failed to read save slot ${slot}`, error);
    return null;
  }
};

const isLotOverviewOpen = () => Boolean(elements.lotOverview?.modal?.classList.contains("open"));
const isHospitalOverviewOpen = () =>
  Boolean(elements.hospitalOverview?.modal?.classList.contains("open"));

const renderHospitalOverviewModal = () => {
  const list = elements.hospitalOverview?.metrics;
  if (!list) return;
  const roomsBuilt = state.rooms.length;
  const staffCount = state.staff.length;
  const patientsOnSite = state.patientsOnSite.length;
  const activeTreatments = state.activePatients.length;
  const queueLength = state.queue.length;
  const emergencyCount = state.queue.filter((patient) => patient.isEmergency).length;
  const averagePatience = queueLength
    ? Math.round(
        state.queue.reduce((acc, patient) => acc + Math.max(0, patient.patience ?? 0), 0) /
          queueLength
      )
    : 0;
  const averageHealth = patientsOnSite
    ? Math.round(
        state.patientsOnSite.reduce((acc, patient) => {
          seedPatientVitals(patient);
          return acc + (patient.health ?? 0);
        }, 0) / patientsOnSite
      )
    : 0;
  list.innerHTML = `
    <li><span>Rooms built</span><strong>${roomsBuilt}</strong></li>
    <li><span>Staff on duty</span><strong>${staffCount}</strong></li>
    <li><span>Patients on site</span><strong>${patientsOnSite}</strong></li>
    <li><span>Active treatments</span><strong>${activeTreatments}</strong></li>
    <li><span>Queue length</span><strong>${queueLength}</strong></li>
    <li><span>Emergency cases</span><strong>${emergencyCount}</strong></li>
    <li><span>Avg patience</span><strong>${averagePatience}%</strong></li>
    <li><span>Avg health</span><strong>${averageHealth}%</strong></li>
  `;
};

const openLotOverviewMenu = () => {
  if (!elements.lotOverview?.modal) return;
  if (isLotOverviewOpen()) {
    renderLotOverviewList();
    return;
  }
  renderLotOverviewList();
  elements.lotOverview.modal.classList.add("open");
  elements.lotOverview.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  lastFocusedBeforeLotOverview =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const focusTarget =
    elements.lotOverview.modal.querySelector("#lot-overview-title") ??
    elements.lotOverview.modal.querySelector("[data-close-lot-overview]");
  focusTarget?.focus();
};

const closeLotOverviewMenu = () => {
  if (!elements.lotOverview?.modal) return;
  if (!isLotOverviewOpen()) return;
  elements.lotOverview.modal.classList.remove("open");
  elements.lotOverview.modal.setAttribute("aria-hidden", "true");
  if (!isSaveMenuOpen() && !isHospitalOverviewOpen()) {
    document.body.classList.remove("modal-open");
  }
  const focusTarget =
    lastFocusedBeforeLotOverview && typeof lastFocusedBeforeLotOverview.focus === "function"
      ? lastFocusedBeforeLotOverview
      : elements.lotOverview?.openButton;
  focusTarget?.focus();
  lastFocusedBeforeLotOverview = null;
};

const setupLotOverviewMenu = () => {
  if (elements.lotOverview?.openButton) {
    elements.lotOverview.openButton.addEventListener("click", () => openLotOverviewMenu());
  }
  elements.lotOverview?.modal
    ?.querySelectorAll("[data-close-lot-overview]")
    .forEach((button) => button.addEventListener("click", () => closeLotOverviewMenu()));
};

const openHospitalOverviewMenu = () => {
  if (!elements.hospitalOverview?.modal) return;
  if (isHospitalOverviewOpen()) {
    renderHospitalOverviewModal();
    return;
  }
  updateStats();
  renderHospitalOverviewModal();
  elements.hospitalOverview.modal.classList.add("open");
  elements.hospitalOverview.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  lastFocusedBeforeHospitalOverview =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const focusTarget =
    elements.hospitalOverview.modal.querySelector("#hospital-overview-title") ??
    elements.hospitalOverview.modal.querySelector("[data-close-hospital-overview]");
  focusTarget?.focus();
};

const closeHospitalOverviewMenu = () => {
  if (!elements.hospitalOverview?.modal) return;
  if (!isHospitalOverviewOpen()) return;
  elements.hospitalOverview.modal.classList.remove("open");
  elements.hospitalOverview.modal.setAttribute("aria-hidden", "true");
  if (!isSaveMenuOpen() && !isLotOverviewOpen()) {
    document.body.classList.remove("modal-open");
  }
  const focusTarget =
    lastFocusedBeforeHospitalOverview &&
    typeof lastFocusedBeforeHospitalOverview.focus === "function"
      ? lastFocusedBeforeHospitalOverview
      : elements.hospitalOverview?.openButton;
  focusTarget?.focus();
  lastFocusedBeforeHospitalOverview = null;
};

const setupHospitalOverviewMenu = () => {
  if (elements.hospitalOverview?.openButton) {
    elements.hospitalOverview.openButton.addEventListener("click", () => openHospitalOverviewMenu());
  }
  elements.hospitalOverview?.modal
    ?.querySelectorAll("[data-close-hospital-overview]")
    .forEach((button) => button.addEventListener("click", () => closeHospitalOverviewMenu()));
};

const setupPatientDetail = () => {
  if (elements.patientDetail?.panel) {
    elements.patientDetail.panel.hidden = true;
  }
  if (elements.patientDetail?.close) {
    elements.patientDetail.close.addEventListener("click", () => clearSelectedPatient());
  }
};

const isSaveMenuOpen = () => Boolean(elements.save?.modal?.classList.contains("open"));

const ensureProjectArtifacts = (projectId) => {
  switch (projectId) {
    case "imaging": {
      if (!roomCatalog.some((room) => room.id === "radiology")) {
        roomCatalog.push({
          id: "radiology",
          name: "Radiology",
          cost: 22000,
          upkeep: 700,
          roleRequired: ["doctor", "technician"],
          reputation: 6,
          description: "Top-tier diagnostic wing boosting payouts.",
        });
        const newRoom = roomCatalog[roomCatalog.length - 1];
        newRoom.baseSeverity = baseSeverityMap[newRoom.id] ?? 1;
        newRoom.designProfile = {
          sizes: [...defaultDesignProfile.sizes],
          interiors: [...defaultDesignProfile.interiors],
          machines:
            (baseSeverityMap[newRoom.id] ?? 1) > 0
              ? [...defaultDesignProfile.machines]
              : ["standard-kit"],
          decor: [...defaultDesignProfile.decor],
          defaultMachines: [...defaultDesignProfile.defaultMachines],
        };
        if ((baseSeverityMap[newRoom.id] ?? 1) <= 0) {
          newRoom.designProfile.machines = ["standard-kit"];
        }
      }
      if (!ailments.some((ailment) => ailment.id === "spectral")) {
        ailments.push({ id: "spectral", name: "Spectral Syndrome", severity: 3, room: "radiology", payout: 2800 });
      }
      renderBuildOptions();
      break;
    }
    default:
      break;
  }
};

const applySaveSnapshot = (snapshot) => {
  if (!snapshot) {
    return false;
  }
  const payload = snapshot.state ?? snapshot.payload ?? snapshot.data ?? null;
  if (!payload) {
    return false;
  }

  state.properties = deepClone(payload.properties ?? createPropertyState());
  state.rooms = deepClone(payload.rooms ?? []);
  state.rooms.forEach((room) => {
    if (typeof room.builtAt !== "number") {
      room.builtAt = 0;
    }
    ensureRoomStructure(room);
  });
  state.shells = deepClone(payload.shells ?? deriveCampusShells());
  if (!Array.isArray(state.shells) || !state.shells.length) {
    state.shells = deriveCampusShells();
  }
  state.staff = deepClone(payload.staff ?? []);
  state.candidates = deepClone(payload.candidates ?? []);
  state.queue = deepClone(payload.queue ?? []);
  const queueMap = new Map(state.queue.map((patient) => [patient.id, patient]));
  const hydratePatient = (patient) => {
    if (!patient) return null;
    const base = queueMap.get(patient.id);
    if (base) {
      Object.assign(base, patient);
      seedPatientVitals(base);
      ensureAgentMotion(base);
      return base;
    }
    const hydrated = seedPatientVitals(patient);
    ensureAgentMotion(hydrated);
    queueMap.set(patient.id, hydrated);
    return hydrated;
  };
  state.patientsOnSite = (payload.patientsOnSite ?? state.queue).map((patient) => hydratePatient(patient)).filter(Boolean);
  state.activePatients = (payload.activePatients ?? [])
    .map((patient) => hydratePatient(patient))
    .filter(Boolean);
  state.marketingEffects = deepClone(payload.marketingEffects ?? []);
  state.projects = deepClone(payload.projects ?? state.projects);
  state.campaigns = deepClone(payload.campaigns ?? state.campaigns);
  state.objectives = restoreObjectives(payload.objectives);
  state.billingRecords = deepClone(payload.billingRecords ?? []);
  state.loans = deepClone(payload.loans ?? []);
  state.installmentPlans = deepClone(payload.installmentPlans ?? []);
  const gridResized = ensureGridCapacity();
  const gridWidth = getGridWidth();
  const gridHeight = getGridHeight();
  if (!gridResized && state.grid.length === 0) {
    resizeGrid(gridWidth, gridHeight);
  }
  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      state.grid[y][x] = null;
    }
  }
  state.litter = payload.litter ?? 0;
  state.ambience = deepClone(payload.ambience ?? state.ambience);
  state.stats = { ...state.stats, ...(payload.stats ?? {}) };

  const counters = snapshot.counters ?? payload.counters ?? {};
  const deriveNextId = (collection, key) =>
    collection.reduce((max, item) => {
      const value = item?.[key];
      if (typeof value === "number") {
        return Math.max(max, value);
      }
      if (typeof value === "string") {
        const match = value.match(/(\d+)/g);
        if (match?.length) {
          const numeric = Number(match[match.length - 1]);
          if (!Number.isNaN(numeric)) {
            return Math.max(max, numeric);
          }
        }
      }
      return max;
    }, 0) + 1;

  patientIdCounter =
    typeof counters.patientIdCounter === "number"
      ? counters.patientIdCounter
      : deriveNextId(state.queue, "id");

  roomIdCounter =
    typeof counters.roomIdCounter === "number"
      ? counters.roomIdCounter
      : deriveNextId(state.rooms, "id");

  staffIdCounter =
    typeof counters.staffIdCounter === "number"
      ? counters.staffIdCounter
      : deriveNextId(state.staff, "id");

  if (!state.candidates.length) {
    refreshCandidates();
  }

  elements.policies.fastTrack.checked = Boolean(payload.policies?.fastTrack);
  elements.policies.overtime.checked = Boolean(payload.policies?.overtime);

  state.rooms.forEach((room) => occupyRoomFootprint(room));

  if (Array.isArray(state.projects)) {
    state.projects.forEach((project) => {
      if (project?.unlocked) {
        ensureProjectArtifacts(project.id);
      }
    });
  }

  syncStaffAgents();
  recalculateAmbience();
  clearBuildSelection();
  renderRoomManagement();
  renderOwnedProperties();
  renderPropertyMarket();
  renderBuildOptions();
  updateDesignerOptions();
  updateDesignerSummary();
  updateBuildGuidance();
  if (gridResized && elements.grid) {
    setupGrid();
  }
  if (elements.grid) {
    updateGrid();
  }
  setupCanvas();
  updateUI();
  syncQueuePositions();

  if (snapshot.viewMode && snapshot.viewMode !== viewMode) {
    setViewMode(snapshot.viewMode, { persist: false });
  } else {
    updateViewModeButtons();
    renderHospitalCanvas();
  }

  return true;
};

const updateSaveSlotList = () => {
  if (!elements.save?.slotList) return;
  const { slotList, message } = elements.save;
  slotList.innerHTML = "";
  if (!isStorageAvailable) {
    if (message) {
      message.textContent =
        "Saving isn't available because the browser's local storage could not be accessed.";
      message.hidden = false;
    }
    return;
  }

  if (message) {
    message.textContent = "";
    message.hidden = true;
  }

  const suggestion = createAutoSaveLabel();
  for (let index = 0; index < SAVE_SLOT_COUNT; index++) {
    const slotId = index + 1;
    const data = readSaveSlot(slotId);
    const li = document.createElement("li");
    li.className = "save-slot";

    const header = document.createElement("div");
    header.className = "save-slot__header";
    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "save-slot__label";
    labelInput.value = data?.label ?? "";
    labelInput.placeholder = data?.label ?? suggestion;
    const meta = document.createElement("span");
    meta.className = "save-slot__meta";
    if (data) {
      const stats = data.state?.stats ?? data.stats ?? {};
      const rooms = data.state?.rooms ?? data.rooms ?? [];
      const parts = [];
      if (data.createdAt) {
        parts.push(formatDateTime(data.createdAt));
      }
      if (stats.day) {
        parts.push(`Day ${stats.day}`);
      }
      if (rooms.length) {
        parts.push(`${rooms.length} room${rooms.length === 1 ? "" : "s"}`);
      }
      if (typeof stats.cash === "number") {
        parts.push(`¤${formatCurrency(stats.cash)}`);
      }
      meta.textContent = parts.filter(Boolean).join(" • ") || "Saved game";
    } else {
      meta.textContent = "Empty slot";
    }
    header.append(labelInput, meta);
    li.appendChild(header);

    const actions = document.createElement("div");
    actions.className = "save-slot__actions";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.dataset.action = "save";
    saveButton.textContent = data ? "Overwrite" : "Save";
    saveButton.addEventListener("click", () => saveToSlot(slotId, labelInput.value || labelInput.placeholder));

    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.dataset.action = "load";
    loadButton.textContent = "Load";
    loadButton.disabled = !data;
    if (data) {
      loadButton.addEventListener("click", () => loadFromSlot(slotId));
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.textContent = "Delete";
    deleteButton.disabled = !data;
    if (data) {
      deleteButton.addEventListener("click", () => deleteSaveSlot(slotId));
    }

    actions.append(saveButton, loadButton, deleteButton);
    li.appendChild(actions);
    slotList.appendChild(li);
  }
};

const saveToSlot = (slot, labelInput) => {
  if (!isStorageAvailable) {
    logEvent("Saving isn't available in this environment.", "warning");
    return;
  }
  try {
    const snapshot = createSaveSnapshot(labelInput);
    storage.setItem(getSaveSlotKey(slot), JSON.stringify(snapshot));
    updateSaveSlotList();
    logEvent(`Game saved to Slot ${slot} (${snapshot.label}).`, "positive");
  } catch (error) {
    logEvent("Failed to write save data. Check storage availability.", "negative");
  }
};

const loadFromSlot = (slot) => {
  const snapshot = readSaveSlot(slot);
  if (!snapshot) {
    logEvent("No saved game found in that slot.", "warning");
    return;
  }
  if ((snapshot.version ?? 0) > SAVE_VERSION) {
    logEvent("This save was created with a newer version and cannot be loaded.", "warning");
    return;
  }
  const applied = applySaveSnapshot(snapshot);
  if (applied) {
    closeSaveMenu();
    logEvent(`Loaded ${snapshot.label ?? `slot ${slot}`}.`, "positive");
  } else {
    logEvent("Failed to load the selected save slot.", "negative");
  }
};

const deleteSaveSlot = (slot) => {
  if (!isStorageAvailable) return;
  const snapshot = readSaveSlot(slot);
  if (!snapshot) return;
  let proceed = true;
  if (typeof window !== "undefined" && typeof window.confirm === "function") {
    proceed = window.confirm("Delete this save slot?");
  }
  if (!proceed) return;
  storage.removeItem(getSaveSlotKey(slot));
  updateSaveSlotList();
  logEvent(`Deleted save slot ${slot}.`, "neutral");
};

const openSaveMenu = () => {
  if (!elements.save?.modal) return;
  if (isSaveMenuOpen()) {
    updateSaveSlotList();
    return;
  }
  updateSaveSlotList();
  elements.save.modal.classList.add("open");
  elements.save.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  lastFocusedBeforeSaveMenu =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const focusTarget =
    elements.save.slotList?.querySelector(".save-slot__label") ??
    elements.save.modal.querySelector(".save-menu__close");
  focusTarget?.focus();
};

const closeSaveMenu = () => {
  if (!elements.save?.modal) return;
  elements.save.modal.classList.remove("open");
  elements.save.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (lastFocusedBeforeSaveMenu && typeof lastFocusedBeforeSaveMenu.focus === "function") {
    lastFocusedBeforeSaveMenu.focus();
  } else if (elements.save.openButton) {
    elements.save.openButton.focus();
  }
};

const setupSaveMenu = () => {
  if (elements.save?.openButton) {
    elements.save.openButton.addEventListener("click", () => {
      openSaveMenu();
    });
  }
  elements.save?.modal
    ?.querySelectorAll("[data-close-save]")
    .forEach((button) => button.addEventListener("click", () => closeSaveMenu()));
};

const recordBilling = (patient, outcome) => {
  state.billingRecords.unshift({
    name: patient.name,
    ailment: patient.ailment.name,
    amount: outcome.netCash,
    profile: patient.profile.label,
    emergency: patient.isEmergency,
    method: outcome.methodLabel,
    charge: outcome.charge,
    insurancePortion: outcome.insuranceCovered,
    patientPortion: outcome.patientPortion,
    deferred: outcome.receivable,
    financeFee: outcome.financeFee,
    term: outcome.plan?.daysRemaining ?? 0,
  });
  if (state.billingRecords.length > 8) {
    state.billingRecords.pop();
  }
  renderBillingLedger();
};

const calculateBillingOutcome = (patient, { preview = false } = {}) => {
  const profile = patient.profile ?? {};
  const baseCharge = patient.ailment.charge ?? Math.round(patient.ailment.payout * 1.2);
  const profileMultiplier = profile.modifier ?? 1;
  const billingBoost = hasRoomBuilt("billing") && countStaffByRole("accountant") ? 1.15 : 1;
  const emergencyBoost = patient.isEmergency ? 1.2 : 1;
  const erBoost = patient.isEmergency && hasRoomBuilt("emergency") ? 1.1 : 1;
  const hospitalityBoost = hasRoomBuilt("gourmet") && countStaffByRole("chef") ? 1.05 : 1;
  const showtimeBoost =
    ["clowncare", "holotheatre"].includes(patient.ailment.room) && countStaffByRole("entertainer")
      ? 1.25
      : 1;
  const welfareBonus = 1 + state.ambience.welfare * 0.02;
  const reputationBonus = 1 + state.ambience.reputation * 0.01;
  const finalCharge = Math.max(
    0,
    Math.round(
      baseCharge *
        profileMultiplier *
        billingBoost *
        emergencyBoost *
        erBoost *
        hospitalityBoost *
        showtimeBoost *
        welfareBonus *
        reputationBonus
    )
  );

  const coverageRate = profile.coverage ?? 0;
  let insuranceCovered = Math.round(finalCharge * coverageRate);
  let patientPortion = finalCharge - insuranceCovered;
  if (profile.copay) {
    patientPortion = Math.max(patientPortion, profile.copay);
    insuranceCovered = Math.max(0, finalCharge - patientPortion);
  }
  if (profile.discount) {
    patientPortion = Math.max(0, Math.round(patientPortion * (1 - profile.discount)));
    insuranceCovered = Math.max(0, finalCharge - patientPortion);
  }

  let financeFee = 0;
  let methodLabel = profile.label ?? "Self-Pay";
  let receivable = 0;
  let deposit = 0;
  let plan = null;

  switch (profile.method) {
    case "insurance":
      methodLabel = `Insurance (${Math.round((coverageRate || 0) * 100)}% cover)`;
      break;
    case "credit": {
      const feeRate = profile.processingFee ?? 0;
      financeFee = Math.round(patientPortion * feeRate);
      insuranceCovered = 0;
      methodLabel = "Credit Card";
      break;
    }
    case "cash":
      insuranceCovered = 0;
      methodLabel = "Cash Payment";
      break;
    case "installment": {
      const rate = profile.depositRate ?? 0.2;
      const term = Math.max(4, profile.term ?? 8);
      deposit = Math.round(finalCharge * rate);
      receivable = Math.max(0, finalCharge - deposit);
      const dailyPayment = Math.max(50, Math.round(receivable / term));
      insuranceCovered = 0;
      methodLabel = `Installment (${term}d)`;
      plan = {
        patientName: patient.name,
        total: finalCharge,
        remaining: receivable,
        dailyPayment,
        daysRemaining: term,
      };
      break;
    }
    default:
      break;
  }

  let netCash = insuranceCovered + patientPortion;
  if (profile.method === "credit") {
    netCash = Math.max(0, patientPortion - financeFee);
  }
  if (profile.method === "cash") {
    netCash = patientPortion;
  }
  if (profile.method === "installment") {
    netCash = deposit;
  }

  const outcome = {
    charge: finalCharge,
    netCash,
    insuranceCovered,
    patientPortion,
    financeFee,
    receivable,
    methodLabel,
    plan: plan && !preview ? plan : plan ? { ...plan, preview: true } : null,
    deposit,
    profileId: profile.id,
    profileLabel: profile.label,
  };

  return outcome;
};

const getBillingPreview = (patient) => calculateBillingOutcome(patient, { preview: true });

const hireStaff = (candidateId) => {
  const candidate = state.candidates.find((c) => c.id === candidateId);
  if (!candidate) return;
  if (state.stats.cash < candidate.salary * 5) {
    logEvent("Not enough funds to cover onboarding for this staff member.", "negative");
    return;
  }
  state.stats.cash -= candidate.salary * 5;
  state.staff.push({ ...candidate, assignedRoom: null });
  state.candidates = state.candidates.filter((c) => c.id !== candidateId);
  state.candidates.push(generateCandidate());
  logEvent(`Hired ${candidate.name}, a ${formatStaffRole(candidate.role)}.`, "positive");
  syncStaffAgents();
  renderCandidates();
  renderRoster();
  updateStats();
};

const placeRoomAt = (x, y, layout, { fromDrag = false } = {}) => {
  const blueprint = selectedRoom ?? designerState.blueprint;
  if (!blueprint) return false;
  const coordLabel = `${AXIS_LETTERS[x] ?? x + 1}${y + 1}`;
  if (!isTileUnlocked(x, y)) {
    const parcel = getParcelAt(x, y);
    if (parcel && !parcel.owned) {
      logEvent(
        `${parcel.name} is still locked. Purchase it from Hospital Grounds before building on plot ${coordLabel}.`,
        "warning"
      );
    } else {
      logEvent(`That area of the campus isn't zoned for construction yet.`, "warning");
    }
    updateBuildGuidance();
    return false;
  }
  const footprint = layout ?? getSizeOption(designerState.sizeId);
  if (!canPlaceFootprint(x, y, footprint.width, footprint.height)) {
    logEvent(`Not enough free space to place ${blueprint.name} at plot ${coordLabel}.`, "negative");
    updateBuildGuidance();
    return false;
  }
  const machines = Array.from(designerState.machines);
  if (!machines.length) {
    machines.push("standard-kit");
  }
  const decorations = Array.from(designerState.decorations);
  const preview = summarizeRoomDesign({
    blueprint,
    sizeId: footprint.id ?? designerState.sizeId,
    layoutOverride: footprint,
    interiorId: designerState.interiorId,
    machines,
    decorations,
  });
  if (state.stats.cash < preview.totalCost) {
    logEvent(
      `Not enough cash to build ${blueprint.name} with the selected upgrades (requires ¤${formatCurrency(preview.totalCost)}).`,
      "negative"
    );
    updateBuildGuidance();
    return false;
  }

  const room = {
    id: `room-${roomIdCounter++}`,
    type: blueprint.id,
    roleRequired: blueprint.roleRequired,
    baseCost: blueprint.cost,
    baseUpkeep: blueprint.upkeep,
    costInvested: preview.totalCost,
    upkeep: preview.upkeep,
    reputationBoost: preview.reputationBoost,
    environmentBoost: preview.environmentBoost,
    welfareBoost: preview.welfareBoost,
    moraleBoost: preview.moraleBoost,
    severityBoost: preview.severityBoost,
    decorations: [...decorations],
    machines: [...machines],
    sizeId: footprint.id ?? designerState.sizeId,
    interiorId: designerState.interiorId,
    width: footprint.width,
    height: footprint.height,
    x,
    y,
    severityCapacity: Math.max(0, Math.round((blueprint.baseSeverity ?? 0) + preview.severityBoost)),
    builtAt: state.stats?.tick ?? 0,
    doors: [],
    windows: [],
    wallsComplete: true,
    doorInstalled: false,
  };
  occupyRoomFootprint(room);
  state.rooms.push(room);
  ensureRoomStructure(room);
  state.stats.cash -= preview.totalCost;
  state.stats.expensesToday += preview.totalCost;
  state.stats.reputation = clamp(
    state.stats.reputation + blueprint.reputation + (preview.reputationBoost ?? 0),
    0,
    100
  );
  designerState.sizeId = room.sizeId;
  recalculateAmbience();
  renderRoomManagement();
  updateGrid();
  renderHospitalCanvas();
  updateQueue();
  updateStats();
  evaluateObjectives();
  updateDesignerSummary();
  updateBuildGuidance();
  logEvent(
    `${blueprint.name} constructed at ${coordLabel} (${footprint.width}×${footprint.height}) for ¤${formatCurrency(
      preview.totalCost
    )} with ${machines.length} machines and ${decorations.length} decor upgrades.`,
    "positive"
  );
  setActiveInteriorRoom(room.id);
  setStructurePlacementMode("placing-door", room.id);
  renderBuildMenuStructure();
  renderBuildMenuInteriors();
  updateBuildTabStates();
  setBuildMenuTab("structure");
  if (elements.liveBuild?.footnote) {
    const followUp = fromDrag
      ? "Drag another footprint or press Esc to cancel."
      : "Click another starting spot or press Esc to cancel.";
    elements.liveBuild.footnote.textContent = `${blueprint.name} placed at plot ${coordLabel} covering ${
      footprint.width
    }×${footprint.height}. ${followUp}`;
  }
  return true;
};

const establishStartingRoom = ({
  type,
  x,
  y,
  width,
  height,
  interiorId,
  machines = ["standard-kit"],
  decorations = [],
}) => {
  const blueprint = getBlueprint(type);
  if (!blueprint) return null;
  const layout = createCustomLayoutOption(width, height);
  if (!canPlaceFootprint(x, y, layout.width, layout.height)) {
    return null;
  }
  const theme = getInteriorTheme(interiorId);
  const interior = theme?.id ?? blueprint.designProfile?.interiors?.[0] ?? ROOM_INTERIOR_LIBRARY[0].id;
  const normalizedMachines = machines.length ? machines.slice() : ["standard-kit"];
  if (!normalizedMachines.includes("standard-kit")) {
    normalizedMachines.unshift("standard-kit");
  }
  const normalizedDecor = decorations.slice();
  const preview = summarizeRoomDesign({
    blueprint,
    sizeId: layout.id,
    layoutOverride: layout,
    interiorId: interior,
    machines: normalizedMachines,
    decorations: normalizedDecor,
  });
  const defaultDoorIndex = Math.min(layout.width - 1, Math.max(0, Math.floor(layout.width / 2)));
  const defaultWindowIndex = Math.min(layout.height - 1, Math.max(0, Math.floor(layout.height / 2)));
  const room = {
    id: `room-${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    name: blueprint.name,
    sizeId: layout.id,
    interiorId: interior,
    machines: [...normalizedMachines],
    decorations: [...normalizedDecor],
    width: layout.width,
    height: layout.height,
    x,
    y,
    baseCost: blueprint.cost,
    costInvested: preview.totalCost,
    upkeep: preview.upkeep,
    severityCapacity: Math.max(
      0,
      Math.round((blueprint.baseSeverity ?? 0) + (preview.severityBoost ?? 0))
    ),
    builtAt: -(NEW_ROOM_HIGHLIGHT_TICKS * 2),
    doors: layout.width > 0 ? [{ wall: "south", index: defaultDoorIndex }] : [],
    windows:
      layout.height > 0
        ? [
            { wall: "west", index: defaultWindowIndex },
            { wall: "east", index: defaultWindowIndex },
          ]
        : [],
    wallsComplete: true,
    doorInstalled: true,
  };
  ensureRoomStructure(room);
  occupyRoomFootprint(room);
  state.rooms.push(room);
  return room;
};

const seedBaseHospital = () => {
  if (!Array.isArray(state.shells) || !state.shells.length) {
    state.shells = deriveCampusShells();
  }
  if (state.rooms.length) {
    state.rooms.forEach((room) => occupyRoomFootprint(room));
  }
};

const handleBuildClick = (x, y) => {
  if (designerState.editingRoomId) {
    logEvent("Apply or cancel the current room edit before placing new rooms.", "warning");
    return;
  }
  if (buildPreviewState.active) {
    return;
  }
  placeRoomAt(x, y, getSizeOption(designerState.sizeId));
};

const investResearch = (projectId) => {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project || project.unlocked) return;
  if (state.stats.cash < project.cost) {
    logEvent("Not enough cash to invest in research.", "negative");
    return;
  }
  state.stats.cash -= project.cost;
  project.progress = Math.min(100, project.progress + 20);
  if (project.progress >= 100) {
    project.unlocked = true;
    unlockResearchReward(project);
  }
  renderProjects();
  updateStats();
};

const unlockResearchReward = (project) => {
  switch (project.id) {
    case "imaging":
      ensureProjectArtifacts("imaging");
      logEvent("Radiology unlocked via Advanced Imaging research!", "positive");
      break;
    case "biofilter":
      state.stats.cleanliness = Math.min(100, state.stats.cleanliness + 15);
      logEvent("Hospital cleanliness improved thanks to bio-filtered air.", "positive");
      break;
    case "wellness":
      state.stats.morale = Math.min(100, state.stats.morale + 15);
      logEvent("Staff morale surges with holistic wellness upgrades.", "positive");
      break;
    default:
      break;
  }
};

const launchCampaign = (campaignId) => {
  const campaign = state.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return;
  if (state.stats.cash < campaign.cost) {
    logEvent("Campaign is too expensive right now.", "negative");
    return;
  }
  state.stats.cash -= campaign.cost;
  state.marketingEffects.push({
    ...campaign,
    remaining: campaign.duration,
  });
  logEvent(`${campaign.name} launched!`, "positive");
  updateStats();
};

const evaluateObjectives = () => {
  state.objectives.forEach((objective) => {
    if (!objective.completed && objective.condition(state)) {
      objective.completed = true;
      state.stats.reputation += 4;
      logEvent(`Objective completed: ${objective.text}`, "positive");
    }
  });
  updateObjectives();
  updateStats();
};

const seedPatientVitals = (patient) => {
  if (!patient) return patient;
  if (typeof patient.health !== "number" || Number.isNaN(patient.health)) {
    const base = patient.isEmergency ? 52 + Math.random() * 18 : 68 + Math.random() * 20;
    patient.health = clamp(base, 10, 100);
  } else {
    patient.health = clamp(patient.health, 0, 100);
  }
  if (typeof patient.diagnosisProgress !== "number" || Number.isNaN(patient.diagnosisProgress)) {
    const base = patient.isEmergency ? 38 + Math.random() * 28 : 55 + Math.random() * 25;
    patient.diagnosisProgress = clamp(base, 5, 95);
  } else {
    patient.diagnosisProgress = clamp(patient.diagnosisProgress, 0, 100);
  }
  if (!Array.isArray(patient.cureHistory)) {
    patient.cureHistory = [];
  }
  return patient;
};

const createPatient = ({ ailment = randomFrom(ailments), emergency = false } = {}) => {
  const profile = randomFrom(billingProfiles);
  let patience = emergency ? 140 : 100;
  patience += state.ambience.environment * 4;
  patience += state.ambience.welfare * 2;
  if (elements.policies.fastTrack.checked) {
    patience += emergency ? 20 : 10;
  }
  if (hasRoomBuilt("cafeteria")) {
    patience += 5;
  }
  if (hasRoomBuilt("triage")) {
    patience += emergency ? 10 : 6;
  }
  if (hasRoomBuilt("clowncare")) {
    patience += 4;
  }
  if (hasRoomBuilt("holotheatre")) {
    patience += 6;
  }
  if (hasRoomBuilt("zen")) {
    patience += 3;
  }
  const patient = {
    id: patientIdCounter++,
    name: randomFrom(patientNames),
    ailment,
    patience,
    profile,
    isEmergency: emergency,
    blockedBy: null,
    position: { ...getEntrancePosition() },
    path: [],
    status: "arriving",
    mood: "calm",
    targetRoomId: null,
    treatmentTicks: 0,
    intent: null,
    brainCooldown: 2 + Math.random() * 4,
  };
  ensureAgentMotion(patient);
  return seedPatientVitals(patient);
};

const spawnPatient = ({ emergency = false, ailment, announce = emergency } = {}) => {
  const patient = createPatient({ ailment: ailment || randomFrom(emergency ? emergencyCases : ailments), emergency });
  if (emergency) {
    state.queue.unshift(patient);
  } else {
    state.queue.push(patient);
  }
  state.patientsOnSite.push(patient);
  if (announce) {
    const tone = emergency ? "warning" : "neutral";
    const verb = emergency ? "in crisis" : "seeking help for";
    logEvent(`${patient.name} arrives ${verb} ${patient.ailment.name}.`, tone);
  }
  updateQueue();
  return patient;
};

const adjustStaffMorale = () => {
  if (!state.staff.length) {
    state.stats.morale = Math.max(0, state.stats.morale - 0.2);
    return;
  }
  const moraleDelta = state.rooms.some((room) => room.type === "staffroom") ? 1 : -1;
  state.staff.forEach((member) => {
    member.morale = Math.max(0, Math.min(100, member.morale + moraleDelta));
  });
  state.stats.morale = Math.round(
    state.staff.reduce((acc, cur) => acc + cur.morale, 0) / state.staff.length
  );
};

const processQueue = () => {
  if (!state.queue.length) return false;
  const patient = state.queue[0];
  if (patient.status !== "queuing") {
    return false;
  }
  const treatmentRoom = state.rooms.find((room) => room.type === patient.ailment.room);
  if (!treatmentRoom) return false;
  const hasStaff = treatmentRoom.roleRequired.every((role) =>
    state.staff.some((member) => member.role === role)
  );
  if (!hasStaff) return false;
  const blueprint = getBlueprint(treatmentRoom.type);
  const severityCapacity =
    treatmentRoom.severityCapacity ??
    Math.max(0, Math.round((blueprint?.baseSeverity ?? 0) + (treatmentRoom.severityBoost ?? 0)));
  if (severityCapacity && patient.ailment.severity > severityCapacity) {
    if (patient.blockedBy !== treatmentRoom.id) {
      patient.blockedBy = treatmentRoom.id;
      logEvent(
        `${patient.name} requires upgraded equipment in ${blueprint?.name ?? treatmentRoom.type}.`,
        "warning"
      );
    }
    return false;
  }
  patient.blockedBy = null;
  state.queue.shift();
  patient.status = "moving-to-room";
  patient.targetRoomId = treatmentRoom.id;
  patient.mood = patient.isEmergency ? "urgent" : "hopeful";
  patient.path = createPath(patient.position, getRoomDoorPosition(treatmentRoom), {
    allowRoomId: treatmentRoom.id,
  });
  patient.treatmentTicks = TREATMENT_DURATION_TICKS;
  state.activePatients.push(patient);
  syncQueuePositions();
  return true;
};

const completeTreatment = (patient, treatmentRoom) => {
  const outcome = calculateBillingOutcome(patient);
  state.stats.cash += outcome.netCash;
  state.stats.revenueToday += outcome.netCash;
  state.stats.patientsTreated += 1;
  const reputationBoost = patient.isEmergency ? 2 : 1;
  state.stats.reputation = clamp(state.stats.reputation + reputationBoost, 0, 100);
  state.stats.efficiency = clamp(state.stats.efficiency + (patient.isEmergency ? 1 : 0.5), 0, 100);
  state.stats.cleanliness = clamp(state.stats.cleanliness - (patient.isEmergency ? 1 : 0.5), 0, 100);
  if (patient.ailment.room === "maternity") {
    state.stats.reputation = clamp(state.stats.reputation + 2, 0, 100);
  }
  if (patient.ailment.room === "pediatrics") {
    state.stats.reputation = clamp(state.stats.reputation + 1, 0, 100);
  }
  if (["clowncare", "holotheatre"].includes(patient.ailment.room)) {
    state.stats.morale = clamp(state.stats.morale + 2, 0, 100);
  }
  if (patient.ailment.room === "zen") {
    state.stats.morale = clamp(state.stats.morale + 1.5, 0, 100);
  }
  if (patient.ailment.room === "burn") {
    state.stats.cleanliness = clamp(state.stats.cleanliness - 0.5, 0, 100);
  }
  state.stats.morale = clamp(state.stats.morale + state.ambience.morale * 0.05, 0, 100);
  state.stats.reputation = clamp(state.stats.reputation + state.ambience.reputation * 0.05, 0, 100);
  if (outcome.financeFee) {
    state.stats.expensesToday += outcome.financeFee;
    recordLedgerEvent({
      name: "Card Processing",
      detail: `${patient.name} fee`,
      amount: -outcome.financeFee,
      tag: "Billing",
    });
  }
  if (outcome.plan && !outcome.plan.preview) {
    addInstallmentPlan(outcome.plan);
  }
  recordBilling(patient, outcome);
  const blueprint = getBlueprint(treatmentRoom.type);
  patient.health = clamp((patient.health ?? 60) + 30, 0, 100);
  patient.diagnosisProgress = 100;
  patient.cureHistory = Array.isArray(patient.cureHistory) ? patient.cureHistory : [];
  patient.cureHistory.unshift({
    label: blueprint?.name ?? treatmentRoom.type,
    charge: outcome.charge,
    method: outcome.methodLabel,
    day: state.stats.day,
  });
  if (patient.cureHistory.length > 5) {
    patient.cureHistory.length = 5;
  }
  let logMessage = `${patient.name} treated for ${patient.ailment.name} (${patient.profile.label}). Charge ¤${formatCurrency(
    outcome.charge
  )} via ${outcome.methodLabel}.`;
  if (outcome.receivable) {
    logMessage += ` ¤${formatCurrency(outcome.receivable)} scheduled for installments.`;
  }
  logEvent(logMessage, "positive");
  patient.status = "leaving";
  patient.mood = "relieved";
  patient.path = createPath(patient.position, getExitPosition());
  patient.targetRoomId = null;
  patient.treatmentTicks = 0;
  state.activePatients = state.activePatients.filter((entry) => entry.id !== patient.id);
};

const updatePatientAgents = (deltaSeconds = 1, { progressSimulation = true } = {}) => {
  const exit = getExitPosition();
  state.activePatients = state.activePatients.filter((patient) =>
    ["moving-to-room", "in-treatment"].includes(patient.status)
  );
  state.patientsOnSite = state.patientsOnSite.filter((patient) => {
    if (!patient.position) {
      patient.position = { ...getEntrancePosition() };
    }
    switch (patient.status) {
      case "arriving":
      case "queuing": {
        if (progressSimulation) {
          updatePatientIntelligence(patient, deltaSeconds);
        }
        if (patient.path?.length) {
          const arrived = stepAgent(patient, AGENT_PATIENT_SPEED * 0.85, deltaSeconds);
          if (arrived) {
            if (patient.status === "arriving") {
              patient.status = "queuing";
            }
            if (patient.intent?.type === "roam") {
              patient.intent.waitTimer =
                patient.intent.waitTimer ?? (1.5 + Math.random() * 2.5);
            } else if (patient.intent?.type === "return") {
              patient.intent = null;
              patient.mood = patient.patience < 40 ? "uneasy" : "calm";
              patient.brainCooldown = 5 + Math.random() * 5;
            }
          }
        }
        break;
      }
      case "moving-to-room": {
        const room = state.rooms.find((entry) => entry.id === patient.targetRoomId);
        if (!room) {
          patient.status = "queuing";
          break;
        }
        if (!patient.path?.length) {
          const center = getRoomCenter(room);
          if (distanceBetween(patient.position, center) > 0.05) {
            patient.path = createPath(patient.position, center, { allowRoomId: room.id });
          } else if (progressSimulation) {
            patient.status = "in-treatment";
          }
        } else {
          stepAgent(patient, AGENT_PATIENT_SPEED, deltaSeconds);
        }
        break;
      }
      case "in-treatment": {
        if (progressSimulation) {
          patient.treatmentTicks -= deltaSeconds;
          if (patient.treatmentTicks <= 0) {
            const room = state.rooms.find((entry) => entry.id === patient.targetRoomId);
            if (room) {
              completeTreatment(patient, room);
            } else {
              patient.status = "leaving";
              patient.path = createPath(patient.position, exit);
            }
          }
        }
        break;
      }
      case "leaving": {
        if (!patient.path?.length) {
          patient.path = createPath(patient.position, exit);
        }
        const done = stepAgent(patient, AGENT_PATIENT_SPEED, deltaSeconds);
        if (done && distanceBetween(patient.position, exit) < 0.1) {
          state.activePatients = state.activePatients.filter((entry) => entry.id !== patient.id);
          return false;
        }
        break;
      }
      default:
        break;
    }
    if (!patient.path?.length) {
      updateAgentMotion(patient, 0, deltaSeconds);
    }
    return true;
  });
  maintainSelectedPatient();
};

const getStaffIdleSpot = (index) => ({
  x: ENTRANCE_X - 0.6 + (index % 4) * 0.7,
  y: getCorridorY() + 0.6 + Math.floor(index / 4) * 0.45,
});

const syncStaffAgents = () => {
  const previous = new Map(state.staffAgents.map((agent) => [agent.staffId, agent]));
  state.staffAgents = state.staff.map((staff, index) => {
    const agent = previous.get(staff.id) ?? {
      id: `staff-agent-${staff.id}`,
      staffId: staff.id,
      position: { ...getStaffIdleSpot(index) },
      path: [],
      status: "patrolling",
      targetRoomId: null,
      patrolIndex: 0,
      restTicks: Math.floor(Math.random() * 12),
    };
    agent.staff = staff;
    agent.homeIndex = index;
    ensureAgentMotion(agent);
    return agent;
  });
};

const updateStaffAgents = (deltaSeconds = 1, { progressSimulation = true } = {}) => {
  if (!state.staff.length) {
    state.staffAgents = [];
    return;
  }
  syncStaffAgents();
  const emergencyPatient = state.queue.find((patient) => patient.isEmergency && patient.status === "queuing");
  state.staffAgents.forEach((agent, index) => {
    if (!agent.position) {
      agent.position = { ...getStaffIdleSpot(index) };
    }
    if (agent.path?.length) {
      const arrived = stepAgent(agent, AGENT_STAFF_SPEED, deltaSeconds);
      if (arrived) {
        agent.position = agent.destination ? { ...agent.destination } : agent.position;
        agent.path = [];
        agent.destination = null;
        if (agent.status === "moving" || agent.status === "assist-queue") {
          agent.restTicks = 4 + Math.floor(Math.random() * 6);
          agent.status = agent.status === "assist-queue" ? "assisting" : "observing";
        }
      }
    }
    if (!agent.path?.length) {
      updateAgentMotion(agent, 0, deltaSeconds);
    }
    if (agent.path?.length) {
      return;
    }
    if (agent.restTicks > 0 && ["observing", "assisting"].includes(agent.status)) {
      if (progressSimulation) {
        agent.restTicks = Math.max(0, agent.restTicks - deltaSeconds);
        if (agent.restTicks <= 0) {
          agent.status = "patrolling";
        }
      }
      return;
    }
    if (!progressSimulation) {
      return;
    }
    const staffRole = agent.staff?.role;
    if (
      emergencyPatient &&
      ["assistant", "nurse", "doctor"].includes(staffRole) &&
      agent.status !== "assist-queue"
    ) {
      agent.status = "assist-queue";
      setAgentDestination(agent, getQueueSlotPosition(0));
      return;
    }
    const coverRooms = state.rooms
      .filter((room) => room.roleRequired?.includes(staffRole))
      .sort((a, b) => a.x + a.y - (b.x + b.y));
    if (coverRooms.length) {
      const patrolIndex = agent.patrolIndex % coverRooms.length;
      const target = coverRooms[patrolIndex];
      agent.patrolIndex = (agent.patrolIndex + 1) % Math.max(1, coverRooms.length);
      agent.status = "moving";
      agent.targetRoomId = target.id;
      setAgentDestination(agent, getRoomCenter(target), { allowRoomId: target.id });
      return;
    }
    agent.status = "idle";
    setAgentDestination(agent, getStaffIdleSpot(index));
  });
};

const handleEmergencyEvents = () => {
  if (state.stats.tick < DAY_TICKS) return;
  if (state.queue.some((patient) => patient.isEmergency)) return;
  if (Math.random() < 0.08) {
    const emergency = spawnPatient({ emergency: true, ailment: randomFrom(emergencyCases), announce: true });
    emergency.patience += 20;
  }
};

const handlePatientPatience = () => {
  let changed = false;
  const triageSupport = hasRoomBuilt("triage") && countStaffByRole("nurse") && countStaffByRole("assistant");
  const entertainerSupport = hasRoomBuilt("clowncare") && countStaffByRole("entertainer");
  const theatreSupport = hasRoomBuilt("holotheatre") && countStaffByRole("entertainer");
  const zenSupport = hasRoomBuilt("zen") && countStaffByRole("therapist");
  const gourmetSupport = hasRoomBuilt("gourmet") && countStaffByRole("chef");
  const giftSupport = hasRoomBuilt("giftshop") && countStaffByRole("assistant");
  const securityCover = hasRoomBuilt("securityoffice") && countStaffByRole("security");
  const snackSupport = getTotalAmenityCount("snack");
  const hydrationSupport = getTotalAmenityCount("hydration");
  state.queue = state.queue.filter((patient) => {
    seedPatientVitals(patient);
    let patienceDrop = patient.isEmergency ? 6 : 4;
    if (triageSupport) {
      patienceDrop -= 1;
    }
    if (entertainerSupport) {
      patienceDrop -= 0.5;
    }
    if (theatreSupport) {
      patienceDrop -= 0.5;
    }
    if (zenSupport) {
      patienceDrop -= 0.3;
    }
    if (gourmetSupport) {
      patienceDrop -= 0.2;
    }
    if (hydrationSupport) {
      patienceDrop -= Math.min(1, hydrationSupport * 0.15);
    }
    patienceDrop -= state.ambience.environment * 0.3;
    patienceDrop = Math.max(1, patienceDrop);
    patient.patience -= patienceDrop;
    if (hasRoomBuilt("cafeteria")) {
      patient.patience += 1;
    }
    if (giftSupport) {
      patient.patience += 0.5;
    }
    if (snackSupport) {
      patient.patience += Math.min(2, snackSupport * 0.6);
    }
    if (hydrationSupport) {
      patient.patience += Math.min(1, hydrationSupport * 0.4);
    }
    if (zenSupport) {
      patient.patience += 0.4;
    }
    patient.patience += state.ambience.welfare * 0.3;
    patient.patience += state.ambience.morale * 0.15;
    patient.patience = clamp(patient.patience, 0, 180);
    let healthDrop = patient.isEmergency ? 1.4 : 0.9;
    if (triageSupport) {
      healthDrop -= 0.35;
    }
    if (zenSupport) {
      healthDrop -= 0.2;
    }
    if (snackSupport) {
      healthDrop -= Math.min(0.3, snackSupport * 0.05);
    }
    if (hydrationSupport) {
      healthDrop -= Math.min(0.5, hydrationSupport * 0.08);
    }
    healthDrop -= state.ambience.welfare * 0.05;
    healthDrop = Math.max(0.1, healthDrop);
    patient.health = clamp((patient.health ?? 70) - healthDrop, 0, 100);
    const diagnosisGain = triageSupport ? 1.4 : patient.isEmergency ? 0.9 : 0.7;
    if (patient.diagnosisProgress < 95) {
      patient.diagnosisProgress = clamp(patient.diagnosisProgress + diagnosisGain, 0, 95);
    }
    if (patient.health < 25 && patient.mood !== "upset") {
      patient.mood = "frail";
    } else if (patient.health < 45 && ["calm", "focused"].includes(patient.mood)) {
      patient.mood = "uneasy";
    }
    if (patient.patience <= 0) {
      changed = true;
      let penalty = patient.isEmergency ? 4 : 2;
      if (securityCover) {
        penalty = Math.max(1, penalty - 1);
      }
      state.stats.reputation = clamp(state.stats.reputation - penalty, 0, 100);
      patient.status = "leaving";
      patient.mood = "upset";
      patient.path = createPath(patient.position, getExitPosition());
      logEvent(`${patient.name} left after waiting too long.`, "negative");
      return false;
    }
    return true;
  });
  return changed;
};

const handleFacilitiesUpkeep = () => {
  const janitors = countStaffByRole("janitor");
  const facilityManagers = countStaffByRole("facility");
  let queueAdjusted = false;
  let cleanliness = clamp(state.stats.cleanliness + janitors * 0.6 + facilityManagers * 0.4 - 0.3, 0, 100);

  const snackVendors = getTotalAmenityCount("snack");
  const hydrationStations = getTotalAmenityCount("hydration");
  const atmCount = getTotalAmenityCount("atm");
  const totalPlants = getTotalPlants();

  if (snackVendors && state.queue.length) {
    const buyers = Math.min(state.queue.length, Math.ceil(Math.random() * snackVendors));
    if (buyers > 0) {
      const spendPer = 9 + Math.floor(Math.random() * 7);
      const revenue = buyers * spendPer;
      state.stats.cash += revenue;
      state.stats.revenueToday += revenue;
      state.stats.morale = clamp(state.stats.morale + buyers * 0.25, 0, 100);
      state.litter = (state.litter ?? 0) + buyers;
      recordLedgerEvent({
        name: "Concessions",
        detail: `${buyers} snack${buyers > 1 ? "s" : ""} sold`,
        amount: revenue,
        tag: "Amenity",
      });
      if (Math.random() < 0.25) {
        logEvent(`${buyers} patient${buyers > 1 ? "s" : ""} grabbed snacks while waiting.`, "neutral");
      }
      queueAdjusted = true;
    }
  }

  if (hydrationStations && state.queue.length) {
    state.queue.forEach((patient) => {
      patient.patience = clamp(patient.patience + hydrationStations * 0.3, 0, 200);
    });
    queueAdjusted = true;
  }

  if (atmCount && Math.random() < 0.2) {
    const visitors = Math.max(1, Math.min(atmCount, Math.round(Math.random() * Math.max(1, state.queue.length))));
    const fees = visitors * 5;
    state.stats.cash += fees;
    state.stats.revenueToday += fees;
    recordLedgerEvent({
      name: "ATM Fees",
      detail: `${visitors} withdrawal${visitors > 1 ? "s" : ""}`,
      amount: fees,
      tag: "Amenity",
    });
    if (Math.random() < 0.3) {
      logEvent(`ATM fees added ¤${formatCurrency(fees)} to today's takings.`, "positive");
    }
  }

  const litterPenalty = (state.litter ?? 0) * 0.25;
  cleanliness = clamp(cleanliness - litterPenalty, 0, 100);
  state.stats.grounds = clamp(state.stats.grounds - litterPenalty * 0.8, 0, 100);

  if (facilityManagers || janitors) {
    const cleaned = Math.min(state.litter ?? 0, facilityManagers * 2 + janitors);
    if (cleaned > 0) {
      state.litter -= cleaned;
      cleanliness = clamp(cleanliness + cleaned * 0.8, 0, 100);
      state.stats.grounds = clamp(state.stats.grounds + cleaned * 1.4, 0, 100);
      if (Math.random() < 0.25) {
        logEvent(`Facility crew cleared ${cleaned} litter pile${cleaned > 1 ? "s" : ""}.`, "positive");
      }
    }
    if (!state.litter && facilityManagers) {
      state.stats.grounds = clamp(state.stats.grounds + facilityManagers * 0.3, 0, 100);
    }
  }

  if (totalPlants) {
    const hydration = facilityManagers * 2;
    const thirst = Math.max(0.6, totalPlants * 0.4);
    state.stats.plantCare = clamp(state.stats.plantCare + hydration - thirst, 0, 100);
    if (facilityManagers && Math.random() < 0.2) {
      logEvent("Facility managers tended to the greenery, lifting the ambience.", "positive");
    }
  } else {
    state.stats.plantCare = clamp(state.stats.plantCare + 0.3, 0, 100);
  }

  state.stats.cleanliness = cleanliness;
  const entertainerCount = countStaffByRole("entertainer");
  const therapistCount = countStaffByRole("therapist");
  const chefCount = countStaffByRole("chef");
  const assistantCount = countStaffByRole("assistant");
  const securityCount = countStaffByRole("security");
  if (hasRoomBuilt("cafeteria")) {
    if (assistantCount) {
      state.queue.forEach((patient) => {
        patient.patience = clamp(patient.patience + assistantCount * 0.4, 0, 160);
      });
      queueAdjusted = true;
    }
  }
  if (hasRoomBuilt("triage") && assistantCount && countStaffByRole("nurse")) {
    state.stats.efficiency = clamp(state.stats.efficiency + 0.3, 0, 100);
  }
  if (hasRoomBuilt("clowncare") && entertainerCount) {
    state.stats.morale = clamp(state.stats.morale + entertainerCount * 0.4, 0, 100);
  }
  if (hasRoomBuilt("holotheatre") && entertainerCount) {
    state.queue.forEach((patient) => {
      patient.patience = clamp(patient.patience + 0.6 * entertainerCount, 0, 180);
    });
    queueAdjusted = true;
  }
  if (hasRoomBuilt("zen") && therapistCount) {
    state.stats.morale = clamp(state.stats.morale + therapistCount * 0.5, 0, 100);
  }
  if (hasRoomBuilt("gourmet") && chefCount) {
    state.stats.morale = clamp(state.stats.morale + chefCount * 0.4, 0, 100);
    state.stats.cleanliness = clamp(state.stats.cleanliness + 0.1 * chefCount, 0, 100);
  }
  if (hasRoomBuilt("giftshop") && assistantCount) {
    state.stats.reputation = clamp(state.stats.reputation + 0.15 * assistantCount, 0, 100);
  }
  if (hasRoomBuilt("securityoffice") && securityCount) {
    state.stats.efficiency = clamp(state.stats.efficiency + securityCount * 0.2, 0, 100);
  }
  if (hasRoomBuilt("maternity") && countStaffByRole("midwife")) {
    state.stats.reputation = clamp(state.stats.reputation + 0.2, 0, 100);
  }
  if (hasRoomBuilt("pediatrics") && countStaffByRole("doctor")) {
    state.stats.reputation = clamp(state.stats.reputation + 0.1, 0, 100);
  }
  if (hasRoomBuilt("oncology") && countStaffByRole("technician")) {
    state.stats.reputation = clamp(state.stats.reputation + 0.2, 0, 100);
  }
  if (hasRoomBuilt("billing") && countStaffByRole("accountant")) {
    state.stats.efficiency = clamp(state.stats.efficiency + 0.2, 0, 100);
  }
  return queueAdjusted;
};

const logDailySummary = () => {
  const revenue = state.stats.revenueToday;
  const expenses = state.stats.expensesToday;
  const net = revenue - expenses;
  const tone = net >= 0 ? "positive" : "negative";
  logEvent(
    `Day ${state.stats.day} summary — Revenue: ¤${formatCurrency(revenue)}, Expenses: ¤${formatCurrency(expenses)}, Net: ¤${formatCurrency(net)}.`,
    tone
  );
};

const payExpenses = () => {
  const wages = state.staff.reduce((sum, staff) => sum + staff.salary, 0);
  const upkeep = state.rooms.reduce((sum, room) => sum + room.upkeep, 0);
  const overtimeCost = elements.policies.overtime.checked ? wages * 0.15 : 0;
  const total = wages + upkeep + overtimeCost;
  state.stats.cash -= total;
  state.stats.expensesToday += total;
  logEvent(`Daily upkeep paid: ¤${formatCurrency(total)}.`, "neutral");
  if (state.stats.cash < 0) {
    state.stats.reputation = Math.max(0, state.stats.reputation - 3);
    logEvent("Debt accrued! Reputation suffers.", "negative");
  }
};

const decayMetrics = () => {
  state.stats.cleanliness = Math.max(0, state.stats.cleanliness - 0.5);
  state.stats.efficiency = Math.max(0, state.stats.efficiency - 0.4);
  if (!elements.policies.overtime.checked) {
    state.stats.morale = Math.max(0, state.stats.morale - 0.5);
  }
  const litterDrag = (state.litter ?? 0) * 0.04;
  state.stats.grounds = clamp(state.stats.grounds - 0.08 - litterDrag, 0, 100);
  const totalPlants = getTotalPlants();
  const plantDecay = totalPlants ? Math.min(3, 0.3 + totalPlants * 0.04) : 0.15;
  state.stats.plantCare = clamp(state.stats.plantCare - plantDecay, 0, 100);
  if (state.stats.cleanliness < 40) {
    state.stats.reputation = Math.max(0, state.stats.reputation - 0.5);
  }
};

const processMarketingEffects = () => {
  state.marketingEffects = state.marketingEffects.filter((effect) => {
    effect.remaining -= 1;
    if (effect.id === "prime") {
      spawnPatient();
    }
    if (effect.id === "investors" && state.stats.morale < 50) {
      state.stats.reputation = Math.max(0, state.stats.reputation - 2);
    }
    if (effect.id === "community") {
      state.stats.reputation = Math.min(100, state.stats.reputation + 1);
    }
    return effect.remaining > 0;
  });
};

const updateDailyReport = () => {
  const wages = state.staff.reduce((sum, staff) => sum + staff.salary, 0);
  const upkeep = state.rooms.reduce((sum, room) => sum + room.upkeep, 0);
  const revenue = state.stats.revenueToday;
  const expenses = state.stats.expensesToday;
  const net = revenue - expenses;
  const litterCount = Math.max(0, Math.round(state.litter ?? 0));
  const loanBalance = Math.round(
    state.loans.reduce((sum, loan) => sum + loan.remainingBalance, 0)
  );
  const receivables = Math.round(
    state.installmentPlans.reduce((sum, plan) => sum + plan.remaining, 0)
  );
  const report = `
    <div><strong>Wages:</strong> ¤${formatCurrency(wages)}</div>
    <div><strong>Upkeep:</strong> ¤${formatCurrency(upkeep)}</div>
    <div><strong>Queue:</strong> ${state.queue.length} patients</div>
    <div><strong>Marketing:</strong> ${state.marketingEffects.length} active</div>
    <div><strong>Grounds:</strong> ${Math.round(state.stats.grounds)} / 100</div>
    <div><strong>Litter:</strong> ${litterCount} pile${litterCount === 1 ? "" : "s"}</div>
    <div><strong>Loans Outstanding:</strong> ¤${formatCurrency(loanBalance)}</div>
    <div><strong>Receivables:</strong> ¤${formatCurrency(receivables)}</div>
    <div><strong>Revenue Today:</strong> ¤${formatCurrency(revenue)}</div>
    <div><strong>Expenses Today:</strong> ¤${formatCurrency(expenses)}</div>
    <div><strong>Net:</strong> ¤${formatCurrency(net)}</div>
  `;
  elements.dailyReport.innerHTML = report;
};

const updateUI = () => {
  updateStats();
  updateQueue();
  renderRoster();
  renderCandidates();
  renderProjects();
  renderCampaigns();
  updateObjectives();
  renderBillingLedger();
  updateDailyReport();
  updateFinancePanels();
};

const tick = () => {
  state.stats.tick += 1;
  if (state.stats.tick % 8 === 0) {
    spawnPatient({ announce: false });
  }
  handleEmergencyEvents();
  const patienceChanged = handlePatientPatience();
  const advancedQueue = processQueue();
  const facilitiesTouched = handleFacilitiesUpkeep();
  adjustStaffMorale();
  decayMetrics();
  recalculateAmbience();
  updatePatientAgents(1, { progressSimulation: true });
  updateStaffAgents(1, { progressSimulation: true });
  if (patienceChanged || facilitiesTouched || advancedQueue) {
    updateQueue();
  }
  updateDailyReport();
  updateStats();
  updateFinancePanels();
  if (isHospitalOverviewOpen()) {
    renderHospitalOverviewModal();
  }
  if (selectedPatientId) {
    updatePatientDetail();
  }
  renderHospitalCanvas();
  if (state.stats.tick % DAY_TICKS === 0) {
    payExpenses();
    processLoans();
    processInstallments();
    processMarketingEffects();
    evaluateObjectives();
    logDailySummary();
    state.stats.day += 1;
    state.stats.revenueToday = 0;
    state.stats.expensesToday = 0;
    updateDailyReport();
    updateStats();
  }
};

let lastAnimationTimestamp = null;

const animateHospitalView = (timestamp) => {
  if (lastAnimationTimestamp === null) {
    lastAnimationTimestamp = timestamp;
  }
  const deltaSeconds = Math.min((timestamp - lastAnimationTimestamp) / 1000, 0.5);
  lastAnimationTimestamp = timestamp;
  showcaseAnimation.time += deltaSeconds;
  showcaseAnimation.pulse = (Math.sin(showcaseAnimation.time * 0.8) + 1) / 2;
  showcaseAnimation.wave = (Math.sin(showcaseAnimation.time * 1.35 + 1.2) + 1) / 2;
  updatePatientAgents(deltaSeconds, { progressSimulation: false });
  updateStaffAgents(deltaSeconds, { progressSimulation: false });
  renderHospitalCanvas();
  if (selectedPatientId) {
    updatePatientDetail();
  }
  requestAnimationFrame(animateHospitalView);
};

const highlightPanel = (selector) => {
  if (!selector) {
    return;
  }
  const panel = document.querySelector(selector);
  if (!panel) {
    return;
  }
  panel.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
  panel.classList.add("highlight-panel");
  setTimeout(() => {
    panel.classList.remove("highlight-panel");
  }, 1200);
};

const updateMenuOptions = (activeTab) => {
  let hasActiveOption = false;
  menuOptions.forEach((option) => {
    const shouldShow = option.dataset.tabTarget === activeTab;
    option.toggleAttribute("hidden", !shouldShow);
    if (!shouldShow) {
      option.classList.remove("active");
    } else if (option.classList.contains("active")) {
      hasActiveOption = true;
    }
  });
  if (!hasActiveOption) {
    const firstVisible = menuOptions.find((option) => !option.hasAttribute("hidden"));
    if (firstVisible) {
      firstVisible.classList.add("active");
    }
  }
};

const setupMenuRail = () => {
  menuOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const targetTab = option.dataset.tabTarget;
      const panelSelector = option.dataset.panel;
      if (targetTab) {
        const targetButton = document.querySelector(`.tab-button[data-tab="${targetTab}"]`);
        if (targetButton && !targetButton.classList.contains("active")) {
          targetButton.click();
        } else if (targetButton) {
          updateMenuOptions(targetTab);
        }
      }
      menuOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");
      if (panelSelector) {
        setTimeout(() => highlightPanel(panelSelector), 150);
      }
    });
  });
};

const setupTabs = () => {
  const buttons = document.querySelectorAll(".tab-button");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `tab-${button.dataset.tab}`);
      });
      updateMenuOptions(button.dataset.tab);
      if (button.dataset.tab === "build") {
        updateBuildGuidance();
      } else {
        clearBuildSelection();
      }
    });
  });
  const activeButton = document.querySelector(".tab-button.active");
  if (activeButton) {
    updateMenuOptions(activeButton.dataset.tab);
  }
};

const setupBuildMenuTabs = () => {
  elements.buildMenuTabs?.forEach((button) => {
    button.addEventListener("click", () => {
      setBuildMenuTab(button.dataset.buildTab ?? "rooms");
    });
  });
};

const setupDesignerControls = () => {
  const { size, theme, apply } = elements.designer;
  if (size) {
    size.addEventListener("change", (event) => {
      designerState.sizeId = event.target.value;
      enforceDesignerCapacities();
      updateDesignerOptions();
      updateBuildGuidance();
    });
  }
  if (theme) {
    theme.addEventListener("change", (event) => {
      designerState.interiorId = event.target.value;
      updateDesignerSummary();
      renderHospitalCanvas();
      updateBuildGuidance();
      const interiorPanel = elements.buildMenuPanels?.interiors;
      if (interiorPanel) {
        interiorPanel.querySelectorAll(".build-chip").forEach((chip) => {
          chip.classList.toggle("selected", chip.dataset.interior === designerState.interiorId);
        });
      }
    });
  }
  if (apply) {
    apply.addEventListener("click", applyDesignToRoom);
  }
};

const init = () => {
  ensureGridCapacity();
  seedBaseHospital();
  setupCanvas();
  if (elements.grid) {
    setupGrid();
    updateGrid();
  }
  setupViewToggle();
  setupZoomControls();
  setupSaveMenu();
  setupLotOverviewMenu();
  setupHospitalOverviewMenu();
  setupPatientDetail();
  setupDesignerControls();
  updateDesignerOptions();
  updateDesignerSummary();
  renderRoomManagement();
  recalculateAmbience();
  renderBuildOptions();
  setupBuildMenuTabs();
  renderOwnedProperties();
  renderPropertyMarket();
  setupTabs();
  setupMenuRail();
  setupAudioControls();
  refreshCandidates();
  renderCandidates();
  renderRoster();
  renderProjects();
  renderCampaigns();
  updateObjectives();
  updateStats();
  updateQueue();
  renderBillingLedger();
  updateDailyReport();
  updateFinancePanels();
  renderHospitalCanvas();
  requestAnimationFrame(animateHospitalView);
  logEvent("Welcome to Pulse Point Hospital!", "positive");
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      openSaveMenu();
      return;
    }
    if (event.key === "Escape") {
      if (isHospitalOverviewOpen()) {
        event.preventDefault();
        closeHospitalOverviewMenu();
        return;
      }
      if (isLotOverviewOpen()) {
        event.preventDefault();
        closeLotOverviewMenu();
        return;
      }
      if (isSaveMenuOpen()) {
        event.preventDefault();
        closeSaveMenu();
        return;
      }
      if (selectedPatientId) {
        event.preventDefault();
        clearSelectedPatient();
        return;
      }
      if (isStructurePlacementActive()) {
        event.preventDefault();
        setStructurePlacementMode("idle");
        renderBuildMenuStructure();
        renderBuildMenuInteriors();
        updateBuildTabStates();
        return;
      }
      if (cancelBuildPreview()) {
        event.preventDefault();
        return;
      }
      clearBuildSelection();
    }
    if (viewMode === "showcase") {
      const key = event.key.toLowerCase();
      const step = event.shiftKey ? ROTATION_KEY_STEP * 2 : ROTATION_KEY_STEP;
      if (key === "arrowleft" || key === "q" || key === "[") {
        event.preventDefault();
        adjustShowcaseRotation(-step);
        return;
      }
      if (key === "arrowright" || key === "e" || key === "]") {
        event.preventDefault();
        adjustShowcaseRotation(step);
        return;
      }
      if (key === "home") {
        event.preventDefault();
        setShowcaseRotation(0, { forceRender: true });
        return;
      }
    }
  });
  if (elements.grid) {
    window.addEventListener("pointermove", handleGridPointerMove);
  }
  window.addEventListener("pointerup", handleGlobalPointerUp);
  window.addEventListener("pointercancel", handleGlobalPointerCancel);
  window.addEventListener("resize", () => {
    const resized = ensureGridCapacity();
    if (resized && elements.grid) {
      setupGrid();
    }
    if (elements.grid) {
      updateGrid();
    }
    setupCanvas();
    renderHospitalCanvas();
  });
  setInterval(tick, 1000);
};

init();
