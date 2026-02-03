import type {Config} from '@jest/types';

import dotenv from "dotenv"
dotenv.config()

// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testPathIgnorePatterns : [
    "dist/*",
  ],
  coveragePathIgnorePatterns: [
    "dist/*"
  ],
  globalSetup: "./dist/graphql/db/setup.js",
  globalTeardown: "./dist/graphql/db/teardown.js",
};
export default config;