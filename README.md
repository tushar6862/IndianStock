# IndianStock

NIFTY 50 and SENSEX dashboard. The browser never sees the FYERS secret. A server route calls FYERS. The app does not place orders.

## Run on Windows

In PowerShell or Command Prompt:

```bat
cd C:\Users\Planet\Desktop\IndianMarketAnalytics
npm install
npm run dev
```

Open http://localhost:5173

Other commands:

```bat
npm test
npm run lint
npm run build
```

## What you will see

The app starts with **Provider not connected**. Nothing on screen is a live quote until you choose a source.

- **Load sample data** fills both indices with a fixed synthetic session. The badge says sample / simulated.
- **Import CSV or JSON** loads historical candles into the selected index. Expected columns: `time,open,high,low,close,volume`. Volume is optional. Without volume, VWAP stays empty.
- **Login with FYERS** uses the local server. Put the app id and secret in `.env` (see `.env.example`). In the FYERS app dashboard, set the redirect URL to exactly `http://127.0.0.1:5173/api/fyers/callback`. After login, NIFTY and SENSEX candles come from FYERS. The secret is not sent to the browser.

NIFTY 50 and SENSEX spot indices do not have their own traded volume. Sample mode adds a labelled volume stand-in only so the VWAP formula can be demonstrated.

The direction panel is an indicator score. It is not a trained model. Percentages, when shown, are heuristic estimates. The setup panel shows reference levels only, and only after its checklist passes.

## Deploy on Vercel

Import this GitHub repo in Vercel. Framework is Vite. The build command and output folder are already in `vercel.json`.

After the first deploy, open the site URL Vercel gives you. In the FYERS app dashboard, set the redirect URL to:

`https://YOUR-VERCEL-DOMAIN/api/fyers/callback`

In the Vercel project, open Settings → Environment Variables and add:

| Name | Value |
| --- | --- |
| `FYERS_APP_ID` | App id from the FYERS dashboard |
| `FYERS_SECRET` | App secret from the FYERS dashboard |
| `FYERS_REDIRECT_URI` | The same `https://YOUR-VERCEL-DOMAIN/api/fyers/callback` |

Redeploy once after saving the variables. Then open the site and use **Login with FYERS**. Each browser keeps its own login. Do not commit `.env` or the secret.

## Tests

Unit tests cover EMA, RSI, VWAP, Supertrend, the score classifier, and candle parsing.
