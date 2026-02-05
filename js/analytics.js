/**
 * AnalyticsCalculator - Computes analytics metrics from time entries and issues
 */

class AnalyticsCalculator {
  static computeAll(issues, timeEntries, referenceDate = new Date()) {
    const workload = this.computeWorkloadDistribution(timeEntries);
    const stalled = this.computeStalledIssues(
      issues,
      timeEntries,
      referenceDate,
    );
    const rework = this.computeReworkAnalysis(timeEntries);
    const anomalies = this.computeAnomalies(timeEntries);
    const burnout = this.computeBurnoutRisk(timeEntries, referenceDate);
    const estimation = this.computeEstimationAccuracy(issues, timeEntries);

    return {
      workload,
      stalled,
      rework,
      anomalies,
      burnout,
      estimation,
      lastUpdated: new Date().toISOString(),
    };
  }

  static computeWorkloadDistribution(timeEntries) {
    const memberStats = new Map();
    timeEntries.forEach((entry) => {
      if (!memberStats.has(entry.username)) {
        memberStats.set(entry.username, {
          username: entry.username,
          name: entry.author,
          hours: 0,
        });
      }
      memberStats.get(entry.username).hours += entry.hours;
    });

    const members = Array.from(memberStats.values());
    const avgHours =
      members.length > 0
        ? members.reduce((sum, m) => sum + m.hours, 0) / members.length
        : 0;

    return members.map((m) => ({
      ...m,
      utilization: avgHours > 0 ? m.hours / avgHours : 0,
    }));
  }

  static computeStalledIssues(issues, timeEntries, referenceDate) {
    const lastEntryByIssue = new Map();
    timeEntries.forEach((entry) => {
      const date = new Date(entry.date);
      const prev = lastEntryByIssue.get(entry.issueId);
      if (!prev || date > prev) {
        lastEntryByIssue.set(entry.issueId, date);
      }
    });

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return issues
      .map((issue) => {
        const lastEntry = lastEntryByIssue.get(issue.iid);
        if (!lastEntry) return null;
        const daysSince = Math.floor(
          (referenceDate - lastEntry) / (24 * 60 * 60 * 1000),
        );
        return {
          issueId: issue.iid,
          title: issue.title,
          lastEntryDate: lastEntry.toISOString().split("T")[0],
          daysSince,
        };
      })
      .filter(
        (item) =>
          item && referenceDate - new Date(item.lastEntryDate) > sevenDaysMs,
      );
  }

  static computeReworkAnalysis(timeEntries) {
    const perIssue = new Map();
    timeEntries.forEach((entry) => {
      if (!perIssue.has(entry.issueId)) {
        perIssue.set(entry.issueId, {
          issueId: entry.issueId,
          issueTitle: entry.issueTitle,
          totalHours: 0,
          negativeHours: 0,
        });
      }
      const data = perIssue.get(entry.issueId);
      data.totalHours += entry.hours;
      if (entry.hours < 0) data.negativeHours += Math.abs(entry.hours);
    });

    return Array.from(perIssue.values())
      .filter((item) => item.negativeHours > 0)
      .map((item) => ({
        ...item,
        reworkPercent:
          item.totalHours !== 0
            ? (item.negativeHours / Math.abs(item.totalHours)) * 100
            : 0,
      }));
  }

  static computeAnomalies(timeEntries) {
    return timeEntries
      .map((entry) => {
        const dateObj = new Date(entry.date);
        const day = dateObj.getDay();
        const isWeekend = day === 0 || day === 6;
        const isLarge = Math.abs(entry.hours) >= 8;
        const isTiny =
          Math.abs(entry.hours) > 0 && Math.abs(entry.hours) < 0.25;

        if (!isWeekend && !isLarge && !isTiny) return null;

        const reasons = [];
        if (isWeekend) reasons.push("Weekend entry");
        if (isLarge) reasons.push("Long entry (>= 8h)");
        if (isTiny) reasons.push("Tiny entry (< 0.25h)");

        return {
          ...entry,
          reasons,
        };
      })
      .filter(Boolean);
  }

  static computeBurnoutRisk(timeEntries, referenceDate) {
    const weeks = new Map();
    const targetHoursPerWeek = 40;

    timeEntries.forEach((entry) => {
      const dateObj = new Date(entry.date);
      const weekKey = this.getWeekKey(dateObj);
      if (!weeks.has(weekKey)) weeks.set(weekKey, new Map());
      const members = weeks.get(weekKey);
      const current = members.get(entry.username) || 0;
      members.set(entry.username, current + entry.hours);
    });

    const recentWeeks = Array.from(weeks.keys()).sort().slice(-4);
    const memberTotals = new Map();

    recentWeeks.forEach((weekKey) => {
      const members = weeks.get(weekKey) || new Map();
      members.forEach((hours, username) => {
        if (!memberTotals.has(username)) memberTotals.set(username, []);
        memberTotals.get(username).push(hours);
      });
    });

    const results = [];
    memberTotals.forEach((hoursList, username) => {
      const rollingAvg =
        hoursList.reduce((sum, h) => sum + h, 0) / hoursList.length;
      const highWeeks = hoursList.filter(
        (h) => h > targetHoursPerWeek * 1.2,
      ).length;
      results.push({
        username,
        rollingAvg,
        highWeeks,
        risk: highWeeks >= 2,
      });
    });

    return results;
  }

  static computeEstimationAccuracy(issues, timeEntries) {
    const spentByIssue = new Map();
    timeEntries.forEach((entry) => {
      const current = spentByIssue.get(entry.issueId) || 0;
      spentByIssue.set(entry.issueId, current + entry.hours);
    });

    const results = issues
      .map((issue) => {
        const timeStats = issue.timeStats || {};
        const estimateSeconds = timeStats.time_estimate || 0;
        const estimateHours = estimateSeconds / 3600;
        if (!estimateHours) return null;

        const actualHours = spentByIssue.get(issue.iid) || 0;
        const ratio = estimateHours > 0 ? actualHours / estimateHours : 0;
        let category = "accurate";
        if (ratio < 0.9) category = "under";
        if (ratio > 1.1) category = "over";

        return {
          issueId: issue.iid,
          title: issue.title,
          estimateHours,
          actualHours,
          ratio,
          category,
        };
      })
      .filter(Boolean);

    const summary = results.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      },
      { under: 0, accurate: 0, over: 0 },
    );

    return { results, summary };
  }

  static getWeekKey(dateObj) {
    const date = new Date(
      Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
    );
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }
}
