# cat

A cat lives in a phone. She runs around all day. Tap her to pat her.

Everything is one static page: no build step, no dependencies, no assets. The cat is
inline SVG, the room is CSS, and her little mind is ~250 lines of vanilla JavaScript.

## run it

```sh
npm start
# cat is in the phone at http://localhost:8000
```

Or just open `index.html` in a browser.

## what she does

- **lives in the phone** — a phone mockup holds a tiny warm room: window, fish picture,
  shelf, clock, plant, rug, box, yarn.
- **always** — she never leaves. She wakes up where she was, and the pat counter is
  remembered in `localStorage`, even after a refresh.
- **runs around** — she picks spots on the floor, trots between them, darts across the
  room every 10–25 seconds, and stops to sniff now and then. Her gait speed matches how
  fast she is going, and she gets slightly bigger when she is closer to the camera.
- **tap to pat** — tap/click her (or focus her and press Enter/Space). She squishes,
  closes her eyes, hearts float up, the pat counter goes up, and every third pat she
  says something. She stops for a moment to enjoy it, then gets back to running.

On screens narrower than 620px the mockup drops away and the room fills the real phone
screen, so the cat is literally in your phone.

## files

| file | what |
| --- | --- |
| `index.html` | markup: phone, room, cat SVG |
| `styles.css` | room, cat coat, walk/hop/tail animations, responsive layout |
| `cat.js` | wandering, zoomies, patting, hearts, clock, persistence |
| `server.js` | 40-line static server so `npm start` works with no installs |
