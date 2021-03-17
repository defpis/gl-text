const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const PROJECT_ROOT = __dirname;
const PROJECT_NAME = require(path.resolve(__dirname, 'package.json')).name;
const resolveRoot = (...paths) => path.resolve(PROJECT_ROOT, ...paths);
const PUBLIC_PATH = '/';
const MODE = ['development', 'production'].includes(process.env.NODE_ENV) ? process.env.NODE_ENV : 'none';
const __DEV__ = MODE === 'development';

module.exports = {
  devtool: 'source-map',
  mode: MODE,
  context: resolveRoot(),
  entry: resolveRoot('src/index.ts'),
  output: {
    path: resolveRoot('dist'),
    filename: 'js/[name].[contenthash:8].js',
    publicPath: PUBLIC_PATH,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': resolveRoot('src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(t|j)s$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.s?css$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.(glsl|vert|frag)$/,
        loader: 'shader-loader',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        loader: 'file-loader',
        options: {
          name: '[path][name].[ext]',
          esModule: false,
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: resolveRoot('public/index.html'),
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          context: resolveRoot('public'),
          from: '**/*',
          to: resolveRoot('dist'),
          toType: 'dir',
          filter: resourcePath => ![/public\/index.html/].some(exclude => exclude.test(resourcePath)),
          noErrorOnMissing: true,
        },
        {
          context: resolveRoot('src/assets'),
          from: '**/*',
          to: resolveRoot('dist/assets'),
          toType: 'dir',
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  devServer: {
    contentBase: resolveRoot('dist'),
    historyApiFallback: true,
    host: 'localhost',
    port: 8080,
    hot: true,
    open: true,
    stats: 'minimal',
  },
};
