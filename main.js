import {
  GRID_WIDTH,
  GRID_HEIGHT,
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
  CORRIDOR_Y,
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

const showcaseAnimation = {
  time: 0,
  pulse: 0,
  wave: 0,
};

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

const state = {
  grid: Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(null)),
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

const elements = {
  grid: document.querySelector("#grid"),
  hospitalCanvas: document.querySelector("#hospital-canvas"),
  axisX: document.querySelector("#axis-x"),
  axisY: document.querySelector("#axis-y"),
  buildOptions: document.querySelector("#build-options"),
  buildMenu: document.querySelector("#build-menu"),
  buildMenuTabs: Array.from(document.querySelectorAll("[data-build-tab]")),
  buildMenuPanels: {
    rooms: document.querySelector("#build-menu-rooms"),
    interiors: document.querySelector("#build-menu-interiors"),
    amenities: document.querySelector("#build-menu-amenities"),
  },
  buildHint: document.querySelector("#build-hint"),
  blueprintFootnote: document.querySelector("#blueprint-footnote"),
  property: {
    market: document.querySelector("#property-market"),
    owned: document.querySelector("#property-owned"),
  },
  lotOverview: {
    openButton: document.querySelector("#open-lot-overview"),
    modal: document.querySelector("#lot-overview-menu"),
    list: document.querySelector("#lot-overview-list"),
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

let selectedRoom = null;
let patientIdCounter = 1;
let roomIdCounter = 1;
let staffIdCounter = 1;
let hospitalCtx = null;
let blueprintBuffer = null;
let emptyTileSprite = null;
let lockedTileSprite = null;
const themedTileCache = new Map();
let viewMode = "showcase";
let showcaseZoom = 1;
let showcasePanX = 0;
let showcasePanY = 0;
let isShowcasePanning = false;
let showcasePanPointerId = null;
let showcasePanLastPoint = null;
let lastFocusedBeforeSaveMenu = null;
let lastFocusedBeforeLotOverview = null;
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
  themedTileCache.clear();
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
  const width = GRID_WIDTH * CANVAS_CELL;
  const height = GRID_HEIGHT * CANVAS_CELL;
  const horizontalAllowance = Math.max(0, (width - width / showcaseZoom) / 2);
  const verticalAllowance = Math.max(0, (height - height / showcaseZoom) / 2);
  const limitX = horizontalAllowance + width * SHOWCASE_PAN_PADDING;
  const limitY = verticalAllowance + height * SHOWCASE_PAN_PADDING;
  showcasePanX = clamp(showcasePanX, -limitX, limitX);
  showcasePanY = clamp(showcasePanY, -limitY, limitY);
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
    const width = GRID_WIDTH * CANVAS_CELL;
    const height = GRID_HEIGHT * CANVAS_CELL;
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
  showcasePanX = 0;
  showcasePanY = 0;
  setShowcaseZoom(1, { skipPanAdjustment: true, forceRender: true });
};

const endShowcasePan = () => {
  isShowcasePanning = false;
  showcasePanPointerId = null;
  showcasePanLastPoint = null;
  elements.hospitalCanvas?.classList.remove("is-panning");
};

const handleCanvasPointerDown = (event) => {
  if (viewMode !== "showcase") return;
  if (event.pointerType === "mouse" && event.button !== 0) {
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
  if (event.pointerId !== showcasePanPointerId) {
    return;
  }
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  endShowcasePan();
};

const handleCanvasPointerCancel = (event) => {
  if (event.pointerId && event.pointerId !== showcasePanPointerId) {
    return;
  }
  event.currentTarget?.releasePointerCapture?.(event.pointerId);
  endShowcasePan();
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
    for (let gx = 0; gx <= GRID_WIDTH; gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * CANVAS_CELL, 0);
      ctx.lineTo(gx * CANVAS_CELL, height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= GRID_HEIGHT; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * CANVAS_CELL);
      ctx.lineTo(width, gy * CANVAS_CELL);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(94, 234, 212, 0.15)";
    for (let gy = 0; gy < GRID_HEIGHT; gy++) {
      for (let gx = 0; gx < GRID_WIDTH; gx++) {
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
    ctx.fillText(`${GRID_WIDTH}×${GRID_HEIGHT} tiles`, width - 24, height - 24);
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

const getRoomTileSprite = (theme, visualKey, visual) => {
  const palette = theme?.palette ?? {};
  const cacheKey = [
    visualKey,
    palette.base ?? visual?.color ?? "",
    palette.mid ?? "",
    palette.accent ?? "",
  ].join("|");
  if (!themedTileCache.has(cacheKey)) {
    const canvas = createOffscreenCanvas(CANVAS_CELL, CANVAS_CELL);
    const ctx = canvas.getContext("2d");
    const baseColor = palette.base ?? visual?.color ?? "#475569";
    const accentColor = palette.mid ?? visual?.color ?? "#475569";
    ctx.save();
    ctx.shadowColor = withAlpha(accentColor, 0.25);
    ctx.shadowBlur = 12;
    const baseGradient = ctx.createLinearGradient(0, 0, CANVAS_CELL, CANVAS_CELL);
    baseGradient.addColorStop(0, shiftColor(baseColor, 0.18));
    baseGradient.addColorStop(0.65, baseColor);
    baseGradient.addColorStop(1, shiftColor(baseColor, -0.2));
    ctx.fillStyle = baseGradient;
    drawRoundedRect(ctx, 4, 4, CANVAS_CELL - 8, CANVAS_CELL - 8, 10);
    ctx.fill();
    ctx.save();
    drawRoundedRect(ctx, 4, 4, CANVAS_CELL - 8, CANVAS_CELL - 8, 10);
    ctx.clip();
    const floorLight = ctx.createRadialGradient(
      CANVAS_CELL / 2,
      CANVAS_CELL / 2 + 4,
      CANVAS_CELL * 0.15,
      CANVAS_CELL / 2,
      CANVAS_CELL / 2 + 4,
      CANVAS_CELL * 0.9
    );
    floorLight.addColorStop(0, withAlpha(shiftColor(baseColor, 0.35), 0.4));
    floorLight.addColorStop(0.45, withAlpha(shiftColor(baseColor, 0.1), 0.18));
    floorLight.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = floorLight;
    ctx.fillRect(4, 4, CANVAS_CELL - 8, CANVAS_CELL - 8);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = withAlpha(shiftColor(baseColor, -0.25), 0.4);
    ctx.lineWidth = 1;
    for (let offset = -CANVAS_CELL; offset < CANVAS_CELL * 2; offset += 7) {
      ctx.beginPath();
      ctx.moveTo(offset, 4);
      ctx.lineTo(offset - CANVAS_CELL, CANVAS_CELL - 4);
      ctx.stroke();
    }
    ctx.strokeStyle = withAlpha(shiftColor(baseColor, -0.18), 0.35);
    for (let stripe = 8; stripe < CANVAS_CELL - 8; stripe += 6) {
      ctx.beginPath();
      ctx.moveTo(6, stripe);
      ctx.lineTo(CANVAS_CELL - 6, stripe);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.shadowBlur = 0;
    const accentGradient = ctx.createLinearGradient(0, 0, CANVAS_CELL, CANVAS_CELL / 2);
    accentGradient.addColorStop(0, withAlpha(accentColor, 0.45));
    accentGradient.addColorStop(1, withAlpha(shiftColor(accentColor, -0.3), 0.1));
    ctx.fillStyle = accentGradient;
    drawRoundedRect(ctx, 4, 4, CANVAS_CELL - 8, CANVAS_CELL / 2.6, 10);
    ctx.fill();
    ctx.save();
    if (visual?.furniture) {
      visual.furniture(ctx, 0, 0);
    }
    ctx.restore();
    ctx.restore();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, CANVAS_CELL - 1, CANVAS_CELL - 1);
    themedTileCache.set(cacheKey, canvas);
  }
  return themedTileCache.get(cacheKey);
};

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

const designerState = {
  blueprint: null,
  sizeId: ROOM_SIZE_LIBRARY[0].id,
  interiorId: ROOM_INTERIOR_LIBRARY[0].id,
  machines: new Set(["standard-kit"]),
  decorations: new Set(),
  editingRoomId: null,
  preview: null,
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

const highlightBuildSelection = (roomId) => {
  const container = elements.buildMenuPanels?.rooms ?? elements.buildOptions;
  if (!container) return;
  container.querySelectorAll("[data-room]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.room === roomId);
  });
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

  summary.innerHTML = "";
  summary.append(layoutLine, costLine, upkeepLine, machineLine, decorLine);

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
  const baselineOnly = machineIds.every((id) => id === "standard-kit");
  if (baselineOnly) {
    designerState.machines = new Set(["standard-kit"]);
    const note = document.createElement("p");
    note.textContent = "Baseline kit installed. No specialist machines available for this room.";
    machines.appendChild(note);
  } else {
    machineIds.forEach((id) => {
      const def = getMachineDefinition(id);
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = id;
      checkbox.checked = designerState.machines.has(id);
      if (id === "standard-kit") {
        checkbox.disabled = true;
        designerState.machines.add(id);
      }
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          designerState.machines.add(id);
        } else {
          designerState.machines.delete(id);
          if (!designerState.machines.size) {
            designerState.machines.add("standard-kit");
          }
        }
        updateDesignerSummary();
      });
      const text = document.createElement("span");
      const details = [];
      if (def.severityBoost) {
        details.push(`+${def.severityBoost} severity`);
      }
      if (def.welfareBoost) {
        details.push(`+${def.welfareBoost} welfare`);
      }
      text.textContent = `${def.label} – ¤${formatCurrency(def.cost)}${
        details.length ? ` (${details.join(", ")})` : ""
      }`;
      label.append(checkbox, text);
      machines.appendChild(label);
    });
  }

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
};

const canPlaceFootprint = (x, y, width, height, ignoreRoom = null) => {
  if (x + width > GRID_WIDTH || y + height > GRID_HEIGHT) return false;
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
  for (let y = 0; y <= GRID_HEIGHT - height; y++) {
    for (let x = 0; x <= GRID_WIDTH - width; x++) {
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
  updateBuildGuidance();
};

const setBuildMode = (active) => {
  if (!elements.grid) return;
  elements.grid.classList.toggle("is-building", active);
  if (elements.blueprintFootnote) {
    elements.blueprintFootnote.classList.toggle("active", active);
  }
};

const updateBuildGuidance = () => {
  if (!elements.buildHint) return;
  if (buildPreviewState.active) {
    updateBuildPreviewHint();
    return;
  }
  if (designerState.editingRoomId) {
    const room = getRoomById(designerState.editingRoomId);
    const blueprint = designerState.blueprint ?? (room ? getBlueprint(room.type) : null);
    const sizeLabel = getSizeOption(designerState.sizeId).label;
    elements.buildHint.textContent = `Editing ${blueprint?.name ?? "room"} – ${sizeLabel}. Adjust options then press "Apply design to room".`;
    if (elements.blueprintFootnote) {
      elements.blueprintFootnote.textContent = `Design changes do not require clicking the grid. Apply the update when you are happy with the layout or press Esc to cancel.`;
    }
    setBuildMode(false);
    return;
  }

  const blueprint = selectedRoom ?? designerState.blueprint;
  setBuildMode(Boolean(blueprint));
  if (blueprint) {
    const size = getSizeOption(designerState.sizeId);
    const theme = getInteriorTheme(designerState.interiorId);
    let hint = `Building: ${blueprint.name} – ${size.label}, ${theme.label}. Click and drag to shape the footprint.`;
    let footnote = `Start at your desired corner, then drag to adjust the ${size.width}×${size.height} layout (or larger). Release to build or press Esc to cancel.`;
    if (!hasPlacementForSize(size.width, size.height)) {
      const availableParcel = state.properties.find((parcel) => !parcel.owned);
      const parcelPrompt = availableParcel
        ? `Purchase ${availableParcel.name} from Hospital Grounds to unlock more space.`
        : "Adjust or relocate an existing room to free up space.";
      hint = `No free ${size.width}×${size.height} area for ${blueprint.name}. ${parcelPrompt}`;
      footnote = `Expand the campus or clear space before placing ${blueprint.name}.`;
    }
    elements.buildHint.textContent = hint;
    if (elements.blueprintFootnote) {
      elements.blueprintFootnote.textContent = footnote;
    }
  } else {
    elements.buildHint.textContent = "Select a room type above to begin construction.";
    if (elements.blueprintFootnote) {
      elements.blueprintFootnote.textContent = "Pick a room on the Build tab to start construction.";
    }
  }
};

const clearBuildSelection = () => {
  resetBuildPreview();
  selectedRoom = null;
  designerState.editingRoomId = null;
  designerState.blueprint = null;
  designerState.machines = new Set(["standard-kit"]);
  designerState.decorations = new Set();
  updateBuildGuidance();
  updateDesignerSummary();
  updateDesignerOptions();
  renderRoomManagement();
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
  for (let x = 0; x < GRID_WIDTH; x++) {
    const span = document.createElement("span");
    span.textContent = AXIS_LETTERS[x] ?? String(x + 1);
    elements.axisX.appendChild(span);
  }
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const span = document.createElement("span");
    span.textContent = String(y + 1);
    elements.axisY.appendChild(span);
  }
};

const setupGrid = () => {
  elements.grid.innerHTML = "";
  renderBlueprintAxes();
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
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
  if (!elements.grid) return;
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
  if (elements.blueprintFootnote) {
    elements.blueprintFootnote.textContent = buildPreviewState.valid
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
  const clampedX = clamp(x, 0, GRID_WIDTH - 1);
  const clampedY = clamp(y, 0, GRID_HEIGHT - 1);
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
  const gridX = clamp(Math.floor((relX / rect.width) * GRID_WIDTH), 0, GRID_WIDTH - 1);
  const gridY = clamp(Math.floor((relY / rect.height) * GRID_HEIGHT), 0, GRID_HEIGHT - 1);
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
  const width = GRID_WIDTH * CANVAS_CELL;
  const height = GRID_HEIGHT * CANVAS_CELL;
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
    canvas.addEventListener("pointerleave", handleCanvasPointerCancel);
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
  return { skin, hair, outfit, accent, shadow };
};

const drawHumanFigure = (ctx, palette, { scale = 1 } = {}) => {
  const bodyHeight = HUMAN_BASE_BODY_HEIGHT * scale;
  const bodyWidth = HUMAN_BASE_BODY_WIDTH * scale;
  const headRadius = 4 * scale;
  ctx.save();
  ctx.fillStyle = withAlpha(palette.shadow, 0.45);
  ctx.beginPath();
  ctx.ellipse(0, 3 * scale, bodyWidth * 0.6, 2.8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -bodyHeight);
  ctx.fillStyle = shiftColor(palette.outfit, -0.18);
  drawRoundedRect(ctx, -bodyWidth / 2 - 2.2 * scale, bodyHeight * 0.55, bodyWidth + 4.4 * scale, bodyHeight * 0.25, 5 * scale);
  ctx.fill();
  const torsoGradient = ctx.createLinearGradient(0, 0, 0, bodyHeight);
  torsoGradient.addColorStop(0, shiftColor(palette.outfit, 0.22));
  torsoGradient.addColorStop(1, shiftColor(palette.outfit, -0.2));
  ctx.fillStyle = torsoGradient;
  drawRoundedRect(ctx, -bodyWidth / 2, 0, bodyWidth, bodyHeight, 4 * scale);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  drawRoundedRect(ctx, -bodyWidth * 0.25, bodyHeight * 0.32, bodyWidth * 0.5, bodyHeight * 0.22, 2.5 * scale);
  ctx.fill();
  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.arc(0, -headRadius * 0.6, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.hair;
  ctx.beginPath();
  ctx.arc(0, -headRadius * 0.9, headRadius * 1.2, Math.PI * 1.1, Math.PI * 1.9);
  ctx.lineTo(0, -headRadius * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawMiniAvatar = (ctx, palette, { emergency = false } = {}) => {
  const scale = 0.65;
  const bodyWidth = HUMAN_BASE_BODY_WIDTH * scale;
  ctx.save();
  ctx.translate(0, -6);
  drawHumanFigure(ctx, palette, { scale });
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
  const baseY = GRID_HEIGHT * CANVAS_CELL - 26;
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
    drawMoodGlow(ctx, patient.mood ?? patient.status);
    const palette = getPatientAvatarPalette(patient);
    drawHumanFigure(ctx, palette, { scale: 0.85 });
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
    drawHumanFigure(ctx, palette, { scale: 0.75 });
    ctx.fillStyle = withAlpha(palette.accent, 0.8);
    ctx.font = "700 9px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((agent.staff?.role ?? "").charAt(0).toUpperCase(), 0, -22);
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

const renderBlueprintCanvas = (ctx) => {
  const width = GRID_WIDTH * CANVAS_CELL;
  const height = GRID_HEIGHT * CANVAS_CELL;
  ctx.clearRect(0, 0, width, height);
  const blueprintLayer = getBlueprintBuffer(width, height);
  ctx.drawImage(blueprintLayer, 0, 0);

  ctx.save();
  const corridorY = CORRIDOR_Y * CANVAS_CELL;
  const walkwayGradient = ctx.createLinearGradient(0, corridorY - 18, 0, corridorY + 18);
  walkwayGradient.addColorStop(0, "rgba(15, 23, 42, 0)");
  walkwayGradient.addColorStop(0.5, "rgba(30, 64, 175, 0.18)");
  walkwayGradient.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = walkwayGradient;
  ctx.fillRect(0, corridorY - 18, width, 36);
  ctx.restore();

  const emptyTile = getEmptyTileSprite();
  const lockedTile = getLockedTileSprite();
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
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

const isoProjectBase = (x, y) => ({
  x: (x - y) * (ISO_TILE_WIDTH / 2),
  y: (x + y) * (ISO_TILE_HEIGHT / 2),
});

const createIsoProjector = (width, height) => {
  const corners = [
    isoProjectBase(0, 0),
    isoProjectBase(GRID_WIDTH, 0),
    isoProjectBase(0, GRID_HEIGHT),
    isoProjectBase(GRID_WIDTH, GRID_HEIGHT),
  ];
  const minX = Math.min(...corners.map((point) => point.x));
  const maxX = Math.max(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxY = Math.max(...corners.map((point) => point.y));
  const offsetX = (width - (maxX - minX)) / 2 - minX;
  const offsetY = Math.max(48, 68 - minY);
  return (x, y) => {
    const base = isoProjectBase(x, y);
    return {
      x: base.x + offsetX,
      y: base.y + offsetY,
    };
  };
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

const drawIsoFloorPattern = (ctx, corners, theme) => {
  ctx.save();
  drawIsoPolygon(ctx, corners);
  ctx.clip();
  const bounds = corners.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    { minX: corners[0].x, maxX: corners[0].x, minY: corners[0].y, maxY: corners[0].y }
  );
  ctx.strokeStyle = withAlpha(theme.palette?.decor ?? theme.palette?.accent ?? "#94a3b8", 0.14);
  ctx.lineWidth = 1;
  for (let offset = bounds.minX - 160; offset < bounds.maxX + 160; offset += 12) {
    ctx.beginPath();
    ctx.moveTo(offset, bounds.minY - 120);
    ctx.lineTo(offset + 140, bounds.maxY + 120);
    ctx.stroke();
  }
  ctx.strokeStyle = withAlpha(shiftColor(theme.palette?.base ?? "#1f2937", 0.45), 0.18);
  for (let offset = bounds.minX - 160; offset < bounds.maxX + 160; offset += 14) {
    ctx.beginPath();
    ctx.moveTo(offset, bounds.maxY + 120);
    ctx.lineTo(offset + 160, bounds.minY - 120);
    ctx.stroke();
  }
  ctx.restore();
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

const drawIsoWallWindows = (ctx, bottomStart, bottomEnd, topStart, topEnd, accent, count = 2) => {
  const segments = Math.max(1, Math.round(count));
  const wallVec = {
    x: bottomEnd.x - bottomStart.x,
    y: bottomEnd.y - bottomStart.y,
  };
  const widthVec = {
    x: wallVec.x * 0.08,
    y: wallVec.y * 0.08,
  };
  for (let index = 0; index < segments; index++) {
    const t = (index + 1) / (segments + 1);
    const bottomCenter = lerpPoint(bottomStart, bottomEnd, t);
    const topCenter = lerpPoint(topStart, topEnd, t);
    const bottomLeft = {
      x: bottomCenter.x - widthVec.x,
      y: bottomCenter.y - widthVec.y,
    };
    const bottomRight = {
      x: bottomCenter.x + widthVec.x,
      y: bottomCenter.y + widthVec.y,
    };
    const heightVec = {
      x: topCenter.x - bottomCenter.x,
      y: topCenter.y - bottomCenter.y,
    };
    const topLeft = {
      x: bottomLeft.x + heightVec.x,
      y: bottomLeft.y + heightVec.y,
    };
    const topRight = {
      x: bottomRight.x + heightVec.x,
      y: bottomRight.y + heightVec.y,
    };
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
    ctx.strokeStyle = withAlpha(accent, 0.5);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    const mullionBottom = lerpPoint(bottomLeft, bottomRight, 0.5);
    const mullionTop = lerpPoint(topLeft, topRight, 0.5);
    ctx.beginPath();
    ctx.moveTo(mullionBottom.x, mullionBottom.y);
    ctx.lineTo(mullionTop.x, mullionTop.y);
    ctx.strokeStyle = withAlpha(accent, 0.35);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }
};

const drawIsoDoorway = (ctx, frontLeft, frontRight, accent) => {
  const center = lerpPoint(frontLeft, frontRight, 0.5);
  const widthVec = {
    x: (frontRight.x - frontLeft.x) * 0.18,
    y: (frontRight.y - frontLeft.y) * 0.18,
  };
  const leftBase = {
    x: center.x - widthVec.x,
    y: center.y - widthVec.y,
  };
  const rightBase = {
    x: center.x + widthVec.x,
    y: center.y + widthVec.y,
  };
  const heightVec = { x: 0, y: -ISO_WALL_HEIGHT + 6 };
  const topLeft = { x: leftBase.x + heightVec.x, y: leftBase.y + heightVec.y };
  const topRight = { x: rightBase.x + heightVec.x, y: rightBase.y + heightVec.y };

  const walkway = [
    leftBase,
    rightBase,
    { x: rightBase.x + 18, y: rightBase.y + 28 },
    { x: leftBase.x - 18, y: leftBase.y + 28 },
  ];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(walkway[0].x, walkway[0].y);
  for (let i = 1; i < walkway.length; i++) {
    ctx.lineTo(walkway[i].x, walkway[i].y);
  }
  ctx.closePath();
  const walkGradient = ctx.createLinearGradient(
    (walkway[0].x + walkway[1].x) / 2,
    walkway[0].y,
    (walkway[2].x + walkway[3].x) / 2,
    walkway[2].y
  );
  walkGradient.addColorStop(0, withAlpha(shiftColor(accent, 0.35), 0.45));
  walkGradient.addColorStop(1, withAlpha("#0f172a", 0.85));
  ctx.fillStyle = walkGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(leftBase.x, leftBase.y);
  ctx.lineTo(rightBase.x, rightBase.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(topLeft.x, topLeft.y);
  ctx.closePath();
  const doorGradient = ctx.createLinearGradient(leftBase.x, leftBase.y, topRight.x, topRight.y);
  doorGradient.addColorStop(0, withAlpha("#0f172a", 0.95));
  doorGradient.addColorStop(1, withAlpha(shiftColor(accent, 0.2), 0.55));
  ctx.fillStyle = doorGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.65);
  ctx.lineWidth = 1.1;
  ctx.stroke();
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

const drawIsoRoomShowcase = (ctx, project, room) => {
  const corners = [
    project(room.x, room.y),
    project(room.x + room.width, room.y),
    project(room.x + room.width, room.y + room.height),
    project(room.x, room.y + room.height),
  ];
  const topCorners = corners.map((point) => ({ x: point.x, y: point.y - ISO_WALL_HEIGHT }));
  const theme = getInteriorTheme(room.interiorId);
  const accent = theme.palette?.accent ?? "#38bdf8";
  const mid = theme.palette?.mid ?? theme.palette?.base ?? "#475569";
  const glyph = getRoomGlyph(room.type);
  const recentlyBuilt = isRoomRecentlyBuilt(room);

  ctx.save();
  const shadowPoints = corners.map((point) => ({ x: point.x + 6, y: point.y + 10 }));
  ctx.globalAlpha = 0.25;
  drawIsoPolygon(ctx, shadowPoints);
  ctx.fillStyle = "rgba(8, 15, 32, 1)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawIsoPolygon(ctx, [corners[1], corners[2], topCorners[2], topCorners[1]]);
  const rightGradient = ctx.createLinearGradient(corners[1].x, corners[1].y, topCorners[2].x, topCorners[2].y);
  rightGradient.addColorStop(0, withAlpha(shiftColor(mid, -0.1), 0.92));
  rightGradient.addColorStop(1, withAlpha(shiftColor(mid, -0.35), 0.95));
  ctx.fillStyle = rightGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.35);
  ctx.stroke();
  ctx.restore();
  drawIsoWallWindows(ctx, corners[1], corners[2], topCorners[1], topCorners[2], accent, room.height);

  ctx.save();
  drawIsoPolygon(ctx, [corners[0], corners[3], topCorners[3], topCorners[0]]);
  const leftGradient = ctx.createLinearGradient(corners[0].x, corners[0].y, topCorners[3].x, topCorners[3].y);
  leftGradient.addColorStop(0, withAlpha(shiftColor(mid, 0.15), 0.82));
  leftGradient.addColorStop(1, withAlpha(shiftColor(mid, -0.1), 0.92));
  ctx.fillStyle = leftGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.28);
  ctx.stroke();
  ctx.restore();
  drawIsoWallWindows(ctx, corners[0], corners[3], topCorners[0], topCorners[3], accent, room.width);

  ctx.save();
  drawIsoPolygon(ctx, corners);
  const floorGradient = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
  floorGradient.addColorStop(0, withAlpha(shiftColor(mid, 0.35), 0.96));
  floorGradient.addColorStop(1, withAlpha(shiftColor(mid, -0.15), 0.95));
  ctx.fillStyle = floorGradient;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.7);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  drawIsoFloorPattern(ctx, corners, theme);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.strokeStyle = withAlpha(theme.palette?.base ?? "#1e293b", 0.5);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  drawIsoPolygon(ctx, corners);
  const centerX = (corners[0].x + corners[2].x) / 2;
  const centerY = (corners[0].y + corners[2].y) / 2;
  const glow = ctx.createRadialGradient(centerX, centerY, 6, centerX, centerY, Math.max(room.width, room.height) * 20);
  glow.addColorStop(0, withAlpha(accent, 0.32 + showcaseAnimation.pulse * 0.18));
  glow.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.restore();

  drawIsoDoorway(ctx, corners[3], corners[2], accent);

  if (recentlyBuilt) {
    const elapsed = (state.stats?.tick ?? 0) - (room.builtAt ?? 0);
    const pulse = Math.sin((elapsed / NEW_ROOM_HIGHLIGHT_TICKS) * Math.PI) * 0.5 + 0.5;
    ctx.save();
    drawIsoPolygon(ctx, corners);
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2.4 + pulse * 1.4 + showcaseAnimation.wave * 0.8;
    ctx.strokeStyle = withAlpha(accent, 0.55 + pulse * 0.25 + showcaseAnimation.pulse * 0.15);
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
    ctx.beginPath();
    ctx.ellipse(0, 8, 14, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    ctx.fill();
    const bodyGradient = ctx.createLinearGradient(-6, -14, 6, 10);
    bodyGradient.addColorStop(0, withAlpha(patient.profile.color ?? "#38bdf8", 0.9));
    bodyGradient.addColorStop(1, withAlpha(shiftColor(patient.profile.color ?? "#38bdf8", -0.25), 0.95));
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, -4, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    if (patient.isEmergency) {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    const markerId = getPatientMarkerId(patient);
    if (markerId) {
      drawPatientSymptomMarker(ctx, markerId);
    }

    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.beginPath();
    ctx.arc(0, -12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(241, 245, 249, 0.98)";
    ctx.beginPath();
    ctx.arc(-1.6, -13, 0.95, 0, Math.PI * 2);
    ctx.arc(1.6, -13, 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = patient.isEmergency
      ? "rgba(248, 113, 113, 0.85)"
      : "rgba(15, 23, 42, 0.8)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    const mood = patient.mood ?? patient.status;
    if (mood === "relieved" || mood === "hopeful") {
      ctx.arc(0, -10.4, 2, Math.PI * 0.2, Math.PI * 0.8);
    } else if (mood === "upset" || mood === "urgent") {
      ctx.arc(0, -10, 1.9, Math.PI * 1.2, Math.PI * 1.9, true);
    } else {
      ctx.moveTo(-1.5, -10.4);
      ctx.lineTo(1.5, -10.4);
    }
    ctx.stroke();
    ctx.restore();
  });
};

const drawIsoStaff = (ctx, project) => {
  state.staffAgents.forEach((agent) => {
    if (!agent.position) return;
    const point = project(agent.position.x, agent.position.y);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.beginPath();
    ctx.ellipse(0, 6, 12, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(8, 15, 32, 0.55)";
    ctx.fill();
    const color = STAFF_ROLE_COLORS[agent.staff?.role] ?? "#94a3b8";
    const bodyGradient = ctx.createLinearGradient(-5, -12, 5, 12);
    bodyGradient.addColorStop(0, withAlpha(color, 0.9));
    bodyGradient.addColorStop(1, withAlpha(shiftColor(color, -0.25), 0.95));
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, -3, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.beginPath();
    ctx.arc(0, -10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
};

const drawIsoAgents = (ctx, project) => {
  drawIsoPatients(ctx, project);
  drawIsoStaff(ctx, project);
};

const renderShowcaseCanvas = (ctx) => {
  const width = GRID_WIDTH * CANVAS_CELL;
  const height = GRID_HEIGHT * CANVAS_CELL;
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

  const projector = createIsoProjector(width, height);
  const tiles = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      tiles.push({ x, y, order: x + y });
    }
  }
  tiles.sort((a, b) => a.order - b.order);
  tiles.forEach(({ x, y }) =>
    drawIsoTile(ctx, projector, x, y, {
      locked: !isTileUnlocked(x, y),
      occupant: state.grid[y][x],
    })
  );

  const sortedRooms = [...state.rooms].sort(
    (a, b) => a.x + a.y + a.height - (b.x + b.y + b.height)
  );
  sortedRooms.forEach((room) => drawIsoRoomShowcase(ctx, projector, room));

  drawIsoAgents(ctx, projector);

  state.properties.forEach((parcel) => {
    if (parcel.owned) return;
    const points = [
      projector(parcel.x, parcel.y),
      projector(parcel.x + parcel.width, parcel.y),
      projector(parcel.x + parcel.width, parcel.y + parcel.height),
      projector(parcel.x, parcel.y + parcel.height),
    ];
    ctx.save();
    drawIsoPolygon(ctx, points);
    ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 197, 255, 0.35)";
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  });

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

const updateQueue = () => {
  elements.patientQueue.innerHTML = "";
  state.queue.forEach((patient) => {
    const li = document.createElement("li");
    if (patient.isEmergency) {
      li.classList.add("emergency");
    }
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
    elements.patientQueue.appendChild(li);
  });
  syncQueuePositions();
  renderHospitalCanvas();
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

const describeParcelSize = (parcel) => `${parcel.width}×${parcel.height} tiles`;

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
        <div><dt>Tiles</dt><dd>${formatParcelExtent(parcel)}</dd></div>
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
  renderOwnedProperties();
  renderPropertyMarket();
  updateStats();
  updatePropertyPurchaseButtons();
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
    const roles = room.roleRequired?.length
      ? room.roleRequired.map(formatStaffRole).join(", ")
      : "No staff required";
    button.innerHTML = `
      <div class="build-card__body">
        <strong>${room.name}</strong>
        <span class="build-card__roles">${roles}</span>
        <p>${room.description}</p>
      </div>
      <span class="build-card__cost">¤${formatCurrency(room.cost)}</span>
    `;
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
};

const renderBuildMenuInteriors = () => {
  const container = elements.buildMenuPanels?.interiors;
  if (!container) return;
  container.innerHTML = "";
  ROOM_INTERIOR_LIBRARY.forEach((theme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.interior = theme.id;
    button.className = "build-chip";
    button.innerHTML = `
      <span class="build-chip__swatch" style="--swatch-base:${theme.palette.base}; --swatch-accent:${theme.palette.accent};"></span>
      <span class="build-chip__label">${theme.label}</span>
    `;
    button.addEventListener("click", () => {
      designerState.interiorId = theme.id;
      if (elements.designer.theme) {
        elements.designer.theme.value = theme.id;
      }
      updateDesignerSummary();
      updateDesignerOptions();
      container.querySelectorAll(".build-chip").forEach((chip) => chip.classList.remove("selected"));
      button.classList.add("selected");
    });
    if (designerState.interiorId === theme.id) {
      button.classList.add("selected");
    }
    container.appendChild(button);
  });
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

const setBuildMenuTab = (tab) => {
  if (!elements.buildMenuPanels?.[tab]) {
    tab = "rooms";
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

const renderBuildOptions = () => {
  renderBuildMenuRooms();
  renderBuildMenuInteriors();
  renderBuildMenuAmenities();
  setBuildMenuTab(buildMenuTab);
  if (!designerState.editingRoomId && designerState.blueprint) {
    highlightBuildSelection(designerState.blueprint.id);
  }
  updateBuildGuidance();
};

const randomFrom = (array) => array[Math.floor(Math.random() * array.length)];

const distanceBetween = (a, b) => Math.hypot((b?.x ?? 0) - (a?.x ?? 0), (b?.y ?? 0) - (a?.y ?? 0));

const getEntrancePosition = () => ({ x: ENTRANCE_X, y: CORRIDOR_Y });

const getExitPosition = () => ({ x: ENTRANCE_X - 2, y: CORRIDOR_Y });

const getQueueSlotPosition = (index) => ({
  x: ENTRANCE_X + index * 0.85,
  y: CORRIDOR_Y,
});

const getRoomDoorPosition = (room) => ({
  x: room.x + room.width / 2,
  y: room.y + room.height + 0.1,
});

const getRoomCenter = (room) => ({
  x: room.x + room.width / 2,
  y: room.y + room.height / 2,
});

const createPath = (start, end) => {
  if (!start || !end) return [];
  const path = [];
  const corner = { x: end.x, y: start.y };
  const segments = [corner, end];
  segments.forEach((point) => {
    if (distanceBetween(start, point) > 0.01) {
      path.push({ x: point.x, y: point.y });
      start = point;
    }
  });
  return path;
};

const stepAgent = (agent, speed, deltaSeconds = 1) => {
  if (!agent.path?.length) {
    return true;
  }
  const target = agent.path[0];
  const dx = target.x - agent.position.x;
  const dy = target.y - agent.position.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) {
    agent.path.shift();
    return agent.path.length === 0;
  }
  const distanceThisFrame = Math.max(0, speed * deltaSeconds);
  if (distance <= distanceThisFrame) {
    agent.position.x = target.x;
    agent.position.y = target.y;
    agent.path.shift();
    return agent.path.length === 0;
  }
  agent.position.x += (dx / distance) * distanceThisFrame;
  agent.position.y += (dy / distance) * distanceThisFrame;
  return false;
};

const setAgentDestination = (agent, destination) => {
  if (!agent.position) {
    agent.position = { ...getEntrancePosition() };
  }
  agent.destination = destination ? { ...destination } : null;
  agent.path = destination ? createPath(agent.position, destination) : [];
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
  if (!isSaveMenuOpen()) {
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

  state.rooms = deepClone(payload.rooms ?? []);
  state.rooms.forEach((room) => {
    if (typeof room.builtAt !== "number") {
      room.builtAt = 0;
    }
  });
  state.staff = deepClone(payload.staff ?? []);
  state.candidates = deepClone(payload.candidates ?? []);
  state.queue = deepClone(payload.queue ?? []);
  const queueMap = new Map(state.queue.map((patient) => [patient.id, patient]));
  const hydratePatient = (patient) => {
    if (!patient) return null;
    const base = queueMap.get(patient.id);
    if (base) {
      Object.assign(base, patient);
      return base;
    }
    queueMap.set(patient.id, patient);
    return patient;
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
  state.properties = deepClone(payload.properties ?? createPropertyState());
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

  state.grid = Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(null));
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
  };
  occupyRoomFootprint(room);
  state.rooms.push(room);
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
  if (elements.blueprintFootnote) {
    const followUp = fromDrag
      ? "Drag another footprint or press Esc to cancel."
      : "Click another starting tile or press Esc to cancel.";
    elements.blueprintFootnote.textContent = `${blueprint.name} placed at plot ${coordLabel} covering ${
      footprint.width
    }×${footprint.height}. ${followUp}`;
  }
  return true;
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
  return {
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
  };
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
  patient.path = createPath(patient.position, getRoomDoorPosition(treatmentRoom));
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
        if (patient.path?.length) {
          const arrived = stepAgent(patient, AGENT_PATIENT_SPEED * 0.85, deltaSeconds);
          if (arrived && patient.status === "arriving") {
            patient.status = "queuing";
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
            patient.path = createPath(patient.position, center);
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
    return true;
  });
};

const getStaffIdleSpot = (index) => ({
  x: ENTRANCE_X - 0.6 + (index % 4) * 0.7,
  y: CORRIDOR_Y + 0.6 + Math.floor(index / 4) * 0.45,
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
      setAgentDestination(agent, getRoomCenter(target));
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
      updateDesignerSummary();
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
  setupCanvas();
  setupGrid();
  updateGrid();
  setupViewToggle();
  setupZoomControls();
  setupSaveMenu();
  setupLotOverviewMenu();
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
      if (cancelBuildPreview()) {
        event.preventDefault();
        return;
      }
      clearBuildSelection();
    }
  });
  window.addEventListener("pointermove", handleGridPointerMove);
  window.addEventListener("pointerup", handleGlobalPointerUp);
  window.addEventListener("pointercancel", handleGlobalPointerCancel);
  window.addEventListener("resize", () => {
    setupCanvas();
    renderHospitalCanvas();
  });
  setInterval(tick, 1000);
};

init();
