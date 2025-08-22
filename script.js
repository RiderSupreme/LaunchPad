(function () {
  "use strict";

  // Storage keys
  const LS_KEYS = {
    PROFILE: "lp_profile",
    POINTS: "lp_points",
    PROJECTS: "lp_projects",
    LP_ITEMS: "lp_items"
  };

  // Seed data
  const USERS = [
    { id: "u1", name: "Ava Patel", role: "Frontend Engineer", skills: ["React", "TypeScript", "UI/UX", "CSS", "Accessibility"], projects: ["Alpha UI Revamp", "Design System"] },
    { id: "u2", name: "Liam Chen", role: "Backend Engineer", skills: ["Node.js", "Express", "PostgreSQL", "API Design", "Docker"], projects: ["Inventory API", "Auth Service"] },
    { id: "u3", name: "Sofia Martinez", role: "Data Analyst", skills: ["Python", "Pandas", "SQL", "Tableau", "Statistics"], projects: ["Sales Dashboard", "Forecasting Model"] },
    { id: "u4", name: "Noah Johnson", role: "DevOps Engineer", skills: ["AWS", "Terraform", "CI/CD", "Kubernetes", "Monitoring"], projects: ["Infra as Code", "Observability Stack"] },
    { id: "u5", name: "Maya Singh", role: "Product Manager", skills: ["Product Strategy", "Roadmapping", "User Research", "Agile"], projects: ["Mobile MVP", "User Interviews"] },
    { id: "u6", name: "Ethan Brown", role: "Full Stack Engineer", skills: ["React", "Node.js", "GraphQL", "TypeScript", "Testing"], projects: ["Partner Portal", "E2E Tests"] },
  ];

  const PROJECTS = [
    { id: "p1", title: "Alpha UI Revamp", ownerId: "u1", requiredSkills: ["React", "CSS"], status: "open" },
    { id: "p2", title: "Inventory API", ownerId: "u2", requiredSkills: ["Node.js", "PostgreSQL"], status: "open" },
    { id: "p3", title: "Sales Dashboard", ownerId: "u3", requiredSkills: ["SQL", "Tableau"], status: "open" },
    { id: "p4", title: "Infra as Code", ownerId: "u4", requiredSkills: ["Terraform", "AWS"], status: "open" },
    { id: "p5", title: "Mobile MVP", ownerId: "u5", requiredSkills: ["Product Strategy", "User Research"], status: "open" },
    { id: "p6", title: "Partner Portal", ownerId: "u6", requiredSkills: ["React", "GraphQL"], status: "open" },
  ];

  const PRESET_SKILLS = Array.from(new Set(USERS.flatMap(u => u.skills))).sort();

  // Helpers
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
    }
    const lp = readJSON(LS_KEYS.LP_ITEMS, null);
    if (!lp) {
      // seed with one sample listing
      writeJSON(LS_KEYS.LP_ITEMS, [
        {
          id: "lp1",
          title: "Compact 3D Printer",
          image: "",
          target: 10000,
          preorderUnitPrice: 199,
          preorderPct: 60,
          microPct: 40,
          microRaised: 2500,
          preordersUnits: 18,
          ownerId: getCurrentUserId()
        }
      ]);
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

  // Rendering
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
      card.innerHTML = `
        <div class="header">
          <div>
            <div class="title">${p.title}</div>
            <div class="subtitle">Owner: ${owner?.name || "Unknown"}</div>
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
      const card = document.createElement("article");
      card.className = "person";
      card.innerHTML = `
        <div class="header">
          <div>
            <div class="title">${u.name}</div>
            <div class="subtitle">${u.role}</div>
          </div>
          <div class="score">
            <span class="label kicker">Points</span>
            <span class="value">${u.points}</span>
          </div>
        </div>
        <div class="row tags">${u.skills.map(s => `<span class="tag">${s}</span>`).join("")}</div>
        <div class="row kicker">Projects: ${u.projects.join(", ")}</div>
        <div class="row">
          <button class="btn small primary" type="button">Connect</button>
          <button class="btn small ghost" type="button">View Profile</button>
        </div>
      `;
      list.appendChild(card);
    });
    count.textContent = String(filtered.length);
  }

  // --- Launchpad (Funding) ---
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

  function renderLaunchpad() {
    const list = byId("lpList");
    const count = byId("lpCount");
    if (!list || !count) return;
    const items = getLPItems();
    list.innerHTML = "";
    items.forEach(item => {
      const preorderTarget = (item.target || 0) * (item.preorderPct || 0) / 100;
      const microTarget = (item.target || 0) * (item.microPct || 0) / 100;
      const preorderRaised = (item.preordersUnits || 0) * (item.preorderUnitPrice || 0);
      const microRaised = (item.microRaised || 0);
      const totalRaised = preorderRaised + microRaised;
      const imgSrc = item.image && item.image.trim() ? item.image.trim() : "";

      const card = document.createElement("article");
      card.className = "lp-card";
      card.innerHTML = `
        <img class="lp-thumb" alt="${item.title}" ${imgSrc ? `src="${imgSrc}"` : ''} />
        <div class="lp-meta">
          <div class="header">
            <div>
              <div class="title">${item.title}</div>
              <div class="subtitle">Goal: ${formatMoney(item.target)} • Split: Preorders ${item.preorderPct}% / Micro ${item.microPct}%</div>
            </div>
            <div class="score">
              <span class="label kicker">Raised</span>
              <span class="value">${formatMoney(totalRaised)}</span>
            </div>
          </div>

          <div class="row">
            <div class="progress micro" title="Micro investments">
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
            <input type="number" class="lp-micro-input" min="1" step="1" placeholder="Amount" data-id="${item.id}" />
            <button class="btn small" data-action="micro" data-id="${item.id}">Invest</button>
            <input type="number" class="lp-preorder-input" min="1" step="1" placeholder="Units" data-id="${item.id}" />
            <button class="btn small" data-action="preorder" data-id="${item.id}">Preorder</button>
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
            alert('Funding split must total 100%.');
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
            { id, title, image: imageData, target, preorderUnitPrice, preorderPct, microPct, microRaised: 0, preordersUnits: 0, ownerId: getCurrentUserId() }
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

  function renderMyPoints() {
    const me = getCurrentUserId();
    const points = readJSON(LS_KEYS.POINTS, {});
    const el = byId("myPoints");
    if (el) el.textContent = String(points[me] || 0);
  }

  function renderProfileSummary() {
    const wrap = byId("profileSummary");
    const profile = readJSON(LS_KEYS.PROFILE, null);
    if (!profile) {
      wrap.innerHTML = '<p class="muted">No profile saved yet.</p>';
      return;
    }
    const skills = (profile.skills || []).join(", ");
    wrap.innerHTML = `
      <div class="title">${profile.name || "(No name)"}</div>
      <div class="subtitle">${profile.role || "(No role)"}</div>
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

  // Init guards per page
  ensureSeeds();
  // Profile page elements
  const hasProfileForm = !!document.getElementById("profileForm");
  const isSkillLinkPage = !!document.getElementById("projectsList") || !!document.getElementById("peopleList");
  const isLaunchpadPage = !!document.getElementById("lpList");

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

  if (isLaunchpadPage) {
    wireLaunchpad();
    renderLaunchpad();
  }

  // Three.js Particle Background
  const animationContainer = document.getElementById("animation-container");
  if (animationContainer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof THREE !== 'undefined') {
    // Three.js setup - account for CSS scaling
    const scene = new THREE.Scene();
    const scale = 0.8; // Match the CSS transform scale
    const scaledWidth = window.innerWidth / scale;
    const scaledHeight = window.innerHeight / scale;
    
    const camera = new THREE.PerspectiveCamera(75, scaledWidth / scaledHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true 
    });
    renderer.setSize(scaledWidth, scaledHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    animationContainer.appendChild(renderer.domElement);

    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 4000;
    const posArray = new Float32Array(particlesCount * 3);

    // Distribute particles in a much larger area to ensure full screen coverage
    for(let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 30;     // x: much wider spread
      posArray[i + 1] = (Math.random() - 0.5) * 25; // y: much taller spread  
      posArray[i + 2] = (Math.random() - 0.5) * 15; // z: more depth
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Get theme-aware particle color
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

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', (event) => {
      mouseX = event.clientX / window.innerWidth - 0.5;
      mouseY = event.clientY / window.innerHeight - 0.5;
    });

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      // Continuous rotation
      particlesMesh.rotation.y += 0.0008;
      particlesMesh.rotation.x += 0.0005;

      // Subtle particle movement
      for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        particlesGeometry.attributes.position.array[i3 + 1] += (Math.random() - 0.5) * 0.001;
      }
      particlesGeometry.attributes.position.needsUpdate = true;

      // Smooth mouse interaction
      particlesMesh.rotation.x += (mouseY * 0.3 - particlesMesh.rotation.x) * 0.02;
      particlesMesh.rotation.y += (mouseX * 0.3 - particlesMesh.rotation.y) * 0.02;

      renderer.render(scene, camera);
    }

    // Handle window resize - account for scaling
    window.addEventListener('resize', () => {
      const scaledWidth = window.innerWidth / scale;
      const scaledHeight = window.innerHeight / scale;
      camera.aspect = scaledWidth / scaledHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(scaledWidth, scaledHeight);
    });

    // Start animation
    animate();
  }

  // Theme handling with persistence
  const THEME_KEY = 'lp_theme';
  function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.textContent = theme === 'dark' ? 'Light' : 'Dark';
  }
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
      });
    }
  }
  initTheme();
})();


