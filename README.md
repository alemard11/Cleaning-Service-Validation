# HomeEase JA — Concierge MVP

Mobile-first Material 3 landing page for validating a Jamaica cleaning service, plus a Vercel serverless API that sends each new cleaning request to WhatsApp through Twilio.

## Repository structure

```text
homeease-ja/
├── index.html
├── api/
│   └── request-cleaning.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Deploy with GitHub + Vercel

1. Create a new GitHub repository (for example `homeease-ja`).
2. Upload **all files and folders in this repository root**. Do not upload only `index.html`.
3. In Vercel, choose **Add New → Project** and import the GitHub repository.
4. Framework preset: **Other** is fine. Leave Build Command and Output Directory blank.
5. Deploy once.
6. In Vercel, open **Project → Settings → Environment Variables** and add the variables shown in `.env.example` with your real values.
7. Redeploy after changing environment variables.

## Check that the backend deployed

Open:

```text
https://YOUR-PROJECT.vercel.app/api/request-cleaning
```

Before variables are configured, it should return something like:

```json
{
  "ok": true,
  "service": "HomeEase WhatsApp notification API",
  "configured": false,
  "missing": ["TWILIO_ACCOUNT_SID"]
}
```

After all required variables are configured, `configured` should be `true`.

## Twilio WhatsApp Sandbox setup

For the concierge prototype:

1. Sign in to Twilio and open the WhatsApp Sandbox / Try WhatsApp experience.
2. From the WhatsApp number that should receive alerts, follow Twilio's displayed join instruction (QR or `join ...` message).
3. Copy your Account SID and Auth Token into Vercel environment variables.
4. Set `TWILIO_WHATSAPP_FROM` to Twilio's Sandbox WhatsApp sender.
5. Set `ALERT_WHATSAPP_TO` to the WhatsApp number that joined the Sandbox.

For production/business-initiated messages, use an approved WhatsApp sender/template and set `TWILIO_CONTENT_SID` when applicable.

## Required Vercel environment variables

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM
ALERT_WHATSAPP_TO
```

Optional:

```text
TWILIO_CONTENT_SID
```

Never put your Twilio Auth Token in `index.html`, `.env.example`, or GitHub.

## Test a cleaning request

1. Open the deployed website.
2. Complete the **Request a cleaning** form.
3. Submit it.
4. The browser posts JSON to `/api/request-cleaning`.
5. The Vercel function sends the request to Twilio.
6. Twilio sends the alert to the configured WhatsApp recipient.

If the form fails, check:

- Vercel → Project → Logs / Functions logs.
- The browser's DevTools → Network → `request-cleaning` response.
- `/api/request-cleaning` health response.
- Whether the recipient joined Twilio's WhatsApp Sandbox.

## Local preview

You can open `index.html` directly to review the design. When opened via `file://`, the form runs in demo mode and stores submissions in browser `localStorage` instead of calling the API.

To test the real serverless API, deploy to Vercel or use Vercel's local development tooling.

## Working brand

`HomeEase JA` is a placeholder/working brand for validation. Do a Jamaican business-name, trademark, domain, and social-handle check before using it as the final brand.
