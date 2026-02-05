// ========== MAIN APPLICATION FILE ==========

// Global state
let allData = {
  issues: [],
  rawTimeEntries: [],
  filteredTimeEntries: [],
  cumulativeChart: null,
  milestones: [],
  analytics: null,
  analyticsCharts: {
    workload: null,
    estimation: null,
  },
  analyticsTimestamp: null,
};

// Analytics Thresholds (configurable by user)
let analyticsThresholds = {
  stalled: 7,
  burnoutHigh: 45,
  burnoutLow: 20,
  rework: 10,
  largeEntry: 8,
  tinyEntry: 0.25,
  overEstimate: 20,
  underEstimate: 20,
};

// Initialize modules
let themeManager;
let filterManager;
let projectBrowser;

// Load thresholds from localStorage
function loadThresholds() {
  try {
    const stored = localStorage.getItem("analytics-thresholds");
    if (stored) {
      analyticsThresholds = {
        ...analyticsThresholds,
        ...JSON.parse(stored),
      };
    }
  } catch (error) {
    console.warn("Failed to load thresholds:", error);
  }
}

// Save thresholds to localStorage
function saveThresholds() {
  try {
    localStorage.setItem(
      "analytics-thresholds",
      JSON.stringify(analyticsThresholds),
    );
    UIManager.showToast("Thresholds saved successfully", "success");
  } catch (error) {
    console.warn("Failed to save thresholds:", error);
    UIManager.showToast("Failed to save thresholds", "error");
  }
}

// Load configuration from .env file
async function loadEnvConfig() {
  try {
    const response = await fetch(".env");
    if (response.ok) {
      const envText = await response.text();
      const envVars = {};

      envText.split("\n").forEach((line) => {
        line = line.trim();
        if (line && !line.startsWith("#")) {
          const [key, ...valueParts] = line.split("=");
          if (key && valueParts.length > 0) {
            const value = valueParts.join("=").trim();
            envVars[key.trim()] = value;
          }
        }
      });

      if (envVars.TARGET_LINK) {
        document.getElementById("gitlabUrl").value = envVars.TARGET_LINK;
      }
      if (envVars.TARGET_API_KEY) {
        document.getElementById("accessToken").value = envVars.TARGET_API_KEY;
      }
      if (envVars.TARGET_PROJECT_ID) {
        document.getElementById("projectId").value = envVars.TARGET_PROJECT_ID;
      }
    }
  } catch (error) {
    console.log("No .env file found or could not be loaded");
  }
}

function isRememberSettingsEnabled() {
  const rememberCheckbox = document.getElementById("rememberSettings");
  return rememberCheckbox ? rememberCheckbox.checked : true;
}

function initializeRememberSettings() {
  const rememberCheckbox = document.getElementById("rememberSettings");
  if (!rememberCheckbox) return;

  rememberCheckbox.checked = SettingsManager.loadRememberPreference();
  rememberCheckbox.addEventListener("change", () => {
    const enabled = rememberCheckbox.checked;
    SettingsManager.saveRememberPreference(enabled);
    if (!enabled) {
      SettingsManager.clearSettings();
    }
  });
}

function loadStoredSettings() {
  if (!isRememberSettingsEnabled()) {
    return;
  }
  const settings = SettingsManager.loadSettings();
  if (settings.url) {
    document.getElementById("gitlabUrl").value = settings.url;
  }
  if (settings.projectId) {
    document.getElementById("projectId").value = settings.projectId;
  }
}

async function initializeApp() {
  filterManager = new FilterManager();
  filterManager.initializeDateFilters();
  loadThresholds();
  initializeRememberSettings();

  await loadEnvConfig();

  const gitlabUrl = document.getElementById("gitlabUrl").value;
  const projectId = document.getElementById("projectId").value;

  if (!gitlabUrl || !projectId) {
    loadStoredSettings();
  }

  setupEnterKeySupport();
  setupKeyboardShortcuts();

  // Initialize theme manager
  themeManager = new ThemeManager();

  // Initialize project browser
  projectBrowser = new ProjectBrowser();
}

