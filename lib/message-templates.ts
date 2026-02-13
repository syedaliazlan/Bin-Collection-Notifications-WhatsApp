import { BinType } from "@/lib/models/Schedule";
import { Tenant } from "@/lib/models/Tenant";

/** Bin type → display name (for "Tomorrow is X and Y collection day") */
export const binTypeNames: Record<BinType, string> = {
  general_waste: "General Waste",
  paper_card: "Paper/Card",
  glass_cans_plastics: "Glass/Cans/Plastics",
};

/** Bin type → bin colour (e.g. "put the red and yellow bins out") */
export const binTypeColours: Record<BinType, string> = {
  general_waste: "grey",
  paper_card: "red",
  glass_cans_plastics: "yellow",
};

/**
 * Format a list of colours for the message: "the red bin" | "the red and yellow bins" | "the red, yellow and black bins"
 */
function formatColourList(binTypes: BinType[]): string {
  const colours = binTypes.map((t) => binTypeColours[t]);
  if (colours.length === 0) return "the bins";
  if (colours.length === 1) return `the ${colours[0]} bin`;
  if (colours.length === 2) return `the ${colours[0]} and ${colours[1]} bins`;
  return `the ${colours.slice(0, -1).join(", ")} and ${colours[colours.length - 1]} bins`;
}

/**
 * Format bin type names for "Tomorrow is X and Y collection day"
 */
function formatBinNamesForDay(binTypes: BinType[]): string {
  return binTypes.map((t) => binTypeNames[t]).join(" and ");
}

/**
 * Build the WhatsApp message for put-out or bring-in, in the style:
 * Put out: "Hello [Name]! It's your turn to take out the bins. Tomorrow is Paper/card and Glass/cans/plastics collection day. Please put the red and yellow bins out tonight. Thanks!"
 * Bring in: "Hey [Name], hope your day is going well! Just a friendly reminder to please bring in the red and yellow bins tonight. Thank you!"
 */
export function createNotificationMessage(
  binTypes: BinType[],
  type: "put-out" | "bring-in",
  responsibleTenant: Tenant | null,
  options?: { isTest?: boolean }
): string {
  const name = responsibleTenant?.name?.trim() || null;
  const colourPhrase = formatColourList(binTypes);
  const binNamesPhrase = formatBinNamesForDay(binTypes);
  const testSuffix = options?.isTest ? "\n\n(This was a test message.)" : "";

  if (type === "put-out") {
    const greeting = name ? `Hello ${name}!` : "Hello!";
    const turnLine = name ? "It's your turn to take out the bins. " : "";
    return `${greeting} ${turnLine}Tomorrow is ${binNamesPhrase} collection day. Please put ${colourPhrase} out tonight. Thanks!${testSuffix}`;
  }

  // bring-in
  const hey = name ? `Hey ${name},` : "Hey,";
  return `${hey} hope your day is going well! Just a friendly reminder to please bring in ${colourPhrase} tonight. Thank you!${testSuffix}`;
}
