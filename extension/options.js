// Ein Schlüsselfeld pro Dienst: speichern, sofort prüfen, entfernen.
function keyField({ name, storageKey, check }) {
  const input = document.getElementById(`${name}-key`);
  const status = document.getElementById(`${name}-status`);

  chrome.storage.local.get(storageKey).then((r) => {
    if (r[storageKey]) status.textContent = "Ein Schlüssel ist gespeichert.";
  });

  document.getElementById(`${name}-save`).addEventListener("click", async () => {
    const key = input.value.trim();
    if (!key) return;
    await chrome.storage.local.set({ [storageKey]: key });
    status.textContent = "Prüfe Verbindung…";
    const res = await check();
    status.textContent = res;
    if (!res.startsWith("Fehler") && !res.includes("abgelehnt")) input.value = "";
  });

  document.getElementById(`${name}-remove`).addEventListener("click", async () => {
    await chrome.storage.local.remove(storageKey);
    status.textContent = "Schlüssel entfernt.";
  });
}

keyField({
  name: "linear",
  storageKey: "linearKey",
  check: async () => {
    const res = await chrome.runtime.sendMessage({ type: "issues" });
    if (res.viewer) return `Verbunden als ${res.viewer.name}. ${res.viewer.assignedIssues.nodes.length} offene Issues.`;
    if (res.needsKey) return "Linear hat den Schlüssel abgelehnt.";
    return `Fehler: ${res.error}`;
  },
});

keyField({
  name: "typefully",
  storageKey: "typefullyKey",
  check: async () => {
    const res = await chrome.runtime.sendMessage({ type: "tf-drafts", force: true });
    if (res.drafts) return `Verbunden. ${res.drafts.length} Entwürfe gefunden.`;
    if (res.needsKey) return "Typefully hat den Schlüssel abgelehnt.";
    return `Fehler: ${res.error}`;
  },
});
