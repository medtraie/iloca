
/**
 * Converts a float amount (e.g. 1200.00) into French words for Moroccan invoices.
 * Example: 1200.00 => "MILLE DEUX CENT DIRHAMS ET ZERO CENTIMES"
 * Handles values up to several millions, no decimal-truncation.
 */

const UNITS = [
  "", "UN", "DEUX", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF",
  "DIX", "ONZE", "DOUZE", "TREIZE", "QUATORZE", "QUINZE", "SEIZE"
];

const TENS = [
  "", "DIX", "VINGT", "TRENTE", "QUARANTE", "CINQUANTE", "SOIXANTE", "SOIXANTE", "QUATRE-VINGT", "QUATRE-VINGT"
];

// Converts number under 1000 to French words (in capitals)
function underThousandToWords(n: number): string {
  let words = "";
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds) {
    if (hundreds === 1) words += "CENT";
    else words += UNITS[hundreds] + " CENT";
    if (rest === 0 && hundreds > 1) words += "S";
  }

  if (rest) {
    if (words) words += " ";
    if (rest < 17) {
      words += UNITS[rest];
    } else if (rest < 20) {
      words += "DIX-" + UNITS[rest - 10];
    } else {
      const tens = Math.floor(rest / 10);
      const unit = rest % 10;
      if (tens === 7 || tens === 9) {
        words += TENS[tens] + "-" + UNITS[10 + unit];
      } else if (tens === 8 && unit === 0) {
        words += "QUATRE-VINGTS";
      } else {
        words += TENS[tens];
        if (unit === 1 && (tens === 1 || tens === 7 || tens === 9)) {
          words += "-ET-UN";
        } else if (unit) {
          words += "-" + UNITS[unit];
        }
      }
    }
  }

  return words.trim();
}

// Converts integer part to French words (up to millions)
function intToFrenchWords(n: number): string {
  if (n === 0) return "ZERO";
  let words = "";

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  if (millions) {
    if (millions === 1) words += "UN MILLION";
    else words += underThousandToWords(millions) + " MILLIONS";
  }
  if (thousands) {
    if (words) words += " ";
    if (thousands === 1) words += "MILLE";
    else words += underThousandToWords(thousands) + " MILLE";
  }
  if (rest) {
    if (words) words += " ";
    words += underThousandToWords(rest);
  }
  return words.trim();
}

/**
 * Converts a float amount (e.g. 1234.09) into French invoice wording.
 * Usage: numberToFrenchWords(1234.09) -> "MILLE DEUX CENT TRENTE-QUATRE DIRHAMS ET NEUF CENTIMES"
 */
export function numberToFrenchWords(amount: string | number): string {
  let val = typeof amount === "string" ? parseFloat(amount.replace(",", ".")) : amount;
  if (isNaN(val)) return "";

  const intAmount = Math.floor(val);
  // Always two decimals for cents (rounding in case of "1.599")
  const centimes = Math.round((val - intAmount) * 100);

  let dirhamsPart = intToFrenchWords(intAmount);
  if (!dirhamsPart) dirhamsPart = "ZERO";

  let centimesPart = centimes === 0
    ? "ZERO CENTIMES"
    : intToFrenchWords(centimes) + (centimes === 1 ? " CENTIME" : " CENTIMES");

  let result = `${dirhamsPart} DIRHAMS ET ${centimesPart}`;

  // Adjust grammar for 1 DIRHAM etc.
  if (intAmount === 1) result = result.replace("UN DIRHAMS", "UN DIRHAM");
  if (centimes === 1) result = result.replace("UN CENTIMES", "UN CENTIME");

  return result;
}

