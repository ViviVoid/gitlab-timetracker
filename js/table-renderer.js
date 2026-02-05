// ========== TABLE RENDERER CLASS ==========
class TableRenderer {
  static renderPbiTable(timeEntries) {
    // Group by PBI
    const pbiData = {};
    timeEntries.forEach((entry) => {
      if (!pbiData[entry.issueId]) {
        pbiData[entry.issueId] = {
          id: entry.issueId,
          title: entry.issueTitle,
          hours: 0,
          contributors: new Set(),
        };
      }
      pbiData[entry.issueId].hours += entry.hours;
      pbiData[entry.issueId].contributors.add(entry.author);
    });

    const pbiArray = Object.values(pbiData);
    const maxHours = Math.max(...pbiArray.map((p) => p.hours), 0);

    const pbiTableBody = document.getElementById("pbiTableBody");

    if (pbiArray.length === 0) {
      pbiTableBody.innerHTML = "";
      document.getElementById("noPbiData").style.display = "block";
    } else {
      document.getElementById("noPbiData").style.display = "none";
      pbiTableBody.innerHTML = pbiArray
        .sort((a, b) => b.hours - a.hours)
        .map((pbi) => {
          const contributors = Array.from(pbi.contributors).join(", ");
          const percentage = maxHours > 0 ? (pbi.hours / maxHours) * 100 : 0;

          return `
            <tr>
              <td>#${pbi.id}</td>
              <td>${pbi.title}</td>
              <td>${contributors}</td>
              <td class="hours">${pbi.hours.toFixed(1)}h</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
              </td>
            </tr>
          `;
        })
        .join("");
    }
  }

  static renderMemberTable(memberArray, maxMemberHours) {
    const memberTableBody = document.getElementById("memberTableBody");

    if (memberArray.length === 0) {
      memberTableBody.innerHTML = "";
      document.getElementById("noMemberData").style.display = "block";
    } else {
      document.getElementById("noMemberData").style.display = "none";
      memberTableBody.innerHTML = memberArray
        .sort((a, b) => b.hours - a.hours)
        .map((member) => {
          const percentage =
            maxMemberHours > 0 ? (member.hours / maxMemberHours) * 100 : 0;

          return `
            <tr class="member-row" onclick="showMemberDetails('${member.username}')">
              <td>${member.name}</td>
              <td>${member.pbiCount}</td>
              <td class="hours">${member.hours.toFixed(1)}h</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
              </td>
            </tr>
          `;
        })
        .join("");
    }
  }

  static renderStalledIssues(stalled) {
    const body = document.getElementById("stalledTableBody");
    const empty = document.getElementById("stalledEmpty");
    if (!body || !empty) return;

    if (!stalled.length) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    body.innerHTML = stalled
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 10)
      .map(
        (item) => `
          <tr>
            <td>#${item.issueId} ${item.title}</td>
            <td>${item.lastEntryDate}</td>
            <td>${item.daysSince}d</td>
          </tr>
        `
      )
      .join("");
  }

  static renderReworkAnalysis(rework) {
    const body = document.getElementById("reworkTableBody");
    const empty = document.getElementById("reworkEmpty");
    if (!body || !empty) return;

    if (!rework.length) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    body.innerHTML = rework
      .sort((a, b) => b.negativeHours - a.negativeHours)
      .slice(0, 10)
      .map(
        (item) => `
          <tr>
            <td>#${item.issueId} ${item.issueTitle}</td>
            <td>${item.negativeHours.toFixed(1)}h</td>
            <td>${item.reworkPercent.toFixed(1)}%</td>
          </tr>
        `
      )
      .join("");
  }

  static renderAnomalies(anomalies) {
    const summary = document.getElementById("anomaliesSummary");
    const list = document.getElementById("anomaliesList");
    if (!summary || !list) return;

    if (!anomalies.length) {
      summary.textContent = "No anomalies detected.";
      list.innerHTML = "";
      return;
    }

    summary.textContent = `Found ${anomalies.length} anomalous entries.`;
    list.innerHTML = anomalies
      .slice(0, 8)
      .map((entry) => {
        const issueId = entry.issueId || entry.iid || "N/A";
        const issueTitle = entry.issueTitle || entry.title || "";
        const reasons = Array.isArray(entry.reasons)
          ? entry.reasons.join(", ")
          : entry.reason || "Unknown";
        return `
          <div class="help-text">#${issueId} ${issueTitle} • ${Math.abs(entry.hours).toFixed(2)}h • ${reasons}</div>
        `;
      })
      .join("");
  }

  static renderBurnoutRisk(burnout) {
    const body = document.getElementById("burnoutTableBody");
    const empty = document.getElementById("burnoutEmpty");
    if (!body || !empty) return;

    if (!burnout.length) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    body.innerHTML = burnout
      .sort((a, b) => b.rollingAvg - a.rollingAvg)
      .map((item) => {
        const badgeClass = item.risk ? "high" : "low";
        const badgeText = item.risk ? "High" : "Low";
        return `
          <tr>
            <td>${item.username}</td>
            <td>${item.rollingAvg.toFixed(1)}h</td>
            <td><span class="risk-badge ${badgeClass}">${badgeText}</span></td>
          </tr>
        `;
      })
      .join("");
  }
}
