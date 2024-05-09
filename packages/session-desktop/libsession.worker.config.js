/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const sharedConfig = require('./shared.webpack.config');

module.exports = {
  entry: './ts/webworker/workers/node/libsession/libsession.worker.ts',
  node: {
    __dirname: false,
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
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
    extensions: ['.ts', '.js'],
    fallback: {
      crypto: false,
      path: false,
      fs: false,
      stream: false,
    },
  },
  output: {
    filename: 'libsession.worker.compiled.js',
    path: path.resolve(__dirname, 'ts', 'webworker', 'workers', 'node', 'libsession'),
  },
  target: 'node',
  ...sharedConfig,
};
