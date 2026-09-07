import type { DoctorCheck, DoctorContext, DoctorResult } from "../core/doctor.ts";
import { failure, success } from "../core/doctor.ts";

export const packageManagerDoctor: DoctorCheck = {
  id: "package-manager",
  async run(context: DoctorContext): Promise<readonly DoctorResult[]> {
    const available = await context.packageManager.isAvailable();
    return [
      available
        ? success(
            "environment.package-manager",
            "Environment",
            `${context.packageManager.name} available`,
          )
        : failure(
            "environment.package-manager",
            "Environment",
            `${context.packageManager.name} is not installed`,
            `Install ${context.packageManager.id} or update .stackinit.json to the package manager you use.`,
          ),
    ];
  },
};
