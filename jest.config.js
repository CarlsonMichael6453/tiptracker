/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          strict: true,
          esModuleInterop: true,
          module: "commonjs",
          target: "ES2022",
          types: ["jest", "node"],
          skipLibCheck: true,
        },
      },
    ],
  },
};
