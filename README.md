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
before using database functionality. Generated projects also include
`db:generate`, `db:migrate`, and `db:studio` scripts without replacing scripts
that already exist.

Successful project creation writes a validated `.stackinit.json` manifest. Run
`stackinit info` anywhere in the project tree to display the recorded stack
without exposing environment variables or credentials.

Run `stackinit doctor` for local checks of the manifest, Next.js, the selected
package manager, and—when configured—Supabase environment variables and Prisma
files. Warnings keep exit code `0`; one or more errors produce exit code `1`.
