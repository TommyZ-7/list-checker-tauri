import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  ArrowLeft,
  ExternalLink,
  UserCheck,
} from "lucide-react";

interface EventStruct {
  eventname: string;
  eventinfo: string;
  participants: string[];
  arrowtoday: boolean;
  autotodayregister: boolean;
  soukai: boolean;
  nolist: boolean;
  roomid?: string;
  password?: string;
}

export default function EventListPage() {
  const [events, setEvents] = useState<EventStruct[]>([]);
  const [localIP, setLocalIP] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const allEvents = await invoke<EventStruct[]>("get_all_events");
        console.log("Fetched events:", allEvents);
        console.log(
          "Events with roomid:",
          allEvents.map((e) => ({ name: e.eventname, roomid: e.roomid }))
        );
        setEvents(allEvents);
        const ip = await invoke<string>("get_local_ip");
        setLocalIP(ip);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleOpenMonitor = (uuid: string | undefined) => {
    if (!uuid) {
      console.error("UUID is undefined");
      alert("イベントのUUIDが取得できません");
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      const domain = encodeURIComponent(`${localIP}:50345`);
      navigate(`/monitor/${uuid}/${domain}`);
    }, 300);
  };

  const handleBack = () => {
    setIsAnimating(true);
    setTimeout(() => {
      navigate("/");
    }, 300);
  };

  // ローディング画面
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            イベントを読み込んでいます...
          </h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* ヘッダー */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white/80 backdrop-blur-lg shadow-lg sticky top-0 z-50 border-b border-gray-200"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                登録済みイベント一覧
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {events.length}件のイベントが登録されています
              </p>
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
                className="px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl transition-all flex items-center gap-2 shadow-md"
              >
                <ArrowLeft className="w-5 h-5" />
                ホームに戻る
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* メインコンテンツ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isAnimating ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-6 py-8"
      >
        {events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                イベントがありません
              </h2>
              <p className="text-gray-500 mb-6">
                まだイベントが登録されていません。新しいイベントを作成してください。
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                イベントを作成する
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, index) => (
              <motion.div
                key={event.roomid || `event-${index}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                  {/* カードヘッダー */}
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <Calendar className="w-6 h-6" />
                      </div>
                      {event.soukai && (
                        <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                          総会
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-2 line-clamp-2">
                      {event.eventname}
                    </h3>
                    <p className="text-sm text-indigo-100 line-clamp-2">
                      {event.eventinfo}
                    </p>
                  </div>

                  {/* カードボディ */}
                  <div className="p-6 flex-1 flex flex-col">
                    {/* 統計情報 */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-indigo-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs text-gray-600">参加者</span>
                        </div>
                        <p className="text-2xl font-bold text-indigo-600">
                          {event.participants.length}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <UserCheck className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-gray-600">
                            当日登録
                          </span>
                        </div>
                        <p className="text-lg font-bold text-purple-600">
                          {event.arrowtoday ? "許可" : "不許可"}
                        </p>
                      </div>
                    </div>

                    {/* 設定バッジ */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {event.autotodayregister && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          自動登録
                        </span>
                      )}
                      {event.nolist && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                          リスト非表示
                        </span>
                      )}
                    </div>

                    {/* UUID */}
                    <div className="mb-4 flex-1">
                      <p className="text-xs text-gray-500 mb-1">UUID</p>
                      <p className="font-mono text-xs bg-gray-50 p-2 rounded-lg border border-gray-200 truncate">
                        {event.roomid || "不明"}
                      </p>
                    </div>

                    {/* アクションボタン */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOpenMonitor(event.roomid)}
                      disabled={!event.roomid}
                      className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                    >
                      <ExternalLink className="w-5 h-5" />
                      モニターページを開く
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
