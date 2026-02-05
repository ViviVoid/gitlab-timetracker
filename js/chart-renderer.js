// ========== CHART RENDERER CLASS ==========
class ChartRenderer {
  static getChartColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      text: styles.getPropertyValue("--chart-text") || "#333",
      grid: styles.getPropertyValue("--chart-grid") || "#e0e0e0",
      line: styles.getPropertyValue("--button-primary") || "#667eea",
      fill: (styles.getPropertyValue("--button-primary") || "#667eea") + "66",
    };
  }

  static renderCumulativeChart(timeEntries, memberStats) {
    // Sort entries by date
    const sortedEntries = [...timeEntries].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    if (sortedEntries.length === 0) {
      return;
    }

    // Get all unique dates in range
    const allDates = [...new Set(sortedEntries.map((e) => e.date))].sort();

    // Get all members
    const members = Object.keys(memberStats).sort();

    // Generate color palette
    const colors = [
      "#667eea",
      "#764ba2",
      "#f093fb",
      "#4facfe",
      "#43e97b",
      "#fa709a",
      "#fee140",
      "#30cfd0",
      "#a8edea",
      "#fed6e3",
      "#c471ed",
      "#f64f59",
    ];

    // Build cumulative data for each member
    const datasets = members.map((username, index) => {
      const memberData = {};
      let cumulative = 0;

      allDates.forEach((date) => {
        const dayEntries = sortedEntries.filter(
          (e) => e.username === username && e.date === date
        );
        const dayHours = dayEntries.reduce((sum, e) => sum + e.hours, 0);
        cumulative += dayHours;
        memberData[date] = cumulative;
      });

      return {
        label: memberStats[username].name,
        data: allDates.map((date) => memberData[date] || 0),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + "20",
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: colors[index % colors.length],
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      };
    });

    // Destroy existing chart
    if (window.allData.cumulativeChart) {
      window.allData.cumulativeChart.destroy();
    }

    // Create new chart
    const ctx = document.getElementById("cumulativeChart").getContext("2d");
    window.allData.cumulativeChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: allDates,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              usePointStyle: true,
              padding: 15,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return (
                  context.dataset.label +
                  ": " +
                  context.parsed.y.toFixed(1) +
                  "h"
                );
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return value + "h";
              },
            },
            title: {
              display: true,
              text: "Cumulative Hours",
            },
          },
          x: {
            title: {
              display: true,
              text: "Date",
            },
          },
        },
      },
    });
  }

  static renderWorkloadChart(workload) {
    const canvas = document.getElementById("workloadChart");
    if (!canvas) return;

    const labels = workload.map((m) => m.name || m.username);
    const data = workload.map((m) => Number(m.hours.toFixed(2)));

    if (window.allData.analyticsCharts.workload) {
      window.allData.analyticsCharts.workload.destroy();
    }

    const colors = this.getChartColors();
    window.allData.analyticsCharts.workload = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Hours",
            data,
            backgroundColor: colors.fill,
            borderColor: colors.line,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: colors.text },
            grid: { color: colors.grid },
          },
          y: { ticks: { color: colors.text }, grid: { display: false } },
        },
      },
    });
  }

  static renderEstimationChart(estimation) {
    const summary = document.getElementById("estimationSummary");
    const canvas = document.getElementById("estimationChart");
    if (!summary || !canvas) return;

    summary.textContent = `Under: ${estimation.summary.under}, Accurate: ${estimation.summary.accurate}, Over: ${estimation.summary.over}`;

    if (window.allData.analyticsCharts.estimation) {
      window.allData.analyticsCharts.estimation.destroy();
    }

    const colors = this.getChartColors();
    const dataset = estimation.results.map((item) => ({
      x: item.estimateHours,
      y: item.actualHours,
    }));

    window.allData.analyticsCharts.estimation = new Chart(canvas, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Estimate vs Actual",
            data: dataset,
            backgroundColor: colors.fill,
            borderColor: colors.line,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: "Estimate (h)",
              color: colors.text,
            },
            ticks: { color: colors.text },
            grid: { color: colors.grid },
          },
          y: {
            title: {
              display: true,
              text: "Actual (h)",
              color: colors.text,
            },
            ticks: { color: colors.text },
            grid: { color: colors.grid },
          },
        },
        plugins: { legend: { display: false } },
      },
    });
  }
}
