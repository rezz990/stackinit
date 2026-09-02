# StackInit

A Bun-powered CLI for bootstrapping and managing application stacks.

To install dependencies:

```bash
bun install
```

Run the CLI from source:

```bash
bun run src/index.ts --help
bun run src/index.ts --version
```

## Development

```bash
bun run typecheck
bun test
bun run build
```

The npm package exposes the compiled executable as `stackinit`. The current
milestone provides the CLI foundation only; stack generators and integrations
are not implemented yet.
