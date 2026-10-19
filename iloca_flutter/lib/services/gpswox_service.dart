import 'dart:convert';
import 'dart:math' as math;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/config/app_config.dart';
import '../models/app_models.dart';

/// Complete GPSWOX Telemetry & Trajectory Service for Flutter (Android & iOS)
class GpswoxService {
  static const String _hashKey = 'gpswox:user_api_hash';
  static const String _hashTsKey = 'gpswox:user_api_hash_ts';
  static const int _hashTtlMs = 1000 * 60 * 60 * 10; // 10 hours

  static String _memoryHash = '';
  static int _memoryHashTs = 0;

  /// Fetch GPSWOX credentials from Supabase `gpswox_settings` or local cache
  static Future<Map<String, String>> getGpsConfig() async {
    final prefs = await SharedPreferences.getInstance();
    String apiUrl = prefs.getString('sft_gps_api_url') ?? 'http://sf-tracker.pro/api';
    String email = prefs.getString('sft_gps_email') ?? '';
    String password = prefs.getString('sft_gps_password') ?? '';

    try {
      final sb = Supabase.instance.client;
      final data = await sb
          .from('gpswox_settings')
          .select('api_url,email,password')
          .order('updated_at', ascending: false)
          .limit(1);
      if (data.isNotEmpty) {
        final row = data.first;
        if ((row['api_url'] ?? '').toString().trim().isNotEmpty) {
          apiUrl = row['api_url'].toString().trim();
        }
        if ((row['email'] ?? '').toString().trim().isNotEmpty) {
          email = row['email'].toString().trim();
        }
        if ((row['password'] ?? '').toString().isNotEmpty) {
          password = row['password'].toString();
        }
        await prefs.setString('sft_gps_api_url', apiUrl);
        await prefs.setString('sft_gps_email', email);
        await prefs.setString('sft_gps_password', password);
      }
    } catch (_) {}

    return {'apiUrl': apiUrl, 'email': email, 'password': password};
  }

  static Future<List<String>> _getApiCandidates() async {
    final cfg = await getGpsConfig();
    final raw = cfg['apiUrl'] ?? '';
    final list = <String>[];

    void addHost(String u) {
      final clean = u
          .trim()
          .replaceAll(RegExp(r'^https?://', caseSensitive: false), '')
          .replaceAll(RegExp(r'/api/?$', caseSensitive: false), '')
          .replaceAll(RegExp(r'/+$'), '');
      if (clean.isEmpty) return;
      list.add('http://$clean/api');
      list.add('https://$clean/api');
      list.add('http://$clean');
      list.add('https://$clean');
    }

    if (raw.isNotEmpty) addHost(raw);
    for (final c in AppConfig.defaultGpswoxApiCandidates) {
      addHost(c);
    }
    return list.toSet().toList();
  }

