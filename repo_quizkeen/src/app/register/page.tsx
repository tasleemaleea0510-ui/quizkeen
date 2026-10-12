"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createProfile } from "./actions";

export default function RegisterPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await createProfile(data.user.id, username, role);
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Join QuizKeen! 🚀</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={role === "STUDENT" ? "default" : "outline"} onClick={() => setRole("STUDENT")}>
                🎒 Student
              </Button>
              <Button type="button" variant={role === "TEACHER" ? "default" : "outline"} onClick={() => setRole("TEACHER")}>
                🍎 Teacher
              </Button>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign up free"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:underline">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}