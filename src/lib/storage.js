export const getLinks = async () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['dashboardLinks'], (result) => {
        resolve(result.dashboardLinks || []);
      });
    });
  } else {
    // Fallback for local testing
    const localData = localStorage.getItem('dashboardLinks');
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveLinks = async (links) => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ dashboardLinks: links }, () => {
        resolve();
      });
    });
  } else {
    localStorage.setItem('dashboardLinks', JSON.stringify(links));
  }
};

export const saveLink = async (newLink) => {
  const currentLinks = await getLinks();
  
  // Default placement layout (let grid layout handle it later or append at end)
  const id = `link-${Date.now()}`;
  const linkWithId = {
    w: 2,
    h: 2,
    ...newLink,
    id,
    i: id,
  };
  
  if (newLink.x !== undefined) linkWithId.x = newLink.x;
  if (newLink.y !== undefined) linkWithId.y = newLink.y;
  
  const updatedLinks = [...currentLinks, linkWithId];
  await saveLinks(updatedLinks);
  return linkWithId;
};

export const deleteLink = async (id) => {
  const currentLinks = await getLinks();
  const updatedLinks = currentLinks.filter(link => link.id !== id);
  await saveLinks(updatedLinks);
};

export const getSettings = async () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['dashboardSettings'], (result) => {
        resolve(result.dashboardSettings || { openInNewTab: false });
      });
    });
  } else {
    const localData = localStorage.getItem('dashboardSettings');
    return localData ? JSON.parse(localData) : { openInNewTab: false };
  }
};

export const saveSettings = async (settings) => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ dashboardSettings: settings }, () => {
        resolve();
      });
    });
  } else {
    localStorage.setItem('dashboardSettings', JSON.stringify(settings));
  }
};
