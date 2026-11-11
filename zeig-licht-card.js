// Zeig-Licht card – point your phone at a lamp to control it.
// Direction = top edge of the phone (compass + tilt). For each "spot" (sofa, dining table …) the direction of every
// lamp is taught once and stored in the Home Assistant user data (frontend/set_user_data).
// Card: type: custom:zeig-licht-card   (optional: entities: [light.x, …] limits the lamp list)
// https://github.com/onkeloki/zeig-licht-card  –  MIT License

const VERSION = "1.0.0";
const STORE_KEY = "zeig_licht";
const HIT_DEG = 18;      // how far off you may point
const RADAR_DEG = 60;    // radar radius in degrees
const HOLD_MS = 1500;    // lamp stays selected briefly while lowering the phone to tap

const TEXTS = {
  en: {
    start: "Enable sensors",
    startAgain: "Allow sensors again",
    toggle: "On / Off",
    turnOn: "Turn on",
    turnOff: "Turn off",
    teachSpots: "Teach & spots",
    teachHelp: "Stay at your spot, pick a lamp, point the top edge of your phone at it and save.",
    pickLamp: "Pick a lamp …",
    save: "Point now & save",
    holdStill: "Hold still …",
    newSpotPh: "New spot, e.g. dining table",
    addSpot: "Add spot",
    delSpot: "Delete current spot",
    defaultSpot: "Sofa",
    nothingYet: (s) => `Nothing taught for “${s}” yet.`,
    tapStart: "Tap “Enable sensors” once and allow access.",
    waiting: "Waiting for sensor data …",
    notTaught: "Nothing taught yet – open “Teach & spots” below.",
    pointAt: "Point at a lamp",
    on: "on",
    off: "off",
    unavailable: "unavailable",
    close: "close call, aim more precisely",
    direction: "Direction",
    tilt: "tilt",
    noCompass: "no compass – directions only valid until reload",
    badCompass: "compass inaccurate: move the phone in a figure eight",
    pickFirst: "Pick a lamp first",
    enableFirst: "Enable sensors first",
    tooFew: "Not enough sensor data – try again",
    saved: (n, h, p) => `${n} saved (${h}°, tilt ${p}°)`,
    saveFailed: "Saving failed: ",
    denied: "Sensors not allowed: ",
    needHttps: " – page must be served over https",
    spotName: "Enter a name for the spot",
    lastSpot: "The last spot stays",
    confirmDel: (s) => `Tap again to delete “${s}”`,
    remove: "remove",
    description: "Point your phone at a lamp to control it",
  },
  de: {
    start: "Sensoren aktivieren",
    startAgain: "Sensoren erneut erlauben",
    toggle: "An / Aus",
    turnOn: "Einschalten",
    turnOff: "Ausschalten",
    teachSpots: "Anlernen & Plätze",
    teachHelp: "Am Platz bleiben, Lampe wählen, mit der Oberkante des Handys auf die Lampe zeigen und speichern.",
    pickLamp: "Lampe wählen …",
    save: "Jetzt zeigen & speichern",
    holdStill: "Ruhig halten …",
    newSpotPh: "Neuer Platz, z. B. Esstisch",
    addSpot: "Platz anlegen",
    delSpot: "Aktuellen Platz löschen",
    defaultSpot: "Sofa",
    nothingYet: (s) => `An „${s}“ ist noch keine Lampe angelernt.`,
    tapStart: "Einmal „Sensoren aktivieren“ tippen und erlauben.",
    waiting: "Warte auf Sensordaten …",
    notTaught: "Noch nichts angelernt – unten „Anlernen & Plätze“ öffnen.",
    pointAt: "Auf eine Lampe zeigen",
    on: "an",
    off: "aus",
    unavailable: "nicht erreichbar",
    close: "knapp, genauer zielen",
    direction: "Richtung",
    tilt: "Neigung",
    noCompass: "kein Kompass – Richtungen gelten nur bis zum Neuladen",
    badCompass: "Kompass ungenau: Handy einmal in einer Acht bewegen",
    pickFirst: "Erst eine Lampe auswählen",
    enableFirst: "Erst Sensoren aktivieren",
    tooFew: "Zu wenig Sensordaten – nochmal versuchen",
    saved: (n, h, p) => `${n} gespeichert (${h}°, Neigung ${p}°)`,
    saveFailed: "Speichern fehlgeschlagen: ",
    denied: "Sensoren nicht erlaubt: ",
    needHttps: " – Seite muss über https laufen",
    spotName: "Namen für den Platz eingeben",
    lastSpot: "Der letzte Platz bleibt",
    confirmDel: (s) => `Nochmal tippen, um „${s}“ zu löschen`,
    remove: "entfernen",
    description: "Mit dem Handy auf eine Lampe zeigen und schalten",
  },
};

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const norm360 = (d) => ((d % 360) + 360) % 360;
const diff180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const vec = (h, p) => [Math.cos(rad(p)) * Math.sin(rad(h)), Math.cos(rad(p)) * Math.cos(rad(h)), Math.sin(rad(p))];
const angle = (a, b) => {
  const va = vec(a.h, a.p), vb = vec(b.h, b.p);
  return deg(Math.acos(Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))));
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const browserLang = (navigator.language || "en").slice(0, 2);

