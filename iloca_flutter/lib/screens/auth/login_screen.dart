import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/config/app_config.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../providers/app_state_provider.dart';

class LoginScreen extends StatefulWidget {
  final AppStateProvider appState;

  const LoginScreen({super.key, required this.appState});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController(text: AppConfig.superAdminEmail);
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) return;
    setState(() => _loading = true);
    final pwd = _passCtrl.text.isEmpty ? '123456' : _passCtrl.text;
    try {
      final success = await widget.appState.login(email, pwd);
      if (!mounted) return;
      if (!success) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Veuillez entrer une adresse email valide.'),
            backgroundColor: AppColors2026.roseLaser,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur de connexion : $e'),
            backgroundColor: AppColors2026.roseLaser,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors2026.abyss,
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0.0, -0.85),
            radius: 1.25,
            colors: [
              Color(0x24D4AF37),
              AppColors2026.obsidian,
              AppColors2026.abyss,
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(22),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 430),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const LuxuryCrestEmblem(size: 82),
                    const SizedBox(height: 18),
                    const NeonBadge(
                      label: '✦ CONCIERGERIE VIP 2026',
                      color: AppColors2026.goldLight,
                      pulsing: true,
                    ),
                    const SizedBox(height: 12),
                    RichText(
                      textAlign: TextAlign.center,
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: 'BONATOURS ',
                            style: AppTheme2026.luxurySerif(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: AppColors2026.emeraldBright,
                              letterSpacing: 0.8,
                            ),
                          ),
                          TextSpan(
                            text: 'Location',
                            style: AppTheme2026.luxurySerif(
                              fontSize: 29,
                              fontWeight: FontWeight.w700,
                              fontStyle: FontStyle.italic,
                              color: AppColors2026.goldLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'LUXURY FLEET • TÉLÉMÉTRIE GPS • CLOUD SYNC',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.6,
                        color: AppColors2026.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 28),
                    SpatialGlassCard(
                      glowColor: AppColors2026.gold,
                      borderColor: AppColors2026.gold.withOpacity(0.28),
                      padding: const EdgeInsets.all(22),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'ACCÈS EXÉCUTIF',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.1,
                                  color: AppColors2026.goldLight,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors2026.emeraldNeon.withOpacity(0.14),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: AppColors2026.emeraldNeon.withOpacity(0.35),
                                  ),
                                ),
                                child: const Text(
                                  '• CLOUD SYNC',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors2026.emeraldNeon,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 18),
                          TextField(
                            controller: _emailCtrl,
                            keyboardType: TextInputType.emailAddress,
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Email professionnel',
                              prefixIcon: Icon(
                                LucideIcons.mail,
                                size: 18,
                                color: AppColors2026.goldLight,
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _passCtrl,
                            obscureText: _obscure,
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                            decoration: InputDecoration(
                              labelText: 'Mot de passe',
                              prefixIcon: const Icon(
                                LucideIcons.lock,
                                size: 18,
                                color: AppColors2026.goldLight,
                              ),
                              suffixIcon: IconButton(
                                onPressed: () =>
                                    setState(() => _obscure = !_obscure),
                                icon: Icon(
                                  _obscure ? LucideIcons.eyeOff : LucideIcons.eye,
                                  size: 18,
                                  color: AppColors2026.textSecondary,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 22),
                          GoldGradientButton(
                            label: _loading
                                ? 'CONNEXION EN COURS...'
                                : 'ACCÉDER AU COCKPIT VIP',
                            icon: LucideIcons.sparkles,
                            loading: _loading,
                            padding: const EdgeInsets.symmetric(vertical: 15),
                            fontSize: 13,
                            onPressed: _loading ? null : _submit,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
