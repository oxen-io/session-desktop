// tslint:disable-next-line: no-implicit-dependencies
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  timeout: 350000,
  globalTimeout: 6000000,
  reporter: 'list',
  testDir: './ts/test/automation',
  testIgnore: '*.js',
  outputDir: './ts/test/automation/test-results',
  // use: {
  //   // screenshot: 'only-on-failure',
  //   video: 'on',
  //   trace: 'retain-on-failure',
  // },
  retries: 0,
  repeatEach: 1,
  workers: 1,
  reportSlowTests: null,
  // globalSetup: './ts/test/automation/before_all',
};

module.exports = config;
