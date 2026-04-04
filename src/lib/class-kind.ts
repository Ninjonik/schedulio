export type ClassKind = "lecture" | "lab" | "other";

const extractExplicitClassKind = (text: string): ClassKind | null => {
  const match = text.match(/class\s+kind\s*:\s*(lecture|lab|other)/i);
  if (!match) {
    return null;
  }

  return match[1].toLowerCase() as ClassKind;
};

const includesAny = (text: string, needles: string[]) =>
  needles.some((needle) => text.includes(needle));

export const inferClassKind = (title: string, descriptionMd?: string): ClassKind => {
  const text = `${title} ${descriptionMd ?? ""}`.toLowerCase();
  const explicitKind = extractExplicitClassKind(text);

  if (explicitKind) {
    return explicitKind;
  }

  if (text.includes("raw event type: reservation") || text.includes("event type: reservation")) {
    return "lab";
  }

  if (text.includes("raw event type: lecture") || text.includes("event type: lecture")) {
    return "lecture";
  }

  if (includesAny(text, [" cvi", " cvic", " semin", " lab", " tutorial", " praktikum"])) {
    return "lab";
  }

  if (includesAny(text, [" lecture", " predna", " prednaska"])) {
    return "lecture";
  }

  return "other";
};


