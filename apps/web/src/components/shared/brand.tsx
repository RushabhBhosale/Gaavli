import { Sprout } from "lucide-react";
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? "text-center text-emerald-950" : "text-white"}>
      <div
        className={`flex items-center gap-2 font-bold ${large ? "flex-col text-4xl" : "text-xl"}`}
      >
        <Sprout
          size={large ? 52 : 25}
          className={large ? "text-lime-600" : "text-emerald-200"}
        />
        <span>Gaavli</span>
      </div>
      <p
        className={`mt-1 ${large ? "text-base" : "pl-8 text-[11px] text-emerald-200"}`}
      >
        {large ? "Admin Portal" : "Admin Panel"}
      </p>
    </div>
  );
}
