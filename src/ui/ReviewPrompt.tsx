import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { todayCivil } from "../calc/dates";
import { canAskForReview } from "../feedback/message";
import { onReviewMoment } from "../feedback/reviewBus";
import { requestStoreReview } from "../feedback/storeReview";
import { readReviewRecord, recordReviewAsk } from "../repo/reviewState";
import { useApp } from "../state/AppState";
import { useTheme } from "./theme";
import { Text } from "./text";

/** A rare pre-ask. It never opens on web, at launch, or while a shift form is open. */
export function ReviewPrompt() {
  const { db } = useApp();
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return onReviewMoment(() => {
      if (Platform.OS === "web" || !db) return;
      void readReviewRecord(db).then((record) => {
        if (!canAskForReview(record, todayCivil())) return;
        setOpen(true);
      });
    });
  }, [db]);

  const answer = async (enjoying: boolean) => {
    if (!db) return;
    await recordReviewAsk(db, todayCivil());
    setOpen(false);
    if (enjoying) {
      await requestStoreReview();
      return;
    }
    router.push("/feedback?kind=feedback");
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(20, 22, 16, 0.45)", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: palette.card, borderRadius: 18, padding: 20, gap: 12 }}>
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: "800" }}>Enjoying Tip Tracker?</Text>
          <Text style={{ color: palette.muted }}>A quick yes opens the store’s review box. Not really opens feedback instead.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Yes, enjoying the app" onPress={() => void answer(true)} style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary }}>
            <Text style={{ color: palette.onPrimary, fontWeight: "700" }}>Yes</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Not really" onPress={() => void answer(false)} style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line }}>
            <Text style={{ color: palette.text, fontWeight: "700" }}>Not really</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
