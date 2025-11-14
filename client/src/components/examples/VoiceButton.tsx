import { VoiceButton } from "../VoiceButton";

export default function VoiceButtonExample() {
  return (
    <div className="flex items-center justify-center p-8">
      <VoiceButton 
        onRecordingChange={(recording) => console.log("Recording:", recording)}
        onTranscript={(text) => console.log("Transcript:", text)}
      />
    </div>
  );
}
