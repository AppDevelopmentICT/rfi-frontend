import Link from "next/link";
import { Button } from "@/components/ui/button";

type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

interface ActionButtonsProps {
  size?: ButtonSize;
  className?: string;
  buttonClassName?: string;
}

export function ActionButtons({
  size = "sm",
  className,
  buttonClassName,
}: ActionButtonsProps) {
  return (
    <div className={["flex gap-2", className].filter(Boolean).join(" ")}>
      <Link href="/rfi/upload">
        <Button variant="outline" size={size} className={buttonClassName}>
          Upload RFI
        </Button>
      </Link>
      <Link href="/rfp/upload">
        <Button size={size} className={buttonClassName}>
          New RFP
        </Button>
      </Link>
    </div>
  );
}
