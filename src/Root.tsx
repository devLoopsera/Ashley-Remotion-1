import React from "react";
import {Composition} from "remotion";
import {AshleyBedroom} from "./AshleyBedroom";
import {EndCard24682} from "./scenes/EndCard24682";
import {EndCard24712} from "./scenes/EndCard24712";
import {EndCardTemplate} from "./scenes/EndCardTemplate";
import {FPS, TOTAL_FRAMES} from "./constants";
import {DelRioCard} from "./scenes/Generated_DelRioCard";
import {EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169} from "./scenes/Generated_EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169";
import {TestCard} from "./scenes/Generated_TestCard";
import {Q2AHSNATMemorialDayWeek4SocialHorzVideo15169FurnUq5fi9} from "./scenes/Generated_Q2AHSNATMemorialDayWeek4SocialHorzVideo15169FurnUq5fi9";
import {EndCard02TEMASHLDECustomSupportTVTemplate15sA01Xnwae9} from "./scenes/Generated_EndCard02TEMASHLDECustomSupportTVTemplate15sA01Xnwae9";
import {EndCard03SEAASHBedAchesCustomizations202515sTVSpotRoomSceneA01V1elp7} from "./scenes/Generated_EndCard03SEAASHBedAchesCustomizations202515sTVSpotRoomSceneA01V1elp7";
import {Q2AGRNATPRTempurBreezeEVGTVYTMattress30sENG1080x1080Nzlmn9} from "./scenes/Generated_Q2AGRNATPRTempurBreezeEVGTVYTMattress30sENG1080x1080Nzlmn9";
import {Gap3jy} from "./scenes/Generated_Gap3jy";
import {Dedluo} from "./scenes/Generated_Dedluo";
import {AHSEndCardWipeTransitionVERTSPAN} from "./scenes/Generated_AHSEndCardWipeTransitionVERTSPAN";
import {LogoValidation} from "./LogoValidation";
import {AHSEndCardWipeTransitionVERTSPAN1} from "./scenes/Generated_AHSEndCardWipeTransitionVERTSPAN1";

const DEFAULT_DISCLAIMER =
  "Ashley stores are independently owned and operated. ©2024 Rogers Furniture, DBA Ashley. All rights reserved. Furniture since 1945.";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AshleyBedroom"
        component={AshleyBedroom}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Ashley24682EndCard"
        component={EndCard24682}
        durationInFrames={150}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="Ashley24712EndCard"
        component={EndCard24712}
        durationInFrames={150}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="AshleyEndCard"
        component={EndCardTemplate}
        durationInFrames={150}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: "Shop More Deals In-Store",
          locations: [
            {city: "Marquette", address: "2152 US Hwy 41 W"},
            {city: "Escanaba", address: "2222 North Lincoln Road"},
          ],
          disclaimer: DEFAULT_DISCLAIMER,
        }}
      />
      <Composition
        id="DelRioCard"
        component={DelRioCard}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: "SHOP MORE DEALS IN STORE AND ONLINE",
          locations: [
                    {
                              "city": "City Name",
                              "address": "Street Address"
                    }
          ],
          disclaimer: "Ashley stores are independently owned and operated. ©2026 PLR FURNITURE, INC., DBA Ashley. All rights reserved. Expiration date 3/31/2026.",
        }}
      />
      <Composition
        id="EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169"
        component={EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          locations: [
            {
              "address": "Street Address",
              "city": "City, State Zip",
              "phone": "(000) 000-0000"
            }
          ],
        }}
      />
      <Composition
        id="TestCard"
        component={TestCard}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: "Shop More Deals In-Store",
          locations: [
                    {
                              "city": "City Name",
                              "address": "Street Address"
                    }
          ],
          disclaimer: "Ashley stores are independently owned and operated. ©2024 Rogers Furniture, DBA Ashley. All rights reserved. Furniture since 1945.",
        }}
      />
      <Composition
        id="Q2AHSNATMemorialDayWeek4SocialHorzVideo15169FurnUq5fi9"
        component={Q2AHSNATMemorialDayWeek4SocialHorzVideo15169FurnUq5fi9}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          disclaimer: "©2022 Ashley Furniture Industries, LLC. All rights reserved.",
        }}
      />
      <Composition
        id="EndCard02TEMASHLDECustomSupportTVTemplate15sA01Xnwae9"
        component={EndCard02TEMASHLDECustomSupportTVTemplate15sA01Xnwae9}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: "shop in-store • online",
        }}
      />
      <Composition
        id="EndCard03SEAASHBedAchesCustomizations202515sTVSpotRoomSceneA01V1elp7"
        component={EndCard03SEAASHBedAchesCustomizations202515sTVSpotRoomSceneA01V1elp7}
        durationInFrames={510}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: "shop in-store & online",
          disclaimer: "Powered by Sleeptracker-AI®.",
        }}
      />
      <Composition
        id="Q2AGRNATPRTempurBreezeEVGTVYTMattress30sENG1080x1080Nzlmn9"
        component={Q2AGRNATPRTempurBreezeEVGTVYTMattress30sENG1080x1080Nzlmn9}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: "shop in-store & online",
          disclaimer: "Powered by Sleeptracker-AI®.",
        }}
      />
      <Composition
        id="Gap3jy"
        component={Gap3jy}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: "SHOP MORE DEALS IN STORE",
          locations: [
            {
              "city": "MARQUETTE",
              "address": "2152 US Hwy 41 W"
            },
            {
              "city": "ESCANABA",
              "address": "2222 North Lincoln Road"
            }
          ],
          disclaimer: "Ashley stores are independently owned and operated. ©2026 Roger's Furniture, DBA Ashley. All rights reserved. Expiration date 3/30/2026",
        }}
      />
      <Composition
        id="Dedluo"
        component={Dedluo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          locations: [
            {
              "address": "Street Address",
              "city": "City, State Zip",
              "phone": "(000) 000-0000"
            }
          ],
        }}
      />
      <Composition
        id="AHSEndCardWipeTransitionVERTSPAN"
        component={AHSEndCardWipeTransitionVERTSPAN}
        durationInFrames={118}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          disclaimer: "© 2024 Ashley Global Retail, LLC. Todos los derechos reservados.",
        }}
      />
      <Composition
        id="LogoValidation"
        component={LogoValidation}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="AHSEndCardWipeTransitionVERTSPAN1"
        component={AHSEndCardWipeTransitionVERTSPAN1}
        durationInFrames={236}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          tagline: "COMPRA EN TIENDA Y EN LÍNEA",
          disclaimer: "© 2024 Ashley Global Retail, LLC. Todos los derechos reservados.",
        }}
      />
    </>
  );
};
