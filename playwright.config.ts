import { TestUtils } from "./ts/test/test-utils";

const config = {
  timeout: 300000,
  globalTimeout: 6000000,
  reporter: 'list',
  testDir: './ts/test/automation',
  outputDir: './ts/test/automation/test-results',
  use: {
    video:'retain-on-failure',
  },
};

module.exports = config;
