/**
 * Data Manager - Handles GitLab data fetching and parsing
 */

const ISSUE_CONCURRENCY = 15;

function createLimiter(limit) {
  let active = 0;
  const queue = [];

  const runNext = () => {
    if (active >= limit || queue.length === 0) return;
    const { fn, resolve, reject } = queue.shift();
    active++;
    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        active--;
        runNext();
      });
  };

  return function limitFn(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      runNext();
    });
  };
}

class DataManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Fetch all issues with pagination
   */
  async fetchAllIssues(gitlabUrl, projectId, accessToken, onProgress) {
    let allIssues = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const url = `${gitlabUrl}/api/v4/projects/${projectId}/issues?per_page=100&scope=all&page=${page}`;
      const response = await this.apiClient.fetch(url, {
        headers: { "PRIVATE-TOKEN": accessToken },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch issues (page ${page}): ${response.status} ${response.statusText}`,
        );
      }

      const issues = await response.json();
      if (issues.length === 0) {
        hasMorePages = false;
      } else {
        allIssues = allIssues.concat(issues);
        page++;
        if (page > 100) hasMorePages = false; // Safety check
      }

      if (onProgress) onProgress(allIssues.length);
    }

    return allIssues;
  }

  /**
   * Fetch all notes for a single issue with pagination
   */
  async fetchIssueNotes(gitlabUrl, projectId, issueIid, accessToken) {
    let allNotes = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const url = `${gitlabUrl}/api/v4/projects/${projectId}/issues/${issueIid}/notes?per_page=100&page=${page}`;
      const response = await this.apiClient.fetch(url, {
        headers: { "PRIVATE-TOKEN": accessToken },
      });

      if (!response.ok) {
        console.warn(
          `Failed to fetch notes for issue ${issueIid}, page ${page}: ${response.status}`,
        );
        break;
      }

      const pageNotes = await response.json();
      if (pageNotes.length === 0) {
        hasMorePages = false;
      } else {
        allNotes = allNotes.concat(pageNotes);
        page++;
        if (page > 100) hasMorePages = false; // Safety check
      }
    }

    return allNotes;
  }

  /**
   * Fetch time stats for a single issue
   */
  async fetchTimeStats(gitlabUrl, projectId, issueIid, accessToken) {
    const url = `${gitlabUrl}/api/v4/projects/${projectId}/issues/${issueIid}/time_stats`;
    const response = await this.apiClient.fetch(url, {
      headers: { "PRIVATE-TOKEN": accessToken },
    });

    if (!response.ok) {
      console.warn(
        `Failed to fetch time stats for issue ${issueIid}: ${response.status}`,
      );
      return null;
    }

    return await response.json();
  }

  /**
   * Parse time entries from notes
   */
  parseTimeEntries(notes) {
    const timeEntries = [];

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];

      // Check if this is a time tracking system note
      if (
        note.system &&
        note.body &&
        ((note.body.includes("added") && note.body.includes("of time spent")) ||
          (note.body.includes("subtracted") &&
            note.body.includes("of time spent")) ||
          (note.body.includes("deleted") &&
            note.body.includes("of spent time")))
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
        if (note.body.includes("subtracted") || note.body.includes("deleted")) {
          hours = -hours;
        }

        // Extract the "spent at" date if available
        const dateMatch = note.body.match(/at (\d{4}-\d{2}-\d{2})/);
        const entryDate = dateMatch
          ? dateMatch[1]
          : note.created_at.split("T")[0];

        // Look for an adjacent non-system note from the same author
        let summary = "";
        const noteTime = new Date(note.created_at).getTime();
        const isNegative = hours < 0;

        // Check previous note
        if (i > 0) {
          const prevNote = notes[i - 1];
          const prevTime = new Date(prevNote.created_at).getTime();
          if (
            !prevNote.system &&
            prevNote.author.username === note.author.username &&
            Math.abs(noteTime - prevTime) < 30000
          ) {
            summary = prevNote.body;
          }
        }

        // Check next note
        if (!summary && i < notes.length - 1) {
          const nextNote = notes[i + 1];
          const nextTime = new Date(nextNote.created_at).getTime();
          if (
            !nextNote.system &&
            nextNote.author.username === note.author.username &&
            Math.abs(noteTime - nextTime) < 30000
          ) {
            summary = nextNote.body;
          }
        }

        if (!summary && isNegative) {
          summary = "[Time removed]";
        }

        timeEntries.push({
          author: note.author.name,
          username: note.author.username,
          date: entryDate,
          hours: hours,
          summary: summary,
        });
      }
    }

    return timeEntries;
  }

  /**
   * Process a single issue with rate limiting
   */
  async processIssue(issue, gitlabUrl, projectId, accessToken) {
    try {
      const [timeStats, notes] = await Promise.all([
        this.fetchTimeStats(gitlabUrl, projectId, issue.iid, accessToken),
        this.fetchIssueNotes(gitlabUrl, projectId, issue.iid, accessToken),
      ]);

      const timeEntries = this.parseTimeEntries(notes);

      return {
        ...issue,
        timeStats: timeStats,
        timeEntries: timeEntries,
      };
    } catch (error) {
      console.error(`Error processing issue ${issue.iid}:`, error);
      return {
        ...issue,
        timeStats: null,
        timeEntries: [],
        error: error.message,
      };
    }
  }

  /**
   * Fetch all data with better concurrency control
   */
  async fetchAllData(gitlabUrl, projectId, accessToken, onProgress) {
    // Fetch all issues first
    const issues = await this.fetchAllIssues(
      gitlabUrl,
      projectId,
      accessToken,
      (count) => {
        if (onProgress) onProgress(`Loaded ${count} issues...`);
      },
    );

    console.log(`Loaded ${issues.length} issues`);

    // Process issues with bounded parallelism (faster but safe)
    const limit = createLimiter(ISSUE_CONCURRENCY);
    let processedCount = 0;

    const issuePromises = issues.map((issue) =>
      limit(async () => {
        const processed = await this.processIssue(
          issue,
          gitlabUrl,
          projectId,
          accessToken,
        );
        processedCount++;
        if (
          onProgress &&
          (processedCount % 5 === 0 || processedCount === issues.length)
        ) {
          onProgress(`Processing issues: ${processedCount}/${issues.length}`);
        }
        return processed;
      }),
    );

    const processedIssues = await Promise.all(issuePromises);

    // Collect all time entries
    const rawTimeEntries = [];
    processedIssues.forEach((issue) => {
      if (issue.timeEntries && issue.timeEntries.length > 0) {
        issue.timeEntries.forEach((entry) => {
          rawTimeEntries.push({
            ...entry,
            issueId: issue.iid,
            issueTitle: issue.title,
          });
        });
      }
    });

    console.log(
      `Loaded ${rawTimeEntries.length} time entries from ${issues.length} issues`,
    );

    return {
      issues: processedIssues,
      rawTimeEntries: rawTimeEntries,
    };
  }
}
