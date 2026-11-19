import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { includedLine, type DeviceContext } from "./message";

export { includedLine };
export type { DeviceContext };

export function readDeviceContext(): DeviceContext {
  const version = Application.nativeApplicationVersion || Constants.expoConfig?.version || "1.0.0";
  const platform = Platform.OS;
  const device = Device.modelName || Device.deviceName || "this device";
  const osName = Device.osName || platform;
  const osVersion = Device.osVersion || String(Platform.Version ?? "");
  return {
    version: version.startsWith("v") ? version : `v${version}`,
    platform,
    device,
    os: `${osName} ${osVersion}`.trim(),
  };
}
