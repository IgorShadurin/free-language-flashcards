import prisma from "@quenti/prisma";

const QUIZLET_ID_REGEX = /quizlet\.com\/(\d+)/i;

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
};

type ImportOptions = {
  session?: boolean;
  publishedTimestamp?: number;
};

type TermPair = {
  word: string;
  definition: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const pickText = (value: unknown): string => {
  if (!value) return "";

  if (typeof value === "string") return value.trim();

  if (isRecord(value)) {
    const direct =
      normalizeText(value.plainText) ||
      normalizeText(value.text) ||
      normalizeText(value.content) ||
      normalizeText(value.value) ||
      normalizeText(value.term) ||
      normalizeText(value.word) ||
      normalizeText(value.definition);

    if (direct) return direct;

    const media = value.media;
    if (Array.isArray(media)) {
      for (const entry of media) {
        const text = pickText(entry);
        if (text) return text;
      }
    }

    const richText = value.richText;
    if (richText) {
      const text = pickText(richText);
      if (text) return text;
    }
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = pickText(entry);
      if (text) return text;
    }
  }

  return "";
};

const extractFromCardSides = (sides: unknown[]): TermPair | null => {
  const pickSide = (labels: string[]) =>
    sides.find((side) => {
      if (!isRecord(side)) return false;
      const label = normalizeText(side.label).toLowerCase();
      return label && labels.includes(label);
    });

  const wordSide =
    pickSide(["word", "term", "front"]) ??
    (sides.length ? sides[0] : null);
  const definitionSide =
    pickSide(["definition", "back"]) ?? (sides.length > 1 ? sides[1] : null);

  const word = pickText(wordSide);
  const definition = pickText(definitionSide);

  if (!word || !definition) return null;
  return { word, definition };
};

const toTermPair = (value: unknown): TermPair | null => {
  if (!isRecord(value)) return null;

  if (Array.isArray(value.cardSides)) {
    return extractFromCardSides(value.cardSides) || null;
  }

  const word =
    normalizeText(value.term) ||
    normalizeText(value.word) ||
    normalizeText(value.front) ||
    normalizeText(value.question) ||
    pickText(value.wordRichText) ||
    pickText(value.termText);

  const definition =
    normalizeText(value.definition) ||
    normalizeText(value.back) ||
    normalizeText(value.answer) ||
    pickText(value.definitionRichText) ||
    pickText(value.definitionText);

  if (!word || !definition) return null;
  return { word, definition };
};

const parseTermsFromArray = (value: unknown[]): TermPair[] => {
  const terms: TermPair[] = [];
  for (const entry of value) {
    const term = toTermPair(entry);
    if (term) terms.push(term);
  }
  return terms;
};

const extractTermsFromObject = (value: Record<string, unknown>): TermPair[] => {
  const candidates = [
    value.terms,
    value.studiableItems,
    value.studiableItemData,
    value.termIdToTerm,
    value.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const terms = parseTermsFromArray(candidate);
      if (terms.length) return terms;
    }

    if (isRecord(candidate)) {
      const terms = parseTermsFromArray(Object.values(candidate));
      if (terms.length) return terms;
    }
  }

  return [];
};

const findBestTermsAndTitle = (root: unknown) => {
  let bestTerms: TermPair[] = [];
  let bestTitle = "";
  const stack: unknown[] = [root];
  const seen = new Set<unknown>();

  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);

    if (Array.isArray(node)) {
      const terms = parseTermsFromArray(node);
      if (terms.length > bestTerms.length) {
        bestTerms = terms;
      }
      for (const entry of node) stack.push(entry);
      continue;
    }

    const record = node as Record<string, unknown>;
    const terms = extractTermsFromObject(record);
    if (terms.length > bestTerms.length) {
      bestTerms = terms;
      if (typeof record.title === "string") {
        bestTitle = record.title;
      } else if (isRecord(record.set) && typeof record.set.title === "string") {
        bestTitle = record.set.title;
      }
    }

    for (const value of Object.values(record)) stack.push(value);
  }

  return { terms: bestTerms, title: bestTitle };
};

