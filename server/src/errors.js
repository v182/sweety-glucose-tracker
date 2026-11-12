export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function validationError(fields) {
  return new ApiError(400, 'VALIDATION_ERROR', Object.values(fields)[0], fields);
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ApiError) return res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fields && { fields: error.fields }) } });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Please send valid JSON.' } });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'This request is too large.' } });
  // Do not log request bodies, credentials, or individual glucose readings.
  console.error('Request failed:', error.code || error.name);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
}
