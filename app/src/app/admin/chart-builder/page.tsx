"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChartBuilderRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/content-studio");
  }, [router]);
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
      Redirecting to Content Studio...
    </div>
  );
}
