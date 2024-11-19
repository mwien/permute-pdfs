import html from "@html-eslint/eslint-plugin";

export default [
  {
    ...html.configs["flat/recommended"],
    files: ["**/*.html"],
    rules: {
      ...html.configs["flat/recommended"].rules, // Must be defined. If not, all recommended rules will be lost
      "@html-eslint/indent": ["error", 2],
      "@html-eslint/require-closing-tags": ["error", { selfClosing: "always" }],
      "@html-eslint/no-extra-spacing-attrs": [
        "error",
        { enforceBeforeSelfClose: true },
      ],
      "@html-eslint/attrs-newline": "off",
      "@html-eslint/id-naming-convention": ["error", "kebab-case"],
      semi: "error",
      "prefer-const": "error",
    },
  },
];
