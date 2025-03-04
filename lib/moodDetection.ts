import { type Song } from "@/types/song";

export type MusicMood = 
  | "energetic"
  | "calm"
  | "happy"
  | "melancholic"
  | "mysterious"
  | "romantic";

// Enhanced mood backgrounds with proper color stops for canvas gradients
export const moodBackgrounds: Record<MusicMood, {
  colors: [string, string];
  overlay: string;
  textColor: string;
}> = {
  energetic: {
    colors: ["#FF4B2B", "#FF416C"],
    overlay: "rgba(255, 75, 43, 0.3)",
    textColor: "text-orange-500"
  },
  calm: {
    colors: ["#2193b0", "#6dd5ed"],
    overlay: "rgba(33, 147, 176, 0.3)",
    textColor: "text-blue-400"
  },
  happy: {
    colors: ["#FFD93D", "#FF6B6B"],
    overlay: "rgba(255, 217, 61, 0.3)",
    textColor: "text-yellow-500"
  },
  melancholic: {
    colors: ["#614385", "#516395"],
    overlay: "rgba(97, 67, 133, 0.3)",
    textColor: "text-purple-500"
  },
  mysterious: {
    colors: ["#232526", "#414345"],
    overlay: "rgba(35, 37, 38, 0.3)",
    textColor: "text-gray-500"
  },
  romantic: {
    colors: ["#FF758C", "#FF7EB3"],
    overlay: "rgba(255, 117, 140, 0.3)",
    textColor: "text-pink-500"
  }
};

// Enhanced mood detection based on song title and artist
export function detectMood(song: Song): MusicMood {
  const text = `${song.title} ${song.artist}`.toLowerCase();

  if (text.match(/party|dance|beat|energy|power|rock|electronic/)) {
    return "energetic";
  }
  if (text.match(/love|heart|romance|kiss|sweet/)) {
    return "romantic";
  }
  if (text.match(/happy|joy|fun|smile|sunny|bright/)) {
    return "happy";
  }
  if (text.match(/sad|cry|tear|alone|lost|blue/)) {
    return "melancholic";
  }
  if (text.match(/dream|sleep|peace|quiet|gentle|ambient/)) {
    return "calm";
  }

  return "mysterious"; // default mood
}