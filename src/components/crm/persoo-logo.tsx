import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
  wordmark?: boolean;
};

export function PersooLogo({
  size = 40,
  className,
  priority = false,
  wordmark = false,
}: Props) {
  return (
    <span className={cn("relative inline-block shrink-0 overflow-hidden", className)} style={{ width: wordmark ? size * 3 : size, height: size }}>
      <Image
        src="/persoo-brand.png"
        alt="PersooCRM"
        width={2172}
        height={724}
        className={wordmark ? "h-full w-full object-contain" : "absolute max-w-none"}
        style={wordmark ? undefined : { width: size * 5.1, height: size * 1.7, left: -size * 0.2, top: -size * 0.34 }}
        priority={priority}
      />
    </span>
  );
}
