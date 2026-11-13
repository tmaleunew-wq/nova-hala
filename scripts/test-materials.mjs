import { build } from 'esbuild';

for (const filename of ['geometry', 'catalog', 'material-export', 'roof-load']) {
  const result = await build({
    entryPoints: [`src/lib/materials/${filename}.test.ts`],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
  });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
{
  const result = await build({ entryPoints: ['src/lib/materials/accessories.test.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
{
  const result = await build({ entryPoints: ['src/lib/garage/wall-drawings.test.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
await import('./test-material-project.mjs');
for (const filename of ['cladding-report', 'steel-report']) {
  const result = await build({ entryPoints: [`src/lib/materials/${filename}.test.ts`], bundle: true,
    platform: 'node', format: 'esm', write: false, banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(process.cwd() + '/package.json');" } });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
