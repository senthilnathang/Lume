/** Names of feature modules imported by AppModule. Only instantiated modules are listed. */
export const BUILTIN_MODULE_NAMES: Record<string, string> = {
  AuthModule: 'auth', UsersModule: 'user', SettingsModule: 'settings',
  RbacModule: 'rbac', BaseRbacModule: 'base_rbac', BaseSecurityModule: 'base_security',
  AuditModule: 'audit', BaseModule: 'base', EditorModule: 'editor', WebsiteModule: 'website',
  ActivitiesModule: 'activities', DocumentsModule: 'documents', TeamModule: 'team',
  MediaModule: 'media', DonationsModule: 'donations', MessagesModule: 'messages',
  BaseAutomationModule: 'base_automation', BaseCustomizationModule: 'base_customization',
  BaseFeaturesDataModule: 'base_features_data', AdvancedFeaturesModule: 'advanced_features',
  LumeModule: 'lume', PlatformConfigModule: 'platform-config',
  SecurityAuditModule: 'security_audit', PluginsModule: 'plugins',
};
