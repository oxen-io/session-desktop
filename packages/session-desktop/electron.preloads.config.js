/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const sharedConfig = require('./shared.webpack.config');

module.exports = [
  {
    entry: './preload.js',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      symlinks: true,
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    output: {
      path: path.join(__dirname),
      filename: 'preload.bundled.js',
    },
    target: 'electron-preload',
    ...sharedConfig,
  },
];
