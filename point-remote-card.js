// Point Remote Card – point your phone at a device to control it.
// Direction = top edge of the phone (compass + tilt). Each card is one place (couch, kitchen …): the direction of every
// device is taught once from there and stored in the Home Assistant user data (frontend/set_user_data).
// https://github.com/onkeloki/point-remote-card  –  MIT License

const VERSION = "2.0.0";
const HIT_DEG = 18;       // how far off you may point
const RADAR_DEG = 60;     // radar radius in degrees
const DWELL_MS = 250;     // a new target must be aimed at this long before it takes over
const DOMAINS = ["light", "cover", "media_player", "switch", "fan", "climate", "input_boolean", "lock", "scene", "script", "button", "input_button"];
const DEFAULT_COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#00c7be", "#007aff", "#5856d6", "#af52de", "#ff2d55"];
const DEFAULT_POSITIONS = [0, 25, 50, 75, 100];

// ---------- translations (community additions welcome) ----------
const TEXTS = {
  en: {
    defaultName: "Point Remote",
    enable: "Enable sensors", enableAgain: "Allow sensors again",
    teachTitle: "Teach devices",
    teachHelp: "Stay at this place, pick a device, point the top edge of your phone at it and save.",
    pickEntity: "Pick a device …", save: "Point now & save", holdStill: "Hold still …",
    nothingYet: "Nothing taught here yet.",
    tapStart: "Tap “Enable sensors” once and allow access.",
    waiting: "Waiting for sensor data …",
    notTaught: "Nothing taught yet – open “Teach devices” below.",
    pointAt: "Point at a device", lastAimed: "last aimed at", closeCall: "close call, aim more precisely",
    direction: "Direction", tilt: "tilt",
    noCompass: "no compass – directions only valid until reload",
    badCompass: "compass inaccurate: move the phone in a figure eight",
    pickFirst: "Pick a device first", enableFirst: "Enable sensors first", tooFew: "Not enough sensor data – try again",
    saved: (n, h, p) => `${n} saved (${h}°, tilt ${p}°)`,
    saveFailed: "Saving failed: ", denied: "Sensors not allowed: ", needHttps: " – page must be served over https",
    remove: "remove",
    turnOn: "Turn on", turnOff: "Turn off", toggle: "Toggle", activate: "Activate", run: "Run", press: "Press",
    lock: "Lock", unlock: "Unlock", playPause: "Play / Pause", mute: "Mute",
    description: "Point your phone at a device to control it",
    fName: "Name of this place (e.g. Couch, Kitchen)", fEntities: "Devices (empty = all)", fId: "Storage ID (keep when renaming)",
  },
  de: {
    defaultName: "Zeigen",
    enable: "Sensoren aktivieren", enableAgain: "Sensoren erneut erlauben",
    teachTitle: "Geräte anlernen",
    teachHelp: "An diesem Platz bleiben, Gerät wählen, mit der Oberkante des Handys darauf zeigen und speichern.",
    pickEntity: "Gerät wählen …", save: "Jetzt zeigen & speichern", holdStill: "Ruhig halten …",
    nothingYet: "Hier ist noch nichts angelernt.",
    tapStart: "Einmal „Sensoren aktivieren“ tippen und erlauben.",
    waiting: "Warte auf Sensordaten …",
    notTaught: "Noch nichts angelernt – unten „Geräte anlernen“ öffnen.",
    pointAt: "Auf ein Gerät zeigen", lastAimed: "zuletzt gezielt", closeCall: "knapp, genauer zielen",
    direction: "Richtung", tilt: "Neigung",
    noCompass: "kein Kompass – Richtungen gelten nur bis zum Neuladen",
    badCompass: "Kompass ungenau: Handy einmal in einer Acht bewegen",
    pickFirst: "Erst ein Gerät auswählen", enableFirst: "Erst Sensoren aktivieren", tooFew: "Zu wenig Sensordaten – nochmal versuchen",
    saved: (n, h, p) => `${n} gespeichert (${h}°, Neigung ${p}°)`,
    saveFailed: "Speichern fehlgeschlagen: ", denied: "Sensoren nicht erlaubt: ", needHttps: " – Seite muss über https laufen",
    remove: "entfernen",
    turnOn: "Einschalten", turnOff: "Ausschalten", toggle: "Umschalten", activate: "Aktivieren", run: "Ausführen", press: "Drücken",
    lock: "Abschließen", unlock: "Aufschließen", playPause: "Play / Pause", mute: "Stumm",
    description: "Mit dem Handy auf ein Gerät zeigen und steuern",
    fName: "Name des Platzes (z. B. Couch, Küche)", fEntities: "Geräte (leer = alle)", fId: "Speicher-ID (beim Umbenennen behalten)",
  },
  nl: {
    defaultName: "Aanwijzen",
    enable: "Sensoren inschakelen", enableAgain: "Sensoren opnieuw toestaan",
    teachTitle: "Apparaten aanleren",
    teachHelp: "Blijf op deze plek, kies een apparaat, wijs er met de bovenkant van je telefoon naar en sla op.",
    pickEntity: "Kies een apparaat …", save: "Nu aanwijzen & opslaan", holdStill: "Stil houden …",
    nothingYet: "Hier is nog niets aangeleerd.",
    tapStart: "Tik één keer op „Sensoren inschakelen” en sta toegang toe.",
    waiting: "Wachten op sensordata …",
    notTaught: "Nog niets aangeleerd – open hieronder „Apparaten aanleren”.",
    pointAt: "Wijs een apparaat aan", lastAimed: "laatst aangewezen", closeCall: "nipt, richt preciezer",
    direction: "Richting", tilt: "helling",
    noCompass: "geen kompas – richtingen gelden tot herladen",
    badCompass: "kompas onnauwkeurig: beweeg de telefoon in een acht",
    pickFirst: "Kies eerst een apparaat", enableFirst: "Schakel eerst de sensoren in", tooFew: "Te weinig sensordata – probeer opnieuw",
    saved: (n, h, p) => `${n} opgeslagen (${h}°, helling ${p}°)`,
    saveFailed: "Opslaan mislukt: ", denied: "Sensoren niet toegestaan: ", needHttps: " – pagina moet via https lopen",
    remove: "verwijderen",
    turnOn: "Aanzetten", turnOff: "Uitzetten", toggle: "Schakelen", activate: "Activeren", run: "Uitvoeren", press: "Indrukken",
    lock: "Vergrendelen", unlock: "Ontgrendelen", playPause: "Afspelen / Pauze", mute: "Dempen",
    description: "Wijs met je telefoon een apparaat aan om het te bedienen",
    fName: "Naam van deze plek (bijv. Bank, Keuken)", fEntities: "Apparaten (leeg = alle)", fId: "Opslag-ID (behouden bij hernoemen)",
  },
  fr: {
    defaultName: "Pointer",
    enable: "Activer les capteurs", enableAgain: "Autoriser à nouveau les capteurs",
    teachTitle: "Apprendre les appareils",
    teachHelp: "Restez à cet endroit, choisissez un appareil, pointez le haut du téléphone vers lui et enregistrez.",
    pickEntity: "Choisir un appareil …", save: "Pointer & enregistrer", holdStill: "Ne bougez pas …",
    nothingYet: "Rien n’a encore été appris ici.",
    tapStart: "Touchez une fois « Activer les capteurs » et autorisez l’accès.",
    waiting: "En attente des capteurs …",
    notTaught: "Rien d’appris – ouvrez « Apprendre les appareils » ci-dessous.",
    pointAt: "Pointez un appareil", lastAimed: "dernier visé", closeCall: "de justesse, visez plus précisément",
    direction: "Direction", tilt: "inclinaison",
    noCompass: "pas de boussole – directions valables jusqu’au rechargement",
    badCompass: "boussole imprécise : bougez le téléphone en forme de huit",
    pickFirst: "Choisissez d’abord un appareil", enableFirst: "Activez d’abord les capteurs", tooFew: "Pas assez de données – réessayez",
    saved: (n, h, p) => `${n} enregistré (${h}°, inclinaison ${p}°)`,
    saveFailed: "Échec de l’enregistrement : ", denied: "Capteurs non autorisés : ", needHttps: " – la page doit être servie en https",
    remove: "supprimer",
    turnOn: "Allumer", turnOff: "Éteindre", toggle: "Basculer", activate: "Activer", run: "Exécuter", press: "Appuyer",
    lock: "Verrouiller", unlock: "Déverrouiller", playPause: "Lecture / Pause", mute: "Muet",
    description: "Pointez votre téléphone vers un appareil pour le contrôler",
    fName: "Nom de cet endroit (ex. Canapé, Cuisine)", fEntities: "Appareils (vide = tous)", fId: "ID de stockage (à garder si renommé)",
  },
  es: {
    defaultName: "Apuntar",
    enable: "Activar sensores", enableAgain: "Permitir sensores de nuevo",
    teachTitle: "Enseñar dispositivos",
    teachHelp: "Quédate en este lugar, elige un dispositivo, apunta con el borde superior del móvil y guarda.",
    pickEntity: "Elige un dispositivo …", save: "Apuntar y guardar", holdStill: "Mantén quieto …",
    nothingYet: "Aquí aún no hay nada enseñado.",
    tapStart: "Toca una vez «Activar sensores» y permite el acceso.",
    waiting: "Esperando datos de los sensores …",
    notTaught: "Nada enseñado aún – abre «Enseñar dispositivos» abajo.",
    pointAt: "Apunta a un dispositivo", lastAimed: "último apuntado", closeCall: "muy justo, apunta con más precisión",
    direction: "Dirección", tilt: "inclinación",
    noCompass: "sin brújula – direcciones válidas hasta recargar",
    badCompass: "brújula imprecisa: mueve el móvil en forma de ocho",
    pickFirst: "Elige primero un dispositivo", enableFirst: "Activa primero los sensores", tooFew: "Pocos datos – inténtalo de nuevo",
    saved: (n, h, p) => `${n} guardado (${h}°, inclinación ${p}°)`,
    saveFailed: "Error al guardar: ", denied: "Sensores no permitidos: ", needHttps: " – la página debe servirse por https",
    remove: "eliminar",
    turnOn: "Encender", turnOff: "Apagar", toggle: "Alternar", activate: "Activar", run: "Ejecutar", press: "Pulsar",
    lock: "Bloquear", unlock: "Desbloquear", playPause: "Reproducir / Pausa", mute: "Silenciar",
    description: "Apunta con tu móvil a un dispositivo para controlarlo",
    fName: "Nombre de este lugar (p. ej. Sofá, Cocina)", fEntities: "Dispositivos (vacío = todos)", fId: "ID de almacenamiento (mantener al renombrar)",
  },
  it: {
    defaultName: "Punta",
    enable: "Attiva sensori", enableAgain: "Consenti di nuovo i sensori",
    teachTitle: "Insegna dispositivi",
    teachHelp: "Resta in questo punto, scegli un dispositivo, punta il bordo superiore del telefono e salva.",
    pickEntity: "Scegli un dispositivo …", save: "Punta e salva", holdStill: "Tieni fermo …",
    nothingYet: "Qui non è ancora stato insegnato nulla.",
    tapStart: "Tocca una volta «Attiva sensori» e consenti l’accesso.",
    waiting: "In attesa dei sensori …",
    notTaught: "Niente insegnato – apri «Insegna dispositivi» qui sotto.",
    pointAt: "Punta un dispositivo", lastAimed: "ultimo puntato", closeCall: "al limite, punta con più precisione",
    direction: "Direzione", tilt: "inclinazione",
    noCompass: "nessuna bussola – direzioni valide fino al ricaricamento",
    badCompass: "bussola imprecisa: muovi il telefono a forma di otto",
    pickFirst: "Scegli prima un dispositivo", enableFirst: "Attiva prima i sensori", tooFew: "Dati insufficienti – riprova",
    saved: (n, h, p) => `${n} salvato (${h}°, inclinazione ${p}°)`,
    saveFailed: "Salvataggio non riuscito: ", denied: "Sensori non consentiti: ", needHttps: " – la pagina deve usare https",
    remove: "rimuovi",
    turnOn: "Accendi", turnOff: "Spegni", toggle: "Commuta", activate: "Attiva", run: "Esegui", press: "Premi",
    lock: "Blocca", unlock: "Sblocca", playPause: "Play / Pausa", mute: "Muto",
    description: "Punta il telefono verso un dispositivo per controllarlo",
    fName: "Nome di questo punto (es. Divano, Cucina)", fEntities: "Dispositivi (vuoto = tutti)", fId: "ID di salvataggio (mantienilo se rinomini)",
  },
};

