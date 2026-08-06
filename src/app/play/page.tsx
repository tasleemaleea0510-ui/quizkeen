"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PlayPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");

  function join(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/play/lobby/${pin.trim()}?name=${encodeURIComponent(username.trim())}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">🎮 Join a Game</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={join} className="space-y-4">
            <Input placeholder="Game PIN (6 digits)" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} required />
            <Input placeholder="Your name" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <Button type="submit" className="w-full" size="lg">
              🚀 Join!
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}