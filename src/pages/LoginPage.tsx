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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    login();
    navigate('/schedule');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
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
          <p className="text-sm mt-1" style={{ color: '#5b6675' }}>
            KPDK · Dekalb-Peachtree Airport
          </p>
        </div>

        <Card className="shadow-lg border-[#e6e9ee]">
          <CardHeader className="pb-4">
            <h2 className="text-base font-semibold" style={{ color: '#1a2430' }}>
              Sign in to your ScheduleMaster account
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#3a4654' }}>
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-[#e1e6eb] focus-visible:ring-[#EAAA00]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#3a4654' }}>
                    Password
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-[#e1e6eb] focus-visible:ring-[#EAAA00]"
                />
              </div>

              <Button
                type="submit"
                className="w-full font-bold mt-2 cursor-pointer"
                style={{
                  background: '#EAAA00',
                  color: '#002744',
                  boxShadow: '0 1px 2px rgba(234,170,0,.4)',
                }}
              >
                Sign In
              </Button>
            </form>

            <p className="mt-5 text-center text-xs" style={{ color: '#8a94a0' }}>
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
