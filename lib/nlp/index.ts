import { parseWithRules } from "./ruleParser";
import { parseWithLlm } from "./llmParser";
import type { ParsedCommand } from "@/types";

const THRESHOLD = Number(process.env.NLP_CONFIDENCE_THRESHOLD ?? 0.75);

export async function parseCommand(transcript: string): Promise<ParsedCommand> {
  const ruleResult = parseWithRules(transcript);

  if (ruleResult.confidence >= THRESHOLD) return ruleResult;

  const llmResult = await parseWithLlm(transcript);

  return llmResult ?? ruleResult;
}

export { parseWithRules, parseWithLlm };