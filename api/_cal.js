// Shared Cal.com v2 client. Keeps Bearer auth + cal-api-version header
// in one place so each route handler stays small.
//
// CALCOM_API_KEY must be set as a Vercel env var; never inlined in frontend.

const BASE = 'https://api.cal.com/v2';

export async function callCal(path, { method = 'GET', version, body } = {}) {
  const apiKey = process.env.CALCOM_API_KEY;
  if (!apiKey) {
    const err = new Error('CALCOM_API_KEY is not configured on the server');
    err.statusCode = 500;
    throw err;
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'cal-api-version': version,
    'Content-Type': 'application/json',
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data?.error?.message || data?.message || `Cal.com ${res.status}`);
    err.statusCode = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export function sendJSON(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function fail(res, err) {
  const status = err.statusCode || 500;
  const body = { error: err.message || 'Unknown error' };
  if (err.body) body.details = err.body;
  sendJSON(res, status, body);
}
