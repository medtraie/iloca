import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config/app_config.dart';
import 'core/theme/app_theme_2026.dart';
import 'providers/app_state_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/shell/main_spatial_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Edge-to-edge 2026 Spatial status bar
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppColors2026.abyss,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Initialize Supabase with Web-shared project credentials safely
  try {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabasePublishableKey,
      realtimeClientOptions: const RealtimeClientOptions(
        eventsPerSecond: 20,
      ),
    );
  } catch (e) {
    debugPrint('[Main] Supabase startup note: $e');
  }

  runApp(const IlocaSpatialApp2026());
}

class IlocaSpatialApp2026 extends StatefulWidget {
  const IlocaSpatialApp2026({super.key});

  @override
  State<IlocaSpatialApp2026> createState() => _IlocaSpatialApp2026State();
}

class _IlocaSpatialApp2026State extends State<IlocaSpatialApp2026> {
  late final AppStateProvider _appState;

  @override
  void initState() {
    super.initState();
    _appState = AppStateProvider()..initialize();
  }

  @override
  void dispose() {
    _appState.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _appState,
      builder: (context, _) {
        return MaterialApp(
          title: 'bonatours',
          debugShowCheckedModeBanner: false,
          themeMode: ThemeMode.dark,
          darkTheme: AppTheme2026.darkSpatialTheme,
          theme: AppTheme2026.darkSpatialTheme,
          home: _appState.isAuthenticated
              ? MainSpatialShell(
                  key: const ValueKey('app_main_shell'),
                  appState: _appState,
                )
              : LoginScreen(
                  key: const ValueKey('app_login_screen'),
                  appState: _appState,
                ),
        );
      },
    );
  }
}
