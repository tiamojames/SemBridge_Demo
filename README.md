# SemBridge Demo

Static research demo for SemBridge. Open `index.html` directly in a browser, or
serve this repository with GitHub Pages. No runtime build, remote fonts, analytics,
or CDN scripts are required.

- Paper: https://arxiv.org/pdf/2608.07462
- Code: https://github.com/ASLP-lab/SemBridge
- Model release: https://huggingface.co/ASLP-lab/SemBridge

## Editing

- `index.html`: transcripts, audio paths, architecture, and publication links.
- `css/custom.css`: responsive layout and reduced-motion styles.
- `js/audio.js`: waveform players and the shared playback dock.
- `js/site.js`: tabs, navigation, figure dialog, and scroll reveals.
- `asset/sembridge.png`: the original model architecture figure.

The page preserves 37 examples and their 74 original prompt/output WAVs.
Featured players reuse these assets. Only one audio plays at a time; playback
starts on user interaction. Native audio controls remain available without JS.

After replacing or adding PCM WAVs, rebuild the duration and waveform data:

```sh
python3 scripts/build_audio_data.py
```

`js/audio-data.js` includes source SHA-256 hashes and normalized peak envelopes;
it never changes the WAV files. Waveforms are precomputed to avoid downloading
every audio file on page load. Featured audio mappings are in `js/site.js`.

`js/icons.js` contains only the Lucide icons used on this page. The source is
`scripts/icons-entry.js`; the upstream license is `js/LUCIDE-LICENSE`.
To rebuild icons with Node.js and npm:

```sh
npm install --no-save --package-lock=false lucide@1.55.0 esbuild@0.28.2
npx esbuild scripts/icons-entry.js --bundle --minify --format=iife --outfile=js/icons.js
```

The chapter navigation and scroll-reveal presentation were inspired by the
[Jarvis research page](https://jensenyx.github.io/Jarvis.github.io/).
