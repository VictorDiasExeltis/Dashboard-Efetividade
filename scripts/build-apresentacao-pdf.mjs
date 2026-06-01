import { readFileSync, writeFileSync } from 'node:fs';
import { marked } from 'marked';

const ROOT = 'c:\\Users\\victor.eugenio\\OneDrive - Insud Pharma, S.L\\Antigravity\\Dashboard de Efetividade\\sfe-dashboard';

const md = readFileSync(ROOT + '\\APRESENTACAO-DIRETORIA.md', 'utf8');
const body = marked.parse(md, { mangle: false, headerIds: true });

const css = `
  @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", -apple-system, system-ui, Arial, sans-serif;
    color: #1e293b; font-size: 10.5pt; line-height: 1.55; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 {
    color: #1e3a8a; font-size: 22pt; line-height: 1.2; margin: 0 0 4pt;
    border-bottom: 3px solid #1e3a8a; padding-bottom: 8pt;
  }
  h2 {
    color: #1e3a8a; font-size: 15pt; margin: 22pt 0 8pt;
    padding: 6pt 10pt; background: #eff3fb; border-left: 4px solid #1e3a8a;
    border-radius: 4px; page-break-after: avoid;
  }
  h3 { color: #1e40af; font-size: 12pt; margin: 14pt 0 4pt; page-break-after: avoid; }
  p { margin: 6pt 0; }
  strong { color: #0f172a; }
  a { color: #1e40af; text-decoration: none; }
  ul, ol { margin: 6pt 0; padding-left: 20pt; }
  li { margin: 2.5pt 0; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 16pt 0; }
  code {
    background: #f1f5f9; color: #be123c; padding: 1px 5px;
    border-radius: 4px; font-family: "Consolas", monospace; font-size: 9pt;
  }
  blockquote {
    margin: 8pt 0; padding: 8pt 12pt; background: #fffbeb;
    border-left: 4px solid #f59e0b; border-radius: 4px; color: #78350f;
    font-size: 9.8pt;
  }
  blockquote p { margin: 2pt 0; }
  table {
    border-collapse: collapse; width: 100%; margin: 10pt 0; font-size: 9.3pt;
    page-break-inside: avoid;
  }
  th {
    background: #1e3a8a; color: #fff; text-align: left; padding: 6pt 8pt;
    font-weight: 600;
  }
  td { border: 1px solid #e2e8f0; padding: 5pt 8pt; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  h2, h3 { break-inside: avoid; }
`;

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Apresentacao a Diretoria - Dashboard de Efetividade</title>
<style>${css}</style></head>
<body>${body}</body></html>`;

writeFileSync(ROOT + '\\APRESENTACAO-DIRETORIA.html', html, 'utf8');
console.log('HTML gerado com sucesso.');
