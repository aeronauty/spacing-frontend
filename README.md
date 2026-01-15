# SSP: Position-Based Mesh Spacing Editor

An interactive implementation of Mark Drela's SSP algorithm for generating non-uniform 1D point distributions. If you've ever needed to cluster mesh points near boundaries (and let's be honest, if you're doing CFD, you have), this is the tool.

## What This Actually Does

Traditional mesh spacing functions define Δs as a function of point *index* — which is fine until you want to cluster points at a specific *location* on your geometry. SSP flips this around: you specify spacing as a function of position itself.

Here's the thing: instead of saying "I want fine spacing at point 5", you say "I want fine spacing at s = 0.1". Much more intuitive when you're trying to resolve a leading edge or a shock.

## Running It

```bash
cd ssp-editor
npm install
npm run dev
```

Opens at http://localhost:5173/. That's it.

## How to Use

The plot shows your spacing function F(s) — drag the knots around to shape it. Low F values mean fine spacing (points cluster together), high F values mean coarse spacing (points spread out).

**Controls:**
- **Drag knots** — adjust the spacing function (green endpoints only move vertically)
- **Click on plot** — add a new control knot
- **Shift+click or right-click a knot** — remove it
- **+/− buttons** (or keyboard) — change number of output points

The orange dots along the bottom show your actual output point distribution. They update in real-time as you drag things around.

## The Maths (for those who care)

This implements equations 9-17 from Mark's document. The short version:

1. Define F(s) as piecewise-linear through your control knots (Sⱼ, Fⱼ)
2. Compute parametric positions Tⱼ by integrating 1/F(s)
3. Rescale so T goes from 0 to 1
4. For each uniform tᵢ, solve back for sᵢ

The clever bit is handling the case where Fⱼ ≈ Fⱼ₊₁ (nearly constant spacing). The naive formula gives you 0/0, so there's an asymptotic expansion that kicks in when |ε| < 0.001. Standard numerical analysis stuff, but easy to forget.

## Data I/O

- **Export JSON** — saves your knots and n to a file
- **Copy Config** — copies knot data to clipboard (space-separated, easy to paste into scripts)
- **Copy sᵢ** — copies the actual output points
- **Import** — load from JSON or paste text

## File Structure

```
src/
├── lib/ssp.ts         # The actual algorithm (no UI dependencies)
├── hooks/useSSP.ts    # React state management
├── components/
│   ├── SSPPlot.tsx    # SVG plot with axes/grid
│   ├── DraggableKnot.tsx
│   ├── OutputPoints.tsx
│   └── ControlPanel.tsx
└── types.ts
```

The math is isolated in `ssp.ts` — if you want to use this in a non-React context (or integrate it into something else), just grab that file.

## Why React/Vite?

Honestly, this could've been vanilla JS. But React's declarative approach makes the drag-and-drop state management much cleaner, and Vite means I don't have to think about bundlers. Life's too short for webpack config.

## Deployment

This project is configured to automatically deploy to GitHub Pages. Every push to the `main` branch will trigger a build and deployment.

**To enable GitHub Pages:**
1. Go to your repository Settings → Pages
2. Under "Build and deployment", set Source to "GitHub Actions"
3. Push to `main` branch — the site will be live at `https://[username].github.io/ssp-editor/`

The workflow can also be triggered manually from the Actions tab.

## Credit

Algorithm by Mark Drela (MIT). Implementation by me after drinks at the The Pub.
