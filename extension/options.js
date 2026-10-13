const input = document.getElementById("key");
const status = document.getElementById("status");

chrome.storage.local.get("linearKey").then(({ linearKey }) => {
  if (linearKey) status.textContent = "Ein Schlüssel ist gespeichert.";
});

document.getElementById("save").addEventListener("click", async () => {
  const key = input.value.trim();
  if (!key) return;
  await chrome.storage.local.set({ linearKey: key });
  status.textContent = "Prüfe Verbindung…";
  const res = await chrome.runtime.sendMessage({ type: "issues" });
  if (res.viewer) {
    status.textContent = `Verbunden als ${res.viewer.name}. ${res.viewer.assignedIssues.nodes.length} offene Issues. Du kannst den Tab schließen.`;
    input.value = "";
  } else if (res.needsKey) {
    status.textContent = "Linear hat den Schlüssel abgelehnt.";
  } else {
    status.textContent = `Fehler: ${res.error}`;
  }
});

document.getElementById("remove").addEventListener("click", async () => {
  await chrome.storage.local.remove("linearKey");
  status.textContent = "Schlüssel entfernt.";
});
