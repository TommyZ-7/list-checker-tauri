import "./App.css";
import { Button } from "@yamada-ui/react";
import { Link } from "react-router";
import { invoke } from "@tauri-apps/api/core";

function App() {
  return (
    <main className="">
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Button as={Link} to="/create-room">
          ルームを作成
        </Button>
        <Button as={Link} to="/join-room">
          ルームに参加
        </Button>
        <Button as={Link} to="/debug">
          debug
        </Button>
        <Button
          onClick={async () => {
            try {
              const result = await invoke("debug_run_server");
              console.log("Server Test Result:", result);
            } catch (error) {
              console.error("Error during server test:", error);
            }
          }}
        >
          サーバーテスト
        </Button>
      </div>
    </main>
  );
}

export default App;
