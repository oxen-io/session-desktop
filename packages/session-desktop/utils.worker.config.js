/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { sharedRoot, sharedTsLoader } = require('./shared.webpack.config');

module.exports = {
  entry: './ts/webworker/workers/node/util/util.worker.ts',

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
    extensions: ['.ts', '.js'],
    fallback: {
      crypto: false,
      path: false,
      fs: false,
      stream: false,
    },
  },
  output: {
    filename: 'util.worker.compiled.js',
    path: path.resolve(__dirname, 'ts', 'webworker', 'workers', 'node', 'util'),
  },
  target: 'node',
  ...sharedRoot,
};