// Call on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

function isTypingInInput(target) {
  return target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function setupEnterKeySupport() {
  const enterMap = {
    gitlabUrl: fetchData,
    accessToken: fetchData,
    projectId: fetchData,
    startDate: () => filterManager.applyFilter(),
    endDate: () => filterManager.applyFilter(),
    projectSearch: () => projectBrowser.searchProjects(),
  };

  Object.keys(enterMap).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        enterMap[id]();
      }
    });
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      UIManager.closeModal();
      projectBrowser.closeProjectBrowser();
      return;
    }

    if (isTypingInInput(event.target)) {
      return;
    }

    if (event.key === "/") {
      event.preventDefault();
      const modal = document.getElementById("projectBrowserModal");
      const isOpen = modal && modal.classList.contains("active");
      if (!isOpen) {
        projectBrowser.showProjectBrowser();
      }
      setTimeout(() => {
        const searchInput = document.getElementById("projectSearch");
        if (searchInput) searchInput.focus();
      }, 150);
    }

    if (
      event.key.toLowerCase() === "l" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      fetchData();
    }
  });
}

// Restore tab state from URL
window.addEventListener("load", () => {
  restoreTabState();
});

window.addEventListener("hashchange", () => {
  restoreTabState();
});

async function fetchData() {
  const gitlabUrl = document.getElementById("gitlabUrl").value.trim();
  const accessToken = document.getElementById("accessToken").value.trim();
  const projectId = document.getElementById("projectId").value.trim();

  if (!gitlabUrl || !accessToken || !projectId) {
    const missing = [];
    if (!gitlabUrl) missing.push("GitLab URL");
    if (!accessToken) missing.push("Access Token");
    if (!projectId) missing.push("Project ID");
    UIManager.showError(`Missing required fields: ${missing.join(", ")}`);
    return;
  }

  if (isRememberSettingsEnabled()) {
    SettingsManager.saveSettings(gitlabUrl, projectId);
  }

  UIManager.showLoading(true);
  document.getElementById("error").style.display = "none";
  document.getElementById("loadingMessage").textContent =
    "Fetching issues from GitLab...";

  try {
    const dataManager = new DataManager(apiClient);

    const data = await dataManager.fetchAllData(
      gitlabUrl,
      projectId,
      accessToken,
      (message) => {
        document.getElementById("loadingMessage").textContent = message;
      },
    );

    allData.issues = data.issues;
    allData.rawTimeEntries = data.rawTimeEntries;

    console.log(
      `Successfully loaded ${allData.rawTimeEntries.length} time entries from ${allData.issues.length} issues`,
    );

    filterManager.loadMilestones();
    filterManager.applyDateFilter();
    UIManager.showLoading(false);
  } catch (error) {
    console.error("Error fetching data:", error);
    UIManager.showError(`Failed to load data: ${error.message}`);
    UIManager.showLoading(false);
  }
}

function updateAnalytics() {
  if (typeof AnalyticsCalculator === "undefined") return;
  allData.analytics = AnalyticsCalculator.computeAll(
    allData.issues,
    allData.filteredTimeEntries,
  );
  console.log("Analytics computed", allData.analytics);

  allData.analyticsTimestamp = new Date();
  updateAnalyticsTimestamp();
  generateAnalyticsAlerts();
}

function updateAnalyticsTimestamp() {
  const timestampEl = document.getElementById("analyticsTimestamp");
  if (!timestampEl || !allData.analyticsTimestamp) return;

  const timeStr = allData.analyticsTimestamp.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  timestampEl.textContent = `Last updated: ${timeStr}`;
}

