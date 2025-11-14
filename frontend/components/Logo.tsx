// frontend/components/Logo.tsx
import Image from "next/image";

export function Logo({ size = 140 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center">
      <Image
        src="/logo.png"
        alt="JYA Innersport"
        width={size}
        height={size}
        className="drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]"
        priority
      />
    </div>
  );
}

