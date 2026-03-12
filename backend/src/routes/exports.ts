import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { exportService } from '../services/ExportService';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const exportSchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    format: z.enum(['csv', 'json']).default('csv'),
  }),
});

// GET /api/exports/time-entries
router.get(
  '/time-entries',
  validate(exportSchema),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { projectId, startDate, endDate, format } = req.query as any;
    const userId = req.userId!;

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
    }

    if (format === 'csv') {
      const csv = await exportService.generateCSV(projectId, userId, startDate, endDate);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="time-entries-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      // JSON format
      const where: any = {
        projectId,
        userId,
      };

      if (startDate && endDate) {
        where.spentAt = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      const timeEntries = await prisma.timeEntry.findMany({
        where,
        orderBy: { spentAt: 'desc' },
      });

      const summary = await exportService.generateSummary(projectId, userId, startDate, endDate);

      res.json({
        status: 'success',
        data: {
          timeEntries,
          summary,
        },
      });
    }
  })
);

export default router;
