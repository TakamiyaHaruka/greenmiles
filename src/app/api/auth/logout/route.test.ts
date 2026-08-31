import { describe, it, expect } from 'vitest';
import { POST } from './route';

describe('POST /api/auth/logout', () => {
  it('clears the token cookie', async () => {
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.success).toBe(true);

    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain('token=');
    expect(setCookie).toContain('Max-Age=0');
  });
});
