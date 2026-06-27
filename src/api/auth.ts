import { apiClient } from './client';

export interface LoginResponse {
  userid: string;
  session: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await apiClient('/login.asp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ USERID: username, DATA: password, CMD: 'LOGIN' }).toString(),
  });

  const location = res.headers.get('x-final-location');
  if (!location) throw new Error(`Login failed: ${res.status} ${res.statusText}`);

  const redirectUrl = new URL(location);
  const userid = redirectUrl.searchParams.get('USERID');
  const session = redirectUrl.searchParams.get('SESSION');

  if (!userid || !session) throw new Error('Login failed: USERID or SESSION missing from redirect');

  return { userid, session };
}
