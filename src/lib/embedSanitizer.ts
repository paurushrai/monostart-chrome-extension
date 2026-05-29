import DOMPurify from 'dompurify';

const ADD_TAGS = ['iframe', 'blockquote'];

const ADD_ATTR = [
  'allow',
  'allowfullscreen',
  'allowtransparency',
  'frameborder',
  'scrolling',
  'sandbox',
  'srcdoc',
  'referrerpolicy',
  'loading',
  'csp',
  'data-instgrm-captioned',
  'data-instgrm-permalink',
  'data-instgrm-version',
];

export const isEmbedCode = (input: string | null | undefined): boolean => {
  if (!input) return false;
  return input.trim().startsWith('<');
};

const YOUTUBE_ID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/))([A-Za-z0-9_-]{6,})/;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;
const SPOTIFY = /open\.spotify\.com\/(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/;
const TWITCH_CHANNEL = /twitch\.tv\/(\w+)(?:$|\?|\/)/;
const LOOM = /loom\.com\/share\/([A-Za-z0-9]+)/;

export const rewriteToEmbedUrl = (rawUrl: string | null | undefined): string | null | undefined => {
  if (!rawUrl) return rawUrl;
  const url = rawUrl.trim();

  const yt = url.match(YOUTUBE_ID);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  const vm = url.match(VIMEO_ID);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;

  const sp = url.match(SPOTIFY);
  if (sp) return `https://open.spotify.com/embed/${sp[1]}/${sp[2]}`;

  const tw = url.match(TWITCH_CHANNEL);
  if (tw) {
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `https://player.twitch.tv/?channel=${tw[1]}&parent=${parent}`;
  }

  const lm = url.match(LOOM);
  if (lm) return `https://www.loom.com/embed/${lm[1]}`;

  return url;
};

export const sanitizeEmbed = (html: string | null | undefined): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ADD_TAGS,
    ADD_ATTR,
  });
};

export const extractEmbedSrc = (html: string | null | undefined): string => {
  if (!html) return '';
  const match = html.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  return match?.[1] ?? '';
};

export const extractEmbedTitle = (html: string | null | undefined): string => {
  if (!html) return '';
  const titleMatch = html.match(/<iframe[^>]*\stitle=["']([^"']+)["']/i);
  if (titleMatch?.[1]) return titleMatch[1];
  const src = extractEmbedSrc(html);
  if (src) {
    try {
      return new URL(src).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }
  return '';
};
