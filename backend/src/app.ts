import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes';
import { NotFoundError } from './utils/errors';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(globalLimiter);

  app.use('/api', routes);

  app.use((_req, _res, next) => {
    next(new NotFoundError('Route not found'));
  });

  app.use(errorHandler);

  return app;
}
