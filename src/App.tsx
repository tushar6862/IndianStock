import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { OptionsPage } from './pages/Options.tsx'
import { PredictionHistory } from './pages/PredictionHistory.tsx'
import { SettingsPage } from './pages/Settings.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/options" element={<OptionsPage />} />
          <Route path="/history" element={<PredictionHistory />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
