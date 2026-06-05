import { useCallback, useEffect, useRef, useState } from 'react';
import {
  captureMetrics,
  getFooterGuideState,
  isFooterHidden,
  isSameDisplay,
  saveFooterGuideState,
  shouldAdvanceToPanel,
  shouldShowGuide,
} from '../lib/footerGuide';
import type { ViewportMetrics } from '../lib/footerGuide';

export type FooterGuideStep = 'corner' | 'panel' | 'success';

export interface UseFooterGuide {
  /** null = guide hidden. */
  step: FooterGuideStep | null;
  advance: () => void;
  complete: () => void;
  skip: () => void;
}

const SUCCESS_DISMISS_MS = 2500;
/** Quiet period after the last resize event before heuristics are evaluated. */
const RESIZE_SETTLE_MS = 400;

const isExtensionContext = (): boolean =>
  typeof chrome !== 'undefined' && !!chrome.storage;

/** `?footerGuide=1` forces the guide outside the extension (dev/testing). */
const isForced = (): boolean =>
  new URLSearchParams(window.location.search).has('footerGuide');

/**
 * Drives the first-run guide for hiding Chrome's NTP footer.
 *
 * Resize heuristics compare against a baseline (not the previous event) so
 * the side panel's slide-open animation, which fires many small resizes,
 * still crosses the threshold cumulatively. Any change to the window's outer
 * dimensions resets the baseline — that was the user resizing the window.
 */
export function useFooterGuide(): UseFooterGuide {
  const [step, setStep] = useState<FooterGuideStep | null>(null);
  const baselineRef = useRef<ViewportMetrics | null>(null);

  const persistCompleted = useCallback((metrics: ViewportMetrics) => {
    void saveFooterGuideState({
      status: 'completed',
      confirmedDelta: metrics.outerHeight - metrics.innerHeight,
      dpr: metrics.devicePixelRatio,
    });
  }, []);

  useEffect(() => {
    if (!isExtensionContext() && !isForced()) return;

    let cancelled = false;
    void getFooterGuideState().then((state) => {
      if (cancelled) return;
      if (shouldShowGuide(state, captureMetrics())) {
        baselineRef.current = captureMetrics();
        setStep('corner');
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (step !== 'corner' && step !== 'panel') return;

    // A display move fires a BURST of resize events, and an early event in
    // the burst can already report the new screen — re-baselining on it would
    // use mid-transition metrics, making the burst's later events look like a
    // footer-hide on the "same" display. So never evaluate mid-burst: wait
    // for resizes to settle, then compare the settled state against the
    // pre-burst baseline, where the display guard sees the move correctly.
    let settleTimer: number | undefined;

    const evaluateSettled = (): void => {
      const base = baselineRef.current;
      if (!base) return;
      const next = captureMetrics();

      // Window settled on another display — every signal is noise; re-baseline.
      if (!isSameDisplay(base, next)) {
        baselineRef.current = next;
        return;
      }
      // Footer-hidden only counts once the panel is open: from the corner
      // step, an innerHeight bump is more likely a window/display event than
      // the user racing ahead of the guide.
      // `step` is stable inside this closure: the effect re-subscribes per step.
      if (step === 'panel' && isFooterHidden(base, next)) {
        persistCompleted(next);
        setStep('success');
        return;
      }
      if (step === 'corner' && shouldAdvanceToPanel(base, next)) {
        baselineRef.current = next;
        setStep('panel');
        return;
      }
      // Outer dimensions changed → the user resized the window; re-baseline.
      if (next.outerWidth !== base.outerWidth || next.outerHeight !== base.outerHeight) {
        baselineRef.current = next;
      }
    };

    const onResize = (): void => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(evaluateSettled, RESIZE_SETTLE_MS);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [step, persistCompleted]);

  useEffect(() => {
    if (step !== 'success') return;
    const timer = window.setTimeout(() => setStep(null), SUCCESS_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [step]);

  const advance = useCallback(() => {
    baselineRef.current = captureMetrics();
    setStep('panel');
  }, []);

  const complete = useCallback(() => {
    persistCompleted(captureMetrics());
    setStep(null);
  }, [persistCompleted]);

  const skip = useCallback(() => {
    void saveFooterGuideState({ status: 'skipped' });
    setStep(null);
  }, []);

  return { step, advance, complete, skip };
}
