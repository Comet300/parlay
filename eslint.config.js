import tseslint from '@typescript-eslint/eslint-plugin'

const reactHooksStubPlugin = {
  meta: {
    name: 'react-hooks-stub',
  },
  rules: {
    'exhaustive-deps': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Stub rule to support existing disable directives without installing eslint-plugin-react-hooks.',
        },
        schema: [],
      },
      create() {
        return {}
      },
    },
  },
}

export default [
  {
    ignores: [
      'dist/**',
      '.output/**',
      '.tanstack/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'src/routeTree.gen.ts',
    ],
  },
  ...tseslint.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooksStubPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        navigator: 'readonly',
        process: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
