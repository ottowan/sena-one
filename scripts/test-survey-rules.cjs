const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve, delimiter } = require('node:path');
const env = { ...process.env };
delete env.DEBUG; // The Firebase CLI's debug logger otherwise dumps process env.
const java = 'C:/Program Files/Java/jdk-23/bin';
if (process.platform === 'win32' && existsSync(`${java}/java.exe`)) env.PATH = `${java}${delimiter}${env.PATH}`;
const result = spawnSync(process.execPath, [resolve('node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:exec', '--only', 'firestore', '--project', 'demo-sena-one', '--config', 'firebase.surveys-test.json', 'node --test tests/rules/equipment-surveys.test.cjs'], { env, stdio: 'inherit' });
process.exit(result.status ?? 1);