// ---------- helpers ----------
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const norm360 = (d) => ((d % 360) + 360) % 360;
const diff180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const vec = (h, p) => [Math.cos(rad(p)) * Math.sin(rad(h)), Math.cos(rad(p)) * Math.cos(rad(h)), Math.sin(rad(p))];
const angle = (a, b) => {
  const va = vec(a.h, a.p), vb = vec(b.h, b.p);
  return deg(Math.acos(Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))));
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const hexToRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const browserLang = (navigator.language || "en").slice(0, 2);
const textsFor = (lang) => TEXTS[(lang || browserLang).slice(0, 2)] || TEXTS.en;
const COLOR_MODES = ["hs", "rgb", "rgbw", "rgbww", "xy"];

class PointRemoteCard extends HTMLElement {
  static getStubConfig() {
    return { name: textsFor().defaultName };
  }
  static getConfigForm() {
    return {
      schema: [
        { name: "name", selector: { text: {} } },
        { name: "entities", selector: { entity: { multiple: true, filter: { domain: DOMAINS } } } },
        { name: "id", selector: { text: {} } },
      ],
      computeLabel: (s, hass) => {
        const T = textsFor(hass?.locale?.language || hass?.language);
        return { name: T.fName, entities: T.fEntities, id: T.fId }[s.name];
      },
    };
  }

