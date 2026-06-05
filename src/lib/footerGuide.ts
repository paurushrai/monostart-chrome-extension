import { getStoredValue, setStoredValue } from './storage';

/**
 * Heuristics for the first-run guide that helps users disable Chrome's NTP
 * attribution footer ("Customized by MonoStart"). The footer and the
 * Customize Chrome side panel are browser UI — invisible to the page — so the
 * only signals available are viewport resizes where the window's outer
 * dimensions stay constant:
 *  - side panel opens  → innerWidth shrinks, outerWidth unchanged
 *  - footer disabled   → innerHeight grows, outerHeight unchanged
 */

export interface ViewportMetrics {
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;
}

export interface FooterGuideState {
  status: 'completed' | 'skipped';
  /** outerHeight − innerHeight captured when the footer was confirmed hidden. */
  confirmedDelta?: number;
  /** devicePixelRatio at capture time — deltas are only comparable at the same DPR. */
  dpr?: number;
}

const FOOTER_GUIDE_KEY = 'footerGuideState';

/** Customize Chrome side panel is ~320–440px wide; require a meaningful shrink. */
export const SIDE_PANEL_MIN_SHRINK_PX = 200;
/** The NTP footer is ~48px tall; 30px catches it with margin for zoom rounding. */
export const FOOTER_MIN_GROWTH_PX = 30;
/** Extra delta over the confirmed baseline before we believe the footer returned. */
export const RESHOW_DELTA_THRESHOLD_PX = 40;

export const captureMetrics = (): ViewportMetrics => ({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  outerWidth: window.outerWidth,
  outerHeight: window.outerHeight,
  devicePixelRatio: window.devicePixelRatio,
  screenWidth: window.screen.width,
  screenHeight: window.screen.height,
});

/**
 * Dragging the window to another display changes innerHeight/innerWidth in
 * ways that mimic the panel/footer signals — any screen or DPR change must
 * invalidate a comparison, not complete the guide.
 */
export const isSameDisplay = (base: ViewportMetrics, next: ViewportMetrics): boolean =>
  next.devicePixelRatio === base.devicePixelRatio &&
  next.screenWidth === base.screenWidth &&
  next.screenHeight === base.screenHeight;

const outerUnchanged = (base: ViewportMetrics, next: ViewportMetrics): boolean =>
  isSameDisplay(base, next) &&
  next.outerWidth === base.outerWidth &&
  next.outerHeight === base.outerHeight;

/** Side panel opened: viewport narrowed without the window itself resizing. */
export const shouldAdvanceToPanel = (
  base: ViewportMetrics,
  next: ViewportMetrics,
): boolean =>
  outerUnchanged(base, next) &&
  base.innerWidth - next.innerWidth >= SIDE_PANEL_MIN_SHRINK_PX;

/** Footer disabled: viewport got taller without the window itself resizing. */
export const isFooterHidden = (
  base: ViewportMetrics,
  next: ViewportMetrics,
): boolean =>
  outerUnchanged(base, next) &&
  next.innerHeight - base.innerHeight >= FOOTER_MIN_GROWTH_PX;

/**
 * First launch (no state) → show. Skipped → never again. Completed → re-show
 * only if the browser-chrome height delta grew well past the value recorded
 * at completion, at the same DPR — i.e. the footer probably came back.
 */
export const shouldShowGuide = (
  state: FooterGuideState | null,
  current: ViewportMetrics,
): boolean => {
  if (!state) return true;
  if (state.status === 'skipped') return false;
  if (state.confirmedDelta === undefined || state.dpr === undefined) return false;
  if (current.devicePixelRatio !== state.dpr) return false;
  const delta = current.outerHeight - current.innerHeight;
  return delta >= state.confirmedDelta + RESHOW_DELTA_THRESHOLD_PX;
};

export const getFooterGuideState = async (): Promise<FooterGuideState | null> =>
  getStoredValue<FooterGuideState | null>(FOOTER_GUIDE_KEY, null);

export const saveFooterGuideState = async (state: FooterGuideState): Promise<void> =>
  setStoredValue(FOOTER_GUIDE_KEY, state);
