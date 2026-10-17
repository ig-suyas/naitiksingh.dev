import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Film-leader reticle with a warm sweep, matching the favicon. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#06060a",
      }}
    >
      <svg width="150" height="150" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r="21"
          fill="none"
          stroke="#ece6da"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        <path
          d="M32 6v9M32 49v9M6 32h9M49 32h9"
          stroke="#ece6da"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        <path d="M32 32 L32 11 A21 21 0 0 1 52.2 26.3 Z" fill="#e8a84b" fillOpacity="0.85" />
        <circle cx="32" cy="32" r="3.2" fill="#e8a84b" />
      </svg>
    </div>,
    size,
  );
}
