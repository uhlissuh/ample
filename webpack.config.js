const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
  entry: './src/client/app',
  output: {
    path: `${__dirname}/static`,
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          use: "css-loader"
        })
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin("bundle.css"),
  ]
};
