import { z } from "zod";

import { MAX_TITLE } from "../../common/constants";

export const ZFromExportSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE),
  text: z.string().min(1),
});

export type TFromExportSchema = z.infer<typeof ZFromExportSchema>;
