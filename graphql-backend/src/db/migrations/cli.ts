#!/usr/bin/env node
/**
 * Cosmos DB Migration CLI
 *
 * Usage:
 *   npx ts-node src/db/migrations/cli.ts status --env=dev
 *   npx ts-node src/db/migrations/cli.ts migrate --env=prd
 *   npx ts-node src/db/migrations/cli.ts migrate --env=dev --dry-run
 *
 * Or via npm scripts:
 *   npm run db:migrate:status -- --env=dev
 *   npm run db:migrate -- --env=prd
 */

import { MigrationRunner } from "./runner";
import { migrations } from "./migrations";

type Command = "status" | "migrate" | "help";

interface CliArgs {
    command: Command;
    environment: string;
    dryRun: boolean;
    verbose: boolean;
}

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);

    const result: CliArgs = {
        command: "help",
        environment: "",
        dryRun: false,
        verbose: true,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === "status" || arg === "migrate" || arg === "help") {
            result.command = arg;
        } else if (arg.startsWith("--env=")) {
            result.environment = arg.replace("--env=", "");
        } else if (arg === "--env" && args[i + 1]) {
            result.environment = args[++i];
        } else if (arg === "--dry-run") {
            result.dryRun = true;
        } else if (arg === "--quiet") {
            result.verbose = false;
        }
    }

    return result;
}

function printHelp(): void {
    console.log(`
Cosmos DB Migration CLI

Commands:
  status    Show migration status (applied vs pending)
  migrate   Run pending migrations
  help      Show this help message

Options:
  --env=<environment>   Target environment: dev or prd (REQUIRED)
  --dry-run             Preview changes without applying them
  --quiet               Suppress verbose output

Examples:
  npm run db:migrate:status -- --env=dev
  npm run db:migrate -- --env=prd
  npm run db:migrate -- --env=dev --dry-run

Available Migrations:
${migrations.map((m) => `  - ${m.id}: ${m.description}`).join("\n")}
`);
}

async function runStatus(runner: MigrationRunner): Promise<void> {
    await runner.initialize();
    const status = await runner.getStatus(migrations);

    console.log("\n=== Migration Status ===\n");

    if (status.applied.length > 0) {
        console.log("Applied migrations:");
        status.applied.forEach((id) => console.log(`  ✓ ${id}`));
    } else {
        console.log("No migrations have been applied yet.");
    }

    console.log("");

    if (status.pending.length > 0) {
        console.log("Pending migrations:");
        status.pending.forEach((id) => console.log(`  ○ ${id}`));
    } else {
        console.log("All migrations have been applied!");
    }

    console.log("");
}

async function runMigrate(runner: MigrationRunner, dryRun: boolean): Promise<void> {
    await runner.initialize();

    if (dryRun) {
        console.log("\n=== DRY RUN MODE ===");
        console.log("No changes will be applied.\n");
    }

    const results = await runner.runMigrations(migrations);

    console.log("\n=== Migration Results ===\n");

    if (results.length === 0) {
        console.log("No migrations were run.");
        return;
    }

    let hasFailure = false;
    for (const result of results) {
        const status = result.success ? "✓" : "✗";
        const duration = `${result.durationMs}ms`;
        console.log(`  ${status} ${result.migrationId} (${duration})`);
        if (result.error) {
            console.log(`      Error: ${result.error}`);
            hasFailure = true;
        }
    }

    console.log("");

    if (hasFailure) {
        process.exit(1);
    }
}

async function checkAzureContext(targetEnv: string): Promise<void> {
    const { execSync } = require("child_process");

    try {
        const result = execSync("az account show --query \"{name:name, id:id}\" -o json", {
            encoding: "utf-8",
        });
        const account = JSON.parse(result);

        console.log(`\nAzure subscription: ${account.name}`);

        // Validate we're on the right subscription
        const expectedSubstring = targetEnv === "prd" ? "prod" : "nonprod";
        const isCorrect = account.name.toLowerCase().includes(expectedSubstring);

        if (!isCorrect) {
            console.warn(`\n⚠️  WARNING: You are targeting ${targetEnv.toUpperCase()} but your Azure context is "${account.name}"`);
            console.warn(`   For ${targetEnv}, you should be on spirigroup-${expectedSubstring}`);
            console.warn(`   Switch with: az account set --subscription spirigroup-${expectedSubstring}\n`);

            // Give user a chance to abort
            const readline = require("readline");
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            await new Promise<void>((resolve, reject) => {
                rl.question("Continue anyway? (y/N): ", (answer: string) => {
                    rl.close();
                    if (answer.toLowerCase() !== "y") {
                        reject(new Error("Aborted by user"));
                    }
                    resolve();
                });
            });
        } else {
            console.log(`✓ Azure context matches target environment`);
        }
    } catch (error: any) {
        if (error.message === "Aborted by user") {
            throw error;
        }
        console.warn("\n⚠️  Could not verify Azure context. Make sure you're logged in with: az login");
    }
}

async function main(): Promise<void> {
    const args = parseArgs();

    if (args.command === "help") {
        printHelp();
        return;
    }

    // Validate environment
    if (!args.environment) {
        console.error("Error: --env is required. Use --env=dev or --env=prd");
        process.exit(1);
    }

    if (!["dev", "prd"].includes(args.environment)) {
        console.error(`Error: Invalid environment "${args.environment}". Use dev or prd.`);
        process.exit(1);
    }

    console.log(`\nTarget environment: ${args.environment.toUpperCase()}`);
    if (args.dryRun) {
        console.log("Mode: DRY RUN (no changes will be applied)");
    }

    // Check Azure context before running
    await checkAzureContext(args.environment);

    const runner = new MigrationRunner({
        environment: args.environment,
        dryRun: args.dryRun,
        verbose: args.verbose,
    });

    try {
        switch (args.command) {
            case "status":
                await runStatus(runner);
                break;
            case "migrate":
                await runMigrate(runner, args.dryRun);
                break;
        }
    } catch (error: any) {
        console.error(`\nError: ${error.message}`);
        if (args.verbose && error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

main();
