// ========== THEME MANAGER CLASS ==========
class ThemeManager {
  constructor() {
    this.initializeTheme();
    this.setupListeners();
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem("dashboard-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const theme = savedTheme || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);

    this.updateThemeToggleButton(theme);
    return theme;
  }

  toggleDarkMode() {
    const currentTheme =
      document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("dashboard-theme", newTheme);

    this.applyThemeToCharts();
    this.updateThemeToggleButton(newTheme);
  }

  updateThemeToggleButton(theme) {
    const themeToggle = document.getElementById("themeToggleBtn");
    if (themeToggle) {
      themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
      themeToggle.title =
        theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";
      themeToggle.setAttribute("aria-label", themeToggle.title);
    }
  }

  applyThemeToCharts() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";

    // Update cumulative chart if it exists
    if (window.allData && window.allData.cumulativeChart) {
      const chartTextColor = isDark ? "#e0e0e0" : "#333333";
      const chartGridColor = isDark ? "#444444" : "#e0e0e0";

      window.allData.cumulativeChart.options.plugins.legend.labels.color =
        chartTextColor;
      window.allData.cumulativeChart.options.scales.x.ticks.color = chartTextColor;
      window.allData.cumulativeChart.options.scales.x.grid.color = chartGridColor;
      window.allData.cumulativeChart.options.scales.y.ticks.color = chartTextColor;
      window.allData.cumulativeChart.options.scales.y.grid.color = chartGridColor;
      window.allData.cumulativeChart.update("none");
    }
  }

  setupListeners() {
    // Listen for system preference changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!localStorage.getItem("dashboard-theme")) {
          // Only auto-switch if user hasn't set a preference
          const theme = e.matches ? "dark" : "light";
          document.documentElement.setAttribute("data-theme", theme);
          this.applyThemeToCharts();
          this.updateThemeToggleButton(theme);
        }
      });
  }
}
