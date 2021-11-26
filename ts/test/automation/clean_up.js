"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanUp = void 0;
const cleanUp = async (window) => {
    await window.click('[data-testid=settings-section]');
    await window.click('text=Clear All Data');
    await window.click('text=Device Only');
    await window.click('text=I am sure');
    await window.waitForTimeout(10000);
    console.log('data has been deleted');
};
exports.cleanUp = cleanUp;
//# sourceMappingURL=clean_up.js.map