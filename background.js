// Store allowed URLs in memory
let allowedUrls = [];

// Function to track all allowed URLs
function trackAllowedUrls(details) {
  const url = details.url;

  // Avoid duplicates
  if (!allowedUrls.includes(url)) {
    allowedUrls.push(url);

    // Optionally, store them in storage for review in the options page
    chrome.storage.local.set({ allowedUrls });
  }
}

// Listen to webNavigation events for allowed URLs
chrome.webNavigation.onCommitted.addListener(trackAllowedUrls, {
  url: [{ schemes: ["http", "https"] }] // Track only HTTP/HTTPS URLs
});

// Monitor matched rules and log blocked URLs
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    console.log(`Blocked URL: ${info.request.url}`);
    console.log(`Matched Rule ID: ${info.rule.ruleId}`);
  });
} else {
  console.warn("onRuleMatchedDebug is not available. Debugging features may not be enabled in your Chrome browser.");
}

// Load initial patterns from storage
chrome.storage.sync.get("blockedPatterns", ({ blockedPatterns }) => {
  if (blockedPatterns) {
    updateBlockedUrls(blockedPatterns);
  }
});

// Update rules when storage changes
chrome.storage.onChanged.addListener((changes) => {
  console.log("Storage changes detected:", changes);
  if (changes.blockedPatterns) {
    updateBlockedUrls(changes.blockedPatterns.newValue);
    console.log("Rules Updated.");
  }
});

// Function to dynamically update blocked URLs
function updateBlockedUrls(patterns) {
  const rules = patterns.map((pattern, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      regexFilter: pattern,
      resourceTypes: ["main_frame", "sub_frame", "script", "image", "stylesheet", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
    }
  }));

  chrome.declarativeNetRequest.updateDynamicRules(
    { removeRuleIds: rules.map((rule) => rule.id), addRules: rules },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Error updating rules:", chrome.runtime.lastError.message);
      } else {
        console.log("Blocked rules updated successfully:", patterns);

        // Log active rules for debugging
        chrome.declarativeNetRequest.getDynamicRules((rules) => {
          console.log("Active Rules:", rules);
        });
      }
    }
  );
}

// Function to extract the domain from a URL
function extractDomain(url) {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      return null;
    }
  }
  
  // List of blocked patterns
  let blockedPatterns = [];
  
  // Load blocked patterns from storage
  chrome.storage.sync.get("blockedPatterns", (data) => {
    blockedPatterns = data.blockedPatterns || [];
  });
  
  // Update blocked patterns when storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.blockedPatterns) {
      blockedPatterns = changes.blockedPatterns.newValue || [];
      console.log("Blocked patterns updated:", blockedPatterns);
    }
  });
  
  // Check if a URL matches any blocked pattern
  function isBlocked(url) {
    return blockedPatterns.some((pattern) => new RegExp(pattern).test(url));
  }
  
  // Listen for new tabs
  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.pendingUrl && isBlocked(tab.pendingUrl)) {
      console.log(`Blocked new tab: ${tab.pendingUrl}`);
      chrome.tabs.remove(tab.id); // Close the tab immediately
    }
  });
  
  // Listen for tab updates (in case a redirect happens after creation)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && isBlocked(changeInfo.url)) {
      console.log(`Blocked updated tab: ${changeInfo.url}`);
      chrome.tabs.remove(tabId); // Close the tab immediately
    }
  });