function generateAnalyticsAlerts() {
  if (!allData.analytics) return;

  const alertsContainer = document.getElementById("analyticsAlerts");
  if (!alertsContainer) return;

  alertsContainer.innerHTML = "";
  const alerts = [];

  if (allData.analytics.burnout && allData.analytics.burnout.length > 0) {
    const highRisk = allData.analytics.burnout.filter((b) => b.risk === "high");
    if (highRisk.length > 0) {
      alerts.push({
        type: "error",
        icon: "⚠️",
        title: "High Burnout Risk Detected",
        message: `${highRisk.length} team member(s) working over ${analyticsThresholds.burnoutHigh}h/week on average`,
        action: {
          label: "View Details",
          onClick: "showBurnoutDetails()",
        },
      });
    }
  }

  if (allData.analytics.stalled && allData.analytics.stalled.length > 0) {
    const criticalStalled = allData.analytics.stalled.filter(
      (s) => s.daysSince > analyticsThresholds.stalled * 2,
    );
    if (criticalStalled.length > 0) {
      alerts.push({
        type: "warning",
        icon: "⏸️",
        title: "Critical Stalled Issues",
        message: `${criticalStalled.length} issue(s) with no activity for over ${analyticsThresholds.stalled * 2} days`,
        action: { label: "View Issues", onClick: "showStalledDetails()" },
      });
    }
  }

  if (allData.analytics.rework && allData.analytics.rework.length > 0) {
    const highRework = allData.analytics.rework.filter(
      (r) => r.reworkPct > analyticsThresholds.rework,
    );
    if (highRework.length > 0) {
      alerts.push({
        type: "warning",
        icon: "🔄",
        title: "High Rework Detected",
        message: `${highRework.length} issue(s) with over ${analyticsThresholds.rework}% time spent on rework`,
        action: {
          label: "View Analysis",
          onClick: "showReworkDetails()",
        },
      });
    }
  }

  alerts.forEach((alert) => {
    const alertEl = document.createElement("div");
    alertEl.className = `analytics-alert alert-${alert.type}`;
    alertEl.innerHTML = `
      <div class="analytics-alert-icon">${alert.icon}</div>
      <div class="analytics-alert-content">
        <div class="analytics-alert-title">${alert.title}</div>
        <div class="analytics-alert-message">${alert.message}</div>
        ${
          alert.action
            ? `
          <div class="analytics-alert-actions">
            <button class="analytics-alert-button" onclick="${alert.action.onClick}">
              ${alert.action.label}
            </button>
          </div>
        `
            : ""
        }
      </div>
    `;
    alertsContainer.appendChild(alertEl);
  });
}

function configureThresholds(metricType) {
  const thresholdConfigs = {
    stalled: [
      {
        key: "stalled",
        label: "Stalled Days",
        value: analyticsThresholds.stalled,
        unit: "days",
      },
    ],
    burnout: [
      {
        key: "burnoutHigh",
        label: "High Risk",
        value: analyticsThresholds.burnoutHigh,
        unit: "hrs/week",
      },
      {
        key: "burnoutLow",
        label: "Low Risk",
        value: analyticsThresholds.burnoutLow,
        unit: "hrs/week",
      },
    ],
    rework: [
      {
        key: "rework",
        label: "Rework %",
        value: analyticsThresholds.rework,
        unit: "%",
      },
    ],
    anomalies: [
      {
        key: "largeEntry",
        label: "Large Entry",
        value: analyticsThresholds.largeEntry,
        unit: "hours",
      },
      {
        key: "tinyEntry",
        label: "Tiny Entry",
        value: analyticsThresholds.tinyEntry,
        unit: "hours",
      },
    ],
    estimation: [
      {
        key: "overEstimate",
        label: "Over %",
        value: analyticsThresholds.overEstimate,
        unit: "%",
      },
      {
        key: "underEstimate",
        label: "Under %",
        value: analyticsThresholds.underEstimate,
        unit: "%",
      },
    ],
    workload: [],
  };

  const configs = thresholdConfigs[metricType];
  if (!configs || configs.length === 0) {
    UIManager.showToast("No configurable thresholds for this metric", "info");
    return;
  }

  let formHtml = '<div class="threshold-config">';
  configs.forEach((config) => {
    formHtml += `
      <div class="threshold-item">
        <label>${config.label} (${config.unit})</label>
        <input type="number" id="threshold_${config.key}" value="${config.value}" min="0" step="0.25" />
      </div>
    `;
  });
  formHtml += "</div>";

  const modalContent = `
    <h3>Configure ${metricType.charAt(0).toUpperCase() + metricType.slice(1)} Thresholds</h3>
    ${formHtml}
    <div style="margin-top: 16px; display: flex; gap: 8px;">
      <button onclick="saveThresholdChanges('${metricType}')" style="padding: 8px 16px; background: var(--button-primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
        Save
      </button>
      <button onclick="UIManager.closeModal()" style="padding: 8px 16px; background: var(--bg-secondary); color: var(--text-primary); border: none; border-radius: 4px; cursor: pointer;">
        Cancel
      </button>
    </div>
  `;

  UIManager.showModal("Configure Thresholds", modalContent);
}

