const BASE = '/api';

function getToken() {
  return localStorage.getItem('sst_admin_token');
}

async function request(path, { method = 'GET', body, auth = false, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 204) return null;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.blob();

  if (!res.ok) {
    const message = isJson ? data?.error || 'Error inesperado' : 'Error inesperado';
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function downloadWithAuth(path) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    let message = 'Error al descargar el archivo';
    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      const data = await res.json().catch(() => null);
      message = data?.error || message;
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : 'export.xlsx';
  return { blob, filename };
}

export const api = {
  login: (usuario, password) => request('/auth/login', { method: 'POST', body: { usuario, password } }),

  listSessions: () => request('/admin/sessions', { auth: true }),
  createSession: (payload) => request('/admin/sessions', { method: 'POST', body: payload, auth: true }),
  getSession: (id) => request(`/admin/sessions/${id}`, { auth: true }),
  updateSession: (id, payload) => request(`/admin/sessions/${id}`, { method: 'PUT', body: payload, auth: true }),
  deleteSession: (id) => request(`/admin/sessions/${id}`, { method: 'DELETE', auth: true }),
  getSessionQr: (id) => request(`/admin/sessions/${id}/qr`, { auth: true }),
  getSessionAttendees: (id) => request(`/admin/sessions/${id}/attendees`, { auth: true }),
  setQuestions: (id, preguntas) =>
    request(`/admin/sessions/${id}/questions`, { method: 'PUT', body: { preguntas }, auth: true }),
  uploadFiles: (formData) => request('/admin/uploads', { method: 'POST', body: formData, auth: true, isForm: true }),
  exportSession: (id) => downloadWithAuth(`/admin/sessions/${id}/export`),

  getPublicSession: (token) => request(`/public/sessions/${token}`),
  contentStart: (token, participantToken) =>
    request(`/public/sessions/${token}/content/start`, { method: 'POST', body: { participantToken } }),
  contentStatus: (token, participantToken) =>
    request(`/public/sessions/${token}/content/status?participantToken=${encodeURIComponent(participantToken)}`),
  contentComplete: (token, participantToken, evidence) =>
    request(`/public/sessions/${token}/content/complete`, {
      method: 'POST',
      body: { participantToken, evidence },
    }),
  quizAttempts: (token, participantToken) =>
    request(`/public/sessions/${token}/quiz/attempts?participantToken=${encodeURIComponent(participantToken)}`),
  quizAttempt: (token, participantToken, respuestas) =>
    request(`/public/sessions/${token}/quiz/attempt`, {
      method: 'POST',
      body: { participantToken, respuestas },
    }),
  attendeeMe: (token, participantToken) =>
    request(`/public/sessions/${token}/attendees/me?participantToken=${encodeURIComponent(participantToken)}`),
  submitAttendee: (token, payload) =>
    request(`/public/sessions/${token}/attendees`, { method: 'POST', body: payload }),
};

export function saveAdminToken(token) {
  localStorage.setItem('sst_admin_token', token);
}
export function clearAdminToken() {
  localStorage.removeItem('sst_admin_token');
}
export function isAdminLoggedIn() {
  return !!getToken();
}
