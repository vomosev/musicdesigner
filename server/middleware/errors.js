'use strict';

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Route not found',
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isMalformedJson =
    err &&
    (err.type === 'entity.parse.failed' ||
      (err instanceof SyntaxError && err.status === 400 && 'body' in err));

  const isPayloadTooLarge =
    err &&
    (err.type === 'entity.too.large' ||
      err.status === 413 ||
      err.statusCode === 413);

  let status = Number(err && (err.status || err.statusCode));

  if (!Number.isInteger(status) || status < 400 || status > 599) {
    status = 500;
  }

  let message;

  if (isMalformedJson) {
    status = 400;
    message = 'Malformed JSON request body';
  } else if (isPayloadTooLarge) {
    status = 413;
    message = 'Request body is too large';
  } else if (status < 500 && err && typeof err.message === 'string') {
    message = err.message;
  } else {
    message = 'Internal server error';
  }

  if (status >= 500) {
    console.error('Unhandled request error:', err);
  }

  const response = { error: message };

  if (
    process.env.NODE_ENV !== 'production' &&
    err &&
    typeof err.stack === 'string'
  ) {
    response.stack = err.stack;
  }

  return res.status(status).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};