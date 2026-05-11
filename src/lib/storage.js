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
  const linkWithId = {
    ...newLink,
    id: `link-${Date.now()}`,
    i: `link-${Date.now()}`,
    x: (currentLinks.length * 2) % 12,
    y: Infinity, // puts it at the bottom
    w: 2,
    h: 2,
  };
  
  const updatedLinks = [...currentLinks, linkWithId];
  await saveLinks(updatedLinks);
  return linkWithId;
};

export const deleteLink = async (id) => {
  const currentLinks = await getLinks();
  const updatedLinks = currentLinks.filter(link => link.id !== id);
  await saveLinks(updatedLinks);
};
