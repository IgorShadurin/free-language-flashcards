import { TRPCError } from "@trpc/server";

import { MAX_TERM, MAX_TITLE } from "../../common/constants";
import { profanity } from "../../common/profanity";
import type { NonNullableUserContext } from "../../lib/types";
import type { TFromExportSchema } from "./from-export.schema";

const splitLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const tabIndex = trimmed.indexOf("\t");
  if (tabIndex !== -1) {
    const left = trimmed.slice(0, tabIndex).trim();
    const right = trimmed.slice(tabIndex + 1).trim();
    if (left && right) return { word: left, definition: right };
    return null;
  }

  const spaceMatch = trimmed.match(/\s{2,}/);
  if (spaceMatch?.index !== undefined) {
    const left = trimmed.slice(0, spaceMatch.index).trim();
    const right = trimmed
      .slice(spaceMatch.index + spaceMatch[0].length)
      .trim();
    if (left && right) return { word: left, definition: right };
  }

  const dashIndex = trimmed.indexOf(" - ");
  if (dashIndex !== -1) {
    const left = trimmed.slice(0, dashIndex).trim();
    const right = trimmed.slice(dashIndex + 3).trim();
    if (left && right) return { word: left, definition: right };
  }

  return null;
};

const parseExport = (text: string) => {
  const lines = text.split(/\r?\n/);
  const terms: { word: string; definition: string }[] = [];

  for (const line of lines) {
    const entry = splitLine(line);
    if (!entry) continue;
    terms.push({
      word: entry.word,
      definition: entry.definition,
    });
  }

  return terms;
};

type FromExportOptions = {
  ctx: NonNullableUserContext;
  input: TFromExportSchema;
};

export const fromExportHandler = async ({ ctx, input }: FromExportOptions) => {
  const title = profanity.censor(input.title.slice(0, MAX_TITLE)).trim();
  if (!title) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Title is required.",
    });
  }

  const terms = parseExport(input.text).map((term) => ({
    word: profanity.censor(term.word.slice(0, MAX_TERM)).trim(),
    definition: profanity.censor(term.definition.slice(0, MAX_TERM)).trim(),
  }));

  if (terms.length < 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Paste a Quizlet export with at least two terms (tab-separated).",
    });
  }

  const created = await ctx.prisma.studySet.create({
    data: {
      userId: ctx.session.user.id,
      created: true,
      createdAt: new Date(),
      title,
      description: "",
      visibility: "Private",
      tags: [],
      wordLanguage: "en",
      definitionLanguage: "en",
      cortexStale: true,
      terms: {
        createMany: {
          data: terms.map((term, index) => ({
            word: term.word,
            definition: term.definition,
            rank: index,
          })),
        },
      },
    },
    select: {
      id: true,
      title: true,
      terms: {
        select: {
          id: true,
        },
      },
    },
  });

  return {
    createdSetId: created.id,
    title: created.title,
    terms: created.terms.length,
  };
};

export default fromExportHandler;
