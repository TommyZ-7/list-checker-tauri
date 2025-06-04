import "./App.css";
import { useState } from "react";
import {
  Wifi,
  MonitorSpeaker,
  ArrowLeft,
  Users,
  Calendar,
  Share2,
  FileJson,
  ListCheck,
  ListPlus,
  ListTodo,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@yamada-ui/react";

type serverInfo = {
  domain: string;
  port: number;
  uuid: string;
};

function App() {
  const [currentView, setCurrentView] = useState("main");
  const [selectedIcon, setSelectedIcon] = useState<IconType | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [serverInfo, setServerInfo] = useState<serverInfo>({
    domain: "",
    port: 12345,
    uuid: "",
  });

  const navigate = useNavigate();

  type MenuType = "main" | "event" | "join" | "modes";
  type IconType = "monitor" | "wifi";

  const modes = [
    {
      id: "check",
      title: "リストチェックモード",
      description:
        "リストのチェックのみを行います。リストに登録されていない参加者は登録できません",
      icon: ListCheck,
      features: [
        "お笑いライブ(当日参加受付時間前)",
        "トークショー(当日参加受付時間前)",
        "...",
      ],
      gifUrl: "/public/test.jpg",
      color: "bg-indigo-500",
    },
    {
      id: "all",
      title: "受付モード",
      description: "リストのチェック、およびリスト外の参加者を受け付けます。",
      icon: ListTodo,
      features: ["お笑いライブ", "トークショー", "..."],
      gifUrl: "/public/test.jpg",
      color: "bg-emerald-600",
    },
    {
      id: "regist",
      title: "受付モード",
      description: "リストを読み込まず、登録のみを行います。",
      icon: ListPlus,
      features: ["春祭り"],
      gifUrl: "/public/test.jpg",
      color: "bg-yellow-500",
    },
    {
      id: "soukai",
      title: "定期学生総会用モード",
      description: "動作と表記を定期学生総会用に最適化します。",
      icon: Users,
      features: ["定期学生総会"],
      gifUrl: "/public/test.jpg",
      color: "bg-red-600",
    },
  ];

  const handleMenuClick = (menuType: MenuType, icon: IconType) => {
    setSelectedIcon(icon);
    setIsAnimating(true);

    // フェードアウト完了後にビューを切り替え、その後フェードイン
    setTimeout(() => {
      setCurrentView(menuType);
      // 少し遅延してフェードインを開始
      setTimeout(() => {
        setIsAnimating(false);
      }, 50);
    }, 300);
  };

  const handleBack = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentView("main");
      setSelectedIcon(null);
      setTimeout(() => {
        setIsAnimating(false);
      }, 50);
    }, 300);
  };
  const handlePageChange = (page: string) => {
    setIsAnimating(true);
    setTimeout(() => {
      navigate(page);
    }, 300);
  };

  const renderModeSelector = () => (
    <div
      className={`min-h-screen  p-6 transition-all duration-300 ease-in-out ${
        isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            出席管理システム
          </h1>
          <p className="text-lg text-gray-600">
            イベントの動作モードを選択してください
          </p>
          <div className="text-center  text-sm text-gray-500">
            モードは後から変更することも可能です
          </div>
        </div>

        {/* モード選択カード */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          {modes.map((mode) => {
            const IconComponent = mode.icon;

            return (
              <div
                key={mode.id}
                className={`
                    relative cursor-pointer transition-all duration-300 transform h-full shadow-lg hover:shadow-xl
   
                  `}
              >
                <div
                  className={`
                    bg-white rounded-xl p-6 h-full
  
                  `}
                >
                  {/* アイコンとタイトル */}
                  <div className="flex items-center mb-4">
                    <div
                      className={`
                        ${mode.color} rounded-lg p-3 mr-4
                      `}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {mode.title}
                    </h3>
                  </div>

                  {/* 説明 */}
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    {mode.description}
                  </p>

                  {/* 機能リスト */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      使用イベント例:
                    </h4>
                    <ul className="space-y-1">
                      {mode.features.map((feature, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-600 flex items-center"
                        >
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    onClick={() =>
                      handlePageChange(`/create-room/main/${mode.id}/`)
                    }
                    className="w-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    このモードで進む
                  </Button>

                  {/* 選択インジケーター */}
                </div>
              </div>
            );
          })}
        </div>

        {/* フッター */}
      </div>
    </div>
  );

  const renderEventMenu = () => (
    <div
      className={`flex flex-col items-center justify-center h-screen transition-all duration-300 ease-in-out ${
        isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center mb-8">イベントを作成</h2>

        <div className="grid grid-cols-1 gap-4">
          <button onClick={() => handleMenuClick("modes", "monitor")}>
            <div className="flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer">
              <Calendar className="w-8 h-8 text-blue-500 mr-4" />
              <div>
                <h3 className="font-semibold">新しいイベント</h3>
                <p className="text-sm text-gray-600">
                  新規イベントを作成します
                </p>
              </div>
            </div>
          </button>

          <div className="flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer">
            <FileJson className="w-8 h-8 text-green-500 mr-4" />
            <div>
              <h3 className="font-semibold">ファイルからインポート</h3>
              <p className="text-sm text-gray-600">
                ファイルからイベントを読み込みます
              </p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer">
            <Share2 className="w-8 h-8 text-purple-500 mr-4" />
            <div>
              <h3 className="font-semibold">共有設定</h3>
              <p className="text-sm text-gray-600">招待リンクを作成</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderJoinMenu = () => (
    <div
      className={`flex flex-col items-center justify-center h-screen transition-all duration-300 ease-in-out ${
        isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center mb-8">ルームに参加</h2>

        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer">
            <Wifi className="w-8 h-8 text-blue-500 mr-4" />
            <div>
              <h3 className="font-semibold">QRコードでスキャン</h3>
              <p className="text-sm text-gray-600">QRコードを読み取って参加</p>
            </div>
          </div>

          <div className="flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer">
            <Users className="w-8 h-8 text-orange-500 mr-4" />
            <div>
              <h3 className="font-semibold">ルームIDで参加</h3>
              <p className="text-sm text-gray-600">IDを入力して参加する</p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg shadow-md">
            <div className="text-lg text-gray-500 mb-2">
              <input
                value={serverInfo.uuid}
                onChange={(e) =>
                  setServerInfo({ ...serverInfo, uuid: e.target.value })
                }
                type="text"
                placeholder="ルームIDを入力してください"
                className="w-full px-3 py-2 m-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-lg text-gray-500 mb-2">
              <input
                value={serverInfo.domain}
                onChange={(e) =>
                  setServerInfo({ ...serverInfo, domain: e.target.value })
                }
                type="text"
                placeholder="ドメインを入力してください"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-lg text-gray-500 mb-2">
              <input
                value={serverInfo.port}
                onChange={(e) =>
                  setServerInfo({
                    ...serverInfo,
                    port: parseInt(e.target.value),
                  })
                }
                type="number"
                placeholder="ポート番号を入力してください"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-sm text-gray-500 mt-2">
              <Button
                onClick={() => {
                  if (
                    !serverInfo.uuid ||
                    !serverInfo.domain ||
                    !serverInfo.port
                  ) {
                    alert("すべてのフィールドを入力してください");
                    return;
                  }
                  handlePageChange(
                    `/event/${serverInfo.uuid}/false/${serverInfo.domain}:${serverInfo.port}`
                  );
                }}
                className="m-5 w-full bg-blue-500 text-white hover:bg-blue-600 transition-colors py-2 rounded-md"
              >
                参加する
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMainMenu = () => (
    <div
      className={`flex flex-col items-center justify-center h-screen gap-4 transition-all duration-300 ease-in-out ${
        isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <div className="grid grid-cols-2 gap-4">
        <div
          className="flex flex-col items-center justify-center p-4 bg-gray-200 rounded-lg shadow-md hover:bg-gray-300 transition-all duration-200 cursor-pointer transform hover:scale-105"
          onClick={() => handleMenuClick("event", "monitor")}
        >
          <MonitorSpeaker className="w-24 h-24 text-blue-500 m-10" />
          <span className="mt-2 text-lg font-semibold">イベントを作成する</span>
        </div>
        <div
          className="flex flex-col items-center justify-center p-4 bg-gray-200 rounded-lg shadow-md hover:bg-gray-300 transition-all duration-200 cursor-pointer transform hover:scale-105"
          onClick={() => handleMenuClick("join", "wifi")}
        >
          <Wifi className="w-24 h-24 text-blue-500 m-10" />
          <span className="mt-2 text-lg font-semibold">ルームに参加する</span>
        </div>
      </div>
    </div>
  );

  return (
    <main className="custom_font bg-gray-50 min-h-screen relative">
      {/* 右上に移動するアイコン */}
      {selectedIcon && currentView !== "main" && (
        <div className="fixed top-4 right-4 z-10">
          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-md">
            {selectedIcon === "monitor" ? (
              <MonitorSpeaker className="w-6 h-6 text-blue-500" />
            ) : (
              <Wifi className="w-6 h-6 text-blue-500" />
            )}
          </div>
        </div>
      )}

      {/* 戻るボタン */}
      {currentView !== "main" && (
        <div className="fixed top-4 left-4 z-10 bg-white">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 "
            style={{
              borderRadius: "8px",
            }}
          >
            <ArrowLeft className="w-9 h-9 -2 text-gray-600" />
            <span className="text-sm font-medium m-2">戻る</span>
          </button>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="relative">
        {currentView === "main" && renderMainMenu()}
        {currentView === "event" && renderEventMenu()}
        {currentView === "join" && renderJoinMenu()}
        {currentView === "modes" && renderModeSelector()}
      </div>
    </main>
  );
}

export default App;
