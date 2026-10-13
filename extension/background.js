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

// Avatare kommen als data:-URL zurück, weil die Seiten fremde Bild-Hosts per CSP sperren.
async function fetchAvatar(url) {
  const res = await fetch(url);
  const type = res.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(bin)}`;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "issues") {
    fetchIssues().then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
    return true;
  }
  if (msg.type === "avatar") {
    fetchAvatar(msg.url).then(sendResponse).catch(() => sendResponse(null));
    return true;
  }
  if (msg.type === "open-options") {
    chrome.runtime.openOptionsPage();
  }
});
