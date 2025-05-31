import "@/App.css";
import { invoke } from "@tauri-apps/api/core";

function DebugPage() {
  const handleDebug = async () => {
    try {
      const result = await invoke("debug_hashmap");
      console.log("HashMap Debug Result:", result);
    } catch (error) {
      console.error("Error during HashMap debug:", error);
    }
  };
  return (
    <main className="main_container">
      <button
        onClick={() => {
          handleDebug();
        }}
      >
        HashMap Debug
      </button>
    </main>
  );
}

export default DebugPage;