function saveThresholdChanges(metricType) {
  const inputs = document.querySelectorAll('[id^="threshold_"]');
  inputs.forEach((input) => {
    const key = input.id.replace("threshold_", "");
    const value = parseFloat(input.value);
    if (!isNaN(value) && value >= 0) {
      analyticsThresholds[key] = value;
    }
  });

  saveThresholds();
  UIManager.closeModal();
  updateAnalytics();
  renderDashboard();
}

function switchTab(tabName) {
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach((tab) => (tab.style.display = "none"));

  const buttons = document.querySelectorAll(".tab-button");
  buttons.forEach((btn) => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });

  const selectedTab = document.getElementById(`tab-${tabName}`);
  if (selectedTab) {
    selectedTab.style.display = "block";
  }

  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeButton) {
    activeButton.classList.add("active");
    activeButton.setAttribute("aria-selected", "true");
  }

  window.location.hash = `tab=${tabName}`;

  if (tabName === "overview" && allData.cumulativeChart) {
    setTimeout(() => {
      allData.cumulativeChart.resize();
    }, 100);
  }
}

function restoreTabState() {
  const hash = window.location.hash;
  const tabMatch = hash.match(/tab=([a-z]+)/);
  const tabName = tabMatch ? tabMatch[1] : "overview";

  if (document.getElementById(`tab-${tabName}`)) {
    switchTab(tabName);
  }
}

function renderDashboard() {
  const timeEntries = allData.filteredTimeEntries;

  const memberStats = {};
  timeEntries.forEach((entry) => {
    if (!memberStats[entry.username]) {
      memberStats[entry.username] = {
        name: entry.author,
        username: entry.username,
        hours: 0,
        pbiCount: new Set(),
      };
    }
    memberStats[entry.username].hours += entry.hours;
    memberStats[entry.username].pbiCount.add(entry.issueId);
  });

  Object.values(memberStats).forEach((member) => {
    member.pbiCount = member.pbiCount.size;
  });

  const memberArray = Object.values(memberStats);
  const maxMemberHours = Math.max(...memberArray.map((m) => m.hours), 0);
  const totalHours = memberArray.reduce((sum, m) => sum + m.hours, 0);
  const uniquePbis = new Set(timeEntries.map((e) => e.issueId));

  document.getElementById("totalHours").textContent =
    totalHours.toFixed(1) + "h";
  document.getElementById("totalPbis").textContent = uniquePbis.size;
  document.getElementById("totalMembers").textContent = memberArray.length;
  document.getElementById("avgHours").textContent =
    memberArray.length > 0
      ? (totalHours / memberArray.length).toFixed(1) + "h"
      : "0h";

  ChartRenderer.renderCumulativeChart(timeEntries, memberStats);
  TableRenderer.renderPbiTable(timeEntries);
  TableRenderer.renderMemberTable(memberArray, maxMemberHours);
  filterManager.updateFilterStatusBar();
  renderAnalytics();

  document.getElementById("dashboard").style.display = "block";
}

