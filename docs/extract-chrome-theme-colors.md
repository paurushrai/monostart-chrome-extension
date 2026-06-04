# Extract exact Chrome theme seed colors

Chrome generates its "Customize Chrome" colors per version, so the only way to
match your exact Chrome is to read what it renders. This is best-effort — the
element selectors change across Chrome versions.

## Steps

1. Open a new tab, click the **Customize Chrome** pencil (bottom-right) to open
   the side panel, and select the **Color** section.
2. Right-click any color swatch in the side panel and choose **Inspect**. This
   opens DevTools attached to the side panel WebUI.
3. Paste this into the DevTools **Console** and press Enter:

```js
// Best-effort: collect every non-transparent background color rendered in the
// customize panel. Dedupe and print as a list.
const seen = new Set();
for (const el of document.querySelectorAll('*')) {
  const bg = getComputedStyle(el).backgroundColor;
  if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') seen.add(bg);
}
console.log([...seen].join('\n'));
```

4. Copy the `rgb(...)` values that match the swatches, convert each to the app's
   `"H S% L%"` HSL format, and replace the corresponding `seed` in
   `src/lib/chromeThemes.ts`. (Any online RGB→HSL converter works; HSL must be
   written as `H S% L%`, space-separated, no commas.)

If the snippet returns nothing useful (selectors changed), keep the shipped
fallback palette — it is contrast-checked and visually close.
