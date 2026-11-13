// Point Remote Card – point your phone at a device to control it.
// Direction = top edge of the phone (compass + tilt). Each card is one place (couch, kitchen …): the direction of every
// device is taught once from there and stored in the Home Assistant user data (frontend/set_user_data).
// Camera mode: instead of the compass the card recognises the device in the camera picture. Every device is taught with a
// few camera views; a small image-embedding model (MediaPipe, runs on the phone) compares the live picture with them.
// https://github.com/onkeloki/point-remote-card  –  MIT License

const VERSION = "2.1.0";
const HIT_DEG = 18;       // how far off you may point
const RADAR_DEG = 60;     // radar radius in degrees
const DWELL_MS = 250;     // a new target must be aimed at this long before it takes over
const DOMAINS = ["light", "cover", "media_player", "switch", "fan", "climate", "input_boolean", "lock", "scene", "script", "button", "input_button"];
const DEFAULT_COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#00c7be", "#007aff", "#5856d6", "#af52de", "#ff2d55"];
const DEFAULT_POSITIONS = [0, 25, 50, 75, 100];
// camera mode
const CAM_LIB = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
const CAM_MODEL = "https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite";
const CAM_STORE = "point_remote_camera"; // views are shared by all camera cards of a user (they do not depend on the place)
const CAM_MIN = 0.7;       // minimum similarity (0…1) for a hit
const CAM_MARGIN = 0.03;   // below this lead over the second best device it is a close call
const CAM_INTERVAL = 200;  // ms between two recognitions
const CAM_CROP = 0.6;      // only the centre of the picture (the frame) is compared
const CAM_SIZE = 224;      // input size of the model
const CAM_VIEWS = 12;      // max. views per device (oldest is dropped)

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
    fMode: "Mode", modeCompass: "Compass – point the top edge of the phone", modeCamera: "Camera – recognise the device in the picture",
    camStart: "Start camera", camStop: "Stop camera", camLoading: "Starting camera …", camTap: "Tap “Start camera” and allow access.",
    camHelp: "Pick a device, aim the camera so the device fills the frame and save. Save 2–3 views from different spots and distances – the more views, the better the recognition, wherever you stand.",
    camSave: "Save view", camFirst: "Start the camera first", camError: "Camera not available: ",
    camSaved: (n, c) => `${n}: view ${c} saved`, views: (c) => (c === 1 ? "1 view" : `${c} views`), match: "match", noMatch: "no known device in the frame",
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
    fMode: "Modus", modeCompass: "Kompass – mit der Oberkante des Handys zeigen", modeCamera: "Kamera – Gerät im Bild erkennen",
    camStart: "Kamera starten", camStop: "Kamera stoppen", camLoading: "Kamera startet …", camTap: "„Kamera starten“ tippen und erlauben.",
    camHelp: "Gerät wählen, die Kamera so ausrichten, dass das Gerät den Rahmen füllt, und speichern. 2–3 Ansichten von verschiedenen Plätzen und Abständen speichern – je mehr Ansichten, desto besser die Erkennung, egal wo du stehst.",
    camSave: "Ansicht speichern", camFirst: "Erst die Kamera starten", camError: "Kamera nicht verfügbar: ",
    camSaved: (n, c) => `${n}: Ansicht ${c} gespeichert`, views: (c) => (c === 1 ? "1 Ansicht" : `${c} Ansichten`), match: "Treffer", noMatch: "kein bekanntes Gerät im Rahmen",
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
    fMode: "Modus", modeCompass: "Kompas – wijs met de bovenkant van de telefoon", modeCamera: "Camera – herken het apparaat in het beeld",
    camStart: "Camera starten", camStop: "Camera stoppen", camLoading: "Camera start …", camTap: "Tik op „Camera starten” en sta toegang toe.",
    camHelp: "Kies een apparaat, richt de camera zo dat het apparaat het kader vult en sla op. Sla 2–3 beelden op vanaf verschillende plekken en afstanden – hoe meer beelden, hoe beter de herkenning, waar je ook staat.",
    camSave: "Beeld opslaan", camFirst: "Start eerst de camera", camError: "Camera niet beschikbaar: ",
    camSaved: (n, c) => `${n}: beeld ${c} opgeslagen`, views: (c) => (c === 1 ? "1 beeld" : `${c} beelden`), match: "overeenkomst", noMatch: "geen bekend apparaat in het kader",
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
    fMode: "Mode", modeCompass: "Boussole – pointer avec le haut du téléphone", modeCamera: "Caméra – reconnaître l’appareil dans l’image",
    camStart: "Démarrer la caméra", camStop: "Arrêter la caméra", camLoading: "Démarrage de la caméra …", camTap: "Touchez « Démarrer la caméra » et autorisez l’accès.",
    camHelp: "Choisissez un appareil, cadrez-le pour qu’il remplisse le cadre et enregistrez. Enregistrez 2–3 vues depuis différents endroits et distances – plus il y a de vues, meilleure est la reconnaissance, où que vous soyez.",
    camSave: "Enregistrer la vue", camFirst: "Démarrez d’abord la caméra", camError: "Caméra non disponible : ",
    camSaved: (n, c) => `${n} : vue ${c} enregistrée`, views: (c) => (c === 1 ? "1 vue" : `${c} vues`), match: "correspondance", noMatch: "aucun appareil connu dans le cadre",
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
    fMode: "Modo", modeCompass: "Brújula – apuntar con el borde superior del móvil", modeCamera: "Cámara – reconocer el dispositivo en la imagen",
    camStart: "Iniciar cámara", camStop: "Detener cámara", camLoading: "Iniciando cámara …", camTap: "Toca «Iniciar cámara» y permite el acceso.",
    camHelp: "Elige un dispositivo, encuadra la cámara para que el dispositivo llene el marco y guarda. Guarda 2–3 vistas desde distintos lugares y distancias – cuantas más vistas, mejor el reconocimiento, estés donde estés.",
    camSave: "Guardar vista", camFirst: "Inicia primero la cámara", camError: "Cámara no disponible: ",
    camSaved: (n, c) => `${n}: vista ${c} guardada`, views: (c) => (c === 1 ? "1 vista" : `${c} vistas`), match: "coincidencia", noMatch: "ningún dispositivo conocido en el marco",
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
    fMode: "Modalità", modeCompass: "Bussola – punta con il bordo superiore del telefono", modeCamera: "Fotocamera – riconosci il dispositivo nell’immagine",
    camStart: "Avvia fotocamera", camStop: "Ferma fotocamera", camLoading: "Avvio fotocamera …", camTap: "Tocca «Avvia fotocamera» e consenti l’accesso.",
    camHelp: "Scegli un dispositivo, inquadralo in modo che riempia la cornice e salva. Salva 2–3 viste da punti e distanze diversi – più viste ci sono, migliore è il riconoscimento, ovunque ti trovi.",
    camSave: "Salva vista", camFirst: "Avvia prima la fotocamera", camError: "Fotocamera non disponibile: ",
    camSaved: (n, c) => `${n}: vista ${c} salvata`, views: (c) => (c === 1 ? "1 vista" : `${c} viste`), match: "corrispondenza", noMatch: "nessun dispositivo noto nella cornice",
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

