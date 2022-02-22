/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  overrides: [
    {
      files: ['*.js', '*.cjs'],
      parserOptions: { sourceType: 'script' },
      env: { node: true, es2021: true },
      settings: { react: { version: 'latest' } },
      rules: {
        // Relax the recommended rules a little.
        'no-console': 'warn',
        'no-multi-assign': 'off',
        'no-return-assign': 'off',
        'no-restricted-syntax': 'off',
        'no-promise-executor-return': 'off',
        'no-await-in-loop': 'off',
        'no-void': 'off',
        'no-sparse-arrays': 'off',
        'no-nested-ternary': 'off',
        'no-continue': 'off',
      },
      extends: ['eslint:recommended', 'airbnb', 'plugin:prettier/recommended'],
    },
    ...['*.ts', '*.tsx'].map((pattern) => ({
      files: [pattern],
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname },
      settings: { react: { version: 'latest' } },
      rules: {
        // Relax the recommended rules a little.
        'no-console': 'warn',
        'no-multi-assign': 'off',
        'no-return-assign': 'off',
        'no-restricted-syntax': 'off',
        'no-promise-executor-return': 'off',
        'no-await-in-loop': 'off',
        'no-void': 'off',
        'no-sparse-arrays': 'off',
        'no-nested-ternary': 'off',
        'no-continue': 'off',

        // Rationalize import/export to improve diffs, among other things.
        'import/no-default-export': 'warn',
        'import/prefer-default-export': 'off',
        'import/extensions': ['warn', 'never', { json: 'always' }],
        'import/exports-last': 'warn',
        'import/order': 'off',
        'simple-import-sort/imports': 'warn',
        'simple-import-sort/exports': 'warn',

        // Pick the "better" way where TS is flexible.
        '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
        '@typescript-eslint/method-signature-style': 'warn',

        // Smell that code (or better yet, don't).
        '@typescript-eslint/no-floating-promises': 'warn',
      },
      plugins: ['simple-import-sort', 'only-warn'],
      extends: [
        'eslint:recommended',
        'airbnb',
        ...(pattern === '*.tsx' ? ['airbnb/hooks'] : []),
        'airbnb-typescript',
        'plugin:react/jsx-runtime',
        'plugin:jest/recommended',
        'plugin:testing-library/react',
        'plugin:prettier/recommended',
      ],
    })),
  ],
  ignorePatterns: ['node_modules', 'lib', 'out', 'dist'],
};
