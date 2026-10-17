const QUERY = `
  query MyIssues {
    viewer {
      name
      avatarUrl
      assignedIssues(
        first: 150
        orderBy: updatedAt
        filter: { state: { type: { in: ["started", "unstarted", "backlog", "triage"] } } }
      ) {
        nodes {
          id
          identifier
          title
          url
          priority
          createdAt
          updatedAt
          state { name type color position }
          project { name color }
          labels { nodes { name color } }
        }
      }
    }
  }
`;

async function fetchIssues() {
  const { linearKey } = await chrome.storage.local.get("linearKey");
  if (!linearKey) return { needsKey: true };
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: linearKey, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY }),
  });
  const body = await res.json().catch(() => ({}));
  const authError = res.status === 401 || body.errors?.some((e) => e.extensions?.type === "authentication error");
  if (authError) return { needsKey: true, invalid: true };
  if (body.errors) return { error: body.errors.map((e) => e.message).join(", ") };
  if (!body.data) return { error: `HTTP ${res.status}` };
  return { viewer: body.data.viewer };
}

// Am Wochenende: wie viele zugewiesene Issues seit Montag erledigt wurden.
async function fetchWeekDone(since) {
  const { linearKey } = await chrome.storage.local.get("linearKey");
  if (!linearKey) return null;
  const query = `query { viewer { assignedIssues(first: 250, filter: { completedAt: { gte: ${JSON.stringify(since)} } }) { nodes { id } } } }`;
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: linearKey, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  return body.data?.viewer?.assignedIssues?.nodes?.length ?? null;
}

// Avatare kommen als data:-URL zurück, weil die Seiten fremde Bild-Hosts per CSP sperren.
async function fetchAvatar(url) {
  const res = await fetch(url);
  const type = res.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(bin)}`;
}

// Typefully: Entwürfe aller Accounts, für das Panel im Productlane-Changelog.
const TYPEFULLY = "https://api.typefully.com/v2";
let draftCache = { at: 0, data: null };

async function typefully(path) {
  const { typefullyKey } = await chrome.storage.local.get("typefullyKey");
  if (!typefullyKey) throw Object.assign(new Error("no key"), { needsKey: true });
  const res = await fetch(TYPEFULLY + path, { headers: { Authorization: `Bearer ${typefullyKey}` } });
  if (res.status === 401 || res.status === 403) throw Object.assign(new Error("invalid key"), { needsKey: true, invalid: true });
  if (!res.ok) throw new Error(`Typefully HTTP ${res.status}`);
  return res.json();
}

async function typefullyDrafts(force) {
  if (!force && draftCache.data && Date.now() - draftCache.at < 120000) return draftCache.data;
  const sets = (await typefully("/social-sets?limit=50")).results;
  const drafts = [];
  for (const set of sets) {
    for (let offset = 0; offset < 200; offset += 50) {
      const page = await typefully(`/social-sets/${set.id}/drafts?limit=50&offset=${offset}&order_by=-updated_at`);
      for (const d of page.results) {
        drafts.push({
          id: d.id,
          setId: set.id,
          account: set.username,
          title: d.draft_title || "",
          preview: d.preview || "",
          status: d.status,
          scheduledDate: d.scheduled_date,
          publishedAt: d.published_at,
          updatedAt: d.updated_at,
        });
      }
      if (!page.next) break;
    }
  }
  draftCache = { at: Date.now(), data: { drafts } };
  return draftCache.data;
}

// Profile pro Account und Bilder als data:-URL, weil productlane.com fremde Bild-Hosts sperrt.
const accountCache = new Map();
const imageCache = new Map();

async function typefullyAccount(setId) {
  if (!accountCache.has(setId)) accountCache.set(setId, typefully(`/social-sets/${setId}`));
  return accountCache.get(setId).catch((e) => {
    accountCache.delete(setId);
    throw e;
  });
}

async function imageData(url) {
  if (!imageCache.has(url)) imageCache.set(url, fetchAvatar(url));
  return imageCache.get(url).catch((e) => {
    imageCache.delete(url);
    throw e;
  });
}

async function typefullyMedia(setId, mediaId) {
  const media = await typefully(`/social-sets/${setId}/media/${mediaId}`);
  const urls = media.media_urls || {};
  // productlane.com lädt Bilder und Videos direkt vom Typefully-CDN, deshalb reichen die URLs.
  return {
    kind: (media.mime || "").startsWith("video/") ? "video" : "image",
    alt: media.alt_text || "",
    src: urls.medium || urls.original || null,
  };
}

function typefullyCall(promise, sendResponse) {
  promise
    .then(sendResponse)
    .catch((e) => sendResponse(e.needsKey ? { needsKey: true, invalid: !!e.invalid } : { error: String(e.message || e) }));
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.typefullyKey) draftCache = { at: 0, data: null };
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "issues") {
    fetchIssues().then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
    return true;
  }
  if (msg.type === "week-done") {
    fetchWeekDone(msg.since).then(sendResponse).catch(() => sendResponse(null));
    return true;
  }
  if (msg.type === "peace-image") {
    // Als data:-URL, weil manche Seiten Bilder von chrome-extension:// sperren.
    fetchAvatar(chrome.runtime.getURL("peace.jpg")).then(sendResponse).catch(() => sendResponse(null));
    return true;
  }
  if (msg.type === "avatar") {
    fetchAvatar(msg.url).then(sendResponse).catch(() => sendResponse(null));
    return true;
  }
  if (msg.type === "tf-drafts") {
    typefullyCall(typefullyDrafts(msg.force), sendResponse);
    return true;
  }
  if (msg.type === "tf-draft") {
    typefullyCall(typefully(`/social-sets/${msg.setId}/drafts/${msg.id}?exclude_comment_markers=true`), sendResponse);
    return true;
  }
  if (msg.type === "tf-account") {
    typefullyCall(typefullyAccount(msg.setId), sendResponse);
    return true;
  }
  if (msg.type === "tf-media") {
    typefullyCall(typefullyMedia(msg.setId, msg.mediaId), sendResponse);
    return true;
  }
  if (msg.type === "image") {
    imageData(msg.url).then(sendResponse).catch(() => sendResponse(null));
    return true;
  }
  if (msg.type === "open-options") {
    chrome.runtime.openOptionsPage();
  }
});
