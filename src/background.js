chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchSuggestions') {
    fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(request.query)}`)
      .then(res => res.json())
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep the messaging channel open for the async response
  }
});
