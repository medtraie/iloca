/// Converts a numeric amount into French words for Moroccan legal invoices.
/// Example: 1200.00 => "MILLE DEUX CENT DIRHAMS ET ZERO CENTIMES"
class NumberToFrenchWords {
  static const List<String> _units = [
    "",
    "UN",
    "DEUX",
    "TROIS",
    "QUATRE",
    "CINQ",
    "SIX",
    "SEPT",
    "HUIT",
    "NEUF",
    "DIX",
    "ONZE",
    "DOUZE",
    "TREIZE",
    "QUATORZE",
    "QUINZE",
    "SEIZE"
  ];

  static const List<String> _tens = [
    "",
    "DIX",
    "VINGT",
    "TRENTE",
    "QUARANTE",
    "CINQUANTE",
    "SOIXANTE",
    "SOIXANTE",
    "QUATRE-VINGT",
    "QUATRE-VINGT"
  ];

  static String _underThousandToWords(int n) {
    String words = "";
    final hundreds = n ~/ 100;
    final rest = n % 100;

    if (hundreds > 0) {
      if (hundreds == 1) {
        words += "CENT";
      } else {
        words += "${_units[hundreds]} CENT";
      }
      if (rest == 0 && hundreds > 1) words += "S";
    }

    if (rest > 0) {
      if (words.isNotEmpty) words += " ";
      if (rest < 17) {
        words += _units[rest];
      } else if (rest < 20) {
        words += "DIX-${_units[rest - 10]}";
      } else {
        final tens = rest ~/ 10;
        final unit = rest % 10;
        if (tens == 7 || tens == 9) {
          words += "${_tens[tens]}-${_units[10 + unit]}";
        } else if (tens == 8 && unit == 0) {
          words += "QUATRE-VINGTS";
        } else {
          words += _tens[tens];
          if (unit == 1 && (tens == 1 || tens == 7 || tens == 9)) {
            words += "-ET-UN";
          } else if (unit > 0) {
            words += "-${_units[unit]}";
          }
        }
      }
    }

    return words.trim();
  }

  static String _intToFrenchWords(int n) {
    if (n == 0) return "ZERO";
    String words = "";

    final millions = n ~/ 1000000;
    final thousands = (n % 1000000) ~/ 1000;
    final rest = n % 1000;

    if (millions > 0) {
      if (millions == 1) {
        words += "UN MILLION";
      } else {
        words += "${_underThousandToWords(millions)} MILLIONS";
      }
    }
    if (thousands > 0) {
      if (words.isNotEmpty) words += " ";
      if (thousands == 1) {
        words += "MILLE";
      } else {
        words += "${_underThousandToWords(thousands)} MILLE";
      }
    }
    if (rest > 0) {
      if (words.isNotEmpty) words += " ";
      words += _underThousandToWords(rest);
    }
    return words.trim();
  }

  static String convert(double amount) {
    if (amount.isNaN || amount.isInfinite) return "";

    final intAmount = amount.floor();
    final centimes = ((amount - intAmount) * 100).round();

    String dirhamsPart = _intToFrenchWords(intAmount);
    if (dirhamsPart.isEmpty) dirhamsPart = "ZERO";

    final centimesPart = centimes == 0
        ? "ZERO CENTIMES"
        : "${_intToFrenchWords(centimes)}${centimes == 1 ? ' CENTIME' : ' CENTIMES'}";

    return "$dirhamsPart DIRHAMS ET $centimesPart";
  }
}
