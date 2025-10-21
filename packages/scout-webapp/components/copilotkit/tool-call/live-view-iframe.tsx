import { useContext } from "react";
import { LiveViewContext } from "./live-view-context";

export const LiveViewIframe = () => {
  const { liveViewUrl, sessionId } = useContext(LiveViewContext);
  return (
    <div className="flex items-center justify-center overflow-hidden w-full h-full">
      <iframe key={sessionId} src={liveViewUrl} className={`w-full h-full`} />
    </div>
  );
};
