# Great Range Picker (Wappler App Connect)

**Date range picker** for Wappler projects: preset sidebar, dual calendar, full-width trigger, and popover portaled to `document.body` so it is not clipped inside modals or overflow panels.

[![License: Mr Cheese Extension v1.0](https://img.shields.io/badge/License-Mr%20Cheese%20Extension%20v1.0-blue.svg)](https://www.mrcheese.co.uk/extension-license)
![Wappler](https://img.shields.io/badge/Wappler-App%20Connect-teal)
![Version](https://img.shields.io/badge/version-1%2E1%2E0-green)

Built by **[Mr Cheese](https://www.mrcheese.co.uk)** · Wappler extensions

---

## What it does

| Feature | Description |
|---------|-------------|
| **Presets** | Today, Last 7/28/30 days, Next 7/30/90 days, This month, Last month, Year to date, Last year, Custom |
| **Default date range** | Wappler property (or `default-preset` attribute) sets the initial filter on page load |
| **Color scheme** | `dark`, `light`, or `auto` (follows system `prefers-color-scheme`); light theme isolated on dark host pages |
| **Display format** | Trigger dates as `DD/MM/YYYY`, `DD-MM-YYYY`, etc. (native Start/End inputs stay browser-controlled) |
| **Blocked dates** | Bind unavailable days; disabled in the calendar; Apply blocked if the range spans a blocked day |
| **Dual calendar** | Two months, range highlight, Escape to close |
| **Modal-safe** | Popover moves to `document.body`; centres inside Bootstrap modal dialogs |
| **Wappler-native** | `dmx-great-range-picker` with `data.dateFrom` / `data.dateTo` / `data.preset` bindings |

---

## Requirements

- Wappler **Node.js** project with **App Connect**
- **Font Awesome** on the layout (chevron icons on trigger and month nav)
- Bootstrap 5 theme (component uses `btn`, `btn-primary`, `btn-link`)

---

## Installation

Official Wappler guide: [How To Install Custom Wappler Extensions](https://docs.wappler.io/t/how-to-install-custom-wappler-extensions/49982/).

| Path | |
|------|--|
| **npm** | Wappler Project Settings → Extensions (`wappler-great-range-picker`) |
| **Git** | [Extension Installer](https://www.mrcheese.co.uk/extensions/install) or manual copy below |

Git manual copy installs into `extensions/` and `public/`.

### Git install — Extension Installer (recommended)

This repo ships **`wappler-install.json`**. Use the [Mr Cheese Extension Installer](https://www.mrcheese.co.uk/extensions/install), select **Great Range Picker**, choose **App Connect**, and run the generated script in your project folder.

### Manual install (Git)

Run from your **Wappler project root**; skip `git clone` if you already cloned this repo alongside your project:

```bash
git clone https://github.com/MrCheeseGit/greatRangePicker.git ../greatRangePicker

cp ../greatRangePicker/app_connect/components.hjson extensions/app_connect/components/great_range_picker_components.hjson
cp ../greatRangePicker/includes/dmx-great-range-picker.js public/js/
cp ../greatRangePicker/includes/dmx-great-range-picker.css public/css/
```

**Quit Wappler completely** and reopen your project.

### npm install (Wappler Project Settings)

1. **Wappler** → Project Settings → Extensions → Add → `wappler-great-range-picker`
2. From your project root: `npm install`
3. Run **Project Updater → Update** when prompted.
4. **Quit Wappler completely** and reopen your project.

#### Local `file:` development (optional)

```json
"devDependencies": {
  "wappler-great-range-picker": "file:../path/to/this-extension"
}
```

After you change extension source, run `npm install` again, then Project Updater if needed, and restart Wappler.

---

## Usage

### App Connect component

Set **Default date range** in the component panel (or `default-preset` on the tag). Options include Today, Last 30 days, Next 30 days, Year to date, and more. Leave **Start date** / **End date** empty to use the preset; explicit dates override it.

Set **Color scheme** to `dark`, `light`, or `auto`.

Set **Display format** for the trigger summary (e.g. `DD/MM/YYYY`). **Start date** / **End date** inside the popover remain native `<input type="date">` fields; their appearance follows the visitor's browser and locale, not this format.

Bind **Blocked dates** when filtering bookings or events (comma-separated `YYYY-MM-DD` or a JSON array from your query). Those days cannot be selected; **Apply** is rejected if the chosen range includes an unavailable day.

```html
<dmx-great-range-picker
  id="reportRange"
  default-preset="last30"
  display-format="DD/MM/YYYY"
  color-scheme="dark"
  timezone="Europe/Lisbon"
  locale="en-GB"
  placement="modal"
  dmx-bind:blocked-dates="bookedDays.data.dates"
  dmx-on:changed="runReport(reportRange.data.dateFrom, reportRange.data.dateTo)"
></dmx-great-range-picker>
```

**Data bindings:** `{{reportRange.data.dateFrom}}`, `{{reportRange.data.dateTo}}`, `{{reportRange.data.preset}}`

**Methods:** `reportRange.getValue()`, `reportRange.setValue({ dateFrom, dateTo, preset })`, `reportRange.close()`

**Component properties (summary)**

| Property | Attribute | Notes |
|----------|-----------|--------|
| Default date range | `default-preset` | Initial preset when Start/End date are empty |
| Display format | `display-format` | Trigger only: `locale`, `DD/MM/YYYY`, `DD-MM-YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD` |
| Blocked dates | `blocked-dates` | Unavailable `YYYY-MM-DD` values (comma-separated or JSON array) |
| Color scheme | `color-scheme` | `dark`, `light`, or `auto` |
| Timezone | `timezone` | IANA zone for Today and preset boundaries (e.g. `Europe/Lisbon`) |
| Locale | `locale` | Intl formatting for trigger and month titles |
| Popover placement | `placement` | `modal` (centre in dialog) or `trigger` (below button) |

See [examples/report-filter-modal-snippet.html](examples/report-filter-modal-snippet.html) for a modal filter row.

### Imperative API (vanilla / custom JS)

```javascript
var picker = window.GREAT_RANGE_PICKER.mount(document.getElementById('range-host'), {
  preset: 'next30',
  displayFormat: 'DD/MM/YYYY',
  blockedDates: ['2026-12-25', '2026-12-26'],
  colorScheme: 'light',
  timezone: 'Europe/Lisbon',
  locale: 'en-GB',
  onChange: function (v) { console.log(v.dateFrom, v.dateTo, v.preset); }
});
// picker.setBlockedDates(updatedArray) when your query reloads
// picker.destroy() when removing the host (e.g. modal close)
```

Pass `preset` or `defaultPreset` when `dateFrom` / `dateTo` are omitted to seed the initial range.

### Display format (trigger only)

**Display format** controls the text on the trigger button (and the formatted summary in `formatRangeSummary`). Values are always stored and emitted as **`YYYY-MM-DD`** for Server Connect and bindings.

The **Start date** / **End date** fields in the popover are native date inputs. Browsers format those controls using locale; the extension does not override them. Use **Locale** plus **Display format → Locale default** if you want Intl-style trigger text (e.g. `24 Aug 2026`).

### Blocked dates (bookings / events)

Use **Blocked dates** for simple availability: pass dates that already have an event or booking. Typical pattern:

1. Server Connect query returns distinct booked dates for one property (or filtered set).
2. Bind `dmx-bind:blocked-dates="{{query.data.dates}}"` (array of `YYYY-MM-DD` strings) or a comma-separated string.
3. When the user changes filters, the binding updates and the calendar re-renders.

**Validation (v1.1):** blocked days are not clickable. **Apply** fails with an inline message if the range would include a blocked day between start and end. This extension does not enforce minimum stay, check-in/out weekdays, or cross-property rules; keep that logic in your API if needed.

---

## Theming

**Color scheme** applies theme classes to the trigger and the body-portaled popover so both match. On a dark host page, choose **Light** for a self-contained light panel; the extension resets Bootstrap tokens and `color-scheme` inside the picker so site-wide dark form rules do not bleed in.

Override tokens per theme via CSS custom properties:

| Variable | Purpose |
|----------|---------|
| `--gr-field-border` | Trigger and input borders |
| `--gr-field-bg` | Trigger background |
| `--gr-copy` / `--gr-copy-muted` | Text colours |
| `--c-primary` / `--c-primary-dim` | Accent and range highlight |
| `--gr-panel-bg` | Popover background |

---

## Compatibility

Standalone App Connect extension. For shared Wappler install patterns and optional extension pairs, see [Mr Cheese extension docs](https://github.com/MrCheeseGit/Wappler-Extension-Docs/blob/main/extension-compatibility.md).

---

## License

Mr Cheese Extension License v1.0 — see [LICENSE](LICENSE).
