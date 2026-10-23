# Flutter & Pigeon core rules
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.** { *; }
-keep class dev.flutter.pigeon.** { *; }

# SharedPreferences (Both Legacy & DataStore backends)
-keep class io.flutter.plugins.sharedpreferences.** { *; }
-keep class androidx.datastore.** { *; }
-keep class androidx.preference.** { *; }

# Network & OkHttp
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
