import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');

const trackedFiles = [
  ['src/store/factoryStore.ts', 1150],
  ['src/components/layout/TopBar.tsx', 330],
  ['src/components/layout/ParameterPanel.tsx', 520],
  ['src/components/layout/ScenarioLibraryModal.tsx', 150],
  ['src/components/layout/BackgroundSimulationModal.tsx', 160],
  ['src/components/layout/parameterPanelParts.tsx', 150],
  ['src/components/ui/NumberStepper.tsx', 90],
  ['src/components/canvas/FactoryCanvas.tsx', 520],
  ['src/components/canvas/FlowEdge.tsx', 270],
  ['src/lib/simulation.ts', 705],
  ['src/lib/analysis.ts', 520],
];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (file) => read(file).split(/\r?\n/).length;

const results = [];

for (const [file, maxLines] of trackedFiles) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const lines = lineCount(file);
  results.push({
    ok: lines <= maxLines,
    message: `${file}: ${lines}/${maxLines} lines`,
  });
}

const packageJson = JSON.parse(read('package.json'));
const deps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
results.push({
  ok: !('three' in deps) && !('@types/three' in deps),
  message: '3D/Three dependency removed from package.json',
});

const srcFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(relative);
    else if (/\.(ts|tsx)$/.test(entry.name)) srcFiles.push(relative);
  }
};
walk('src');

const forbiddenImport = srcFiles.some((file) => /from ['"]three['"]|DigitalTwinView/.test(read(file)));
results.push({
  ok: !forbiddenImport,
  message: 'No active Three.js or DigitalTwinView imports in src',
});

const failed = results.filter((result) => !result.ok);
console.log('# Maintenance Check');
for (const result of results) {
  console.log(`${result.ok ? 'PASS' : strict ? 'FAIL' : 'WARN'} ${result.message}`);
}

if (strict && failed.length > 0) process.exitCode = 1;
