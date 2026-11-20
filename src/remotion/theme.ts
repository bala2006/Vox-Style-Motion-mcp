import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadCourier } from "@remotion/google-fonts/CourierPrime";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const playfair = loadPlayfair("italic", { weights: ["400", "700", "900"], subsets: ["latin"] });
const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const courier = loadCourier("normal", { weights: ["400", "700"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

export const FONT = {
  headline: `${playfair.fontFamily}, Georgia, serif`,
  number: `${anton.fontFamily}, Impact, sans-serif`,
  typewriter: `${courier.fontFamily}, "Courier New", monospace`,
  /** Plain UI sans for quoted prompts, app text and captions inside cards. */
  ui: `${inter.fontFamily}, system-ui, sans-serif`,
};

export const C = {
  paper: "#EBE5DC",
  vignetteMid: "#D4CEC2",
  vignetteCorner: "#BDB5AA",
  ink: "#171310",
  inkSoft: "#3A3530",
  red: "#D2251D",
  redDark: "#7A1612",
  yellow: "#F1D01A",
  grey: "#756F6A",
  greyText: "#8A847D",
  pale: "#B9B2A8",
  card: "#F7F3EB",
  tag: "#F4F0E9",
  white: "#FFFFFF",
  black: "#000000",
  onBlack: "#F3F0EB",
  onBlackDim: "#736F6B",
  green: ["#385127", "#4E6A36", "#597346", "#6B8954", "#8AB582"],
  // Screen boxes (app window chrome) and terminals
  app: "#1F1E1D",
  appBar: "#2A2927",
  urlPill: "#1A1918",
  urlText: "#B9B4AC",
  term: "#151413",
  termText: "#E8E3DA",
  termDim: "#8A847D",
  ok: "#9BC27A",
  bad: "#FF5A4E",
  tape: "rgba(232,222,196,0.82)",
};

const NAMED: Record<string, string> = {
  ink: C.ink, inkSoft: C.inkSoft, red: C.red, yellow: C.yellow, grey: C.grey, gray: C.grey, greyText: C.greyText,
  card: C.card, white: C.white, black: C.black, onBlack: C.onBlack, paper: C.paper, pale: C.pale,
  dark: C.term, ok: C.ok, bad: C.bad,
};

export const col = (name: string | undefined, fallback: string) => (name ? NAMED[name] ?? name : fallback);
