import { Chat } from "@/components/copilotkit/chat";

export default function Home() {
  return (
    <div className="font-sans h-full">
      <main className="flex h-full">
        <div className="h-full w-1/3">
          <Chat />
        </div>
        <div className="flex-1">&nbsp;</div>
      </main>
    </div>
  );
}
