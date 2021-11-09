const { test, expect } = require('@playwright/test');

// test('basic test', async ({ page }) => {
//   await page.goto('https://playwright.dev/');
//   const title = page.locator('.navbar__inner .navbar__title');
//   await expect(title).toHaveText('Playwright');
// });

//Code execution

var start = async function() {
    const browser = await playwright["chromium"].launch({
      headless: false
    });
    //context
    const context = await browser.newContext();
    //page
    const page = await context.newPage();
    //navigate to the page
    await page.goto("http://executeautomation.com/demosite/Login.html");

    await page.screenshot({path: `ea-${Date.now}.png`})

    // await browser.close();
  }
