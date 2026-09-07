# StackInit

## What is StackInit?

StackInit is a CLI for creating an opinionated Next.js application and optionally
configuring Supabase PostgreSQL with Prisma. It records completed setup in a
validated project manifest and provides local project diagnostics.

## Features

- Interactive, non-destructive project configuration
- Official `create-next-app` scaffolding
- Optional Supabase + Prisma setup with safe environment placeholders
- `.stackinit.json` project manifest
- Local `info` and `doctor` commands
- Bun, npm, pnpm, and Yarn package-manager support

## Supported Stack

| Area | Supported options |
| --- | --- |
| Framework | Next.js |
| Database | Supabase, None |
| ORM | Prisma with Supabase, None without a database |
| Styling | Tailwind CSS, None |
| Package manager | Bun, npm, pnpm, Yarn 2+ for downloaded executables |

Supabase always uses Prisma in StackInit v0.1. Selecting no database also selects
no ORM.

## Installation

StackInit requires Node.js 22.12 or newer. After the package is published, it can
be run with either npm or Bun:

```bash
npx stackinit --help
bunx stackinit --help
```

To test a local checkout instead, install dependencies and run the source:

```bash
bun install
bun run src/index.ts --help
```

## Usage

```text
stackinit --help
stackinit --version
stackinit create <project-name>
stackinit info
stackinit doctor
```

## Create a Project

```bash
stackinit create my-app
```

StackInit validates the project name, refuses to overwrite a non-empty
destination, collects the supported stack options, and invokes the official
Next.js generator without shell-composed user input. A `.stackinit.json`
manifest is written only after every required setup stage succeeds.

## Supabase + Prisma

StackInit does **not** create or connect to a Supabase project. When Supabase is
selected, the generated project includes a PostgreSQL Prisma schema,
`prisma.config.ts`, a reusable Prisma Client module, and concise environment
placeholders.

Set these values in the generated `.env`:

- `DATABASE_URL`: the pooled connection used by the application at runtime.
- `DIRECT_URL`: the direct or session connection used by Prisma CLI operations
  such as migrations and introspection.

Do not commit real connection strings. The generated `.env` is ignored, while
`.env.example` remains safe to commit. Convenience scripts include
`db:generate`, `db:migrate`, and `db:studio`.

## `stackinit info`

Run `stackinit info` from the project root or a nested directory to display the
validated manifest using friendly names. The output never includes database
URLs or credentials.

## `stackinit doctor`

`stackinit doctor` performs local-only checks for the manifest, `package.json`,
installed dependencies, selected package manager, Next.js configuration, and—if
selected—Supabase environment variables and Prisma files/package versions. It
does not contact Supabase or execute SQL.

Warnings retain exit code `0`; one or more errors produce exit code `1`. Doctor
does not repair files automatically.

## Development

```bash
bun install
bun run typecheck
bun test
bun run build
```

The build targets Node.js and produces `dist/index.js` with a Node shebang. The
npm package includes the built CLI, README, license, and package metadata; tests,
source files, local environment files, and `node_modules` are excluded.

## Architecture

- `src/cli`: Commander commands and terminal presentation
- `src/core`: configuration, manifests, orchestration, registries, and contracts
- `src/adapters`: Next.js, Supabase, Prisma, package-manager, and doctor adapters
- `src/types`: shared project context types
- `src/utils`: small reusable utilities
- `tests`: Bun unit and filesystem integration tests

Commands use argument arrays through the command-runner abstraction rather than
building raw shell commands.

## Roadmap

The following are possible future additions and are **not implemented** in
v0.1: `stackinit add`, `stackinit remove`, upgrade workflows, doctor repair,
Supabase Auth/Storage, Redis, Docker, Better Auth, additional frameworks, and
third-party adapters.
