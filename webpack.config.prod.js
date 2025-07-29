const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { buildManifest } = require('./scripts/build-manifest');

// Load environment variables
require('dotenv').config();

module.exports = {
  mode: 'production',
  entry: {
    popup: './src/popup/popup.js',
    background: './src/background/background.js',
    content: './src/content/content.js',
    options: './src/options/options.js'
  },
  output: {
    path: path.resolve(__dirname, 'build/dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'production'),
        GOOGLE_CLIENT_ID: JSON.stringify(process.env.GOOGLE_CLIENT_ID || ''),
        GOOGLE_CLIENT_SECRET: JSON.stringify(process.env.GOOGLE_CLIENT_SECRET || ''),
        NOTION_TOKEN: JSON.stringify(process.env.NOTION_TOKEN || ''),
        NOTION_DATABASE_ID: JSON.stringify(process.env.NOTION_DATABASE_ID || ''),
        DEBUG: JSON.stringify(process.env.DEBUG || 'false'),
        EXTENSION_ID: JSON.stringify(process.env.EXTENSION_ID || ''),
        GOOGLE_CALENDAR_API_KEY: JSON.stringify(process.env.GOOGLE_CALENDAR_API_KEY || ''),
        GOOGLE_DRIVE_API_KEY: JSON.stringify(process.env.GOOGLE_DRIVE_API_KEY || ''),
        GOOGLE_SHEETS_API_KEY: JSON.stringify(process.env.GOOGLE_SHEETS_API_KEY || '')
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/popup/popup.css', to: 'popup.css' },
        { from: 'src/options/options.html', to: 'options.html' },
        { from: 'src/options/options.css', to: 'options.css' },
        { from: 'src/content/content.css', to: 'content.css' },
        { from: 'src/assets', to: 'assets' }
      ]
    }),
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('BuildManifest', () => {
          buildManifest();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  optimization: {
    minimize: true
  }
};