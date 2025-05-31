import "./App.css";
import { Button } from "@yamada-ui/react";
import { Link } from "react-router";

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
      </div>
    </main>
  );
}

export default App;
