const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    ignores: [
      ".expo/**",
      "dist/**",
      "dist-all/**",
      "dist-ios-check/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
]);
