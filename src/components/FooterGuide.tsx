import { ArrowDown, ArrowDownRight, ArrowRight, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFooterGuide } from '../hooks/useFooterGuide';

/** Viewport-top offset of the Customize Chrome panel's Footer toggle. */
const PANEL_ANCHOR_TOP_PX = 760;
/** Minimum space kept below the card so it never runs off short viewports. */
const PANEL_CLAMP_BOTTOM_PX = 110;

/**
 * First-run coach marks guiding users to disable Chrome's NTP attribution
 * footer. The footer and the Customize Chrome side panel are browser UI, so
 * the cards point toward screen edges rather than anchoring to DOM elements.
 */
export default function FooterGuide() {
  const { step, advance, complete, skip } = useFooterGuide();

  if (step === null) return null;

  if (step === 'success') {
    return (
      <div
        role="status"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10"
      >
        <PartyPopper size={18} className="text-emerald-400" />
        Footer hidden — enjoy the full screen!
      </div>
    );
  }

  const isCorner = step === 'corner';

  // The panel's content is top-anchored with a fixed height, so the Footer
  // toggle lands at ~780px from the viewport top on any screen. Clamp so the
  // card stays fully visible on short (laptop) viewports — and when the clamp
  // engages, the toggle sits below-right of the card, so the pointer flips
  // from a horizontal to a diagonal arrow.
  const panelStepTop = {
    top: `min(${PANEL_ANCHOR_TOP_PX}px, calc(100% - ${PANEL_CLAMP_BOTTOM_PX}px))`,
  } as const;
  const isClampedViewport =
    window.innerHeight < PANEL_ANCHOR_TOP_PX + PANEL_CLAMP_BOTTOM_PX;

  return (
    <div
      role="dialog"
      aria-label="Hide Chrome footer guide"
      style={isCorner ? undefined : panelStepTop}
      className={`fixed z-50 flex max-w-sm gap-2 transition-all duration-300 ${
        isCorner
          ? 'bottom-3 right-6 flex-col items-end'
          : 'right-4 -translate-y-1/2 flex-row items-center'
      }`}
    >
      <div className="rounded-xl bg-zinc-900 p-4 text-white shadow-2xl ring-1 ring-white/10">
        <h2 className="m-0 text-sm font-semibold">
          {isCorner ? 'Get the full-screen experience' : 'Almost there'}
        </h2>
        <p className="mb-0 mt-1.5 text-[13px] leading-snug opacity-80">
          {isCorner ? (
            <>
              Chrome adds a footer below MonoStart. To hide it, click{' '}
              <strong className="font-semibold opacity-100">Customize Chrome</strong> in the
              bottom-right corner.
            </>
          ) : (
            <>
              Under <strong className="font-semibold opacity-100">Footer</strong>, turn off{' '}
              <strong className="font-semibold opacity-100">
                Show footer on New Tab page
              </strong>
              , then close the panel.
            </>
          )}
        </p>
        {isCorner && (
          <p className="mb-0 mt-1.5 text-xs opacity-50">
            Don&apos;t see a footer? You&apos;re all set — skip this.
          </p>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={skip}
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            Skip
          </Button>
          <Button
            size="sm"
            onClick={isCorner ? advance : complete}
            className="bg-white text-zinc-900 hover:bg-white/90"
          >
            {isCorner ? 'Next' : 'Done'}
          </Button>
        </div>
      </div>

      {isCorner ? (
        // The Customize Chrome button sits ~100px in from the right screen
        // edge, just below the viewport. Container is 24px from the edge, so
        // mr-12 (48px) centers the badged arrow directly above the button.
        <span
          aria-hidden="true"
          className="footer-guide-nudge-down mr-12 flex rounded-full bg-zinc-900 p-1.5 text-white shadow-lg ring-1 ring-white/15"
        >
          <ArrowDown size={24} strokeWidth={2.5} />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`mr-1 flex animate-pulse rounded-full bg-zinc-900 p-1.5 text-white shadow-lg ring-1 ring-white/15 ${
            isClampedViewport ? 'self-end translate-y-2' : ''
          }`}
        >
          {isClampedViewport ? (
            <ArrowDownRight size={24} strokeWidth={2.5} />
          ) : (
            <ArrowRight size={24} strokeWidth={2.5} />
          )}
        </span>
      )}
    </div>
  );
}
