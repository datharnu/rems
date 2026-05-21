#!/usr/bin/env node
/**
 * Tiny zero-dependency markdown -> HTML renderer for the Rems solution paper.
 * Just enough markdown features for this specific document — not a general
 * markdown engine. Run with: node paper/build_pdf.mjs
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
  // code spans first so we don't mangle them
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`);
  // links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${h}">${t}</a>`);
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic (avoid eating bold leftovers)
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return s;
}

function renderTable(rows) {
  const head = rows[0];
  const body = rows.slice(2); // skip separator row
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

    // Headings
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(esc(h[2]))}</h${lvl}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // Image: ![alt](path)
    const img = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line);
    if (img) {
      const alt = img[1];
      const src = img[2];
      out.push(
        `<figure class="fig"><img src="${src}" alt="${esc(alt)}"><figcaption>${inline(esc(alt))}</figcaption></figure>`
      );
      i++;
      continue;
    }

    // Code block
    if (/^```/.test(line)) {
      i++;
      const buf = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // Table
    if (line.startsWith('|') && lines[i + 1] && /^\|[\s|:-]+\|?$/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(renderTable(rows));
      continue;
    }

    // Bullet list
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

    // Ordered list
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

    // Paragraph (one or more non-blank lines)
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
  @page { size: Letter; margin: 0.85in 0.95in; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Source Serif Pro', Georgia, 'Times New Roman', serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #111;
    max-width: 7in;
    margin: 0 auto;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    color: #0a0a0a;
    line-height: 1.25;
    letter-spacing: -0.01em;
    margin-top: 1.4em;
    margin-bottom: 0.4em;
  }
  h1 {
    font-size: 22pt;
    margin-top: 0;
    color: #0a0a0a;
    border-bottom: 2px solid #10b981;
    padding-bottom: 0.3em;
  }
  h2 {
    font-size: 14pt;
    margin-top: 1.6em;
    color: #0a0a0a;
  }
  h3 {
    font-size: 11.5pt;
    color: #0a0a0a;
  }
  h4 { font-size: 11pt; color: #047857; font-style: italic; font-weight: 600; }
  p { margin: 0 0 0.7em; text-align: justify; }
  ul, ol { margin: 0 0 0.7em 1.2em; padding: 0; }
  li { margin-bottom: 0.25em; }
  hr {
    border: none;
    border-top: 1px solid #d4d4d8;
    margin: 1.5em 0;
  }
  a { color: #047857; text-decoration: none; border-bottom: 1px solid #a7f3d0; }
  strong { color: #0a0a0a; }
  em { color: #404040; }
  code {
    font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
    font-size: 9pt;
    background: #f5f5f4;
    color: #0a0a0a;
    padding: 1px 4px;
    border-radius: 3px;
  }
  pre {
    background: #fafaf9;
    border: 1px solid #e7e5e4;
    border-radius: 6px;
    padding: 12px 14px;
    overflow-x: auto;
    margin: 0.8em 0 1em;
    page-break-inside: avoid;
  }
  pre code {
    background: transparent;
    padding: 0;
    font-size: 9pt;
    line-height: 1.45;
    color: #1c1917;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.6em 0 1.2em;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #e7e5e4;
    padding: 7px 10px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f5f5f4;
    color: #0a0a0a;
    font-family: 'Inter', sans-serif;
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  /* Title block on page 1 */
  h1 + h3 {
    font-size: 12pt;
    margin-top: 0.1em;
    color: #404040;
    font-weight: 500;
    font-style: italic;
  }
  /* Section anchors don't break across pages awkwardly */
  h2 { page-break-after: avoid; }
  h3 { page-break-after: avoid; }
  figure.fig {
    margin: 0.8em 0 1.2em;
    page-break-inside: avoid;
    text-align: center;
  }
  figure.fig img {
    display: block;
    max-width: 100%;
    max-height: 2.75in;
    margin: 0 auto;
    object-fit: contain;
    border: 1px solid #e7e5e4;
    border-radius: 4px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  figure.fig figcaption {
    font-family: 'Inter', sans-serif;
    font-size: 8.5pt;
    color: #525252;
    line-height: 1.45;
    margin-top: 0.45em;
    text-align: left;
    font-style: italic;
  }
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
