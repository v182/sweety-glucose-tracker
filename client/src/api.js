let csrfToken = null;
export const setCsrfToken = (token) => {
  csrfToken = token;
};

export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (csrfToken && method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('We could not reach the server. Check your connection and try again.');
  }
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.fields = payload?.error?.fields;
    error.code = payload?.error?.code;
    if (response.status === 401 && !path.startsWith('/auth'))
      window.dispatchEvent(new Event('sweety:session-expired'));
    throw error;
  }
  return payload;
}
