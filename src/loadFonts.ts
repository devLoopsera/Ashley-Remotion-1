import {continueRender, delayRender, staticFile} from "remotion";
import {useEffect, useState} from "react";

export const CHESNA = "Chesna Grotesk";

const fontVariants = [
  {
    weight: "400",
    style: "normal",
    src: staticFile(
      "Chesna Grotesk/Web Fonts/chesnagrotesk_regular_macroman/chesnagrotesk-regular-webfont.woff2"
    ),
  },
  {
    weight: "600",
    style: "normal",
    src: staticFile(
      "Chesna Grotesk/Web Fonts/chesnagrotesk_semibold_macroman/chesnagrotesk-semibold-webfont.woff2"
    ),
  },
];

const loadChesnaFont = async (): Promise<void> => {
  await Promise.all(
    fontVariants.map(async ({weight, style, src}) => {
      const font = new FontFace(CHESNA, `url(${src})`, {weight, style});
      await font.load();
      (document.fonts as unknown as {add: (f: FontFace) => void}).add(font);
    })
  );
};

export const useFonts = (): boolean => {
  const [loaded, setLoaded] = useState(false);
  const [handle] = useState(() => delayRender("Loading Chesna Grotesk font"));

  useEffect(() => {
    loadChesnaFont()
      .then(() => {
        setLoaded(true);
        continueRender(handle);
      })
      .catch((err) => {
        console.error("Font load error:", err);
        continueRender(handle);
      });
  }, [handle]);

  return loaded;
};
