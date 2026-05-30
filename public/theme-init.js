(function () {
    try {
        const raw = localStorage.getItem('dashboardSettings');
        const settings = raw ? JSON.parse(raw) : {};
        const mode = settings.themeMode || 'device';
        const isDark = mode === 'dark' || (mode === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) document.documentElement.classList.add('dark');

        // Match the html element's bg to the theme so it doesn't show through
        // body around scrollbars or rendering edges. Mirrors the values
        // useTheme.ts uses when it later applies the custom theme to the body.
        const themeColor = settings.themeColor; // "<hue> <sat>% <light>%" or undefined
        let hue = isDark ? 240 : 220;
        let sat = isDark ? '5%' : '14%';
        if (typeof themeColor === 'string') {
            const parts = themeColor.split(' ');
            if (parts.length >= 2 && parts[0] && parts[1]) {
                hue = parseInt(parts[0], 10);
                const baseSat = parseInt(parts[1], 10);
                sat = baseSat === 0 ? '0%' : (isDark ? '30%' : '40%');
            }
        }
        const light = isDark ? '10%' : '94%';
        document.documentElement.style.backgroundColor = 'hsl(' + hue + ', ' + sat + ', ' + light + ')';

        // Apply the theme CSS variables synchronously so React's first
        // render already paints with the user's theme. Without this the
        // App outer div uses default --theme-hue/sat until useTheme runs,
        // then bg-background changes — the App's `transition-colors`
        // animates that change as a brief color flash on every load.
        document.documentElement.style.setProperty('--theme-hue', String(hue));
        document.documentElement.style.setProperty('--theme-sat', sat);
        if (typeof themeColor === 'string') {
            document.documentElement.style.setProperty('--primary', themeColor);
            document.documentElement.style.setProperty('--ring', themeColor);
        }

        // Paint the custom dashboard background synchronously so React mounting
        // its background layer doesn't flash the theme color on every load.
        // body is opaque (bg-background) and isn't parsed yet, so inject a
        // stylesheet: make body transparent and paint the bg on <html>.
        const bg = settings.background;
        if (bg && bg.type !== 'none' && bg.value) {
            let htmlBg = '';
            if (bg.type === 'color') {
                htmlBg = 'background:' + bg.value + ' !important;';
            } else if (bg.type === 'gradient') {
                htmlBg = 'background-image:' + bg.value + ' !important;';
            } else if (bg.type === 'image') {
                htmlBg = 'background:#0b0b12 url("' + bg.value + '") center/cover no-repeat !important;';
            }
            const style = document.createElement('style');
            style.textContent = 'html{' + htmlBg + '}body{background:transparent !important;}';
            document.head.appendChild(style);
        }
    } catch { /* fail silently — fall back to default theme */ }
})();