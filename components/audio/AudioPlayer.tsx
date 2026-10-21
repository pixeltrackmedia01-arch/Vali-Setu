"use client";

import { useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible play/pause control around a native <audio> element. Audio loads
 * only when first played (preload="none") to save data on slow connections.
 */
export function AudioPlayer({
  src,
  labels,
  size = "md",
  onFirstPlay,
}: {
  src: string;
  labels: { play: string; pause: string; failed: string };
  size?: "md" | "lg";
  onFirstPlay?: () => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [played, setPlayed] = useState(false);
  const [progress, setProgress] = useState(0);

  async function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) return el.pause();
    try {
      await el.play();
      if (!played) {
        setPlayed(true);
        onFirstPlay?.();
      }
    } catch {
      setFailed(true);
    }
  }

  if (failed) return <p className="text-sm text-danger-700" role="alert">{labels.failed}</p>;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full bg-navy-600 font-semibold text-white hover:bg-navy-700",
          size === "lg" ? "min-h-16 px-8 text-lg" : "min-h-11 px-5 text-sm",
        )}
      >
        {playing ? <Pause className="h-5 w-5" aria-hidden /> : size === "lg" ? <Volume2 className="h-6 w-6" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
        {playing ? labels.pause : labels.play}
      </button>
      <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-navy-100" aria-hidden>
        <div className="h-full bg-navy-600 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <audio
        ref={ref}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(100);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress(Math.round((el.currentTime / el.duration) * 100));
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
