import "./App.css";
import { useState, useEffect } from "react";
import {
  MonitorSpeaker,
  ArrowLeft,
  Users,
  Calendar,
  FileJson,
  ListCheck,
  ListPlus,
  ListTodo,
  Info,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@yamada-ui/react";
import { invoke } from "@tauri-apps/api/core";

type parsedJsonData = {
  attendees: { id: string; attended: boolean }[];
  today: { id: string }[];
  roomSettings: {
    eventname: string;
    eventinfo: string;
    arrowtoday: boolean;
    autotodayregister: boolean;
    soukai: boolean;
    nolist: boolean;
  };
};

// A badge for displaying attendance status
const StatusBadge = ({ attended }: { attended: boolean }) => (
  <span
    className={`px-3 py-1 text-xs font-semibold rounded-full ${
      attended ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
    }`}
  >
    {attended ? "出席" : "欠席"}
  </span>
);

// A card for displaying information sections
const InfoCard = ({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  </div>
);

function App() {
  const [currentView, setCurrentView] = useState("main");
  const [selectedIcon, setSelectedIcon] = useState<IconType | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [serverRunning, setServerRunning] = useState(false);
  const [localIP, setLocalIP] = useState<string>("");
  const serverPort = 50345;
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [jsonData, setJsonData] = useState<parsedJsonData>({
    attendees: [],
    today: [],
    roomSettings: {
      eventname: "",
      eventinfo: "",
      arrowtoday: false,
      autotodayregister: false,
      soukai: false,
      nolist: false,
    },
  });
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  const navigate = useNavigate();

  type MenuType = "main" | "event" | "join" | "modes" | "loadJson";
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
      description:
        "動作と表記を定期学生総会用に最適化します。また、委任状集計用のExcelファイルをそのまま読み込めるように動作を変更します。",
      icon: Users,
      features: ["定期学生総会"],
      gifUrl: "/public/test.jpg",
      color: "bg-red-600",
    },
  ];

  useEffect(() => {
    // 初期状態でメインビューを表示
    const fetchServerState = async () => {
      const serverState = await invoke("server_check");
      setServerRunning(serverState as boolean);
    };

    const fetchLocalIP = async () => {
      const result = await invoke("get_local_ip");
      setLocalIP(result as string);
    };

    fetchServerState();
    fetchLocalIP();
  }, []);

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

  const handleLoadJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsRegistering(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsedData = JSON.parse(e.target?.result as string);
          console.log("Loaded JSON data:", parsedData);
          console.log("Parsed JSON Data:", parsedData);

          const sendData = JSON.stringify({
            eventname: parsedData.roomSettings.eventname,
            eventinfo: parsedData.roomSettings.eventinfo,
            participants: parsedData.attendees.map(
              (attendee: any) => attendee.id
            ),
            arrowtoday: parsedData.roomSettings.arrowtoday,
            autotodayregister: parsedData.roomSettings.autotodayregister,
            soukai: parsedData.roomSettings.soukai,
            nolist: parsedData.roomSettings.nolist,
          });
          let count = 0;
          const sendAttendees = [];
          for (const attendee of parsedData.attendees) {
            if (attendee.attended) {
              sendAttendees.push(count);
            }
            count++;
          }
          console.log("参加者のID:", sendAttendees);
          const sendToday = parsedData.today.map(
            (attendee: any) => attendee.id
          );

          console.log("送信するデータ:", {
            info: sendData,
            attendees: sendAttendees,
            today: sendToday,
          });

          setJsonData((prev) => ({
            ...prev,
            attendees: parsedData.attendees,
            today: parsedData.today,
            roomSettings: parsedData.roomSettings,
          }));
          const result1 = await invoke("register_event", { data: sendData });
          console.log("登録イベントのUUID:", result1 as string);
          const result2 = await invoke("json_to_attendees", {
            data: {
              attendeeindex: sendAttendees,
              uuid: result1 as string,
            },
          });
          const result3 = await invoke("json_to_today", {
            data: {
              today: sendToday,
              uuid: result1 as string,
            },
          });
          invoke("debug_run_server");
          const serverState = await invoke("server_check");
          setServerRunning(serverState as boolean);

          console.log("イベント登録結果:", result1);
          console.log("参加者登録結果:", result2);
          console.log("本日参加者登録結果:", result3);

          // イベント登録完了後、自動的にモニターページに遷移
          const localIp = await invoke("get_local_ip");
          const domain = encodeURIComponent(`${localIp as string}:50345`);

          // 少し待ってからページ遷移（ユーザーに完了を知らせる）
          setTimeout(() => {
            handlePageChange(`/monitor/${result1 as string}/${domain}`);
          }, 500);
        } catch (error) {
          console.error("無効なJSONファイル:", error);
          alert("無効なJSONファイルです");
          setIsRegistering(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const renderLoadJsonMenu = () => {
    if (isRegistering) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              イベントを登録しています...
            </h2>
            <p className="text-gray-500">
              完了後、自動的にモニターページに移動します
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`min-h-screen  p-6 transition-all duration-300 ease-in-out ${
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="justify-center items-center text-center">
          <input type="file" accept=".json" onChange={handleLoadJson} />
          <div className="text-center mt-4">
            <p className="text-gray-600">
              JSONファイルを選択して、イベントデータを読み込みます。
            </p>
          </div>
        </div>
        <div className="bg-gray-50 min-h-screen font-sans">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <header className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                {jsonData.roomSettings.eventname}
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                {jsonData.roomSettings.eventinfo}
              </p>
            </header>

            <div className="grid grid-cols-2 gap-8">
              {/* Left Column: Summary and Settings */}
              <div className="lg:col-span-1 space-y-8">
                <InfoCard title="出席状況サマリー">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">出席者数</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {jsonData.attendees.filter((a) => a.attended).length} /{" "}
                      {jsonData.attendees.length}
                    </span>
                  </div>
                  <div className="mt-4 bg-white p-3 rounded-md shadow-sm">
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-indigo-200">
                        <div
                          style={{
                            width: `${Math.round(
                              (jsonData.attendees.filter(
                                (attendee) => attendee.attended
                              ).length /
                                jsonData.attendees.length) *
                                100
                            )}%`,
                          }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-1000 ease-out"
                        ></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-right text-indigo-600 font-semibold mt-2">
                    {Math.round(
                      (jsonData.attendees.filter(
                        (attendee) => attendee.attended
                      ).length /
                        jsonData.attendees.length) *
                        100
                    )}
                    %
                  </p>
                </InfoCard>

                <InfoCard
                  title={"当日参加者:" + jsonData.today.length}
                  className="overflow-x-auto"
                >
                  {jsonData.roomSettings.nolist ? (
                    <p className="text-gray-500 text-sm">
                      リストは非表示に設定されています。
                    </p>
                  ) : jsonData.today.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {jsonData.today.map((t) => (
                        <div
                          key={t.id}
                          className="bg-gray-100 p-2 rounded-md text-gray-700"
                        >
                          {t.id}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      当日参加者はいません。
                    </p>
                  )}
                </InfoCard>

                <InfoCard title="表示設定">
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-center">
                      <span
                        className={`w-2 h-2 rounded-full mr-3 ${
                          jsonData.roomSettings.arrowtoday
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      ></span>
                      当日参加を許可
                    </li>
                    <li className="flex items-center">
                      <span
                        className={`w-2 h-2 rounded-full mr-3 ${
                          jsonData.roomSettings.autotodayregister
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      ></span>
                      自動で当日参加登録
                    </li>
                    <li className="flex items-center">
                      <span
                        className={`w-2 h-2 rounded-full mr-3 ${
                          jsonData.roomSettings.soukai
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      ></span>
                      総会モード
                    </li>
                    <li className="flex items-center">
                      <span
                        className={`w-2 h-2 rounded-full mr-3 ${
                          jsonData.roomSettings.nolist
                            ? "bg-red-500"
                            : "bg-gray-300"
                        }`}
                      ></span>
                      リストを非表示
                    </li>
                  </ul>
                </InfoCard>
              </div>

              {/* Right Column: Attendee List */}
              <div className="">
                <InfoCard title="出席者リスト">
                  {jsonData.roomSettings.nolist ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        リストは非表示に設定されています。
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b">
                            <th className="p-4 text-sm font-semibold text-gray-600">
                              ID
                            </th>
                            <th className="p-4 text-sm font-semibold text-gray-600 text-right">
                              ステータス
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {jsonData.attendees.map((attendee) => (
                            <tr
                              key={attendee.id}
                              className="border-b last:border-none hover:bg-gray-50"
                            >
                              <td className="p-4 font-mono text-gray-800">
                                {attendee.id}
                              </td>
                              <td className="p-4 text-right">
                                <StatusBadge attended={attendee.attended} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </InfoCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
          <button onClick={() => handlePageChange("/import-event")}>
            <div className="flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer">
              <FileJson className="w-8 h-8 text-green-500 mr-4" />
              <div>
                <h3 className="font-semibold">ファイルからインポート</h3>
                <p className="text-sm text-gray-600">
                  ファイルからイベントを読み込みます
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderInfoModal = () => {
    if (!showInfoModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">出席管理システム</h2>
                <p className="text-blue-100">List Checker Tauri</p>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* コンテンツ */}
          <div className="p-6 space-y-6">
            {/* バージョン情報 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <div className="w-1 h-5 bg-blue-500 mr-3 rounded"></div>
                バージョン情報
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">アプリケーション</span>
                  <span className="font-mono font-semibold text-gray-800">
                    v1.1.1
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ビルド日</span>
                  <span className="text-sm text-gray-800">2025年10月3日</span>
                </div>
              </div>
            </div>

            {/* GitHubリポジトリ情報 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <div className="w-1 h-5 bg-purple-500 mr-3 rounded"></div>
                GitHubリポジトリ
              </h3>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                {/* リポジトリ説明 */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    List Checker Tauri
                  </p>
                  <a
                    href="https://github.com/TommyZ-7/list-checker-tauri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"
                  >
                    <span className="font-mono">
                      TommyZ-7/list-checker-tauri
                    </span>
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* ライセンス情報 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <div className="w-1 h-5 bg-yellow-500 mr-3 rounded"></div>
                システム情報
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">HTTPポート</span>
                  <span className="font-mono text-gray-800">50080</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Socket.IOポート</span>
                  <span className="font-mono text-gray-800">50345</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">識別子</span>
                  <span className="font-mono text-xs text-gray-800">
                    com.list-checker-tauri.app
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* フッター */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <p className="text-center text-sm text-gray-600">
              © 2025 出席管理システム. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderMainMenu = () => (
    <div
      className={`flex flex-col items-center justify-center h-screen gap-4 transition-all duration-300 ease-in-out ${
        isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <div className="flex justify-center gap-4">
        <div
          className="flex flex-col items-center justify-center p-8 bg-gray-200 rounded-lg shadow-md hover:bg-gray-300 transition-all duration-200 cursor-pointer transform hover:scale-105"
          onClick={() => handleMenuClick("event", "monitor")}
        >
          <MonitorSpeaker className="w-32 h-32 text-blue-500 m-10" />
          <span className="mt-2 text-xl font-semibold">
            イベントを作成・管理する
          </span>
        </div>

        {serverRunning && (
          <div
            className="flex flex-col items-center justify-center p-8 bg-green-200 rounded-lg shadow-md hover:bg-green-300 transition-all duration-200 cursor-pointer transform hover:scale-105"
            onClick={() => handlePageChange("/event-list")}
          >
            <MonitorSpeaker className="w-32 h-32 text-green-600 m-10" />
            <span className="mt-2 text-xl font-semibold">
              登録済みイベント一覧
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main className="custom_font bg-gray-50 min-h-screen relative">
      {/* 情報ボタン（左下にフロート表示） */}
      {currentView === "main" && (
        <button
          onClick={() => setShowInfoModal(true)}
          className="fixed bottom-4 left-4 z-10 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 group"
          title="ソフトウェア情報"
        >
          <Info className="w-6 h-6" />
          <span className="absolute left-full ml-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            ソフトウェア情報
          </span>
        </button>
      )}

      {/* 情報モーダル */}
      {renderInfoModal()}

      {/* 右上に移動するアイコン */}
      {selectedIcon && currentView !== "main" && (
        <div className="fixed top-4 right-4 z-10">
          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-md">
            <MonitorSpeaker className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      )}

      {serverRunning && (
        <div className="fixed bottom-4 right-4 z-10 bg-green-100 text-green-800 p-2 rounded-lg shadow-md">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">サーバーが起動中</span>
            <span className="text-xs text-gray-500">
              {localIP}:{serverPort}
            </span>
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
        {currentView === "modes" && renderModeSelector()}
        {currentView === "loadJson" && renderLoadJsonMenu()}
      </div>
    </main>
  );
}

export default App;
