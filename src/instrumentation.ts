export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateAndLogEnv } = await import('./lib/env');
    validateAndLogEnv();
  }
}
