// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const webpack = require('webpack');

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
    mode: 'production',

    devtool: 'source-map',

    resolve: {
      symlinks: true,
      extensions: ['.ts', '.js'],
    },
    output: {
      path: path.join(__dirname),
      filename: 'preload.bundled.js',
    },
    target: 'electron-preload',
    optimization: {
      minimize: false,
    },
  },
];
