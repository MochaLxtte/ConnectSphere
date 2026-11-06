/** Render five archived C4 views, inspect every SVG element, and export PNGs.
 * Run from repository root: node <this file> <mermaid-cli/src/cli.js> <chrome.exe>
 * Uses an existing Mermaid CLI/Puppeteer installation. Installs nothing.
 */
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const [cli, chrome] = process.argv.slice(2);
if (!cli || !chrome) throw new Error('Supply existing Mermaid CLI src/cli.js and Chromium executable.');
const root = process.cwd(), evidence = path.join(root, 'docs/scrum/sprint-03/evidence/pre-week-7-c4-audit-20261106');
const archive = path.join(root, 'docs/architecture/archive/pre-week-7-customer-changes');
const output = path.join(archive, 'c4-exports');
const tmp = path.join(os.tmpdir(), 'connectsphere-pre-week7-c4-render-20261106');
await mkdir(tmp, { recursive: true }); await mkdir(output, { recursive: true });
const models = JSON.parse(await readFile(path.join(evidence, 'models.json'), 'utf8'));
const config = { theme: 'base', layout: 'elk', themeVariables: { fontFamily: 'Arial, sans-serif', fontSize: '16px', primaryColor: '#eff6ff', primaryTextColor: '#0f172a', primaryBorderColor: '#64748b', lineColor: '#475569', edgeLabelBackground: '#ffffff' }, flowchart: { htmlLabels: true, nodeSpacing: 55, rankSpacing: 100, padding: 22, wrappingWidth: 240, useMaxWidth: false } };
await writeFile(path.join(evidence, 'mermaid-config.json'), JSON.stringify(config, null, 2) + '\n');
await writeFile(path.join(tmp, 'puppeteer.json'), JSON.stringify({ executablePath: path.resolve(chrome), args: ['--no-sandbox', '--disable-dev-shm-usage'] }));
const require = createRequire(pathToFileURL(path.resolve(cli)));
const { default: puppeteer } = await import(pathToFileURL(require.resolve('puppeteer')).href);
let index = 0;
async function worker() {
  while (index < models.length) {
    const m = models[index++];
    await new Promise((resolve, reject) => {
      const p = spawn(process.execPath, [path.resolve(cli), '-i', path.join(root, m.source), '-o', path.join(output, m.name + '.svg'), '-c', path.join(evidence, 'mermaid-config.json'), '-p', path.join(tmp, 'puppeteer.json'), '-b', 'white', '-w', '2400', '-H', '1800'], { windowsHide: true });
      let log = ''; p.stdout.on('data', b => log += b); p.stderr.on('data', b => log += b);
      p.on('error', reject); p.on('exit', code => code ? reject(new Error(m.name + ': ' + log)) : resolve());
    });
    console.log(m.name + ' SVG rendered');
  }
}
await Promise.all([worker(), worker()]);
const browser = await puppeteer.launch({ executablePath: path.resolve(chrome), headless: true });
const results = [];
const hash = b => createHash('sha256').update(b).digest('hex');
try {
  for (const m of models) {
    const page = await browser.newPage(); await page.setViewport({ width: 2400, height: 1800, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(output, m.name + '.svg')).href);
    await page.evaluate(async () => {
      await document.fonts.ready;
      const svg = document.querySelector('svg'), v = svg.viewBox.baseVal;
      svg.style.maxWidth = 'none'; svg.setAttribute('width', Math.ceil(v.width)); svg.setAttribute('height', Math.ceil(v.height));
      if (document.body) document.body.style.margin = '0';
    });
    const dims = await page.evaluate(() => ({ width: Math.ceil(document.querySelector('svg').viewBox.baseVal.width), height: Math.ceil(document.querySelector('svg').viewBox.baseVal.height) }));
    await page.setViewport({ ...dims, deviceScaleFactor: 1 });
    const q = await page.evaluate(() => {
      const rect = e => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
      const within = (a,b) => a.x >= b.x-1 && a.y >= b.y-1 && a.x+a.width <= b.x+b.width+1 && a.y+a.height <= b.y+b.height+1;
      const intersects = (a,b) => Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>2 && Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>2;
      const nodes = [...document.querySelectorAll('g.node')].map(g => {
        const label = g.querySelector('g.label'), shape = [...g.children].find(e => ['rect','path','polygon'].includes(e.localName));
        return { id:g.id, label:g.textContent.trim(), bounds:rect(g), label_within_shape:!!(label && shape && within(rect(label),rect(shape))) };
      });
      const edges = [...document.querySelectorAll('path.flowchart-link')].map(e => ({id:e.id,style:e.getAttribute('class'),dasharray:getComputedStyle(e).strokeDasharray,end:e.getAttribute('marker-end')}));
      const labels = [...document.querySelectorAll('g.edgeLabels > g.edgeLabel')].map(g => ({id:g.querySelector('[data-id]')?.getAttribute('data-id'),text:g.textContent.trim(),bounds:rect(g)}));
      const clusters = [...document.querySelectorAll('g.cluster')].map(g => ({id:g.id,text:g.querySelector('.cluster-label')?.textContent.trim(),bounds:rect(g)}));
      const collisions=[], labelCollisions=[], nodeCollisions=[];
      for (const l of labels) for (const n of nodes) if (intersects(l.bounds,n.bounds)) collisions.push({label:l.text,node:n.id});
      for (let a=0;a<labels.length;a++) for(let b=a+1;b<labels.length;b++) if(intersects(labels[a].bounds,labels[b].bounds)) labelCollisions.push([labels[a].text,labels[b].text]);
      for (let a=0;a<nodes.length;a++) for(let b=a+1;b<nodes.length;b++) if(intersects(nodes[a].bounds,nodes[b].bounds)) nodeCollisions.push([nodes[a].id,nodes[b].id]);
      const svg=rect(document.querySelector('svg'));
      const outOfBounds=[...nodes,...labels,...clusters].filter(x=>!within(x.bounds,svg)).map(x=>x.id||x.text);
      return {nodes,edges,labels,clusters,collisions,labelCollisions,nodeCollisions,outOfBounds};
    });
    const normalize = s => s.replace(/<br\s*\/?\s*>/g,'').replace(/\s+/g,'');
    const problems = [];
    if(q.nodes.length!==m.nodes.length || q.edges.length!==m.edges.length || q.labels.length!==m.edges.length || q.clusters.length!==m.boundaries.length) problems.push('element count mismatch');
    for (const n of m.nodes) {
      const rendered=q.nodes.find(x=>new RegExp('(?:^|-)flowchart-'+n.id+'-\\d+$').test(x.id));
      if(!rendered || normalize(rendered.label)!==normalize(n.label) || !rendered.label_within_shape) problems.push('missing/mismatched/clipped node '+n.id);
    }
    for (const e of m.edges) {
      const rendered=q.edges.find(x=>x.id.includes('L_'+e.from+'_'+e.to+'_'));
      const label=q.labels.find(x=>x.id==='L_'+e.from+'_'+e.to+'_0');
      if(!rendered || !rendered.end || (e.dashed ? parseFloat(rendered.dasharray)<=0 : parseFloat(rendered.dasharray)>0)) problems.push('edge endpoints/direction/style '+e.id);
      if(!label || normalize(label.text)!==normalize(e.label)) problems.push('individual edge label '+e.id);
    }
    const expectedLabels=m.edges.map(x=>normalize(x.label)).sort();
    if(JSON.stringify(expectedLabels)!==JSON.stringify(q.labels.map(x=>normalize(x.text)).sort())) problems.push('edge labels mismatch');
    for (const b of m.boundaries) {
      const cluster=q.clusters.find(x=>x.id===b.id || x.id.endsWith('-'+b.id));
      if(!cluster || normalize(cluster.text)!==normalize(b.label)) problems.push('boundary label '+b.id);
      else for(const id of b.members) {
        const n=q.nodes.find(x=>x.id.includes('flowchart-'+id+'-'));
        if(!n || n.bounds.x<cluster.bounds.x-1 || n.bounds.y<cluster.bounds.y-1 || n.bounds.x+n.bounds.width>cluster.bounds.x+cluster.bounds.width+1 || n.bounds.y+n.bounds.height>cluster.bounds.y+cluster.bounds.height+1) problems.push('boundary member '+id);
      }
    }
    if(q.collisions.length || q.labelCollisions.length || q.nodeCollisions.length || q.outOfBounds.length) problems.push('geometry collision or out-of-bounds');
    const png=path.join(output,m.name+'.png'); await (await page.$('svg')).screenshot({path:png});
    const result={name:m.name,result:problems.length?'Fail':'Pass',problems,dimensions:dims,source_sha256:m.source_sha256,svg_sha256:hash(await readFile(path.join(output,m.name+'.svg'))),png_sha256:hash(await readFile(png)),...q};
    results.push(result); console.log(JSON.stringify({name:m.name,result:result.result,problems,dimensions:dims,blocks:q.nodes.length,connections:q.edges.length}));
    await page.close();
  }
  await writeFile(path.join(evidence,'render-validation.json'),JSON.stringify({browser:await browser.version(),renderer:'Mermaid CLI 11.17.1 / Mermaid 11.17.2; ELK layout',checks:'Every node label/shape fit; directed edge endpoints and dashed/solid style; edge labels; cluster label/membership; node/label collisions and canvas containment; source/export hashes',diagrams:results},null,2)+'\n');
  if(results.some(x=>x.result!=='Pass')) process.exitCode=1;
} finally {await browser.close();}
