/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { sharedRoot, sharedTsLoader } = require('./shared.webpack.config');

module.exports = {
  entry: './ts/mains/main_renderer.tsx',
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
      {
        test: /\.node$/,
        loader: 'node-loader',
        options: {
          name: '[path][name].[ext]',
        },
      },
    ],
  },

  resolve: {
    symlinks: true,

    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      crypto: false,
      path: false,
      fs: false,
      stream: false,
    },
    mainFields: ['module', 'main'],
    aliasFields: [],
  },

  output: {
    filename: 'main.bundled.js',
    path: path.resolve(__dirname, 'ts', 'mains', 'main_renderer.built'),
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  target: 'electron-renderer',
  ...sharedRoot,
};
