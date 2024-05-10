const sharedRootProd = {
  mode: 'production',
  cache: true,

  optimization: {
    minimize: true,
  },
};

const sharedRootDev = {
  mode: 'production', // keep this so we don't get a bunch of react errors
  devtool: 'source-map',
  cache: true,

  optimization: {
    minimize: false,
  },
};

const sharedTsLoader = {
    transpileOnly: true,
};

module.exports = { sharedRoot: sharedRootDev, sharedTsLoader };
