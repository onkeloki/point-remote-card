# Zeig-Licht Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)
[![Validate](https://github.com/onkeloki/zeig-licht-card/actions/workflows/validate.yml/badge.svg)](https://github.com/onkeloki/zeig-licht-card/actions/workflows/validate.yml)

**Point your phone at a lamp – and switch it.**

A Home Assistant dashboard card that turns your phone into a pointing remote. No extra hardware, no beacons:
the card reads the phone's compass and tilt sensors, so it knows where the top edge of the phone is pointing.
You teach each lamp's direction once from your usual spot (sofa, dining table, …), and from then on you
just aim and tap.

*„Zeig-Licht“ is German for “point light”. The card speaks English and German (follows your Home Assistant language).*

## Features

- 🎯 **Aim & switch** – the lamp you point at is shown big, one tap toggles it, `−` / `+` dims it
- 📡 **Radar view** – shows all taught lamps around your current aim (amber = on, grey = off)
- 🛋️ **Spots** – teach separate directions for several places in the room
- 📳 **Haptic feedback** in the Home Assistant companion app when the target changes
- ✋ **Hold** – the target stays selected for 1.5 s while you lower the phone to tap
- ☁️ Taught directions are stored in your Home Assistant user profile, so they work on every device you log in with

## Installation

### HACS (custom repository)

1. HACS → ⋮ → **Custom repositories**
2. Repository: `https://github.com/onkeloki/zeig-licht-card`, type **Dashboard**
3. Install **Zeig-Licht Card** and reload the browser / app

### Manual

1. Copy `zeig-licht-card.js` to `/config/www/zeig-licht-card.js`
2. Settings → Dashboards → ⋮ → **Resources** → add `/local/zeig-licht-card.js` as *JavaScript module*

## Configuration

```yaml
type: custom:zeig-licht-card
# optional: only offer these lamps when teaching
entities:
  - light.living_room
  - light.sofa_left
```

Works best as the only card of a **panel view** on your phone dashboard.

## Usage

1. Open the card on your phone and tap **Enable sensors** (iOS asks for motion & orientation access once).
2. Open **Teach & spots**, pick a lamp, point the **top edge** of the phone at it and tap **Point now & save**. Hold still for a second.
3. Repeat for each lamp. Add more spots if you use the card from different places.
4. Now just point – the lamp is recognised, tap the big button to switch it.

## Good to know

- Directions are relative to **where you sit**. Teach them from the spot you'll use; use *spots* for other places.
- Indoor compasses are bent by speakers, radiators and steel, but since you teach and use from the same spot, that error is mostly the same both times and cancels out.
- Lamps closer together than ~10–15° (seen from your spot) are hard to tell apart; the card then says “close call”.
- If the hint says the compass is inaccurate, move the phone in a figure eight.
- **iOS needs https** for the sensor permission (e.g. Nabu Casa or your own TLS). Plain `http://homeassistant.local:8123` will not get sensor access.
- Built and tuned for iPhone (Safari and the companion app). Android uses the absolute orientation event and should work, but is untested so far – feedback welcome.

## How it works

The heading of the phone's top edge is `360° − alpha` and its tilt is `beta` of the
[DeviceOrientation](https://developer.mozilla.org/docs/Web/API/DeviceOrientationEvent) event. On iOS, `alpha` is not north-referenced,
so the card continuously estimates an offset from `webkitCompassHeading`. The lamp whose stored direction has the smallest
angle to the current aim (max. 18°) is selected.

## License

MIT
