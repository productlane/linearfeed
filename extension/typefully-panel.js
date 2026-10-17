// Zeigt im Productlane-Changelog-Editor (/edit-changelog/<id>) die passenden Typefully-Posts,
// einen Abschnitt pro Account, so wie sie auf X und LinkedIn aussehen werden.
// Die Extension schlägt pro Account den wahrscheinlichsten Entwurf vor. Eine Auswahl von Hand
// wird pro Changelog im Browser gespeichert.
(() => {
  if (window.__ilrTypefully) return;
  window.__ilrTypefully = true;

  const STOPWORDS = new Set(
    "the and for with you your our now can new from that this are was into when what who how all its it's has have will not but more about via than then them they their there".split(" "),
  );
  const STATUS = {
    draft: "Draft",
    planned: "Planned",
    scheduled: "Scheduled",
    publishing: "Publishing",
    published: "Published",
    error: "Failed",
  };
  const PLATFORMS = [["x", "X"], ["linkedin", "LinkedIn"]];

  const STYLE = `
    :host {
      all: initial;
      --bg: #ffffff;
      --text: #1d1e21;
      --muted: #6c6f75;
      --faint: #9a9da3;
      --border: #e6e6e9;
      --hover: #f3f3f4;
      --accent: #5e6ad2;
      position: fixed;
      z-index: 2147483000;
      font: 13px/1.5 "Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }
    :host([data-theme="dark"]) {
      --bg: #1b1c1f;
      --text: #e6e6e8;
      --muted: #8a8d93;
      --faint: #62656b;
      --border: #2c2d31;
      --hover: #222326;
    }
    * { box-sizing: border-box; }
    .card {
      background: var(--bg); border: 1px solid var(--border); border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      display: flex; flex-direction: column; max-height: calc(100vh - 96px); overflow: hidden;
    }
    .head { display: flex; align-items: center; gap: 8px; padding: 10px 10px 10px 14px; border-bottom: 1px solid var(--border); }
    .head .label { flex: 1; font-weight: 500; }
    .scroll { overflow-y: auto; }
    .btn { all: unset; cursor: pointer; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 6px; color: var(--muted); }
    .btn:hover { background: var(--hover); color: var(--text); }
    .link { all: unset; cursor: pointer; color: var(--accent); font-weight: 500; }
    .link:hover { text-decoration: underline; }

    .account { padding: 12px 14px 16px; border-bottom: 1px solid var(--border); }
    .account:last-child { border-bottom: 0; }
    .acc-head { display: flex; align-items: center; gap: 8px; }
    .acc-head .who { flex: 1; min-width: 0; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .badge { font-size: 11px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); white-space: nowrap; }
    .badge.planned, .badge.scheduled { color: #b7791f; border-color: #f3d675; background: #fff8dc; }
    .badge.published { color: #1a7f4b; border-color: #a7e3c0; background: #ecfbf2; }
    .badge.error { color: #c0392b; border-color: #f5b7b1; background: #fdecea; }
    .acc-meta { margin-top: 2px; color: var(--faint); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tabs { display: flex; gap: 4px; margin: 10px 0; }
    .tab { all: unset; cursor: pointer; padding: 3px 10px; border-radius: 6px; color: var(--muted); font-weight: 500; }
    .tab.on { background: var(--hover); color: var(--text); }
    .published { margin-top: 8px; display: flex; gap: 12px; }
    .others { padding: 10px 14px 14px; color: var(--faint); font-size: 12px; display: flex; flex-wrap: wrap; gap: 4px 12px; }

    .picker { display: flex; flex-direction: column; min-height: 0; }
    .picker .bar { display: flex; align-items: baseline; gap: 8px; padding: 10px 14px 0; }
    .picker .bar span { flex: 1; color: var(--muted); }
    .picker input { all: unset; margin: 10px 14px 6px; padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px; color: var(--text); }
    .list { overflow-y: auto; padding: 0 6px 8px; }
    .item { all: unset; display: block; cursor: pointer; padding: 7px 8px; border-radius: 6px; }
    .item:hover { background: var(--hover); }
    .item .t { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item .s { display: block; font-size: 12px; color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .section { padding: 8px 8px 4px; font-size: 11px; color: var(--faint); text-transform: uppercase; letter-spacing: 0.04em; }

    .empty { padding: 20px 16px; text-align: center; color: var(--muted); }
    .empty b { display: block; color: var(--text); font-weight: 500; margin-bottom: 4px; }
    .cta { all: unset; cursor: pointer; display: inline-block; margin-top: 10px; padding: 6px 12px; border-radius: 6px; background: var(--accent); color: #fff; font-weight: 500; }
    .tab-toggle {
      all: unset; cursor: pointer; writing-mode: vertical-rl; transform: rotate(180deg);
      padding: 12px 6px; border: 1px solid var(--border); border-right: 0; border-radius: 0 8px 8px 0;
      background: var(--bg); color: var(--muted); font-weight: 500; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    }

    /* --- X, wie ein Post im Timeline (heller Modus) --- */
    .x { background: #fff; color: #0f1419; border: 1px solid #eff3f4; border-radius: 12px; overflow: hidden;
         font: 15px/20px "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .x-post { display: flex; gap: 8px; padding: 12px 16px 0; }
    .x-rail { display: flex; flex-direction: column; align-items: center; flex: none; width: 40px; }
    .x-rail img, .x-rail .ph { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #cfd9de; }
    .x-rail .line { flex: 1; width: 2px; background: #cfd9de; margin-top: 4px; }
    .x-main { flex: 1; min-width: 0; padding-bottom: 12px; }
    .x-name { display: flex; align-items: baseline; gap: 4px; white-space: nowrap; overflow: hidden; }
    .x-name b { font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
    .x-name span { color: #536471; overflow: hidden; text-overflow: ellipsis; }
    .x-name .more { margin-left: auto; color: #536471; }
    .x-text { white-space: pre-wrap; word-break: break-word; margin-top: 2px; }
    .x-text a, .x-text .tag { color: #1d9bf0; text-decoration: none; }
    .x-media { margin-top: 12px; border: 1px solid #cfd9de; border-radius: 16px; overflow: hidden; display: grid; gap: 2px; }
    .x-media.n2, .x-media.n4 { grid-template-columns: 1fr 1fr; aspect-ratio: 16 / 9; }
    .x-media.n3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; aspect-ratio: 16 / 9; }
    .x-media.n3 > :first-child { grid-row: span 2; }
    .x-media img, .x-media video { width: 100%; height: 100%; object-fit: cover; display: block; max-height: 510px; background: #000; }
    .x-media.n1 img, .x-media.n1 video { height: auto; }
    .x-media .ph { background: #eff3f4; min-height: 120px; display: grid; place-items: center; color: #536471; font-size: 13px; }
    .x-actions { display: flex; justify-content: space-between; margin-top: 12px; color: #536471; max-width: 425px; }
    .x-actions svg { width: 18.75px; height: 18.75px; }

    /* --- LinkedIn, wie ein Beitrag im Feed --- */
    .li { background: #fff; color: rgba(0, 0, 0, 0.9); border: 1px solid #e0dfdc; border-radius: 8px; overflow: hidden;
          font: 14px/20px -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Fira Sans", Ubuntu, Oxygen, sans-serif; }
    .li-head { display: flex; gap: 8px; padding: 12px 16px 0; }
    .li-head img, .li-head .ph { width: 48px; height: 48px; object-fit: cover; background: #e9e5df; flex: none; }
    .li .round { border-radius: 50%; }
    .li .square { border-radius: 4px; }
    .li-who { flex: 1; min-width: 0; }
    .li-who b { display: block; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .li-who span { display: block; font-size: 12px; line-height: 16px; color: rgba(0, 0, 0, 0.6); }
    .li-more-btn { color: rgba(0, 0, 0, 0.6); }
    .li-text { padding: 8px 16px 0; white-space: pre-wrap; word-break: break-word; }
    .li-text.clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .li-text a { color: #0a66c2; font-weight: 600; text-decoration: none; }
    .li-see { all: unset; cursor: pointer; display: block; padding: 0 16px; text-align: right; color: rgba(0, 0, 0, 0.6); }
    .li-see:hover { color: #0a66c2; text-decoration: underline; }
    .li-media { margin-top: 8px; display: grid; gap: 2px; }
    .li-media.n2 { grid-template-columns: 1fr 1fr; }
    .li-media img, .li-media video { width: 100%; display: block; background: #000; }
    .li-media .ph { background: #e9e5df; min-height: 160px; display: grid; place-items: center; color: rgba(0, 0, 0, 0.6); }
    .li-actions { display: flex; justify-content: space-around; margin: 4px 8px 0; padding: 4px 0; border-top: 1px solid #e8e8e8; }
    .li-actions span { display: flex; align-items: center; gap: 6px; padding: 10px 6px; font-weight: 600; color: rgba(0, 0, 0, 0.6); white-space: nowrap; }
    .li-actions svg { width: 20px; height: 20px; }
    .li-comment { display: flex; gap: 8px; padding: 8px 16px 12px; }
    .li-comment img, .li-comment .ph { width: 32px; height: 32px; object-fit: cover; flex: none; background: #e9e5df; }
    .li-bubble { flex: 1; min-width: 0; background: #f2f2f2; border-radius: 0 8px 8px 8px; padding: 8px 12px; }
    .li-bubble b { display: block; font-size: 12px; font-weight: 600; }
    .li-bubble div { font-size: 14px; white-space: pre-wrap; word-break: break-word; }
    .li-bubble a { color: #0a66c2; font-weight: 600; text-decoration: none; }
  `;

  const ICONS = {
    external: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.5h4.5V7"/><path d="M13.5 2.5 7 9"/><path d="M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3"/></svg>`,
    refresh: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9"/><path d="M12.5 1.5v3h-3"/></svg>`,
    close: `<svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>`,
    logo: `<svg width="14" height="14" viewBox="0 0 16 16"><rect width="16" height="16" rx="4" fill="#1d9bf0"/><path d="M4.5 5h7M8 5v6.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    // X-Aktionsleiste
    reply: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/></svg>`,
    repost: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg>`,
    like: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/></svg>`,
    views: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"/></svg>`,
    share: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/></svg>`,
    // LinkedIn-Aktionsleiste
    liLike: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.46 11l-3.91-3.91a7 7 0 01-1.69-2.74l-.49-1.47A2.76 2.76 0 0010.76 1 2.75 2.75 0 008 3.74v1.12a9.19 9.19 0 00.46 2.85L8.89 9H4.12A2.12 2.12 0 002 11.12a2.16 2.16 0 00.92 1.76A2.11 2.11 0 002 14.62a2.14 2.14 0 001.28 2 2 2 0 00-.28 1 2.12 2.12 0 002 2.12v.14A2.12 2.12 0 007.12 22h7.49a8.08 8.08 0 003.58-.84l.31-.16H21V11zM19 19h-1l-.73.37a6.14 6.14 0 01-2.69.63H7.72a1 1 0 01-1-.72l-.25-.87-.85-.41A1 1 0 015 17l.17-1-.76-.74A1 1 0 014.27 14l.66-1.09-.73-1.1a.49.49 0 01.08-.7.48.48 0 01.34-.11h7.05l-1.31-3.92A7 7 0 0110 4.86V3.75a.77.77 0 01.75-.75.75.75 0 01.71.51L12 5a9 9 0 002.13 3.5l4.5 4.5H19z"/></svg>`,
    liComment: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 9h10v1H7zm0 4h7v-1H7zm16-2a6.78 6.78 0 01-2.84 5.61L12 22v-4H8A7 7 0 018 4h8a7 7 0 017 7zm-2 0a5 5 0 00-5-5H8a5 5 0 000 10h6v2.28L19 15a4.79 4.79 0 002-4z"/></svg>`,
    liRepost: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.96 5H6c-.55 0-1 .45-1 1v10H3V6c0-1.66 1.34-3 3-3h7.96L12 0h2.37L17 4l-2.63 4H12l1.96-3zm5.54 3H19v10c0 .55-.45 1-1 1h-7.96L12 16H9.63L7 20l2.63 4H12l-1.96-3H18c1.66 0 3-1.34 3-3V8h-1.5z"/></svg>`,
    liSend: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3L0 10l7.66 4.26L16 8l-6.26 8.34L14 24l7-21z"/></svg>`,
    globe: `<svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(0,0,0,0.6)" style="vertical-align: -2px"><path d="M8 1a7 7 0 107 7 7 7 0 00-7-7zM3 8a5 5 0 011-3l.55.55A1.5 1.5 0 015 6.62v1.07a.75.75 0 00.22.53l.56.56a.75.75 0 00.53.22H7v.69a.75.75 0 00.22.53l.56.56a.75.75 0 01.22.53V13a5 5 0 01-5-5zm6.24 4.83l2-2.46a.75.75 0 00.09-.8l-.58-1.16A.76.76 0 0010 8H7v-.19a.51.51 0 01.28-.45l.38-.19a.74.74 0 01.68 0L9 7.5l.38-.7a1 1 0 00.12-.48v-.85a.78.78 0 01.21-.53l1.07-1.09a5 5 0 01-1.54 9z"/></svg>`,
  };

  const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null && c !== false) node.append(c);
    return node;
  };

  const send = (msg) => chrome.runtime.sendMessage(msg).catch((e) => ({ error: String(e) }));

  // --- Zuordnung -------------------------------------------------------------

  function words(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      .map((w) => w.replace(/(ing|ed|es|s)$/, ""));
  }

  // Treffer im Titel des Entwurfs zählen mehr als Treffer in seinem Text.
  function score(draft, changelog) {
    const titleWords = new Set(words(draft.title));
    const textWords = new Set(words(draft.preview));
    let s = 0;
    for (const w of new Set(words(changelog.title))) s += titleWords.has(w) ? 4 : textWords.has(w) ? 1.5 : 0;
    for (const w of new Set(words(changelog.body).slice(0, 60))) if (titleWords.has(w) || textWords.has(w)) s += 0.5;
    if (/changelog/i.test(draft.title)) s += 2;
    return s;
  }

  // --- Zustand ---------------------------------------------------------------

  let host = null;
  let root = null;
  let changelogId = null;
  let changelog = { title: "", body: "" };
  let drafts = null; // { drafts } | { needsKey } | { error }
  let pairs = {}; // changelogId -> { setId: draftId | null }
  let slots = []; // [{ setId, ref, manual }]
  const details = new Map(); // draftId -> Antwort von tf-draft
  const accounts = new Map(); // setId -> Social-Set mit Plattform-Profilen
  const images = new Map(); // Schlüssel -> data:-URL | "loading" | null
  const tabs = new Map(); // setId -> "x" | "linkedin"
  const expanded = new Set(); // aufgeklappte LinkedIn-Texte
  let pickerSet = null; // setId, für das gerade ausgewählt wird
  let query = "";
  let open = false; // nur relevant, wenn wenig Platz ist

  chrome.storage.local.get("tfPairs").then((r) => {
    pairs = r.tfPairs || {};
    // Altes Format { id, setId } in das neue überführen.
    for (const [k, v] of Object.entries(pairs)) if (v && "id" in v) pairs[k] = { [v.setId]: v.id };
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.typefullyKey) {
      drafts = null;
      details.clear();
      accounts.clear();
      slots = [];
      loadDrafts(true);
    }
  });

  async function loadDrafts(force) {
    drafts = await send({ type: "tf-drafts", force });
    choose();
  }

  // Pro Account: gespeicherte Wahl, sonst der beste Treffer.
  function choose() {
    if (!drafts?.drafts || !changelogId) return render();
    const saved = pairs[changelogId] || {};
    const setIds = [...new Set(drafts.drafts.map((d) => d.setId))];
    slots = [];
    for (const setId of setIds) {
      const inSet = drafts.drafts.filter((d) => d.setId === setId);
      if (setId in saved) {
        const ref = inSet.find((d) => d.id === saved[setId]);
        if (ref) slots.push({ setId, ref, manual: true });
        continue;
      }
      const best = inSet.map((d) => ({ d, s: score(d, changelog) })).sort((a, b) => b.s - a.s)[0];
      if (best?.s >= 5) slots.push({ setId, ref: best.d, manual: false });
    }
    for (const slot of slots) {
      if (!details.has(slot.ref.id)) loadDetail(slot.ref);
      if (!accounts.has(slot.setId)) loadAccount(slot.setId);
    }
    render();
  }

  async function loadDetail(ref) {
    details.set(ref.id, null);
    const res = await send({ type: "tf-draft", setId: ref.setId, id: ref.id });
    details.set(ref.id, res);
    render();
  }

  async function loadAccount(setId) {
    accounts.set(setId, null);
    const res = await send({ type: "tf-account", setId });
    accounts.set(setId, res);
    render();
  }

  // Bilder einmal laden, danach aus dem Zwischenspeicher.
  function image(key, load) {
    if (!images.has(key)) {
      images.set(key, "loading");
      load().then((src) => {
        images.set(key, src || null);
        render();
      });
    }
    const v = images.get(key);
    return v === "loading" ? undefined : v;
  }
  // Avatare direkt laden: productlane.com setzt keine CSP, die fremde Bild-Hosts sperrt.
  const avatar = (url) => url || null;
  const media = (setId, id) =>
    image(`media:${id}`, () => send({ type: "tf-media", setId, mediaId: id }).then((m) => (m?.src ? m : null)));

  function pick(setId, d) {
    pairs[changelogId] = { ...(pairs[changelogId] || {}), [setId]: d ? d.id : null };
    chrome.storage.local.set({ tfPairs: pairs });
    pickerSet = null;
    query = "";
    choose();
  }

  // --- Darstellung: Rahmen ---------------------------------------------------

  function formatDate(iso) {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  const shortDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  function render() {
    if (!root) return;
    const space = layout();
    if (!space.wide && !open) {
      root.replaceChildren(
        el("style", {}, STYLE),
        el("button", { class: "tab-toggle", onclick: () => { open = true; render(); } }, "Typefully"),
      );
      return;
    }
    const scrollTop = root.querySelector(".scroll")?.scrollTop || 0;
    root.replaceChildren(el("style", {}, STYLE), el("div", { class: "card" }, header(space), content()));
    const scroller = root.querySelector(".scroll");
    if (scroller) scroller.scrollTop = scrollTop;
  }

  function header(space) {
    return el("div", { class: "head" },
      el("span", { html: ICONS.logo }),
      el("span", { class: "label" }, "Typefully posts"),
      el("button", {
        class: "btn", title: "Refresh", html: ICONS.refresh,
        onclick: () => { details.clear(); images.clear(); render(); loadDrafts(true); },
      }),
      space.wide ? null : el("button", { class: "btn", title: "Close", html: ICONS.close, onclick: () => { open = false; render(); } }),
    );
  }

  function content() {
    if (!drafts) return el("div", { class: "empty" }, "Loading…");
    if (drafts.needsKey) {
      return el("div", { class: "empty" },
        el("b", {}, drafts.invalid ? "Typefully API key is invalid" : "Connect Typefully"),
        "Add a Typefully API key to see the posts for this changelog.",
        el("br"),
        el("button", { class: "cta", onclick: () => send({ type: "open-options" }) }, "Add API key"),
      );
    }
    if (drafts.error) return el("div", { class: "empty" }, el("b", {}, "Couldn't reach Typefully"), drafts.error);
    if (pickerSet != null) return picker(pickerSet);

    const setIds = [...new Set(drafts.drafts.map((d) => d.setId))];
    const without = setIds.filter((id) => !slots.some((s) => s.setId === id));
    const accountName = (setId) => drafts.drafts.find((d) => d.setId === setId)?.account;

    return el("div", { class: "scroll" },
      slots.length ? slots.map(slot) : el("div", { class: "empty" }, el("b", {}, "No matching posts found")),
      without.length
        ? el("div", { class: "others" },
            "Add a post from",
            without.map((id) => el("button", { class: "link", onclick: () => { pickerSet = id; render(); } }, `@${accountName(id)}`)),
          )
        : null,
    );
  }

  function slot(s) {
    const ref = s.ref;
    const d = details.get(ref.id);
    const acc = accounts.get(s.setId);
    const status = d?.status || ref.status;
    const when = d?.published_at || ref.publishedAt
      ? `Published ${formatDate(d?.published_at || ref.publishedAt)}`
      : ref.scheduledDate
        ? `${status === "scheduled" ? "Scheduled for" : "Planned for"} ${formatDate(ref.scheduledDate)}`
        : "Not scheduled";

    const nodes = [
      el("div", { class: "acc-head" },
        el("span", { class: "who" }, acc?.name || `@${ref.account}`),
        el("span", { class: `badge ${status}` }, STATUS[status] || status),
        el("button", { class: "link", onclick: () => { pickerSet = s.setId; render(); } }, "Change"),
        el("a", { class: "btn", title: "Open in Typefully", href: `https://typefully.com/?d=${ref.id}&a=${ref.setId}`, target: "_blank", rel: "noopener", html: ICONS.external }),
      ),
      el("div", { class: "acc-meta", title: ref.title }, `${ref.title} · ${when}${s.manual ? "" : " · suggested"}`),
    ];

    if (!d) return el("div", { class: "account" }, nodes, el("div", { class: "empty" }, "Loading post…"));
    if (d.error || d.needsKey) return el("div", { class: "account" }, nodes, el("div", { class: "empty" }, d.error || "Typefully API key is invalid"));

    const enabled = PLATFORMS.filter(([k]) => d.platforms?.[k]?.enabled);
    if (!enabled.length) return el("div", { class: "account" }, nodes, el("div", { class: "empty" }, "No X or LinkedIn post in this draft."));
    let platform = tabs.get(s.setId);
    if (!enabled.some(([k]) => k === platform)) platform = enabled[0][0];

    nodes.push(enabled.length > 1
      ? el("div", { class: "tabs" },
          enabled.map(([k, label]) => el("button", { class: `tab ${k === platform ? "on" : ""}`, onclick: () => { tabs.set(s.setId, k); render(); } }, label)),
        )
      : el("div", { style: "height: 10px" }));

    const profile = acc?.platforms?.[platform] || { name: acc?.name || ref.account, username: ref.account };
    const date = d.published_at || ref.scheduledDate || ref.updatedAt;
    nodes.push(platform === "x" ? xPreview(s, d, profile, date) : linkedinPreview(s, d, profile, date));

    const url = platform === "x" ? d.x_published_url : d.linkedin_published_url;
    if (url) nodes.push(el("div", { class: "published" }, el("a", { class: "link", href: url, target: "_blank", rel: "noopener" }, `View on ${platform === "x" ? "X" : "LinkedIn"} ↗`)));
    return el("div", { class: "account" }, nodes);
  }

  // --- Text mit Links, Erwähnungen und Hashtags ------------------------------

  function richText(text, kind) {
    const out = [];
    const re = /(https?:\/\/[^\s]+)|(@[A-Za-z0-9_]+)|(#[\p{L}\p{N}_]+)/gu;
    let last = 0;
    for (const m of text.matchAll(re)) {
      if (m.index > last) out.push(text.slice(last, m.index));
      if (m[1]) {
        // X kürzt Links in der Anzeige, LinkedIn zeigt sie ganz.
        let shown = m[1];
        if (kind === "x") {
          shown = shown.replace(/^https?:\/\/(www\.)?/, "");
          if (shown.length > 26) shown = shown.slice(0, 25) + "…";
        }
        out.push(el("a", { href: m[1], target: "_blank", rel: "noopener" }, shown));
      } else {
        out.push(el("span", { class: kind === "x" ? "tag" : "" }, m[0]));
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  function mediaNodes(setId, ids, cls) {
    return ids.slice(0, 4).map((id) => {
      const m = media(setId, id);
      if (m === undefined) return el("div", { class: "ph" }, "Loading…");
      if (!m) return el("div", { class: "ph" }, "Media");
      if (m.kind === "video") {
        return el("video", { src: m.src, title: m.alt, controls: "", muted: "", playsinline: "", preload: "metadata" });
      }
      return el("img", { src: m.src, alt: m.alt });
    });
  }

  function avatarNode(url, cls) {
    const src = avatar(url);
    return src ? el("img", { src, class: cls || "", alt: "" }) : el("div", { class: `ph ${cls || ""}` });
  }

  // --- X ---------------------------------------------------------------------

  function xPreview(s, d, profile, date) {
    const posts = d.platforms.x.posts || [];
    return el("div", { class: "x" },
      posts.map((p, i) =>
        el("div", { class: "x-post" },
          el("div", { class: "x-rail" }, avatarNode(profile.profile_image_url), i < posts.length - 1 ? el("div", { class: "line" }) : null),
          el("div", { class: "x-main" },
            el("div", { class: "x-name" },
              el("b", {}, profile.name),
              el("span", {}, `@${profile.username}`),
              el("span", {}, "·"),
              el("span", {}, shortDate(date)),
              el("span", { class: "more" }, "···"),
            ),
            el("div", { class: "x-text" }, richText(p.text, "x")),
            p.media_ids?.length
              ? el("div", { class: `x-media n${Math.min(p.media_ids.length, 4)}` }, mediaNodes(s.setId, p.media_ids))
              : null,
            el("div", { class: "x-actions" },
              ["reply", "repost", "like", "views", "bookmark", "share"].map((k) => el("span", { html: ICONS[k] })),
            ),
          ),
        ),
      ),
    );
  }

  // --- LinkedIn --------------------------------------------------------------

  function linkedinPreview(s, d, profile, date) {
    const li = d.platforms.linkedin;
    const post = li.posts?.[0] || { text: "" };
    const isCompany = /linkedin\.com\/company\//.test(profile.profile_url || "");
    const shape = isCompany ? "square" : "round";
    const key = `${s.ref.id}`;
    const long = post.text.length > 210 || post.text.split("\n").length > 3;
    const clamped = long && !expanded.has(key);
    const firstComment = li.settings?.first_comment;

    return el("div", { class: "li" },
      el("div", { class: "li-head" },
        avatarNode(profile.profile_image_url, shape),
        el("div", { class: "li-who" },
          el("b", {}, profile.name),
          el("span", { html: `${shortDate(date)} • ${ICONS.globe}` }),
        ),
        el("span", { class: "li-more-btn" }, "···"),
      ),
      el("div", { class: `li-text ${clamped ? "clamp" : ""}` }, richText(post.text, "li")),
      long
        ? el("button", { class: "li-see", onclick: () => { clamped ? expanded.add(key) : expanded.delete(key); render(); } }, clamped ? "…more" : "show less")
        : null,
      post.media_ids?.length
        ? el("div", { class: `li-media ${post.media_ids.length > 1 ? "n2" : ""}` }, mediaNodes(s.setId, post.media_ids))
        : null,
      el("div", { class: "li-actions" },
        [["liLike", "Like"], ["liComment", "Comment"], ["liRepost", "Repost"], ["liSend", "Send"]].map(([icon, label]) =>
          el("span", { html: ICONS[icon] }, label),
        ),
      ),
      firstComment
        ? el("div", { class: "li-comment" },
            avatarNode(profile.profile_image_url, shape),
            el("div", { class: "li-bubble" }, el("b", {}, profile.name), el("div", {}, richText(firstComment, "li"))),
          )
        : null,
    );
  }

  // --- Auswahl ---------------------------------------------------------------

  function picker(setId) {
    const q = query.toLowerCase();
    const inSet = drafts.drafts.filter((d) => d.setId === setId);
    const all = inSet.filter((d) => !q || `${d.title} ${d.preview}`.toLowerCase().includes(q));
    const suggested = q
      ? []
      : inSet
          .map((d) => ({ d, s: score(d, changelog) }))
          .filter((x) => x.s >= 3)
          .sort((a, b) => b.s - a.s)
          .slice(0, 5)
          .map((x) => x.d);
    const item = (d) =>
      el("button", { class: "item", onclick: () => pick(setId, d) },
        el("span", { class: "t" }, d.title || d.preview.split("\n")[0]),
        el("span", { class: "s" }, [STATUS[d.status] || d.status, d.scheduledDate && formatDate(d.scheduledDate)].filter(Boolean).join(" · ")),
      );

    const input = el("input", { placeholder: "Search posts…", value: query });
    input.addEventListener("input", () => {
      query = input.value;
      root.querySelector(".list").replaceWith(picker(setId).querySelector(".list"));
    });
    setTimeout(() => input.focus(), 0);

    const hasSlot = slots.some((s) => s.setId === setId);
    return el("div", { class: "picker" },
      el("div", { class: "bar" },
        el("span", {}, `Post from @${inSet[0]?.account} for this changelog`),
        hasSlot ? el("button", { class: "link", onclick: () => pick(setId, null) }, "None") : null,
        el("button", { class: "link", onclick: () => { pickerSet = null; query = ""; render(); } }, "Cancel"),
      ),
      input,
      el("div", { class: "list" },
        suggested.length ? [el("div", { class: "section" }, "Suggested"), suggested.map(item), el("div", { class: "section" }, "All posts")] : null,
        all.slice(0, 100).map(item),
      ),
    );
  }

  // Panel rechts neben dem Editor, wenn Platz ist. Sonst eine Lasche am rechten Rand.
  function layout() {
    const title = document.querySelector('textarea[placeholder="New changelog"]');
    const right = title ? title.getBoundingClientRect().right : innerWidth - 400;
    const free = innerWidth - right;
    const wide = free >= 340;
    const width = wide ? Math.min(460, free - 56) : Math.min(460, innerWidth - 32);
    if (!wide && !open) {
      Object.assign(host.style, { top: "120px", right: "0", left: "auto", width: "auto" });
    } else {
      Object.assign(host.style, { top: "64px", right: wide ? "auto" : "16px", left: wide ? `${right + 32}px` : "auto", width: `${width}px` });
    }
    return { wide };
  }

  function pageIsDark() {
    const m = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g);
    if (!m) return false;
    const [r, g, b] = m.map(Number);
    return 0.299 * r + 0.587 * g + 0.114 * b < 128;
  }

  // --- Seite beobachten ------------------------------------------------------

  function readChangelog() {
    const title = document.querySelector('textarea[placeholder="New changelog"]')?.value?.trim() || "";
    const body = document.querySelector('[contenteditable="true"]')?.innerText?.slice(0, 800) || "";
    return { title, body };
  }

  let lastLayout = "";

  function update() {
    const m = location.pathname.match(/^\/edit-changelog\/([0-9a-f-]{36})/);
    if (!m) {
      host?.remove();
      changelogId = null;
      return;
    }
    if (!host) {
      host = document.createElement("div");
      host.id = "ilr-typefully";
      root = host.attachShadow({ mode: "closed" });
    }
    if (!host.isConnected) document.body.append(host);
    host.dataset.theme = pageIsDark() ? "dark" : "light";

    const next = readChangelog();
    const idChanged = m[1] !== changelogId;
    const titleChanged = next.title !== changelog.title;
    changelogId = m[1];
    changelog = next;

    if (idChanged) {
      slots = [];
      pickerSet = null;
      if (!drafts) loadDrafts(false);
      else choose();
      return;
    }
    if (titleChanged && pickerSet == null) choose();

    // Bei Größenänderung des Fensters neu anordnen.
    const key = `${innerWidth}:${Math.round(document.querySelector('textarea[placeholder="New changelog"]')?.getBoundingClientRect().right || 0)}`;
    if (key !== lastLayout) {
      lastLayout = key;
      if (pickerSet == null) render();
    }
  }

  setInterval(update, 1000);
  update();
})();
