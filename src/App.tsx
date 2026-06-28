import { Router, Route, Switch, Redirect } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import { AuthProvider, useAuth } from './auth'
import PWABadge from './PWABadge.tsx'
import LoginPage from './pages/LoginPage.tsx'
import SchedulePage from './pages/SchedulePage.tsx'
import AircraftPage from './pages/AircraftPage.tsx'
import AircraftDetailPage from './pages/AircraftDetailPage.tsx'

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <Switch>
        <Route path="/login"><LoginPage /></Route>
        <Route><Redirect to="/login" /></Route>
      </Switch>
    )
  }

  return (
    <Switch>
      <Route path="/login"><Redirect to="/schedule" /></Route>
      <Route path="/schedule"><SchedulePage /></Route>
      <Route path="/aircraft/:tail">
        {(params) => <AircraftDetailPage tail={params.tail!} />}
      </Route>
      <Route path="/aircraft"><AircraftPage /></Route>
      <Route><Redirect to="/schedule" /></Route>
    </Switch>
  )
}

function App() {
  return (
    <Router hook={useHashLocation}>
      <AuthProvider>
        <AppRoutes />
        <PWABadge />
      </AuthProvider>
    </Router>
  )
}

export default App
