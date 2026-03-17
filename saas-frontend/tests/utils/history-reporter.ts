import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

interface TestEntry {
  title: string;
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  duration: number;
  error?: string;
  lastRun: string;
}

/**
 * Stores the most recent result for each test spec file.
 * Keyed by relative file path, so asking "what passed recently?" is a quick file read.
 */
type TestHistory = Record<
  string,
  {
    lastRun: string;
    grepFilter?: string;
    tests: TestEntry[];
  }
>;

const HISTORY_FILE = path.join(
  __dirname,
  "..",
  "..",
  "test-results",
  "history.json"
);

class HistoryReporter implements Reporter {
  private results = new Map<
    string,
    { tests: TestEntry[]; grepFilter?: string }
  >();
  private grepFilter?: string;

  onBegin(config: FullConfig) {
    this.grepFilter = config.grep ? String(config.grep) : undefined;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const file = path.relative(
      path.join(__dirname, ".."),
      test.location.file
    );

    if (!this.results.has(file)) {
      this.results.set(file, { tests: [], grepFilter: this.grepFilter });
    }

    this.results.get(file)!.tests.push({
      title: test.titlePath().slice(1).join(" > "),
      status: result.status,
      duration: result.duration,
      lastRun: new Date().toISOString(),
      ...(result.status === "failed" && result.errors.length > 0
        ? { error: result.errors[0]?.message?.slice(0, 200) }
        : {}),
    });
  }

  onEnd(_result: FullResult) {
    // Load existing history and merge — only overwrite files that were run this time
    let history: TestHistory = {};
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
      }
    } catch {
      history = {};
    }

    const now = new Date().toISOString();

    for (const [file, data] of this.results) {
      history[file] = {
        lastRun: now,
        ...(data.grepFilter ? { grepFilter: data.grepFilter } : {}),
        tests: data.tests,
      };
    }

    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  }
}

export default HistoryReporter;
