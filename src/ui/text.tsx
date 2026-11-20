import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from "react-native";
import { appliedFontFamily } from "./colorThemes";
import { useTheme } from "./theme";

/** Every label, number, and button title goes through this so the profile font covers the app. */
export function Text({ style, ...rest }: TextProps) {
  const { appearance } = useTheme();
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const family = appliedFontFamily(appearance.font, flat);
  const explicit = typeof flat?.fontFamily === "string" && flat.fontFamily.length > 0;
  return <RNText {...rest} style={[style, !explicit && family ? { fontFamily: family } : null]} />;
}

/** Fields use the same face as the rest of the screen, including money inputs. */
export function TextInput({ style, ...rest }: TextInputProps) {
  const { appearance } = useTheme();
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const family = appliedFontFamily(appearance.font, flat);
  const explicit = typeof flat?.fontFamily === "string" && flat.fontFamily.length > 0;
  return <RNTextInput {...rest} style={[style, !explicit && family ? { fontFamily: family } : null]} />;
}
