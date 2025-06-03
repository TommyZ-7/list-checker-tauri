import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { UIProvider } from "@yamada-ui/react";
import { BrowserRouter, Routes, Route } from "react-router";

const CreateRoomMain = React.lazy(() => import("./create-room/main/page"));
const JoinRoom = React.lazy(() => import("./join-room/page"));
const DebugPage = React.lazy(() => import("./debug/page"));
const EventPage = React.lazy(() => import("./event/page"));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <UIProvider>
      <BrowserRouter>
        <React.Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route index element={<App />} />

            <Route path="create-room">
              <Route path="main/:mode" element={<CreateRoomMain />} />
            </Route>

            <Route path="join-room" element={<JoinRoom />} />

            <Route path="event/:uuid/:isHost/:domain" element={<EventPage />} />

            <Route path="debug" element={<DebugPage />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </UIProvider>
  </React.StrictMode>
);