function renderAnalytics() {
  if (!allData.analytics) return;

  ChartRenderer.renderWorkloadChart(allData.analytics.workload);
  TableRenderer.renderStalledIssues(allData.analytics.stalled);
  TableRenderer.renderReworkAnalysis(allData.analytics.rework);
  TableRenderer.renderAnomalies(allData.analytics.anomalies);
  TableRenderer.renderBurnoutRisk(allData.analytics.burnout);
  ChartRenderer.renderEstimationChart(allData.analytics.estimation);
}

function showMemberDetails(username) {
  const memberEntries = allData.filteredTimeEntries
    .filter((e) => e.username === username)
    .sort((a, b) => b.date.localeCompare(a.date));

  const member = memberEntries[0];
  if (!member) return;

  const totalHours = memberEntries.reduce((sum, e) => sum + e.hours, 0);
  const entryCount = memberEntries.length;

  document.getElementById("modalTitle").textContent =
    `${member.author} - ${entryCount} ${entryCount === 1 ? "Entry" : "Entries"} (Total: ${totalHours.toFixed(1)}h)`;

  const modalBody = document.getElementById("modalBody");

  if (memberEntries.length === 0) {
    modalBody.innerHTML = `
      <div class="empty-state">
        <p>No time entries found for this date range</p>
      </div>
    `;
  } else {
    modalBody.innerHTML = memberEntries
      .map((entry) => {
        let comment = "";
        if (entry.summary && entry.summary.trim().length > 0) {
          const escapedSummary = entry.summary
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
          comment = `<div class="time-entry-comment">${escapedSummary}</div>`;
        }

        const isNegative = entry.hours < 0;
        const negativeClass = isNegative ? "negative" : "";
        const hoursDisplay = isNegative
          ? `${entry.hours.toFixed(1)}h`
          : `${entry.hours.toFixed(1)}h`;

        return `
          <div class="time-entry ${negativeClass}">
            <div class="time-entry-info">
              <div class="time-entry-date">${entry.date}</div>
              <div class="time-entry-pbi">#${entry.issueId}: ${entry.issueTitle}</div>
              ${comment}
            </div>
            <div class="time-entry-hours ${negativeClass}">${hoursDisplay}</div>
          </div>
        `;
      })
      .join("");
  }

  const modal = document.getElementById("timeEntriesModal");
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

// Detailed drill-down modal functions
function showWorkloadDetails() {
  if (!allData.analytics || !allData.analytics.workload) {
    UIManager.showToast("No workload data available", "info");
    return;
  }

  const workload = allData.analytics.workload;
  let content = '<div style="max-height: 400px; overflow-y: auto;">';
  content += '<table style="width: 100%; border-collapse: collapse;">';
  content +=
    '<thead><tr><th style="text-align: left; padding: 8px; border-bottom: 2px solid var(--border-color);">Member</th>';
  content +=
    '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Total Hours</th>';
  content +=
    '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Utilization</th></tr></thead>';
  content += "<tbody>";

  workload.forEach((member) => {
    const utilization = member.utilization
      ? `${(member.utilization * 100).toFixed(1)}%`
      : "N/A";
    const memberName = member.name || member.username || "Unknown";
    content += `<tr>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light);">${memberName}</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right;">${member.hours.toFixed(2)}h</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right;">${utilization}</td>
    </tr>`;
  });

  content += "</tbody></table></div>";
  UIManager.showModal("Workload Distribution Details", content);
}

function showStalledDetails() {
  if (
    !allData.analytics ||
    !allData.analytics.stalled ||
    allData.analytics.stalled.length === 0
  ) {
    UIManager.showToast("No stalled issues found", "info");
    return;
  }

  const stalled = allData.analytics.stalled;
  let content = '<div style="max-height: 400px; overflow-y: auto;">';
  content +=
    '<p style="margin-bottom: 16px; color: var(--text-secondary);">Issues with no activity for over ' +
    analyticsThresholds.stalled +
    " days.</p>";
  content += '<table style="width: 100%; border-collapse: collapse;">';
  content +=
    '<thead><tr><th style="text-align: left; padding: 8px; border-bottom: 2px solid var(--border-color);">Issue</th>';
  content +=
    '<th style="text-align: left; padding: 8px; border-bottom: 2px solid var(--border-color);">Last Activity</th>';
  content +=
    '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Days Since</th></tr></thead>';
  content += "<tbody>";

  stalled.forEach((issue) => {
    const daysSince = Math.floor(issue.daysSince);
    const badgeClass =
      daysSince > analyticsThresholds.stalled * 2 ? "error" : "warning";
    const issueId = issue.issueId || issue.iid || "N/A";
    const lastActivity = issue.lastEntryDate || issue.lastEntry || "Unknown";
    content += `<tr>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light);">#${issueId}: ${issue.title}</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light);">${lastActivity}</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right;">
        <span class="badge badge-${badgeClass}">${daysSince} days</span>
      </td>
    </tr>`;
  });

  content += "</tbody></table></div>";
  UIManager.showModal("Stalled Issues Details", content);
}

function showReworkDetails() {
  if (
    !allData.analytics ||
    !allData.analytics.rework ||
    allData.analytics.rework.length === 0
  ) {
    UIManager.showToast("No rework detected", "info");
    return;
  }

  const rework = allData.analytics.rework;
  let content = '<div style="max-height: 400px; overflow-y: auto;">';
  content +=
    '<p style="margin-bottom: 16px; color: var(--text-secondary);">Issues with negative time entries indicating rework or corrections.</p>';
  content += '<table style="width: 100%; border-collapse: collapse;">';
  content +=
    '<thead><tr><th style="text-align: left; padding: 8px; border-bottom: 2px solid var(--border-color);">Issue</th>';
  content +=
    '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Negative Hours</th>';
  content +=
    '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Total Hours</th>';
  content +=
    '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Rework %</th></tr></thead>';
  content += "<tbody>";

  rework.forEach((issue) => {
    const badgeClass =
      issue.reworkPct > analyticsThresholds.rework ? "error" : "warning";
    content += `<tr>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light);">#${issue.iid}: ${issue.title}</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right; color: var(--error-text);">${Math.abs(issue.negativeHours).toFixed(2)}h</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right;">${issue.totalHours.toFixed(2)}h</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right;">
        <span class="badge badge-${badgeClass}">${issue.reworkPct.toFixed(1)}%</span>
      </td>
    </tr>`;
  });

  content += "</tbody></table></div>";
  UIManager.showModal("Rework Analysis Details", content);
}

function showAnomaliesDetails() {
  if (
    !allData.analytics ||
    !allData.analytics.anomalies ||
    allData.analytics.anomalies.length === 0
  ) {
    UIManager.showToast("No anomalies detected", "info");
    return;
  }

  const anomalies = allData.analytics.anomalies;
  let content = '<div style="max-height: 400px; overflow-y: auto;">';
  content +=
    '<p style="margin-bottom: 16px; color: var(--text-secondary);">Unusual time entries detected based on configured thresholds.</p>';
  content += '<table style="width: 100%; border-collapse: collapse;">';
  content +=
    '<thead><tr><th style="text-align: left; padding: 8px; border-bottom: 2px solid var(--border-color);">Date</th>';
  content +=
    '<th style="text-align: left; padding: 8px; border-bottom: 2px solid var(--border-color);">Issue</th>';
  content +=
    '<th style="text-align: left; padding: 8px; border-bottom: 2px solid var(--border-color);">Member</th>';
  content +=
    '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Hours</th>';
  content +=
    '<th style="text-align: left; padding: 8px; border-bottom: 2px solid var(--border-color);">Reason</th></tr></thead>';
  content += "<tbody>";

  anomalies.forEach((entry) => {
    const issueId = entry.issueId || entry.iid || "N/A";
    const memberName =
      entry.author || entry.username || entry.member || "Unknown";
    const reason = Array.isArray(entry.reasons)
      ? entry.reasons.join(", ")
      : entry.reason || "Unknown";
    content += `<tr>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light);">${entry.date}</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light);">#${issueId}</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light);">${memberName}</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right;">${Math.abs(entry.hours).toFixed(2)}h</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light);">
        <span class="badge badge-warning">${reason}</span>
      </td>
    </tr>`;
  });

  content += "</tbody></table></div>";
  UIManager.showModal("Anomalies Details", content);
}

function showBurnoutDetails() {
  if (
    !allData.analytics ||
    !allData.analytics.burnout ||
    allData.analytics.burnout.length === 0
  ) {
    UIManager.showToast("No burnout risk data available", "info");
    return;
  }

  const burnout = allData.analytics.burnout;
  let content = '<div style="max-height: 400px; overflow-y: auto;">';
  content +=
    '<p style="margin-bottom: 16px; color: var(--text-secondary);">Rolling 4-week average hours per team member. High risk: >' +
    analyticsThresholds.burnoutHigh +
    "h/week</p>";
  content += '<table style="width: 100%; border-collapse: collapse;">';
  content +=
    '<thead><tr><th style="text-align: left; padding: 8px; border-bottom: 2px solid var(--border-color);">Member</th>';
  content +=
    '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Avg Hours/Week</th>';
  content +=
    '<th style="text-align: center; padding: 8px; border-bottom: 2px solid var(--border-color);">Risk Level</th></tr></thead>';
  content += "<tbody>";

  burnout.forEach((member) => {
    const badgeClass =
      member.risk === "high"
        ? "error"
        : member.risk === "low"
          ? "info"
          : "success";
    content += `<tr>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light);">${member.member}</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right;">${member.avgHoursPerWeek.toFixed(2)}h</td>
      <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: center;">
        <span class="badge badge-${badgeClass}">${member.risk.toUpperCase()}</span>
      </td>
    </tr>`;
  });

  content += "</tbody></table></div>";
  UIManager.showModal("Burnout Risk Details", content);
}

function showEstimationDetails() {
  if (!allData.analytics || !allData.analytics.estimation) {
    UIManager.showToast("No estimation data available", "info");
    return;
  }

  const estimation = allData.analytics.estimation;
  const totalIssues = estimation.results ? estimation.results.length : 0;
  const summary = estimation.summary || {
    under: 0,
    accurate: 0,
    over: 0,
  };

  let content = '<div style="max-height: 400px; overflow-y: auto;">';
  content +=
    '<div style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 6px;">';
  content += '<h4 style="margin: 0 0 8px 0;">Summary</h4>';
  content +=
    '<p style="margin: 4px 0; color: var(--text-secondary);">Total Issues: <strong>' +
    totalIssues +
    "</strong></p>";
  content +=
    '<p style="margin: 4px 0; color: var(--text-secondary);">Accurately Estimated: <strong>' +
    summary.accurate +
    "</strong> (" +
    (totalIssues > 0
      ? ((summary.accurate / totalIssues) * 100).toFixed(1)
      : "0.0") +
    "%)</p>";
  content +=
    '<p style="margin: 4px 0; color: var(--text-secondary);">Under-Estimated: <strong>' +
    summary.under +
    "</strong> (" +
    (totalIssues > 0
      ? ((summary.under / totalIssues) * 100).toFixed(1)
      : "0.0") +
    "%)</p>";
  content +=
    '<p style="margin: 4px 0; color: var(--text-secondary);">Over-Estimated: <strong>' +
    summary.over +
    "</strong> (" +
    (totalIssues > 0
      ? ((summary.over / totalIssues) * 100).toFixed(1)
      : "0.0") +
    "%)</p>";
  content += "</div>";

  if (estimation.results && estimation.results.length > 0) {
    content += '<h4 style="margin: 16px 0 8px 0;">Individual Issues</h4>';
    content += '<table style="width: 100%; border-collapse: collapse;">';
    content +=
      '<thead><tr><th style="text-align: left; padding: 8px; border-bottom: 2px solid var(--border-color);">Issue</th>';
    content +=
      '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Estimated</th>';
    content +=
      '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Actual</th>';
    content +=
      '<th style="text-align: right; padding: 8px; border-bottom: 2px solid var(--border-color);">Variance</th></tr></thead>';
    content += "<tbody>";

    estimation.results.forEach((issue) => {
      const issueId = issue.issueId || issue.iid || "N/A";
      const estimated = issue.estimateHours || 0;
      const actual = issue.actualHours || 0;
      const variance = actual - estimated;
      const variancePct = estimated > 0 ? (variance / estimated) * 100 : 0;
      const badgeClass =
        Math.abs(variancePct) <= 10
          ? "success"
          : variancePct > 0
            ? "warning"
            : "info";

      content += `<tr>
        <td style="padding: 8px; border-bottom: 1px solid var(--border-light);">#${issueId}: ${issue.title}</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right;">${estimated.toFixed(2)}h</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right;">${actual.toFixed(2)}h</td>
        <td style="padding: 8px; border-bottom: 1px solid var(--border-light); text-align: right;">
          <span class="badge badge-${badgeClass}">${variance > 0 ? "+" : ""}${variance.toFixed(2)}h (${variancePct > 0 ? "+" : ""}${variancePct.toFixed(1)}%)</span>
        </td>
      </tr>`;
    });

    content += "</tbody></table>";
  }

  content += "</div>";
  UIManager.showModal("Estimation Accuracy Details", content);
}

// Close modal when clicking outside
window.onclick = function (event) {
  const timeEntriesModal = document.getElementById("timeEntriesModal");
  const projectBrowserModal = document.getElementById("projectBrowserModal");

  if (event.target === timeEntriesModal) {
    UIManager.closeModal();
  }
  if (event.target === projectBrowserModal) {
    projectBrowser.closeProjectBrowser();
  }
};

// Setup validation
const gitlabUrlInput = document.getElementById("gitlabUrl");
if (gitlabUrlInput) {
  gitlabUrlInput.addEventListener("blur", () => {
    if (!UIManager.validateGitlabUrl()) {
      UIManager.showToast("Enter a valid GitLab URL (https://...)", "warning");
    }
  });
}

// Global function wrappers for onclick handlers
function toggleDarkMode() {
  if (themeManager) {
    themeManager.toggleDarkMode();
  }
}

function showProjectBrowser() {
  if (projectBrowser) {
    projectBrowser.showProjectBrowser();
  }
}

function toggleFilterType() {
  if (filterManager) {
    filterManager.toggleFilterType();
  }
}

function applyFilter() {
  if (filterManager) {
    filterManager.applyFilter();
  }
}

function selectProject(projectId, projectName) {
  if (projectBrowser) {
    projectBrowser.selectProject(projectId, projectName);
  }
}

async function copyProjectId(projectId, event) {
  if (projectBrowser) {
    await projectBrowser.copyProjectId(projectId, event);
  }
}

function closeProjectBrowser() {
  if (projectBrowser) {
    projectBrowser.closeProjectBrowser();
  }
}

function selectAllFilters() {
  if (projectBrowser) {
    projectBrowser.selectAllFilters();
  }
}

function clearAllFilters() {
  if (projectBrowser) {
    projectBrowser.clearAllFilters();
  }
}

function searchProjects() {
  if (projectBrowser) {
    projectBrowser.searchProjects();
  }
}

function closeModal() {
  UIManager.closeModal();
}
