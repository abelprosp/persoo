import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function PersooLogo({
  size = 40,
  className,
  priority = false,
}: Props) {
  return (
    <Image
      src="/logo.png"
      alt="persooCRM"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
}
