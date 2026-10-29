# Family AI Game Day

This is a React application with a Node.js video-scoring backend. Use Node 24. The original `aigameapp.py` contained JSX and was renamed to `aigameapp.jsx`.

## Run

```sh
npm install
npm run dev
```

`npm run dev` starts both the private AI server on port 3001 and the frontend on port 5173. If either port is occupied, stop the previous preview first. No Python installation is needed.

## Build and checks

```sh
npm run build
npm test
```

## AI video judge

After a match, click **Send to AI Judge**, choose a video, and click **Analyze & Report Scores**. The website uploads the video to the local Node server, which sends it to Gemini's Files API, waits for video processing, requests a structured scoring report, validates the response, and returns it to the website.

The website shows the observed score, confidence, timestamped scoring evidence, and limitations. A complete, high-confidence result with supporting evidence pre-fills the final scoreboard. Review it and click **Confirm & Show Results**. AI values are final totals, never bonuses added to the old scoreboard. Partial or unclear clips require manual confirmation; unknown scores are shown as unknown rather than zero.

You can edit both final scores, restore your recorded scoreboard, or finish without any AI service. Results show the exact confirmed scores, winner, roster, and score source. If you override the AI, its report is kept as reference and does not replace your scores. Timed games use seconds and the lower completion time wins. Score unit and winning direction can be configured in Game Settings.

The canned AI report, arbitrary score bonuses, invented possession statistics, and automatic MVP selection have been removed. The UAE heritage quiz still calculates its scores from submitted answers.

Configure the server once:

1. Copy `.env.example` to `.env`.
2. Set `GEMINI_API_KEY` in `.env` to a Gemini API key from [Google AI Studio](https://aistudio.google.com/api-keys). This replaces the earlier OpenAI still-frame review; an OpenAI key will not enable native video scoring. Provider access and quota are required.
3. Run `npm run dev`. Restart it after changing `.env`. The judge screen reports whether the service is configured.
4. Optionally set `GEMINI_MODEL` to a video-capable model available to your account. The default is `gemini-3.8-flash`.

Never put the API key in frontend code, a `VITE_` variable, or a committed file. `.env` is git-ignored. The app never prints the key or sends it to the browser. If no key is configured, video scoring is unavailable and manual scoring still works; it does not generate demonstration results.

For a built preview, run `npm run build`, then `npm start`, and open `http://127.0.0.1:3001`. `npm run server` can also run the API separately. The server binds to localhost, limits uploads to one active analysis at a time, and rejects unrelated origins. Public hosting needs authentication and per-user rate limits before exposing the paid endpoint.

Supports playable videos up to 200 MB and 10 minutes; MP4 with H.264 or WebM is recommended. Preview stays local until **Analyze** is clicked. Analysis sends the complete uploaded file, including audio, plus the rules, player jersey roster, and recorded scores to Google Gemini. Uploads are held temporarily in server memory, not written to disk. The provider file is deleted after analysis, errors, or cancellation when its file identifier is known. If cleanup cannot be confirmed, a warning appears on successful reports and in server logs; provider retention and data-use policies still apply.

AI scoring is not guaranteed to be correct. The provider samples video frames, so fast goals, occlusions, cuts, or unclear jersey colors can prevent a reliable result. Record the full match with scoring targets and both teams visible. A final scoreboard visible in the recording can help. Dance ratings need an explicit rubric in the scoring rules. Unclear clips, missing evidence, invalid output, quota failures, and timeouts never produce fabricated results. Human-entered scores remain available. The play screen is a timer and manual scoreboard, not a camera recorder or live tracker.

`npm test` checks video-byte transfer through the website API, provider processing and cleanup, invalid/uncertain outputs, manual overrides, zero and fractional scores, timed winners, and rendered result screens. Provider calls are stubbed: the tests make no external API requests and do not establish real-world scoring accuracy. A live Gemini key and recorded match are needed for live model validation.

Implementation follows Google's [video understanding guide](https://ai.google.dev/gemini-api/docs/video-understanding) and [structured output guide](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
