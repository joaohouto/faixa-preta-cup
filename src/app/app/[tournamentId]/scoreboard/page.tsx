"use client";

import { FaixaPretaLogo } from "@/components/icon/faixa-preta-logo";
import { TimerIcon } from "lucide-react";

export default function ScoreboardPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  return (
    <div className="p-4 h-screen flex flex-col items-center justify-center gap-8">
      <FaixaPretaLogo className="h-3 opacity-50" />

      <div className="grid grid-cols-2 gap-8 w-full">
        <section className="grid grid-cols-[auto_200px] gap-4 border p-4 rounded-2xl">
          <div className="flex flex-col justify-between">
            <div>
              <strong className="text-xl leading-1 text-balance">
                Centro Cristão de Ensino
              </strong>
            </div>

            <div className="flex flex-col">
              <strong className="text-4xl">COUTO</strong>
              <span>João Henrique Martins</span>
            </div>

            {/* CHUI */}
            <div className="flex items-center space-x-2 mt-4 text-sm">
              <div className="bg-yellow-300 text-center p-1 px-5 rounded-lg text-black">
                1
              </div>

              <div className="bg-yellow-300 text-center p-1 px-5 rounded-lg text-black">
                2
              </div>

              <div className="bg-yellow-300 text-center p-1 px-5 rounded-lg text-black">
                3
              </div>

              <div className="bg-yellow-300 text-center p-1 px-5 rounded-lg text-black">
                4
              </div>
            </div>
          </div>

          <div className="relative size-[200px] bg-red-500 text-white rounded-xl  flex items-center justify-center">
            <span className="font-bold font-mono text-9xl text-center">3</span>

            {/* SENSHU */}
            <div className="bg-green-600 flex items-end p-2 text-4xl font-bold h-[100px] w-[100px] text-white text-md absolute bottom-0 left-0 rounded-bl-lg [clip-path:polygon(0%_0%,0%_100%,100%_100%)]">
              S
            </div>
          </div>
        </section>

        <section className="grid grid-cols-[200px_auto] gap-4 border p-4 rounded-2xl">
          <div className="size-[200px] bg-blue-500 text-white rounded-xl font-bold font-mono text-9xl text-center flex items-center justify-center">
            3
          </div>

          <div className="flex flex-col justify-between text-right">
            <div>
              <strong className="text-xl leading-1 text-balance">UEMS</strong>
            </div>

            <div className="flex flex-col">
              <strong className="text-4xl">COUTO</strong>
              <span>João Henrique Martins</span>
            </div>

            {/* CHUI */}
            <div className="flex items-center justify-end space-x-2 mt-4 text-sm">
              <div className="bg-yellow-300 text-center p-1 px-5 rounded-lg text-black">
                1
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="p-4">
        <div className="grid grid-cols-3 items-center justify-center text-center gap-4">
          <div>
            <span className="leading-1 text-balance font-semibold">
              KUMITE MASCULINO CADETE AVANÇADO -63kg
            </span>
          </div>

          {/*Timer: Yellow ON, White PAUSED*/}
          <div className="flex items-center gap-2 justify-center">
            <div>
              <TimerIcon className="size-5" />
            </div>

            <span className="font-semibold font-mono text-7xl">02:00</span>
            <span className="font-semibold font-mono">00</span>
          </div>

          <div>
            <span className="leading-1 text-balance font-semibold">FINAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
