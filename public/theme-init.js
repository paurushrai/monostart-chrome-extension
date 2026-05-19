(function () {
    try {
        const raw = localStorage.getItem('dashboardSettings');
        const settings = raw ? JSON.parse(raw) : {};
        const mode = settings.themeMode || 'device';
        const isDark = mode === 'dark' || (mode === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) document.documentElement.classList.add('dark');
    } catch (e) { }
})();