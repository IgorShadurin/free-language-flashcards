export async function importIntegration(
  path: "quizlet",
): Promise<typeof import("../integrations/quizlet")>;
export async function importIntegration(path: string) {
  switch (path) {
    case "quizlet":
      return await import("../integrations/quizlet");
    default:
      throw new Error(`Unknown integration: ${path}`);
  }
}
