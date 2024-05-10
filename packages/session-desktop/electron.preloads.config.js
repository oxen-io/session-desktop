/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { sharedRoot, sharedTsLoader } = require('./shared.webpack.config');

const sharedConfigForPreloads = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          ...sharedTsLoader,
        },
      },
    ],
  },
  resolve: {
    symlinks: true,
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  target: 'electron-preload',
  ...sharedRoot,
};

module.exports = [
  {
    entry: './preload.js',
    output: {
      path: path.join(__dirname),
      filename: 'preload.bundled.js',
    },
    ...sharedConfigForPreloads,
  },
  {
    entry: './about_preload.js',
    output: {
      path: path.join(__dirname),
      filename: 'about_preload.bundled.js',
    },
    ...sharedConfigForPreloads,
  },
  {
    entry: './debug_log_preload.js',
    output: {
      path: path.join(__dirname),
      filename: 'debug_log_preload.bundled.js',
    },
    ...sharedConfigForPreloads,
  },
  {
    entry: './password_preload.js',
    output: {
      path: path.join(__dirname),
      filename: 'password_preload.bundled.js',
    },
    ...sharedConfigForPreloads,
  },
];
