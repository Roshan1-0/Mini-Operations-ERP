import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        // Disable file parallelism so test suites don't race on DB truncation
        fileParallelism: false,
        testTimeout: 20000,
        hookTimeout: 20000
    }
})
