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
        let hue = 0;
        let sat = '0%';
        let lum = 30; // mirrors the Default seed (0 0% 30%)
        if (typeof themeColor === 'string') {
            const parts = themeColor.split(' ');
            if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
                hue = parseInt(parts[0], 10);
                const baseSat = parseInt(parts[1], 10);
                sat = baseSat === 0 ? '0%' : (isDark ? '30%' : '40%');
                lum = parseInt(parts[2], 10);
            }
        }
        // Achromatic seeds shift surface lightness with the seed, bounded to
        // ±4% — mirrors --surface-shift in index.css.
        const shift = sat === '0%' ? Math.max(-4, Math.min(4, (lum - 50) / 6)) : 0;
        const light = (isDark ? 10 : 94) + shift + '%';
        document.documentElement.style.backgroundColor = 'hsl(' + hue + ', ' + sat + ', ' + light + ')';

        // Apply the theme CSS variables synchronously so React's first
        // render already paints with the user's theme. Without this the
        // App outer div uses default --theme-hue/sat until useTheme runs,
        // then bg-background changes — the App's `transition-colors`
        // animates that change as a brief color flash on every load.
        document.documentElement.style.setProperty('--theme-hue', String(hue));
        document.documentElement.style.setProperty('--theme-sat', sat);
        document.documentElement.style.setProperty('--theme-lum', lum + '%');
        document.documentElement.style.setProperty('--theme-sat-factor', sat === '0%' ? '0' : '1');
        if (typeof themeColor === 'string') {
            document.documentElement.style.setProperty('--primary', themeColor);
            document.documentElement.style.setProperty('--ring', themeColor);
        }

        // Paint the custom dashboard background synchronously, mirroring
        // DashboardBackground.tsx exactly (same blur + dim) via fixed
        // pseudo-elements, so React mounting its own layer is seamless and
        // there's no flash of the theme color or an un-dimmed/un-blurred image.
        const bg = settings.background;
        if (bg && bg.type !== 'none' && bg.value) {
            let fill = '';
            if (bg.type === 'color') fill = 'background:' + bg.value + ';';
            else if (bg.type === 'gradient') fill = 'background-image:' + bg.value + ';';
            else if (bg.type === 'image') fill = 'background:#0b0b12 url("' + bg.value + '") center/cover no-repeat;';

            const blur = typeof bg.blur === 'number' && bg.blur > 0
                ? 'filter:blur(' + bg.blur + 'px);transform:scale(1.08);'
                : '';
            const dim = typeof bg.dim === 'number' && bg.dim > 0 ? bg.dim : 0;

            let css = 'body{background:transparent !important;}';
            css += 'html::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;' + fill + blur + '}';
            if (dim > 0) {
                css += 'html::after{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:rgba(0,0,0,' + dim + ');}';
            }
            const style = document.createElement('style');
            style.id = 'monostart-bg-init';
            style.textContent = css;
            document.head.appendChild(style);
        }
    } catch { /* fail silently — fall back to default theme */ }
})();