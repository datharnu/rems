#!/usr/bin/env node
/**
 * Tiny zero-dependency markdown -> HTML renderer for the Rems solution paper.
 * Run with: node paper/build_pdf.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MD_PATH = path.join(__dirname, 'Rems_Solution_Paper.md');
const HTML_PATH = path.join(__dirname, 'Rems_Solution_Paper.html');

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(s) {
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${h}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return s;
}

function renderTable(rows) {
  const head = rows[0];
  const body = rows.slice(2);
  const ths = head.map((c) => `<th>${inline(esc(c))}</th>`).join('');
  const trs = body
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td>${inline(esc(c))}</td>`).join('')}</tr>`
    )
    .join('');
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function splitRow(line) {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((s) => s.trim());
}

function render(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;

  const flushPara = (buf) => {
    if (buf.length === 0) return;
    const para = buf.join(' ').trim();
    if (para) out.push(`<p>${inline(esc(para))}</p>`);
  };

  while (i < lines.length) {
    const line = lines[i];

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(esc(h[2]))}</h${lvl}>`);
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    const img = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line);
    if (img) {
      const imgs = [{ alt: img[1], src: img[2] }];
      while (i + 1 < lines.length) {
        const next = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(lines[i + 1]);
        if (!next) break;
        i++;
        imgs.push({ alt: next[1], src: next[2] });
      }
      if (imgs.length === 1) {
        out.push(
          `<figure class="fig"><img src="${imgs[0].src}" alt="${esc(imgs[0].alt)}"><figcaption>${inline(esc(imgs[0].alt))}</figcaption></figure>`
        );
      } else {
        out.push('<div class="fig-grid">');
        for (const im of imgs) {
          out.push(
            `<figure class="fig fig-compact"><img src="${im.src}" alt="${esc(im.alt)}"><figcaption>${inline(esc(im.alt))}</figcaption></figure>`
          );
        }
        out.push('</div>');
      }
      i++;
      continue;
    }

    if (/^```/.test(line)) {
      i++;
      const buf = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    if (line.startsWith('|') && lines[i + 1] && /^\|[\s|:-]+\|?$/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(renderTable(rows));
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      out.push(
        `<ul>${items
          .map((it) => `<li>${inline(esc(it))}</li>`)
          .join('')}</ul>`
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      out.push(
        `<ol>${items
          .map((it) => `<li>${inline(esc(it))}</li>`)
          .join('')}</ol>`
      );
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6}\s|```|---|\|[\s|:-]|[-*]\s|\d+\.\s|!\[)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    flushPara(buf);
  }

  return out.join('\n');
}

const PRINT_CSS = `
  @page { size: Letter; margin: 0.72in 0.8in; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Source Serif Pro', Georgia, 'Times New Roman', serif;
    font-size: 10.25pt;
    line-height: 1.48;
    color: #111;
    max-width: 7in;
    margin: 0 auto;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    color: #0a0a0a;
    line-height: 1.2;
    letter-spacing: -0.01em;
    margin-top: 0.9em;
    margin-bottom: 0.25em;
  }
  h1 {
    font-size: 20pt;
    margin-top: 0;
    border-bottom: 2px solid #10b981;
    padding-bottom: 0.25em;
  }
  h2 { font-size: 12.5pt; margin-top: 1.1em; }
  h3 { font-size: 10.5pt; }
  h4 { font-size: 10pt; color: #047857; font-style: italic; font-weight: 600; }
  p { margin: 0 0 0.45em; text-align: justify; }
  ul, ol { margin: 0 0 0.45em 1.1em; padding: 0; }
  li { margin-bottom: 0.15em; }
  hr { border: none; border-top: 1px solid #d4d4d8; margin: 0.7em 0; }
  a { color: #047857; text-decoration: none; }
  strong { color: #0a0a0a; }
  em { color: #404040; }
  code {
    font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
    font-size: 8.5pt;
    background: #f5f5f4;
    padding: 1px 3px;
    border-radius: 3px;
  }
  pre {
    background: #fafaf9;
    border: 1px solid #e7e5e4;
    border-radius: 4px;
    padding: 8px 10px;
    margin: 0.4em 0 0.6em;
    page-break-inside: avoid;
  }
  pre code { background: transparent; padding: 0; font-size: 8pt; line-height: 1.35; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.35em 0 0.6em;
    font-size: 9pt;
    page-break-inside: avoid;
  }
  th, td { border: 1px solid #e7e5e4; padding: 4px 7px; text-align: left; vertical-align: top; }
  th {
    background: #f5f5f4;
    font-family: 'Inter', sans-serif;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
  }
  h1 + h3 { font-size: 11pt; margin-top: 0.05em; color: #404040; font-weight: 500; font-style: italic; }
  h2, h3 { page-break-after: avoid; }
  figure.fig { margin: 0.35em 0 0.5em; page-break-inside: avoid; }
  figure.fig img {
    display: block;
    max-width: 100%;
    max-height: 2.2in;
    margin: 0 auto;
    object-fit: contain;
    border: 1px solid #e7e5e4;
    border-radius: 3px;
  }
  figure.fig figcaption {
    font-family: 'Inter', sans-serif;
    font-size: 7.5pt;
    color: #525252;
    line-height: 1.3;
    margin-top: 0.25em;
    font-style: italic;
  }
  .fig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 0.35em 0 0.5em;
    page-break-inside: avoid;
  }
  figure.fig-compact img { max-height: 1.9in; }
  figure.fig-compact figcaption { font-size: 7pt; }
`;

const md = fs.readFileSync(MD_PATH, 'utf8');
const body = render(md);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Rems Review Agent — Solution Paper</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Source+Serif+Pro:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap">
<style>${PRINT_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;

fs.writeFileSync(HTML_PATH, html);
console.log(`Wrote ${path.relative(process.cwd(), HTML_PATH)}`);
