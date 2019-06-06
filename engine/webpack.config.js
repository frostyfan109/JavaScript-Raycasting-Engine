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
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: {
            inline: true,
            name: '[name].js'
          }
        }
      },
      {
        test: /\.js$/,
        exclude: [
          path.resolve(__dirname, 'src/external'),
          /\/*\.worker\.js$/,
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