class ZeigLichtCard extends HTMLElement {
  static getStubConfig() {
    return {};
  }
  setConfig(config) {
    this._config = config || {};
  }
  getCardSize() {
    return 10;
  }

  get _t() {
    const lang = (this._hass?.locale?.language || this._hass?.language || browserLang).slice(0, 2);
    return TEXTS[lang] || TEXTS.en;
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) {
      this._build();
      this._load();
    }
    this._fillLampSelect();
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
    try {
      const r = await this._hass.connection.sendMessagePromise({ type: "frontend/get_user_data", key: STORE_KEY });
      this._data = r?.value || null;
    } catch (e) {
      this._data = null;
    }
    if (!this._data?.plaetze?.length) this._data = { plaetze: [{ id: "p1", name: this._t.defaultSpot, lampen: {} }], aktiv: "p1" };
    this._renderSpots();
    this._renderList();
    this._render();
  }
  async _save() {
    try {
      await this._hass.connection.sendMessagePromise({ type: "frontend/set_user_data", key: STORE_KEY, value: this._data });
    } catch (e) {
      this._toast(this._t.saveFailed + (e.message || e.code || e));
    }
  }
  get _spot() {
    const d = this._data;
    return d?.plaetze.find((p) => p.id === d.aktiv) || d?.plaetze[0];
  }

  // ---------- sensors ----------
  async _allow() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const r = await DeviceOrientationEvent.requestPermission();
        this._perm = r === "granted" ? "ok" : "denied";
      } else if (typeof DeviceOrientationEvent !== "undefined") {
        this._perm = "ok";
      } else {
        this._perm = "missing";
      }
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
    // iOS: alpha is not north-referenced -> estimate offset to the compass (only while the phone is fairly flat, where the compass is reliable)
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

  // ---------- hit test ----------
  _hit() {
    const spot = this._spot;
    if (!spot || !this._aim) return null;
    const list = Object.entries(spot.lampen)
      .filter(([ent]) => this._hass.states[ent])
      .map(([ent, r]) => ({ ent, w: angle(this._aim, r) }))
      .sort((a, b) => a.w - b.w);
    const now = Date.now();
    if (list[0] && list[0].w <= HIT_DEG) {
      const t = { ent: list[0].ent, w: list[0].w, unsure: !!(list[1] && list[1].w - list[0].w < 5) };
      this._last = { ...t, time: now };
      return t;
    }
    if (this._last && now - this._last.time < HOLD_MS) return { ...this._last, held: true };
    return null;
  }

  _haptic(type) {
    window.dispatchEvent(new CustomEvent("haptic", { detail: type, bubbles: true, composed: true }));
  }

  // ---------- actions ----------
  _toggle() {
    const t = this._current;
    if (!t) return;
    this._hass.callService("light", "toggle", { entity_id: t.ent });
    this._haptic("success");
  }
  _dim(step) {
    const t = this._current;
    if (!t) return;
    this._hass.callService("light", "turn_on", { entity_id: t.ent, brightness_step_pct: step });
    this._haptic("light");
  }
  async _teach() {
    const T = this._t;
    const ent = this.$("#lamp").value;
    if (!ent) return this._toast(T.pickFirst);
    if (this._perm !== "ok" || !this._aim) return this._toast(T.enableFirst);
    const btn = this.$("#teach");
    btn.disabled = true;
    btn.textContent = T.holdStill;
    this._samples = [];
    await new Promise((r) => setTimeout(r, 1200));
    const samples = this._samples;
    this._samples = null;
    btn.disabled = false;
    btn.textContent = T.save;
    if (samples.length < 5) return this._toast(T.tooFew);
    let x = 0, y = 0, z = 0;
    for (const s of samples) { const v = vec(s.h, s.p); x += v[0]; y += v[1]; z += v[2]; }
    const l = Math.hypot(x, y, z);
    const r = { h: Math.round(norm360(deg(Math.atan2(x, y))) * 10) / 10, p: Math.round(deg(Math.asin(z / l)) * 10) / 10 };
    this._spot.lampen[ent] = r;
    await this._save();
    this._haptic("success");
    this._toast(T.saved(this._name(ent), Math.round(r.h), Math.round(r.p)));
    this._renderList();
  }
  async _remove(ent) {
    delete this._spot.lampen[ent];
    await this._save();
    this._renderList();
  }
  async _selectSpot(id) {
    this._data.aktiv = id;
    this._last = null;
    await this._save();
    this._renderSpots();
    this._renderList();
  }
  async _addSpot() {
    const field = this.$("#spotname");
    const name = field.value.trim();
    if (!name) return this._toast(this._t.spotName);
    const id = "p" + Date.now().toString(36);
    this._data.plaetze.push({ id, name, lampen: {} });
    field.value = "";
    await this._selectSpot(id);
  }
  async _deleteSpot() {
    if (this._data.plaetze.length < 2) return this._toast(this._t.lastSpot);
    if (!this._delConfirm) {
      this._delConfirm = true;
      this._toast(this._t.confirmDel(this._spot.name));
      setTimeout(() => (this._delConfirm = false), 3000);
      return;
    }
    this._delConfirm = false;
    this._data.plaetze = this._data.plaetze.filter((p) => p.id !== this._spot.id);
    await this._selectSpot(this._data.plaetze[0].id);
  }

  // ---------- rendering ----------
  $(s) {
    return this.shadowRoot.querySelector(s);
  }
  _name(ent) {
    return this._hass.states[ent]?.attributes.friendly_name || ent;
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
  .chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip { border: 1px solid var(--divider-color); background: none; color: var(--primary-text-color); border-radius: 18px; padding: 6px 14px; font-size: 14px; }
  .chip.on { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
  .radar { position: relative; width: 100%; max-width: 340px; aspect-ratio: 1; margin: 0 auto; }
  .radar svg { width: 100%; height: 100%; display: block; }
  .target { text-align: center; min-height: 64px; }
  .target .name { font-size: 26px; font-weight: 600; color: var(--primary-text-color); }
  .target .info { font-size: 14px; color: var(--secondary-text-color); margin-top: 2px; }
  .buttons { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 10px; }
  button.big { font-size: 20px; font-weight: 600; padding: 22px 0; border-radius: 16px; border: none; background: var(--primary-color); color: var(--text-primary-color, #fff); }
  button.big.lit { background: var(--state-light-active-color, #ffb300); color: #000; }
  button.small { font-size: 26px; border-radius: 16px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
  button:disabled { opacity: .35; }
  .start { font-size: 18px; padding: 18px; border-radius: 14px; border: none; background: var(--primary-color); color: var(--text-primary-color, #fff); }
  .hint { font-size: 13px; color: var(--secondary-text-color); text-align: center; }
  details { border-top: 1px solid var(--divider-color); padding-top: 10px; }
  summary { font-size: 16px; font-weight: 600; color: var(--primary-text-color); padding: 6px 0; }
  .teach { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
  select, input { font-size: 16px; padding: 10px; border-radius: 10px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
  .row { display: flex; gap: 8px; }
  .row > * { flex: 1; }
  .teach button { font-size: 16px; padding: 12px; border-radius: 10px; border: 1px solid var(--divider-color); background: var(--secondary-background-color); color: var(--primary-text-color); }
  .teach button.main { background: var(--primary-color); color: var(--text-primary-color, #fff); border: none; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--divider-color); color: var(--primary-text-color); font-size: 15px; }
  li small { color: var(--secondary-text-color); margin-left: 6px; }
  li button { border: none; background: none; color: var(--error-color, #db4437); font-size: 18px; padding: 4px 10px; }
  #toast { position: sticky; bottom: 8px; background: var(--primary-text-color); color: var(--card-background-color); padding: 10px 14px; border-radius: 10px; font-size: 14px; opacity: 0; transition: opacity .3s; pointer-events: none; }
  #toast.show { opacity: .92; }
</style>
<ha-card>
  <div class="chips" id="spots"></div>
  <button class="start" id="start">${T.start}</button>
  <div class="radar"><svg viewBox="-110 -110 220 220" id="radar"></svg></div>
  <div class="target" id="target"></div>
  <div class="buttons">
    <button class="small" id="minus">−</button>
    <button class="big" id="toggle">${T.toggle}</button>
    <button class="small" id="plus">+</button>
  </div>
  <div class="hint" id="compass"></div>
  <details>
    <summary>${T.teachSpots}</summary>
    <div class="teach">
      <div class="hint" style="text-align:left">${T.teachHelp}</div>
      <select id="lamp"></select>
      <button class="main" id="teach">${T.save}</button>
      <ul id="list"></ul>
      <div class="row"><input id="spotname" placeholder="${esc(T.newSpotPh)}"><button id="addspot">${T.addSpot}</button></div>
      <button id="delspot">${T.delSpot}</button>
    </div>
  </details>
  <div id="toast"></div>
</ha-card>`;
    this.$("#start").addEventListener("click", () => this._allow());
    this.$("#toggle").addEventListener("click", () => this._toggle());
    this.$("#plus").addEventListener("click", () => this._dim(15));
    this.$("#minus").addEventListener("click", () => this._dim(-15));
    this.$("#teach").addEventListener("click", () => this._teach());
    this.$("#addspot").addEventListener("click", () => this._addSpot());
    this.$("#delspot").addEventListener("click", () => this._deleteSpot());
    this.$("#spots").addEventListener("click", (e) => { const id = e.target.dataset?.id; if (id) this._selectSpot(id); });
    this.$("#list").addEventListener("click", (e) => { const ent = e.target.dataset?.ent; if (ent) this._remove(ent); });
    // no permission prompt needed (Android/desktop): start right away
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function") {
      this._perm = "ok";
      this._sensorStart();
    }
  }

  _fillLampSelect() {
    const sel = this.$("#lamp");
    if (!sel) return;
    const allowed = this._config.entities;
    const ids = Object.keys(this._hass.states)
      .filter((e) => e.startsWith("light.") && !/_segment_\d+$/.test(e) && (!allowed || allowed.includes(e)))
      .sort((a, b) => this._name(a).localeCompare(this._name(b)));
    const sig = ids.join(",");
    if (sig === this._lampSig) return;
    this._lampSig = sig;
    const old = sel.value;
    sel.innerHTML = `<option value="">${esc(this._t.pickLamp)}</option>` + ids.map((e) => `<option value="${e}">${esc(this._name(e))}</option>`).join("");
    sel.value = old;
  }

  _renderSpots() {
    if (!this._data) return;
    this.$("#spots").innerHTML = this._data.plaetze
      .map((p) => `<button class="chip ${p.id === this._spot.id ? "on" : ""}" data-id="${p.id}">${esc(p.name)}</button>`)
      .join("");
  }

  _renderList() {
    if (!this._data) return;
    const entries = Object.entries(this._spot.lampen).sort((a, b) => a[1].h - b[1].h);
    this.$("#list").innerHTML = entries.length
      ? entries.map(([ent, r]) => `<li><span>${esc(this._name(ent))}<small>${Math.round(r.h)}° · ${Math.round(r.p)}°</small></span><button data-ent="${ent}" aria-label="${this._t.remove}">✕</button></li>`).join("")
      : `<li><span class="hint">${esc(this._t.nothingYet(this._spot.name))}</span></li>`;
  }

  _render() {
    if (!this.shadowRoot || !this._hass) return;
    const T = this._t;
    const ready = this._perm === "ok";
    this.$("#start").style.display = ready ? "none" : "";
    if (this._perm === "denied") this.$("#start").textContent = T.startAgain;

    const t = ready ? this._hit() : null;
    if ((t?.ent || null) !== (this._current?.ent || null) && t && !t.held) this._haptic("selection");
    this._current = t;

    // radar
    const spot = this._spot;
    const scale = 100 / RADAR_DEG;
    let svg = `<circle r="100" fill="none" stroke="var(--divider-color)" stroke-width="1"/>
      <circle r="${HIT_DEG * scale}" fill="var(--primary-color)" fill-opacity=".08" stroke="var(--primary-color)" stroke-opacity=".5" stroke-dasharray="3 3"/>
      <circle r="${(RADAR_DEG / 2) * scale}" fill="none" stroke="var(--divider-color)" stroke-width=".6"/>
      <line x1="-8" y1="0" x2="8" y2="0" stroke="var(--primary-text-color)" stroke-width="1.5"/>
      <line x1="0" y1="-8" x2="0" y2="8" stroke="var(--primary-text-color)" stroke-width="1.5"/>`;
    if (spot && this._aim) {
      for (const [ent, r] of Object.entries(spot.lampen)) {
        const st = this._hass.states[ent];
        if (!st) continue;
        let x = diff180(r.h - this._aim.h) * scale;
        let y = -(r.p - this._aim.p) * scale;
        const l = Math.hypot(x, y);
        const inside = l <= 100;
        if (!inside) { x = (x / l) * 100; y = (y / l) * 100; }
        const selected = t?.ent === ent;
        const color = st.state === "unavailable" ? "var(--disabled-text-color, #999)" : st.state === "on" ? "var(--state-light-active-color, #ffb300)" : "var(--secondary-text-color)";
        svg += `<circle cx="${x}" cy="${y}" r="${selected ? 9 : inside ? 6 : 3.5}" fill="${color}" ${selected ? 'stroke="var(--primary-color)" stroke-width="3"' : ""}/>`;
        if (inside) svg += `<text x="${x}" y="${y - 12}" text-anchor="middle" font-size="10" fill="var(--primary-text-color)">${esc(this._name(ent))}</text>`;
      }
    }
    this.$("#radar").innerHTML = svg;

    // target
    let html;
    if (!ready) html = `<div class="info">${esc(T.tapStart)}</div>`;
    else if (!this._aim) html = `<div class="info">${esc(T.waiting)}</div>`;
    else if (!Object.keys(spot?.lampen || {}).length) html = `<div class="info">${esc(T.notTaught)}</div>`;
    else if (!t) html = `<div class="name" style="opacity:.4">—</div><div class="info">${esc(T.pointAt)}</div>`;
    else {
      const st = this._hass.states[t.ent];
      const bri = st.state === "on" && st.attributes.brightness != null ? ` · ${Math.round((st.attributes.brightness / 255) * 100)} %` : "";
      const state = st.state === "on" ? T.on : st.state === "off" ? T.off : T.unavailable;
      html = `<div class="name">${esc(this._name(t.ent))}</div><div class="info">${state}${bri}${t.unsure ? " · " + T.close : ""}</div>`;
    }
    this.$("#target").innerHTML = html;

    const st = t && this._hass.states[t.ent];
    const k = this.$("#toggle");
    k.disabled = !t;
    k.textContent = !st ? T.toggle : st.state === "on" ? T.turnOff : T.turnOn;
    k.classList.toggle("lit", st?.state === "on");
    this.$("#plus").disabled = !t;
    this.$("#minus").disabled = !t;

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

if (!customElements.get("zeig-licht-card")) customElements.define("zeig-licht-card", ZeigLichtCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "zeig-licht-card",
  name: "Zeig-Licht",
  description: (TEXTS[browserLang] || TEXTS.en).description,
  preview: false,
  documentationURL: "https://github.com/onkeloki/zeig-licht-card",
});
console.info(`%c ZEIG-LICHT-CARD %c ${VERSION} `, "background:#ffb300;color:#000;font-weight:600", "background:#333;color:#fff");
