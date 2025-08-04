const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { buildManifest } = require('./scripts/build-manifest');

// Load environment variables
require('dotenv').config();

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    popup: './src/popup/popup.js',
    background: './src/background/background.js',
    content: './src/content/content.js',
    options: './src/options/options.js',
    pricing: './src/pricing/pricing.js',
    auth: './src/auth/auth.js',
    home: './src/home/home.js'
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
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
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
        { from: 'src/pricing/pricing.html', to: 'pricing.html' },
        { from: 'src/pricing/pricing.css', to: 'pricing.css' },
        { from: 'src/auth/auth.html', to: 'auth.html' },
        { from: 'src/auth/auth.css', to: 'auth.css' },
        { from: 'src/home/home.html', to: 'home.html' },
        { from: 'src/home/home.css', to: 'home.css' },
        { from: 'src/content/content.css', to: 'content.css' },
        { from: 'src/styles', to: 'src/styles', noErrorOnMissing: true },
        { from: 'src/locales', to: 'src/locales', noErrorOnMissing: true },
        { from: 'src/utils', to: 'src/utils', noErrorOnMissing: true },
        { from: 'src/assets', to: 'assets', noErrorOnMissing: true }
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
  }
};