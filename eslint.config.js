import antfu from "@antfu/eslint-config";

export default antfu(
  {
    type: "app",
    typescript: true,
    react: true,
    formatters: false,
    stylistic: false,
    ignores: [],
  },
  {
    rules: {
      "react-refresh/only-export-components": "off",
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase",
          ignore: ["README.md"],
        },
      ],
    },
  },
);
