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

type QuizletInngestIntegration = {
  importProfile: (
    userId: string,
    username: string,
    step: unknown,
  ) => Promise<void>;
};

export async function importIntegration(
  path: "quizlet",
): Promise<QuizletIntegration>;
export async function importIntegration(
  path: "quizlet/inngest",
): Promise<QuizletInngestIntegration>;
export async function importIntegration(
  path: string,
): Promise<QuizletIntegration | QuizletInngestIntegration> {
  switch (path) {
    case "quizlet":
      return await import("../../integrations/quizlet");
    case "quizlet/inngest":
      return await import("../../integrations/quizlet/inngest");
    default:
      throw new Error(`Unknown integration: ${path}`);
  }
}
