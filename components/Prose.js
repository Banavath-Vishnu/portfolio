'use client';

import { useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';

let counter = 0;

const CHART_COLORS = ['#3d6bff', '#2fbf71', '#f0b030', '#a371f7', '#f05252', '#22b8cf', '#ff8a4c', '#e64980', '#94d82d', '#748ffc', '#20c997', '#fab005'];

// Diagram colours matched to the site in both themes (Mermaid's built-in dark theme is low-contrast).
function themeFor(light) {
  const base = light
    ? { darkMode: false, background: '#ffffff', primaryColor: '#e8eeff', primaryTextColor: '#0b1020', primaryBorderColor: '#3d6bff', secondaryColor: '#eef7f1', tertiaryColor: '#f6f8fc', lineColor: '#66718a', textColor: '#0b1020', titleColor: '#0b1020', noteBkgColor: '#fff6db', noteTextColor: '#0b1020' }
    : { darkMode: true, background: '#0b0f18', primaryColor: '#16213a', primaryTextColor: '#eef1f7', primaryBorderColor: '#3d6bff', secondaryColor: '#14301f', tertiaryColor: '#0e1422', lineColor: '#8c96ab', textColor: '#eef1f7', titleColor: '#eef1f7', noteBkgColor: '#2b2410', noteTextColor: '#eef1f7' };
  const pie = Object.fromEntries(CHART_COLORS.map((c, i) => [`pie${i + 1}`, c]));
  // Section colours for timeline, mind map and journey diagrams.
  const scale = Object.fromEntries(CHART_COLORS.flatMap((c, i) => [[`cScale${i}`, c], [`cScaleLabel${i}`, '#ffffff']]));
  return {
    ...base,
    ...pie,
    ...scale,
    fontFamily: 'inherit',
    pieStrokeColor: base.background,
    pieOuterStrokeColor: base.lineColor,
    pieTitleTextColor: base.textColor,
    pieSectionTextColor: '#ffffff',
    pieLegendTextColor: base.textColor,
    xyChart: { plotColorPalette: CHART_COLORS.join(', '), backgroundColor: base.background, titleColor: base.textColor, xAxisLabelColor: base.textColor, yAxisLabelColor: base.textColor, xAxisTitleColor: base.textColor, yAxisTitleColor: base.textColor, xAxisLineColor: base.lineColor, yAxisLineColor: base.lineColor, xAxisTickColor: base.lineColor, yAxisTickColor: base.lineColor },
  };
}

// Mermaid's block diagram JSON-stringifies its layout tree for a debug log (even when logging is off).
// In a React page that tree reaches React's internal fields on <html> and throws, so skip DOM nodes
// while a block diagram renders. Other diagram types are rendered untouched.
async function renderDiagram(mermaid, id, src) {
  if (!/^\s*block(-beta)?\b/.test(src)) return mermaid.render(id, src);
  const original = JSON.stringify;
  JSON.stringify = (value, replacer, space) => original(
    value,
    Array.isArray(replacer) ? replacer : (key, v) => (v instanceof Node ? undefined : replacer ? replacer(key, v) : v),
    space,
  );
  try { return await mermaid.render(id, src); } finally { JSON.stringify = original; }
}

// Renders Markdown HTML (from lib/markdown.js) and draws any ```mermaid blocks as diagrams.
// Mermaid is only downloaded (from /vendor/mermaid) when a page actually contains a diagram.
export default function Prose({ html, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Turn each code block into a diagram container that keeps its source. Containers made on an
    // earlier run are reused, so this is safe when React runs the effect twice (dev Strict Mode).
    root.querySelectorAll('code.language-mermaid').forEach((code) => {
      const div = document.createElement('div');
      div.className = 'mermaid-diagram';
      div.dataset.src = code.textContent;
      div.textContent = code.textContent;
      code.closest('pre').replaceWith(div);
    });
    const nodes = [...root.querySelectorAll('.mermaid-diagram')];
    if (nodes.length === 0) return;

    let cancelled = false;
    const draw = async () => {
      // Loaded from /vendor (copied by scripts/vendor-mermaid.mjs) so it stays out of the server bundle.
      // The URL is built at runtime so no bundler (Turbopack, or OpenNext's esbuild pass) tries to resolve it.
      const src = new URL('/vendor/mermaid/mermaid.esm.min.mjs', window.location.origin).href;
      const mermaid = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ src)).default;
      if (cancelled) return;
      const light = document.documentElement.dataset.theme === 'light';
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', themeVariables: themeFor(light), fontFamily: 'inherit' });

      // One at a time, so a mistake in one diagram doesn't stop the others from drawing.
      for (const node of nodes) {
        const id = `mermaid-${++counter}`;
        try {
          const { svg, bindFunctions } = await renderDiagram(mermaid, id, node.dataset.src);
          if (cancelled) return;
          node.innerHTML = svg;
          node.classList.add('is-ready');
          node.classList.remove('is-error');
          bindFunctions?.(node);
        } catch (err) {
          document.getElementById(`d${id}`)?.remove(); // mermaid leaves a temporary error element behind
          if (cancelled) return;
          node.classList.add('is-error');
          node.classList.remove('is-ready');
          node.replaceChildren(
            Object.assign(document.createElement('strong'), { textContent: 'Diagram error' }),
            Object.assign(document.createElement('pre'), { textContent: String(err?.message || err).trim() }),
            Object.assign(document.createElement('code'), { textContent: node.dataset.src }),
          );
        }
      }
    };
    draw();

    // Redraw in the matching colours when the site theme changes.
    const observer = new MutationObserver(draw);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { cancelled = true; observer.disconnect(); };
  }, [html]);

  return <div ref={ref} className={`prose ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
