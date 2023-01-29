import eslintImport from "eslint-plugin-import";
import eslintPrettier from "eslint-plugin-prettier";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
  "eslint:recommened",
  {
    plugins: {
      eslintImport,
      eslintPrettier,
    },
    rules: {
      "eslintImport/extensions": [
        "errors",
        {
          "js": "never",
          "ts": "never",
        },
      ],
      "eslintImport/prefer-default-export": "off",
    },
  },
  {
    ignores: ["**/*.test.ts"],
  },
  {
    files: ["**/*.ts", "**/*.js"],
    languageOptions: {
      ecmaVerions: 2016,
      sourceType: "module",
      parser: typescriptParser
    },
    plugins: {
      typescript: typescriptEslint,
    },
  }
]
