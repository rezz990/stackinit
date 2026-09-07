import type { ProjectContext } from "../types/project-context.ts";

export interface FrameworkAdapter {
  readonly id: ProjectContext["framework"];
  readonly name: string;
  create(context: ProjectContext): Promise<void>;
}
