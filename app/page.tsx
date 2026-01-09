import WalletForm from '@/components/WalletForm';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            See how much your wallet decisions cost you
          </h1>
          <p className="text-gray-600">
            Analyze your stablecoin conversion patterns and discover potential savings
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8">
          <WalletForm />
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>RuleOne helps you understand the cost of your conversion decisions</p>
        </div>
      </div>
    </main>
  );
}