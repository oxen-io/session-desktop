// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './ts/mains/main_node.ts',
  mode: 'production',
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

  devtool: 'source-map',

  resolve: {
    symlinks: true,
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'main.bundled.js',
    path: path.resolve('ts', 'mains', 'main_node.built'),
  },

  target: 'electron-main',
  optimization: {
    minimize: false,
  },
  plugins: [new webpack.DefinePlugin({ CONFIG: JSON.stringify(require('config')) })],
  watch: true,
};
