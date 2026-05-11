import { callCal, sendJSON, fail } from './_cal.js';

// POST /api/bookings
// Body shape (from the frontend modal):
// {
//   start: "2026-05-12T10:00:00.000Z",
//   eventTypeId: 123,
//   responses: { name, email, phone, notes },
//   metadata: { source, service, duration },
//   timeZone: "Europe/Amsterdam",
//   language: "nl"
// }
//
// Translates into Cal.com v2's bookings shape and forwards.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }
  try {
    // Vercel parses JSON bodies automatically when Content-Type is application/json,
    // but fall back to streaming-read for safety.
    let body = req.body;
    if (!body || typeof body !== 'object') {
      const raw = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', c => (data += c));
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });
      body = raw ? JSON.parse(raw) : {};
    }

    const { start, eventTypeId, responses = {}, metadata = {}, timeZone, language } = body;
    if (!start || !eventTypeId || !responses.name || !responses.email) {
      return sendJSON(res, 400, { error: 'start, eventTypeId, responses.name and responses.email are required' });
    }

    const payload = {
      start,
      eventTypeId: Number(eventTypeId),
      attendee: {
        name: responses.name,
        email: responses.email,
        timeZone: timeZone || 'Europe/Amsterdam',
        language: language || 'nl',
        ...(responses.phone ? { phoneNumber: responses.phone } : {}),
      },
      bookingFieldsResponses: {
        ...(responses.notes ? { notes: responses.notes } : {}),
        ...(responses.phone ? { phone: responses.phone } : {}),
      },
      metadata: {
        source: 'massagesalonaphrodite.nl',
        ...metadata,
      },
    };

    const data = await callCal('/bookings', {
      method: 'POST',
      version: '2024-08-13',
      body: payload,
    });

    const booking = data?.data || data;
    sendJSON(res, 200, { ok: true, booking });
  } catch (err) {
    fail(res, err);
  }
}
