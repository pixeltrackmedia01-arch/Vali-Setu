/**
 * Local, deterministic plain-language rewrite used in demo mode for text that
 * has no curated sample. It only shortens formal phrases and splits long
 * sentences; it never adds facts. Output is labelled as simulated.
 */
const REPLACEMENTS: [RegExp, string][] = [
  [/\bit is hereby (informed|notified) (to all|that)\s*/gi, ""],
  [/\bthis is to (inform|notify) (you|all parents) that\s*/gi, ""],
  [/\ball parents are (kindly )?requested to\b/gi, "Please"],
  [/\bparents are (kindly )?requested to\b/gi, "Please"],
  [/\byou are (kindly )?requested to\b/gi, "Please"],
  [/\bkindly\b/gi, "please"],
  [/\bwill be held on\b/gi, "is on"],
  [/\bwill be conducted on\b/gi, "is on"],
  [/\bwill commence\b/gi, "will start"],
  [/\bcommence\b/gi, "start"],
  [/\bprior to\b/gi, "before"],
  [/\bin order to\b/gi, "to"],
  [/\bfor any (queries|query|clarification)\b/gi, "If you have a question"],
  [/\bat the earliest\b/gi, "soon"],
  [/\bensure that\b/gi, "make sure"],
  [/\bsubsequently\b/gi, "then"],
  [/\bapproximately\b/gi, "about"],
  [/\bassist\b/gi, "help"],
  [/\bobtain\b/gi, "get"],
  [/\bfurnish\b/gi, "give"],
  [/\bpurchase\b/gi, "buy"],
  [/\bmandatory\b/gi, "required"],
  [/\bthe undersigned\b/gi, "the school"],
];

export function ruleBasedSimplify(text: string): string {
  let out = text.replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of REPLACEMENTS) out = out.replace(pattern, replacement);
  // One idea per line: split on sentence ends and on " and " joining two long clauses.
  const sentences = out
    .split(/(?<=[.!?।])\s+/)
    .flatMap((s) => (s.length > 120 ? s.split(/,\s+(?=and |but |so )/i) : [s]))
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .map((s) => (/[.!?।]$/.test(s) ? s : `${s}.`));
  return sentences.join(" ").replace(/\s+([.,])/g, "$1").replace(/\.\./g, ".");
}
