import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { SAMPLE_KROWD_STUB } from "../../src/calc/payStub";
import { extractImageText, extractPdfText } from "../../src/scan/extract";
import { setPendingScan } from "../../src/scan/pending";
import { Screen } from "../../src/ui/components";
import { useTheme } from "../../src/ui/theme";

export default function ScanStub() {
  const { palette } = useTheme();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const review = (text: string, photoDataUrl: string | null, source: "photo" | "pdf" | "sample") => {
    setPendingScan({ text, photoDataUrl, source });
    router.push("/stub/review");
  };

  const fromAsset = async (uri: string, keepPhoto: boolean) => {
    setError("");
    setStatus("Reading the photo on this device…");
    const response = await fetch(uri);
    const blob = await response.blob();
    const text = await extractImageText(blob);
    const photo = keepPhoto ? await blobToDataUrl(blob) : null;
    review(text, photo, "photo");
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is off. You can still choose a photo or a PDF.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    await fromAsset(result.assets[0].uri, true);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    await fromAsset(result.assets[0].uri, true);
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    setError("");
    setStatus("Reading the PDF on this device…");
    const response = await fetch(result.assets[0].uri);
    const text = await extractPdfText(await response.arrayBuffer());
    review(text, null, "pdf");
  };

  return (
    <Screen withHeader>
      <Text style={{ color: palette.text, fontSize: 18, lineHeight: 26 }}>
        The photo or PDF stays on this device. Nothing is uploaded, and nothing is saved until you confirm the review screen.
      </Text>
      <Action label="Take a photo" onPress={() => void takePhoto().catch((err: Error) => setError(err.message))} />
      <Action label="Choose a photo" onPress={() => void pickPhoto().catch((err: Error) => setError(err.message))} />
      <Action label="Import a PDF" onPress={() => void pickPdf().catch((err: Error) => setError(err.message))} />
      <Action label="Use a sample stub" onPress={() => review(SAMPLE_KROWD_STUB, null, "sample")} />
      <Action label="Past pay stubs" onPress={() => router.push("/stub")} />
      {status ? <Text style={{ color: palette.muted }}>{status}</Text> : null}
      {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
      {Platform.OS !== "web" ? (
        <Text style={{ color: palette.faint, fontSize: 13 }}>
          A store build can swap the reader for on-device Vision or ML Kit. This screen already calls that seam.
        </Text>
      ) : null}
    </Screen>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.card, borderWidth: 1, borderColor: palette.line }}>
      <Text style={{ color: palette.text, fontWeight: "700", fontSize: 17 }}>{label}</Text>
    </Pressable>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
