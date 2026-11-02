// Isolated UI test server. Production vite.config.ts never imports these mocks.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
    plugins: [react()],
    resolve: { alias: [
        { find: /^.*\/contexts\/AuthContext(?:\.tsx)?$/, replacement: resolve('tests/ui/auth.tsx') },
        { find: /^.*\/lib\/firebase(?:\.ts)?$/, replacement: resolve('tests/ui/firebase.ts') },
        { find: /^(?:\.{1,2}\/)+(?:lib\/)?firebase(?:\.ts)?$/, replacement: resolve('tests/ui/firebase.ts') },
        { find: 'firebase/firestore', replacement: resolve('tests/ui/firestore.ts') },
    ] },
    server: { host: '127.0.0.1', port: 4179, strictPort: true },
});
