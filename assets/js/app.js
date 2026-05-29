"use strict";

    /* ============================ Constantes ============================ */
    const STORAGE_KEY = "ferrovia-manager-save-v2";

    function safeGetStorage(key) {
      try { return window.localStorage?.getItem(key); } catch (e) { return null; }
    }
    function safeSetStorage(key, value) {
      try { window.localStorage?.setItem(key, value); } catch (e) {}
    }
    function safeRemoveStorage(key) {
      try { window.localStorage?.removeItem(key); } catch (e) {}
    }
    const PAID_REPAIR_TIME = 18;          // segundos (equipe terceirizada, rápida)
    const CREW_MAX_LEVEL = 8;             // mais etapas de evolução para manutenção própria
    const PREVENT_MAX_LEVEL = 8;          // mais etapas para manutenção preventiva
    const MAX_WAGON_EXTRA = 12;           // até 2 (base) + 12 = 14 vagões
    const BASE_WAGONS = 2;
    const WAGON_BONUS = 180;              // cada vagão aumenta o valor de cada entrega
    const STOP_FINE_RATE = 0.02;          // multa por segundo parado: 2% da entrega atual

    const CREW_TIME = [Infinity, 34, 30, 26, 22, 19, 16, 13, 11];       // segundos por nível
    const CREW_CAPACITY = [0, 1, 1, 2, 2, 3, 3, 4, 5];                 // trechos simultâneos
    const CREW_SHIFT = [
      null,
      { on: 38, off: 32 },
      { on: 46, off: 29 },
      { on: 56, off: 25 },
      { on: 68, off: 22 },
      { on: 82, off: 18 },
      { on: 100, off: 15 },
      { on: 125, off: 12 },
      { on: 999, off: 1 }
    ];

    // Tipos de carga reais da operação ferroviária (multiplicam o valor base)
    const CARGOS = [
      { id: "graos",       nome: "Grãos",       emoji: "🌾", mult: 1.00, cor: "#E3B23C", tipo: "hopper"    },
      { id: "fertilizante",nome: "Fertilizante",emoji: "🧪", mult: 1.10, cor: "#7FE06C", tipo: "gondola"   },
      { id: "acucar",      nome: "Açúcar",      emoji: "🍬", mult: 1.18, cor: "#EEF2F4", tipo: "covered"   },
      { id: "celulose",    nome: "Celulose",    emoji: "📦", mult: 1.28, cor: "#CDB892", tipo: "boxcar"    },
      { id: "combustivel", nome: "Combustível", emoji: "⛽", mult: 1.40, cor: "#AEB9C2", tipo: "tank"      },
      { id: "conteiner",   nome: "Contêineres", emoji: "🚢", mult: 1.55, cor: "#1E9F7F", tipo: "container" }
    ];
    const cargoById = (id) => CARGOS.find(c => c.id === id) || CARGOS[0];

    // Eventos operacionais aleatórios
    const EVENTS = [
      { id: "chuva",    nome: "Chuva forte na via",     emoji: "🌧️", desc: "Aderência reduzida: locomotiva mais lenta.", dur: 14, speed: 0.70 },
      { id: "vento",    nome: "Vento de cauda",         emoji: "🌬️", desc: "Empurrãozinho: composição mais veloz.",      dur: 12, speed: 1.28 },
      { id: "demanda",  nome: "Demanda aquecida",       emoji: "🔥", desc: "Mercado pagando mais por carga entregue.",   dur: 18, value: 1.40 },
      { id: "inspecao", nome: "Via inspecionada",       emoji: "🛡️", desc: "Trechos reforçados: sem novas falhas agora.", dur: 16, suppress: true },
      { id: "desgaste", nome: "Desgaste acelerado",     emoji: "⚠️", desc: "Trilhos castigados: falhas chegam mais cedo.", dur: 14, wear: 1.7 }
    ];

    const ACHIEVEMENTS = {
      first_delivery: { emoji: "🚂", label: "Primeira entrega", desc: "A operação começou a girar!" },
      deliveries_5:   { emoji: "📦", label: "Pegando ritmo", desc: "5 entregas concluídas." },
      deliveries_25:  { emoji: "🏗️", label: "Malha em movimento", desc: "25 entregas concluídas." },
      deliveries_100: { emoji: "🌎", label: "Brasil em movimento", desc: "100 entregas concluídas!" },
      earned_5k:      { emoji: "💵", label: "Caixa saudável", desc: "R$ 5.000 acumulados em receita." },
      earned_25k:     { emoji: "💰", label: "Grande operadora", desc: "R$ 25.000 acumulados em receita." },
      combo_5:        { emoji: "✨", label: "Sequência x5", desc: "5 entregas seguidas sem quebra." },
      combo_10:       { emoji: "🌟", label: "Operação impecável", desc: "10 entregas seguidas sem quebra." },
      wagon_first:    { emoji: "🚃", label: "Composição maior", desc: "Primeiro vagão extra acoplado." },
      contract_first: { emoji: "📋", label: "Contrato fechado", desc: "Primeiro contrato expresso cumprido." },
      crew_hired:     { emoji: "👷", label: "Time de casa", desc: "Equipe própria contratada." },
      storm_survivor: { emoji: "🌦️", label: "Sob chuva", desc: "Operou durante uma tempestade." }
    };

    const SEGMENTS = [
      { id: 0, name: "Trecho 1", x: 25, y: 38 },
      { id: 1, name: "Trecho 2", x: 63, y: 37 },
      { id: 2, name: "Trecho 3", x: 87, y: 50 },
      { id: 3, name: "Trecho 4", x: 49, y: 56 },
      { id: 4, name: "Trecho 5", x: 58, y: 73 }
    ];

    const defaultState = {
      money: 1200,
      worksSpent: 0,
      totalEarned: 0,
      deliveries: 0,
      contractsDone: 0,
      speedLevel: 1,
      cargoLevel: 1,
      cargoValue: 350,
      wagonExtra: 0,
      crewLevel: 0,
      preventLevel: 0,
      trainProgress: 0,
      loanDebt: 0,
      maintenanceFines: 0,
      elapsedMs: 0,
      preventRoundsLeft: 0,
      combo: 0,
      bestCombo: 0,
      currentCargoId: "graos",
      segments: SEGMENTS.map(s => ({ id: s.id, status: "ok", repairLeft: 0, repairTotal: PAID_REPAIR_TIME, by: "paid" })),
      nextBreakAt: 16,
      uptimeMs: 0,
      achievements: {},
      soundOn: true,
      lastSavedAt: Date.now()
    };

    /* ============================ Estado ============================ */
    let state = loadState();
    let lastTick = performance.now();
    let logItems = [];

    // runtime (não persiste)
    let activeEvent = null;          // {def, left}
    let eventCooldown = 12;          // s até o 1º evento
    let contract = null;             // {target, startDeliveries, left, reward}
    let contractCooldown = 25;
    let markerSig = "";              // assinatura do estado dos trechos (rebuild só quando muda)
    let markerRefs = {};             // id -> {root, small, prog, btn, mode}
    let segMid = {};                 // id -> {leftPct, topPct}
    let railLen = 0;
    let audioCtx = null;
    let maintenanceFineNotice = 0;

    const $ = (sel) => document.querySelector(sel);
    const moneyEl = $("#money");
    const speedInfoEl = $("#speedInfo");
    const cargoInfoEl = $("#cargoInfo");
    const comboInfoEl = $("#comboInfo");
    const statusDotEl = $("#statusDot");
    const statusTextEl = $("#statusText");
    const nextBreakInfoEl = $("#nextBreakInfo");
    const repairsInfoEl = $("#repairsInfo");
    const railAreaEl = $("#railArea");
    const railPathEl = $("#railBase");
    const trackDecorEl = $("#trackDecor");
    const trainLayerEl = $("#trainLayer");
    const logEl = $("#log");
    const toastWrapEl = $("#toastWrap");

    const cargoEmojiEl = $("#cargoEmoji");
    const cargoNameEl = $("#cargoName");
    const cargoMultEl = $("#cargoMult");

    const speedUpgradeBtn = $("#speedUpgrade");
    const cargoUpgradeBtn = $("#cargoUpgrade");
    const wagonUpgradeBtn = $("#wagonUpgrade");
    const crewUpgradeBtn = $("#crewUpgrade");
    const preventUpgradeBtn = $("#preventUpgrade");
    const loanButton = $("#loanButton");
    const saveButton = $("#saveButton");
    const resetButton = $("#resetButton");
    const soundToggle = $("#soundToggle");

    const speedLvlEl = $("#speedLvl");
    const cargoLvlEl = $("#cargoLvl");
    const wagonLvlEl = $("#wagonLvl");
    const crewLvlEl = $("#crewLvl");
    const preventLvlEl = $("#preventLvl");

    const eventBannerEl = $("#eventBanner");
    const evEmojiEl = $("#evEmoji");
    const evTitleEl = $("#evTitle");
    const evDescEl = $("#evDesc");
    const evTimerEl = $("#evTimer");

    const contractBoxEl = $("#contractBox");
    const ctTitleEl = $("#ctTitle");
    const ctDescEl = $("#ctDesc");
    const ctTimerEl = $("#ctTimer");

    const stDeliveries = $("#stDeliveries");
    const stEarned = $("#stEarned");
    const stBestCombo = $("#stBestCombo");
    const stContracts = $("#stContracts");
    const stWorks = $("#stWorks");
    const stUptime = $("#stUptime");

    const costWorksEl = $("#costWorks");
    const costOperationalEl = $("#costOperational");
    const costMaintenanceEl = $("#costMaintenance");
    const costCrewEl = $("#costCrew");
    const costLoanEl = $("#costLoan");
    const costTotalEl = $("#costTotal");

    /* ============================ Utilidades ============================ */
    function formatCurrency(value) {
      return Math.round(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function loadState() {
      try {
        const saved = JSON.parse(safeGetStorage(STORAGE_KEY));
        if (!saved) return structuredClone(defaultState);
        const merged = {
          ...structuredClone(defaultState),
          ...saved,
          achievements: { ...(saved.achievements || {}) },
          segments: SEGMENTS.map(s => {
            const old = saved.segments?.find(x => x.id === s.id);
            return {
              id: s.id,
              status: old?.status || "ok",
              repairLeft: old?.repairLeft || 0,
              repairTotal: old?.repairTotal || PAID_REPAIR_TIME,
              by: old?.by || "paid"
            };
          })
        };
        if (!cargoById(merged.currentCargoId)) merged.currentCargoId = "graos";
        merged.maintenanceFines = Number(merged.maintenanceFines || 0);
        merged.elapsedMs = Number(merged.elapsedMs || 0);
        merged.preventRoundsLeft = Number(merged.preventRoundsLeft || 0);
        return merged;
      } catch (error) {
        return structuredClone(defaultState);
      }
    }

    function saveState(showLog = true) {
      state.lastSavedAt = Date.now();
      try { safeSetStorage(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
      if (showLog) addLog("Jogo salvo no navegador.", "good");
    }

    function resetGame() {
      if (!confirm("Tem certeza que deseja reiniciar o jogo?")) return;
      try { safeRemoveStorage(STORAGE_KEY); } catch (e) {}
      state = structuredClone(defaultState);
      state.currentCargoId = pickCargo().id;
      logItems = [];
      activeEvent = null; eventCooldown = 12;
      contract = null; contractCooldown = 25;
      buildTrain();
      addLog("Novo ciclo iniciado. Boa gestão!", "good");
      render();
    }

    /* ============================ Economia ============================ */
    function repairCost(segmentId) {
      return Math.round(160 + state.speedLevel * 28 + state.cargoLevel * 22 + segmentId * 30 + state.deliveries * 6);
    }
    function speedUpgradeCost() { return Math.round(520 * Math.pow(1.55, state.speedLevel - 1)); }
    function cargoUpgradeCost() { return Math.round(680 * Math.pow(1.65, state.cargoLevel - 1)); }
    function wagonUpgradeCost() { return Math.round(900 * Math.pow(1.45, state.wagonExtra)); }
    function crewUpgradeCost() { return state.crewLevel >= CREW_MAX_LEVEL ? Infinity : Math.round(1500 * Math.pow(1.42, state.crewLevel)); }
    function preventUpgradeCost() { return state.preventLevel >= PREVENT_MAX_LEVEL ? Infinity : Math.round(1300 * Math.pow(1.38, state.preventLevel)); }
    function preventiveRoundsForLevel(level) { return 2 + Math.ceil(level * 1.5); }
    function loanOfferAmount() {
      const progress = state.deliveries * 170 + state.totalEarned * 0.08 + state.cargoLevel * 230 + state.wagonExtra * 260 + state.bestCombo * 120;
      return Math.round(Math.max(500, 500 + progress) / 50) * 50;
    }
    function loanPaybackAmount(amount) { return Math.round(amount * 1.30); }

    // Indicadores dos cards de custos exibidos abaixo da dinâmica do trem.
    function operatingCostEstimate() {
      return Math.round(state.deliveries * (70 + wagonCount() * 22) + (state.uptimeMs / 1000) * (0.8 + state.speedLevel * 0.18));
    }
    function maintenanceCostEstimate() {
      const preventiveInvestment = state.preventLevel === 0 ? 0 : Math.round(1300 * (Math.pow(1.38, state.preventLevel) - 1) / 0.38);
      return Math.round(preventiveInvestment + state.deliveries * 30 + repairingCount() * 90 + (state.maintenanceFines || 0));
    }
    function crewCostEstimate() {
      const crewInvestment = state.crewLevel === 0 ? 0 : Math.round(1500 * (Math.pow(1.42, state.crewLevel) - 1) / 0.42);
      return Math.round(crewInvestment + (state.elapsedMs / 60000) * state.crewLevel * 18);
    }
    function loanInterestEstimate() {
      return state.loanDebt > 0 ? Math.min(999999999, Math.round(state.loanDebt * 0.23)) : 0;
    }
    function totalCostEstimate() {
      return state.worksSpent + operatingCostEstimate() + maintenanceCostEstimate() + crewCostEstimate() + loanInterestEstimate();
    }

    function currentSpeed() {
      const base = 1 + (state.speedLevel - 1) * 0.22;
      const evMult = activeEvent?.def.speed || 1;
      return Number((base * evMult).toFixed(2));
    }
    function comboMult() { return 1 + Math.min(state.combo, 10) * 0.08; }
    function valueMult() { return activeEvent?.def.value || 1; }
    function wagonCount() { return BASE_WAGONS + state.wagonExtra; }

    function deliveryValue() {
      const cargo = cargoById(state.currentCargoId);
      const base = state.cargoValue + state.wagonExtra * WAGON_BONUS;
      return Math.round(base * cargo.mult * comboMult() * valueMult());
    }

    function hasBrokenLine() { return state.segments.some(s => s.status === "broken"); }
    function hasAnyProblem() { return state.segments.some(s => s.status !== "ok"); }
    function repairingCount() { return state.segments.filter(s => s.status === "repairing").length; }
    function crewBusy() { return state.segments.filter(s => s.status === "repairing" && s.by === "crew").length; }

    function crewShiftInfo() {
      if (state.crewLevel <= 0) return { active: false, label: "sem equipe", left: 0 };
      const shift = CREW_SHIFT[state.crewLevel] || CREW_SHIFT[CREW_SHIFT.length - 1];
      const cycle = shift.on + shift.off;
      const t = ((state.elapsedMs || 0) / 1000) % cycle;
      const active = t < shift.on;
      return {
        active,
        label: active ? "turno ativo" : "fora do turno",
        left: Math.ceil(active ? shift.on - t : cycle - t),
        on: shift.on,
        off: shift.off
      };
    }
    function isCrewOnShift() { return crewShiftInfo().active; }

    function pickCargo() {
      // sorteio com leve viés para cargas mais comuns no início
      return CARGOS[Math.floor(Math.random() * CARGOS.length)];
    }

    /* ============================ Log e Toasts ============================ */
    function addLog(message, type = "") {
      const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      logItems.unshift({ message, type, time });
      logItems = logItems.slice(0, 30);
      renderLog();
    }

    function renderLog() {
      logEl.innerHTML = logItems.map(item => `
        <div class="log-item ${item.type}">
          <strong>${item.time}</strong> — ${item.message}
        </div>
      `).join("");
    }

    function showToast(emoji, title, desc) {
      const el = document.createElement("div");
      el.className = "toast";
      el.innerHTML = `<span class="t-emoji">${emoji}</span><div class="t-body"><strong>${title}</strong><span>${desc}</span></div>`;
      toastWrapEl.appendChild(el);
      requestAnimationFrame(() => el.classList.add("show"));
      setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => el.remove(), 400);
      }, 4200);
    }

    function unlock(id) {
      if (state.achievements[id]) return;
      const a = ACHIEVEMENTS[id];
      if (!a) return;
      state.achievements[id] = true;
      showToast(a.emoji, "Conquista: " + a.label, a.desc);
      sfx("achv");
    }

    function checkAchievements() {
      if (state.deliveries >= 1) unlock("first_delivery");
      if (state.deliveries >= 5) unlock("deliveries_5");
      if (state.deliveries >= 25) unlock("deliveries_25");
      if (state.deliveries >= 100) unlock("deliveries_100");
      if (state.totalEarned >= 5000) unlock("earned_5k");
      if (state.totalEarned >= 25000) unlock("earned_25k");
      if (state.combo >= 5) unlock("combo_5");
      if (state.combo >= 10) unlock("combo_10");
      if (state.wagonExtra >= 1) unlock("wagon_first");
      if (state.crewLevel >= 1) unlock("crew_hired");
    }

    /* ============================ Áudio (sintetizado) ============================ */
    function ensureAudio() {
      if (audioCtx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { audioCtx = new AC(); } catch (e) { audioCtx = null; }
    }
    function tone(freq, dur, type = "sine", vol = 0.06, when = 0) {
      if (!state.soundOn || !audioCtx) return;
      const t0 = audioCtx.currentTime + when;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
    function sfx(kind) {
      if (!state.soundOn) return;
      ensureAudio();
      if (!audioCtx) return;
      if (audioCtx.state === "suspended") audioCtx.resume();
      switch (kind) {
        case "delivery": tone(660, .12, "triangle", .07); tone(880, .16, "triangle", .07, .1); break;
        case "break":    tone(190, .28, "sawtooth", .05); tone(140, .32, "square", .04, .06); break;
        case "repaired": tone(520, .1, "sine", .06); tone(720, .14, "sine", .06, .08); break;
        case "buy":      tone(440, .08, "square", .05); tone(620, .1, "square", .05, .06); break;
        case "contract": tone(784, .12, "triangle", .07); tone(1046, .16, "triangle", .06, .1); break;
        case "achv":     tone(659, .1, "triangle", .06); tone(880, .1, "triangle", .06, .08); tone(1175, .18, "triangle", .06, .16); break;
        case "click":    tone(360, .05, "square", .04); break;
      }
    }
    function updateSoundButton() {
      soundToggle.textContent = state.soundOn ? "🔊 Som" : "🔇 Som";
      soundToggle.setAttribute("aria-pressed", String(state.soundOn));
    }

    /* ============================ Desenho do trilho ============================ */
    function buildTrackDecor() {
      if (!railPathEl.getTotalLength) return;
      let L = 0;
      try { L = railPathEl.getTotalLength(); } catch (e) { return; }
      if (!L || !isFinite(L)) return;
      railLen = L;

      const GAUGE = 7;     // meia-distância entre os dois trilhos (unidades de viewBox)
      const TIE_STEP = 15; // espaçamento dos dormentes
      const TIE_HALF = 11; // meio comprimento do dormente

      let ties = "";
      let left = [], right = [];
      for (let d = 4; d <= L - 2; d += 2) {
        const p = railPathEl.getPointAtLength(d);
        const p2 = railPathEl.getPointAtLength(Math.min(d + 2, L));
        let nx = -(p2.y - p.y), ny = (p2.x - p.x);
        const len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        left.push([p.x + nx * GAUGE, p.y + ny * GAUGE]);
        right.push([p.x - nx * GAUGE, p.y - ny * GAUGE]);
      }
      for (let d = 6; d <= L - 6; d += TIE_STEP) {
        const p = railPathEl.getPointAtLength(d);
        const p2 = railPathEl.getPointAtLength(Math.min(d + 2, L));
        let nx = -(p2.y - p.y), ny = (p2.x - p.x);
        const len = Math.hypot(nx, ny) || 1;
        nx /= len; ny /= len;
        ties += `<line class="tie" x1="${(p.x + nx * TIE_HALF).toFixed(1)}" y1="${(p.y + ny * TIE_HALF).toFixed(1)}" x2="${(p.x - nx * TIE_HALF).toFixed(1)}" y2="${(p.y - ny * TIE_HALF).toFixed(1)}" />`;
      }
      const toPath = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      trackDecorEl.innerHTML =
        ties +
        `<path class="steel-rail" d="${toPath(left)}" />` +
        `<path class="steel-rail" d="${toPath(right)}" />` +
        `<path class="steel-rail hl" d="${toPath(left)}" />` +
        `<path class="steel-rail hl" d="${toPath(right)}" />`;
    }

    function computeSegmentMidpoints() {
      SEGMENTS.forEach(info => {
        const path = document.getElementById(`seg-${info.id}`);
        let placed = false;
        if (path && path.getTotalLength) {
          try {
            const L = path.getTotalLength();
            if (L && isFinite(L)) {
              const p = path.getPointAtLength(L / 2);
              segMid[info.id] = { leftPct: (p.x / 1000) * 100, topPct: (p.y / 500) * 100 };
              placed = true;
            }
          } catch (e) {}
        }
        if (!placed) segMid[info.id] = { leftPct: info.x, topPct: info.y };
      });
    }

    /* ============================ Desenho do trem (SVG por vagão) ============================ */
    function engineSVG() {
      const W = 60, H = 26;
      return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="engBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#0a4d80"/><stop offset="1" stop-color="#003865"/>
          </linearGradient>
        </defs>
        <!-- passadiços -->
        <rect x="6" y="2.5" width="46" height="3" rx="1.5" fill="#cfd9df"/>
        <rect x="6" y="20.5" width="46" height="3" rx="1.5" fill="#cfd9df"/>
        <!-- corpo com nariz chanfrado à direita -->
        <path d="M6 4 H49 L57 9 V17 L49 22 H6 A3 3 0 0 1 3 19 V7 A3 3 0 0 1 6 4 Z" fill="url(#engBody)" stroke="#fff" stroke-width="1.4"/>
        <!-- faixa verde Rumo -->
        <rect x="6" y="11.5" width="44" height="3" rx="1.5" fill="#1E9F7F"/>
        <!-- cabine -->
        <rect x="9" y="7" width="13" height="12" rx="2.5" fill="#32A6E6" stroke="#fff" stroke-width="1"/>
        <!-- faróis -->
        <circle class="headlight" cx="54" cy="10.5" r="1.8" fill="#FBD300"/>
        <circle class="headlight" cx="54" cy="15.5" r="1.8" fill="#FBD300"/>
        <!-- rodas -->
        <g fill="#0a2438">
          <rect x="13" y="-1.5" width="7" height="4" rx="1.6"/><rect x="26" y="-1.5" width="7" height="4" rx="1.6"/><rect x="39" y="-1.5" width="7" height="4" rx="1.6"/>
          <rect x="13" y="23.5" width="7" height="4" rx="1.6"/><rect x="26" y="23.5" width="7" height="4" rx="1.6"/><rect x="39" y="23.5" width="7" height="4" rx="1.6"/>
        </g>
        <!-- engate -->
        <rect x="0.5" y="11.5" width="4" height="3" rx="1" fill="#54707f"/>
      </svg>`;
    }

    function wagonSVG(cargo) {
      const W = 48, H = 24;
      const c = cargo.cor;
      const wheels = `<g fill="#0a2438">
          <rect x="9" y="-1.5" width="7" height="4" rx="1.6"/><rect x="32" y="-1.5" width="7" height="4" rx="1.6"/>
          <rect x="9" y="21.5" width="7" height="4" rx="1.6"/><rect x="32" y="21.5" width="7" height="4" rx="1.6"/>
        </g>`;
      const couplers = `<rect x="0.5" y="10.5" width="4" height="3" rx="1" fill="#54707f"/><rect x="43.5" y="10.5" width="4" height="3" rx="1" fill="#54707f"/>`;
      let body = "";
      switch (cargo.tipo) {
        case "container":
          body = `<rect x="4" y="6.5" width="40" height="11" rx="1.5" fill="#445b6b"/>
            <rect x="5.5" y="3.5" width="17.5" height="17" rx="2" fill="${c}" stroke="#0c3a2e" stroke-width="1"/>
            <rect x="25" y="3.5" width="17.5" height="17" rx="2" fill="#32A6E6" stroke="#0a3a5c" stroke-width="1"/>
            <g stroke="rgba(0,0,0,.18)" stroke-width="1">
              <line x1="9" y1="4" x2="9" y2="20"/><line x1="13" y1="4" x2="13" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/>
              <line x1="29" y1="4" x2="29" y2="20"/><line x1="33" y1="4" x2="33" y2="20"/><line x1="37" y1="4" x2="37" y2="20"/>
            </g>`;
          break;
        case "tank":
          body = `<rect x="5" y="6.5" width="38" height="11" rx="5.5" fill="${c}" stroke="#5a6670" stroke-width="1.2"/>
            <rect x="5" y="10" width="38" height="2.4" fill="rgba(255,255,255,.6)"/>
            <rect x="20" y="5.5" width="8" height="3" rx="1.4" fill="#7b8893"/>
            <rect x="9" y="6.5" width="3" height="11" fill="#FBD300" opacity=".85"/>
            <rect x="36" y="6.5" width="3" height="11" fill="#FBD300" opacity=".85"/>`;
          break;
        case "hopper":
          body = `<path d="M4 6 H44 V13 L36 20 H12 L4 13 Z" fill="${c}" stroke="#7a5a1e" stroke-width="1.1"/>
            <rect x="4" y="5" width="40" height="3" rx="1.4" fill="#a87f2c"/>
            <g stroke="rgba(0,0,0,.15)" stroke-width="1"><line x1="16" y1="6" x2="16" y2="18"/><line x1="24" y1="6" x2="24" y2="19"/><line x1="32" y1="6" x2="32" y2="18"/></g>`;
          break;
        case "covered":
          body = `<rect x="4" y="6.5" width="40" height="12" rx="2" fill="${c}" stroke="#b9c4cb" stroke-width="1.2"/>
            <path d="M4 6.5 Q24 1.5 44 6.5" fill="none" stroke="#c9d3da" stroke-width="2.4"/>
            <g stroke="rgba(0,0,0,.12)" stroke-width="1"><line x1="14" y1="7" x2="14" y2="18"/><line x1="24" y1="7" x2="24" y2="18"/><line x1="34" y1="7" x2="34" y2="18"/></g>`;
          break;
        case "gondola":
          body = `<rect x="4" y="9" width="40" height="9" rx="1.5" fill="#3a4b57" stroke="#243038" stroke-width="1"/>
            <path d="M6 9 Q14 5 24 6 Q34 7 42 9 Z" fill="${c}"/>`;
          break;
        case "boxcar":
        default:
          body = `<rect x="4" y="6" width="40" height="12.5" rx="2" fill="${c}" stroke="#9a7f55" stroke-width="1.2"/>
            <rect x="20" y="6.5" width="2" height="11.5" fill="rgba(0,0,0,.2)"/>
            <rect x="22" y="6.5" width="2" height="11.5" fill="rgba(0,0,0,.12)"/>`;
          break;
      }
      return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${couplers}${body}${wheels}</svg>`;
    }

    // Comprimentos em unidades de viewBox (para articular sobre a curva)
    const ENGINE_LEN = 70;
    const WAGON_LEN = 56;
    const GAP = 8;

    function buildTrain() {
      const cargo = cargoById(state.currentCargoId);
      const cars = [];
      cars.push({ kind: "engine", html: engineSVG() });
      for (let i = 0; i < wagonCount(); i++) cars.push({ kind: "wagon", html: wagonSVG(cargo) });

      trainLayerEl.innerHTML = "";
      let offset = 0;
      trainLayerEl._cars = cars.map((car, idx) => {
        if (idx === 0) { car.center = ENGINE_LEN / 2; offset = ENGINE_LEN; }
        else { car.center = offset + GAP + WAGON_LEN / 2; offset += GAP + WAGON_LEN; }
        const div = document.createElement("div");
        div.className = "train-car " + car.kind;
        div.innerHTML = car.html;
        trainLayerEl.appendChild(div);
        return { el: div, center: car.center };
      });
      trainLayerEl._trainLen = offset;
    }

    function updateTrain() {
      const cars = trainLayerEl._cars;
      if (!cars || !railPathEl.getPointAtLength) return;
      let L = railLen;
      if (!L) { try { L = railPathEl.getTotalLength(); railLen = L; } catch (e) { return; } }
      if (!L || !isFinite(L)) return;

      const W = railAreaEl.clientWidth || 1000;
      const H = railAreaEl.clientHeight || 500;
      const sx = W / 1000, sy = H / 500;

      const trainLen = trainLayerEl._trainLen || ENGINE_LEN;
      const headMin = ENGINE_LEN / 2;
      const headMax = L - 2;
      const headDist = headMin + (clamp(state.trainProgress, 0, 100) / 100) * (headMax - headMin);

      cars.forEach(car => {
        const d = clamp(headDist - car.center, 1, L - 1);
        const p = railPathEl.getPointAtLength(d);
        const p2 = railPathEl.getPointAtLength(clamp(d + 1.5, 0, L));
        const ang = Math.atan2((p2.y - p.y) * sy, (p2.x - p.x) * sx) * 180 / Math.PI;
        car.el.style.left = (p.x / 1000 * 100) + "%";
        car.el.style.top = (p.y / 500 * 100) + "%";
        car.el.style.transform = `translate(-50%, -50%) rotate(${ang.toFixed(1)}deg)`;
      });

      trainLayerEl.classList.toggle("broken-dim", hasBrokenLine());
    }

    /* ============================ Marcadores de falha ============================ */
    function segmentSignature() {
      return state.segments.map(s => `${s.id}:${s.status}:${s.by}`).join("|");
    }

    function rebuildMarkers() {
      document.querySelectorAll(".break-marker").forEach(el => el.remove());
      markerRefs = {};
      SEGMENTS.forEach(info => {
        const seg = state.segments.find(s => s.id === info.id);
        if (seg.status === "ok") return;
        const pos = segMid[info.id] || { leftPct: info.x, topPct: info.y };
        const marker = document.createElement("div");
        marker.className = "break-marker" + (seg.status === "repairing" ? " repairing" : "");
        marker.style.left = pos.leftPct + "%";
        marker.style.top = pos.topPct + "%";

        if (seg.status === "broken") {
          const cost = repairCost(info.id);
          marker.innerHTML = `
            <strong>⚠️ ${info.name} quebrado</strong>
            <small>Conserto pago: <span data-cost>${formatCurrency(cost)}</span></small>
            <button data-repair="${info.id}">Contratar equipe</button>`;
          markerRefs[info.id] = { mode: "broken", btn: marker.querySelector("button"), cost: marker.querySelector("[data-cost]") };
        } else {
          const label = seg.by === "crew"
            ? "👷 " + info.name + " (equipe própria)"
            : (seg.by === "outsourced" ? "🏗️ " + info.name + " (terceirizada)" : "👷 " + info.name + " em obra");
          marker.innerHTML = `
            <strong>${label}</strong>
            <small data-left>${Math.ceil(seg.repairLeft)}s restantes</small>
            <div class="progress-bar"><span data-prog></span></div>`;
          markerRefs[info.id] = { mode: "repairing", small: marker.querySelector("[data-left]"), prog: marker.querySelector("[data-prog]") };
        }
        railAreaEl.appendChild(marker);
      });
    }

    function updateMarkersDynamic() {
      SEGMENTS.forEach(info => {
        const ref = markerRefs[info.id];
        if (!ref) return;
        const seg = state.segments.find(s => s.id === info.id);
        if (ref.mode === "broken" && ref.btn) {
          const cost = repairCost(info.id);
          ref.btn.disabled = state.money < cost;
        } else if (ref.mode === "repairing") {
          if (ref.small) ref.small.textContent = `${Math.ceil(seg.repairLeft)}s restantes`;
          if (ref.prog) {
            const done = clamp(((seg.repairTotal - seg.repairLeft) / seg.repairTotal) * 100, 0, 100);
            ref.prog.style.width = done + "%";
          }
        }
      });
    }

    function syncMarkers() {
      const sig = segmentSignature();
      if (sig !== markerSig) { markerSig = sig; rebuildMarkers(); }
      updateMarkersDynamic();
    }

    /* ============================ Ações do jogador ============================ */
    function startPaidRepair(segment, source = "manual", force = false) {
      if (!segment || segment.status !== "broken") return false;
      const cost = repairCost(segment.id);
      if (!force && state.money < cost) {
        addLog(`Caixa insuficiente para reparar o ${SEGMENTS[segment.id].name}.`, "bad");
        return false;
      }
      state.money -= cost;
      state.worksSpent += cost;
      segment.status = "repairing";
      segment.by = source === "outsourced" ? "outsourced" : "paid";
      segment.repairTotal = PAID_REPAIR_TIME;
      segment.repairLeft = PAID_REPAIR_TIME;
      const origem = source === "outsourced" ? "terceirizada fora do turno" : "terceirizada";
      addLog(`Equipe ${origem} enviada ao ${SEGMENTS[segment.id].name} por ${formatCurrency(cost)}.`, "work");
      sfx("buy");
      return true;
    }

    function dispatchRepair(segmentId) {
      const segment = state.segments.find(s => s.id === segmentId);
      if (startPaidRepair(segment, "manual", false)) render();
    }

    function buySpeedUpgrade() {
      const cost = speedUpgradeCost();
      if (state.money < cost) return;
      state.money -= cost; state.speedLevel += 1;
      addLog(`Velocidade aumentada para ${(1 + (state.speedLevel - 1) * 0.22).toFixed(2)}x.`, "good");
      sfx("buy"); render();
    }
    function buyCargoUpgrade() {
      const cost = cargoUpgradeCost();
      if (state.money < cost) return;
      state.money -= cost; state.cargoLevel += 1;
      state.cargoValue += 180 + state.cargoLevel * 40;
      addLog(`Valor base da carga elevado para ${formatCurrency(state.cargoValue)}.`, "good");
      sfx("buy"); render();
    }
    function buyWagonUpgrade() {
      if (state.wagonExtra >= MAX_WAGON_EXTRA) return;
      const cost = wagonUpgradeCost();
      if (state.money < cost) return;
      state.money -= cost; state.wagonExtra += 1;
      addLog(`Vagão extra acoplado. A composição agora tem ${wagonCount()} vagões e cada entrega ganha +${formatCurrency(WAGON_BONUS)} de base.`, "good");
      buildTrain(); checkAchievements(); sfx("buy"); render();
    }
    function buyCrewUpgrade() {
      if (state.crewLevel >= CREW_MAX_LEVEL) return;
      const cost = crewUpgradeCost();
      if (state.money < cost) return;
      state.money -= cost; state.crewLevel += 1;
      const shift = CREW_SHIFT[state.crewLevel];
      addLog(`Equipe própria nível ${state.crewLevel}: repara em até ${CREW_TIME[state.crewLevel]}s, capacidade ${CREW_CAPACITY[state.crewLevel]} trecho(s), turno ${shift.on}s/${shift.off}s.`, "good");
      checkAchievements(); sfx("buy"); render();
    }
    function buyPreventUpgrade() {
      if (state.preventLevel >= PREVENT_MAX_LEVEL) return;
      const cost = preventUpgradeCost();
      if (state.money < cost) return;
      state.money -= cost; state.preventLevel += 1;
      const rounds = preventiveRoundsForLevel(state.preventLevel);
      state.preventRoundsLeft += rounds;
      addLog(`Manutenção preventiva nível ${state.preventLevel}: +${rounds} rodada(s) de proteção. Total protegido: ${state.preventRoundsLeft}.`, "good");
      sfx("buy"); render();
    }
    function takeLoan() {
      if (state.loanDebt > 0) return;
      const amount = loanOfferAmount();
      const payback = loanPaybackAmount(amount);
      state.money += amount;
      state.loanDebt = payback;
      addLog(`Empréstimo emergencial de ${formatCurrency(amount)} recebido. Dívida: ${formatCurrency(payback)}.`, "work");
      sfx("buy"); render();
    }

    /* ============================ Falhas / equipe própria ============================ */
    function createBreak() {
      if (state.preventRoundsLeft > 0) {
        state.preventRoundsLeft -= 1;
        addLog(`🛡️ Manutenção preventiva absorveu uma falha. Rodadas protegidas restantes: ${state.preventRoundsLeft}.`, "good");
        return;
      }
      const candidates = state.segments.filter(s => s.status === "ok");
      if (!candidates.length) return;
      const segment = candidates[Math.floor(Math.random() * candidates.length)];
      segment.status = "broken";
      segment.repairLeft = 0;
      addLog(`${SEGMENTS[segment.id].name} quebrou. O trem fica parado até a via ser liberada. Multa: 2% da entrega atual por segundo parado.`, "bad");
      if (state.combo > 0) addLog(`Sequência de ${state.combo}x perdida pela quebra.`, "bad");
      state.combo = 0;
      sfx("break");
    }

    function scheduleNextBreak() {
      const base = 18 + Math.random() * 14;
      const difficulty = Math.max(0, (state.speedLevel + state.cargoLevel - 2) * 0.9);
      const prevention = state.preventLevel * 5 + state.preventRoundsLeft * 0.8;
      state.nextBreakAt = Math.max(8, base - difficulty + prevention);
    }

    function autoCrew() {
      const broken = state.segments.filter(s => s.status === "broken");
      if (!broken.length) return;

      if (state.crewLevel <= 0) return;

      const shift = crewShiftInfo();
      if (!shift.active) {
        broken.forEach(seg => startPaidRepair(seg, "outsourced", true));
        return;
      }

      const capacity = CREW_CAPACITY[state.crewLevel];
      let busy = crewBusy();
      for (const seg of broken) {
        if (busy >= capacity) break;
        seg.status = "repairing";
        seg.by = "crew";
        seg.repairTotal = CREW_TIME[state.crewLevel];
        seg.repairLeft = CREW_TIME[state.crewLevel];
        busy++;
        addLog(`Equipe própria começou a reparar o ${SEGMENTS[seg.id].name} durante o turno ativo (sem custo direto).`, "work");
      }
    }

    function applyMaintenanceFine(dt) {
      if (!hasAnyProblem()) {
        maintenanceFineNotice = 0;
        return;
      }
      const fine = deliveryValue() * STOP_FINE_RATE * dt;
      state.money -= fine;
      state.maintenanceFines = (state.maintenanceFines || 0) + fine;
      maintenanceFineNotice += dt;
      if (maintenanceFineNotice >= 5) {
        maintenanceFineNotice = 0;
        addLog(`Multa por parada: ${formatCurrency(deliveryValue() * STOP_FINE_RATE)} por segundo até a via liberar.`, "bad");
      }
    }

    /* ============================ Eventos e contratos ============================ */
    function maybeStartEvent(dt) {
      if (activeEvent) return;
      eventCooldown -= dt;
      if (eventCooldown > 0) return;
      const def = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      activeEvent = { def, left: def.dur };
      addLog(`${def.emoji} ${def.nome}: ${def.desc}`, "event");
      showToast(def.emoji, def.nome, def.desc);
    }
    function tickEvent(dt) {
      if (!activeEvent) return;
      activeEvent.left -= dt;
      if (activeEvent.left <= 0) {
        if (activeEvent.def.id === "chuva") unlock("storm_survivor");
        addLog(`Fim do evento: ${activeEvent.def.nome}.`, "event");
        activeEvent = null;
        eventCooldown = 22 + Math.random() * 20;
      }
    }

    function maybeStartContract(dt) {
      if (contract) return;
      contractCooldown -= dt;
      if (contractCooldown > 0) return;
      const target = 2 + Math.floor(Math.random() * 3); // 2..4
      const time = target * 30 + 16;
      const reward = Math.round((state.cargoValue + state.wagonExtra * WAGON_BONUS) * target * 0.85);
      contract = { target, startDeliveries: state.deliveries, left: time, reward };
      addLog(`📋 Contrato expresso: entregue ${target} cargas em ${Math.round(time)}s por ${formatCurrency(reward)}.`, "event");
      showToast("📋", "Novo contrato expresso", `${target} entregas em ${Math.round(time)}s → ${formatCurrency(reward)}`);
      sfx("contract");
    }
    function tickContract(dt) {
      if (!contract) return;
      contract.left -= dt;
      const done = state.deliveries - contract.startDeliveries;
      if (done >= contract.target) {
        state.money += contract.reward;
        state.totalEarned += contract.reward;
        state.contractsDone += 1;
        addLog(`✅ Contrato cumprido! Bônus de ${formatCurrency(contract.reward)} recebido.`, "good");
        showToast("✅", "Contrato cumprido!", `Bônus de ${formatCurrency(contract.reward)}`);
        unlock("contract_first");
        sfx("contract");
        contract = null;
        contractCooldown = 18 + Math.random() * 16;
      } else if (contract.left <= 0) {
        addLog("⌛ Contrato expresso expirou. Sem penalidade — venha o próximo.", "bad");
        contract = null;
        contractCooldown = 16 + Math.random() * 14;
      }
    }

    /* ============================ Entrega ============================ */
    function completeDelivery() {
      const cargo = cargoById(state.currentCargoId);
      let earned = deliveryValue();
      state.totalEarned += earned;
      state.deliveries += 1;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);

      if (state.loanDebt > 0) {
        const payment = Math.min(state.loanDebt, Math.round(earned * 0.45));
        state.loanDebt -= payment;
        earned -= payment;
        addLog(`Entrega de ${cargo.nome} concluída: ${formatCurrency(earned)} no caixa e ${formatCurrency(payment)} para a dívida.`, "good");
      } else {
        const bonusTxt = state.combo > 1 ? ` (sequência ${state.combo}x · ${comboMult().toFixed(2)})` : "";
        addLog(`Entrega de ${cargo.nome} concluída no ponto B. Receita: ${formatCurrency(earned)}${bonusTxt}.`, "good");
      }
      state.money += earned;
      state.trainProgress = 0;

      // próxima viagem leva uma nova carga
      const novo = pickCargo();
      state.currentCargoId = novo.id;
      buildTrain();

      checkAchievements();
      sfx("delivery");
    }

    /* ============================ Render ============================ */
    function render() {
      const speed = currentSpeed();
      const speedCost = speedUpgradeCost();
      const cargoCost = cargoUpgradeCost();
      const lineBroken = hasBrokenLine();
      const problem = hasAnyProblem();
      const repairTeams = repairingCount();
      const cargo = cargoById(state.currentCargoId);

      moneyEl.textContent = formatCurrency(state.money);
      speedInfoEl.textContent = `${speed.toFixed(2)}x · nível ${state.speedLevel}`;
      cargoInfoEl.textContent = `${formatCurrency(state.cargoValue)} · nível ${state.cargoLevel}`;
      comboInfoEl.textContent = `${state.combo}x · ${comboMult().toFixed(2)}`;
      const shift = crewShiftInfo();
      repairsInfoEl.textContent = state.crewLevel > 0
        ? `${repairTeams} equipe(s) · ${shift.label} (${shift.left}s)`
        : `${repairTeams} equipe(s) em campo`;

      // carga atual
      cargoEmojiEl.textContent = cargo.emoji;
      cargoNameEl.textContent = cargo.nome;
      cargoMultEl.textContent = "×" + cargo.mult.toFixed(2) + " → " + formatCurrency(deliveryValue());

      // status
      if (lineBroken) { statusDotEl.className = "dot bad"; statusTextEl.textContent = "Linha quebrada"; }
      else if (repairTeams > 0) { statusDotEl.className = "dot work"; statusTextEl.textContent = "Obras em andamento"; }
      else { statusDotEl.className = "dot"; statusTextEl.textContent = "Linha operacional"; }

      nextBreakInfoEl.textContent = problem
        ? `Parado: multa de ${formatCurrency(deliveryValue() * STOP_FINE_RATE)}/s até liberar a via.`
        : (activeEvent?.def.suppress
          ? "Via reforçada: sem novas falhas no momento."
          : `Próxima falha estimada em ${Math.ceil(state.nextBreakAt)}s · preventiva: ${state.preventRoundsLeft || 0} rodada(s)`);

      // upgrades
      speedUpgradeBtn.textContent = `Comprar por ${formatCurrency(speedCost)}`;
      speedUpgradeBtn.disabled = state.money < speedCost;
      speedLvlEl.textContent = `nível ${state.speedLevel}`;

      cargoUpgradeBtn.textContent = `Comprar por ${formatCurrency(cargoCost)}`;
      cargoUpgradeBtn.disabled = state.money < cargoCost;
      cargoLvlEl.textContent = `nível ${state.cargoLevel}`;

      wagonLvlEl.textContent = `${wagonCount()} vagões · +${formatCurrency(state.wagonExtra * WAGON_BONUS)}/entrega`;
      if (state.wagonExtra >= MAX_WAGON_EXTRA) {
        wagonUpgradeBtn.textContent = "Máximo acoplado";
        wagonUpgradeBtn.disabled = true;
      } else {
        const wc = wagonUpgradeCost();
        wagonUpgradeBtn.textContent = `Comprar por ${formatCurrency(wc)}`;
        wagonUpgradeBtn.disabled = state.money < wc;
      }

      crewLvlEl.textContent = state.crewLevel === 0 ? "sem equipe" : `nível ${state.crewLevel} · ${shift.label}`;
      if (state.crewLevel >= CREW_MAX_LEVEL) { crewUpgradeBtn.textContent = "Equipe no máximo"; crewUpgradeBtn.disabled = true; }
      else { const cc = crewUpgradeCost(); crewUpgradeBtn.textContent = `Comprar por ${formatCurrency(cc)}`; crewUpgradeBtn.disabled = state.money < cc; }

      preventLvlEl.textContent = `nível ${state.preventLevel} · ${state.preventRoundsLeft || 0} rodadas`;
      if (state.preventLevel >= PREVENT_MAX_LEVEL) { preventUpgradeBtn.textContent = "Preventiva no máximo"; preventUpgradeBtn.disabled = true; }
      else { const pc = preventUpgradeCost(); preventUpgradeBtn.textContent = `Comprar por ${formatCurrency(pc)}`; preventUpgradeBtn.disabled = state.money < pc; }

      const loanOffer = loanOfferAmount();
      loanButton.textContent = state.loanDebt > 0 ? `Dívida ativa: ${formatCurrency(state.loanDebt)}` : `Pegar ${formatCurrency(loanOffer)}`;
      loanButton.disabled = state.loanDebt > 0;

      // banner de evento
      if (activeEvent) {
        eventBannerEl.classList.add("show");
        evEmojiEl.textContent = activeEvent.def.emoji;
        evTitleEl.textContent = activeEvent.def.nome;
        evDescEl.textContent = activeEvent.def.desc;
        evTimerEl.textContent = Math.ceil(activeEvent.left) + "s";
      } else {
        eventBannerEl.classList.remove("show");
      }

      // contrato
      if (contract) {
        const done = state.deliveries - contract.startDeliveries;
        contractBoxEl.classList.remove("idle");
        ctTitleEl.textContent = `Contrato expresso: ${done}/${contract.target} entregas`;
        ctDescEl.textContent = `Bônus de ${formatCurrency(contract.reward)} ao concluir.`;
        ctTimerEl.style.display = "";
        ctTimerEl.textContent = Math.ceil(contract.left) + "s";
      } else {
        contractBoxEl.classList.add("idle");
        ctTitleEl.textContent = "Nenhum contrato ativo";
        ctDescEl.textContent = "Aguardando novo contrato expresso...";
        ctTimerEl.style.display = "none";
      }

      // estatísticas
      stDeliveries.textContent = state.deliveries;
      stEarned.textContent = formatCurrency(state.totalEarned);
      stBestCombo.textContent = state.bestCombo + "x";
      stContracts.textContent = state.contractsDone;
      stWorks.textContent = formatCurrency(state.worksSpent);
      const totalSec = Math.floor(state.uptimeMs / 1000);
      stUptime.textContent = Math.floor(totalSec / 60) + ":" + String(totalSec % 60).padStart(2, "0");

      // cards de custos abaixo da tela da dinâmica do trem
      costWorksEl.textContent = formatCurrency(state.worksSpent);
      costOperationalEl.textContent = formatCurrency(operatingCostEstimate());
      costMaintenanceEl.textContent = formatCurrency(maintenanceCostEstimate());
      costCrewEl.textContent = formatCurrency(crewCostEstimate());
      costLoanEl.textContent = formatCurrency(loanInterestEstimate());
      costTotalEl.textContent = formatCurrency(totalCostEstimate());

      updateTrain();
      syncMarkers();
    }

    /* ============================ Loop ============================ */
    function tick(now) {
      const dt = Math.min(0.25, (now - lastTick) / 1000);
      lastTick = now;
      state.elapsedMs = (state.elapsedMs || 0) + dt * 1000;

      // progresso de reparos
      state.segments.forEach(segment => {
        if (segment.status === "repairing") {
          segment.repairLeft -= dt;
          if (segment.repairLeft <= 0) {
            segment.status = "ok";
            segment.repairLeft = 0;
            segment.by = "paid";
            addLog(`${SEGMENTS[segment.id].name} reparado e liberado.`, "good");
            sfx("repaired");
          }
        }
      });

      // equipe própria entra em ação em trechos quebrados
      autoCrew();

      applyMaintenanceFine(dt);

      // eventos e contratos correm sempre
      maybeStartEvent(dt);
      tickEvent(dt);
      maybeStartContract(dt);
      tickContract(dt);

      // falhas só surgem com a linha operacional (e fora de inspeção)
      if (!hasAnyProblem()) {
        if (!activeEvent?.def.suppress) {
          const wear = activeEvent?.def.wear || 1;
          state.nextBreakAt -= dt * wear;
          if (state.nextBreakAt <= 0) { createBreak(); scheduleNextBreak(); }
        }
      }

      // o trem anda com a linha liberada
      if (!hasAnyProblem()) {
        state.uptimeMs += dt * 1000;
        state.trainProgress += dt * 5.8 * currentSpeed();
        if (state.trainProgress >= 100) completeDelivery();
      }

      render();
      requestAnimationFrame(tick);
    }

    /* ============================ Eventos de UI ============================ */
    speedUpgradeBtn.addEventListener("click", buySpeedUpgrade);
    cargoUpgradeBtn.addEventListener("click", buyCargoUpgrade);
    wagonUpgradeBtn.addEventListener("click", buyWagonUpgrade);
    crewUpgradeBtn.addEventListener("click", buyCrewUpgrade);
    preventUpgradeBtn.addEventListener("click", buyPreventUpgrade);
    loanButton.addEventListener("click", takeLoan);
    saveButton.addEventListener("click", () => saveState(true));
    resetButton.addEventListener("click", resetGame);

    soundToggle.addEventListener("click", () => {
      state.soundOn = !state.soundOn;
      updateSoundButton();
      if (state.soundOn) { ensureAudio(); if (audioCtx?.state === "suspended") audioCtx.resume(); sfx("click"); }
      saveState(false);
    });

    // botão "Contratar equipe": delegação por clique (agora confiável, pois o
    // marcador não é mais recriado a cada frame).
    railAreaEl.addEventListener("click", (event) => {
      const repairButton = event.target.closest("[data-repair]");
      if (!repairButton || repairButton.disabled) return;
      event.preventDefault();
      ensureAudio();
      dispatchRepair(Number(repairButton.dataset.repair));
    });

    // clicar no próprio trecho quebrado também aciona o conserto pago
    document.querySelectorAll(".segment").forEach(path => {
      path.addEventListener("click", () => {
        const id = Number(path.id.replace("seg-", ""));
        const segment = state.segments.find(s => s.id === id);
        if (segment?.status === "broken") { ensureAudio(); dispatchRepair(id); }
      });
    });

    // primeira interação destrava o áudio em navegadores que exigem gesto
    window.addEventListener("pointerdown", () => ensureAudio(), { once: true });
    window.addEventListener("resize", () => { railLen = 0; computeSegmentMidpoints(); });

    setInterval(() => saveState(false), 10000);

    /* ============================ Inicialização ============================ */
    function init() {
      updateSoundButton();
      buildTrackDecor();
      computeSegmentMidpoints();
      if (!cargoById(state.currentCargoId)) state.currentCargoId = pickCargo().id;
      buildTrain();
      addLog("Operação iniciada. Mantenha o caixa para garantir o fluxo da linha.", "good");
      scheduleNextBreak();
      render();
      requestAnimationFrame(tick);
    }
    init();
