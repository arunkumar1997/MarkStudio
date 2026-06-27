// Minimal in-host test harness (T-113b, ADR-0013).
//
// The Extension Host lifecycle suite runs inside a real VS Code instance booted
// by `@vscode/test-electron`. `@vscode/test-electron` requires the bundled
// in-host module (`exthost-suite.cjs`) to export a `run(): Promise<void>` that
// resolves when the tests pass and rejects when any fail.
//
// Rather than pull Mocha + glob into the project (ADR-0005 minimalism), this is
// a deliberately tiny registry + sequential runner over `node:assert`. It
// mirrors the spirit of the `node:test` unit/integration layers without the
// file-discovery machinery a framework would add: the in-host entry simply
// imports each `*.test.ts` file, whose top-level `test(...)` calls register here.

type TestFn = () => void | Promise<void>;

interface TestCase {
    readonly name: string;
    readonly fn: TestFn;
}

const registry: TestCase[] = [];

// Register a single Extension Host test. Called at module load time from the
// imported suite files.
export function test(name: string, fn: TestFn): void {
    registry.push({ name, fn });
}

// Run every registered test sequentially. Resolves only if all pass; rejects
// with a summarising error otherwise, so `@vscode/test-electron` reports a
// non-zero exit to the launcher.
export async function runAll(): Promise<void> {
    let passed = 0;
    const failures: { readonly name: string; readonly error: unknown }[] = [];

    console.log(`\n[markstudio] Extension Host lifecycle — ${registry.length} test(s)\n`);

    for (const { name, fn } of registry) {
        try {
            await fn();
            passed++;
            console.log(`  ok   ${name}`);
        } catch (error) {
            failures.push({ name, error });
            console.error(`  FAIL ${name}`);
        }
    }

    console.log(`\n[markstudio] ${passed} passed, ${failures.length} failed\n`);

    if (failures.length > 0) {
        for (const { name, error } of failures) {
            console.error(`--- ${name} ---`);
            console.error(error);
        }
        throw new Error(`${failures.length} Extension Host test(s) failed`);
    }
}
