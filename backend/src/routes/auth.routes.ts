import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middlewares/validate';
import { authenticate, requireAuth } from '../middlewares/auth';
import * as authController from '../controllers/auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/auth.validators';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authLimiter, validate({ body: refreshSchema }), authController.refresh);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);

router.post(
  '/logout',
  authenticate,
  requireAuth,
  validate({ body: logoutSchema }),
  authController.logout
);
router.get('/me', authenticate, requireAuth, authController.me);
router.post(
  '/change-password',
  authenticate,
  requireAuth,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);

export default router;
