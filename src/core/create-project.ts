import { assertDestinationAvailable } from "./destination.ts";
import type { FrameworkAdapter } from "./framework-adapter.ts";
import type { ProjectContext } from "../types/project-context.ts";

export async function createProject(
  context: ProjectContext,
  adapter: FrameworkAdapter,
): Promise<void> {
  if (adapter.id !== context.framework) {
    throw new Error(
      `Framework adapter "${adapter.id}" cannot create "${context.framework}" projects.`,
    );
  }

  await assertDestinationAvailable(context.rootDirectory);
  await adapter.create(context);
}
