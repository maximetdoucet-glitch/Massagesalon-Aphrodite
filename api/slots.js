import { callCal, sendJSON, fail } from './_cal.js';

// GET /api/slots?eventTypeId=123&startTime=2026-05-12T00:00:00.000Z&endTime=2026-05-12T23:59:59.999Z&timeZone=Europe/Amsterdam
//
// Returns an array of ISO-8601 slot start times available for booking
// on the given day. The frontend overlays these on the SHOP_HOURS grid
// to mark each slot as available or taken.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const eventTypeId = url.searchParams.get('eventTypeId');
    const startTime = url.searchParams.get('startTime');
    const endTime = url.searchParams.get('endTime');
    const timeZone = url.searchParams.get('timeZone') || 'Europe/Amsterdam';

    if (!eventTypeId || !startTime || !endTime) {
      return sendJSON(res, 400, { error: 'eventTypeId, startTime, endTime are required' });
    }

    const qs = new URLSearchParams({ eventTypeId, start: startTime, end: endTime, timeZone });
    const data = await callCal(`/slots?${qs}`, { version: '2024-09-04' });

    // Cal.com returns either an object keyed by date → array of { start } or a flat array.
    let slots = [];
    if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      slots = Object.values(data.data).flat();
    } else if (Array.isArray(data?.data)) {
      slots = data.data;
    } else if (Array.isArray(data?.slots)) {
      slots = data.slots;
    }

    const starts = slots
      .map(s => (typeof s === 'string' ? s : s.start || s.time || null))
      .filter(Boolean);

    sendJSON(res, 200, { slots: starts });
  } catch (err) {
    fail(res, err);
  }
}
