import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { FEEDBACK_EMAIL } from "../src/config/feedback";
import { readDeviceContext } from "../src/feedback/deviceInfo";
import { buildFeedbackMail, includedLine, type FeedbackKind } from "../src/feedback/message";
import { Screen } from "../src/ui/components";
import { useTheme } from "../src/ui/theme";
import { Text, TextInput } from "../src/ui/text";

export default function FeedbackScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { palette } = useTheme();
  const context = useMemo(() => readDeviceContext(), []);
  const included = includedLine(context);
  const [kind, setKind] = useState<FeedbackKind>(params.kind === "bug" ? "bug" : "feedback");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const mail = buildFeedbackMail(FEEDBACK_EMAIL, {
    kind,
    rating: rating || 0,
    message,
    replyTo,
    included,
    version: context.version,
  });

  const copy = async () => {
    const text = `${mail.subject}\n\n${mail.body}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setNote(`Copied. Paste it into a message to ${FEEDBACK_EMAIL}.`);
      return;
    }
    setNote("Couldn’t copy from this device.");
  };

  const submit = async () => {
    if (rating < 1) {
      setError("Pick a rating from 1 to 5.");
      return;
    }
    if (message.trim().length < 1) {
      setError("Add a short note.");
      return;
    }
    if (replyTo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo.trim())) {
      setError("That reply-to email doesn’t look right, or leave it blank.");
      return;
    }
    setError("");
    try {
      await Linking.openURL(mail.url);
      setNote(Platform.OS === "web" ? "If your mail app didn’t open, copy the note." : "Opened your mail app.");
    } catch {
      if (Platform.OS === "web") {
        await copy();
        return;
      }
      setNote("Couldn’t open a mail app.");
    }
  };

  return (
    <Screen withHeader>
      <Text style={{ color: palette.text, fontSize: 22, fontWeight: "800" }}>Send feedback</Text>
      <Text style={{ color: palette.muted }}>Your shifts and earnings stay on this device. This note does not include them.</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Choice label="Feedback" selected={kind === "feedback"} onPress={() => setKind("feedback")} />
        <Choice label="Report a bug" selected={kind === "bug"} onPress={() => setKind("bug")} />
      </View>
      <Text style={{ color: palette.muted, fontWeight: "600" }}>Rating</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} accessibilityRole="button" accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`} onPress={() => setRating(star)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: rating >= star ? palette.primary : palette.card, borderWidth: 1, borderColor: palette.line }}>
            <Text style={{ color: rating >= star ? palette.onPrimary : palette.text, fontWeight: "800" }}>{star}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: palette.muted, fontWeight: "600" }}>Note</Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        multiline
        accessibilityLabel="Feedback note"
        style={{ minHeight: 120, borderWidth: 1, borderColor: palette.line, borderRadius: 12, padding: 12, color: palette.text, backgroundColor: palette.input, fontSize: 17, textAlignVertical: "top" }}
      />
      <Text style={{ color: palette.muted, fontWeight: "600" }}>Reply-to email, optional</Text>
      <TextInput
        value={replyTo}
        onChangeText={setReplyTo}
        keyboardType="email-address"
        autoCapitalize="none"
        accessibilityLabel="Reply-to email"
        style={{ minHeight: 48, borderWidth: 1, borderColor: palette.line, borderRadius: 12, paddingHorizontal: 12, color: palette.text, backgroundColor: palette.input, fontSize: 17 }}
      />
      <Text style={{ color: palette.faint, fontSize: 13 }}>Included: {included}</Text>
      {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
      {note ? <Text style={{ color: palette.text }}>{note}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Submit feedback" onPress={() => void submit()} style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary }}>
        <Text style={{ color: palette.onPrimary, fontWeight: "700", fontSize: 17 }}>Submit</Text>
      </Pressable>
      {Platform.OS === "web" ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Copy to clipboard" onPress={() => void copy()} style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line }}>
          <Text style={{ color: palette.text, fontWeight: "700" }}>Copy to clipboard</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={{ flex: 1, minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: selected ? palette.primary : palette.card, borderWidth: 1, borderColor: palette.line }}>
      <Text style={{ color: selected ? palette.onPrimary : palette.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
