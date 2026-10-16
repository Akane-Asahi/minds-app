const path = require("path");

module.exports = {
  devServer: {
    allowedHosts: "all",
  },
  webpack: {
    alias: {
      session: path.resolve(__dirname, "src/session"),
      lib: path.resolve(__dirname, "src/lib"),
      app: path.resolve(__dirname, "src/app"),
      components: path.resolve(__dirname, "src/components"),
    },
  },
  jest: {
    configure: {
      moduleNameMapper: {
        "^api/(.*)$": "<rootDir>/src/api/$1",
        "^session/(.*)$": "<rootDir>/src/session/$1",
        "^lib/(.*)$": "<rootDir>/src/lib/$1",
        "^app/(.*)$": "<rootDir>/src/app/$1",
        "^components/(.*)$": "<rootDir>/src/components/$1",
      },
    },
  },
};
