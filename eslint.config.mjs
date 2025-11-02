import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
  // Ignore files
  {
    ignores: [
      "node_modules/**",
      ".next/**", 
      "build/**",
      "dist/**",
      "out/**",
      ".turbo/**",
      "*.min.js",
      "public/**",
      "**/*.d.ts",
      ".env*",
      "coverage/**"
    ]
  },
  
  // JavaScript/TypeScript configuration
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      react: pluginReact
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      // Essential React rules for Next.js
      "react/react-in-jsx-scope": "off", // Not needed with React 17+
      "react/jsx-uses-react": "off",     // Not needed with React 17+
      "react/prop-types": "off",         // Using TypeScript instead
      "react/display-name": "off",       // Not essential
      "react/no-unescaped-entities": "off", // Allow quotes, apostrophes, etc.
      
      // Turn off strict rules to avoid errors
      "no-unused-vars": "off",
      "no-undef": "off", 
      "prefer-const": "off",
      "no-console": "off",
      "no-unused-expressions": "off",
    }
  },
  
  // TypeScript specific rules
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
    rules: {
      ...config.rules,
      "@typescript-eslint/no-unused-vars": "off", // Too many false positives
      "@typescript-eslint/no-explicit-any": "off", // Allow any for flexibility
      "@typescript-eslint/ban-ts-comment": "off",   // Allow ts-ignore comments
      "@typescript-eslint/no-empty-object-type": "off", // Allow empty interfaces
      "@typescript-eslint/no-unused-expressions": "off",
    }
  }))
];
