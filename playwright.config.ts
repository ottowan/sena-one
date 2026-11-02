import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/ui',
    testMatch: '**/*.spec.ts',
    timeout: 45000,
    use: { baseURL: 'http://127.0.0.1:4179', channel: 'chrome', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
    projects: [
        { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
        { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    ],
    webServer: { command: 'npx vite --config tests/ui/vite.config.ts', url: 'http://127.0.0.1:4179', reuseExistingServer: false },
});
