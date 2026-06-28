import { Router, Route, Switch, Redirect } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import { AuthProvider, useAuth } from './auth'
import PWABadge from './PWABadge.tsx'
import LoginPage from './pages/LoginPage.tsx'
import SchedulePage from './pages/SchedulePage.tsx'

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Component /> : <Redirect to="/login" />
}

function AppRoutes() {
  const { isLoggedIn } = useAuth();
  return (
    <Switch>
      <Route path="/login">
        {isLoggedIn ? <Redirect to="/schedule" /> : <LoginPage />}
      </Route>
      <Route path="/schedule" component={() => <ProtectedRoute component={SchedulePage} />} />
      <Route>
        <Redirect to={isLoggedIn ? '/schedule' : '/login'} />
      </Route>
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
