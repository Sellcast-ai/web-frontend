import { redirect } from "next/navigation";
import { APP_HOME_HREF } from "@/lib/launch-routes";

export default function AppIndex() {
  redirect(APP_HOME_HREF);
}
