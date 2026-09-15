"use client";

import * as React from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, PictureInPicture2, Captions, Bookmark, Settings2, RotateCcw, RotateCw } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./dropdown-menu";
import { Tip } from "./tooltip";

export interface VideoSource {
  src: string;
  type?: string;
  label?: string; // quality label e.g. "1080p"
}

export interface VideoPlayerProps {
  sources: VideoSource[];
  poster?: string;
  captions?: Array<{ src: string; label: string; lang: string; default?: boolean }>;
  startAt?: number;
  onProgress?: (positionSeconds: number, percent: number, duration: number) => void;
  onEnded?: () => void;
  onBookmark?: (positionSeconds: number) => void;
  progressIntervalMs?: number;
  className?: string;
  title?: string;
}

function isEmbed(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

function embedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

function VideoPlayer({ sources, poster, captions = [], startAt = 0, onProgress, onEnded, onBookmark, progressIntervalMs = 10_000, className, title }: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [volume, setVolume] = React.useState(1);
  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [speed, setSpeed] = React.useState(1);
  const [quality, setQuality] = React.useState(0);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [captionsOn, setCaptionsOn] = React.useState(captions.some((c) => c.default));
  const [showControls, setShowControls] = React.useState(true);
  const hideTimer = React.useRef<number | null>(null);
  const lastReported = React.useRef(0);

  const primary = sources[quality] ?? sources[0];

  // Restore position
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      setDuration(v.duration || 0);
      if (startAt > 0 && startAt < v.duration - 2) v.currentTime = startAt;
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [startAt, primary?.src]);

  // Periodic progress reporting
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v || !onProgress) return;
    const tick = () => {
      if (!v.duration) return;
      const now = Date.now();
      if (now - lastReported.current >= progressIntervalMs) {
        lastReported.current = now;
        onProgress(Math.floor(v.currentTime), Math.round((v.currentTime / v.duration) * 100), Math.floor(v.duration));
      }
    };
    v.addEventListener("timeupdate", tick);
    return () => v.removeEventListener("timeupdate", tick);
  }, [onProgress, progressIntervalMs]);

  React.useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    for (const track of Array.from(v.textTracks)) track.mode = captionsOn ? "showing" : "hidden";
  }, [captionsOn]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };
  const seek = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, s));
  };
  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };
  const changeQuality = (i: number) => {
    const v = videoRef.current;
    const pos = v?.currentTime ?? 0;
    const wasPlaying = !!v && !v.paused;
    setQuality(i);
    requestAnimationFrame(() => {
      if (!videoRef.current) return;
      videoRef.current.currentTime = pos;
      if (wasPlaying) void videoRef.current.play();
    });
  };
  const toggleFullscreen = () => {
    if (!wrapRef.current) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current.requestFullscreen();
  };
  const pip = async () => {
    const v = videoRef.current;
    if (!v || !("requestPictureInPicture" in v)) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await v.requestPictureInPicture();
  };
  const bump = () => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => playing && setShowControls(false), 2500);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== wrapRef.current) return;
    const v = videoRef.current;
    if (!v) return;
    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        toggle();
        break;
      case "ArrowLeft":
      case "j":
        seek(v.currentTime - 10);
        break;
      case "ArrowRight":
      case "l":
        seek(v.currentTime + 10);
        break;
      case "m":
        setMuted((m) => !m);
        break;
      case "f":
        toggleFullscreen();
        break;
      case "c":
        setCaptionsOn((c) => !c);
        break;
    }
  };

  if (!primary) return null;

  if (isEmbed(primary.src)) {
    return (
      <div className={cn("relative aspect-video w-full overflow-hidden rounded-xl bg-black", className)}>
        <iframe
          src={embedUrl(primary.src)}
          title={title ?? "Lesson video"}
          className="absolute inset-0 size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      role="region"
      aria-label={title ?? "Video player"}
      onKeyDown={onKey}
      onMouseMove={bump}
      onMouseLeave={() => playing && setShowControls(false)}
      className={cn("group relative aspect-video w-full overflow-hidden rounded-xl bg-black outline-none focus-visible:ring-2 focus-visible:ring-accent", className)}
    >
      <video
        key={primary.src}
        ref={videoRef}
        poster={poster}
        playsInline
        preload="metadata"
        className="size-full"
        onPlay={() => {
          setPlaying(true);
          bump();
        }}
        onPause={() => {
          setPlaying(false);
          setShowControls(true);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          onProgress?.(Math.floor(duration), 100, Math.floor(duration));
          onEnded?.();
        }}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted);
          setVolume(e.currentTarget.volume);
        }}
        muted={muted}
        onClick={toggle}
      >
        <source src={primary.src} type={primary.type} />
        {captions.map((c) => (
          <track key={c.src} kind="captions" src={c.src} label={c.label} srcLang={c.lang} default={c.default} />
        ))}
      </video>

      {!playing ? (
        <button type="button" onClick={toggle} aria-label="Play" className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-transform hover:scale-105">
            <Play className="ms-1 size-7" />
          </span>
        </button>
      ) : null}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-10 text-white transition-opacity duration-200",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-[var(--accent)] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          style={{ background: `linear-gradient(to right, var(--accent) ${pct}%, rgba(255,255,255,.3) ${pct}%)` }}
        />
        <div className="flex items-center gap-1">
          <Tip label={playing ? "Pause (k)" : "Play (k)"}>
            <button type="button" onClick={toggle} className="rounded p-1.5 hover:bg-white/15" aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          </Tip>
          <Tip label="Back 10s (j)">
            <button type="button" onClick={() => seek(time - 10)} className="rounded p-1.5 hover:bg-white/15" aria-label="Back 10 seconds">
              <RotateCcw className="size-4" />
            </button>
          </Tip>
          <Tip label="Forward 10s (l)">
            <button type="button" onClick={() => seek(time + 10)} className="rounded p-1.5 hover:bg-white/15" aria-label="Forward 10 seconds">
              <RotateCw className="size-4" />
            </button>
          </Tip>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setMuted((m) => !m)} className="rounded p-1.5 hover:bg-white/15" aria-label={muted ? "Unmute" : "Mute"}>
              {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (videoRef.current) {
                  videoRef.current.volume = v;
                  videoRef.current.muted = v === 0;
                }
              }}
              aria-label="Volume"
              className="hidden h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/30 sm:block [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>
          <span className="ms-2 text-caption tabular-nums text-white/90">
            {formatDuration(Math.floor(time)).replace(/^0m$/, "0:00")} / {formatDuration(Math.floor(duration))}
          </span>
          <div className="ms-auto flex items-center gap-1">
            {onBookmark ? (
              <Tip label="Bookmark this moment">
                <button type="button" onClick={() => onBookmark(Math.floor(time))} className="rounded p-1.5 hover:bg-white/15" aria-label="Bookmark">
                  <Bookmark className="size-4" />
                </button>
              </Tip>
            ) : null}
            {captions.length ? (
              <Tip label="Captions (c)">
                <button type="button" onClick={() => setCaptionsOn((c) => !c)} className={cn("rounded p-1.5 hover:bg-white/15", captionsOn && "text-accent-2")} aria-pressed={captionsOn} aria-label="Captions">
                  <Captions className="size-4" />
                </button>
              </Tip>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="rounded p-1.5 hover:bg-white/15" aria-label="Settings">
                  <Settings2 className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Speed</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={String(speed)} onValueChange={(v) => changeSpeed(Number(v))}>
                  {SPEEDS.map((s) => (
                    <DropdownMenuRadioItem key={s} value={String(s)}>
                      {s}×
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {sources.length > 1 ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Quality</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={String(quality)} onValueChange={(v) => changeQuality(Number(v))}>
                      {sources.map((s, i) => (
                        <DropdownMenuRadioItem key={s.src} value={String(i)}>
                          {s.label ?? `Source ${i + 1}`}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void pip()}>
                  <PictureInPicture2 /> Picture in picture
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tip label={fullscreen ? "Exit fullscreen (f)" : "Fullscreen (f)"}>
              <button type="button" onClick={toggleFullscreen} className="rounded p-1.5 hover:bg-white/15" aria-label="Fullscreen">
                {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </button>
            </Tip>
          </div>
        </div>
      </div>
    </div>
  );
}

export { VideoPlayer };
