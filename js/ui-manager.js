// ========== UI MANAGER CLASS ==========
class UIManager {
  static showToast(message, type = "info", timeout = 3500) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, timeout);
  }

  static showError(message) {
    const errorDiv = document.getElementById("error");
    errorDiv.textContent = message;
    errorDiv.classList.remove("success");
    errorDiv.classList.add("error");
    errorDiv.style.display = "block";
    this.showToast(message, "error");
    setTimeout(() => {
      errorDiv.style.display = "none";
    }, 5000);
  }

  static showSuccess(message) {
    const errorDiv = document.getElementById("error");
    errorDiv.textContent = message;
    errorDiv.classList.remove("error");
    errorDiv.classList.add("success");
    errorDiv.style.display = "block";
    this.showToast(message, "success");
    setTimeout(() => {
      errorDiv.style.display = "none";
    }, 3000);
  }

  static showLoading(show) {
    document.getElementById("loading").style.display = show ? "block" : "none";
    document.getElementById("dashboard").style.display = show
      ? "none"
      : "block";
  }

  static showModal(title, bodyContent) {
    const modal = document.getElementById("timeEntriesModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");

    modalTitle.textContent = title;
    modalBody.innerHTML = bodyContent;

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
  }

  static closeModal() {
    const modal = document.getElementById("timeEntriesModal");
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  static setValidationState(input, state) {
    if (!input) return;
    input.classList.remove("input-error", "input-success");
    if (state === "error") input.classList.add("input-error");
    if (state === "success") input.classList.add("input-success");
  }

  static validateGitlabUrl() {
    const input = document.getElementById("gitlabUrl");
    if (!input) return true;
    const value = input.value.trim();
    if (!value) {
      this.setValidationState(input, null);
      return false;
    }

    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        this.setValidationState(input, "error");
        return false;
      }
      this.setValidationState(input, "success");
      return true;
    } catch (error) {
      this.setValidationState(input, "error");
      return false;
    }
  }
}
