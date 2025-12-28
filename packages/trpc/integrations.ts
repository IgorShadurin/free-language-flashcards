type QuizletIntegration = {
  importFromUrl: (
    url: string,
    userId: string,
    opts?: {
      session?: boolean;
      publishedTimestamp?: number;
    },
  ) => Promise<{ createdSetId: string; title: string; terms: number }>;
};

export async function importIntegration(
  path: "quizlet",
): Promise<QuizletIntegration>;
export async function importIntegration(
  path: string,
): Promise<QuizletIntegration> {
  switch (path) {
    case "quizlet":
      return await import("../integrations/quizlet");
    default:
      throw new Error(`Unknown integration: ${path}`);
  }
}
