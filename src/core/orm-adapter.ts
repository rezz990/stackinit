import type { ProjectContext } from "../types/project-context.ts";

export interface OrmAdapter {
  readonly id: "prisma";
  readonly name: string;
  install(context: ProjectContext): Promise<void>;
  configure(context: ProjectContext): Promise<void>;
  generate(context: ProjectContext): Promise<void>;
}
