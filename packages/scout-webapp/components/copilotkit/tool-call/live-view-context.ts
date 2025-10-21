import { createContext } from "react";

export interface LiveViewContextValue {
  liveViewUrl?: string;
  sessionId?: string;
}

export const LiveViewContext = createContext<LiveViewContextValue>({});
