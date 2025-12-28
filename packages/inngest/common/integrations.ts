export async function importIntegration(
  path: "quizlet",
): Promise<typeof import("../../integrations/quizlet")>;
export async function importIntegration(
  path: "quizlet/inngest",
): Promise<typeof import("../../integrations/quizlet/inngest")>;
export async function importIntegration(path: string) {
  switch (path) {
    case "quizlet":
      return await import("../../integrations/quizlet");
    case "quizlet/inngest":
      return await import("../../integrations/quizlet/inngest");
    default:
      throw new Error(`Unknown integration: ${path}`);
  }
}
