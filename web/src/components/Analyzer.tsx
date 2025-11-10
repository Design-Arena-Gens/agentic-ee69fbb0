"use client";
import React, { useMemo, useRef, useState } from "react";
import { analyzeAudioToTracks, downloadBlob } from "@/lib/dsp";
import type { AnalyzedTracks } from "@/lib/types";
import { renderScoreForTracks, exportScoresToPdf } from "@/lib/sheet";
import { buildMidiBlob } from "@/lib/midi";

function isYouTubeUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return ["www.youtube.com", "youtube.com", "youtu.be", "m.youtube.com"].includes(u.hostname);
  } catch {
    return false;
  }
}

export default function Analyzer() {
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<AnalyzedTracks | null>(null);
  const scoresContainerRef = useRef<HTMLDivElement>(null);

  const canAnalyze = useMemo(() => !!file || (!!sourceUrl && isYouTubeUrl(sourceUrl)), [file, sourceUrl]);

  async function fetchYouTubeAudioBlob(url: string): Promise<Blob> {
    const apiUrl = "/api/youtube?url=" + encodeURIComponent(url);
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("?? ??????? ??????? ????? ? YouTube");
    const blob = await res.blob();
    return blob;
  }

  async function handleAnalyze() {
    setError(null);
    setTracks(null);
    setIsProcessing(true);
    try {
      let blob: Blob;
      if (file) {
        blob = file;
      } else if (sourceUrl) {
        blob = await fetchYouTubeAudioBlob(sourceUrl);
      } else {
        throw new Error("????????? MP3 ??? ??????? ?????? ?? YouTube");
      }

      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

      const analyzed = await analyzeAudioToTracks(audioBuffer);
      setTracks(analyzed);

      // Render scores
      if (scoresContainerRef.current) {
        scoresContainerRef.current.innerHTML = "";
        renderScoreForTracks(analyzed, scoresContainerRef.current);
      }
    } catch (e: any) {
      setError(e?.message ?? "?????? ??????? ?????");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleExportMIDI() {
    if (!tracks) return;
    const midiBlob = buildMidiBlob(tracks);
    downloadBlob(midiBlob, "transcription.mid");
  }

  async function handleExportPDF() {
    if (!scoresContainerRef.current) return;
    const pdfBlob = await exportScoresToPdf(scoresContainerRef.current);
    downloadBlob(pdfBlob, "sheet-music.pdf");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <label className="block text-sm font-medium mb-2">????????? MP3</label>
          <input
            type="file"
            accept="audio/mpeg,audio/mp3,audio/mp4,audio/m4a,video/mp4"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && <p className="mt-2 text-sm text-zinc-500">{file.name}</p>}
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <label className="block text-sm font-medium mb-2">?????? ?? YouTube</label>
          <input
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
            placeholder="https://www.youtube.com/watch?v=..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
          <p className="mt-2 text-xs text-zinc-500">?????????????? ??????????? YouTube ??????.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={!canAnalyze || isProcessing}
          onClick={handleAnalyze}
          className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {isProcessing ? "??????..." : "?????????????"}
        </button>
        <button
          disabled={!tracks}
          onClick={handleExportMIDI}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 disabled:opacity-50"
        >
          ??????? MIDI
        </button>
        <button
          disabled={!tracks}
          onClick={handleExportPDF}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 disabled:opacity-50"
        >
          ??????? PDF ???
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-3">?????? ?????? ?? ????????</h2>
        <div ref={scoresContainerRef} className="space-y-8" />
      </div>

      {tracks && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">??????</h3>
          <ul className="list-disc ml-6 text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            <li>?????: {tracks.vocals.notes.length ? `${tracks.vocals.notes.length} ???` : "???????????? ??????????"}</li>
            <li>???: {tracks.bass.notes.length ? `${tracks.bass.notes.length} ???` : "???????????? ??????????"}</li>
            <li>??????????/?????????: {tracks.keys.notes.length ? `${tracks.keys.notes.length} ???` : "???????????? ??????????"}</li>
            <li>??????: {tracks.guitar.notes.length ? `${tracks.guitar.notes.length} ???` : "???????????? ??????????"}</li>
            <li>???????/?????????: {tracks.drums.hits.length ? `${tracks.drums.hits.length} ???????` : "??? ???????"}</li>
            <li>?????? ???????????: {tracks.other.notes.length ? `${tracks.other.notes.length} ???` : "???"}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
