import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { cacheService } from '../services/CacheService';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const querySchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    author: z.string().optional(),
  }),
});

// GET /api/time-entries
router.get(
  '/',
  validate(querySchema),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { projectId, startDate, endDate, author } = req.query as any;
    const userId = req.userId!;

    // Check cache first
    const cacheKey = `timeentries:${projectId}:${startDate}:${endDate}:${author || 'all'}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json({
        status: 'success',
        data: { timeEntries: cached, cached: true },
      });
    }

    // Build query
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

    if (author) {
      where.author = author;
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      orderBy: { spentAt: 'desc' },
    });

    // Cache for 5 minutes
    await cacheService.set(cacheKey, timeEntries, 300);

    res.json({
      status: 'success',
      data: { timeEntries, cached: false },
    });
  })
);

// GET /api/time-entries/stats
router.get(
  '/stats',
  validate(querySchema),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { projectId, startDate, endDate } = req.query as any;
    const userId = req.userId!;

    // Build query
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

    // Get all time entries for stats
    const timeEntries = await prisma.timeEntry.findMany({
      where,
      select: {
        author: true,
        spentHours: true,
        spentAt: true,
        gitlabIssueIid: true,
      },
    });

    // Calculate statistics
    const memberStats: Record<
      string,
      { hours: number; pbiCount: number; entries: number }
    > = {};

    const pbiStats: Record<string, { hours: number; authors: Set<string> }> = {};

    timeEntries.forEach((entry) => {
      // Member stats
      if (!memberStats[entry.author]) {
        memberStats[entry.author] = { hours: 0, pbiCount: 0, entries: 0 };
      }
      memberStats[entry.author].hours += entry.spentHours;
      memberStats[entry.author].entries += 1;

      // PBI stats
      if (!pbiStats[entry.gitlabIssueIid]) {
        pbiStats[entry.gitlabIssueIid] = { hours: 0, authors: new Set() };
      }
      pbiStats[entry.gitlabIssueIid].hours += entry.spentHours;
      pbiStats[entry.gitlabIssueIid].authors.add(entry.author);
    });

    // Count unique PBIs per member
    const memberPbiCounts: Record<string, Set<string>> = {};
    timeEntries.forEach((entry) => {
      if (!memberPbiCounts[entry.author]) {
        memberPbiCounts[entry.author] = new Set();
      }
      memberPbiCounts[entry.author].add(entry.gitlabIssueIid);
    });

    Object.keys(memberPbiCounts).forEach((author) => {
      memberStats[author].pbiCount = memberPbiCounts[author].size;
    });

    // Convert to arrays
    const memberArray = Object.entries(memberStats).map(([author, stats]) => ({
      author,
      ...stats,
    }));

    const pbiArray = Object.entries(pbiStats).map(([iid, stats]) => ({
      issueIid: iid,
      hours: stats.hours,
      authorCount: stats.authors.size,
      authors: Array.from(stats.authors),
    }));

    // Calculate totals
    const totalHours = timeEntries.reduce((sum, e) => sum + e.spentHours, 0);
    const totalPbis = Object.keys(pbiStats).length;
    const totalMembers = Object.keys(memberStats).length;
    const avgHoursPerMember = totalMembers > 0 ? totalHours / totalMembers : 0;

    res.json({
      status: 'success',
      data: {
        totals: {
          hours: totalHours,
          pbis: totalPbis,
          members: totalMembers,
          avgHoursPerMember,
        },
        members: memberArray,
        pbis: pbiArray,
      },
    });
  })
);

// GET /api/time-entries/cumulative
router.get(
  '/cumulative',
  validate(querySchema),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { projectId, startDate, endDate } = req.query as any;
    const userId = req.userId!;

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
      orderBy: { spentAt: 'asc' },
      select: {
        author: true,
        spentHours: true,
        spentAt: true,
      },
    });

    // Build cumulative data by author
    const cumulativeData: Record<
      string,
      { dates: string[]; cumulativeHours: number[] }
    > = {};

    const allDates = [...new Set(timeEntries.map((e) => e.spentAt.toISOString().split('T')[0]))];

    // Get unique authors
    const authors = [...new Set(timeEntries.map((e) => e.author))];

    authors.forEach((author) => {
      const authorEntries = timeEntries.filter((e) => e.author === author);
      let cumulative = 0;
      const dates: string[] = [];
      const hours: number[] = [];

      allDates.forEach((date) => {
        const dayEntries = authorEntries.filter(
          (e) => e.spentAt.toISOString().split('T')[0] === date
        );
        const dayHours = dayEntries.reduce((sum, e) => sum + e.spentHours, 0);
        cumulative += dayHours;

        dates.push(date);
        hours.push(cumulative);
      });

      cumulativeData[author] = { dates, cumulativeHours: hours };
    });

    res.json({
      status: 'success',
      data: {
        dates: allDates,
        series: Object.entries(cumulativeData).map(([author, data]) => ({
          author,
          data: data.cumulativeHours,
        })),
      },
    });
  })
);

export default router;
