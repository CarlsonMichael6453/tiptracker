import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";
import { Roboto_400Regular, Roboto_700Bold } from "@expo-google-fonts/roboto";
import { SourceSerif4_400Regular, SourceSerif4_700Bold } from "@expo-google-fonts/source-serif-4";
import { IBMPlexSans_400Regular, IBMPlexSans_700Bold } from "@expo-google-fonts/ibm-plex-sans";
import { Nunito_400Regular, Nunito_700Bold } from "@expo-google-fonts/nunito";
import { Baloo2_400Regular, Baloo2_700Bold } from "@expo-google-fonts/baloo-2";
import { Fredoka_400Regular, Fredoka_700Bold } from "@expo-google-fonts/fredoka";
import { ComicNeue_400Regular, ComicNeue_700Bold } from "@expo-google-fonts/comic-neue";

/** Loads the OFL faces used by Appearance. The app still renders with the system font until they arrive. */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Roboto_400Regular,
    Roboto_700Bold,
    SourceSerif4_400Regular,
    SourceSerif4_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_700Bold,
    Nunito_400Regular,
    Nunito_700Bold,
    Baloo2_400Regular,
    Baloo2_700Bold,
    Fredoka_400Regular,
    Fredoka_700Bold,
    ComicNeue_400Regular,
    ComicNeue_700Bold,
  });
  return loaded;
}