// camera mode: the model is loaded once (only when a camera card starts) and shared by all cards
const embedders = {};
const loadEmbedder = (lib, model) => {
  const key = lib + "|" + model;
  embedders[key] ||= (async () => {
    const mp = await import(/* webpackIgnore: true */ `${lib}/vision_bundle.mjs`);
    const files = await mp.FilesetResolver.forVisionTasks(`${lib}/wasm`);
    return mp.ImageEmbedder.createFromOptions(files, { baseOptions: { modelAssetPath: model, delegate: "CPU" }, runningMode: "IMAGE", l2Normalize: true });
  })().catch((e) => { delete embedders[key]; throw e; });
  return embedders[key];
};
const unit = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return Float32Array.from(v, (x) => x / n); };
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
// views are stored compactly as base64 int8 (direction only, the length does not matter for the cosine similarity)
const encView = (v) => {
  let m = 1e-9;
  for (const x of v) m = Math.max(m, Math.abs(x));
  const b = new Int8Array(v.length);
  for (let i = 0; i < v.length; i++) b[i] = Math.round((v[i] / m) * 127);
  let s = "";
  for (const x of new Uint8Array(b.buffer)) s += String.fromCharCode(x);
  return btoa(s);
};
const decView = (s) => { const bin = atob(s); return unit(Array.from(bin, (c) => (c.charCodeAt(0) << 24) >> 24)); };

