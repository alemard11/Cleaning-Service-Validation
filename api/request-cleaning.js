function clean(value, max = 240) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, max);
}

function whatsappAddress(value) {
  const normalized = clean(value, 60).replace(/^whatsapp:/i, '');
  return `whatsapp:${normalized}`;
}

function missingConfig() {
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_WHATSAPP_FROM',
    'ALERT_WHATSAPP_TO',
  ];
  return required.filter((key) => !process.env[key]);
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  // Handy deployment/health check: visit /api/request-cleaning in a browser.
  if (req.method === 'GET') {
    const missing = missingConfig();
    return sendJson(res, 200, {
      ok: true,
      service: 'HomeEase WhatsApp notification API',
      configured: missing.length === 0,
      missing: missing.length ? missing : undefined,
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  try {
    let body = req.body ?? {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return sendJson(res, 400, { error: 'Invalid JSON body' });
      }
    }

    // Honeypot: automated bots often populate hidden inputs.
    if (body.website) return sendJson(res, 200, { ok: true });

    const lead = {
      name: clean(body.name, 80),
      whatsapp: clean(body.whatsapp, 40),
      email: clean(body.email, 120),
      parish: clean(body.parish, 60),
      property: clean(body.property, 100),
      service: clean(body.service, 100),
      frequency: clean(body.frequency, 60),
      preferred_date: clean(body.preferred_date, 30),
      bedrooms: clean(body.bedrooms, 30),
      bathrooms: clean(body.bathrooms, 30),
      notes: clean(body.notes, 500),
    };

    if (
      !lead.name ||
      !lead.whatsapp ||
      !lead.parish ||
      !lead.property ||
      !lead.service ||
      !lead.frequency
    ) {
      return sendJson(res, 400, { error: 'Missing required fields' });
    }

    const missing = missingConfig();
    if (missing.length) {
      console.error('Missing environment variables:', missing.join(', '));
      return sendJson(res, 500, {
        error: 'WhatsApp messaging is not configured',
        missing,
      });
    }

    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_FROM,
      ALERT_WHATSAPP_TO,
      TWILIO_CONTENT_SID,
    } = process.env;

    const messageText = [
      '🧽 New HomeEase cleaning request',
      `Name: ${lead.name}`,
      `Customer WhatsApp: ${lead.whatsapp}`,
      lead.email ? `Email: ${lead.email}` : null,
      `Area: ${lead.parish}`,
      `Property: ${lead.property}`,
      `Service: ${lead.service}`,
      `Frequency: ${lead.frequency}`,
      lead.preferred_date ? `Preferred date: ${lead.preferred_date}` : null,
      lead.bedrooms ? `Bedrooms: ${lead.bedrooms}` : null,
      lead.bathrooms ? `Bathrooms: ${lead.bathrooms}` : null,
      lead.notes ? `Notes: ${lead.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const params = new URLSearchParams();
    params.set('From', whatsappAddress(TWILIO_WHATSAPP_FROM));
    params.set('To', whatsappAddress(ALERT_WHATSAPP_TO));

    if (TWILIO_CONTENT_SID) {
      params.set('ContentSid', clean(TWILIO_CONTENT_SID, 80));
      params.set(
        'ContentVariables',
        JSON.stringify({
          1: lead.name,
          2: lead.whatsapp,
          3: lead.parish,
          4: lead.property,
          5: lead.service,
          6: lead.frequency,
          7: lead.preferred_date || 'Not specified',
          8: lead.notes || 'None',
        })
      );
    } else {
      params.set('Body', messageText);
    }

    const credentials = Buffer.from(
      `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
    ).toString('base64');

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
        TWILIO_ACCOUNT_SID
      )}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: params.toString(),
      }
    );

    const result = await twilioResponse.json().catch(() => ({}));

    if (!twilioResponse.ok) {
      const twilioMessage = result.message || `Twilio error ${twilioResponse.status}`;
      console.error('Twilio rejected message:', result);
      return sendJson(res, 502, {
        error: twilioMessage,
        code: result.code,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      messageSid: result.sid,
    });
  } catch (error) {
    console.error('WhatsApp notification failed:', error);
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Could not send notification',
    });
  }
}
