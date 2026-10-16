const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Require JWT_SECRET before starting; fail fast with a clear message.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || String(jwtSecret).trim() === '') {
  console.error('Fatal: JWT_SECRET environment variable is required. Set it in .env or the deployment environment.');
  process.exitCode = 1;
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const perfMiddleware = require('./middleware/perfMiddleware');
const usersRoutes = require('./routes/usersRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const saveddocsRoutes = require('./routes/saveddocsRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const { deleteWorkspace } = require('./controllers/workspaceController');

const ROUTE_CONFIG = [
  { path: '/api/users', router: usersRoutes },
  { path: '/api/workspaces', router: workspaceRoutes },
  { path: '/api/saveddocs', router: saveddocsRoutes },
  { path: '/api/library', router: libraryRoutes },
];

const LEGACY_ROUTE_CONFIG = [
  { method: 'delete', path: '/workspaces/:workspaceId/workspace', handler: deleteWorkspace },
  { method: 'delete', path: '/workspaces/workspace/:workspaceId', handler: deleteWorkspace },
  { method: 'delete', path: '/workspaces/:workspaceId', handler: deleteWorkspace },
  { method: 'use', path: '/saveddocs', handler: saveddocsRoutes },
  { method: 'use', path: '/workspaces', handler: workspaceRoutes },
];

const configureApp = () => {
  const app = express();

  // Disable ETag to prevent 304 Not Modified; auth endpoints must not be cached across users
  app.set("etag", false);

  // CORS configuration - explicit origins only; no '*' with credentials
  const devDefaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];

  let allowedOrigins;
  if (process.env.NODE_ENV !== 'production') {
    // Non-production: union env list with dev defaults so CRA on :3002 (or a partial CORS_ORIGINS) still works.
    const fromEnv = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
      : [];
    allowedOrigins = [...new Set([...fromEnv, ...devDefaultOrigins])];
  } else if (process.env.CORS_ORIGINS) {
    allowedOrigins = process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
  } else {
    throw new Error('CORS_ORIGINS must be defined in production');
  }

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200
  }));
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(perfMiddleware);

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  ROUTE_CONFIG.forEach(({ path, router }) => app.use(path, router));
  if (process.env.NODE_ENV === 'development') {
    LEGACY_ROUTE_CONFIG.forEach(({ method, path, handler }) => app[method](path, handler));
  }

  // Production: serve React build (API routes registered above must run first).
  if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '..', 'frontend', 'build');
    const staticAssetPattern = /\.(js|mjs|css|map|json|ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot)$/i;

    // /static/js/*, /static/css/*, and other build assets (no index.html auto-fallback)
    app.use(express.static(buildPath, { index: false }));

    // SPA fallback only for document navigations; missing assets get 404 (not HTML)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      if (staticAssetPattern.test(req.path)) {
        return res.status(404).type('text/plain').send('Not found');
      }
      res.sendFile(path.join(buildPath, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  return app;
};

const startServer = async () => {
  mongoose.set('strictQuery', true);
  await connectDB();

  const app = configureApp();
  const port = parseInt(process.env.PORT, 10) || 5001;

  app.listen(port, () => {
    console.warn(`Server started on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});