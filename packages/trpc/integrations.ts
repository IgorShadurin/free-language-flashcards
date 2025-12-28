export const importIntegration = async (path: string) => {
  switch (path) {
    case "quizlet":
      return await import("../integrations/quizlet");
    default:
      throw new Error(`Unknown integration: ${path}`);
  }
};
