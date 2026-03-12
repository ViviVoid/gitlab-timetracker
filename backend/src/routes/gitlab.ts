import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { gitlabService } from '../services/GitLabService';
import { keyVaultService } from '../services/KeyVaultService';
import { cacheService } from '../services/CacheService';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { AuthRequest } from '../types';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createConnectionSchema = z.object({
  body: z.object({
    gitlabUrl: z.string().url('Invalid GitLab URL'),
    accessToken: z.string().min(1, 'Access token is required'),
    connectionName: z.string().min(1, 'Connection name is required'),
  }),
});

const fetchProjectsSchema = z.object({
  query: z.object({
    connectionId: z.string().uuid('Invalid connection ID'),
    starred: z.string().optional(),
    membership: z.string().optional(),
    owned: z.string().optional(),
    archived: z.string().optional(),
    search: z.string().optional(),
  }),
});

// POST /api/gitlab/connections
router.post(
  '/connections',
  validate(createConnectionSchema),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { gitlabUrl, accessToken, connectionName } = req.body;
    const userId = req.userId!;

    // Test connection first
    const isValid = await gitlabService.testConnection(gitlabUrl, accessToken);
    if (!isValid) {
      throw new ValidationError('Invalid GitLab URL or access token');
    }

    // Store token in Key Vault
    const secretId = `gitlab-token-${userId}-${Date.now()}`;
    const keyVaultSecretId = await keyVaultService.storeSecret(secretId, accessToken);

    // Create connection
    const connection = await prisma.gitLabConnection.create({
      data: {
        userId,
        gitlabUrl,
        keyVaultSecretId,
        connectionName,
        isActive: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { connection },
    });
  })
);

// GET /api/gitlab/connections
router.get(
  '/connections',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const userId = req.userId!;

    const connections = await prisma.gitLabConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      status: 'success',
      data: { connections },
    });
  })
);

// DELETE /api/gitlab/connections/:id
router.delete(
  '/connections/:id',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { id } = req.params;
    const userId = req.userId!;

    const connection = await prisma.gitLabConnection.findFirst({
      where: { id: String(id), userId },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Delete secret from Key Vault
    if (connection.keyVaultSecretId) {
      try {
        await keyVaultService.deleteSecret(connection.keyVaultSecretId);
      } catch (error) {
        logger.warn('Failed to delete secret from Key Vault', { error });
      }
    }

    // Delete connection and all related data
    await prisma.gitLabConnection.delete({ where: { id: String(id) } });

    res.json({
      status: 'success',
      message: 'Connection deleted successfully',
    });
  })
);

// GET /api/gitlab/projects
router.get(
  '/projects',
  validate(fetchProjectsSchema),
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { connectionId, starred, membership, owned, archived, search } = req.query;
    const userId = req.userId!;

    // Get connection
    const connection = await prisma.gitLabConnection.findFirst({
      where: { id: String(connectionId), userId },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Get access token from Key Vault
    const accessToken = await keyVaultService.getSecret(connection.keyVaultSecretId!);

    // Fetch projects from GitLab
    const projects = await gitlabService.fetchProjects(connection.gitlabUrl, accessToken, {
      starred: String(starred) === 'true',
      membership: String(membership) === 'true',
      owned: String(owned) === 'true',
      archived: String(archived) === 'true',
      search: search ? String(search) : undefined,
    });

    res.json({
      status: 'success',
      data: { projects },
    });
  })
);

// POST /api/gitlab/projects
router.post(
  '/projects',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { connectionId, gitlabProjectId, projectName, projectPath } = req.body;
    const userId = req.userId!;

    // Verify connection exists
    const connection = await prisma.gitLabConnection.findFirst({
      where: { id: String(connectionId), userId },
    });

    if (!connection) {
      throw new NotFoundError('Connection not found');
    }

    // Create or update project
    const project = await prisma.project.upsert({
      where: {
        userId_gitlabConnectionId_gitlabProjectId: {
          userId,
          gitlabConnectionId: connectionId,
          gitlabProjectId,
        },
      },
      update: {
        projectName,
        projectPath,
      },
      create: {
        userId,
        gitlabConnectionId: connectionId,
        gitlabProjectId,
        projectName,
        projectPath,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { project },
    });
  })
);

// GET /api/gitlab/projects/:id
router.get(
  '/projects/:id',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { id } = req.params;
    const userId = req.userId!;

    const project = await prisma.project.findFirst({
      where: { id: String(id), userId },
      include: {
        gitlabConnection: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    res.json({
      status: 'success',
      data: { project },
    });
  })
);

// POST /api/gitlab/sync/:projectId
router.post(
  '/sync/:projectId',
  asyncHandler(async (req: AuthRequest, res: any) => {
    const { projectId } = req.params;
    const userId = req.userId!;

    // Get project with connection
    const project = await prisma.project.findFirst({
      where: { id: String(projectId), userId },
      include: { gitlabConnection: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    // Get access token
    const accessToken = await keyVaultService.getSecret(project.gitlabConnection.keyVaultSecretId!);

    // Fetch time entries from GitLab
    logger.info('Starting sync for project', { projectId, projectName: project.projectName });
    
    const timeEntries = await gitlabService.fetchAllTimeEntries(
      project.gitlabConnection.gitlabUrl,
      accessToken,
      project.gitlabProjectId
    );

    // Store time entries in database
    // Delete existing entries for this project
    await prisma.timeEntry.deleteMany({
      where: { projectId: String(projectId) },
    });

    // Insert new entries
    if (timeEntries.length > 0) {
      await prisma.timeEntry.createMany({
        data: timeEntries.map((entry) => ({
          projectId: String(projectId),
          userId,
          gitlabIssueIid: entry.issueIid,
          gitlabIssueTitle: entry.issueTitle,
          author: entry.author,
          spentHours: entry.spentHours,
          spentAt: entry.spentAt,
          commentSummary: entry.commentSummary,
          isNegative: entry.isNegative,
        })),
      });
    }

    // Update last synced timestamp
    await prisma.gitLabConnection.update({
      where: { id: project.gitlabConnectionId },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    // Clear cache for this project
    await cacheService.deletePattern(`timeentries:${projectId}:*`);

    res.json({
      status: 'success',
      data: {
        synced: timeEntries.length,
        message: `Successfully synced ${timeEntries.length} time entries`,
      },
    });
  })
);

export default router;
