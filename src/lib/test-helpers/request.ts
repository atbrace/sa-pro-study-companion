import { NextRequest } from 'next/server';

export function createGETRequest(
  path: string,
  searchParams?: Record<string, string>
): NextRequest {
  const url = new URL(path, 'http://localhost:3000');
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url, { method: 'GET' });
}

export function createPOSTRequest(
  path: string,
  body: unknown
): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
