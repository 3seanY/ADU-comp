# Family AI Game Day

This is a React application. The original `aigameapp.py` contained JSX and has been renamed to `aigameapp.jsx` so editors use the correct parser.

## Run

```sh
npm install
npm run dev
```

## Verify the production build

```sh
npm run build
```

## AI video judge

After a match, click **Send to AI Judge**, choose a video, preview it, and click **Analyze Video**. Review the report before applying any proposed score corrections. You can also keep the manually recorded scores or explicitly open the original simulated report. The UAE quiz continues to use its answer review.

Configure the server once:

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY` in `.env` to your own OpenAI API key. Never put it in frontend code or a `VITE_` variable. API usage requires available credits.
3. Run `npm run server` in one terminal and `npm run dev` in another. Restart the server after changing `.env`.

For a built preview, run `npm run build`, then `npm start`, and open `http://127.0.0.1:3001`. Requires Node 22.9+ (the workspace uses Node 24). The server binds to localhost; public hosting needs authentication and per-user rate limits before exposing the paid endpoint.

Supports browser-playable videos up to 200 MB and 10 minutes; MP4 with H.264 or WebM is recommended. The browser samples up to 24 JPEG frames, at most 960 pixels on the longest side, and sends those frames plus the rules, jersey roster, and recorded scores to OpenAI. The original video and audio stay local. The app does not save uploads or reports on disk. `store: false` disables Responses storage; provider data handling still applies.

This is a sparse-frame review, not continuous video analysis. Fast goals, movement, possession, or dance timing may be missed; corrections default to zero when evidence is unclear. The human reviews proposed corrections before applying. No player MVP is inferred from uploaded footage. Camera tracking during play remains a demonstration.

Run `npm test` for request validation, provider-response handling, scoring-report validation, and local API tests. Tests use a stub provider; they do not upload videos or incur API usage.

API implementation follows the [official OpenAI vision guide](https://developers.openai.com/api/docs/guides/images-vision) and [structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs).
