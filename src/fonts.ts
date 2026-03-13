import {staticFile} from "remotion";

// Chesna Grotesk local font family name
export const chesnaGrotesk = "Chesna Grotesk";

// Load Chesna Grotesk locally via @font-face
const chesnaFontFaces = [
  {
    weight: "400",
    style: "normal",
    woff2: "Chesna Grotesk/Web Fonts/chesnagrotesk_regular_macroman/chesnagrotesk-regular-webfont.woff2",
    woff: "Chesna Grotesk/Web Fonts/chesnagrotesk_regular_macroman/chesnagrotesk-regular-webfont.woff",
  },
  {
    weight: "400",
    style: "italic",
    woff2: "Chesna Grotesk/Web Fonts/chesnagrotesk_italic_macroman/chesnagrotesk-regularitalic-webfont.woff2",
    woff: "Chesna Grotesk/Web Fonts/chesnagrotesk_italic_macroman/chesnagrotesk-regularitalic-webfont.woff",
  },
  {
    weight: "600",
    style: "normal",
    woff2: "Chesna Grotesk/Web Fonts/chesnagrotesk_semibold_macroman/chesnagrotesk-semibold-webfont.woff2",
    woff: "Chesna Grotesk/Web Fonts/chesnagrotesk_semibold_macroman/chesnagrotesk-semibold-webfont.woff",
  },
  {
    weight: "600",
    style: "italic",
    woff2: "Chesna Grotesk/Web Fonts/chesnagrotesk_semibolditalic_macroman/chesnagrotesk-semibolditalic-webfont.woff2",
    woff: "Chesna Grotesk/Web Fonts/chesnagrotesk_semibolditalic_macroman/chesnagrotesk-semibolditalic-webfont.woff",
  },
];

// Inject @font-face rules into the document
const injectChesnaFonts = () => {
  if (typeof document === "undefined") return;

  const style = document.createElement("style");
  const rules = chesnaFontFaces
    .map(
      (f) => `
@font-face {
  font-family: '${chesnaGrotesk}';
  src: url('${staticFile(f.woff2)}') format('woff2'),
       url('${staticFile(f.woff)}') format('woff');
  font-weight: ${f.weight};
  font-style: ${f.style};
  font-display: block;
}
`
    )
    .join("\n");

  style.textContent = rules;
  document.head.appendChild(style);
};

injectChesnaFonts();

// Both headline and body use Chesna Grotesk
// Headlines use semibold (600), body uses regular (400)
export const headlineFont = chesnaGrotesk;
export const bodyFont = chesnaGrotesk;
