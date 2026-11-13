import { build } from 'esbuild';
import { createRequire } from 'node:module';
const result=await build({stdin:{contents:`
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { MaterialReport } from './src/components/garage/MaterialReport';
const project={schemaVersion:1,templateId:'prazdna_hala',params:{width:18,length:36,clearHeight:6.5,roofPitchDeg:2,roofType:'gable',bayCount:6,profileSize:.22,hasStemWall:false},openings:[],materialSettings:{accessories:{ladder:{count:1,heightM:7,kgPerUnit:50}}}};
const html=renderToStaticMarkup(React.createElement(MaterialReport,{project,onChange:()=>{}}));
for(const text of ['Lišty a rebrík · podrobný rozpis','Rebrík','Odkvapové lemovanie','Štítová strešná lišta','CSV','XLSX'])assert.ok(html.includes(text),text);
const invalid=renderToStaticMarkup(React.createElement(MaterialReport,{project:{...project,materialSettings:{accessories:{ladder:{count:-1}}}}}));
assert.ok(invalid.includes('Výpočet doplnkov nie je dostupný'));
console.log('PASS: MaterialReport SSR with accessories, ladder, export controls and invalid config fallback');
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false});
new Function('require',result.outputFiles[0].text)(createRequire(import.meta.url));
