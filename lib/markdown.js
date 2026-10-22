import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import markedKatex from 'marked-katex-extension';
import markedFootnote from 'marked-footnote';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import markedAlert from 'marked-alert';
import hljs from 'highlight.js/lib/common';

// One Markdown pipeline for live pages, the admin page preview and the editor's quick preview,
// so what you see while writing is exactly what gets published.
//   GFM (tables, task lists, strikethrough, autolinks) · syntax-highlighted code · LaTeX math ($…$, $$…$$)
//   footnotes ([^1]) · GitHub alerts (> [!NOTE]) · linkable heading ids · ```mermaid diagrams (drawn in the browser by <Prose>)

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

// Images load lazily; a title (`![alt](url "caption")`) becomes a caption under the image.
// Size and placement go after a "|" in the alt text:  ![Dashboard | 50% right](url "Caption")
//   size:  small (33%) · medium (50%) · large (75%) · full · or an exact 60% / 320px
//   place: left / right (text wraps around it) · center (the default)
// Spans (not <figure>) because Markdown images sit inside paragraphs.
const SIZES = { small: '33%', medium: '50%', large: '75%', full: '100%' };

function imageOptions(text = '') {
  const bar = text.lastIndexOf('|');
  if (bar === -1) return { alt: text };
  const opts = { alt: text.slice(0, bar).trim() };
  for (const word of text.slice(bar + 1).trim().toLowerCase().split(/[\s,]+/)) {
    if (SIZES[word]) opts.width = SIZES[word];
    else if (/^\d{1,3}%$/.test(word) && parseInt(word, 10) <= 100) opts.width = word;
    else if (/^\d{2,4}px$/.test(word)) opts.width = word;
    else if (['left', 'right', 'center'].includes(word)) opts.align = word;
  }
  return opts;
}

const imageRenderer = {
  image({ href, title, text }) {
    const { alt, width, align } = imageOptions(text);
    if (!href) return escapeHtml(alt || '');
    const img = `<img src="${escapeAttr(href)}" alt="${escapeAttr(alt || '')}" loading="lazy" decoding="async">`;
    if (!title && !width && !align) return img;
    const cls = `md-figure${align ? ` is-${align}` : ''}${width ? ' is-sized' : ''}`;
    const style = width ? ` style="--w:${width}"` : '';
    return `<span class="${cls}"${style}>${img}${title ? `<span class="md-caption">${escapeHtml(title)}</span>` : ''}</span>`;
  },
};

const marked = new Marked(
  { gfm: true, renderer: imageRenderer },
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang === 'mermaid') return escapeHtml(code); // left as source; <Prose> turns it into a diagram
      if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
      return escapeHtml(code);
    },
  }),
  markedKatex({ throwOnError: false, nonStandard: true }),
  markedFootnote(),
  gfmHeadingId(),
  markedAlert(),
);

export function renderMarkdown(markdown) {
  return markdown ? marked.parse(markdown) : '';
}

// ---------- HTML content ----------
// Posts and projects can be written in raw HTML instead of Markdown. Only you can write content, but it's still
// hardened in case the admin login is ever misused: <script>, <object>, <embed>, <base> and <meta> are removed,
// as are inline event handlers (onclick=…) and javascript: URLs; iframes are kept only for https sources
// (YouTube, CodePen, …). Images load lazily unless they say otherwise.
export function cleanHtml(html = '') {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<\/?(script|object|embed|base|meta)\b[^>]*>/gi, '')
    .replace(/<iframe\b(?![^>]*\ssrc\s*=\s*["']?https:\/\/)[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\b(href|src|action|formaction|xlink:href)\s*=\s*(["']?)\s*(?:javascript|vbscript|data:text\/html)[^"'\s>]*/gi, '$1=$2#')
    .replace(/<img\b(?![^>]*\sloading\s*=)/gi, '<img loading="lazy"');
}

// One entry point for pages and previews: `format` is 'markdown' (default) or 'html'.
export function renderContent(content, format = 'markdown') {
  if (!content) return '';
  return format === 'html' ? cleanHtml(content) : renderMarkdown(content);
}