  setConfig(config) {
    this._config = config || {};
    // entities may be plain ids or objects with per-device options: {entity, name, colors, positions, sources}
    this._opts = {};
    for (const e of this._config.entities || []) {
      if (typeof e === "string") this._opts[e] = { entity: e };
      else if (e?.entity) this._opts[e.entity] = e;
    }
    const id = this._config.id || slug(this._config.name) || "default";
    if (this._storeKey && this._storeKey !== "point_remote_" + id) { this._data = null; this._loaded = false; }
    this._storeKey = "point_remote_" + id;
    if (this.shadowRoot) { this._renderTitle(); if (this._hass) this._load(); }
  }
  getCardSize() {
    return 10;
  }

  get _t() {
    return textsFor(this._hass?.locale?.language || this._hass?.language);
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._build();
    if (!this._loaded) this._load();
    this._fillSelect();
    this._render();
  }

  connectedCallback() {
    if (this._perm === "ok") this._sensorStart();
  }
  disconnectedCallback() {
    this._sensorStop();
  }

  // ---------- data ----------
  async _load() {
    this._loaded = true;
    const key = this._storeKey;
    const get = async (k) => {
      try { return (await this._hass.connection.sendMessagePromise({ type: "frontend/get_user_data", key: k }))?.value || null; }
      catch (e) { return null; }
    };
    let data = await get(key);
    // migration from "zeig-licht-card" 1.x (one spot list) into the default card
    if (!data && key === "point_remote_default") {
      const old = await get("zeig_licht");
      const spot = old?.plaetze?.find((p) => p.id === old.aktiv) || old?.plaetze?.[0];
      if (spot) { data = { targets: { ...spot.lampen } }; this._data = data; await this._save(); }
    }
    if (key !== this._storeKey) return; // config changed meanwhile
    this._data = data?.targets ? data : { targets: {} };
    this._renderList();
    this._render();
  }
  async _save() {
    try {
      await this._hass.connection.sendMessagePromise({ type: "frontend/set_user_data", key: this._storeKey, value: this._data });
    } catch (e) {
      this._toast(this._t.saveFailed + (e.message || e.code || e));
    }
  }

