import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
      headers: { apikey: anon },
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok && data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      if (data?.success || data?.reason === "already_unsubscribed") setState("done");
      else { setErrorMsg("Não foi possível processar."); setState("error"); }
    } catch (e: any) {
      setErrorMsg(e?.message || "Erro inesperado");
      setState("error");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6 border rounded-lg p-8">
        <h1 className="text-2xl font-light tracking-wide">Cancelar inscrição</h1>
        {state === "loading" && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
        {state === "valid" && (
          <>
            <p className="text-sm text-muted-foreground font-light">Confirme abaixo para parar de receber estes emails.</p>
            <Button onClick={confirm} className="w-full">Confirmar cancelamento</Button>
          </>
        )}
        {state === "submitting" && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
        {state === "done" && (
          <div className="space-y-2">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <p className="text-sm font-light">Pronto. Você não receberá mais estes emails.</p>
          </div>
        )}
        {state === "already" && (
          <div className="space-y-2">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-light">Você já havia cancelado a inscrição.</p>
          </div>
        )}
        {state === "invalid" && (
          <div className="space-y-2">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm font-light">Link inválido ou expirado.</p>
          </div>
        )}
        {state === "error" && (
          <div className="space-y-2">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm font-light">{errorMsg}</p>
            <Button variant="outline" onClick={confirm}>Tentar novamente</Button>
          </div>
        )}
      </div>
    </main>
  );
}