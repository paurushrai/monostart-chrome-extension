import { describe, it, expect } from 'vitest';
import {
  shouldAdvanceToPanel,
  isFooterHidden,
  shouldShowGuide,
  SIDE_PANEL_MIN_SHRINK_PX,
  FOOTER_MIN_GROWTH_PX,
  RESHOW_DELTA_THRESHOLD_PX,
  type ViewportMetrics,
  type FooterGuideState,
} from '../footerGuide';

const metrics = (overrides: Partial<ViewportMetrics> = {}): ViewportMetrics => ({
  innerWidth: 1920,
  innerHeight: 980,
  outerWidth: 1920,
  outerHeight: 1080,
  devicePixelRatio: 2,
  screenWidth: 2560,
  screenHeight: 1440,
  ...overrides,
});

describe('shouldAdvanceToPanel', () => {
  it('should_advance_when_inner_width_shrinks_by_panel_width_and_outer_unchanged', () => {
    const base = metrics();
    const next = metrics({ innerWidth: base.innerWidth - SIDE_PANEL_MIN_SHRINK_PX });
    expect(shouldAdvanceToPanel(base, next)).toBe(true);
  });

  it('should_not_advance_when_shrink_is_below_threshold', () => {
    const base = metrics();
    const next = metrics({ innerWidth: base.innerWidth - (SIDE_PANEL_MIN_SHRINK_PX - 1) });
    expect(shouldAdvanceToPanel(base, next)).toBe(false);
  });

  it('should_not_advance_when_outer_width_also_changed', () => {
    const base = metrics();
    const next = metrics({
      innerWidth: base.innerWidth - SIDE_PANEL_MIN_SHRINK_PX,
      outerWidth: base.outerWidth - SIDE_PANEL_MIN_SHRINK_PX,
    });
    expect(shouldAdvanceToPanel(base, next)).toBe(false);
  });

  it('should_not_advance_when_inner_width_grows', () => {
    const base = metrics();
    const next = metrics({ innerWidth: base.innerWidth + SIDE_PANEL_MIN_SHRINK_PX });
    expect(shouldAdvanceToPanel(base, next)).toBe(false);
  });

  it('should_not_advance_when_window_moved_to_another_display', () => {
    const base = metrics();
    const next = metrics({
      innerWidth: base.innerWidth - SIDE_PANEL_MIN_SHRINK_PX,
      screenWidth: 1512,
      screenHeight: 982,
    });
    expect(shouldAdvanceToPanel(base, next)).toBe(false);
  });
});

describe('isFooterHidden', () => {
  it('should_detect_when_inner_height_grows_by_footer_height_and_outer_unchanged', () => {
    const base = metrics();
    const next = metrics({ innerHeight: base.innerHeight + FOOTER_MIN_GROWTH_PX });
    expect(isFooterHidden(base, next)).toBe(true);
  });

  it('should_not_detect_when_growth_is_below_threshold', () => {
    const base = metrics();
    const next = metrics({ innerHeight: base.innerHeight + (FOOTER_MIN_GROWTH_PX - 1) });
    expect(isFooterHidden(base, next)).toBe(false);
  });

  it('should_not_detect_when_outer_height_also_changed', () => {
    const base = metrics();
    const next = metrics({
      innerHeight: base.innerHeight + FOOTER_MIN_GROWTH_PX,
      outerHeight: base.outerHeight + FOOTER_MIN_GROWTH_PX,
    });
    expect(isFooterHidden(base, next)).toBe(false);
  });

  it('should_not_detect_when_inner_height_shrinks', () => {
    const base = metrics();
    const next = metrics({ innerHeight: base.innerHeight - FOOTER_MIN_GROWTH_PX });
    expect(isFooterHidden(base, next)).toBe(false);
  });

  it('should_not_detect_when_window_moved_to_another_display', () => {
    const base = metrics();
    const next = metrics({
      innerHeight: base.innerHeight + FOOTER_MIN_GROWTH_PX,
      screenWidth: 1512,
      screenHeight: 982,
    });
    expect(isFooterHidden(base, next)).toBe(false);
  });

  it('should_not_detect_when_device_pixel_ratio_changed', () => {
    const base = metrics();
    const next = metrics({
      innerHeight: base.innerHeight + FOOTER_MIN_GROWTH_PX,
      devicePixelRatio: base.devicePixelRatio + 1,
    });
    expect(isFooterHidden(base, next)).toBe(false);
  });
});

describe('shouldShowGuide', () => {
  it('should_show_when_no_state_is_stored', () => {
    expect(shouldShowGuide(null, metrics())).toBe(true);
  });

  it('should_not_show_when_user_skipped', () => {
    const state: FooterGuideState = { status: 'skipped' };
    expect(shouldShowGuide(state, metrics())).toBe(false);
  });

  it('should_not_show_when_completed_and_delta_matches_baseline', () => {
    const current = metrics();
    const state: FooterGuideState = {
      status: 'completed',
      confirmedDelta: current.outerHeight - current.innerHeight,
      dpr: current.devicePixelRatio,
    };
    expect(shouldShowGuide(state, current)).toBe(false);
  });

  it('should_reshow_when_delta_grew_past_threshold_at_same_dpr', () => {
    const current = metrics();
    const state: FooterGuideState = {
      status: 'completed',
      confirmedDelta:
        current.outerHeight - current.innerHeight - RESHOW_DELTA_THRESHOLD_PX,
      dpr: current.devicePixelRatio,
    };
    expect(shouldShowGuide(state, current)).toBe(true);
  });

  it('should_not_reshow_when_delta_grew_but_dpr_changed', () => {
    const current = metrics();
    const state: FooterGuideState = {
      status: 'completed',
      confirmedDelta:
        current.outerHeight - current.innerHeight - RESHOW_DELTA_THRESHOLD_PX,
      dpr: current.devicePixelRatio + 1,
    };
    expect(shouldShowGuide(state, current)).toBe(false);
  });

  it('should_not_reshow_when_completed_without_recorded_baseline', () => {
    const state: FooterGuideState = { status: 'completed' };
    expect(shouldShowGuide(state, metrics())).toBe(false);
  });
});
