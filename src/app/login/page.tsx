"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow">
          <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">Välkommen tillbaka!</h1>
        <p className="mt-1.5 text-sm text-slate-400">Logga in för att fortsätta spela och tävla.</p>
      </div>
      <Card className="animate-fade-up">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-slate-300">Konto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-3.5">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Loggar in..." : "Logga in"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-400">
            Har inget konto?{" "}
            <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Skapa konto
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
