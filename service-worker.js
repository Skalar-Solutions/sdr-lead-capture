/**
 * Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for quick capture
  chrome.contextMenus.create({
    id: "sdr-quick-capture",
    title: "🎯 Capture ke SDR Lead Staging",
    contexts: ["page", "selection"]
  });
  updateBadge();
});

// Context menu click listener
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sdr-quick-capture") {
    // Open extension popup or options
    chrome.action.openPopup?.();
  }
});

// Update badge count
async function updateBadge() {
  const d = new Date();
  const key = `sdr_stats_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  const data = await chrome.storage.local.get([key]);
  const stats = data[key] || { submitted: 0 };

  const count = stats.submitted || 0;
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// Listen for storage changes to keep badge synced
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    updateBadge();
  }
});
