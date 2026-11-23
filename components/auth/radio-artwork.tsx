"use client";

import { RadioTower, Headphones, Radio, Waves } from "lucide-react";

/** Decorative radio imagery; all information and inputs remain real HTML. */
export function RadioArtwork() {
  return (
    <div aria-hidden="true" className="radio-art relative mx-auto grid w-full max-w-[480px] place-items-center py-7">
      <div className="radio-art-orbit absolute size-[390px] rounded-full border border-white/10" />
      <div className="radio-art-orbit absolute size-[310px] rounded-full border border-white/15" />
      <div className="radio-art-orbit absolute size-[230px] rounded-full border border-white/15" />
      <div className="radio-art-pulse absolute size-[310px] rounded-full border border-[#c8baff]/15" />
      <div className="relative z-10 flex h-64 w-64 flex-col items-center justify-center rounded-[2.5rem] border border-white/20 bg-white/10 shadow-[0_25px_100px_-30px_#0b0830] backdrop-blur-2xl">
        <span className="mb-4 grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-[#b8a6ff] to-[#f2caff] text-[#211d3c] shadow-lg">
          <Radio className="size-11" strokeWidth={1.5}/>
        </span>
        <div className="flex h-12 items-center gap-1.5">
          {[13,22,32,18,42,27,16,38,24,46,29,17,35,20,13].map((height,i) =>
            <span key={i} className="radio-art-bar w-[5px] rounded-full bg-[#d6c9ff]" style={{height,animationDelay:`${i*90}ms`}}/>
          )}
        </div>
        <span className="mt-1 text-[11px] font-semibold tracking-widest text-white/70">FM · DIGITAL · AUDIO</span>
      </div>
      <span className="absolute right-[5%] top-10 grid size-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-[#e2d9ff] backdrop-blur-xl"><RadioTower size={22}/></span>
      <span className="absolute bottom-7 left-[8%] grid size-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-[#e2d9ff] backdrop-blur-xl"><Headphones size={22}/></span>
      <span className="absolute left-[3%] top-14 text-[#cbb8ff]/70"><Waves size={32}/></span>
    </div>
  );
}
