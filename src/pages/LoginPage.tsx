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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#f7f9fc,_#eef2f6_45%,_#e7edf5)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,_#20252e,_#171b23_45%,_#12161c)]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#EAAA00]/15 blur-3xl dark:bg-[#EAAA00]/10" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#0b3d6e]/15 blur-3xl dark:bg-[#0b3d6e]/20" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#003057] ring-1 ring-[#003057]/25 dark:ring-[#EAAA00]/30"
          >
            <span className="font-mono text-lg font-bold tracking-tight text-[var(--club-gold)]">
              YJFC
            </span>
          </div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-[#003057] dark:text-[#f5c64f]">
            Yellow Jacket Flying Club
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            KPDK · Dekalb-Peachtree Airport
          </p>
        </div>

        <Card className="border-border/70 bg-card/90 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.45)] backdrop-blur-md dark:bg-card/75 dark:shadow-[0_24px_50px_-28px_rgba(0,0,0,0.75)]">
          <CardHeader className="pb-4">
            <h2 className="text-base font-semibold text-foreground md:text-lg">
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
                  className="h-10 border-border/80 bg-background/60 focus-visible:border-[#EAAA00] focus-visible:ring-[#EAAA00]/40 dark:border-white/15 dark:bg-black/20"
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
                  className="h-10 border-border/80 bg-background/60 focus-visible:border-[#EAAA00] focus-visible:ring-[#EAAA00]/40 dark:border-white/15 dark:bg-black/20"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-10 w-full cursor-pointer border border-[#d29b00] bg-[linear-gradient(135deg,#f5c64f,#e7ad00)] font-bold text-[#0a2a45] shadow-[0_6px_18px_-10px_rgba(234,170,0,0.95)] transition-all hover:brightness-105 active:translate-y-px disabled:translate-y-0 disabled:brightness-95"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Need access?{' '}
              <a href="https://yjfc.org/join/" className="font-medium text-[#003057] hover:underline dark:text-[#f5c64f]">
                Learn how to join YJFC
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
