import { importFromUrl } from "./integrations/quizlet";

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

export function importIntegration(path: "quizlet"): QuizletIntegration;
export function importIntegration(path: string): QuizletIntegration {
  switch (path) {
    case "quizlet":
      return { importFromUrl } as QuizletIntegration;
    default:
      throw new Error(`Unknown integration: ${path}`);
  }
}
