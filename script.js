(function () {
  "use strict";

  const LS_KEYS = {
    PROFILE: "lp_profile",
    POINTS: "lp_points",
    PROJECTS: "lp_projects",
    LP_ITEMS: "lp_items"
  };

  const USERS = [
    { id: "u1", name: "Kavin Grover", role: "Full Stack Engineer", skills: ["React", "Node.js", "TypeScript", "GraphQL", "SQL"], projects: ["LaunchPad UI", "Realtime Chat"] },
    { id: "u2", name: "Darsh Sharma", role: "Backend Engineer", skills: ["Node.js", "Express", "PostgreSQL", "API Design", "Docker"], projects: ["Payments API", "Analytics ETL"] },
    { id: "u3", name: "Ashwin Menon", role: "Frontend Engineer", skills: ["React", "CSS", "UI/UX", "Accessibility", "GSAP"], projects: ["Animations Library", "Design System"] },
  ];

  const PROJECTS = [
    { id: "p1", title: "LaunchPad UI", ownerId: "u1", requiredSkills: ["React", "CSS"], status: "open" },
    { id: "p2", title: "Payments API", ownerId: "u2", requiredSkills: ["Node.js", "PostgreSQL"], status: "open" },
    { id: "p3", title: "Animations Library", ownerId: "u3", requiredSkills: ["React", "GSAP"], status: "open" },
    { id: "p4", title: "Analytics ETL", ownerId: "u2", requiredSkills: ["PostgreSQL", "Docker"], status: "open" },
    { id: "p5", title: "Design System", ownerId: "u3", requiredSkills: ["UI/UX", "CSS"], status: "open" },
  ];

  const PRESET_SKILLS = Array.from(new Set(USERS.flatMap(u => u.skills))).sort();

  const byId = (id) => document.getElementById(id);
  const getOwner = (ownerId) => USERS.find(u => u.id === ownerId);

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
  }
  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeSkill(s) {
    return s.trim().toLowerCase();
  }

  function parseSkills(input) {
    if (!input) return [];
    return input.split(",").map(s => s.trim()).filter(Boolean);
  }

  function ensureSeeds() {
    const points = readJSON(LS_KEYS.POINTS, null);
    if (!points) {
      const seeded = Object.fromEntries(USERS.map(u => [u.id, 30 + Math.floor(Math.random() * 20)]));
      writeJSON(LS_KEYS.POINTS, seeded);
    }
    const projects = readJSON(LS_KEYS.PROJECTS, null);
    if (!projects) {
      writeJSON(LS_KEYS.PROJECTS, PROJECTS);
    } else {
      // Migration: if any stored project has an unknown owner, replace with current seed set
      const validOwner = (id) => USERS.some(u => u.id === id);
      const hasUnknownOwner = Array.isArray(projects) && projects.some(p => !validOwner(p.ownerId));
      if (hasUnknownOwner) writeJSON(LS_KEYS.PROJECTS, PROJECTS);
    }
    // LaunchPad items seed + migration
    const lpRaw = readJSON(LS_KEYS.LP_ITEMS, null);
    let lp = Array.isArray(lpRaw) ? lpRaw : [];

    // Remove legacy Compact 3D Printer if present (by title, id, or image filename)
    const filtered = lp.filter((it) => {
      const title = String(it.title || '').trim().toLowerCase();
      const id = String(it.id || '').trim().toLowerCase();
      const image = String(it.image || '').trim().toLowerCase();
      const isLegacy = title === 'compact 3d printer' || id === 'lp1' || image.includes('compact-3d-printer');
      return !isLegacy;
    });

    const hasHEARO = filtered.some((it) => (it.id === 'lp_hearo') || (String(it.title || '').trim().toLowerCase() === 'hearo'));
    const hasRoBlaze = filtered.some((it) => (it.id === 'lp_roblaze') || (String(it.title || '').trim().toLowerCase() === 'roblaze'));

    const seedItems = [];
    if (!hasHEARO) seedItems.push({
      id: 'lp_hearo',
      title: 'HEARO',
      image: 'HEARO.png',
      target: 10000,
      preorderUnitPrice: 199,
      preorderPct: 60,
      microPct: 40,
      microRaised: 0,
      preordersUnits: 0,
      ownerId: getCurrentUserId(),
      createdAt: Date.now() - 2 * 86400000
    });
    if (!hasRoBlaze) seedItems.push({
      id: 'lp_roblaze',
      title: 'RoBlaze',
      image: 'RoBlaze.jpg',
      target: 10000,
      preorderUnitPrice: 249,
      preorderPct: 60,
      microPct: 40,
      microRaised: 0,
      preordersUnits: 0,
      ownerId: getCurrentUserId(),
      createdAt: Date.now() - 1 * 86400000
    });

    const nextLp = filtered.length || seedItems.length ? [...filtered, ...seedItems] : seedItems;
    try {
      const changed = JSON.stringify(lp) !== JSON.stringify(nextLp);
      if (changed) writeJSON(LS_KEYS.LP_ITEMS, nextLp);
    } catch {
      if (nextLp.length !== lp.length) writeJSON(LS_KEYS.LP_ITEMS, nextLp);
    }
  }

  function getCurrentUserId() {
    const profile = readJSON(LS_KEYS.PROFILE, null);
    return profile?.id || "me";
  }

  function upsertProfile(formValues) {
    const id = getCurrentUserId();
    const profile = { id, ...formValues };
    writeJSON(LS_KEYS.PROFILE, profile);
    return profile;
  }

  function adjustPoints(userId, delta) {
    const points = readJSON(LS_KEYS.POINTS, {});
    const next = { ...points, [userId]: Math.max(0, (points[userId] || 0) + delta) };
    writeJSON(LS_KEYS.POINTS, next);
    renderMyPoints();
    renderPeople();
  }

  function renderPresetChips() {
    const wrap = byId("presetChips");
    if (!wrap) return;
    wrap.innerHTML = "";
    const selected = getSelectedSkills();
    PRESET_SKILLS.forEach(skill => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (selected.has(normalizeSkill(skill)) ? " active" : "");
      chip.textContent = skill;
      chip.addEventListener("click", () => toggleSkillFilter(skill));
      wrap.appendChild(chip);
    });
  }

  function getSelectedSkills() {
    const inputEl = byId("skillInput");
    const input = inputEl ? inputEl.value : "";
    const entered = parseSkills(input).map(normalizeSkill);
    return new Set(entered);
  }

  function toggleSkillFilter(skill) {
    const input = byId("skillInput");
    if (!input) return;
    const current = parseSkills(input.value);
    const idx = current.findIndex(s => normalizeSkill(s) === normalizeSkill(skill));
    if (idx >= 0) current.splice(idx, 1); else current.push(skill);
    input.value = current.join(", ");
    renderPresetChips();
    renderProjects();
    renderPeople();
  }

  function renderProjects() {
    const list = byId("projectsList");
    const count = byId("projectsCount");
    if (!list || !count) return;
    const selected = getSelectedSkills();
    const data = readJSON(LS_KEYS.PROJECTS, PROJECTS);
    const filtered = data.filter(p => Array.from(selected).every(sk => p.requiredSkills.map(normalizeSkill).includes(sk)));
    list.innerHTML = "";
    filtered.forEach(p => {
      const owner = getOwner(p.ownerId);
      const card = document.createElement("article");
      card.className = "project";
      const thumb = '';
      card.innerHTML = `
        <div class="header">
          <div class="id">
            <span class="avatar" aria-hidden="true"><img src="${thumb}" alt="" onerror="this.onerror=null;this.closest('.avatar').textContent='${(p.title||'?').trim().charAt(0).toUpperCase()}';this.remove();" loading="lazy" /></span>
            <div>
              <div class="title">${p.title}</div>
              <div class="subtitle">Owner: ${owner?.name || "Unknown"}</div>
            </div>
          </div>
          <div class="status ${p.status === 'completed' ? 'success' : p.status === 'failed' ? 'fail' : ''}">
            ${p.status}
          </div>
        </div>
        <div class="row tags">${p.requiredSkills.map(s => `<span class="tag">${s}</span>`).join("")}</div>
        <div class="row">
          <button class="btn small primary" data-action="complete" data-id="${p.id}">Mark Completed (+10)</button>
          <button class="btn small ghost" data-action="fail" data-id="${p.id}">Mark Failed (-6)</button>
        </div>
      `;
      list.appendChild(card);
    });
    count.textContent = String(filtered.length);

    list.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const action = btn.getAttribute("data-action");
        const projects = readJSON(LS_KEYS.PROJECTS, PROJECTS).map(p => {
          if (p.id !== id) return p;
          return { ...p, status: action === "complete" ? "completed" : "failed" };
        });
        writeJSON(LS_KEYS.PROJECTS, projects);
        const delta = action === "complete" ? 10 : -6;
        adjustPoints(getCurrentUserId(), delta);
        renderProjects();
      });
    });
  }

  function renderPeople() {
    const list = byId("peopleList");
    const count = byId("peopleCount");
    if (!list || !count) return;
    const selected = getSelectedSkills();
    const points = readJSON(LS_KEYS.POINTS, {});
    const all = USERS.map(u => ({ ...u, points: points[u.id] || 0 }));
    const filtered = Array.from(selected).length
      ? all.filter(u => Array.from(selected).every(sk => u.skills.map(normalizeSkill).includes(sk)))
      : all;
    list.innerHTML = "";
    filtered.forEach(u => {
      const avatarPng = `pfp/${u.name.toLowerCase().replace(/\s+/g,'')}LaunchPad.png`;
      const avatarJpg = `pfp/${u.name.toLowerCase().replace(/\s+/g,'')}LaunchPad.png`;
      const avatarFallbackLetter = (u.name || '?').trim().charAt(0).toUpperCase();
      const card = document.createElement("article");
      card.className = "person";
      card.innerHTML = `
        <div class="header">
          <div class="id">
            <span class="avatar" aria-hidden="true"><img src="${avatarPng}" alt="" onerror="this.onerror=null;this.src='${avatarJpg}';this.closest('.avatar').textContent='${avatarFallbackLetter}';this.remove();" loading="lazy" /></span>
            <div>
              <div class="title">${u.name}</div>
              <div class="subtitle">${u.role}</div>
            </div>
          </div>
          <div class="score">
            <span class="label kicker">Points</span>
            <span class="value">${u.points}</span>
          </div>
        </div>
        <div class="row">
          <span class="badge role">${u.role}</span>
        </div>
        <div class="row tags">${u.skills.map(s => `<span class="tag">${s}</span>`).join("")}</div>
        <div class="row kicker">Projects: ${u.projects.join(", ")}</div>
        <div class="row">
          <button class="btn small primary" type="button" data-action="connect" data-id="${u.id}">Connect</button>
          <button class="btn small ghost" type="button" data-action="view" data-id="${u.id}">View Profile</button>
        </div>
      `;
      list.appendChild(card);
    });
    count.textContent = String(filtered.length);

    // Wire actions: connect and view
    list.querySelectorAll('button[data-action="connect"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const user = USERS.find(u => u.id === id);
        if (!user) return;
        // Navigate to dedicated connect page with target user
        window.location.href = `connect.html?user=${encodeURIComponent(id)}`;
      });
    });
    list.querySelectorAll('button[data-action="view"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        window.location.href = `user.html?user=${encodeURIComponent(id)}`;
      });
    });
  }

  function getLPItems() {
    return readJSON(LS_KEYS.LP_ITEMS, []);
  }
  function setLPItems(items) {
    writeJSON(LS_KEYS.LP_ITEMS, items);
  }
  function formatMoney(n) {
    const val = Number(n || 0);
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val); } catch { return `$${val.toLocaleString()}`; }
  }
  function percent(n) {
    return `${Math.round(Math.max(0, Math.min(100, n)))}%`;
  }

  function timeAgo(ts) {
    const now = Date.now();
    const diff = Math.max(0, now - (typeof ts === 'number' ? ts : 0));
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  function renderLaunchpad() {
    const list = byId("lpList");
    const count = byId("lpCount");
    if (!list || !count) return;
    const items = getLPItems();
    if (!items.length) {
      list.innerHTML = `
        <div class="empty">
          <div class="illustration">✨</div>
          <div>No projects yet. Create the first one!</div>
        </div>
      `;
      count.textContent = "0";
      return;
    }
    list.innerHTML = "";
    items.forEach(item => {
      const preorderTarget = (item.target || 0) * (item.preorderPct || 0) / 100;
      const microTarget = (item.target || 0) * (item.microPct || 0) / 100;
      const preorderRaised = (item.preordersUnits || 0) * (item.preorderUnitPrice || 0);
      const microRaised = (item.microRaised || 0);
      const totalRaised = preorderRaised + microRaised;
      const imgSrc = (item.image && item.image.trim())
        ? item.image.trim()
        : (String(item.title || '').trim().toLowerCase() === 'hearo' ? 'HEARO.png' : (String(item.title || '').trim().toLowerCase() === 'roblaze' ? 'RoBlaze.jpg' : ''));

      const card = document.createElement("article");
      card.className = "lp-card";
      card.setAttribute('data-id', item.id);
      card.id = `lp-${item.id}`;
      const createdAt = getItemCreatedAt(item);
      card.innerHTML = `
        <img class="lp-thumb" alt="${item.title}" ${imgSrc ? `src=\"${imgSrc}\"` : ''} onerror="this.onerror=null;this.style.display='none';" loading="lazy" />
        <div class="lp-meta">
          <div class="header">
            <div>
              <div class="title">${item.title}</div>
              <div class="subtitle">Goal: ${formatMoney(item.target)} • Split: Preorders ${item.preorderPct}% / Micro-Investments ${item.microPct}%</div>
              <div class="kicker">Created ${timeAgo(createdAt)}</div>
            </div>
            <div class="score">
              <span class="label kicker">Raised</span>
              <span class="value">${formatMoney(totalRaised)}</span>
            </div>
          </div>

          <div class="row">
            <div class="progress micro" title="Micro-Investments">
              <span style="width:${(microTarget ? Math.min(100, (microRaised / microTarget) * 100) : 0)}%"></span>
            </div>
          </div>
          <div class="lp-stats">
            <div>Micro-Investments: ${formatMoney(microRaised)} / ${formatMoney(microTarget)}</div>
            <div>${percent(microTarget ? (microRaised / microTarget) * 100 : 0)}</div>
          </div>

          <div class="row">
            <div class="progress preorder" title="Preorders">
              <span style="width:${(preorderTarget ? Math.min(100, (preorderRaised / preorderTarget) * 100) : 0)}%"></span>
            </div>
          </div>
          <div class="lp-stats">
            <div>Preorders: ${formatMoney(preorderRaised)} / ${formatMoney(preorderTarget)}</div>
            <div>${percent(preorderTarget ? (preorderRaised / preorderTarget) * 100 : 0)}</div>
          </div>

          <div class="lp-actions">
            <input type="number" class="lp-micro-input" min="1" step="1" placeholder="Amount" data-id="${item.id}" />
            <button class="btn small" data-action="micro" data-id="${item.id}">Micro-Investments</button>
            <input type="number" class="lp-preorder-input" min="1" step="1" placeholder="Units" data-id="${item.id}" />
            <button class="btn small" data-action="preorder" data-id="${item.id}">Preorder</button>
            <button class="btn small ghost" data-action="delete" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
    count.textContent = String(items.length);

    list.querySelectorAll('button[data-action="micro"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const input = list.querySelector(`.lp-micro-input[data-id="${id}"]`);
        const amt = Math.max(0, Number(input && input.value || 0));
        if (!amt) return;
        const items = getLPItems().map(it => it.id === id ? { ...it, microRaised: (it.microRaised || 0) + amt } : it);
        setLPItems(items);
        renderLaunchpad();
      });
    });
    list.querySelectorAll('button[data-action="preorder"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const input = list.querySelector(`.lp-preorder-input[data-id="${id}"]`);
        const units = Math.max(0, Number(input && input.value || 0));
        if (!units) return;
        const items = getLPItems().map(it => it.id === id ? { ...it, preordersUnits: (it.preordersUnits || 0) + units } : it);
        setLPItems(items);
        renderLaunchpad();
      });
    });
    list.querySelectorAll('button[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Delete this project? This cannot be undone.')) return;
        const items = getLPItems().filter(it => it.id !== id);
        setLPItems(items);
        renderLaunchpad();
      });
    });
  }

  function wireLaunchpad() {
    const createBtn = byId('lp-create');
    const clearBtn = byId('lp-clear-all');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        const title = (byId('lp-title')?.value || '').trim();
        const imageInput = byId('lp-image');
        const imageFile = imageInput?.files && imageInput.files[0];
        let image = '';

        const processProjectCreation = (imageData) => {
          const target = Number(byId('lp-target')?.value || 0);
          const preorderUnitPrice = Number(byId('lp-unit-price')?.value || 0);
          const preorderPct = Number(byId('lp-preorder-pct')?.value || 0);
          let microPct = Number(byId('lp-micro-pct')?.value || (100 - preorderPct));
          if (preorderPct + microPct !== 100) {
            alert('The Preorders % and Micro-Investments % must add up to 100.');
            return;
          }
          if (!title || target <= 0 || preorderPct < 0 || microPct < 0) {
            alert('Please provide a valid title, goal, and split.');
            return;
          }
          if (preorderPct > 0 && preorderUnitPrice <= 0) {
            alert('Please set a valid preorder unit price.');
            return;
          }
          const id = `lp_${Date.now()}_${Math.floor(Math.random()*1e4)}`;
          const next = [
            ...getLPItems(),
            { id, title, image: imageData, target, preorderUnitPrice, preorderPct, microPct, microRaised: 0, preordersUnits: 0, ownerId: getCurrentUserId(), createdAt: Date.now() }
          ];
          setLPItems(next);
          ['lp-title','lp-image','lp-target','lp-unit-price','lp-preorder-pct','lp-micro-pct'].forEach(i => { const el = byId(i); if (el) el.value = ''; });
          
          if (window.location.pathname.includes('create-project.html')) {
            alert('Project created successfully!');
            window.location.href = 'launchpad.html';
          } else {
            renderLaunchpad();
          }
        };

        if (imageFile) {
          const reader = new FileReader();
          reader.onload = function(e) {
            image = e.target.result;
            processProjectCreation(image);
          };
          reader.readAsDataURL(imageFile);
        } else {
          processProjectCreation('');
        }
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (!confirm('Clear all Launchpad projects?')) return;
        setLPItems([]);
        renderLaunchpad();
      });
    }
  }

  function getItemCreatedAt(item) {
    if (typeof item.createdAt === 'number') return item.createdAt;
    const id = String(item.id || '');
    const m = id.match(/^lp_(\d+)_/);
    if (m && m[1]) return Number(m[1]);
    return 0;
  }

  function renderWhatsNew() {
    const list = byId('whatsNewList');
    const count = byId('whatsNewCount');
    if (!list || !count) return;
    const items = getLPItems().slice().sort((a,b) => getItemCreatedAt(b) - getItemCreatedAt(a));
    const recent = items.slice(0, 3);
    if (!recent.length) {
      list.innerHTML = `
        <div class="empty">
          <div class="illustration">📰</div>
          <div>Nothing new yet. Check back soon!</div>
        </div>
      `;
      count.textContent = "0";
      return;
    }
    list.innerHTML = '';
    recent.forEach(item => {
      const preorderTarget = (item.target || 0) * (item.preorderPct || 0) / 100;
      const microTarget = (item.target || 0) * (item.microPct || 0) / 100;
      const preorderRaised = (item.preordersUnits || 0) * (item.preorderUnitPrice || 0);
      const microRaised = (item.microRaised || 0);
      const totalRaised = preorderRaised + microRaised;
      const imgSrc = (item.image && item.image.trim())
        ? item.image.trim()
        : (String(item.title || '').trim().toLowerCase() === 'hearo' ? 'HEARO.png' : (String(item.title || '').trim().toLowerCase() === 'roblaze' ? 'RoBlaze.jpg' : ''));

      const card = document.createElement('article');
      card.className = 'lp-card';
      card.setAttribute('role', 'link');
      card.tabIndex = 0;
      card.dataset.id = item.id;
      const createdAt = getItemCreatedAt(item);
      const isMine = String(item.ownerId || '') === String(getCurrentUserId());
      const ownerName = isMine ? 'You' : (getOwner && getOwner(item.ownerId || '') ? (getOwner(item.ownerId || '').name) : 'Unknown');
      card.innerHTML = `
        <img class="lp-thumb" alt="${item.title}" ${imgSrc ? `src=\"${imgSrc}\"` : ''} onerror="this.onerror=null;this.style.display='none';" loading="lazy" />
        <div class="lp-meta">
          <div class="header">
            <div>
              <div class="title">${item.title}</div>
              <div class="subtitle">Goal: ${formatMoney(item.target)} • Raised: ${formatMoney(totalRaised)}</div>
              <div class="kicker">Owner: ${ownerName} • Created ${timeAgo(createdAt)}</div>
            </div>
            <div class="score">
              <span class="label kicker">Split</span>
              <span class="value">${item.preorderPct}% / ${item.microPct}%</span>
            </div>
          </div>

          <div class="row">
            <div class="progress micro" title="Micro-Investments">
              <span style="width:${(microTarget ? Math.min(100, (microRaised / microTarget) * 100) : 0)}%"></span>
            </div>
          </div>
          <div class="lp-stats">
            <div>Micro: ${formatMoney(microRaised)} / ${formatMoney(microTarget)}</div>
            <div>${percent(microTarget ? (microRaised / microTarget) * 100 : 0)}</div>
          </div>

          <div class="row">
            <div class="progress preorder" title="Preorders">
              <span style="width:${(preorderTarget ? Math.min(100, (preorderRaised / preorderTarget) * 100) : 0)}%"></span>
            </div>
          </div>
          <div class="lp-stats">
            <div>Preorders: ${formatMoney(preorderRaised)} / ${formatMoney(preorderTarget)}</div>
            <div>${percent(preorderTarget ? (preorderRaised / preorderTarget) * 100 : 0)}</div>
          </div>

          <div class="lp-actions">
            <button class="btn small ghost" data-action="open" data-id="${item.id}">Open Project</button>
          </div>
        </div>
      `;
      list.appendChild(card);
      const navigate = () => {
        try { sessionStorage.setItem('lp_scroll_to', item.id); } catch {}
        window.location.href = 'launchpad.html#lp-' + item.id;
      };
      card.addEventListener('click', navigate);
      card.addEventListener('keypress', (e) => { if (e.key === 'Enter' || e.key === ' ') navigate(); });
      const btn = card.querySelector('button[data-action="open"]');
      if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); navigate(); });
    });
    count.textContent = String(items.length);
  }

  function wireWhatsNewObserver() {
    const section = document.getElementById('whatsNew');
    const list = byId('whatsNewList');
    if (!section || !list || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          renderWhatsNew();
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(section);
  }

  function renderMyPoints() {
    const me = getCurrentUserId();
    const points = readJSON(LS_KEYS.POINTS, {});
    const el = byId("myPoints");
    if (el) el.textContent = String(points[me] || 0);
  }

  function renderProfileSummary() {
    const wrap = byId("profileSummary");
    // If a user param is provided, show that user's profile (read-only)
    const params = new URLSearchParams(window.location.search);
    const viewUserId = params.get('user');
    const myProfile = readJSON(LS_KEYS.PROFILE, null);
    const profile = viewUserId ? USERS.find(u => u.id === viewUserId) || null : myProfile;
    if (!profile) {
      wrap.innerHTML = '<p class="muted">No profile saved yet.</p>';
      return;
    }
    const skills = (profile.skills || []).join(", ");
    const name = profile.name || (profile.id ? profile.id : '(No name)');
    const role = profile.role || '(No role)';
    const avatarPng = `pfp/${name.toLowerCase().replace(/\s+/g,'')}LaunchPad.png`;
    const avatarJpg = `pfp/${name.toLowerCase().replace(/\s+/g,'')}LaunchPad.png`;
    const avatarLetter = (name || '?').trim().charAt(0).toUpperCase();
    wrap.innerHTML = `
      <div class="header id" style="margin-bottom:10px;">
        <span class="avatar" aria-hidden="true"><img src="${avatarPng}" alt="" onerror="this.onerror=null;this.src='${avatarJpg}';this.closest('.avatar').textContent='${avatarLetter}';this.remove();" loading="lazy" /></span>
        <div>
          <div class="title">${name}</div>
          <div class="subtitle">${role}</div>
        </div>
      </div>
      <p>${profile.bio || ""}</p>
      <div class="row tags">${(profile.skills || []).map(s => `<span class="tag">${s}</span>`).join("")}</div>
    `;
  }

  function hydrateProfileForm() {
    const profile = readJSON(LS_KEYS.PROFILE, null);
    if (!profile) return;
    byId("pf-name").value = profile.name || "";
    byId("pf-role").value = profile.role || "";
    byId("pf-bio").value = profile.bio || "";
    byId("pf-skills").value = (profile.skills || []).join(", ");
  }

  function wireProfileForm() {
    const form = byId("profileForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const formValues = {
        name: byId("pf-name").value.trim(),
        role: byId("pf-role").value.trim(),
        bio: byId("pf-bio").value.trim(),
        skills: parseSkills(byId("pf-skills").value),
      };
      const saved = upsertProfile(formValues);
      renderProfileSummary();
      renderPresetChips();
    });
    byId("pf-clear").addEventListener("click", () => {
      localStorage.removeItem(LS_KEYS.PROFILE);
      ["pf-name","pf-role","pf-bio","pf-skills"].forEach(id => byId(id).value = "");
      renderProfileSummary();
    });
  }

  function wireFilters() {
    const skillInput = byId("skillInput");
    const clearBtn = byId("clearFilters");
    if (skillInput) {
      skillInput.addEventListener("input", () => {
        renderPresetChips();
        renderProjects();
        renderPeople();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (skillInput) skillInput.value = "";
        renderPresetChips();
        renderProjects();
        renderPeople();
      });
    }
  }

  ensureSeeds();

  const hasProfileForm = !!document.getElementById("profileForm");
  const isSkillLinkPage = !!document.getElementById("projectsList") || !!document.getElementById("peopleList");
  const isLaunchpadPage = !!document.getElementById("lpList");
  const isCreateProjectPage = !!document.getElementById('lpForm') || !!document.getElementById('lp-create');
  const isHomePageWhatsNew = !!document.getElementById('whatsNewList');
  const isConnectPage = !!document.getElementById('connectForm') || !!document.getElementById('connectTarget');
  const isUserPage = !!document.getElementById('userName') || !!document.getElementById('userAvatar');

  if (hasProfileForm) {
    wireProfileForm();
    hydrateProfileForm();
    renderProfileSummary();
    renderMyPoints();
  }

  if (isSkillLinkPage) {
    wireFilters();
    renderPresetChips();
    renderProjects();
    renderPeople();
  }

  if (isConnectPage) {
    // Hydrate target user card from query param
    const params = new URLSearchParams(window.location.search);
    const id = params.get('user');
    const user = USERS.find(u => u.id === id);
    const nameEl = byId('connName');
    const roleEl = byId('connRole');
    const skillsEl = byId('connSkills');
    const avatarEl = byId('connAvatar');
    if (user && nameEl && roleEl && skillsEl && avatarEl) {
      nameEl.textContent = user.name;
      roleEl.textContent = user.role;
      skillsEl.innerHTML = user.skills.map(s => `<span class="tag">${s}</span>`).join('');
      const avatarPng = `pfp/${user.name.toLowerCase().replace(/\s+/g,'')}LaunchPad.png`;
      const avatarJpg = `pfp/${user.name.toLowerCase().replace(/\s+/g,'')}LaunchPad.png`;
      const letter = user.name.trim().charAt(0).toUpperCase();
      avatarEl.innerHTML = `<img src="${avatarPng}" alt="" onerror="this.onerror=null;this.src='${avatarJpg}';this.closest('.avatar').textContent='${letter}';this.remove();" loading="lazy" />`;
    } else if (nameEl) {
      nameEl.textContent = 'Unknown user';
    }

    // Handle submission and persist to localStorage
    const form = document.getElementById('connectForm');
    const success = document.getElementById('connectSuccess');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = (document.getElementById('cf-message')?.value || '').trim();
        const purpose = (document.getElementById('cf-purpose')?.value || '').trim();
        const requestsKey = 'lp_connections';
        const existing = readJSON(requestsKey, []);
        const req = {
          id: `conn_${Date.now()}_${Math.floor(Math.random()*1e5)}`,
          to: id,
          from: getCurrentUserId(),
          message,
          purpose,
          createdAt: Date.now(),
          status: 'pending'
        };
        writeJSON(requestsKey, [req, ...existing]);
        if (success) success.style.display = '';
        form.reset();
      });
    }
  }

  if (isUserPage) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('user');
    const user = USERS.find(u => u.id === id);
    const points = readJSON(LS_KEYS.POINTS, {});
    const nameEl = byId('userName');
    const roleEl = byId('userRole');
    const skillsEl = byId('userSkills');
    const projectsEl = byId('userProjects');
    const pointsEl = byId('userPoints');
    const avatarEl = byId('userAvatar');
    if (user && nameEl && roleEl && skillsEl && projectsEl && pointsEl && avatarEl) {
      nameEl.textContent = user.name;
      roleEl.textContent = user.role;
      skillsEl.innerHTML = user.skills.map(s => `<span class="tag">${s}</span>`).join('');
      projectsEl.textContent = 'Projects: ' + (user.projects && user.projects.length ? user.projects.join(', ') : 'None');
      pointsEl.textContent = String(points[user.id] || 0);
      const avatarPng = `pfp/${user.name.toLowerCase().replace(/\s+/g,'')}LaunchPad.png`;
      const avatarJpg = `pfp/${user.name.toLowerCase().replace(/\s+/g,'')}LaunchPad.png`;
      const letter = user.name.trim().charAt(0).toUpperCase();
      avatarEl.innerHTML = `<img src="${avatarPng}" alt="" onerror="this.onerror=null;this.src='${avatarJpg}';this.closest('.avatar').textContent='${letter}';this.remove();" loading="lazy" />`;
    } else if (nameEl) {
      nameEl.textContent = 'Unknown user';
    }
  }

  if (isCreateProjectPage) {
    wireLaunchpad();
  }
  if (isLaunchpadPage) {
    wireLaunchpad();
    const lp = byId('lpList');
    if (lp) {
      lp.innerHTML = `
        <article class="lp-card">
          <div class="skel-thumb skeleton"></div>
          <div class="lp-meta">
            <div class="skel-line skeleton" style="width:55%"></div>
            <div class="skel-line skeleton" style="width:35%"></div>
          </div>
        </article>
        <article class="lp-card">
          <div class="skel-thumb skeleton"></div>
          <div class="lp-meta">
            <div class="skel-line skeleton" style="width:50%"></div>
            <div class="skel-line skeleton" style="width:45%"></div>
          </div>
        </article>
      `;
    }
    renderLaunchpad();
    // After rendering, if a deep-link target exists, scroll and highlight
    try {
      const targetId = sessionStorage.getItem('lp_scroll_to');
      if (targetId) {
        const el = document.getElementById('lp-' + targetId);
        if (el) {
          if (window.lenis) {
            window.lenis.scrollTo(el, { offset: -40, duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
          } else {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          el.classList.add('highlight-pulse');
          setTimeout(() => el && el.classList && el.classList.remove('highlight-pulse'), 1600);
        }
        sessionStorage.removeItem('lp_scroll_to');
      }
    } catch {}
  }
  if (isHomePageWhatsNew) {
    const skel = byId('whatsNewList');
    if (skel) {
      skel.innerHTML = `
        <article class="lp-card">
          <div class="skel-thumb skeleton"></div>
          <div class="lp-meta">
            <div class="skel-line skeleton" style="width:60%"></div>
            <div class="skel-line skeleton" style="width:40%"></div>
          </div>
        </article>
        <article class="lp-card">
          <div class="skel-thumb skeleton"></div>
          <div class="lp-meta">
            <div class="skel-line skeleton" style="width:70%"></div>
            <div class="skel-line skeleton" style="width:30%"></div>
          </div>
        </article>
      `;
    }
    wireWhatsNewObserver();
  }

  const animationContainer = document.getElementById("animation-container");
  if (animationContainer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof THREE !== 'undefined') {

    const scene = new THREE.Scene();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const scaledWidth = window.innerWidth;
    const scaledHeight = window.innerHeight;
    
    const camera = new THREE.PerspectiveCamera(75, scaledWidth / scaledHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true 
    });
    renderer.setSize(scaledWidth, scaledHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    animationContainer.appendChild(renderer.domElement);

    const particlesGeometry = new THREE.BufferGeometry();
    const isMobile = Math.max(window.innerWidth, window.innerHeight) < 920;
    const particlesCount = isMobile ? 1800 : 4000;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 30;    
      posArray[i + 1] = (Math.random() - 0.5) * 25;
      posArray[i + 2] = (Math.random() - 0.5) * 15;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const styles = getComputedStyle(document.documentElement);
    const particleColor = styles.getPropertyValue('--particle-color') || '#8CA9AD';

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.04,
      color: particleColor,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    camera.position.z = 6;

    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', (event) => {
      mouseX = event.clientX / window.innerWidth - 0.5;
      mouseY = event.clientY / window.innerHeight - 0.5;
    });

    function animate() {
      requestAnimationFrame(animate);

      particlesMesh.rotation.y += 0.0008;
      particlesMesh.rotation.x += 0.0005;

      for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        particlesGeometry.attributes.position.array[i3 + 1] += (Math.random() - 0.5) * 0.001;
      }
      particlesGeometry.attributes.position.needsUpdate = true;

      particlesMesh.rotation.x += (mouseY * 0.3 - particlesMesh.rotation.x) * 0.02;
      particlesMesh.rotation.y += (mouseX * 0.3 - particlesMesh.rotation.y) * 0.02;

      renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    });

    animate();
  }

  const THEME_KEY = 'lp_theme';
  function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.setAttribute('aria-checked', String(theme === 'dark'));
    }
    const fancy = document.getElementById('fancyThemeToggle');
    if (fancy) {
      fancy.setAttribute('aria-checked', String(theme === 'dark'));
    }
    const label = document.getElementById('themeLabel');
    if (label) {
      label.textContent = theme === 'dark' ? 'Dark' : 'Light';
    }
  }
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const root = document.documentElement;
        const current = root.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem(THEME_KEY, next);

        if (!prefersReduced) {
          // Add a class that enables transitions, then remove it after the frame
          root.classList.add('theme-transition');
          // Force a reflow to ensure transitions apply
          void root.offsetWidth;
          applyTheme(next);
          window.setTimeout(() => { root.classList.remove('theme-transition'); }, 220);
        } else {
          applyTheme(next);
        }
      });
    }
    const fancy = document.getElementById('fancyThemeToggle');
    if (fancy) {
      const toggleFancy = () => {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const root = document.documentElement;
        const current = root.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem(THEME_KEY, next);
        if (!prefersReduced) {
          root.classList.add('theme-transition');
          void root.offsetWidth;
          applyTheme(next);
          window.setTimeout(() => { root.classList.remove('theme-transition'); }, 220);
        } else {
          applyTheme(next);
        }
      };
      fancy.addEventListener('click', toggleFancy);
      fancy.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFancy();
        }
      });
    }
  }
  initTheme();

  // Premium motion: Lenis + GSAP + ScrollTrigger
  (function initPremiumMotion() {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    if (!window.gsap) return;

    const { gsap } = window;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    // Detect navigation type to distinguish reloads
    let navType = 'navigate';
    try {
      const navEntries = performance.getEntriesByType && performance.getEntriesByType('navigation');
      const entry = navEntries && navEntries[0];
      if (entry && entry.type) navType = entry.type; else if (performance.navigation) { navType = performance.navigation.type === 1 ? 'reload' : 'navigate'; }
    } catch {}

    // Lenis smooth scrolling and ScrollTrigger sync
    if (window.Lenis && !window.lenis) {
      const lenis = new window.Lenis({
        duration: 1.05,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        smoothWheel: true,
        smoothTouch: false
      });
      window.lenis = lenis;
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      if (window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);
    }

    // Determine if intro will run on home (used to gate header/nav entrance)
    const hasIntroTargets = !!document.getElementById('introOverlay') && !!document.querySelector('main .hero');
    const willRunIntro = hasIntroTargets && ((navType === 'reload') || localStorage.getItem('lp_intro_v1') !== '1') && !prefersReduced;

    // Entrance animations (header, nav, hero) — transform-only to avoid FOUC
    if (!willRunIntro) {
      gsap.from('.site-header', { y: -12, duration: 0.45, ease: 'power2.out' });
      gsap.from('.nav a, .nav .theme-toggle', {
        y: 6, duration: 0.45, ease: 'power2.out', stagger: 0.05, delay: 0.03
      });
      if (document.querySelector('.hero-inner')) {
        gsap.from('.hero-inner', { y: 16, scale: 0.992, duration: 0.6, ease: 'power3.out', delay: 0.04 });
      }
    }

    const animateProgressBars = (scope) => {
      const root = scope ? (typeof scope === 'string' ? document.querySelector(scope) : scope) : document;
      if (!root) return;
      root.querySelectorAll('.progress > span').forEach((span) => {
        const targetWidth = span.getAttribute('style') && /width\s*:\s*([^;]+)/i.test(span.getAttribute('style'))
          ? RegExp.$1.trim() : '0%';
        // Animate from 0 to target WITHOUT forcing width to 0 until the tween actually runs
        if (window.ScrollTrigger) {
          gsap.fromTo(span, { width: '0%' }, {
            width: targetWidth,
            duration: 1.2,
            ease: 'power2.out',
            immediateRender: false,
            scrollTrigger: {
              trigger: span,
              start: 'top 95%',
              once: true
            }
          });
        } else {
          // No ScrollTrigger: run immediately
          gsap.fromTo(span, { width: '0%' }, { width: targetWidth, duration: 1.1, ease: 'power2.out' });
        }
      });
    };

    const reveal = (selector, opts) => {
      const defaults = { y: 18, opacity: 0, duration: 0.6, ease: 'power2.out' };
      const config = Object.assign({}, defaults, opts || {});
      const elements = gsap.utils.toArray(selector);
      if (!elements.length) return;
      elements.forEach((el) => {
        gsap.from(el, Object.assign({}, config, {
          scrollTrigger: window.ScrollTrigger ? {
            trigger: el,
            start: 'top 85%'
          } : undefined
        }));
      });
    };

    // Generic reveals (exclude hero card and person cards to avoid initial hide)
    reveal('.section .card:not(.hero-inner):not(.person)');

    // Transform-only reveal for team members (no opacity changes)
    const revealTransformOnly = (selector, opts) => {
      const defaults = { y: 14, duration: 0.5, ease: 'power2.out' };
      const config = Object.assign({}, defaults, opts || {});
      const elements = gsap.utils.toArray(selector);
      if (!elements.length) return;
      elements.forEach((el) => {
        gsap.from(el, Object.assign({}, config, {
          scrollTrigger: window.ScrollTrigger ? {
            trigger: el,
            start: 'top 85%'
          } : undefined
        }));
      });
    };
    revealTransformOnly('.team-grid .person');
    animateProgressBars(document);

    // Launchpad page specific: avoid transforms on #lpList .lp-card (CSS disables). Animate inner meta instead.
    const animateLaunchpadList = () => {
      const container = document.getElementById('lpList');
      if (!container) return;
      if (window.ScrollTrigger) {
        window.ScrollTrigger.getAll().forEach((t) => {
          const trg = t.trigger;
          if (trg && container.contains(trg)) t.kill();
        });
      }
      // Fade-up meta content for each card
      reveal('#lpList .lp-card .lp-meta', { y: 16, duration: 0.55 });
      // Ensure progress bar widths reflect current inline style immediately before animation
      container.querySelectorAll('.progress > span').forEach((span) => {
        const styleAttr = span.getAttribute('style') || '';
        const m = styleAttr.match(/width\s*:\s*([^;]+)/i);
        const targetWidth = m ? m[1].trim() : '0%';
        span.style.width = targetWidth; // ensure DOM reflects data
      });
      animateProgressBars(container);
    };

    // What's New list reveal
    const animateWhatsNew = () => {
      const container = document.getElementById('whatsNewList');
      if (!container) return;
      if (window.ScrollTrigger) {
        window.ScrollTrigger.getAll().forEach((t) => {
          const trg = t.trigger;
          if (trg && container.contains(trg)) t.kill();
        });
      }
      reveal('#whatsNewList .lp-card', { y: 16, duration: 0.55 });
    };

    // Hook into dynamic renders once
    try {
      if (typeof renderLaunchpad === 'function' && !renderLaunchpad.__withAnimations) {
        const _renderLaunchpad = renderLaunchpad;
        renderLaunchpad = function () {
          _renderLaunchpad();
          animateLaunchpadList();
        };
        renderLaunchpad.__withAnimations = true;
      }
      if (typeof renderWhatsNew === 'function' && !renderWhatsNew.__withAnimations) {
        const _renderWhatsNew = renderWhatsNew;
        renderWhatsNew = function () {
          _renderWhatsNew();
          animateWhatsNew();
        };
        renderWhatsNew.__withAnimations = true;
      }
    } catch {}

    // Initial page-specific runs
    animateLaunchpadList();
    animateWhatsNew();

    // Svelte-like text reveal for About page mission card
    (function animateMissionCard() {
      const card = document.getElementById('missionCard');
      if (!card) return;
      const { gsap } = window;

      const splitWords = (el) => {
        const raw = (el.textContent || '');
        const tokens = raw.match(/\S+|\s+/g) || [];
        el.textContent = '';
        tokens.forEach((tok) => {
          if (/^\s+$/.test(tok)) {
            el.appendChild(document.createTextNode(tok));
          } else {
            const span = document.createElement('span');
            span.textContent = tok;
            span.style.display = 'inline-block';
            span.style.transform = 'translateY(0.6em)';
            span.style.opacity = '0';
            span.className = (span.className ? span.className + ' ' : '') + 'reveal-word';
            el.appendChild(span);
          }
        });
      };

      const blocks = Array.from(card.querySelectorAll('p, h3, ol li, ul li'));
      blocks.forEach((el) => splitWords(el));

      blocks.forEach((el, i) => {
        const words = el.querySelectorAll('.reveal-word');
        if (!words.length) return;
        if (window.ScrollTrigger) {
          gsap.to(words, {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power3.out',
            stagger: { each: 0.02 },
            delay: Math.min(0.15 + i * 0.05, 0.4),
            immediateRender: false,
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              once: true
            }
          });
        } else {
          gsap.to(words, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: { each: 0.02 }, delay: Math.min(0.15 + i * 0.05, 0.4) });
        }
      });

      const tagsRow = card.querySelector('.row.tags');
      if (tagsRow) {
        const tags = tagsRow.querySelectorAll('.tag');
        if (tags.length) {
          if (window.ScrollTrigger) {
            gsap.from(tags, {
              y: 8,
              opacity: 0,
              duration: 0.5,
              ease: 'power2.out',
              stagger: 0.05,
              scrollTrigger: { trigger: tagsRow, start: 'top 90%', once: true }
            });
          } else {
            gsap.from(tags, { y: 8, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.05 });
          }
        }
      }
    })();

    // First-visit brand intro on home page, and also on reloads
    try {
      const isHome = !!document.querySelector('main .hero');
      const introShownKey = 'lp_intro_v1';
      const alreadyShown = localStorage.getItem(introShownKey) === '1';
      const overlay = document.getElementById('introOverlay');
      if (isHome && overlay && (!alreadyShown || navType === 'reload')) {
        const runIntro = () => {
          // Block scroll
          const html = document.documentElement;
          const body = document.body;
          const prevHtmlOverflow = html.style.overflow;
          const prevBodyOverflow = body.style.overflow;
          html.style.overflow = 'hidden';
          body.style.overflow = 'hidden';
          if (window.lenis && typeof window.lenis.stop === 'function') window.lenis.stop();

          overlay.style.display = 'grid';
          overlay.setAttribute('aria-hidden', 'false');
          document.documentElement.classList.add('intro-active');

          const introBrand = overlay.querySelector('.intro-brand');
          const introLogo = overlay.querySelector('.intro-logo');
          const introName = overlay.querySelector('.intro-name');
          const headerLogo = document.querySelector('.brand .img');
          const headerName = document.querySelector('.brand .name');
          const skipBtn = overlay.querySelector('.intro-skip');

          const endIntro = () => {
            overlay.style.display = 'none';
            overlay.setAttribute('aria-hidden', 'true');
            document.documentElement.classList.remove('intro-active');
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
            if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();
            localStorage.setItem(introShownKey, '1');

            // Cleanup listeners
            try { window.removeEventListener('resize', positionPop, { passive: true }); } catch {}

            // Run header entrances after intro ends (keeps targets static during FLIP)
            gsap.from('.site-header', { y: -12, duration: 0.35, ease: 'power2.out' });
            gsap.from('.nav a, .nav .theme-toggle', { y: 6, duration: 0.35, ease: 'power2.out', stagger: 0.04 });
            if (document.querySelector('.hero-inner')) {
              gsap.from('.hero-inner', { y: 12, scale: 0.994, duration: 0.5, ease: 'power3.out' });
            }
          };

          // No FLIP-to-header; we'll do a premium fade reveal instead

          const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: endIntro });

          // Pop in brand
          tl.from(introBrand, { y: 18, scale: 0.96, duration: 0.5 }, 0);

          // Small accent scale
          tl.to(introBrand, { scale: 1.03, duration: 0.35, ease: 'power2.inOut' }, '+=0.15');

          // Glow + particle pop anchored to brand center
          const pop = overlay.querySelector('.intro-pop');
          const positionPop = () => {
            if (!pop || !introBrand) return;
            const r = introBrand.getBoundingClientRect();
            pop.style.left = (r.left + r.width / 2) + 'px';
            pop.style.top = (r.top + r.height / 2) + 'px';
          };
          if (pop) {
            positionPop();
            try { window.addEventListener('resize', positionPop, { passive: true }); } catch {}
            const colors = ['#8B5CF6', '#22D3EE', '#C084FC', '#60A5FA'];
            const count = 24;
            pop.innerHTML = '';
            setTimeout(() => {
              for (let i = 0; i < count; i++) {
                const s = document.createElement('span');
                s.style.background = colors[i % colors.length];
                s.style.left = '0px';
                s.style.top = '0px';
                pop.appendChild(s);
                const angle = (Math.PI * 2 * i) / count;
                const radius = 20 + Math.random() * 36;
                const dx = Math.cos(angle) * radius;
                const dy = Math.sin(angle) * radius;
                gsap.fromTo(s, { x: 0, y: 0, scale: 0.4, opacity: 1 }, { x: dx, y: dy, scale: 0.9, opacity: 0, duration: 0.6, ease: 'power2.out' });
              }
            }, 70);
          }

          // Fade overlay backdrop away (slightly darker/longer for cinematic feel)
          tl.to(overlay, { background: 'linear-gradient(180deg, rgba(11,18,32,0.98), rgba(11,18,32,0.92))', duration: 0.25, ease: 'power1.out' }, '<0.1');
          tl.to(overlay, { opacity: 0, duration: 0.45, ease: 'power1.out' });

          if (skipBtn) {
            skipBtn.addEventListener('click', () => {
              tl.progress(1); // jump to end
            }, { once: true });
          }
        };

        // Respect reduced motion again for intro
        if (!prefersReduced) runIntro();
      }
    } catch {}

    // Magnetic buttons handled by standalone initializer below to avoid duplicate loops.
  })();

  // Magnetic pull interaction for .btn elements (vanilla, no GSAP dependency)
  function initMagneticButtons() {
    const isElementDisabled = (el) => el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const applyMagneticTransform = (button, event) => {
      if (!button || isElementDisabled(button)) return;
      if (event && event.pointerType && event.pointerType !== 'mouse') return;
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const relativeX = (event.clientX - centerX) / (rect.width / 2);
      const relativeY = (event.clientY - centerY) / (rect.height / 2);
      const maxTranslate = clamp(Math.min(16, Math.round(rect.width * 0.06)), 6, 16);
      const tx = clamp(relativeX, -1, 1) * maxTranslate;
      const ty = clamp(relativeY, -1, 1) * maxTranslate;
      button.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;

      // Glow position (percentages) and intensity
      const xPct = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
      const yPct = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
      const distFromCenter = Math.hypot(relativeX, relativeY); // 0 at center, ~1+ at edges
      const intensity = clamp(1 - distFromCenter, 0, 1); // stronger near center
      button.style.setProperty('--glow-x', xPct + '%');
      button.style.setProperty('--glow-y', yPct + '%');
      button.style.setProperty('--glow-opacity', String(0.25 + intensity * 0.45));
    };

    const resetMagneticTransform = (button) => {
      if (!button) return;
      button.style.transform = '';
      button.style.removeProperty('--glow-x');
      button.style.removeProperty('--glow-y');
      button.style.setProperty('--glow-opacity', '0');
    };

    const registerButton = (button) => {
      if (!button || button.__magnetized) return;
      button.__magnetized = true;
      button.style.willChange = (button.style.willChange || '').includes('transform') ? button.style.willChange : [button.style.willChange, 'transform'].filter(Boolean).join(', ');

      const onMove = (e) => applyMagneticTransform(button, e);
      const onLeave = () => resetMagneticTransform(button);

      button.addEventListener('pointermove', onMove);
      button.addEventListener('pointerleave', onLeave);
      button.addEventListener('pointercancel', onLeave);
      button.addEventListener('pointerdown', () => button.style.setProperty('--glow-opacity', '0.18'));
      button.addEventListener('pointerup', () => button.style.setProperty('--glow-opacity', '0.35'));
    };

    // Initialize existing buttons
    document.querySelectorAll('.btn').forEach(registerButton);

    // Observe DOM for dynamically inserted buttons
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches && node.matches('.btn')) registerButton(node);
          const inner = node.querySelectorAll ? node.querySelectorAll('.btn') : [];
          inner.forEach(registerButton);
        }
      }
    });
    try {
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    } catch {}
  }

  initMagneticButtons();
  
  // Header dock magnification (Mac-style) using transform scale from top center
  (function initHeaderDock() {
    const dock = document.getElementById('headerDock');
    if (!dock) return;
    const items = Array.from(dock.querySelectorAll('.dock-item'));
    if (!items.length) return;

    const baseScale = 1;
    const maxScale = Math.max(1.2, Math.min(1.4, (window.innerWidth <= 640 ? 1.2 : 1.4))); // smaller on small screens
    const influence = 140; // wider influence for smoother falloff
    const falloffPower = 1.6; // shape the curve for easing-like feel
    let containerRect = dock.getBoundingClientRect();
    let baseWidths = items.map((el) => el.offsetWidth);

    const lerp = (a, b, t) => a + (b - a) * t;

    // Per-item animation state with damping
    const state = items.map(() => ({
      currentScale: baseScale,
      targetScale: baseScale,
      currentLeft: 0,
      currentRight: 0,
      targetLeft: 0,
      targetRight: 0
    }));
    let animating = false;

    const animate = () => {
      let still = false;
      for (let i = 0; i < items.length; i++) {
        const s = state[i];
        // Damping factors
        s.currentScale = lerp(s.currentScale, s.targetScale, 0.18);
        s.currentLeft = lerp(s.currentLeft, s.targetLeft, 0.22);
        s.currentRight = lerp(s.currentRight, s.targetRight, 0.22);

        const item = items[i];
        item.style.transform = 'scale(' + s.currentScale + ')';
        item.style.marginLeft = Math.round(s.currentLeft) + 'px';
        item.style.marginRight = Math.round(s.currentRight) + 'px';

        if (Math.abs(s.currentScale - s.targetScale) > 0.001 ||
            Math.abs(s.currentLeft - s.targetLeft) > 0.5 ||
            Math.abs(s.currentRight - s.targetRight) > 0.5) {
          still = true;
        }
      }
      if (still) {
        animating = true;
        requestAnimationFrame(animate);
      } else {
        animating = false;
      }
    };

    const onMouseMove = (e) => {
      const x = e.clientX - containerRect.left;
      items.forEach((item, idx) => {
        const r = item.getBoundingClientRect();
        const itemCenter = (r.left + r.right) / 2 - containerRect.left;
        const dist = Math.abs(x - itemCenter);
        const raw = Math.max(0, 1 - dist / influence);
        const t = Math.pow(raw, falloffPower);
        const target = lerp(baseScale, maxScale, t);
        state[idx].targetScale = target;
        const baseW = baseWidths[idx] || item.offsetWidth;
        const extra = Math.max(0, (target - 1) * baseW * 0.30);
        const pad = 6; // constant base spacing
        state[idx].targetLeft = extra + pad;
        state[idx].targetRight = extra + pad;

        // no highlight pill
      });
      if (!animating) animate();
    };

    const onMouseLeave = () => {
      for (let i = 0; i < items.length; i++) {
        state[i].targetScale = baseScale;
        state[i].targetLeft = 0;
        state[i].targetRight = 0;
      }
      if (!animating) animate();
      // After the animation settles, clear inline margins to restore CSS gap
      setTimeout(() => {
        if (animating) return;
        items.forEach((item) => { item.style.marginLeft = ''; item.style.marginRight = ''; });
      }, 260);
    };

    const onResize = () => {
      containerRect = dock.getBoundingClientRect();
      // Recompute base widths on resize to keep spacing accurate
      baseWidths = items.map((el) => el.offsetWidth);
    };

    dock.addEventListener('mousemove', onMouseMove);
    dock.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', onResize);

    // Set active link based on current path
    try {
      const path = window.location.pathname.split('/').pop() || 'index.html';
      items.forEach((item) => {
        const href = item.getAttribute('href');
        if (!href) return;
        const file = href.split('/').pop();
        if (file === path) item.classList.add('active');
      });
    } catch {}
  })();
})();