class PointRemoteCard extends HTMLElement {
  static getStubConfig() {
    return { name: textsFor().defaultName };
  }
  static getConfigForm() {
    const T = textsFor();
    return {
      schema: [
        { name: "mode", selector: { select: { mode: "dropdown", options: [{ value: "compass", label: T.modeCompass }, { value: "camera", label: T.modeCamera }] } } },
        { name: "name", selector: { text: {} } },
        { name: "entities", selector: { entity: { multiple: true, filter: { domain: DOMAINS } } } },
        { name: "id", selector: { text: {} } },
      ],
      computeLabel: (s, hass) => {
        const T = textsFor(hass?.locale?.language || hass?.language);
        return { mode: T.fMode, name: T.fName, entities: T.fEntities, id: T.fId }[s.name];
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
    this._mode = this._config.mode === "camera" ? "camera" : "compass";
    if (this.shadowRoot) { this._renderTitle(); this._applyMode(); if (this._hass) this._load(); }
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
    if (this._mode === "camera") { if (this._camWanted) this._camStart(); }
    else if (this._perm === "ok") this._sensorStart();
  }
  disconnectedCallback() {
    this._sensorStop();
    this._camStop();
  }

  // ---------- data ----------
  async _get(k) {
    try { return (await this._hass.connection.sendMessagePromise({ type: "frontend/get_user_data", key: k }))?.value || null; }
    catch (e) { return null; }
  }
  async _load() {
    this._loaded = true;
    if (this._mode === "camera") return this._loadCam();
    const key = this._storeKey;
    const get = (k) => this._get(k);
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
  async _save(key = this._storeKey, value = this._data) {
    try {
      await this._hass.connection.sendMessagePromise({ type: "frontend/set_user_data", key, value });
      return true;
    } catch (e) {
      this._toast(this._t.saveFailed + (e.message || e.code || e));
      return false;
    }
  }
  async _loadCam() {
    const data = await this._get(CAM_STORE);
    this._setCam(data?.devices ? data : { devices: {} });
  }
  _setCam(data) {
    this._cam = data;
    this._camVecs = {};
    for (const [ent, d] of Object.entries(data.devices)) this._camVecs[ent] = (d.views || []).map(decView);
    this._camScore = {};
    this._renderList();
    this._render();
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
    this._choose(best?.ent, !!(best && list[1] && list[1].w - best.w < 5));
  }
  _choose(ent, unsure) {
    this._aiming = !!ent;
    this._unsure = !!(ent && unsure);
    if (!ent || ent === this._target) { this._cand = null; return; }
    const now = Date.now();
    if (this._cand?.ent !== ent) this._cand = { ent, since: now };
    if (!this._target || now - this._cand.since >= DWELL_MS) {
      this._target = ent;
      this._cand = null;
      this._haptic("selection");
    }
  }

  // ---------- camera ----------
  _camAllowed(ent) {
    const allowed = Object.keys(this._opts);
    return !!this._hass.states[ent] && (!allowed.length || allowed.includes(ent));
  }
  async _camStart() {
    if (this._stream || this._camState === "loading") return;
    const T = this._t;
    this._camWanted = true;
    this._camState = "loading";
    this._render();
    const model = loadEmbedder(this._config.camera_lib || CAM_LIB, this._config.camera_model || CAM_MODEL);
    let stream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error(window.isSecureContext ? "getUserMedia" : "http");
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 640 } } });
      if (!this.isConnected || !this._camWanted || this._mode !== "camera") { stream.getTracks().forEach((t) => t.stop()); this._camState = "off"; return; }
      this._stream = stream;
      const v = this.$("#video");
      v.srcObject = stream;
      await v.play().catch(() => {});
      this._embedder = await model;
      if (this._stream !== stream) return; // stopped meanwhile
      this._camState = "on";
      this._camScore = {};
      this._camTick();
    } catch (e) {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      this._stream = null;
      this._camState = "error";
      this._camWanted = false;
      this._toast(T.camError + (e.message || e.name || e) + (window.isSecureContext ? "" : T.needHttps));
    }
    this._render();
  }
  _camStop(byUser) {
    if (byUser) this._camWanted = false;
    clearTimeout(this._camTimer);
    this._camTimer = null;
    if (this._stream) this._stream.getTracks().forEach((t) => t.stop());
    this._stream = null;
    const v = this.shadowRoot?.querySelector("#video");
    if (v) v.srcObject = null;
    if (this._camState === "on" || this._camState === "loading") this._camState = "off";
    this._aiming = false;
    this._camTop = null;
    this._render();
  }
  _camTick() {
    if (!this._stream) return;
    this._camTimer = setTimeout(() => this._camTick(), CAM_INTERVAL);
    let e;
    try { e = this._embedFrame(); } catch (err) { console.warn("point-remote-card:", err); return; }
    if (!e) return;
    if (this._camSamples) this._camSamples.push(e);
    this._camMatch(e);
    if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = null; this._render(); });
  }
  // the centre square of the picture (= the frame drawn over the video) as model input
  _embedFrame() {
    const v = this.$("#video");
    if (!v || v.readyState < 2 || !v.videoWidth) return null;
    const c = (this._crop ||= Object.assign(document.createElement("canvas"), { width: CAM_SIZE, height: CAM_SIZE }));
    const side = Math.min(v.videoWidth, v.videoHeight) * CAM_CROP;
    c.getContext("2d").drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, CAM_SIZE, CAM_SIZE);
    const emb = this._embedder.embed(c).embeddings?.[0]?.floatEmbedding;
    return emb ? unit(emb) : null;
  }
  _camMatch(e) {
    const scores = [];
    for (const [ent, views] of Object.entries(this._camVecs || {})) {
      if (!views.length || !this._camAllowed(ent)) continue;
      let best = -1;
      for (const v of views) best = Math.max(best, dot(e, v));
      const prev = this._camScore[ent];
      const sc = prev == null ? best : prev * 0.5 + best * 0.5; // a little smoothing against flicker
      this._camScore[ent] = sc;
      scores.push({ ent, sc });
    }
    scores.sort((a, b) => b.sc - a.sc);
    this._camTop = scores[0] || null;
    const thr = Number(this._config.camera_threshold) || CAM_MIN;
    const best = scores[0] && scores[0].sc >= thr ? scores[0] : null;
    this._choose(best?.ent, !!(best && scores[1] && best.sc - scores[1].sc < CAM_MARGIN));
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
    if (this._mode === "camera") return this._teachCam();
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
  async _teachCam() {
    const T = this._t;
    const ent = this.$("#entity").value;
    if (!ent) return this._toast(T.pickFirst);
    if (this._camState !== "on") return this._toast(T.camFirst);
    const b = this.$("#teach");
    b.disabled = true;
    b.textContent = T.holdStill;
    this._camSamples = [];
    await new Promise((r) => setTimeout(r, 1000));
    const samples = this._camSamples;
    this._camSamples = null;
    // small preview picture of the frame for the list
    let thumb = null;
    try {
      const t = Object.assign(document.createElement("canvas"), { width: 64, height: 64 });
      t.getContext("2d").drawImage(this._crop, 0, 0, 64, 64);
      thumb = t.toDataURL("image/jpeg", 0.6);
    } catch (e) { /* no preview */ }
    b.disabled = false;
    b.textContent = T.camSave;
    if (!samples || samples.length < 2) return this._toast(T.tooFew);
    const sum = new Float32Array(samples[0].length);
    for (const v of samples) for (let i = 0; i < v.length; i++) sum[i] += v[i];
    // re-read first, so views taught meanwhile on another card or device are kept
    const fresh = await this._get(CAM_STORE);
    const data = fresh?.devices ? fresh : this._cam || { devices: {} };
    const dev = (data.devices[ent] ||= { views: [] });
    dev.views.push(encView(sum));
    while (dev.views.length > CAM_VIEWS) dev.views.shift();
    if (thumb) dev.thumb = thumb;
    if (!(await this._save(CAM_STORE, data))) return;
    this._setCam(data);
    this._haptic("success");
    this._toast(T.camSaved(this._name(ent), dev.views.length));
  }
  async _remove(ent) {
    if (this._mode === "camera") {
      const fresh = await this._get(CAM_STORE);
      const data = fresh?.devices ? fresh : this._cam;
      delete data.devices[ent];
      if (this._target === ent) this._target = null;
      if (await this._save(CAM_STORE, data)) this._setCam(data);
      return;
    }
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
  .cam { position: relative; width: 100%; max-width: 320px; aspect-ratio: 1; margin: 0 auto; border-radius: 16px; overflow: hidden; background: #111; }
  .cam video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cam .frame { position: absolute; inset: ${((1 - CAM_CROP) / 2) * 100}%; border: 2px solid rgba(255,255,255,.85); border-radius: 12px; box-shadow: 0 0 0 999px rgba(0,0,0,.28); pointer-events: none; transition: border-color .2s; }
  .cam .frame.hit { border-color: var(--state-light-active-color, #ffb300); border-width: 3px; }
  .cam .start { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); white-space: nowrap; }
  .cam .stop { position: absolute; top: 8px; right: 8px; width: 36px; height: 36px; border-radius: 50%; border: none; background: rgba(0,0,0,.5); color: #fff; padding: 0; display: flex; align-items: center; justify-content: center; }
  li img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; margin-right: 10px; vertical-align: middle; }
  li span { display: flex; align-items: center; }
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
  <div class="cam" id="cam">
    <video id="video" muted playsinline autoplay></video>
    <div class="frame" id="frame"></div>
    <button class="start" id="camStart">${T.camStart}</button>
    <button class="stop" id="camStop" aria-label="${T.camStop}"><ha-icon icon="mdi:stop"></ha-icon></button>
  </div>
  <div class="target" id="target"></div>
  <div id="controls"></div>
  <div class="hint" id="compass"></div>
  <details>
    <summary>${T.teachTitle}</summary>
    <div class="teach">
      <div class="hint" style="text-align:left" id="teachHelp"></div>
      <select id="entity"></select>
      <button id="teach">${T.save}</button>
      <ul id="list"></ul>
    </div>
  </details>
  <div id="toast"></div>
</ha-card>`;
    this._renderTitle();
    this.$("#start").addEventListener("click", () => this._allow());
    this.$("#camStart").addEventListener("click", () => this._camStart());
    this.$("#camStop").addEventListener("click", () => this._camStop(true));
    // camera off while the app / tab is in the background
    this._onVis = () => {
      if (this._mode !== "camera") return;
      if (document.hidden) { const w = this._camWanted; this._camStop(); this._camWanted = w; }
      else if (this._camWanted && this.isConnected) this._camStart();
    };
    document.addEventListener("visibilitychange", this._onVis);
    this.$("#teach").addEventListener("click", () => this._teach());
    this.$("#controls").addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b) this._action(b.dataset.act); });
    this.$("#list").addEventListener("click", (e) => { const ent = e.target.closest("[data-ent]")?.dataset.ent; if (ent) this._remove(ent); });
    // no permission prompt needed (Android/desktop): start right away
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function") this._perm = "ok";
    this._applyMode();
  }

  // show the parts of the current mode; sensors / camera only run in their mode
  _applyMode() {
    if (!this.shadowRoot) return;
    const T = this._t, cam = this._mode === "camera";
    if (this._shownMode !== this._mode) {
      if (this._shownMode) { this._target = null; this._aiming = false; this._ctrlSig = null; this._loaded = false; }
      this._shownMode = this._mode;
    }
    this.$(".radar").style.display = cam ? "none" : "";
    this.$("#cam").style.display = cam ? "" : "none";
    this.$("#teachHelp").textContent = cam ? T.camHelp : T.teachHelp;
    this.$("#teach").textContent = cam ? T.camSave : T.save;
    if (cam) { this._sensorStop(); this.$("#start").style.display = "none"; }
    else { this._camStop(true); if (this._perm === "ok") this._sensorStart(); }
    this._renderList();
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
    if (!this.shadowRoot) return;
    if (this._mode === "camera") {
      if (!this._cam) return;
      const entries = Object.entries(this._cam.devices).filter(([ent]) => this._hass?.states[ent]).sort((a, b) => this._name(a[0]).localeCompare(this._name(b[0])));
      this.$("#list").innerHTML = entries.length
        ? entries.map(([ent, d]) => `<li><span>${d.thumb ? `<img src="${esc(d.thumb)}" alt="">` : ""}${esc(this._name(ent))}<small>${esc(this._t.views(d.views?.length || 0))}</small></span><button data-ent="${ent}" aria-label="${this._t.remove}">✕</button></li>`).join("")
        : `<li><span class="hint">${esc(this._t.nothingYet)}</span></li>`;
      return;
    }
    if (!this._data) return;
    const entries = Object.entries(this._data.targets).sort((a, b) => a[1].h - b[1].h);
    this.$("#list").innerHTML = entries.length
      ? entries.map(([ent, r]) => `<li><span>${esc(this._name(ent))}<small>${Math.round(r.h)}° · ${Math.round(r.p)}°</small></span><button data-ent="${ent}" aria-label="${this._t.remove}">✕</button></li>`).join("")
      : `<li><span class="hint">${esc(this._t.nothingYet)}</span></li>`;
  }

  _render() {
    if (!this.shadowRoot || !this._hass) return;
    const T = this._t;
    const cam = this._mode === "camera";
    const ready = cam ? this._camState === "on" : this._perm === "ok";
    this.$("#start").style.display = ready || cam ? "none" : "";
    if (this._perm === "denied") this.$("#start").textContent = T.enableAgain;
    if (ready && !cam) this._updateTarget();
    if (this._target && !this._hass.states[this._target]) this._target = null;
    const targets = cam
      ? Object.fromEntries(Object.entries(this._cam?.devices || {}).filter(([ent, d]) => d.views?.length && this._camAllowed(ent)))
      : this._data?.targets || {};

    // camera view
    if (cam) {
      const sb = this.$("#camStart");
      sb.style.display = ready ? "none" : "";
      sb.disabled = this._camState === "loading";
      sb.textContent = this._camState === "loading" ? T.camLoading : T.camStart;
      this.$("#camStop").style.display = ready ? "" : "none";
      this.$("#frame").classList.toggle("hit", ready && !!this._aiming);
    }

    // radar
    const scale = 100 / RADAR_DEG;
    let svg = `<circle r="100" fill="none" stroke="var(--divider-color)" stroke-width="1"/>
      <circle r="${HIT_DEG * scale}" fill="var(--primary-color)" fill-opacity=".08" stroke="var(--primary-color)" stroke-opacity=".5" stroke-dasharray="3 3"/>
      <circle r="${(RADAR_DEG / 2) * scale}" fill="none" stroke="var(--divider-color)" stroke-width=".6"/>
      <line x1="-8" y1="0" x2="8" y2="0" stroke="var(--primary-text-color)" stroke-width="1.5"/>
      <line x1="0" y1="-8" x2="0" y2="8" stroke="var(--primary-text-color)" stroke-width="1.5"/>`;
    if (this._aim && !cam) {
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
    if (!cam) this.$("#radar").innerHTML = svg;

    // target line
    const tg = this.$("#target");
    let html;
    if (cam && !ready && !this._target) html = `<div class="info">${esc(this._camState === "loading" ? T.camLoading : T.camTap)}</div>`;
    else if (!cam && !ready) html = `<div class="info">${esc(T.tapStart)}</div>`;
    else if (!cam && !this._aim) html = `<div class="info">${esc(T.waiting)}</div>`;
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
    if (cam) {
      if (ready && Object.keys(targets).length)
        hint = this._aiming && this._camTop ? `${T.match} ${Math.round(this._camTop.sc * 100)} %` : T.noMatch + (this._camTop ? ` (${this._name(this._camTop.ent)} ${Math.round(this._camTop.sc * 100)} %)` : "");
    } else if (ready && this._aim) {
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
