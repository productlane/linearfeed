// Setzt die Linear-Liste an die Stelle des Feeds der jeweiligen Seite.
// Jede Seite liefert, wo die Liste hin soll und welche Elemente versteckt werden.
(() => {
  if (window.__ilrContent) return;
  window.__ilrContent = true;

  // Nach einem Update der Extension lädt der Browser das Skript erneut in offene Tabs,
  // während die alte Instanz weiterläuft. Die Seite merkt sich die neueste Instanz,
  // alle älteren räumen ihre Liste weg und hören auf.
  const instance = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  document.documentElement.dataset.ilrInstance = instance;
  const isCurrent = () => document.documentElement.dataset.ilrInstance === instance;
  const view = window.__ILR;

  const mainColumn = () => {
    const main = document.querySelector("main");
    if (!main) return null;
    return { parent: main, before: main.firstChild, hide: [...main.children] };
  };

  const SITES = [
    {
      // Startseite: nur der Feed unter den Stories. Reels-Tab: die ganze Seite.
      // DMs, Profile, Stories und geteilte Reels ("/reel/<id>/") bleiben.
      host: /(^|\.)instagram\.com$/,
      active: () => location.pathname === "/" || location.pathname.startsWith("/reels"),
      place: () => {
        if (location.pathname.startsWith("/reels")) return mainColumn();
        const main = document.querySelector("main");
        const article = main?.querySelector("article");
        if (!article) return null;
        const story = [...main.querySelectorAll('[aria-label*="story" i]')].find((n) => !n.closest("article"));
        // Vom ersten Beitrag nach oben bis knapp unter den Container, der auch die Stories enthält.
        let feed = article;
        while (feed.parentElement && feed.parentElement !== main) {
          const parent = feed.parentElement;
          if (story ? parent.contains(story) : parent.getBoundingClientRect().width > 700) break;
          feed = parent;
        }
        return { parent: feed.parentElement, before: feed, hide: [feed], style: "margin: 16px 0 24px;" };
      },
      silenceVideos: true,
    },
    {
      // Startseite: das Vorschlagsraster unter den Themen-Chips.
      // Videoseite: die Vorschläge in der rechten Spalte. Playlist und Live-Chat bleiben.
      host: /(^|\.)youtube\.com$/,
      active: () => location.pathname === "/" || location.pathname === "/watch",
      place: () => {
        if (location.pathname === "/watch") {
          const related = document.querySelector("ytd-watch-flexy #related");
          if (!related) return null;
          return { parent: related.parentElement, before: related, hide: [related], style: "margin: 0 0 16px;" };
        }
        const grid = document.querySelector('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer');
        const contents = grid?.querySelector(":scope > #contents") || grid?.querySelector("#contents");
        if (!contents) return null;
        return { parent: contents.parentElement, before: contents, hide: [contents], style: "margin: 16px 24px; align-self: stretch;" };
      },
    },
    {
      // Mittlere Spalte mit dem Feed, die Seitenleisten bleiben.
      host: /(^|\.)linkedin\.com$/,
      active: () => location.pathname.startsWith("/feed"),
      place: () => {
        const feed = document.querySelector('[data-testid="mainFeed"]');
        if (!feed) return null;
        return { parent: feed.parentElement, before: feed, hide: [feed] };
      },
    },
    {
      // Alle Tabs der Startseite ("Für dich", "Folge ich", Listen).
      host: /(^|\.)(x|twitter)\.com$/,
      active: () => location.pathname === "/home",
      place: () => {
        const col = document.querySelector('[data-testid="primaryColumn"]');
        const timeline = col?.querySelector('section[role="region"]');
        if (!timeline) return null;
        // Die Blase "hat gepostet" oben in der Timeline.
        const pill = col.querySelector('[data-testid="pillLabel"]')?.closest('[role="status"]');
        const hide = pill ? [timeline, pill] : [timeline];
        return { parent: timeline.parentElement, before: timeline, hide, style: "margin: 12px 16px;" };
      },
    },
  ];

  const site = SITES.find((s) => s.host.test(location.hostname));
  if (!site) return;

  function unhideAll() {
    document.querySelectorAll("[data-ilr-hidden]").forEach((n) => n.removeAttribute("data-ilr-hidden"));
  }

  function silenceVideos() {
    document.querySelectorAll("video").forEach((v) => {
      v.muted = true;
      if (!v.paused) v.pause();
    });
  }

  function update() {
    if (!isCurrent()) {
      clearInterval(timer);
      view.getHost().remove();
      return;
    }
    // "Disable for 5 minutes": Feed zeigen, Liste weg, bis die Pause abläuft.
    const spot = site.active() && !view.isPaused() ? site.place() : "off";
    const host = view.getHost();

    if (spot === "off") {
      host.remove();
      unhideAll();
      return;
    }
    // Seite noch nicht fertig aufgebaut: beim nächsten Durchlauf erneut versuchen.
    if (!spot) return;

    for (const n of spot.hide) {
      if (n !== host && !n.hasAttribute("data-ilr-hidden")) n.setAttribute("data-ilr-hidden", "");
    }
    // Elemente, die nicht mehr versteckt werden sollen, wieder zeigen.
    document.querySelectorAll("[data-ilr-hidden]").forEach((n) => {
      if (!spot.hide.includes(n)) n.removeAttribute("data-ilr-hidden");
    });
    if (host.parentNode !== spot.parent || (spot.before && host.nextSibling !== spot.before && spot.before !== host)) {
      spot.parent.insertBefore(host, spot.before === host ? host.nextSibling : spot.before);
    }
    if (spot.style && host.style.cssText !== spot.style) host.style.cssText = spot.style;

    if (site.silenceVideos) silenceVideos();
    view.tick();
  }

  // Alle vier Seiten sind Single-Page-Apps: Wechsel passieren ohne Neuladen.
  const timer = setInterval(update, 300);
  window.addEventListener("popstate", update);
  document.addEventListener("DOMContentLoaded", update);
})();
