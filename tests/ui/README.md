# UI regression checks

Run `npm run test:ui` with Google Chrome installed. The test runner starts an
isolated Vite server at `127.0.0.1:4179` and closes it when the tests finish.

The test Vite configuration replaces authentication and Firebase with local
in-memory fixtures. It is separate from the production Vite configuration and
never reads or writes the live database. Do not use the test server for deployment.

Checks cover all 12 admin pages, all 5 tenant pages, and login at desktop and
mobile widths in both light and dark mode. They also exercise meter editing,
paste import, saving, report tabs, Thai month selection, and mobile navigation.
Screenshots and failure traces are written to the ignored `test-results/` folder.

`npm test`, `npm run type-check`, and `npm run build` provide the other checks.
