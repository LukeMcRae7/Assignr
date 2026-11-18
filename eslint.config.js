const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    ignores: [
      ".expo/**",
      "dist/**",
      "dist-all/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
]);
