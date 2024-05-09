// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

module.exports = {
  entry: './ts/mains/main_renderer.tsx',
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
  mode: 'production',

  resolve: {
    symlinks: true,

    extensions: ['.ts', '.tsx', '.js'],
    fallback: {
      crypto: false,
      path: false,
      fs: false,
      stream: false,
    },
    // mainFields: ['module', 'browser', 'main'],
    mainFields: ['module', 'main'],
    aliasFields: [],
  },

  output: {
    filename: 'main_renderer.js',
    path: path.resolve(__dirname, 'ts', 'mains', 'main_renderer.built'),
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  target: 'electron-renderer',
  optimization: {
    minimize: false,
  },
  watch: true,
};
