import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { applyBrandColor, DEFAULT_BRAND_COLOR } from './utils/brandTheme'
import { settingsRepository } from './repositories/settingsRepository'

const root = createRoot(document.getElementById("root")!);

const renderApp = () => {
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

const bootstrap = async () => {
  applyBrandColor(DEFAULT_BRAND_COLOR);
  try {
    const companySettings = await settingsRepository.getCompanySettings();
    applyBrandColor(companySettings.brandColor || DEFAULT_BRAND_COLOR);
  } catch {
  }
  renderApp();
};

bootstrap();
