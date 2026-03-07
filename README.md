# Angular Highlight

A Chrome extension that highlights Angular components when change detection runs — just like React DevTools' "Highlight updates when components render".

![Angular Highlight Demo](https://raw.githubusercontent.com/ksakae1216/angular-highlight/main/icons/icon128.png)

## Features

- **Real-time visualization** — Components flash green whenever Angular's change detection runs
- **Zone.js support** — Works with Angular v2+ apps using Zone.js (Angular 2–18)
- **Zoneless / Signals support** — Works with Angular v16+ Signals and Zoneless apps (v18+)
- **Performance-safe** — Throttled to avoid impacting the page itself
- **One-click toggle** — Enable or disable from the popup

## How It Works

| Angular mode | Detection method |
|---|---|
| Zone.js (v2–v18) | Patches `Zone.prototype.runTask` to catch when Angular's zone completes a task |
| Zoneless / Signals (v16+) | Uses `MutationObserver` to detect DOM changes and traces back to the nearest Angular component |

Angular Ivy (v9+) marks every component host element with `__ngContext__`, which is used to identify component boundaries.

## Installation

### From Chrome Web Store

> Coming soon

### Load unpacked (for development)

1. Clone this repository
   ```bash
   git clone https://github.com/ksakae1216/angular-highlight.git
   ```
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the cloned folder

## Usage

1. Open any Angular app (e.g., [material.angular.dev](https://material.angular.dev))
2. Click the Angular Highlight icon in the toolbar
3. Toggle **ON** — green borders will flash on components as they re-render
4. Toggle **OFF** to stop highlighting

## Compatibility

| Angular version | Zone.js | Signals | Status |
|---|---|---|---|
| v2 – v15 | ✅ | — | ✅ Supported |
| v16 – v17 | ✅ | ✅ (hybrid) | ✅ Supported |
| v18+ (Zoneless) | — | ✅ | ✅ Supported |

> **Note:** Component detection relies on `__ngContext__`, which is present in both development and production builds with Angular Ivy (v9+).

## License

MIT
