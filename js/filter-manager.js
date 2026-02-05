// ========== FILTER MANAGER CLASS ==========
class FilterManager {
  constructor() {
    this.dateFilter = {
      start: null,
      end: null,
      type: "date",
      milestoneId: null,
    };
  }

  initializeDateFilters() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    document.getElementById("startDate").valueAsDate = startDate;
    document.getElementById("endDate").valueAsDate = endDate;

    this.dateFilter.start = startDate.toISOString().split("T")[0];
    this.dateFilter.end = endDate.toISOString().split("T")[0];
  }

  toggleFilterType() {
    const filterType = document.getElementById("filterType").value;
    const dateRangeInputs = document.getElementById("dateRangeInputs");
    const milestoneInput = document.getElementById("milestoneInput");

    if (filterType === "date") {
      dateRangeInputs.style.display = "flex";
      milestoneInput.style.display = "none";
    } else {
      dateRangeInputs.style.display = "none";
      milestoneInput.style.display = "block";
    }
  }

  async loadMilestones() {
    const gitlabUrl = document.getElementById("gitlabUrl").value.trim();
    const accessToken = document.getElementById("accessToken").value.trim();
    const projectId = document.getElementById("projectId").value.trim();

    if (!gitlabUrl || !accessToken || !projectId) {
      return;
    }

    try {
      const response = await apiClient.fetch(
        `${gitlabUrl}/api/v4/projects/${projectId}/milestones?per_page=100`,
        {
          headers: {
            "PRIVATE-TOKEN": accessToken,
          },
        }
      );

      if (response.ok) {
        window.allData.milestones = await response.json();
        const milestoneSelect = document.getElementById("milestoneSelect");
        milestoneSelect.innerHTML =
          '<option value="">Select a milestone...</option>';

        window.allData.milestones.forEach((milestone) => {
          const option = document.createElement("option");
          option.value = milestone.id;
          option.textContent = milestone.title;
          milestoneSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.warn("Failed to load milestones:", error);
    }
  }

  applyFilter() {
    const filterType = document.getElementById("filterType").value;

    if (filterType === "date") {
      this.applyDateFilter();
    } else {
      this.applyMilestoneFilter();
    }
  }

  applyDateFilter() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    this.dateFilter.type = "date";
    this.dateFilter.start = startDate;
    this.dateFilter.end = endDate;

    // Filter time entries by date range
    window.allData.filteredTimeEntries = window.allData.rawTimeEntries.filter(
      (entry) => {
        return entry.date >= startDate && entry.date <= endDate;
      }
    );

    window.updateAnalytics();
    window.renderDashboard();
  }

  applyMilestoneFilter() {
    const milestoneId = document.getElementById("milestoneSelect").value;

    if (!milestoneId) {
      UIManager.showError("Please select a milestone");
      return;
    }

    const milestone = window.allData.milestones.find((m) => m.id == milestoneId);
    if (!milestone) {
      UIManager.showError("Milestone not found");
      return;
    }

    this.dateFilter.type = "milestone";
    this.dateFilter.milestoneId = milestoneId;
    this.dateFilter.start = milestone.start_date || null;
    this.dateFilter.end = milestone.due_date || null;

    // Filter time entries by milestone dates
    if (this.dateFilter.start && this.dateFilter.end) {
      window.allData.filteredTimeEntries = window.allData.rawTimeEntries.filter(
        (entry) => {
          return (
            entry.date >= this.dateFilter.start &&
            entry.date <= this.dateFilter.end
          );
        }
      );
    } else {
      // If milestone has no dates, show all entries
      window.allData.filteredTimeEntries = window.allData.rawTimeEntries;
    }

    window.updateAnalytics();
    window.renderDashboard();
  }

  updateFilterStatusBar() {
    const statusBar = document.getElementById("filterStatus");
    const filterType = document.getElementById("filterType").value;

    if (filterType === "date") {
      const startDate = document.getElementById("startDate").value;
      const endDate = document.getElementById("endDate").value;
      statusBar.textContent = `Viewing: ${startDate} → ${endDate}`;
    } else {
      const milestoneSelect = document.getElementById("milestoneSelect");
      const selectedMilestone =
        milestoneSelect.options[milestoneSelect.selectedIndex].text;
      statusBar.textContent = `Milestone: ${selectedMilestone}`;
    }
    statusBar.style.display =
      window.allData.filteredTimeEntries.length > 0 ? "block" : "none";
  }
}
