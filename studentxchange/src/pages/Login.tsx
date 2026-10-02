import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Logo } from "@/components/ui";
import { ProductMock } from "@/components/marketing/ProductMock";

/**
 * Shared entry experience. UI only: wire `onSubmit` to the existing Firebase auth
 * + server session once the backend contracts are connected (audit §4).
 */
export default function Login() {
  const [params, setParams] = useSearchParams();
  const signup = params.get("mode") === "signup";
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => navigate("/app"), 400);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 md:px-12">
        <Link to="/" aria-label="StudentXchange home"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-semibold tracking-tight">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-muted">{signup ? "One identity for Marketplace, Collab, Lancing and Career Compass." : "Log in to continue to your workspace."}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {signup && <Input label="Full name" autoComplete="name" required />}
            <Input label="College email" type="email" autoComplete="email" placeholder="you@college.edu" required />
            <Input label="Password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} />
            <Button type="submit" variant="dark" size="lg" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted">
            {signup ? "Already have an account?" : "New to StudentXchange?"}{" "}
            <button className="font-medium text-ink underline underline-offset-4" onClick={() => setParams(signup ? {} : { mode: "signup" })}>
              {signup ? "Log in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
      <div className="hidden items-center justify-center bg-surface-2 p-12 lg:flex">
        <div className="w-full max-w-md">
          <ProductMock />
          <p className="mt-10 text-center text-sm text-muted">Learn. Earn. Collaborate. Grow.</p>
        </div>
      </div>
    </div>
  );
}
