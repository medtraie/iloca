import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
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
      systemNavigationBarColor: AppTheme2026.obsidianBg,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Initialize Supabase with Web-shared project credentials and Realtime WebSockets
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
    realtimeClientOptions: const RealtimeClientOptions(
      eventsPerSecond: 20,
    ),
  );

  runApp(const IlocaSpatialApp2026());
}

class IlocaSpatialApp2026 extends StatelessWidget {
  const IlocaSpatialApp2026({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppStateProvider()..initialize(),
      child: Consumer<AppStateProvider>(
        builder: (context, state, _) {
          return MaterialApp(
            title: AppConfig.appName,
            debugShowCheckedModeBanner: false,
            themeMode: state.isDarkMode ? ThemeMode.dark : ThemeMode.light,
            darkTheme: AppTheme2026.darkTheme(),
            theme: AppTheme2026.lightTheme(),
            home: state.isAuthenticated
                ? const MainSpatialShell()
                : const LoginScreen(),
          );
        },
      ),
    );
  }
}
