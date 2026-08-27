// Runs as the first step of playwright's webServer command: remove the
// E2E database (and WAL side files) BEFORE the server boots, so every
// run starts from a clean, freshly seeded store.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

for (const suffix of ['', '-shm', '-wal']) {
  fs.rmSync(path.join(__dirname, `greenmiles-e2e.db${suffix}`), { force: true });
}
console.log('E2E database reset');
