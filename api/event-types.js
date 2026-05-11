import { callCal, sendJSON, fail } from './_cal.js';

// GET /api/event-types
// Returns the authenticated user's Cal.com event types so the frontend
// can map its service slugs → numeric IDs.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }
  try {
    const data = await callCal('/event-types', { version: '2024-06-14' });
    // Defensive normalization — Cal.com has shipped two shapes here.
    const rawList = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.data?.eventTypeGroups)
        ? data.data.eventTypeGroups.flatMap(g => g.eventTypes || [])
        : [];
    const eventTypes = rawList.map(et => ({
      id: et.id,
      slug: et.slug,
      title: et.title,
      lengthInMinutes: et.lengthInMinutes ?? et.length,
      price: et.price,
      currency: et.currency,
    }));
    sendJSON(res, 200, { eventTypes });
  } catch (err) {
    fail(res, err);
  }
}
