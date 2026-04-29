export function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal server error';
  const code = err.code ?? undefined;
  res.status(status).json({ error: message, ...(code && { code }) });
}
