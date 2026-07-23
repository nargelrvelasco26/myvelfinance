import { useState } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import { Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success("Check your email for the magic link!");
      setEmailSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">VEL Finance</h1>
            <p className="text-slate-300">Track finances with ease</p>
          </div>

          {!emailSent ? (
            <form onSubmit={handleMagicLink} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail size={20} />
                {loading ? "Sending..." : "Send Magic Link"}
              </button>

              <p className="text-center text-sm text-slate-400">
                We'll send you a magic link to sign in or create an account
              </p>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <Mail className="text-green-400" size={32} />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Check your email!
                </h2>
                <p className="text-slate-300 mb-4">
                  We sent a magic link to{" "}
                  <span className="text-purple-400 font-semibold">{email}</span>
                </p>
                <p className="text-sm text-slate-400">
                  Click the link in the email to sign in. The link will expire
                  in 1 hour.
                </p>
              </div>

              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 border border-white/20"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
