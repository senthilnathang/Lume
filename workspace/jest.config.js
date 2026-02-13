# Workspace ESLint Configuration
# Modern JavaScript/TypeScript linting for the monorepo

# Root Configuration (/workspace/eslint.config.js)
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  extends: [
    "plugin:@vue/vue3-recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: [
      "./packages/*/src/**/*.ts",
      "./packages/shared/src/**/*.ts",
      "./packages/fastvue-backend/**/*.ts"
      "./apps/gawdesy-admin/src/**/*.ts",
      "./apps/gawdesy-website/src/**/*.vue"
    ]
  },
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/ban-ts-comment": "error",
    "@typescript-eslint/prefer-const": "error",
    "@typescript-eslint/quotes": "error",
    "@typescript-eslint/semi": "error",
    
    // Vue 3 specific rules
    "vue/multi-word-component-name": "error",
    "vue/prefer-import-from-vue": "error",
    "vue/no-unused-components": "error",
    "vue/no-multiple-template-root": "error",
    "vue/no-reserved-component-names": "error",
    "vue/component-definition-name-casing": ["error"],
    
    // General rules
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "no-alert": "error",
    "no-eval": "error",
    "no-var": ["error", { "allow": ["warn"] }],
    
    // Styling rules (Prettier integration)
    "prettier/prettier": [
      "error",
      {
        "singleQuote": true,
        "semi": true,
        "trailingComma": false,
        "tabWidth": 2,
        "useTabs": false,
        "printWidth": 120
      }
    ]
  }
}

# Shared Package Configuration (/packages/shared/eslint.config.js)
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  extends: [
    "@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  parser: "vue-eslint-parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: [
      "./src/**/*.ts"
    ]
  },
  rules: {
    // All the shared rules from root
  }
  }
}

# Jest Configuration (/workspace/jest.config.js)
module.exports = {
  testEnvironment: "node",
  collectCoverage: true,
  projects: [
    "<rootDir>/apps/shared/src",
    "<rootDir>/packages/fastvue-backend/src",
    "<rootDir>/apps/gawdesy-admin/src",
    "<rootDir>/apps/gawdesy-website/src"
  ],
  ],
  setupFilesAfterEnv: ["<rootDir>/apps/gawdesy-admin/.env.*"],
  testMatchIgnore: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/.turbo"
  ],
  moduleNameMapping: {
    "^@/(.*)/(.*)": "<rootDir>/packages/$1/src"
  },
  collectCoverageFrom: [
    "<rootDir>/apps/shared/src",
    "<rootDir>/packages/fastvue-backend/src"
  ],
  },
  testTimeout: 30000,
  transform: {
    "^.+\\.test\\.tsx?$": ["ts-jest"]
  }
  }
}