// Linear-"My issues"-Liste, nachgebaut im Stil von Linear.
// Wird von content.js in die jeweilige Seite eingesetzt.
(() => {
  if (window.__ILR) return;

  const MY_ISSUES_URL = "https://linear.app/productlane/my-issues/assigned";
  const TYPE_ORDER = { started: 0, unstarted: 1, backlog: 2, triage: 3 };
  const PRIO_ORDER = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 };
  // Anzeigenamen nur in der Extension, in Linear heißen die Status weiter so.
  const GROUP_LABELS = { "In Progress": "Today", Todo: "This week", Backlog: "This month" };

  const STYLE = `
    :host {
      all: initial;
      display: block;
      align-self: stretch;
      min-width: 0;
      --bg: #fcfcfc;
      --group: #f3f3f4;
      --hover: #f4f4f5;
      --text: #1d1e21;
      --muted: #6c6f75;
      --faint: #9a9da3;
      --border: #e6e6e9;
      --urgent: #fc7840;
      --focus-bg: #fff8dc;
      --focus-hover: #fff3c4;
      --focus-border: #f3d675;
      --focus-text: #8a6200;
      --focus-dot: #e8a800;
      margin: 0 0 16px;
    }
    :host([data-theme="dark"]) {
      --bg: #141516;
      --group: #1e1f22;
      --hover: #1b1c1f;
      --text: #e6e6e8;
      --muted: #8a8d93;
      --faint: #62656b;
      --border: #2a2b2f;
      --focus-bg: #2a2310;
      --focus-hover: #322914;
      --focus-border: #5c4a17;
      --focus-text: #e8c25a;
      --focus-dot: #e8b020;
    }
    * { box-sizing: border-box; }
    .wrap {
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      font: 13px/1.4 "Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      container-type: inline-size;
    }
    .bar { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px 0 16px; border-bottom: 1px solid var(--border); }
    .crumb { flex: 1; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .crumb b { color: var(--text); font-weight: 500; }
    .btn { all: unset; cursor: pointer; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 6px; color: var(--muted); }
    .btn:hover { background: var(--hover); color: var(--text); }
    .btn.spin svg { animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .focus {
      display: block; margin: 10px 10px 4px; padding: 12px 14px;
      border-radius: 8px; background: var(--focus-bg); border: 1px solid var(--focus-border);
      color: inherit; text-decoration: none;
    }
    .focus:hover { background: var(--focus-hover); }
    .focus-label { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 11px; font-weight: 500; letter-spacing: 0.02em; color: var(--focus-text); }
    .focus-label i { width: 6px; height: 6px; border-radius: 50%; background: var(--focus-dot); }
    .focus-row { display: flex; align-items: center; gap: 10px; }
    .focus-row .title { font-size: 15px; }

    .list { padding: 6px; }
    .group {
      display: flex; align-items: center; gap: 8px;
      height: 36px; padding: 0 12px 0 8px; margin-top: 4px;
      border-radius: 6px; cursor: pointer; user-select: none;
      background: linear-gradient(90deg, color-mix(in srgb, var(--sc) 9%, var(--group)), var(--group) 45%);
    }
    .group:first-child { margin-top: 0; }
    .chev { width: 16px; display: grid; place-items: center; color: var(--faint); transition: transform 0.15s; }
    .group.collapsed .chev { transform: rotate(-90deg); }
    .group .name { font-weight: 500; }
    .group .count { color: var(--muted); }

    .row {
      display: flex; align-items: center; gap: 10px;
      height: 44px; padding: 0 12px 0 32px; border-radius: 6px;
      color: inherit; text-decoration: none; cursor: default;
    }
    .row:hover { background: var(--hover); }
    .ico { width: 16px; height: 16px; flex: none; display: grid; place-items: center; }
    .title { flex: 1; min-width: 0; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pills { display: flex; gap: 6px; flex: none; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      height: 24px; padding: 0 10px; border: 1px solid var(--border); border-radius: 999px;
      color: var(--muted); font-size: 12px; white-space: nowrap; max-width: 220px; overflow: hidden; text-overflow: ellipsis;
    }
    .pill i { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .avatar { width: 18px; height: 18px; border-radius: 50%; flex: none; object-fit: cover; background: var(--group); display: grid; place-items: center; font-size: 9px; font-weight: 600; color: var(--muted); }
    .date { width: 52px; flex: none; text-align: right; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }

    .empty { padding: 40px 24px; text-align: center; color: var(--muted); }
    .empty b { display: block; color: var(--text); font-size: 14px; font-weight: 500; margin-bottom: 6px; }
    .cta { all: unset; cursor: pointer; display: inline-block; margin-top: 14px; padding: 6px 12px; border-radius: 6px; background: #5e6ad2; color: #fff; font-weight: 500; }

    @container (max-width: 480px) { .pills { display: none; } }
    @container (max-width: 380px) { .avatar, .date { display: none; } }
  `;

  const ICONS = {
    chevron: `<svg width="8" height="8" viewBox="0 0 8 8"><path d="M0.5 2h7L4 6.5z" fill="currentColor"/></svg>`,
    refresh: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9"/><path d="M12.5 1.5v3h-3"/></svg>`,
    external: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.5h4.5V7"/><path d="M13.5 2.5 7 9"/><path d="M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3"/></svg>`,
    linear: `<svg width="14" height="14" viewBox="0 0 100 100" fill="currentColor"><path d="M1.2 61.5c-.2-1 1-1.6 1.7-.9l36.5 36.5c.7.7.1 1.9-.9 1.7A50.1 50.1 0 0 1 1.2 61.5ZM0 46.9c0 .3.1.6.3.8l52 52c.2.2.5.3.8.3 2.4-.2 4.7-.5 7-1 .8-.2 1-1.1.5-1.7L2.7 39.4c-.6-.6-1.5-.3-1.7.5-.5 2.3-.8 4.6-1 7Zm4.2-17.2c-.2.4-.1.8.2 1.1l64.8 64.8c.3.3.7.4 1.1.2 1.8-.8 3.5-1.7 5.1-2.7.6-.3.6-1.1.2-1.6L8.5 24.4c-.5-.5-1.3-.4-1.6.2-1 1.6-1.9 3.3-2.7 5.1Zm8.5-11.6c-.4-.4-.4-1 0-1.4A50 50 0 0 1 83.3 87.3c-.4.4-1 .4-1.4 0L12.7 18.1Z"/></svg>`,
    project: (c) => `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"><path d="M8 1.5 14 4.8v6.4L8 14.5 2 11.2V4.8z"/><path d="M2 4.8 8 8l6-3.2M8 8v6.5"/></svg>`,
  };

  function stateIcon(type, color) {
    if (type === "backlog") {
      return `<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="1.4 1.74"/></svg>`;
    }
    if (type === "unstarted") {
      return `<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
    }
    if (type === "triage") {
      return `<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="7" fill="${color}"/><path d="M3.2 7 5.4 4.8v1.4h3.2V4.8L10.8 7 8.6 9.2V7.8H5.4v1.4z" fill="#fff"/></svg>`;
    }
    // started: Ring mit halb gefülltem Kreis, wie in Linear.
    return `<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke="${color}" stroke-width="1.5"/><path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="${color}"/></svg>`;
  }

  function priorityIcon(p) {
    if (p === 1) {
      return `<svg width="14" height="14" viewBox="0 0 14 14"><rect width="14" height="14" rx="3" fill="var(--urgent)"/><rect x="6.1" y="3" width="1.8" height="5.2" rx=".9" fill="#fff"/><circle cx="7" cy="10.4" r="1" fill="#fff"/></svg>`;
    }
    if (!p) {
      return `<svg width="14" height="14" viewBox="0 0 14 14" fill="var(--faint)"><rect x="1.5" y="6.25" width="3" height="1.5" rx=".5"/><rect x="5.5" y="6.25" width="3" height="1.5" rx=".5"/><rect x="9.5" y="6.25" width="3" height="1.5" rx=".5"/></svg>`;
    }
    const filled = { 2: 3, 3: 2, 4: 1 }[p];
    const bar = (i, x, y, h) =>
      `<rect x="${x}" y="${y}" width="3" height="${h}" rx="1" fill="var(--muted)" opacity="${i < filled ? 1 : 0.35}"/>`;
    return `<svg width="14" height="14" viewBox="0 0 14 14">${bar(0, 1.5, 8, 4.5)}${bar(1, 5.5, 5, 7.5)}${bar(2, 9.5, 2, 10.5)}</svg>`;
  }

  const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "html") node.innerHTML = v;
      else if (k === "style") node.style.cssText = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null && c !== false) node.append(c);
    return node;
  };

  function formatDate(iso) {
    const d = new Date(iso);
    const opts = { month: "short", day: "numeric" };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = "2-digit";
    return d.toLocaleDateString("en-US", opts);
  }

  let host = null;
  let root = null;
  let data = null;
  let loading = false;
  let lastLoad = 0;
  let avatar = null;
  let collapsed = {};

  chrome.storage.local.get("ilrCollapsed").then((r) => {
    collapsed = r.ilrCollapsed || {};
    render();
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.linearKey) {
      data = null;
      lastLoad = 0;
      load();
    }
  });

  const groupKey = (s) => `${s.type}:${s.name}`;
  const isCollapsed = (s) => collapsed[groupKey(s)] ?? s.type !== "started";

  function toggle(s) {
    collapsed[groupKey(s)] = !isCollapsed(s);
    chrome.storage.local.set({ ilrCollapsed: collapsed });
    render();
  }

  function render() {
    if (!root) return;
    const wrap = el("div", { class: "wrap" },
      el("div", { class: "bar" },
        el("span", { class: "ico", html: ICONS.linear }),
        el("span", { class: "crumb" }, el("b", {}, "My issues"), " › Assigned"),
        el("button", { class: `btn ${loading ? "spin" : ""}`, title: "Refresh", html: ICONS.refresh, onclick: load }),
        el("a", { class: "btn", title: "Open in Linear", href: MY_ISSUES_URL, target: "_blank", rel: "noopener", html: ICONS.external }),
      ),
      body(),
    );
    root.replaceChildren(el("style", {}, STYLE), wrap);
  }

  function body() {
    if (!data) return el("div", { class: "empty" }, "Loading…");
    if (data.needsKey) {
      return el("div", { class: "empty" },
        el("b", {}, data.invalid ? "Linear API key is invalid" : "Connect Linear"),
        "Your assigned issues will show up here instead of the feed.",
        el("br"),
        el("button", { class: "cta", onclick: () => chrome.runtime.sendMessage({ type: "open-options" }) }, "Add API key"),
      );
    }
    if (data.error) return el("div", { class: "empty" }, el("b", {}, "Couldn't reach Linear"), data.error);

    const issues = data.viewer.assignedIssues.nodes;
    if (!issues.length) return el("div", { class: "empty" }, el("b", {}, "No open issues"), "Nothing assigned to you.");

    const groups = new Map();
    for (const i of issues) {
      const k = groupKey(i.state);
      if (!groups.has(k)) groups.set(k, { state: i.state, issues: [] });
      groups.get(k).issues.push(i);
    }
    const sorted = [...groups.values()].sort(
      // Wie in Linear: innerhalb von "started" der Status am nächsten an "done" zuerst.
      (a, b) =>
        TYPE_ORDER[a.state.type] - TYPE_ORDER[b.state.type] ||
        (a.state.type === "started" ? b.state.position - a.state.position : a.state.position - b.state.position),
    );

    for (const g of sorted) {
      g.issues.sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] || new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    const top = sorted[0].issues.shift();
    if (!sorted[0].issues.length) sorted.shift();

    const list = el("div", { class: "list" });
    for (const g of sorted) {
      const s = g.state;
      const closed = isCollapsed(s);
      list.append(
        el("div", { class: `group ${closed ? "collapsed" : ""}`, style: `--sc: ${s.color}`, onclick: () => toggle(s) },
          el("span", { class: "chev", html: ICONS.chevron }),
          el("span", { class: "ico", html: stateIcon(s.type, s.color) }),
          el("span", { class: "name" }, GROUP_LABELS[s.name] ?? s.name),
          el("span", { class: "count" }, String(g.issues.length)),
        ),
      );
      if (closed) continue;
      g.issues.forEach((i) => list.append(row(i)));
    }
    return el("div", {}, focusCard(top), sorted.length ? list : null);
  }

  function focusCard(i) {
    return el("a", { class: "focus", href: i.url, target: "_blank", rel: "noopener", title: `${i.identifier} ${i.title}` },
      el("div", { class: "focus-label" }, el("i"), "Current focus"),
      el("div", { class: "focus-row" },
        el("span", { class: "ico", html: priorityIcon(i.priority) }),
        el("span", { class: "title" }, i.title),
        el("span", { class: "date" }, formatDate(i.createdAt)),
      ),
    );
  }

  function row(i) {
    const pills = [];
    if (i.project) {
      pills.push(el("span", { class: "pill" }, el("span", { class: "ico", html: ICONS.project(i.project.color) }), i.project.name));
    }
    for (const l of i.labels.nodes) pills.push(el("span", { class: "pill" }, el("i", { style: `background: ${l.color}` }), l.name));

    const name = data.viewer.name || "";
    const av = avatar
      ? el("img", { class: "avatar", src: avatar, alt: "" })
      : el("span", { class: "avatar" }, name.slice(0, 1).toUpperCase());

    return el("a", { class: "row", href: i.url, target: "_blank", rel: "noopener", title: `${i.identifier} ${i.title}` },
      el("span", { class: "ico", html: priorityIcon(i.priority) }),
      el("span", { class: "title" }, i.title),
      pills.length ? el("span", { class: "pills" }, pills) : null,
      av,
      el("span", { class: "date" }, formatDate(i.createdAt)),
    );
  }

  async function load() {
    if (loading) return;
    loading = true;
    lastLoad = Date.now();
    render();
    try {
      data = await chrome.runtime.sendMessage({ type: "issues" });
    } catch (e) {
      data = { error: String(e) };
    }
    loading = false;
    render();
    const url = data?.viewer?.avatarUrl;
    if (url && !avatar) {
      chrome.runtime.sendMessage({ type: "avatar", url }).then((d) => {
        if (d) {
          avatar = d;
          render();
        }
      }).catch(() => {});
    }
  }

  // Hell oder dunkel je nach Hintergrund der Seite.
  function pageIsDark() {
    for (const node of [document.body, document.documentElement]) {
      if (!node) continue;
      const m = getComputedStyle(node).backgroundColor.match(/\d+(\.\d+)?/g);
      if (!m) continue;
      const [r, g, b, a = 1] = m.map(Number);
      if (a === 0) continue;
      return 0.299 * r + 0.587 * g + 0.114 * b < 128;
    }
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }

  window.__ILR = {
    getHost() {
      if (!host) {
        host = document.createElement("div");
        host.id = "ilr-host";
        root = host.attachShadow({ mode: "closed" });
        render();
      }
      const theme = pageIsDark() ? "dark" : "light";
      if (host.dataset.theme !== theme) host.dataset.theme = theme;
      return host;
    },
    // Lädt beim ersten Anzeigen und danach höchstens einmal pro Minute.
    tick() {
      if (!document.hidden && Date.now() - lastLoad > 60000) load();
    },
  };
})();
