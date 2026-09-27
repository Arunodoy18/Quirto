# Design system — "Graphite console"

A dark transportation control-room look: neutral charcoal, hairlines, one accent. Everything is defined once in `src/styles/tokens.css`; primitives live in `src/styles/base.css`.

## Principles

1. **One accent.** Signal amber (`--accent`) marks actions and selection only: primary buttons, the active tab, selected chips, the convergence line, the tracked vehicle, the destination pin.
2. **Map colours are semantic.** Road states use the road tokens; the optimized route is off-white so it never reads as a traffic colour.
3. **Neutral surfaces.** Greys with no blue tint. No gradients, glow, glassmorphism, or coloured left-border cards.
4. **Honest labels.** Demo, simulated and fixture values are always marked.
5. **Motion explains state.** Camera moves, route drawing, traffic build-up, incident pulses, probability changes. No decorative particles or bouncing.

## Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#111214` | page |
| `--panel` | `#17181b` | panels |
| `--field` | `#1d1f23` | inputs, tiles |
| `--line` | `#2a2c31` | borders |
| `--text` / `--muted` | `#e6e6e3` / `#898b90` | text (muted ≥ 4.5:1 on panel) |
| `--accent` | `#d99a2b` | actions & selection |
| `--ok` · `--warn` · `--danger` | `#5dae7b` · `#c9a23c` · `#d0493f` | status |
| `--road-free … --road-closed` | green → yellow → orange → red → grey | road states (also differ in lightness) |
| `--route-primary` · `--route-alt` · `--route-rejected` | `#f0eee8` · `#8e9096` · `#55575d` | route hierarchy |
| `--algo-*` | grey, light grey, steel blue, lavender, amber | algorithm series |

## Type

- **IBM Plex Sans** — all UI text. Panel titles 13 px/600, labels 12 px/500 muted, body 12.5–13 px.
- **IBM Plex Mono** — numbers, status values (`CONVERGED`, `LOW`), ids, endpoints. Tabular numerals.
- Sentence case everywhere. No letter-spaced all-caps labels.

## Primitives (`base.css`)

`.panel` · `.panel-head` · `.panel-title` · `.panel-meta` · `.field` · `.chip[aria-pressed]` · `.btn` · `.btn-ghost` · `.btn-danger` · `.seg` (segmented control) · `.stat` · `.overlay` (on the map) · `table.data` · `pre.code` · `.empty`

Selection state is expressed with `aria-pressed` / `aria-current`, so styles and accessibility stay in sync.

## Layout

- Desktop-first, min width 1280 px. Screens are CSS grids filling the viewport under a 76 px rail and 52 px top bar, 12 px gaps.
- Map overlays sit at `z-index: 30` above Drei `Html` labels (`zIndexRange [20, 0]`).
