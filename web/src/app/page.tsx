"use client";
import dynamic from "next/dynamic";

const Analyzer = dynamic(() => import("@/components/Analyzer"), { ssr: false });

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">
          ?????-??????????: ?????????? ?? ??????? ? ?????? ??????
        </h1>
        <Analyzer />
      </main>
    </div>
  );
}
