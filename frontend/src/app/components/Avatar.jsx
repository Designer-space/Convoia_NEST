import Image from "next/image";
import placeholder from "../../../public/profile.webp";

/*
 next.config.mjs only allows res.cloudinary.com through the image optimiser, so
 an avatar is routed by host: local assets and Cloudinary URLs go through
 next/image (sized, optimised, no layout shift), anything else is rendered
 directly rather than throwing at runtime.
*/
const OPTIMISED = /^(https:\/\/res\.cloudinary\.com\/|\/)/;

export default function Avatar({ src, size = 44, className = "" }) {
  const box = { width: size, height: size };

  if (src && OPTIMISED.test(src)) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        style={box}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- host is not in images.remotePatterns
      <img
        src={src}
        alt=""
        style={box}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <Image
      src={placeholder}
      alt=""
      width={size}
      height={size}
      style={box}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  );
}
