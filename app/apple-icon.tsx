import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Same cell mark as app/icon.svg; iOS adds its own rounded corners, so the square is full-bleed. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0a0a" }}>
        <svg width="180" height="180" viewBox="0 0 32 32" fill="none" stroke="#d4ff3a" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.6 10.2 L5.6 5.4 M21.6 10.6 L26.6 5.8 M21.2 21 L26.4 26.4 M10.4 21.2 L5.4 26.6" strokeWidth="1.7" opacity="0.5" />
          <path
            d="M10.6 10.2 C13.6 7.6 19.2 7.8 21.6 10.6 C24 13.3 23.6 18.2 21.2 21 C18.6 23.9 13 24 10.4 21.2 C7.8 18.4 7.9 12.6 10.6 10.2 Z"
            strokeWidth="2.6"
          />
        </svg>
      </div>
    ),
    size,
  );
}
