import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/AuthService';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../types';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name is required'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

// POST /api/auth/register
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { email, password, name } = req.body;

    const result = await authService.register(email, password, name);

    res.status(201).json({
      status: 'success',
      data: result,
    });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.json({
      status: 'success',
      data: result,
    });
  })
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.json({
      status: 'success',
      data: tokens,
    });
  })
);

// POST /api/auth/logout
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.json({
      status: 'success',
      message: 'Logged out successfully',
    });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: any) => {
    const user = await authService.getUserById(req.userId!);

    res.json({
      status: 'success',
      data: { user },
    });
  })
);

export default router;
