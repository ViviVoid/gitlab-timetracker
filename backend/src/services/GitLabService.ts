import { GitLabTimeEntry, GitLabIssue, GitLabProject } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

interface GitLabNote {
  id: number;
  body: string;
  author: {
    name: string;
    username: string;
  };
  created_at: string;
  system: boolean;
}

interface ParsedTimeEntry {
  author: string;
  username: string;
  date: string;
  hours: number;
  summary: string;
}

export class GitLabService {
  /**
   * Fetch all pages from a GitLab API endpoint
   */
  private async fetchAllPages<T>(
    url: string,
    accessToken: string,
    maxPages: number = 100
  ): Promise<T[]> {
    let allItems: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const pageUrl = url.includes('?') ? `${url}&page=${page}` : `${url}?page=${page}`;
      
      const response = await fetch(pageUrl, {
        headers: {
          'PRIVATE-TOKEN': accessToken,
        },
      });

      if (!response.ok) {
        throw new AppError(`GitLab API error: ${response.status} ${response.statusText}`, response.status);
      }

      const items = await response.json() as T[];
      
      if (items.length === 0) {
        hasMore = false;
      } else {
        allItems = allItems.concat(items);
        page++;
      }
    }

    return allItems;
  }

  /**
   * Fetch all issues from a GitLab project
   */
  async fetchIssues(
    gitlabUrl: string,
    accessToken: string,
    projectId: string
  ): Promise<GitLabIssue[]> {
    logger.info('Fetching issues from GitLab', { projectId });

    const url = `${gitlabUrl}/api/v4/projects/${projectId}/issues?per_page=100&scope=all`;
    const issues = await this.fetchAllPages<GitLabIssue>(url, accessToken);

    logger.info(`Fetched ${issues.length} issues from GitLab`, { projectId });
    return issues;
  }

  /**
   * Fetch all notes (comments) from a GitLab issue
   */
  async fetchNotes(
    gitlabUrl: string,
    accessToken: string,
    projectId: string,
    issueIid: number
  ): Promise<GitLabNote[]> {
    const url = `${gitlabUrl}/api/v4/projects/${projectId}/issues/${issueIid}/notes?per_page=100`;
    return this.fetchAllPages<GitLabNote>(url, accessToken);
  }

  /**
   * Parse time tracking notes and extract time entries
   * This is the critical logic migrated from the HTML file
   */
  parseTimeEntries(notes: GitLabNote[], issueIid: string, issueTitle: string): GitLabTimeEntry[] {
    const timeEntries: GitLabTimeEntry[] = [];

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];

      // Check if this is a time tracking system note
      if (
        note.system &&
        note.body &&
        ((note.body.includes('added') && note.body.includes('of time spent')) ||
          (note.body.includes('subtracted') && note.body.includes('of time spent')) ||
          (note.body.includes('deleted') && note.body.includes('of spent time')))
      ) {
        // Parse time from note body
        let hours = 0;

        // Handle formats like "2h", "30m", "2h 30m"
        const hourMatch = note.body.match(/(\d+)h/);
        const minMatch = note.body.match(/(\d+)m/);

        if (hourMatch) {
          hours += parseInt(hourMatch[1]);
        }
        if (minMatch) {
          hours += parseInt(minMatch[1]) / 60;
        }

        // Make negative if time was subtracted or deleted
        const isNegative = note.body.includes('subtracted') || note.body.includes('deleted');
        if (isNegative) {
          hours = -hours;
        }

        // Extract the "spent at" date if available
        const dateMatch = note.body.match(/at (\d{4}-\d{2}-\d{2})/);
        const entryDate = dateMatch ? dateMatch[1] : note.created_at.split('T')[0];

        // Look for an adjacent non-system note from the same author (within 30 seconds)
        let summary = '';
        const noteTime = new Date(note.created_at).getTime();

        // Check previous note (might be the comment before time entry)
        if (i > 0) {
          const prevNote = notes[i - 1];
          const prevTime = new Date(prevNote.created_at).getTime();
          if (
            !prevNote.system &&
            prevNote.author.username === note.author.username &&
            Math.abs(noteTime - prevTime) < 30000 // Within 30 seconds
          ) {
            summary = prevNote.body;
          }
        }

        // Check next note (might be the comment after time entry)
        if (!summary && i < notes.length - 1) {
          const nextNote = notes[i + 1];
          const nextTime = new Date(nextNote.created_at).getTime();
          if (
            !nextNote.system &&
            nextNote.author.username === note.author.username &&
            Math.abs(noteTime - nextTime) < 30000 // Within 30 seconds
          ) {
            summary = nextNote.body;
          }
        }

        // Add indicator for deleted/subtracted time if no summary
        if (!summary && isNegative) {
          summary = '[Time removed]';
        }

        timeEntries.push({
          author: note.author.name,
          spentHours: hours,
          spentAt: new Date(entryDate),
          commentSummary: summary || undefined,
          isNegative,
          issueIid,
          issueTitle,
        });
      }
    }

    return timeEntries;
  }

  /**
   * Fetch time entries for all issues in a project
   */
  async fetchAllTimeEntries(
    gitlabUrl: string,
    accessToken: string,
    projectId: string
  ): Promise<GitLabTimeEntry[]> {
    logger.info('Starting to fetch all time entries', { projectId });

    // Fetch all issues
    const issues = await this.fetchIssues(gitlabUrl, accessToken, projectId);

    // Fetch notes for all issues in parallel (with concurrency limit)
    const allTimeEntries: GitLabTimeEntry[] = [];
    const batchSize = 10; // Process 10 issues at a time to avoid overwhelming the API

    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (issue) => {
        try {
          const notes = await this.fetchNotes(gitlabUrl, accessToken, projectId, issue.iid);
          return this.parseTimeEntries(notes, issue.iid.toString(), issue.title);
        } catch (error) {
          logger.warn(`Failed to fetch notes for issue ${issue.iid}`, { error });
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((entries) => allTimeEntries.push(...entries));

      logger.info(`Processed ${Math.min(i + batchSize, issues.length)}/${issues.length} issues`);
    }

    logger.info(`Fetched ${allTimeEntries.length} time entries from ${issues.length} issues`);
    return allTimeEntries;
  }

  /**
   * Fetch projects based on filters
   */
  async fetchProjects(
    gitlabUrl: string,
    accessToken: string,
    filters: {
      starred?: boolean;
      membership?: boolean;
      owned?: boolean;
      archived?: boolean;
      search?: string;
    }
  ): Promise<GitLabProject[]> {
    let allProjects: GitLabProject[] = [];

    // Fetch starred projects
    if (filters.starred) {
      const starred = await this.fetchAllPages<GitLabProject>(
        `${gitlabUrl}/api/v4/projects?starred=true&per_page=100`,
        accessToken,
        10
      );
      allProjects = allProjects.concat(starred);
    }

    // Fetch projects user is a member of
    if (filters.membership) {
      const member = await this.fetchAllPages<GitLabProject>(
        `${gitlabUrl}/api/v4/projects?membership=true&per_page=100&order_by=last_activity_at`,
        accessToken,
        10
      );
      allProjects = allProjects.concat(member);
    }

    // Fetch projects owned by user
    if (filters.owned) {
      const owned = await this.fetchAllPages<GitLabProject>(
        `${gitlabUrl}/api/v4/projects?owned=true&per_page=100`,
        accessToken,
        10
      );
      allProjects = allProjects.concat(owned);
    }

    // Fetch archived projects
    if (filters.archived) {
      const archived = await this.fetchAllPages<GitLabProject>(
        `${gitlabUrl}/api/v4/projects?archived=true&per_page=100`,
        accessToken,
        10
      );
      allProjects = allProjects.concat(archived);
    }

    // Remove duplicates by project ID
    const uniqueProjects = Array.from(
      new Map(allProjects.map((project) => [project.id, project])).values()
    );

    // Filter by search text
    let filteredProjects = uniqueProjects;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredProjects = uniqueProjects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchLower) ||
          project.path_with_namespace.toLowerCase().includes(searchLower)
      );
    }

    return filteredProjects;
  }

  /**
   * Test GitLab connection
   */
  async testConnection(gitlabUrl: string, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${gitlabUrl}/api/v4/user`, {
        headers: {
          'PRIVATE-TOKEN': accessToken,
        },
      });

      return response.ok;
    } catch (error) {
      logger.error('Failed to test GitLab connection', { error });
      return false;
    }
  }
}

export const gitlabService = new GitLabService();
