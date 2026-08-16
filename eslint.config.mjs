import next from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
    ],
  },
  ...next,
  ...nextTypescript,
  {
    rules: {
      // Unused args are fine when they document a signature, as long as
      // they are underscore-prefixed.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    // React Three Fiber's JSX is a different element namespace; the
    // a11y and unknown-property rules don't apply to <mesh>, <group>, etc.
    files: ["src/components/three/**/*.tsx"],
    rules: {
      "react/no-unknown-property": "off",
    },
  },
];

export default config;
