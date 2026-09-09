# StackInit

StackInit is a modular CLI for scaffolding and validating modern application
stacks. It ships with Next.js, React + Vite, and Vue + Vite project generation,
plus optional Supabase + Prisma integration for the server-capable Next.js stack.

> StackInit v0.1 is not yet published to npm. The registry commands below show
> the intended usage after publication; use the local-development instructions
> when working from this repository.

## Why StackInit?

StackInit turns a small set of project choices into a reproducible scaffold. It
uses official generators, keeps technology-specific setup in built-in
integrations, records completed work in a manifest, and diagnoses the resulting
project locally. StackInit itself has no database requirement.

## Quick Start

After publication, the same npm package can be launched by different package
runners:

```bash
npx stackinit create my-app
bunx stackinit create my-app
```

For a local checkout:

```bash
bun install
bun run src/index.ts create my-app
```

## What StackInit Does

- Collects and validates project configuration interactively.
- Uses the official `create-next-app` and `create-vite` generators with
  non-interactive arguments.
- Optionally configures the built-in Supabase + Prisma integration.
- Writes `.stackinit.json` only after every required setup stage succeeds.
- Provides read-only `info` and local-only `doctor` commands.
- Refuses unsafe project names and non-empty destinations.

## Built-in Integrations

StackInit v0.1 supports exactly:

```text
Framework
├── Next.js
├── React + Vite
└── Vue + Vite

Styling
├── Tailwind CSS
└── None

Database
├── Supabase
└── None

ORM
├── Prisma
└── None
```

Selecting Supabase automatically selects Prisma in v0.1. This is an
opinionated compatibility relationship between two built-in integrations, not
a database dependency of the StackInit CLI.

React + Vite and Vue + Vite are client-side scaffolds, so their database choice
is intentionally limited to None. StackInit never generates a browser project
that imports Prisma. Tailwind CSS uses its current Vite plugin integration for
both Vite frameworks.

## Commands

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

Choose Next.js, styling, database, and the package manager for the **generated
project**. StackInit then invokes the official generator using argument arrays,
never a shell-composed project name. It does not overwrite a non-empty
destination.

## Supabase + Prisma Integration

When Supabase is selected, the generated application receives a PostgreSQL
Prisma schema, `prisma.config.ts`, a reusable runtime Prisma Client,
`.env.example`, safe `.env` ignore rules, and database convenience scripts.

Add credentials to the generated `.env` yourself:

- `DATABASE_URL` is the pooled application/runtime connection.
- `DIRECT_URL` is the direct or session connection for Prisma CLI migrations
  and introspection.

StackInit does not create Supabase accounts or cloud projects, store database
credentials, connect to production databases, or run remote migrations.

## Project Manifest

After successful generation, `.stackinit.json` records the framework, styling,
database, ORM, and selected project package manager. Its versioned Zod schema
rejects unsupported combinations. The manifest never contains credentials.

## `stackinit info`

Run `stackinit info` from a managed project root or nested directory to display
the validated stack using friendly labels. It never displays environment URLs
or secrets.

## `stackinit doctor`

`stackinit doctor` aggregates core project checks with checks owned by the
selected Next.js, Supabase, and Prisma integrations. It inspects local files,
dependencies, package versions, environment structure, and package-manager
availability without contacting Supabase or executing SQL.

Warnings preserve exit code `0`; any error produces exit code `1`. Doctor is
read-only and does not repair the project.

## Package Manager Support

The command used to **run StackInit** (`npx`, `bunx`, or `pnpm dlx`) is separate
from the package manager selected for the generated project. Generated projects
can use Bun, npm, pnpm, or modern Yarn. That selection controls generator,
dependency, script, and diagnostic commands recorded for the project.

## Development

Development uses Bun, while the published executable targets Node.js 22.12 or
newer:

```bash
bun install
bun run typecheck
bun test
bun run build
node dist/index.js --help
```

`dist/index.js` is a self-contained Node-targeted executable with a Node
shebang. The npm package contains the built CLI and package documentation, not
source tests, environment files, `node_modules`, or generated test projects.

## Architecture

- **CLI** collects intent and presents progress, results, and actionable errors.
- **Core** owns contracts, validation, orchestration, manifests, and doctor
  result aggregation without installing integration-specific dependencies.
- **Built-in integrations** own Next.js generation, Supabase metadata and
  environment checks, Prisma setup/checks, and the v0.1 compatibility registry.
- **Infrastructure/adapters** implement command execution and concrete package
  manager behavior behind mockable core contracts.
- **Manifest** records only the stack that completed successfully.
- **Doctor** combines core checks with registered integration checks.

This separation allows future technologies to be added through internal
registries and adapters rather than embedding their setup in CLI handlers.
There is no external plugin loader in v0.1.

## Current Limitations

- Nuxt, SvelteKit, and other frameworks are not yet implemented.
- Supabase is the only database integration and is paired with Prisma.
- Supabase provisioning, credentials, and remote operations remain manual.
- Yarn support targets modern Yarn's downloaded-executable workflow.
- StackInit has not yet been published to npm.

## Roadmap

Possible future work—not implemented in v0.1—includes additional frameworks and
databases, Drizzle, `stackinit add`/`remove`/`upgrade`, doctor repair, Supabase
Auth and Storage, Redis, Docker, Better Auth, and third-party adapters.
