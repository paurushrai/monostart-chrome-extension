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

const findSlotInSection = (sectionLinks, itemW = 3, itemH = 1) => {
  const cols = 3;
  const grid = [];

  sectionLinks.forEach(link => {
    const lx = link.x ?? 0;
    const ly = link.y ?? 0;
    const lw = link.w ?? 3;
    const lh = link.h ?? 1;
    for (let r = ly; r < ly + lh; r++) {
      while (grid.length <= r) grid.push(Array(cols).fill(false));
      for (let c = lx; c < lx + lw && c < cols; c++) {
        grid[r][c] = true;
      }
    }
  });

  let r = 0;
  while (true) {
    while (grid.length <= r + itemH) grid.push(Array(cols).fill(false));
    for (let c = 0; c <= cols - itemW; c++) {
      let canFit = true;
      for (let i = 0; i < itemH; i++) {
        for (let j = 0; j < itemW; j++) {
          if (grid[r + i][c + j]) {
            canFit = false;
            break;
          }
        }
        if (!canFit) break;
      }
      if (canFit) {
        return { x: c, y: r };
      }
    }
    r++;
  }
};

const getMinSize = (type) => {
  if (type === 'google-search') return { minW: 6, minH: 1 };
  if (type === 'section') return { minW: 3, minH: 4 };
  if (type === 'todo' || type === 'timer') return { minW: 3, minH: 3 };
  return { minW: 1, minH: 1 };
};

const findFreeSlot = (links, w, h, maxCols = 18, maxRows = 12) => {
  if (w > maxCols || h > maxRows) return null;
  const grid = Array(maxRows).fill(null).map(() => Array(maxCols).fill(false));
  links.forEach(link => {
    if (link.isHeaderLink) return;
    if (link.x === undefined || link.y === undefined) return;
    const lw = link.w || 1;
    const lh = link.h || 1;
    for (let r = link.y; r < link.y + lh && r < maxRows; r++) {
      for (let c = link.x; c < link.x + lw && c < maxCols; c++) {
        if (r >= 0 && c >= 0) grid[r][c] = true;
      }
    }
  });
  for (let r = 0; r <= maxRows - h; r++) {
    for (let c = 0; c <= maxCols - w; c++) {
      let canFit = true;
      for (let i = 0; i < h && canFit; i++) {
        for (let j = 0; j < w; j++) {
          if (grid[r + i][c + j]) { canFit = false; break; }
        }
      }
      if (canFit) return { x: c, y: r };
    }
  }
  return null;
};

export const saveLink = async (newLink, sectionId) => {
  const currentLinks = await getLinks();

  const id = newLink.id || `${newLink.type || 'link'}-${Date.now()}`;
  const w = newLink.w || (newLink.type === 'section' ? 6 : 2);
  const h = newLink.h || (newLink.type === 'section' ? 4 : 2);

  const linkWithId = {
    w,
    h,
    ...newLink,
    id,
    i: id,
  };

  if (sectionId) {
    // Save inside a specific section
    const updatedLinks = currentLinks.map(item => {
      if (item.id === sectionId && item.type === 'section') {
        const innerLinks = item.links || [];
        const slot = findSlotInSection(innerLinks, w, h);
        return {
          ...item,
          links: [
            ...innerLinks,
            {
              ...linkWithId,
              x: slot.x,
              y: slot.y
            }
          ]
        };
      }
      return item;
    });
    await saveLinks(updatedLinks);
    return linkWithId;
  }

  if (newLink.isHeaderLink) {
    const headerLinks = currentLinks.filter(l => l.isHeaderLink);
    const maxOrder = headerLinks.reduce((max, l) => Math.max(max, l.order || 0), -1);
    linkWithId.order = maxOrder + 1;
    linkWithId.x = undefined;
    linkWithId.y = undefined;
  } else if (newLink.x !== undefined && newLink.y !== undefined) {
    linkWithId.x = newLink.x;
    linkWithId.y = newLink.y;
  } else {
    let slot = findFreeSlot(currentLinks, w, h);
    if (!slot) {
      const { minW, minH } = getMinSize(newLink.type);
      if (minW < w || minH < h) {
        slot = findFreeSlot(currentLinks, minW, minH);
        if (slot) {
          linkWithId.w = minW;
          linkWithId.h = minH;
        }
      }
    }
    if (!slot) return null;
    linkWithId.x = slot.x;
    linkWithId.y = slot.y;
  }

  const updatedLinks = [...currentLinks, linkWithId];
  await saveLinks(updatedLinks);
  return linkWithId;
};

export const deleteLink = async (id) => {
  const currentLinks = await getLinks();
  const deleteNested = (items) => {
    return items
      .filter(item => item.id !== id)
      .map(item => {
        if (item.type === 'section' && item.links) {
          return { ...item, links: deleteNested(item.links) };
        }
        return item;
      });
  };
  const updatedLinks = deleteNested(currentLinks);
  await saveLinks(updatedLinks);
};

const SETTINGS_KEY = 'dashboardSettings';
const DEFAULT_SETTINGS = { openInNewTab: false };

export const getSettings = async () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through */ }

  // One-time migration from chrome.storage for existing installs
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['dashboardSettings'], (result) => {
        const settings = result.dashboardSettings || DEFAULT_SETTINGS;
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
        resolve(settings);
      });
    });
  }

  return DEFAULT_SETTINGS;
};

export const saveSettings = async (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) { /* ignore */ }
};
