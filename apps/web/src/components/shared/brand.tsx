import Image from "next/image";

export const BRAND_TAGLINE = "Connecting Dots, Connecting People";
export const BRAND_TAGLINE_MR = "आपलं गाव, आपली माणसं, आपली जोडणी!";

// The Gaavli logo with its name and tagline. The sidebar uses the small form
// on a dark band; the sign-in page uses the large one.
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? "text-center text-[#12264F]" : "text-white"}>
      <div
        className={`flex items-center gap-3 font-bold ${large ? "flex-col text-4xl" : "text-xl"}`}
      >
        <Image
          src="/gaavli-logo.png"
          alt=""
          width={large ? 120 : 40}
          height={large ? 120 : 40}
          priority
        />
        <span>Gaavli</span>
      </div>
      <p
        className={`mt-1 ${large ? "text-base font-semibold" : "text-[11px] text-emerald-200"}`}
      >
        {BRAND_TAGLINE}
      </p>
      <p
        className={`${large ? "text-base font-semibold" : "text-[11px] text-emerald-200"}`}
      >
        {BRAND_TAGLINE_MR}
      </p>
      <p
        className={
          large
            ? "mt-3 text-sm text-slate-500"
            : "mt-1 text-[11px] text-emerald-200"
        }
      >
        {large ? "Admin Portal" : "Admin Panel"}
      </p>
    </div>
  );
}
