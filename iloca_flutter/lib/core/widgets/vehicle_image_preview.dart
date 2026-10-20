import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

/// Helper widget to render images whether they are base64 strings, network URLs, or fallbacks
class VehicleImagePreview extends StatelessWidget {
  final String? imageData;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final Widget? fallback;

  const VehicleImagePreview({
    super.key,
    required this.imageData,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    Widget imageWidget;

    if (imageData != null && imageData!.isNotEmpty) {
      final data = imageData!.trim();
      if (data.startsWith('data:image') || data.length > 200) {
        // Base64 encoded image
        try {
          String cleanBase64 = data;
          if (data.contains(',')) {
            cleanBase64 = data.split(',').last;
          }
          final bytes = base64Decode(cleanBase64);
          imageWidget = Image.memory(
            bytes,
            width: width,
            height: height,
            fit: fit,
            gaplessPlayback: true,
            errorBuilder: (_, __, ___) => fallback ?? _defaultPlaceholder(),
          );
        } catch (_) {
          imageWidget = fallback ?? _defaultPlaceholder();
        }
      } else if (data.startsWith('http://') || data.startsWith('https://')) {
        // Network URL image
        imageWidget = Image.network(
          data,
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (_, __, ___) => fallback ?? _defaultPlaceholder(),
        );
      } else {
        imageWidget = fallback ?? _defaultPlaceholder();
      }
    } else {
      imageWidget = fallback ?? _defaultPlaceholder();
    }

    if (borderRadius != null) {
      return ClipRRect(
        borderRadius: borderRadius!,
        child: imageWidget,
      );
    }
    return imageWidget;
  }

  Widget _defaultPlaceholder() {
    return Container(
      width: width,
      height: height,
      color: Colors.white.withOpacity(0.06),
      alignment: Alignment.center,
      child: const Icon(Icons.directions_car, color: Colors.white24, size: 36),
    );
  }

  /// Utility to pick an image from camera or gallery and compress to base64 data url
  static Future<String?> pickAndCompressImage({
    required ImageSource source,
    int maxWidth = 900,
    int quality = 75,
  }) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: maxWidth.toDouble(),
        imageQuality: quality,
      );
      if (picked == null) return null;
      final bytes = await picked.readAsBytes();
      final base64String = base64Encode(bytes);
      return 'data:image/jpeg;base64,$base64String';
    } catch (e) {
      debugPrint('[VehicleImage] pick error: $e');
      return null;
    }
  }
}
