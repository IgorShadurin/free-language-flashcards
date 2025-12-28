import { loadHandler } from "../../lib/load-handler";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { ZFromExportSchema } from "./from-export.schema";
import { ZFromUrlSchema } from "./from-url.schema";

type ImportRouterHandlerCache = {
  handlers: {
    ["from-export"]?: typeof import("./from-export.handler").fromExportHandler;
    ["from-url"]?: typeof import("./from-url.handler").fromUrlHandler;
  };
} & { routerPath: string };

const HANDLER_CACHE: ImportRouterHandlerCache = {
  handlers: {},
  routerPath: "import",
};

export const importRouter = createTRPCRouter({
  fromUrl: protectedProcedure
    .input(ZFromUrlSchema)
    .mutation(async ({ ctx, input }) => {
      await loadHandler(HANDLER_CACHE, "from-url");
      return HANDLER_CACHE.handlers["from-url"]!({ ctx, input });
    }),
  fromExport: protectedProcedure
    .input(ZFromExportSchema)
    .mutation(async ({ ctx, input }) => {
      await loadHandler(HANDLER_CACHE, "from-export");
      return HANDLER_CACHE.handlers["from-export"]!({ ctx, input });
    }),
});
