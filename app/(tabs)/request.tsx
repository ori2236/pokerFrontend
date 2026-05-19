import { Redirect } from "expo-router";

export default function HiddenRequestTabRedirect() {
  return <Redirect href="/(tabs)/requests" />;
}
