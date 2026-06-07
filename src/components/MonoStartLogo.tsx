interface Props {
  size?: number;
}

/**
 * Inline SVG version of the extension icon (public/icons/icon-*.png):
 * white stroke hexagon on a black rounded tile. The faint tile stroke keeps
 * the logo visible on near-black dark-theme headers.
 */
export default function MonoStartLogo({ size = 36 }: Readonly<Props>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7"
        fill="#000"
        stroke="rgba(255, 255, 255, 0.12)"
      />
      <path
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
        fill="none"
        stroke="#fff"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(5.2 5.2) scale(0.9)"
      />
    </svg>
  );
}
