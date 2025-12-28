export const importIntegration = async (path: string) => {
  switch (path) {
    case "quizlet/inngest":
      return await import("../../integrations/quizlet/inngest");
    default:
      throw new Error(`Unknown integration: ${path}`);
  }
};
