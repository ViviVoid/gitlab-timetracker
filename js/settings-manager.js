// ========== SETTINGS MANAGER CLASS ==========
class SettingsManager {
  static STORAGE_KEY = "gitlab-dashboard-settings";
  static REMEMBER_KEY = "gitlab-dashboard-remember";

  static saveSettings(url, projectId) {
    try {
      const settings = { url, projectId, timestamp: Date.now() };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.warn("Failed to save settings:", error);
      return false;
    }
  }

  static loadSettings() {
    try {
      const json = localStorage.getItem(this.STORAGE_KEY);
      return json ? JSON.parse(json) : {};
    } catch (error) {
      console.warn("Failed to load settings:", error);
      return {};
    }
  }

  static clearSettings() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.warn("Failed to clear settings:", error);
      return false;
    }
  }

  static saveRememberPreference(enabled) {
    try {
      localStorage.setItem(this.REMEMBER_KEY, JSON.stringify(!!enabled));
      return true;
    } catch (error) {
      console.warn("Failed to save remember preference:", error);
      return false;
    }
  }

  static loadRememberPreference() {
    try {
      const stored = localStorage.getItem(this.REMEMBER_KEY);
      return stored ? JSON.parse(stored) : true;
    } catch (error) {
      console.warn("Failed to load remember preference:", error);
      return true;
    }
  }
}
