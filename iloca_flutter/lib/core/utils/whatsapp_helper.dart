import 'package:flutter/foundation.dart';
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class WhatsAppHelper {
  /// Clean phone numbers and prepend Morocco country code 212 if starting with 0
  static String sanitizePhone(String raw) {
    String clean = raw.replaceAll(RegExp(r'[^0-9]'), '');
    if (clean.startsWith('0')) {
      clean = '212${clean.substring(1)}';
    }
    return clean;
  }

  /// Direct WhatsApp share for text summary with multiple fallback tiers
  static Future<void> shareTextMessage({
    required String phone,
    required String message,
  }) async {
    final cleanPhone = sanitizePhone(phone);
    final encoded = Uri.encodeComponent(message);

    // 1. Direct whatsapp:// URI scheme (works with WhatsApp app if installed)
    Uri? appUri;
    if (cleanPhone.isNotEmpty) {
      appUri = Uri.parse('whatsapp://send?phone=$cleanPhone&text=$encoded');
    } else {
      appUri = Uri.parse('whatsapp://send?text=$encoded');
    }

    try {
      final launched = await launchUrl(appUri, mode: LaunchMode.externalApplication);
      if (launched) return;
    } catch (_) {}

    // 2. Fallback to web WhatsApp / wa.me API
    final webUri = cleanPhone.isNotEmpty
        ? Uri.parse('https://api.whatsapp.com/send?phone=$cleanPhone&text=$encoded')
        : Uri.parse('https://api.whatsapp.com/send?text=$encoded');

    try {
      final launched = await launchUrl(webUri, mode: LaunchMode.externalApplication);
      if (launched) return;
    } catch (_) {}

    // 3. Fallback to native share sheet (WhatsApp is always available in it)
    await Share.share(message);
  }

  /// Share actual generated PDF document (via WhatsApp, Mail, Telegram, etc.)
  static Future<void> sharePdf({
    required Uint8List bytes,
    required String filename,
    String? subject,
    String? phone,
  }) async {
    try {
      await Printing.sharePdf(
        bytes: bytes,
        filename: filename,
        subject: subject,
      );
    } catch (e) {
      debugPrint('Error sharing PDF: $e');
      if (subject != null && subject.isNotEmpty) {
        await Share.share(subject);
      }
    }
  }

  /// Print or save/download PDF directly on device
  static Future<void> printOrDownloadPdf({
    required Uint8List bytes,
    required String filename,
  }) async {
    await Printing.layoutPdf(
      onLayout: (format) async => bytes,
      name: filename,
    );
  }
}
