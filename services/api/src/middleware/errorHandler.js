function errorHandler(err, req, res, next) {
  console.error(err);
  // PostgREST PGRST116: .single() found 0 rows — treat as 404
  if (err.code === 'PGRST116') {
    return res.status(404).json({ error: 'Resource not found' });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}

module.exports = errorHandler;