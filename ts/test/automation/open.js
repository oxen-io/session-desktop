"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApp = void 0;
const test_1 = require("@playwright/test");
const openApp = async (multi) => {
    process.env.NODE_APP_INSTANCE = multi;
    process.env.NODE_ENV = 'test-integration';
    const electronApp = await test_1._electron.launch({ args: ['main.js'] });
    await electronApp.evaluate(async ({ app }) => {
        return app.getAppPath();
    });
    // Get the first window that the app opens, wait if necessary.
    const window = await electronApp.firstWindow();
    await window.reload();
    return window;
};
exports.openApp = openApp;
//# sourceMappingURL=open.js.map