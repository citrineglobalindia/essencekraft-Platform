#!/usr/bin/env node
// Imports the Botanical Encyclopedia (1,200+ articles) verbatim from the live essencekraft.in app bundle.
// Usage: node scripts/import-wiki.mjs   → writes data/wiki/{index,content,refs}.json
import fs from 'fs';
const SITE = process.env.WIKI_SOURCE || 'https://www.essencekraft.in';

function unescapeJs(lit) { // JS single-quoted string literal body → string
  let out = '';
  for (let i = 0; i < lit.length; i++) {
    const c = lit[i];
    if (c !== '\\') { out += c; continue; }
    const n = lit[++i];
    if (n === 'n') out += '\n'; else if (n === 't') out += '\t'; else if (n === 'r') out += '\r';
    else if (n === 'b') out += '\b'; else if (n === 'f') out += '\f'; else if (n === 'v') out += '\v'; else if (n === '0') out += '\0';
    else if (n === 'x') { out += String.fromCharCode(parseInt(lit.substr(i + 1, 2), 16)); i += 2; }
    else if (n === 'u') { out += String.fromCharCode(parseInt(lit.substr(i + 1, 4), 16)); i += 4; }
    else if (n === '\n') { /* line continuation */ }
    else out += n;
  }
  return out;
}

const html = await (await fetch(SITE + '/categories')).text();
const m = html.match(/\/static\/js\/main\.[a-z0-9]+\.js/);
if (!m) throw new Error('Could not find app bundle on ' + SITE);
console.log('bundle:', m[0]);
const js = await (await fetch(SITE + m[0])).text();
const blobs = [];
for (let p = js.indexOf("JSON.parse('"); p !== -1; p = js.indexOf("JSON.parse('", p + 1)) {
  let i = p + 12, j = i;
  while (j < js.length) { if (js[j] === '\\') { j += 2; continue; } if (js[j] === "'" && js[j + 1] === ')') break; j++; }
  try { blobs.push(JSON.parse(unescapeJs(js.slice(i, j)))); } catch { /* not JSON */ }
}
const index = blobs.find(b => Array.isArray(b) && b[0]?.slug && b[0]?.title);
const content = blobs.find(b => !Array.isArray(b) && Object.values(b)[0]?.overview !== undefined);
const refs = blobs.find(b => !Array.isArray(b) && Array.isArray(Object.values(b)[0]) && Object.values(b)[0][0]?.url);
if (!index || !content || !refs) throw new Error('Encyclopedia data not found in bundle (site structure changed?)');
fs.mkdirSync('data/wiki', { recursive: true });
fs.writeFileSync('data/wiki/index.json', JSON.stringify(index));
fs.writeFileSync('data/wiki/content.json', JSON.stringify(content));
fs.writeFileSync('data/wiki/refs.json', JSON.stringify(refs));
console.log(`imported ${index.length} articles, ${Object.keys(content).length} bodies, ${Object.keys(refs).length} reference lists`);