const extractJsonScript = (html: string, id: string) => {
  const marker = `<script id="${id}" type="application/json">`;
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const jsonStart = start + marker.length;
  const end = html.indexOf("</script>", jsonStart);
  if (end === -1) return null;
  return html.slice(jsonStart, end).trim();
};

const extractSetPageData = (html: string) => {
  const marker = "Quizlet.setPageData";
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const braceStart = html.indexOf("{", start);
  if (braceStart === -1) return null;

  let depth = 0;
  for (let i = braceStart; i < html.length; i += 1) {
    const char = html[i];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return html.slice(braceStart, i + 1);
    }
  }

  return null;
};

const parseQuizletHtml = (html: string) => {
  const nextDataJson = extractJsonScript(html, "__NEXT_DATA__");
  if (nextDataJson) {
    try {
      const data = JSON.parse(nextDataJson);
      const result = findBestTermsAndTitle(data);
      if (result.terms.length) return result;
    } catch {
      // Ignore parse errors and fall through.
    }
  }

  const setPageJson = extractSetPageData(html);
  if (setPageJson) {
    try {
      const data = JSON.parse(setPageJson);
      const result = findBestTermsAndTitle(data);
      if (result.terms.length) return result;
    } catch {
      // Ignore parse errors and fall through.
    }
  }

  return { terms: [], title: "" };
};

const isChallengePage = (html: string, status: number) => {
  if (status === 403 || status === 503) return true;
  const lower = html.toLowerCase();
  return (
    lower.includes("cf-mitigated") ||
    lower.includes("just a moment") ||
    lower.includes("challenge-platform") ||
    lower.includes("captcha")
  );
};

const buildFetchUrl = (url: string) => {
  const proxy = process.env.QUIZLET_IMPORT_PROXY;
  if (!proxy) return url;
  if (proxy.includes("{url}")) return proxy.replace("{url}", url);
  return `${proxy}${url}`;
};

const buildHeaders = () => {
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };

  if (process.env.QUIZLET_COOKIE) {
    headers.Cookie = process.env.QUIZLET_COOKIE;
  } else if (process.env.QUIZLET_CF_CLEARANCE) {
    headers.Cookie = `cf_clearance=${process.env.QUIZLET_CF_CLEARANCE}`;
  }

  return headers;
};

const fetchQuizletHtml = async (url: string) => {
  const response = await fetch(buildFetchUrl(url), {
    headers: buildHeaders(),
    redirect: "follow",
  });

  const html = await response.text();

  if (isChallengePage(html, response.status)) {
    throw new Error(
      "Quizlet blocked the import request. Provide QUIZLET_COOKIE or QUIZLET_IMPORT_PROXY to access Quizlet pages.",
    );
  }

  if (!response.ok) {
    throw new Error(`Quizlet request failed with status ${response.status}.`);
  }

  return html;
};

const extractQuizletId = (url: string) => {
  const match = url.match(QUIZLET_ID_REGEX);
  return match?.[1] ?? null;
};

export const importFromUrl = async (
  url: string,
  userId: string,
  opts?: ImportOptions,
) => {
  const id = extractQuizletId(url);
  if (!id) {
    throw new Error("Invalid Quizlet URL. Use a link like https://quizlet.com/123456789.");
  }

  const html = await fetchQuizletHtml(`https://quizlet.com/${id}`);
  const { terms, title } = parseQuizletHtml(html);

  if (!terms.length) {
    throw new Error(
      "Unable to parse this Quizlet set. Quizlet may have changed their page format.",
    );
  }

  const createdAt = opts?.publishedTimestamp
    ? new Date(opts.publishedTimestamp)
    : new Date();

  const created = await prisma.studySet.create({
    data: {
      userId,
      created: true,
      createdAt,
      title: title || "Imported set",
      description: "",
      visibility: "Private",
      tags: [],
      wordLanguage: "en",
      definitionLanguage: "en",
      cortexStale: true,
      terms: {
        createMany: {
          data: terms.map((term, index) => ({
            word: term.word.slice(0, 1000),
            definition: term.definition.slice(0, 1000),
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

export default importFromUrl;
