import * as quizletIntegration from "../../integrations/quizlet";
import * as quizletInngestIntegration from "../../integrations/quizlet/inngest";

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

export function importIntegration(path: "quizlet"): QuizletIntegration;
export function importIntegration(
  path: "quizlet/inngest",
): QuizletInngestIntegration;
export function importIntegration(
  path: string,
): QuizletIntegration | QuizletInngestIntegration {
  switch (path) {
    case "quizlet":
      return quizletIntegration as QuizletIntegration;
    case "quizlet/inngest":
      return quizletInngestIntegration as QuizletInngestIntegration;
    default:
      throw new Error(`Unknown integration: ${path}`);
  }
}
