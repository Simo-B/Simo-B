export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to RuleOne MVP
        </h1>
        <p className="text-center text-lg mb-4">
          Blockchain wallet analysis platform
        </p>
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>This is a clean Next.js setup with:</p>
          <ul className="mt-4 space-y-2">
            <li>✓ Next.js 15 with App Router</li>
            <li>✓ TypeScript (Strict Mode)</li>
            <li>✓ Supabase Integration</li>
            <li>✓ Stripe Payments</li>
            <li>✓ Alchemy SDK & Ethers.js</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
