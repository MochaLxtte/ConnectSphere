/** Inspect local C4 SVG exports: node/arrow counts, label fit and collisions.
 * Run from any directory: node inspect-svg.mjs /path/to/mermaid-cli/src/cli.js /path/to/chrome
 * Uses Puppeteer from the supplied Mermaid CLI installation; installs nothing.
 */
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [cli, chrome] = process.argv.slice(2);
if (!cli || !chrome) throw new Error('Supply the Mermaid CLI src/cli.js and Chromium executable.');
const require = createRequire(pathToFileURL(path.resolve(cli)));
const { default: puppeteer } = await import(pathToFileURL(require.resolve('puppeteer')).href);
const evidence = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(evidence, '../../../../..');
const expected = { 'c1-context': [10, 8], 'c2-containers': [6, 5], 'c3-components': [16, 30] };
const browser = await puppeteer.launch({ executablePath: path.resolve(chrome), headless: true });
const results = [];
try {
  for (const [name, [nodeCount, edgeCount]] of Object.entries(expected)) {
    const page = await browser.newPage();
    await page.setViewport({ width: 2400, height: 1600 });
    const svgPath = path.join(repository, 'docs/architecture/exports', name + '.svg');
    await page.goto(pathToFileURL(svgPath).href);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const rect = element => {
        const bounds = element.getBoundingClientRect();
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
      };
      const within = (a, b) => a.x >= b.x - 1 && a.y >= b.y - 1
        && a.x + a.width <= b.x + b.width + 1 && a.y + a.height <= b.y + b.height + 1;
      const intersects = (a, b) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 2
        && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 2;
      const svg = document.querySelector('svg');
      const nodes = [...document.querySelectorAll('g.node')].map(group => {
        const label = group.querySelector('g.label');
        const shape = [...group.children].find(element => ['rect', 'path', 'polygon'].includes(element.localName));
        return {
          id: group.id, label: group.textContent.trim(), bounds: rect(group),
          label_within_shape: Boolean(label && shape && within(rect(label), rect(shape))),
        };
      });
      const edges = [...document.querySelectorAll('path.flowchart-link')].map(edge => ({ id: edge.id }));
      const labels = [...document.querySelectorAll('g.edgeLabels > g.edgeLabel')]
        .map(group => ({ text: group.textContent.trim(), bounds: rect(group) }));
      const overlaps = [];
      for (const label of labels) for (const node of nodes) {
        if (intersects(label.bounds, node.bounds)) overlaps.push({ label: label.text, node: node.id });
      }
      const labelOverlaps = [];
      for (let a = 0; a < labels.length; a++) for (let b = a + 1; b < labels.length; b++) {
        if (intersects(labels[a].bounds, labels[b].bounds)) {
          labelOverlaps.push([labels[a].text, labels[b].text]);
        }
      }
      return {
        viewBox: svg.getAttribute('viewBox'),
        title: document.querySelector('.flowchartTitleText, .mermaidTitleText')?.textContent,
        nodes, edges, edge_labels: labels, label_node_overlaps: overlaps, edge_label_overlaps: labelOverlaps,
      };
    });
    const source = await readFile(svgPath, 'utf8');
    const valid = result.nodes.length === nodeCount && result.edges.length === edgeCount
      && result.edge_labels.length === edgeCount && result.nodes.every(node => node.label_within_shape)
      && result.edge_labels.every(label => label.text.length > 0) && Boolean(result.title)
      && result.label_node_overlaps.length === 0 && result.edge_label_overlaps.length === 0;
    results.push({ name, result: valid ? 'Pass' : 'Fail', includes_legend_node: true, ...result });
    console.log(JSON.stringify({ name, result: valid ? 'Pass' : 'Fail', nodes: result.nodes.length,
      arrows: result.edges.length, labelled_arrows: result.edge_labels.length,
      clipping: result.nodes.filter(node => !node.label_within_shape).length,
      label_node_overlaps: result.label_node_overlaps.length,
      edge_label_overlaps: result.edge_label_overlaps.length, svg_bytes: Buffer.byteLength(source) }));
    await page.close();
  }
  await writeFile(path.join(evidence, 'render-validation.json'), JSON.stringify({
    browser: await browser.version(), method: 'Local SVG DOM inspection with Puppeteer; no application server or database',
    limitations: 'Checks label geometry and rendered counts; semantic accuracy is recorded separately in audit.json.',
    diagrams: results,
  }, null, 2) + '\n');
  if (results.some(result => result.result !== 'Pass')) process.exitCode = 1;
} finally {
  await browser.close();
}
