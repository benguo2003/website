# benguo.tech

Ben Guo's personal website — a single-page React portfolio with an interactive starfield.

## Features

- **Starfield** — drifting, connected stars; click anywhere to create more.
- **Black hole easter egg** — after enough clicks, an *Interstellar*-style black hole appears, ray-traced in real time with WebGL2 (gravitational lensing, photon ring, Doppler beaming). Clicking it opens [Space Explorer](https://space-explorer-bay.vercel.app/).
- **Custom cursor** — a sparkle cursor with hover states for links and the black hole.
- **Responsive** — layout adapts to desktop, tablet, and phone screens; nothing overlaps the page text.

## Development

The app lives in [`ben-personal-website/`](ben-personal-website/) (Create React App, React 18).

```bash
cd ben-personal-website
npm install
npm start            # dev server on http://localhost:3000
```

## Deploy

Hosted on GitHub Pages at [benguo.tech](https://www.benguo.tech).

```bash
cd ben-personal-website
npm run build && npm run deploy   # deploy publishes build/ to the gh-pages branch
```
