module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
    sourceType: "module",
    ecmaVersion: 2021,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:import/recommended"
  ],
  plugins: ["@typescript-eslint"],
  ignorePatterns: ["*.cjs", "**/*.spec.ts"],
  rules: {
    "import/no-unresolved": "off",
    "import/named": "off",
    "no-async-promise-executor": "off",
    "import/order": [
      1, {
        "groups": [
          "external",
          "builtin",
          "internal",
          "sibling",
          "parent",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          order: "asc"
        }
      },
    ],
  },
  env: {
    browser: true,
    es2017: true,
    node: true,
  },
}
