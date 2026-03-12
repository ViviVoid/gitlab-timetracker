import { prisma } from '../utils/db';
import { logger } from '../utils/logger';

export class ExportService {
  /**
   * Generate CSV export of time entries
   */
  async generateCSV(projectId: string, userId: string, startDate?: string, endDate?: string): Promise<string> {
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

    // Build CSV
    const headers = ['Date', 'Author', 'Issue', 'Hours', 'Summary', 'Type'];
    const rows = timeEntries.map((entry) => [
      entry.spentAt.toISOString().split('T')[0],
      entry.author,
      `#${entry.gitlabIssueIid} - ${entry.gitlabIssueTitle}`,
      entry.spentHours.toString(),
      entry.commentSummary || '',
      entry.isNegative ? 'Removed' : 'Added',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    logger.info('CSV export generated', { projectId, entries: timeEntries.length });

    return csv;
  }

  /**
   * Generate summary statistics for export
   */
  async generateSummary(projectId: string, userId: string, startDate?: string, endDate?: string) {
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
      select: {
        author: true,
        spentHours: true,
        gitlabIssueIid: true,
      },
    });

    // Calculate statistics
    const totalHours = timeEntries.reduce((sum, e) => sum + e.spentHours, 0);
    const uniqueAuthors = new Set(timeEntries.map((e) => e.author)).size;
    const uniqueIssues = new Set(timeEntries.map((e) => e.gitlabIssueIid)).size;

    // By author
    const byAuthor: Record<string, number> = {};
    timeEntries.forEach((entry) => {
      byAuthor[entry.author] = (byAuthor[entry.author] || 0) + entry.spentHours;
    });

    return {
      totalHours,
      totalEntries: timeEntries.length,
      uniqueAuthors,
      uniqueIssues,
      byAuthor,
    };
  }
}

export const exportService = new ExportService();
