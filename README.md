# Point Remote Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/docs/faq/custom_repositories)
[![Validate](https://github.com/onkeloki/point-remote-card/actions/workflows/validate.yml/badge.svg)](https://github.com/onkeloki/point-remote-card/actions/workflows/validate.yml)

**Point your phone at a lamp, blind, TV or amplifier – and control it.**

A Home Assistant dashboard card that turns your phone into a pointing remote. No extra hardware, no beacons:
the card reads the phone's compass and tilt sensors, so it knows where the top edge of the phone is pointing.
You teach each device's direction once from a place (couch, kitchen, …), and from then on you just aim and tap.

## Features

- 🎯 **Aim & control** – the device you point at is shown big, with controls that fit it:

  | Device | Controls |
  |---|---|
  | Light | on/off, dim −/+, warm/neutral/cold white, colour swatches (only what the lamp supports) |
  | Cover / blind | up · stop · down, position presets |
  | Media player (TV, amplifier) | power, volume −/+, play/pause, mute, source buttons |
  | Fan | on/off, speed −/+ |
  | Climate | target temperature −/+ |
  | Lock | lock / unlock |
  | Switch, input boolean | on/off |
  | Scene, script, button | activate / run / press |
- 📡 **Radar view** – all taught devices around your current aim (amber = on/open, grey = off)
- 🛋️ **One card per place** – add several cards (“Couch”, “Kitchen”, …), each with its own taught directions
- 📍 **Location-aware** – combine with Home Assistant's card *visibility* conditions to show the right card where you are (see below)
- 📳 **Haptic feedback** in the companion app; the target stays selected until you aim at another device, so you can lower the phone to tap
- 🌍 **English, German, Dutch, French, Spanish, Italian** – follows your Home Assistant language (translations welcome!)
- ☁️ Directions are stored in your Home Assistant user profile and work on every device you log in with

## Installation

### HACS (custom repository)

1. HACS → ⋮ → **Custom repositories**
2. Repository: `https://github.com/onkeloki/point-remote-card`, type **Dashboard**
3. Install **Point Remote Card** and reload the browser / app

### Manual

1. Copy `point-remote-card.js` to `/config/www/point-remote-card.js`
2. Settings → Dashboards → ⋮ → **Resources** → add `/local/point-remote-card.js` as *JavaScript module*

## Configuration

The card has a visual editor. In YAML:

```yaml
type: custom:point-remote-card
name: Couch            # name of the place, shown as title
id: couch              # optional storage id – set it if you want to rename the card later without re-teaching
entities:              # optional – without it, every supported device can be taught
  - light.living_room
  - cover.blind_left
  - media_player.tv
```

Per-device options (YAML only):

```yaml
entities:
  - entity: light.led_strip
    name: LED strip
    colors: ["#ff0000", "#00ff00", [0, 80, 255]]   # own colour swatches
  - entity: cover.blind_left
    positions: [0, 30, 60, 100]                   # own position presets
  - entity: media_player.amplifier
    sources: [TV, Spotify, Radio]                 # only these source buttons (false = none)
```

### Several places, automatically

Each card is one place. Use the built-in visibility conditions to show the right one, e.g. with a room-presence sensor
([Bermuda](https://github.com/agittins/bermuda), ESPresense, …):

```yaml
type: sections
max_columns: 1
sections:
  - type: grid
    cards:
      - type: custom:point-remote-card
        name: Couch
        visibility:
          - condition: state
            entity: sensor.my_phone_area
            state_not: Kitchen
      - type: custom:point-remote-card
        name: Kitchen
        visibility:
          - condition: state
            entity: sensor.my_phone_area
            state: Kitchen
```

## Usage

1. Open the card on your phone and tap **Enable sensors** (iOS asks for motion & orientation access once).
2. Open **Teach devices**, pick a device, point the **top edge** of the phone at it and tap **Point now & save**. Hold still for a second.
3. Repeat for each device.
4. Now just point – the device is recognised and its controls appear.

## Good to know

- Directions are relative to **where you are**. Teach them from the place you'll use; use one card per place.
- Indoor compasses are bent by speakers, radiators and steel, but since you teach and use from the same place, that error is mostly the same both times and cancels out.
- Devices closer together than ~10–15° (seen from your place) are hard to tell apart; the card then says “close call”.
- If the hint says the compass is inaccurate, move the phone in a figure eight.
- **iOS needs https** for the sensor permission (e.g. Nabu Casa or your own TLS). Plain `http://homeassistant.local:8123` will not get sensor access.
- Taught directions are stored per Home Assistant user.
- Built and tuned for iPhone. Android uses the absolute orientation event and should work, but is untested so far – feedback welcome.

## Upgrading from zeig-licht-card 1.x

The card was renamed. `custom:zeig-licht-card` keeps working, and a card without `name`/`id` (or with `id: default`) takes over the directions taught with 1.x.

## How it works

The heading of the phone's top edge is `360° − alpha` and its tilt is `beta` of the
[DeviceOrientation](https://developer.mozilla.org/docs/Web/API/DeviceOrientationEvent) event. On iOS, `alpha` is not north-referenced,
so the card continuously estimates an offset from `webkitCompassHeading`. The device whose stored direction has the smallest
angle to the current aim (max. 18°) is selected.

## License

MIT
