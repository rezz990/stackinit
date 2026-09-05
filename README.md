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
bun run src/index.ts create my-app
```

## Development

```bash
bun run typecheck
bun test
bun run build
```

The npm package exposes the compiled executable as `stackinit`. After collecting
and confirming the project configuration, the `create` command runs the official
`create-next-app` generator with non-interactive options.

When Supabase is selected, StackInit configures Prisma 7 with PostgreSQL,
creates a reusable Prisma Client, and adds safe `DATABASE_URL` and `DIRECT_URL`
placeholders. Replace those placeholders in the generated project's `.env`
before using database functionality.
