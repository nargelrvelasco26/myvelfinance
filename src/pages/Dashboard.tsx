import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";
import DebtMonitoringPanel from "../components/DebtMonitoringPanel";
import BudgetPanel from "../components/BudgetPanel";
import GameWinLossPanel from "../components/GameWinLossPanel";
import EventsPanel from "../components/EventsPanel";
import toast from "react-hot-toast";

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              VEL Financial Dashboard
            </h1>
            <p className="text-slate-300">Welcome back, {user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 border border-white/20"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EventsPanel />
          <DebtMonitoringPanel />
          <BudgetPanel />
          <GameWinLossPanel />
        </div>
      </div>
    </div>
  );
}
