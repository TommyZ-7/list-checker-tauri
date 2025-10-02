import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { UIProvider } from "@yamada-ui/react";
import { BrowserRouter, Routes, Route } from "react-router";

const CreateRoomMain = React.lazy(() => import("./create-room/main/page"));
const JoinRoom = React.lazy(() => import("./join-room/page"));
const DebugPage = React.lazy(() => import("./debug/page"));
const MonitorPage = React.lazy(() => import("./event/monitor-page-new"));
const EventListPage = React.lazy(() => import("./event-list/page"));
const ImportEvent = React.lazy(() => import("./import-event/page"));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <UIProvider>
      <BrowserRouter>
        <React.Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold text-gray-700">Loading...</h2>
              </div>
            </div>
          }
        >
          <Routes>
            <Route index element={<App />} />

            <Route path="create-room">
              <Route path="main/:mode" element={<CreateRoomMain />} />
            </Route>

            <Route path="join-room" element={<JoinRoom />} />

            <Route path="monitor/:uuid/:domain" element={<MonitorPage />} />

            <Route path="event-list" element={<EventListPage />} />

            <Route path="import-event" element={<ImportEvent />} />

            <Route path="debug" element={<DebugPage />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </UIProvider>
  </React.StrictMode>
);
