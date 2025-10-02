import "@/App.css";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Users,
  UserCheck,
  TrendingUp,
  Calendar,
  ExternalLink,
  Download,
  Info,
  X,
} from "lucide-react";
import { io } from "socket.io-client";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type Attendee = {
  id: string;
  attended: boolean;
};

type Settings = {
  arrowtoday: boolean;
  autotodayregister: boolean;
  soukai: boolean;
  noList: boolean;
};

function MonitorPageNew() {
  const [expectedAttendees, setExpectedAttendees] = useState<Attendee[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const [roomName, setRoomName] = useState<string>("");
  const [roomInfo, setRoomInfo] = useState<string>("");
  const [onTheDay, setOnTheDay] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings>({
    arrowtoday: false,
    autotodayregister: false,
    soukai: false,
    noList: false,
  });
  const [localIP, setLocalIP] = useState<string>("");
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const domainRaw = useParams<{ domain: string }>().domain || "default";
  const domain = decodeURIComponent(domainRaw);
  const socketRef = useRef<any>(null);
  const expectedAttendeesCopyRef = useRef<string[]>([]);

  const { uuid } = useParams<{ uuid: string }>();

  console.log("MonitorPageNew loaded with UUID:", uuid, "Domain:", domain);

  useEffect(() => {
    if (!uuid) {
      console.error("UUID is not provided in the URL parameters.");
      return;
    }
    if (dataFetched) {
      console.log("Data already fetched, skipping fetch.");
      return;
    }

    const fetchLocalIP = async () => {
      const result = await invoke("get_local_ip");
      setLocalIP(result as string);
    };

    const fetchData = async () => {
      try {
        const response = await invoke<{
          participants: string[];
          eventname: string;
          eventinfo: string;
          arrowtoday: boolean;
          autotodayregister: boolean;
          soukai: boolean;
          nolist: boolean;
        } | null>("get_event", { uuid });

        if (!response) {
          console.error("Event not found for UUID:", uuid);
          alert(`指定されたイベント(UUID: ${uuid})が見つかりません。`);
          window.close();
          return;
        }

        if (response) {
          console.log("Fetched event data:", response);
          setExpectedAttendees(
            response.participants.map((attendeeId) => ({
              id: attendeeId,
              attended: false,
            }))
          );
          expectedAttendeesCopyRef.current = response.participants;
          setRoomName(response.eventname);
          setRoomInfo(response.eventinfo);
          setSettings({
            autotodayregister: response.autotodayregister,
            arrowtoday: response.arrowtoday,
            soukai: response.soukai,
            noList: response.nolist,
          });

          // Socket.IOに接続
          socketRef.current = io("http://" + domain);
          console.log("Connecting to socket server at:http://" + domain);

          socketRef.current.on("register_attendees_return", (data: any) => {
            console.log("Attendance data received from server:", data);
            if (data) {
              dataDeCompression(data);
            }
          });

          socketRef.current.on("register_ontheday_return", (data: any) => {
            console.log("On the day data received from server:", data);
            if (data) {
              setOnTheDay(data);
            }
          });

          socketRef.current.emit("sync_all_data", uuid);

          return () => {
            if (socketRef.current) {
              socketRef.current.disconnect();
              socketRef.current = null;
            }
          };
        }
      } catch (error) {
        console.error("Error fetching event data:", error);
        alert(`イベントデータの取得に失敗しました: ${error}`);
        window.close();
      }
    };

    const initialize = async () => {
      await fetchLocalIP();
      await fetchData();
      setDataFetched(true);
      setLoading(false);
    };

    initialize();
  }, [uuid, domain, dataFetched]);

  const dataDeCompression = (compressedData: number[]) => {
    const updatedAttendees = expectedAttendeesCopyRef.current.map(
      (attendeeId, index) => ({
        id: attendeeId,
        attended: compressedData.includes(index),
      })
    );
    setExpectedAttendees(updatedAttendees);
  };

  const attendedCount = expectedAttendees.filter((a) => a.attended).length;
  const totalCount = expectedAttendees.length;
  const attendanceRate =
    totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;
  const todayCount = onTheDay.length;
  const totalWithToday = attendedCount + todayCount;

  const openAttendancePage = () => {
    const url = `http://${localIP}:8080/attendance.html?uuid=${uuid}&server=${domain}`;
    window.open(url, "_blank");
  };

  const downloadData = (format: "excel" | "csv" | "json") => {
    if (expectedAttendees.length === 0 && onTheDay.length === 0) {
      alert("データがありません。");
      return;
    }

    if (format === "excel") {
      const data = expectedAttendees.map((attendee) => ({
        学籍番号: attendee.id,
        出席: attendee.attended ? "O" : "",
      }));
      const dataToday = onTheDay.map((attendee) => ({
        学籍番号: attendee,
      }));
      const dataStatistics = {
        出席者数: attendedCount,
        出席率: attendanceRate + "%",
        当日参加者数: todayCount,
        合計数: totalWithToday,
      };

      const workbook = XLSX.utils.book_new();

      // expectedAttendeesが存在する場合のみシートを追加
      if (expectedAttendees.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, "出席者リスト");
      }

      // 当日参加者が存在する場合のみシートを追加
      if (onTheDay.length > 0) {
        const worksheetToday = XLSX.utils.json_to_sheet(dataToday);
        XLSX.utils.book_append_sheet(workbook, worksheetToday, "当日参加者");
      }

      const worksheetStatistics = XLSX.utils.json_to_sheet([dataStatistics]);
      XLSX.utils.book_append_sheet(workbook, worksheetStatistics, "統計情報");
      const fileName = `${roomName}_出席者リスト.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } else if (format === "csv") {
      const csvData = [];

      // expectedAttendeesがある場合
      if (expectedAttendees.length > 0) {
        csvData.push(
          ...expectedAttendees.map((attendee) => ({
            学籍番号: attendee.id,
            出席: attendee.attended ? "O" : "",
            カテゴリ: "事前登録",
          }))
        );
      }

      // 当日参加者を追加
      if (onTheDay.length > 0) {
        csvData.push(
          ...onTheDay.map((attendee) => ({
            学籍番号: attendee,
            出席: "O",
            カテゴリ: "当日参加",
          }))
        );
      }

      const csv = Papa.unparse(csvData);
      const fileName = `${roomName}_出席者リスト.csv`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === "json") {
      const jsonData = {
        eventname: roomName,
        eventinfo: roomInfo,
        participants: expectedAttendees.map((attendee) => ({
          id: attendee.id,
          attended: attendee.attended,
        })),
        todaylist: onTheDay,
        arrowtoday: settings.arrowtoday,
        autotodayregister: settings.autotodayregister,
        soukai: settings.soukai,
        nolist: settings.noList,
      };
      const fileName = `${roomName}_出席者リスト.json`;
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setShowDownloadModal(false);
  };

  // ローディング画面
  if (loading || !roomName) {
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
            イベントデータを読み込んでいます...
          </h2>
          <p className="text-gray-500">UUID: {uuid}</p>
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
                {roomName}
              </h1>
              <p className="text-sm text-gray-500 mt-1">リアルタイムモニター</p>
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowInfoModal(true)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2"
              >
                <Info className="w-5 h-5" />
                情報
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDownloadModal(true)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                ダウンロード
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openAttendancePage}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                出席登録ページ
              </motion.button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-6 py-8">
        <LayoutGroup>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 統計カード */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-1 space-y-6"
            >
              {/* 出席者数カード */}
              {!settings.noList && (
                <motion.div
                  layout
                  layoutId="attendance-card"
                  className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-100 rounded-xl">
                        <UserCheck className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">
                        出席者数
                      </h3>
                    </div>
                  </div>
                  <motion.div
                    key={attendedCount}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-4xl font-bold text-indigo-600"
                  >
                    {attendedCount}
                    <span className="text-2xl text-gray-400 ml-2">
                      / {totalCount}
                    </span>
                  </motion.div>
                  <div className="mt-2 text-sm text-gray-500">
                    登録者からの出席
                  </div>
                </motion.div>
              )}

              {/* 出席率カード */}
              {!settings.noList && (
                <motion.div
                  layout
                  layoutId="rate-card"
                  className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-100 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">
                        出席率
                      </h3>
                    </div>
                  </div>
                  <motion.div
                    key={attendanceRate}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-4xl font-bold text-emerald-600"
                  >
                    {attendanceRate}%
                  </motion.div>
                  <div className="mt-4 relative">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${attendanceRate}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 当日参加者数カード */}
              {settings.arrowtoday && (
                <motion.div
                  layout
                  layoutId="today-card"
                  className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <Calendar className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700">
                        当日参加者数
                      </h3>
                    </div>
                  </div>
                  <motion.div
                    key={todayCount}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-4xl font-bold text-purple-600"
                  >
                    {todayCount}
                  </motion.div>
                  <div className="mt-2 text-sm text-gray-500">
                    当日の追加参加者
                  </div>
                </motion.div>
              )}

              {/* 合計カード */}
              {settings.arrowtoday && (
                <motion.div
                  layout
                  layoutId="total-card"
                  className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 text-white"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-semibold">合計参加者数</h3>
                    </div>
                  </div>
                  <motion.div
                    key={totalWithToday}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-5xl font-bold"
                  >
                    {totalWithToday}
                  </motion.div>
                  <div className="mt-2 text-sm opacity-90">
                    出席者 + 当日参加者
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* 出席者リスト */}
            <motion.div
              layout
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {settings.noList ? "当日参加者リスト" : "出席者リスト"}
                  </h2>
                </div>

                <div className="overflow-auto max-h-[calc(100vh-300px)]">
                  <AnimatePresence mode="popLayout">
                    {settings.noList ? (
                      <div className="divide-y divide-gray-100">
                        {onTheDay.map((student, index) => (
                          <motion.div
                            key={student}
                            layoutId={`today-${student}`}
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.3, delay: index * 0.02 }}
                            className="p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-semibold text-sm">
                                  {index + 1}
                                </span>
                              </div>
                              <span className="text-lg font-medium text-gray-800">
                                {student}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {expectedAttendees.map((student, index) => (
                          <motion.div
                            key={student.id}
                            layoutId={`student-${student.id}`}
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.3, delay: index * 0.01 }}
                            className={`p-4 hover:bg-gray-50 transition-colors ${
                              student.attended ? "bg-green-50/50" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    student.attended
                                      ? "bg-green-100"
                                      : "bg-gray-100"
                                  }`}
                                >
                                  <span
                                    className={`font-semibold text-sm ${
                                      student.attended
                                        ? "text-green-600"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {index + 1}
                                  </span>
                                </div>
                                <span className="text-lg font-medium text-gray-800">
                                  {student.id}
                                </span>
                              </div>

                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                {student.attended ? (
                                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
                                    <UserCheck className="w-4 h-4" />
                                    出席
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                                    {settings.soukai ? "委任状" : "未出席"}
                                  </span>
                                )}
                              </motion.div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </LayoutGroup>
      </div>

      {/* ダウンロードモーダル */}
      <AnimatePresence>
        {showDownloadModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDownloadModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ duration: 0.3 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  データをダウンロード
                </h3>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => downloadData("excel")}
                  className="w-full p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-left transition-colors"
                >
                  <div className="font-semibold text-green-700">Excel形式</div>
                  <div className="text-sm text-green-600 mt-1">
                    統計情報と出席者リストを含むExcelファイル
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => downloadData("csv")}
                  className="w-full p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition-colors"
                >
                  <div className="font-semibold text-blue-700">CSV形式</div>
                  <div className="text-sm text-blue-600 mt-1">
                    シンプルなテキスト形式のデータ
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => downloadData("json")}
                  className="w-full p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left transition-colors"
                >
                  <div className="font-semibold text-purple-700">JSON形式</div>
                  <div className="text-sm text-purple-600 mt-1">
                    構造化されたデータ形式
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 情報モーダル */}
      <AnimatePresence>
        {showInfoModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ duration: 0.3 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  イベント情報
                </h3>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500 mb-1">イベント名</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {roomName}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500 mb-1">イベント情報</div>
                  <div className="text-base text-gray-800">{roomInfo}</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500 mb-1">UUID</div>
                  <div className="text-sm font-mono bg-white p-3 rounded-lg border border-gray-200">
                    {uuid}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-500 mb-3">出席登録URL</div>
                  <div className="text-xs font-mono bg-white p-3 rounded-lg border border-gray-200 break-all">
                    http://{localIP}:8080/attendance.html?uuid={uuid}&server=
                    {domain}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-indigo-50 rounded-xl">
                    <div className="text-sm text-indigo-600 mb-1">当日登録</div>
                    <div className="font-semibold text-indigo-700">
                      {settings.arrowtoday ? "許可" : "不許可"}
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl">
                    <div className="text-sm text-purple-600 mb-1">自動登録</div>
                    <div className="font-semibold text-purple-700">
                      {settings.autotodayregister ? "有効" : "無効"}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MonitorPageNew;
