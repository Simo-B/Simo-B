export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function validateEnvVars(): void {
  getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
