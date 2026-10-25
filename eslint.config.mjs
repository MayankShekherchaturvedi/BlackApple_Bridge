import electronEslintConfig from "@electron-toolkit/eslint-config";
import prettierConfig from "@electron-toolkit/eslint-config-prettier";

export default [
  {
    ignores: ["out/**", "dist/**", "node_modules/**", "resources/**"],
  },
  electronEslintConfig,
  prettierConfig,
  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
