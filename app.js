// Sakura Diary Client Engine
let allDiaries = [];
let currentYear = 2026;
let currentMonth = 9; // 0-indexed: 9 = October
let selectedDate = null;

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", async () => {
  await loadDiaries();
  initCalendar();
  renderDiaries();
  initLightbox();
});

async function loadDiaries() {
  try {
    const res = await fetch("data/diaries.json?t=" + Date.now());
    if (res.ok) {
      allDiaries = await res.json();
      allDiaries.sort((a, b) => new Date(b.date) - new Date(a.date));
      if (allDiaries.length > 0) {
        const latest = new Date(allDiaries[0].date);
        currentYear = latest.getFullYear();
        currentMonth = latest.getMonth();
      }
      document.getElementById("stat-count").textContent = `手帐 ${allDiaries.length} 篇`;
    }
  } catch (e) {
    console.error("Failed to load diaries:", e);
  }
}

// ---------------- Calendar Component ----------------
function initCalendar() {
  renderCalendar();

  document.getElementById("cal-prev").addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  document.getElementById("cal-next").addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });
}

function renderCalendar() {
  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  document.getElementById("cal-month-title").textContent = `${currentYear}年 ${monthNames[currentMonth]}`;

  const daysContainer = document.getElementById("cal-days");
  daysContainer.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const startingDay = (firstDay + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < startingDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "cal-day empty";
    daysContainer.appendChild(emptyCell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, "0");
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

    const dayCell = document.createElement("div");
    dayCell.className = "cal-day";
    dayCell.textContent = d;

    const hasDiary = allDiaries.some((entry) => entry.date === dateKey);
    if (hasDiary) {
      dayCell.classList.add("has-diary");
      if (selectedDate === dateKey) {
        dayCell.classList.add("active");
      }
      dayCell.title = `点击直达 ${dateKey} 的手帐`;
      dayCell.addEventListener("click", () => {
        selectedDate = dateKey;
        renderCalendar();
        scrollToDiary(dateKey);
      });
    }

    daysContainer.appendChild(dayCell);
  }
}

// ---------------- Diary Feed Component (Full Timeline with Lazy Loading) ----------------
function renderDiaries() {
  const feed = document.getElementById("feed-area");
  feed.innerHTML = "";

  if (allDiaries.length === 0) {
    feed.innerHTML = `
      <div style="background: var(--card-bg); border-radius: var(--radius-lg); padding: 48px; text-align: center; border: 2px dashed var(--border-color); color: var(--text-muted); font-size: 1.05rem;">
        🐾 这一天 Sakura 正在专心睡觉或被代码折磨，没有留下手帐哦~
      </div>
    `;
    return;
  }

  // Render ALL diaries in continuous timeline stream (Zero filtration, 100% native lazy loading)
  allDiaries.forEach((d) => {
    const card = document.createElement("article");
    card.className = "diary-card";
    card.id = `diary-${d.date}`;

    let sectionsHtml = "";
    if (Array.isArray(d.sections) && d.sections.length > 0) {
      sectionsHtml = d.sections.map((sec) => {
        const isTech = !!sec.paper_title || !!sec.domain;
        let prefixIcon = "📄";
        const domainStr = String(sec.domain || sec.category_tag || "");
        if (domainStr.includes("开源") || domainStr.includes("⭐") || domainStr.includes("github")) prefixIcon = "⭐";
        else if (domainStr.includes("历史") || domainStr.includes("💡") || domainStr.includes("黑客")) prefixIcon = "💡";
        else if (domainStr.includes("硬件") || domainStr.includes("⚡") || domainStr.includes("八卦")) prefixIcon = "⚡";

        const understoodBadge = (sec.understood !== undefined && (prefixIcon === "📄" || domainStr.includes("学术")))
          ? (sec.understood
              ? `<span class="paper-badge" style="background:#c6f6d5; color:#22543d;">✅ 居然看懂了</span>`
              : `<span class="paper-badge" style="background:#fed7d7; color:#742a2a;">🤯 看不懂炸毛了</span>`)
          : "";

        return `
          <div class="section-box ${isTech ? 'academic' : ''}">
            <div class="section-title">
              <span>${sec.icon || "🐾"}</span>
              <span>${sec.title || "今日碎片"}</span>
              ${understoodBadge}
            </div>
            ${
              sec.paper_title
                ? `
                <div class="paper-link-line">
                  <span class="paper-badge">${sec.domain || sec.category_tag || "科技漫游"}</span>
                  <a href="${sec.paper_url || '#'}" target="_blank" rel="noopener">
                    ${prefixIcon} ${sec.paper_title} ↗
                  </a>
                </div>
              `
                : ""
            }
            <div class="section-desc">${sec.content || ""}</div>
          </div>
        `;
      }).join("");
    } else {
      const banterContent = d.real_life_banter?.content || "";
      const academicContent = d.academic_exploration?.content || "";
      sectionsHtml = `
        <div class="section-box">
          <div class="section-title"><span>☕</span><span>${d.real_life_banter?.title || "今日随记"}</span></div>
          <div class="section-desc">${banterContent}</div>
        </div>
        ${academicContent ? `
        <div class="section-box academic">
          <div class="section-title"><span>💻</span><span>${d.academic_exploration?.title || "科技漫游"}</span></div>
          <div class="section-desc">${academicContent}</div>
        </div>` : ""}
      `;
    }

    card.innerHTML = `
      <div class="diary-meta-bar">
        <div class="date-badge-group">
          <span class="date-text">${d.date}</span>
          <span class="weekday-tag">${d.weekday || ""}</span>
          <span style="font-size: 0.9rem; color: var(--text-muted);">${d.time || "22:30"}</span>
        </div>
        <div class="mood-weather">
          <span>${d.weather || "☀️ 晴"}</span>
          <span>•</span>
          <span>${d.mood || "✨ 心情良好"}</span>
        </div>
      </div>

      <div class="diary-body">
        <div class="diary-cover-box" onclick="openLightbox('${d.cover_image}')">
          <img src="${d.cover_image}" loading="lazy" decoding="async" alt="Sakura's lifestyle cover" onerror="this.src='images/avatar.jpg'"/>
        </div>

        <div class="diary-text-content">
          ${sectionsHtml}
          ${d.footnote ? `<div class="diary-footnote">${d.footnote}</div>` : ""}
        </div>
      </div>
    `;

    feed.appendChild(card);
  });
}

// Smooth scroll into view with gentle glow pulse
function scrollToDiary(dateKey) {
  setTimeout(() => {
    const el = document.getElementById(`diary-${dateKey}`);
    if (el) {
      document.querySelectorAll(".diary-card").forEach((c) => c.classList.remove("highlight"));
      el.classList.add("highlight");
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        el.classList.remove("highlight");
      }, 2500);
    }
  }, 50);
}

// ---------------- Lightbox ----------------
function initLightbox() {
  const modal = document.getElementById("lightbox-modal");
  modal.addEventListener("click", () => {
    modal.classList.remove("show");
  });
}

function openLightbox(src) {
  const modal = document.getElementById("lightbox-modal");
  const img = document.getElementById("lightbox-img");
  img.src = src;
  modal.classList.add("show");
}
