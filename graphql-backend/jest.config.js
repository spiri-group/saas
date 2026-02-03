"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    verbose: true,
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testPathIgnorePatterns: [
        "dist/*",
    ],
    coveragePathIgnorePatterns: [
        "dist/*"
    ],
    globalSetup: "./dist/graphql/db/setup.js",
    globalTeardown: "./dist/graphql/db/teardown.js",
};
exports.default = config;
//# sourceMappingURL=jest.config.js.map