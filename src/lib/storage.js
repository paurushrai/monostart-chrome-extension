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
  
  const id = `link-${Date.now()}`;
  const w = newLink.w || 2;
  const h = newLink.h || 2;
  
  const linkWithId = {
    w,
    h,
    ...newLink,
    id,
    i: id,
  };
  
  if (newLink.x !== undefined && newLink.y !== undefined) {
    linkWithId.x = newLink.x;
    linkWithId.y = newLink.y;
  } else {
    // Find first available slot
    const maxCols = 18;
    const maxRows = 12;
    const grid = Array(maxRows).fill(null).map(() => Array(maxCols).fill(false));
    
    currentLinks.forEach(link => {
      if (link.x !== undefined && link.y !== undefined) {
        for (let r = link.y; r < link.y + (link.h || 1) && r < maxRows; r++) {
          for (let c = link.x; c < link.x + (link.w || 1) && c < maxCols; c++) {
            grid[r][c] = true;
          }
        }
      }
    });

    let placed = false;
    for (let r = 0; r <= maxRows - h && !placed; r++) {
      for (let c = 0; c <= maxCols - w && !placed; c++) {
        let canFit = true;
        for (let i = 0; i < h; i++) {
          for (let j = 0; j < w; j++) {
            if (grid[r + i][c + j]) {
              canFit = false;
              break;
            }
          }
          if (!canFit) break;
        }
        if (canFit) {
          linkWithId.x = c;
          linkWithId.y = r;
          placed = true;
        }
      }
    }
    
    // If no space is found within the 12 rows, just put it at bottom and let user figure it out, 
    // or clamp it to the last row.
    if (!placed) {
      linkWithId.x = 0;
      linkWithId.y = 11; 
    }
  }
  
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
