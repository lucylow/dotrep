const { v4: uuidv4 } = require('uuid');
const requestId = require('express-request-id');

/**
 * Middleware to add request ID to all requests
 * Helps with tracing requests through logs
 */
const requestIdMiddleware = requestId({
  headerName: 'X-Request-ID',
  attributeName: 'id',
  setHeader: true,
  generator: () => uuidv4()
});

/**
 * Middleware to attach request ID to response locals
 */
const attachRequestId = (req, res, next) => {
  res.locals.requestId = req.id || uuidv4();
  next();
};

module.exports = {
  requestIdMiddleware,
  attachRequestId
};