  static Future<String> _getCachedHash() async {
    final now = DateTime.now().millisecondsSinceEpoch;
    if (_memoryHash.isNotEmpty && (now - _memoryHashTs) < _hashTtlMs) {
      return _memoryHash;
    }
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_hashKey) ?? '';
    final ts = prefs.getInt(_hashTsKey) ?? 0;
    if (saved.isNotEmpty && (now - ts) < _hashTtlMs) {
      _memoryHash = saved;
      _memoryHashTs = ts;
      return saved;
    }
    return '';
  }

  static Future<void> _saveHash(String hash) async {
    final now = DateTime.now().millisecondsSinceEpoch;
    _memoryHash = hash;
    _memoryHashTs = now;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_hashKey, hash);
    await prefs.setInt(_hashTsKey, now);
  }

  static Future<void> clearCachedHash() async {
    _memoryHash = '';
    _memoryHashTs = 0;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_hashKey);
    await prefs.remove(_hashTsKey);
  }

  /// Login to GPSWOX and retrieve `user_api_hash`
  static Future<String> login({bool forceRefresh = false}) async {
    if (!forceRefresh) {
      final cached = await _getCachedHash();
      if (cached.isNotEmpty) return cached;
    }

    final cfg = await getGpsConfig();
    final email = cfg['email'] ?? '';
    final password = cfg['password'] ?? '';
    if (email.isEmpty || password.isEmpty) {
      return await _getCachedHash();
    }

    final candidates = await _getApiCandidates();
    for (final base in candidates) {
      try {
        final uri = Uri.parse('$base/login').replace(queryParameters: {
          'email': email,
          'password': password,
          'lang': 'fr',
        });
        final res = await http.get(uri).timeout(const Duration(seconds: 8));
        if (res.statusCode >= 200 && res.statusCode < 300) {
          final decoded = jsonDecode(res.body);
          if (decoded is Map) {
            final hash = (decoded['user_api_hash'] ??
                    (decoded['data'] is Map
                        ? decoded['data']['user_api_hash']
                        : '') ??
                    '')
                .toString();
            if (hash.isNotEmpty) {
              await _saveHash(hash);
              return hash;
            }
          }
        }
      } catch (_) {}
    }
    return '';
  }

  /// Fetch Live GPS Devices from GPSWOX API or Supabase Edge Function / Cache
  static Future<List<GpsDeviceModel>> getDevices() async {
    // 1. Try direct GPSWOX API with user_api_hash
    try {
      String hash = await login();
      if (hash.isNotEmpty) {
        final candidates = await _getApiCandidates();
        for (final base in candidates) {
          try {
            final uri = Uri.parse('$base/get_devices').replace(queryParameters: {
              'user_api_hash': hash,
              'lang': 'fr',
            });
            var res = await http.get(uri).timeout(const Duration(seconds: 8));
            if (res.statusCode == 401 ||
                res.body.contains('"status":0') ||
                res.body.contains('user_api_hash')) {
              await clearCachedHash();
              hash = await login(forceRefresh: true);
              if (hash.isNotEmpty) {
                final retryUri =
                    Uri.parse('$base/get_devices').replace(queryParameters: {
                  'user_api_hash': hash,
                  'lang': 'fr',
                });
                res = await http.get(retryUri).timeout(const Duration(seconds: 8));
              }
            }
            if (res.statusCode >= 200 && res.statusCode < 300) {
              final decoded = jsonDecode(res.body);
              final parsed = _parseDevicesPayload(decoded);
              if (parsed.isNotEmpty) {
                return parsed;
              }
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    // 2. Fallback: Supabase Edge Function `gpswox`
    try {
      final sb = Supabase.instance.client;
      final response = await sb.functions.invoke(
        'gpswox',
        body: {'target': 'devices'},
      );
      if (response.data != null) {
        final parsed = _parseDevicesPayload(response.data);
        if (parsed.isNotEmpty) return parsed;
      }
    } catch (_) {}

    // 3. Fallback: Supabase `gpswox_devices_cache` or `gpswox_snapshots`
    try {
      final sb = Supabase.instance.client;
      final rows = await sb
          .from('gpswox_snapshots')
          .select('payload')
          .eq('snapshot_type', 'devices')
          .order('id', ascending: false)
          .limit(1);
      if (rows.isNotEmpty && rows.first['payload'] != null) {
        final parsed = _parseDevicesPayload(rows.first['payload']);
        if (parsed.isNotEmpty) return parsed;
      }
    } catch (_) {}

    return [];
  }

  static List<GpsDeviceModel> _parseDevicesPayload(dynamic payload) {
    final result = <GpsDeviceModel>[];
    final rawItems = <Map<String, dynamic>>[];

    void collectItems(dynamic node) {
      if (node is List) {
        for (final el in node) {
          collectItems(el);
        }
      } else if (node is Map) {
        if (node['items'] is List) {
          collectItems(node['items']);
        } else if (node['data'] is List) {
          collectItems(node['data']);
        } else if (node['devices'] is List) {
          collectItems(node['devices']);
        } else if (node.containsKey('id') ||
            node.containsKey('name') ||
            node.containsKey('lat')) {
          rawItems.add(Map<String, dynamic>.from(node));
        }
      }
    }

    collectItems(payload);

    final seenIds = <String>{};
    for (final item in rawItems) {
      final id = (item['id'] ?? item['device_id'] ?? '').toString();
      if (id.isEmpty || seenIds.contains(id)) continue;
      seenIds.add(id);

      final deviceData = item['device_data'] is Map
          ? Map<String, dynamic>.from(item['device_data'] as Map)
          : <String, dynamic>{};

      final name = (item['name'] ?? deviceData['name'] ?? 'Véhicule $id').toString();
      final plate = (item['plate_number'] ??
              deviceData['plate_number'] ??
              item['plate'] ??
              name)
          .toString();
      final imei = (item['imei'] ?? deviceData['imei'] ?? '').toString();

      final lat = _toDouble(item['lat'] ?? item['latitude']);
      final lng = _toDouble(item['lng'] ?? item['longitude'] ?? item['lon']);
      final speed = _toDouble(item['speed']);
      final onlineStr = (item['online'] ?? '').toString().toLowerCase();
      final online = item['online'] == true ||
          onlineStr == 'online' ||
          onlineStr == 'ack' ||
          speed > 0;
      final ignition = item['ignition'] == true ||
          item['engine_status'] == true ||
          speed > 1;
      final distanceToday =
          _toDouble(item['distance_today'] ?? item['total_distance']);
      final lastUpdate =
          (item['time'] ?? item['timestamp'] ?? DateTime.now().toIso8601String())
              .toString();

      result.add(
        GpsDeviceModel(
          id: id,
          name: name,
          plate: plate,
          imei: imei,
          lat: lat,
          lng: lng,
          speed: speed,
          online: online,
          ignition: ignition,
          distanceToday: distanceToday,
          lastUpdate: lastUpdate,
          raw: item,
        ),
      );
    }

    return result;
  }

  /// Fetch Historical Trajectory for a Vehicle between [from] and [to]
  static Future<List<HistoryPointModel>> getDeviceHistory({
    required String deviceId,
    required DateTime from,
    required DateTime to,
    GpsDeviceModel? fallbackDevice,
  }) async {
    final fromDate = _formatDate(from);
    final fromTime = _formatTime(from);
    final toDate = _formatDate(to);
    final toTime = _formatTime(to, isEnd: true);

    // 1. Direct GPSWOX API (`get_history` & `get_history_messages`)
    try {
      String hash = await login();
      if (hash.isNotEmpty) {
        final candidates = await _getApiCandidates();
        for (final base in candidates) {
          for (final endpoint in ['get_history', 'get_history_messages']) {
            try {
              final uri = Uri.parse('$base/$endpoint').replace(
                queryParameters: {
                  'user_api_hash': hash,
                  'device_id': deviceId,
                  'from_date': fromDate,
                  'from_time': fromTime,
                  'to_date': toDate,
                  'to_time': toTime,
                  'lang': 'fr',
                },
              );
              final res = await http.get(uri).timeout(const Duration(seconds: 12));
              if (res.statusCode >= 200 && res.statusCode < 300) {
                final decoded = jsonDecode(res.body);
                final pts = _extractHistoryPoints(decoded);
                if (pts.length >= 2) {
                  return pts;
                }
              }
            } catch (_) {}
          }
        }
      }
    } catch (_) {}

    // 2. Supabase Edge Function `gpswox` history target
    try {
      final sb = Supabase.instance.client;
      final res = await sb.functions.invoke(
        'gpswox',
        body: {
          'target': 'history',
          'deviceId': deviceId,
          'device_id': deviceId,
          'from': from.toIso8601String(),
          'to': to.toIso8601String(),
          'from_date': fromDate,
          'from_time': fromTime,
          'to_date': toDate,
          'to_time': toTime,
        },
      );
      if (res.data != null) {
        final pts = _extractHistoryPoints(res.data);
        if (pts.length >= 2) return pts;
      }
    } catch (_) {}

    // 3. Fallback to real tail points if present on device payload
    if (fallbackDevice != null) {
      final tailPts = _extractHistoryPoints(fallbackDevice.raw['tail']);
      if (tailPts.isNotEmpty) return tailPts;
    }

    return [];
  }

  static List<HistoryPointModel> _extractHistoryPoints(dynamic payload) {
    final points = <HistoryPointModel>[];

    void scan(dynamic node) {
      if (node is List) {
        for (final item in node) {
          scan(item);
        }
      } else if (node is Map) {
        final lat = _toDouble(
            node['lat'] ?? node['latitude'] ?? (node['position'] is Map ? node['position']['lat'] : null),
            double.nan);
        final lng = _toDouble(
            node['lng'] ??
                node['lon'] ??
                node['longitude'] ??
                (node['position'] is Map ? node['position']['lng'] : null),
            double.nan);

        if (lat.isFinite &&
            lng.isFinite &&
            (lat.abs() > 0.001 || lng.abs() > 0.001)) {
          final speed = _toDouble(node['speed']);
          int ts = DateTime.now().millisecondsSinceEpoch;
          final rawTime =
              node['timestamp'] ?? node['time'] ?? node['raw_time'] ?? node['dt'];
          if (rawTime is num) {
            ts = rawTime < 2000000000 ? (rawTime * 1000).round() : rawTime.round();
          } else if (rawTime is String && rawTime.isNotEmpty) {
            final parsed = DateTime.tryParse(rawTime.replaceFirst(' ', 'T'));
            if (parsed != null) ts = parsed.millisecondsSinceEpoch;
          }
          points.add(HistoryPointModel(
            lat: lat,
            lng: lng,
            timestamp: ts,
            speed: speed,
          ));
        }

        for (final key in ['items', 'positions', 'data', 'messages', 'tail', 'points']) {
          if (node[key] != null) {
            scan(node[key]);
          }
        }
      }
    }

    scan(payload);

    // Sort chronologically & deduplicate identical consecutive points
    points.sort((a, b) => a.timestamp.compareTo(b.timestamp));
    final deduped = <HistoryPointModel>[];
    for (final p in points) {
      if (deduped.isEmpty) {
        deduped.add(p);
      } else {
        final prev = deduped.last;
        if ((prev.lat - p.lat).abs() > 0.00001 ||
            (prev.lng - p.lng).abs() > 0.00001 ||
            (p.timestamp - prev.timestamp).abs() > 30000) {
          deduped.add(p);
        }
      }
    }
    return deduped;
  }

  /// Fetch GPSWOX Events / Alerts
  static Future<List<AlertItemModel>> getEvents() async {
    final events = <AlertItemModel>[];
    try {
      final hash = await login();
      if (hash.isNotEmpty) {
        final candidates = await _getApiCandidates();
        for (final base in candidates) {
          try {
            final uri = Uri.parse('$base/get_events').replace(queryParameters: {
              'user_api_hash': hash,
              'lang': 'fr',
            });
            final res = await http.get(uri).timeout(const Duration(seconds: 8));
            if (res.statusCode >= 200 && res.statusCode < 300) {
              final decoded = jsonDecode(res.body);
              final items = _pickList(decoded);
              for (final item in items) {
                if (item is Map) {
                  final msg = (item['message'] ?? item['name'] ?? 'Alerte GPS').toString();
                  final lower = msg.toLowerCase();
                  final severity = lower.contains('vitesse') ||
                          lower.contains('sos') ||
                          lower.contains('alarme') ||
                          lower.contains('geofence')
                      ? 'critical'
                      : lower.contains('arrêt') || lower.contains('batterie')
                          ? 'warning'
                          : 'info';
                  events.add(
                    AlertItemModel(
                      id: (item['id'] ?? DateTime.now().microsecondsSinceEpoch)
                          .toString(),
                      severity: severity,
                      title: (item['name'] ?? item['type'] ?? 'Événement GPSWOX')
                          .toString(),
                      message: msg,
                      date: (item['time'] ?? DateTime.now().toIso8601String())
                          .toString(),
                      vehicleName:
                          (item['device_name'] ?? 'Véhicule SFT').toString(),
                      source: 'gpswox',
                    ),
                  );
                }
              }
              if (events.isNotEmpty) return events;
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
    return events;
  }

  static List<dynamic> _pickList(dynamic payload) {
    if (payload is List) return payload;
    if (payload is Map) {
      if (payload['items'] is Map && payload['items']['data'] is List) {
        return payload['items']['data'] as List;
      }
      for (final k in ['items', 'data', 'events', 'result']) {
        if (payload[k] is List) return payload[k] as List;
      }
    }
    return [];
  }

  /// Haversine Distance in Km
  static double haversineKm(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const r = 6371.0;
    final dLat = _deg2rad(lat2 - lat1);
    final dLng = _deg2rad(lng2 - lng1);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_deg2rad(lat1)) *
            math.cos(_deg2rad(lat2)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    return 2 * r * math.asin(math.sqrt(a));
  }

  static double _deg2rad(double deg) => deg * (math.pi / 180.0);

  /// Compute Route Distance, Duration, Avg/Max Speed, and Stops
  static RouteStatsModel computeRouteStats(List<HistoryPointModel> points) {
    if (points.length < 2) return const RouteStatsModel();
    double dist = 0;
    double maxSp = 0;
    for (int i = 1; i < points.length; i++) {
      final prev = points[i - 1];
      final cur = points[i];
      dist += haversineKm(prev.lat, prev.lng, cur.lat, cur.lng);
      if (cur.speed > maxSp) maxSp = cur.speed;
    }
    final durationMin = ((points.last.timestamp - points.first.timestamp) / 60000)
        .round()
        .clamp(0, 999999);
    final avgSpeed =
        durationMin > 0 ? (dist / (durationMin / 60.0)).round() : 0;
    final stops = detectStops(points);

    return RouteStatsModel(
      distanceKm: (dist * 10).round() / 10.0,
      durationMin: durationMin,
      avgSpeed: avgSpeed,
      maxSpeed: maxSp.round(),
      stopsCount: stops.length,
    );
  }

  /// Detect Stops along a route (radius <= 50m for >= 2 minutes)
  static List<DetectedStopModel> detectStops(
    List<HistoryPointModel> points, {
    double radiusMeters = 50,
    int minMinutes = 2,
  }) {
    if (points.length < 2) return [];
    final stops = <DetectedStopModel>[];
    int startIdx = 0;

    for (int i = 1; i < points.length; i++) {
      final anchor = points[startIdx];
      final cur = points[i];
      final distM = haversineKm(anchor.lat, anchor.lng, cur.lat, cur.lng) * 1000;

      if (distM > radiusMeters || cur.speed > 3) {
        final durMin = ((points[i - 1].timestamp - anchor.timestamp) / 60000).round();
        if (durMin >= minMinutes) {
          stops.add(
            DetectedStopModel(
              lat: anchor.lat,
              lng: anchor.lng,
              fromTimestamp: anchor.timestamp,
              toTimestamp: points[i - 1].timestamp,
              durationMin: durMin,
            ),
          );
        }
        startIdx = i;
      }
    }
    return stops;
  }

  static double _toDouble(dynamic v, [double fallback = 0]) {
    if (v == null) return fallback;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? fallback;
  }

  static String _formatDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  static String _formatTime(DateTime d, {bool isEnd = false}) {
    if (isEnd && d.hour == 0 && d.minute == 0 && d.second == 0) {
      return '23:59:59';
    }
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}:${d.second.toString().padLeft(2, '0')}';
  }
}
