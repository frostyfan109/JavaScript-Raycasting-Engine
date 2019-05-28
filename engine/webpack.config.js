const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/exports.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'engine.js',
    globalObject: 'this',
    library: 'Raycaster'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [
          path.resolve(__dirname, 'src/external'),
          path.resolve(__dirname, 'node_modules')
        ],
        loader: 'eslint-loader'
      }
    ]
  },
  resolve: {
    modules: [
      'node_modules'
    ]
  }
};
