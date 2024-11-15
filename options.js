document.addEventListener("DOMContentLoaded", () => {
    const textarea = document.getElementById("patterns");
    const saveButton = document.getElementById("save");
    const clearButton = document.getElementById("clear");
    const allowedUrlsList = document.getElementById("allowedUrls");
    const statusDiv = document.getElementById("status");
  
    // Helper: Extract domain from a URL
    function extractDomain(url) {
      try {
        const { hostname } = new URL(url); // Extract hostname from URL
        const parts = hostname.split(".");
        if (parts.length > 2) {
          return parts.slice(-2).join("."); // Return last two parts (e.g., acrpoker.eu)
        }
        return hostname; // Return hostname for simple domains
      } catch (e) {
        console.error("Invalid URL:", url);
        return null;
      }
    }
  
    // Helper: Render the list of allowed URLs with buttons
    function renderAllowedUrls(urls) {
        allowedUrlsList.innerHTML = ""; // Clear existing list
        urls.forEach((url, index) => {
          const listItem = document.createElement("li");
      
          // Create the "Block Domain" button
          const blockButton = document.createElement("button");
          blockButton.textContent = "Block Domain";
          blockButton.style.marginRight = "10px";
          blockButton.addEventListener("click", () => {
            const domain = extractDomain(url);
            if (domain) {
              const pattern = `.*${domain.replace(/\./g, "\\.")}.*`; // Escape dots for regex
              addPatternToBlockedList(pattern);
            }
          });
      
          // Add button before the URL text
          listItem.appendChild(blockButton);
          listItem.appendChild(document.createTextNode(url)); // Add the URL text
      
          allowedUrlsList.appendChild(listItem);
        });
      }
  
    // Add a regex pattern to the Blocked URL Patterns
    function addPatternToBlockedList(pattern) {
      chrome.storage.sync.get("blockedPatterns", (data) => {
        const blockedPatterns = data.blockedPatterns || [];
        if (!blockedPatterns.includes(pattern)) {
          blockedPatterns.push(pattern);
          chrome.storage.sync.set({ blockedPatterns }, () => {
            textarea.value = blockedPatterns.join("\n"); // Update the textarea
            console.log(`Added pattern to blocked list: ${pattern}`);
          });
        }
      });
    }
  
    // Load and display allowed URLs
    chrome.storage.local.get("allowedUrls", (data) => {
      if (data.allowedUrls) {
        renderAllowedUrls(data.allowedUrls);
      }
    });
  
    // Load existing patterns and display
    chrome.storage.sync.get("blockedPatterns", (data) => {
      if (data.blockedPatterns) {
        textarea.value = data.blockedPatterns.join("\n");
      }
    });
  
    // Save new patterns
    saveButton.addEventListener("click", () => {
      const patterns = textarea.value.split("\n").map((line) => line.trim()).filter(Boolean);
      chrome.storage.sync.set({ blockedPatterns: patterns }, () => {
        statusDiv.style.display = "block";
        setTimeout(() => {
          statusDiv.style.display = "none";
        }, 2000);
      });
    });
  
    // Clear allowed URLs list
    clearButton.addEventListener("click", () => {
      chrome.storage.local.set({ allowedUrls: [] }, () => {
        renderAllowedUrls([]);
        console.log("Allowed URLs list cleared.");
      });
    });
  });
  