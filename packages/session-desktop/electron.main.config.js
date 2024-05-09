/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require('webpack');

const sharedConfig = require('./shared.webpack.config');

module.exports = {
  entry: './ts/mains/main_node.ts',
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
    symlinks: true,
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  output: {
    filename: 'main.bundled.js',
    path: path.resolve('ts', 'mains', 'main_node.built'),
  },

  target: 'electron-main',

  // eslint-disable-line global-require
  plugins: [new webpack.DefinePlugin({ CONFIG: JSON.stringify(require('config')) })],
  ...sharedConfig,
};
