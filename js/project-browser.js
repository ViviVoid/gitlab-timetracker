// ========== PROJECT BROWSER CLASS ==========
class ProjectBrowser {
  async showProjectBrowser() {
    const gitlabUrl = document.getElementById("gitlabUrl").value.trim();
    const accessToken = document.getElementById("accessToken").value.trim();

    if (!gitlabUrl || !accessToken) {
      UIManager.showError("Please enter GitLab URL and Access Token first");
      return;
    }

    const modal = document.getElementById("projectBrowserModal");
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    // Auto-search on open
    this.searchProjects();
  }

  async searchProjects() {
    const gitlabUrl = document.getElementById("gitlabUrl").value.trim();
    const accessToken = document.getElementById("accessToken").value.trim();

    document.getElementById("projectsLoading").style.display = "block";
    document.getElementById("projectsList").innerHTML = "";

    // Get filter options
    const filterStarred = document.getElementById("filterStarred").checked;
    const filterMember = document.getElementById("filterMember").checked;
    const filterOwned = document.getElementById("filterOwned").checked;
    const filterInactive = document.getElementById("filterInactive").checked;
    const searchText = document
      .getElementById("projectSearch")
      .value.trim()
      .toLowerCase();

    // Check if at least one filter is selected
    if (!filterStarred && !filterMember && !filterOwned && !filterInactive) {
      document.getElementById("projectsLoading").style.display = "none";
      document.getElementById("projectsList").innerHTML =
        '<div class="empty-state"><p>Please select at least one filter option</p></div>';
      document.getElementById("projectsResultCount").textContent = "";
      return;
    }

    try {
      let allProjects = [];

      // Fetch starred projects
      if (filterStarred) {
        const starredProjects = await this.fetchAllPages(
          `${gitlabUrl}/api/v4/projects?starred=true&per_page=100`,
          accessToken,
        );
        allProjects = allProjects.concat(
          starredProjects.map((p) => ({ ...p, source: "starred" })),
        );
      }

      // Fetch projects user is a member of
      if (filterMember) {
        const memberProjects = await this.fetchAllPages(
          `${gitlabUrl}/api/v4/projects?membership=true&per_page=100&order_by=last_activity_at`,
          accessToken,
        );
        allProjects = allProjects.concat(
          memberProjects.map((p) => ({ ...p, source: "member" })),
        );
      }

      // Fetch projects owned by user
      if (filterOwned) {
        const ownedProjects = await this.fetchAllPages(
          `${gitlabUrl}/api/v4/projects?owned=true&per_page=100`,
          accessToken,
        );
        allProjects = allProjects.concat(
          ownedProjects.map((p) => ({ ...p, source: "owned" })),
        );
      }

      // Fetch archived projects
      if (filterInactive) {
        const archivedProjects = await this.fetchAllPages(
          `${gitlabUrl}/api/v4/projects?archived=true&per_page=100`,
          accessToken,
        );
        allProjects = allProjects.concat(
          archivedProjects.map((p) => ({ ...p, source: "archived" })),
        );
      }

      // Remove duplicates by project ID (keep first occurrence)
      const uniqueProjects = [];
      const seenIds = new Set();
      allProjects.forEach((project) => {
        if (!seenIds.has(project.id)) {
          seenIds.add(project.id);
          uniqueProjects.push(project);
        }
      });

      // Filter by search text
      let filteredProjects = uniqueProjects;
      if (searchText) {
        filteredProjects = uniqueProjects.filter(
          (project) =>
            project.name.toLowerCase().includes(searchText) ||
            project.path_with_namespace.toLowerCase().includes(searchText),
        );
      }

      // Sort by last activity
      filteredProjects.sort(
        (a, b) => new Date(b.last_activity_at) - new Date(a.last_activity_at),
      );

      document.getElementById("projectsLoading").style.display = "none";

      // Display result count
      document.getElementById("projectsResultCount").textContent =
        `Found ${filteredProjects.length} project${filteredProjects.length === 1 ? "" : "s"}`;

      const projectsList = document.getElementById("projectsList");
      if (filteredProjects.length === 0) {
        projectsList.innerHTML =
          '<div class="empty-state"><p>No projects found</p></div>';
      } else {
        projectsList.innerHTML = filteredProjects
          .map((project) => {
            const escapedName = project.name
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;");
            const escapedPath = project.path_with_namespace
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;");

            // Add badges
            let badges = "";
            if (project.star_count > 0)
              badges += '<span class="badge badge-starred">Starred</span>';
            if (project.archived)
              badges += '<span class="badge badge-archived">Archived</span>';

            // Check if current user owns the project
            if (
              project.owner &&
              project.permissions &&
              project.permissions.project_access
            ) {
              const accessLevel =
                project.permissions.project_access.access_level;
              if (accessLevel >= 50)
                badges += '<span class="badge badge-owned">Owner</span>';
            }

            return `
              <div class="project-item" onclick="selectProject(${project.id}, '${escapedName.replace(/'/g, "\\'")}')" onkeydown="if(event.key==='Enter') selectProject(${project.id}, '${escapedName.replace(/'/g, "\\'")}')" role="button" tabindex="0" aria-label="Select project ${escapedName}">
                <div class="project-info">
                  <div class="project-name">${badges}${escapedName}</div>
                  <div class="project-path">${escapedPath}</div>
                </div>
                <div class="project-id">#${project.id}</div>
                <button type="button" class="copy-id-btn" onclick="copyProjectId(${project.id}, event)" aria-label="Copy project ID ${project.id}">Copy ID</button>
              </div>
            `;
          })
          .join("");
      }
    } catch (error) {
      document.getElementById("projectsLoading").style.display = "none";
      UIManager.showError(error.message);
    }
  }

  async fetchAllPages(url, accessToken) {
    let allItems = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      // Limit to 10 pages per type
      const response = await apiClient.fetch(`${url}&page=${page}`, {
        headers: {
          "PRIVATE-TOKEN": accessToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const items = await response.json();
      if (items.length === 0) {
        hasMore = false;
      } else {
        allItems = allItems.concat(items);
        page++;
      }
    }

    return allItems;
  }

  selectProject(projectId, projectName) {
    document.getElementById("projectId").value = projectId;
    this.closeProjectBrowser();
    UIManager.showSuccess(`Selected project: ${projectName}`);
  }

  async copyProjectId(projectId, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(String(projectId));
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = String(projectId);
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      UIManager.showToast(`Copied project ID ${projectId}`, "success");
    } catch (error) {
      UIManager.showToast("Failed to copy project ID", "error");
    }
  }

  closeProjectBrowser() {
    const modal = document.getElementById("projectBrowserModal");
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  selectAllFilters() {
    document.getElementById("filterStarred").checked = true;
    document.getElementById("filterMember").checked = true;
    document.getElementById("filterOwned").checked = true;
    document.getElementById("filterInactive").checked = true;
  }

  clearAllFilters() {
    document.getElementById("filterStarred").checked = false;
    document.getElementById("filterMember").checked = false;
    document.getElementById("filterOwned").checked = false;
    document.getElementById("filterInactive").checked = false;
  }
}
