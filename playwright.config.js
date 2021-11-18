const config = {
  timeout: 30000,
  globalTimeout: 600000,
  reporter: 'list',
  testDir: './ts/test/automation',
  outputDir: './ts/test/automation/test-results',
  use: {
    video:'retain-on-failure',
  },
};

module.exports = config;