import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { UIProvider } from "@yamada-ui/react";
import { BrowserRouter, Routes, Route } from "react-router";

const CreateRoom = React.lazy(() => import("./create-room/page"));
const CreateRoomMain = React.lazy(() => import("./create-room/main/page"));
const JoinRoom = React.lazy(() => import("./join-room/page"));
const DebugPage = React.lazy(() => import("./debug/page"));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <UIProvider>
      <BrowserRouter>
        <React.Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route index element={<App />} />

            <Route path="create-room">
              <Route index element={<CreateRoom />} />
              <Route path="main" element={<CreateRoomMain />} />
            </Route>

            <Route path="join-room" element={<JoinRoom />} />

            <Route path="debug" element={<DebugPage />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </UIProvider>
  </React.StrictMode>
);