  // ---------- sensors ----------
  async _allow() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        this._perm = (await DeviceOrientationEvent.requestPermission()) === "granted" ? "ok" : "denied";
      } else this._perm = typeof DeviceOrientationEvent !== "undefined" ? "ok" : "missing";
    } catch (e) {
      this._perm = "denied";
      this._toast(this._t.denied + (e.message || e) + (window.isSecureContext ? "" : this._t.needHttps));
    }
    if (this._perm === "ok") this._sensorStart();
    this._render();
  }
  _sensorStart() {
    if (this._onOri) return;
    this._onOri = (e) => this._orientation(e);
    // Android/Chrome: compass-referenced event; iOS: regular event + webkitCompassHeading
    this._oriEvent = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(this._oriEvent, this._onOri);
  }
  _sensorStop() {
    if (this._onOri) window.removeEventListener(this._oriEvent, this._onOri);
    this._onOri = null;
  }
  _orientation(e) {
    if (e.alpha == null || e.beta == null) return;
    // top edge of the phone in world coordinates: heading = 360 - alpha, tilt = beta (independent of gamma)
    const hRaw = norm360(360 - e.alpha);
    const p = Math.max(-89, Math.min(89, e.beta));
    // iOS: alpha is not north-referenced -> estimate the offset to the compass (while fairly flat, where the compass is reliable)
    const compass = typeof e.webkitCompassHeading === "number" ? e.webkitCompassHeading : e.absolute ? hRaw : null;
    this._accuracy = typeof e.webkitCompassAccuracy === "number" ? e.webkitCompassAccuracy : null;
    if (compass != null && compass >= 0) {
      const v = diff180(compass - hRaw);
      const flat = Math.abs(e.beta) < 45 && Math.abs(e.gamma) < 45;
      if (this._offset == null) this._offset = v;
      else if (flat || e.absolute) this._offset = norm360(this._offset + diff180(v - this._offset) * 0.05);
    }
    const h = norm360(hRaw + (this._offset ?? 0));
    if (!this._aim) this._aim = { h, p };
    else {
      this._aim.h = norm360(this._aim.h + diff180(h - this._aim.h) * 0.35);
      this._aim.p = this._aim.p + (p - this._aim.p) * 0.35;
    }
    this._compassOk = compass != null;
    if (this._samples) this._samples.push({ ...this._aim });
    if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = null; this._render(); });
  }

  // ---------- hit test: target stays selected until another device is aimed at ----------
  _updateTarget() {
    const targets = this._data?.targets;
    if (!targets || !this._aim) return;
    const list = Object.entries(targets)
      .filter(([ent]) => this._hass.states[ent])
      .map(([ent, r]) => ({ ent, w: angle(this._aim, r) }))
      .sort((a, b) => a.w - b.w);
    const best = list[0] && list[0].w <= HIT_DEG ? list[0] : null;
    this._aiming = !!best;
    this._unsure = !!(best && list[1] && list[1].w - best.w < 5);
    if (!best) { this._cand = null; return; }
    if (best.ent === this._target) { this._cand = null; return; }
    const now = Date.now();
    if (this._cand?.ent !== best.ent) this._cand = { ent: best.ent, since: now };
    if (!this._target || now - this._cand.since >= DWELL_MS) {
      this._target = best.ent;
      this._cand = null;
      this._haptic("selection");
    }
  }

  _haptic(type) {
    window.dispatchEvent(new CustomEvent("haptic", { detail: type, bubbles: true, composed: true }));
  }
  _call(domain, service, data = {}) {
    this._hass.callService(domain, service, { entity_id: this._target, ...data });
    this._haptic("light");
  }

  // ---------- controls per domain ----------
  _controls(ent) {
    const T = this._t, st = this._hass.states[ent], d = ent.split(".")[0], a = st.attributes, f = a.supported_features || 0;
    const o = this._opts[ent] || {};
    const btn = (act, label, cls = "", extra = "") => `<button class="${cls}" data-act="${act}" ${extra}>${label}</button>`;
    const icon = (i) => `<ha-icon icon="${i}"></ha-icon>`;
    const isOn = st.state === "on";
    const big = (label, lit) => btn("toggle", label, "big" + (lit ? " lit" : ""));
    const rows = [];
    switch (d) {
      case "light": {
        const modes = a.supported_color_modes || [];
        if (modes.length && modes.every((m) => m === "onoff")) rows.push(big(isOn ? T.turnOff : T.turnOn, isOn));
        else rows.push(`<div class="trio">${btn("bri:-15", icon("mdi:minus"), "small")}${big(isOn ? T.turnOff : T.turnOn, isOn)}${btn("bri:15", icon("mdi:plus"), "small")}</div>`);
        const chips = [];
        if (modes.includes("color_temp")) {
          chips.push(btn("ct:2700", "", "swatch", `style="background:#ffc58f" aria-label="2700 K"`));
          chips.push(btn("ct:4000", "", "swatch", `style="background:#fff1e0" aria-label="4000 K"`));
          chips.push(btn("ct:6000", "", "swatch", `style="background:#e3ecff" aria-label="6000 K"`));
        }
        if (modes.some((m) => COLOR_MODES.includes(m))) {
          for (const c of o.colors || DEFAULT_COLORS) {
            const rgb = Array.isArray(c) ? c : hexToRgb(c);
            if (rgb) chips.push(btn(`rgb:${rgb.join(",")}`, "", "swatch", `style="background:rgb(${rgb.join(",")})"`));
          }
        }
        if (chips.length) rows.push(`<div class="swatches">${chips.join("")}</div>`);
        break;
      }
      case "cover": {
        rows.push(`<div class="trio">${btn("cover:open_cover", icon("mdi:arrow-up"), "small")}${btn("cover:stop_cover", icon("mdi:stop"), "big")}${btn("cover:close_cover", icon("mdi:arrow-down"), "small")}</div>`);
        if (f & 4) {
          const cur = a.current_position;
          rows.push(`<div class="chips">${(o.positions || DEFAULT_POSITIONS).map((p) => btn(`pos:${p}`, `${p} %`, "chip" + (cur === p ? " on" : ""))).join("")}</div>`);
        }
        break;
      }
      case "media_player": {
        const off = ["off", "standby", "unavailable"].includes(st.state);
        rows.push(`<div class="trio">${btn("vol:down", icon("mdi:volume-minus"), "small")}${big(off ? T.turnOn : T.turnOff, !off)}${btn("vol:up", icon("mdi:volume-plus"), "small")}</div>`);
        rows.push(`<div class="duo">${btn("media_player:media_play_pause", icon("mdi:play-pause") + " " + T.playPause, "mid")}${btn("mute", icon(a.is_volume_muted ? "mdi:volume-off" : "mdi:volume-high") + " " + T.mute, "mid" + (a.is_volume_muted ? " on" : ""))}</div>`);
        const sources = Array.isArray(o.sources) ? o.sources : o.sources === false ? [] : a.source_list || [];
        if (sources.length) rows.push(`<div class="chips">${sources.map((s, i) => btn(`src:${i}`, esc(s), "chip" + (a.source === s ? " on" : ""))).join("")}</div>`);
        this._sources = sources;
        break;
      }
      case "fan":
        rows.push(`<div class="trio">${btn("fan:decrease_speed", icon("mdi:fan-minus"), "small")}${big(isOn ? T.turnOff : T.turnOn, isOn)}${btn("fan:increase_speed", icon("mdi:fan-plus"), "small")}</div>`);
        break;
      case "climate":
        rows.push(`<div class="trio">${btn("temp:-0.5", icon("mdi:minus"), "small")}<div class="big readout">${a.temperature ?? "–"} °</div>${btn("temp:0.5", icon("mdi:plus"), "small")}</div>`);
        break;
      case "lock":
        rows.push(`<div class="duo">${btn("lock:lock", icon("mdi:lock") + " " + T.lock, "mid")}${btn("lock:unlock", icon("mdi:lock-open") + " " + T.unlock, "mid")}</div>`);
        break;
      case "scene":
        rows.push(big(T.activate));
        break;
      case "script":
        rows.push(big(T.run));
        break;
      case "button":
      case "input_button":
        rows.push(big(T.press));
        break;
      default:
        rows.push(big(isOn ? T.turnOff : st.state === "off" ? T.turnOn : T.toggle, isOn));
    }
    return rows.join("");
  }

  _action(act) {
    const ent = this._target;
    if (!ent) return;
    const st = this._hass.states[ent], d = ent.split(".")[0];
    const [k, v] = act.split(/:(.*)/s);
    switch (k) {
      case "toggle":
        if (d === "scene") return this._call("scene", "turn_on");
        if (d === "script") return this._call("script", "turn_on");
        if (d === "button" || d === "input_button") return this._call(d, "press");
        if (d === "media_player") return this._call("media_player", ["off", "standby"].includes(st.state) ? "turn_on" : "turn_off");
        this._call("homeassistant", "toggle");
        return this._haptic("success");
      case "bri": return this._call("light", "turn_on", { brightness_step_pct: Number(v) });
      case "ct": return this._call("light", "turn_on", { color_temp_kelvin: Number(v) });
      case "rgb": return this._call("light", "turn_on", { rgb_color: v.split(",").map(Number) });
      case "pos": return this._call("cover", "set_cover_position", { position: Number(v) });
      case "vol": return this._call("media_player", v === "up" ? "volume_up" : "volume_down");
      case "mute": return this._call("media_player", "volume_mute", { is_volume_muted: !st.attributes.is_volume_muted });
      case "src": return this._call("media_player", "select_source", { source: this._sources[Number(v)] });
      case "temp": return this._call("climate", "set_temperature", { temperature: Math.round(((st.attributes.temperature ?? 20) + Number(v)) * 2) / 2 });
      default: { const [dom, svc] = act.split(":"); return this._call(dom, svc); }
    }
  }

  // ---------- teaching ----------
  async _teach() {
    const T = this._t;
    const ent = this.$("#entity").value;
    if (!ent) return this._toast(T.pickFirst);
    if (this._perm !== "ok" || !this._aim) return this._toast(T.enableFirst);
    const b = this.$("#teach");
    b.disabled = true;
    b.textContent = T.holdStill;
    this._samples = [];
    await new Promise((r) => setTimeout(r, 1200));
    const samples = this._samples;
    this._samples = null;
    b.disabled = false;
    b.textContent = T.save;
    if (samples.length < 5) return this._toast(T.tooFew);
    let x = 0, y = 0, z = 0;
    for (const s of samples) { const v = vec(s.h, s.p); x += v[0]; y += v[1]; z += v[2]; }
    const r = { h: Math.round(norm360(deg(Math.atan2(x, y))) * 10) / 10, p: Math.round(deg(Math.asin(z / Math.hypot(x, y, z))) * 10) / 10 };
    this._data.targets[ent] = r;
    await this._save();
    this._haptic("success");
    this._toast(T.saved(this._name(ent), Math.round(r.h), Math.round(r.p)));
    this._renderList();
  }
  async _remove(ent) {
    delete this._data.targets[ent];
    if (this._target === ent) this._target = null;
    await this._save();
    this._renderList();
  }

  // ---------- rendering ----------
  $(s) {
    return this.shadowRoot.querySelector(s);
  }
  _name(ent) {
    return this._opts[ent]?.name || this._hass.states[ent]?.attributes.friendly_name || ent;
  }
  _stateText(st) {
    try { if (this._hass.formatEntityState) return this._hass.formatEntityState(st); } catch (e) { /* older HA */ }
    return st.state;
  }
  _toast(text) {
    const m = this.$("#toast");
    m.textContent = text;
    m.classList.add("show");
    clearTimeout(this._tt);
    this._tt = setTimeout(() => m.classList.remove("show"), 3500);
  }

  _build() {
    const T = this._t;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
<style>
  :host { display: block; }
  ha-card { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
  .title { font-size: 20px; font-weight: 600; color: var(--primary-text-color); }
  .radar { width: 100%; max-width: 320px; aspect-ratio: 1; margin: 0 auto; }
  .radar svg { width: 100%; height: 100%; display: block; }
  .target { text-align: center; min-height: 58px; }
  .target .name { font-size: 26px; font-weight: 600; color: var(--primary-text-color); }
  .target .info { font-size: 14px; color: var(--secondary-text-color); margin-top: 2px; }
  .target.stale .name { opacity: .55; }
  #controls { display: flex; flex-direction: column; gap: 10px; }
  button { font: inherit; cursor: pointer; color: var(--primary-text-color); }
  button:disabled { opacity: .35; }
  .trio { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 10px; }
  .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .big { font-size: 20px; font-weight: 600; padding: 20px 0; border-radius: 16px; border: none; background: var(--primary-color); color: var(--text-primary-color, #fff); width: 100%; text-align: center; }
  .big.lit { background: var(--state-light-active-color, #ffb300); color: #000; }
  .big.readout { background: var(--secondary-background-color); color: var(--primary-text-color); box-sizing: border-box; }
  .small, .mid { border-radius: 16px; border: 1px solid var(--divider-color); background: var(--card-background-color); padding: 12px 0; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 15px; }
  .mid.on { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: var(--primary-color); }
  .swatches { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
  .swatch { width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--divider-color); padding: 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
  .chip { border: 1px solid var(--divider-color); background: none; border-radius: 18px; padding: 8px 14px; font-size: 14px; }
  .chip.on { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
  .start { font-size: 18px; padding: 18px; border-radius: 14px; border: none; background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .hint { font-size: 13px; color: var(--secondary-text-color); text-align: center; }
  details { border-top: 1px solid var(--divider-color); padding-top: 10px; }
  summary { font-size: 16px; font-weight: 600; color: var(--primary-text-color); padding: 6px 0; }
  .teach { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
  select { font-size: 16px; padding: 10px; border-radius: 10px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
  .teach > button { font-size: 16px; padding: 12px; border-radius: 10px; border: none; background: var(--primary-color); color: var(--text-primary-color, #fff); }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--divider-color); color: var(--primary-text-color); font-size: 15px; }
  li small { color: var(--secondary-text-color); margin-left: 6px; }
  li button { border: none; background: none; color: var(--error-color, #db4437); font-size: 18px; padding: 4px 10px; }
  #toast { position: sticky; bottom: 8px; background: var(--primary-text-color); color: var(--card-background-color); padding: 10px 14px; border-radius: 10px; font-size: 14px; opacity: 0; transition: opacity .3s; pointer-events: none; }
  #toast.show { opacity: .92; }
</style>
<ha-card>
  <div class="title" id="title"></div>
  <button class="start" id="start">${T.enable}</button>
  <div class="radar"><svg viewBox="-110 -110 220 220" id="radar"></svg></div>
  <div class="target" id="target"></div>
  <div id="controls"></div>
  <div class="hint" id="compass"></div>
  <details>
    <summary>${T.teachTitle}</summary>
    <div class="teach">
      <div class="hint" style="text-align:left">${T.teachHelp}</div>
      <select id="entity"></select>
      <button id="teach">${T.save}</button>
      <ul id="list"></ul>
    </div>
  </details>
  <div id="toast"></div>
</ha-card>`;
    this._renderTitle();
    this.$("#start").addEventListener("click", () => this._allow());
    this.$("#teach").addEventListener("click", () => this._teach());
    this.$("#controls").addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b) this._action(b.dataset.act); });
    this.$("#list").addEventListener("click", (e) => { const ent = e.target.dataset?.ent; if (ent) this._remove(ent); });
    // no permission prompt needed (Android/desktop): start right away
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function") {
      this._perm = "ok";
      this._sensorStart();
    }
  }

  _renderTitle() {
    const el = this.$("#title");
    if (!el) return;
    el.textContent = this._config.name || "";
    el.style.display = this._config.name ? "" : "none";
  }

  _fillSelect() {
    const sel = this.$("#entity");
    if (!sel) return;
    const allowed = Object.keys(this._opts);
    const ids = (allowed.length ? allowed : Object.keys(this._hass.states).filter((e) => {
      const reg = this._hass.entities?.[e];   // skip hidden and config/diagnostic entities
      return DOMAINS.includes(e.split(".")[0]) && !/_segment_\d+$/.test(e) && !reg?.hidden && !reg?.entity_category;
    }))
      .filter((e) => this._hass.states[e]);
    const sig = ids.join(",");
    if (sig === this._selSig) return;
    this._selSig = sig;
    const groups = {};
    for (const e of ids) (groups[e.split(".")[0]] ||= []).push(e);
    const old = sel.value;
    sel.innerHTML = `<option value="">${esc(this._t.pickEntity)}</option>` + DOMAINS.filter((d) => groups[d]).map((d) =>
      `<optgroup label="${esc(this._hass.localize?.(`component.${d}.entity_component._.name`) || this._hass.localize?.(`component.${d}.title`) || d)}">` +
      groups[d].sort((a, b) => this._name(a).localeCompare(this._name(b))).map((e) => `<option value="${e}">${esc(this._name(e))}</option>`).join("") +
      `</optgroup>`).join("");
    sel.value = old;
  }

  _renderList() {
    if (!this._data || !this.shadowRoot) return;
    const entries = Object.entries(this._data.targets).sort((a, b) => a[1].h - b[1].h);
    this.$("#list").innerHTML = entries.length
      ? entries.map(([ent, r]) => `<li><span>${esc(this._name(ent))}<small>${Math.round(r.h)}° · ${Math.round(r.p)}°</small></span><button data-ent="${ent}" aria-label="${this._t.remove}">✕</button></li>`).join("")
      : `<li><span class="hint">${esc(this._t.nothingYet)}</span></li>`;
  }

  _render() {
    if (!this.shadowRoot || !this._hass) return;
    const T = this._t;
    const ready = this._perm === "ok";
    this.$("#start").style.display = ready ? "none" : "";
    if (this._perm === "denied") this.$("#start").textContent = T.enableAgain;
    if (ready) this._updateTarget();
    if (this._target && !this._hass.states[this._target]) this._target = null;
    const targets = this._data?.targets || {};

    // radar
    const scale = 100 / RADAR_DEG;
    let svg = `<circle r="100" fill="none" stroke="var(--divider-color)" stroke-width="1"/>
      <circle r="${HIT_DEG * scale}" fill="var(--primary-color)" fill-opacity=".08" stroke="var(--primary-color)" stroke-opacity=".5" stroke-dasharray="3 3"/>
      <circle r="${(RADAR_DEG / 2) * scale}" fill="none" stroke="var(--divider-color)" stroke-width=".6"/>
      <line x1="-8" y1="0" x2="8" y2="0" stroke="var(--primary-text-color)" stroke-width="1.5"/>
      <line x1="0" y1="-8" x2="0" y2="8" stroke="var(--primary-text-color)" stroke-width="1.5"/>`;
    if (this._aim) {
      for (const [ent, r] of Object.entries(targets)) {
        const st = this._hass.states[ent];
        if (!st) continue;
        let x = diff180(r.h - this._aim.h) * scale;
        let y = -(r.p - this._aim.p) * scale;
        const l = Math.hypot(x, y);
        const inside = l <= 100;
        if (!inside) { x = (x / l) * 100; y = (y / l) * 100; }
        const sel = this._target === ent;
        const active = !["off", "closed", "unavailable", "unknown", "standby", "idle", "locked"].includes(st.state);
        const color = st.state === "unavailable" ? "var(--disabled-text-color, #999)" : active ? "var(--state-light-active-color, #ffb300)" : "var(--secondary-text-color)";
        svg += `<circle cx="${x}" cy="${y}" r="${sel ? 9 : inside ? 6 : 3.5}" fill="${color}" ${sel ? 'stroke="var(--primary-color)" stroke-width="3"' : ""}/>`;
        if (inside) svg += `<text x="${x}" y="${y - 12}" text-anchor="middle" font-size="10" fill="var(--primary-text-color)">${esc(this._name(ent))}</text>`;
      }
    }
    this.$("#radar").innerHTML = svg;

    // target line
    const tg = this.$("#target");
    let html;
    if (!ready) html = `<div class="info">${esc(T.tapStart)}</div>`;
    else if (!this._aim) html = `<div class="info">${esc(T.waiting)}</div>`;
    else if (!Object.keys(targets).length) html = `<div class="info">${esc(T.notTaught)}</div>`;
    else if (!this._target) html = `<div class="name" style="opacity:.4">—</div><div class="info">${esc(T.pointAt)}</div>`;
    else {
      const st = this._hass.states[this._target];
      const a = st.attributes;
      let extra = "";
      if (st.state === "on" && a.brightness != null) extra = ` · ${Math.round((a.brightness / 255) * 100)} %`;
      if (a.current_position != null) extra = ` · ${a.current_position} %`;
      if (a.volume_level != null) extra = ` · ${Math.round(a.volume_level * 100)} %`;
      const note = !this._aiming ? " · " + T.lastAimed : this._unsure ? " · " + T.closeCall : "";
      html = `<div class="name">${esc(this._name(this._target))}</div><div class="info">${esc(this._stateText(st))}${extra}${note}</div>`;
    }
    tg.classList.toggle("stale", !!this._target && !this._aiming);
    if (tg._html !== html) { tg.innerHTML = html; tg._html = html; }

    // controls – only rebuilt when target or its state changes, so taps are never lost
    const st = this._target && this._hass.states[this._target];
    const sig = st ? this._target + "|" + st.last_updated + "|" + this._hass.locale?.language : "";
    if (sig !== this._ctrlSig) {
      this._ctrlSig = sig;
      this.$("#controls").innerHTML = st ? this._controls(this._target) : "";
    }

    // compass hint
    let hint = "";
    if (ready && this._aim) {
      hint = `${T.direction} ${Math.round(this._aim.h)}° · ${T.tilt} ${Math.round(this._aim.p)}°`;
      if (!this._compassOk) hint += " · " + T.noCompass;
      else if (this._accuracy != null && (this._accuracy < 0 || this._accuracy > 25)) hint += " · " + T.badCompass;
    }
    this.$("#compass").textContent = hint;
  }
}

if (!customElements.get("point-remote-card")) customElements.define("point-remote-card", PointRemoteCard);
// old name from version 1.x keeps working
if (!customElements.get("zeig-licht-card")) customElements.define("zeig-licht-card", class extends PointRemoteCard {});
window.customCards = window.customCards || [];
window.customCards.push({
  type: "point-remote-card",
  name: "Point Remote",
  description: textsFor().description,
  preview: false,
  documentationURL: "https://github.com/onkeloki/point-remote-card",
});
console.info(`%c POINT-REMOTE-CARD %c ${VERSION} `, "background:#ffb300;color:#000;font-weight:600", "background:#333;color:#fff");
