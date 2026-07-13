import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth";

export function IndexPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth/login" });
      return;
    }
    // Needs profile completion
    if (!profile?.full_name || !profile?.phone) {
      navigate({ to: "/onboarding" });
      return;
    }
    navigate({ to: "/home" });
  }, [user, profile, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-[--amber] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
