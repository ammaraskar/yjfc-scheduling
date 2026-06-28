import { useState } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '@/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate('/schedule');
    } catch (error) {
      console.error('Login failed', error);
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-sm px-4">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
            style={{ background: '#003057' }}
          >
            <span
              className="font-mono font-bold text-lg tracking-tight"
              style={{ color: '#EAAA00' }}
            >
              YJFC
            </span>
          </div>
          <h1 className="text-xl font-bold text-center" style={{ color: '#003057' }}>
            Yellow Jacket Flying Club
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">
            KPDK · Dekalb-Peachtree Airport
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <h2 className="text-base font-semibold text-foreground">
              Sign in to your ScheduleMaster account
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium text-foreground">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="focus-visible:ring-[#EAAA00]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus-visible:ring-[#EAAA00]"
                />
              </div>

              {error && (
                <p className="text-sm" style={{ color: '#c0392b' }}>{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full font-bold mt-2 cursor-pointer"
                style={{
                  background: '#EAAA00',
                  color: '#002744',
                  boxShadow: '0 1px 2px rgba(234,170,0,.4)',
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Need access?{' '}
              <a href="https://yjfc.org/join/" className="font-medium hover:underline" style={{ color: '#003057' }}>
                How to join YJFC
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
