import Link from "next/link";

/**
 * The product's voice, in one place: the display serif is used for the
 * wordmark, hero lines and empty-state headlines, nowhere else.
 */
export default function Wordmark({ href = "/chat", size = "md" }) {
  const sizes = {
    md: "text-[26px]",
    lg: "text-[34px]",
    xl: "text-[52px] sm:text-[64px]",
  };

  return (
    <Link
      href={href}
      className={`font-display inline-block text-foreground ${sizes[size] ?? sizes.md}`}
    >
      Convoia
    </Link>
  );
}
