module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: 'airbnb-base',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    Phaser: false
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    "prefer-const": 0,
    "no-continue": 0,
    "no-param-reassign": [2, {"props": false}],
    "no-console": 0,
    "no-underscore-dangle": 0,
    "max-len": [1, 200, 4],
    "semi": ["error", "always"],
    "no-plusplus": "off",
    "no-unused-vars": ["error", {"vars": "all", "args": "after-used"}]
  },
};
