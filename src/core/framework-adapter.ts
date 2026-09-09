import type { ProjectContext } from "../types/project-context.ts";

export interface FrameworkAdapter {
  readonly id: ProjectContext["framework"];
  readonly name: string;
  readonly capabilities: FrameworkCapabilities;
  create(context: ProjectContext): Promise<void>;
}

export interface FrameworkCapabilities {
  readonly client: boolean;
  readonly server: boolean;
  readonly typescript: boolean;
}
