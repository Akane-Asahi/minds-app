import { useEffect } from "react";
import { installWorkspaceScrollRouting } from "../utils/workspaceScrollRouting";

/** Enable workspace wheel routing for the lifetime of the workspace page. */
export default function useWorkspaceScrollRouting() {
  useEffect(() => installWorkspaceScrollRouting(), []);
}
