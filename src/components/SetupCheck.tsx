export default function SetupCheck() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const isConfigured = supabaseUrl && supabaseAnonKey &&
    supabaseUrl !== 'your-supabase-url' &&
    supabaseAnonKey !== 'your-supabase-anon-key'

  if (isConfigured) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">⚙️ Setup Required</h1>
            <p className="text-slate-300">Please configure your Supabase credentials</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-red-400 mb-3">Missing Configuration</h2>
            <p className="text-slate-300 mb-4">
              Your environment variables are not configured. Follow these steps:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-slate-300">
              <li>Create a project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">supabase.com</a></li>
              <li>Go to Project Settings → API</li>
              <li>Copy your Project URL and anon/public key</li>
              <li>Update <code className="bg-white/10 px-2 py-1 rounded">.env.local</code> with:</li>
            </ol>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <pre className="text-green-400 text-sm overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`}
            </pre>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Important</h3>
            <p className="text-slate-300 text-sm">
              After updating <code className="bg-white/10 px-2 py-1 rounded">.env.local</code>,
              restart your development server:
            </p>
            <pre className="bg-slate-800/50 rounded p-3 mt-3 text-green-400 text-sm">
npm run dev
            </pre>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-blue-400 font-semibold mb-2">📚 Database Setup</h3>
            <p className="text-slate-300 text-sm mb-2">
              Don't forget to run the SQL schema in Supabase:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-sm">
              <li>Open Supabase Dashboard → SQL Editor</li>
              <li>Copy contents from <code className="bg-white/10 px-2 py-1 rounded">supabase-schema.sql</code></li>
              <li>Paste and run the SQL</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
