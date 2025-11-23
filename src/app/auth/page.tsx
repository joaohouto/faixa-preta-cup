"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { GoogleIcon } from "@/components/icon/google";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/luxe/spinner";
import { FaixaPretaIcon } from "@/components/icon/faixa-preta-icon";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);

  async function handleSignInWithGoogle() {
    setLoading(true);

    try {
      await signIn("google", { redirectTo: "/app" });

      toast.info("Encaminhando para a autenticação do Google");
    } catch (err) {
      console.log(err);

      toast.error("Algo deu errado. Tente novamente.");

      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <Card className="mx-auto max-w-sm w-[400px]">
        <CardHeader>
          <FaixaPretaIcon className="h-6 w-6 mb-2 text-primary" />
          <CardTitle className="text-2xl">Seja bem-vindo!</CardTitle>
          <CardDescription>Por favor, identifique-se antes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button
              onClick={handleSignInWithGoogle}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              {loading ? <Spinner /> : <GoogleIcon />}
              Entrar com Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
