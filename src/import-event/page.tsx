import "@/App.css";
import { useState } from "react";
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@yamada-ui/react";

interface ImportedEventData {
  eventname: string;
  eventinfo: string;
  participants: string[] | { id: string; attended: boolean }[];
  todaylist?: string[];
  arrowtoday: boolean;
  autotodayregister: boolean;
  soukai: boolean;
  nolist: boolean;
}

const ImportEvent = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [importedData, setImportedData] = useState<ImportedEventData | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [domain, setDomain] = useState("");
  const [uuid, setUuid] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [restoreAttendance, setRestoreAttendance] = useState(false);

  // ドメイン取得
  useState(() => {
    const fetchDomain = async () => {
      try {
        const result = await invoke("get_local_ip");
        setDomain(result as string);
      } catch (error) {
        console.error("IPアドレスの取得に失敗:", error);
      }
    };
    fetchDomain();
  });

  const onDrop = async (files: File[]) => {
    setError("");
    setImportedData(null);
    const file = files[0];

    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension !== "json") {
      setError("JSONファイルのみアップロード可能です");
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (e.target && e.target.result) {
          const jsonText = e.target.result as string;
          const jsonData = JSON.parse(jsonText);

          // JSONデータの検証
          if (!jsonData.eventname) {
            throw new Error("イベント名が含まれていません");
          }
          if (!jsonData.participants || !Array.isArray(jsonData.participants)) {
            throw new Error("参加者リストが無効です");
          }

          // 当日参加者リストがある場合、デフォルトで含める
          const hasTodayList =
            jsonData.todaylist && jsonData.todaylist.length > 0;
          setRestoreAttendance(hasTodayList);

          const eventData: ImportedEventData = {
            eventname: jsonData.eventname || "",
            eventinfo: jsonData.eventinfo || "",
            participants: jsonData.participants || [],
            todaylist: jsonData.todaylist || [],
            arrowtoday: jsonData.arrowtoday || false,
            autotodayregister: jsonData.autotodayregister || false,
            soukai: jsonData.soukai || false,
            nolist: jsonData.nolist || false,
          };

          setImportedData(eventData);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("JSONファイル読み込みエラー:", err);
        setError(
          err instanceof Error
            ? err.message
            : "JSONファイルの読み込みに失敗しました"
        );
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/json": [".json"],
    },
    multiple: false,
  });

  const handleRegister = async () => {
    if (!importedData) return;

    setIsRegistering(true);
    try {
      // 出席情報を抽出（オブジェクト形式の場合）
      let attendedIndices: number[] = [];
      if (
        Array.isArray(importedData.participants) &&
        importedData.participants.length > 0
      ) {
        importedData.participants.forEach((p: any, index: number) => {
          if (typeof p === "object" && p.attended === true) {
            attendedIndices.push(index);
          }
        });
      }

      // participantsを常にID配列に変換（Rustバックエンドは文字列配列を期待）
      let dataToSend = { ...importedData };
      if (Array.isArray(dataToSend.participants)) {
        dataToSend.participants = dataToSend.participants.map((p: any) =>
          typeof p === "object" ? p.id : p
        );
      }

      // 出席状態を復元しない場合、当日参加者もクリア
      if (!restoreAttendance) {
        dataToSend.todaylist = [];
        attendedIndices = []; // 出席情報もクリア
      }

      const sendData = JSON.stringify(dataToSend);
      console.log("送信データ:", sendData);
      console.log("出席者インデックス:", attendedIndices);

      const result = await invoke("register_event", { data: sendData });
      console.log("イベント登録成功。UUID:", result);

      // 出席情報がある場合、別途送信
      if (attendedIndices.length > 0) {
        await invoke("json_to_attendees", {
          data: {
            uuid: result,
            attendeeindex: attendedIndices,
          },
        });
        console.log("出席情報を送信しました:", attendedIndices.length, "名");
      }

      // サーバー起動（awaitしない - バックグラウンドで起動）
      console.log("サーバーを起動しています...");
      invoke("debug_run_server"); // awaitを削除

      // サーバーの起動を待機
      console.log("サーバーの起動を待機中...");
      let serverReady = false;
      let retries = 0;
      const maxRetries = 30; // 最大15秒待機（500ms × 30）

      while (!serverReady && retries < maxRetries) {
        try {
          const isRunning = await invoke<boolean>("server_check");
          if (isRunning) {
            serverReady = true;
            console.log("サーバーが起動しました");
          } else {
            await new Promise((resolve) => setTimeout(resolve, 500));
            retries++;
          }
        } catch (err) {
          console.error("サーバーチェックエラー:", err);
          await new Promise((resolve) => setTimeout(resolve, 500));
          retries++;
        }
      }

      if (!serverReady) {
        console.warn(
          "サーバーの起動確認がタイムアウトしましたが、遷移を続行します"
        );
      }

      // UUIDを設定して表示を更新
      setUuid(result as string);

      // モニターページへ遷移（resultを直接使用）
      const targetUrl = `/monitor/${result}/${encodeURIComponent(
        `${domain}:12345`
      )}`;
      console.log("モニターページへ遷移:", targetUrl);

      // 少し待ってから遷移（UIの更新を確実に）
      await new Promise((resolve) => setTimeout(resolve, 500));
      navigate(targetUrl);
    } catch (error) {
      console.error("イベント登録エラー:", error);
      setError("イベントの登録に失敗しました");
      setIsRegistering(false);
    }
  };

  const handleCancel = () => {
    setImportedData(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <FileJson className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold text-center">
              イベントをインポート
            </h1>
            <p className="text-center text-indigo-100 mt-2">
              JSONファイルから既存のイベントデータを読み込みます
            </p>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {!importedData ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* ファイルドロップゾーン */}
                  <div
                    {...getRootProps()}
                    className={cn(
                      "border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer",
                      {
                        "border-indigo-500 bg-indigo-50": isDragActive,
                        "border-gray-300 hover:border-indigo-400 hover:bg-gray-50":
                          !isDragActive,
                      }
                    )}
                  >
                    <input {...getInputProps()} />
                    <motion.div
                      animate={{
                        y: isDragActive ? -10 : 0,
                        scale: isDragActive ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <Upload
                        className={cn("mx-auto mb-4", {
                          "text-indigo-500": isDragActive,
                          "text-gray-400": !isDragActive,
                        })}
                        size={64}
                      />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      JSONファイルをドロップ
                    </h3>
                    <p className="text-gray-500 mb-4">
                      またはクリックしてファイルを選択
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                      <FileJson size={16} />
                      <span>対応形式: .json</span>
                    </div>
                  </div>

                  {/* エラー表示 */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
                    >
                      <XCircle
                        className="text-red-500 flex-shrink-0"
                        size={20}
                      />
                      <div>
                        <h4 className="font-semibold text-red-800">エラー</h4>
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* ローディング */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 flex items-center justify-center gap-3 text-indigo-600"
                    >
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="font-medium">読み込み中...</span>
                    </motion.div>
                  )}

                  {/* ヒント */}
                  <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className="text-blue-500 flex-shrink-0 mt-0.5"
                        size={20}
                      />
                      <div className="text-sm text-blue-800">
                        <h4 className="font-semibold mb-1">💡 ヒント</h4>
                        <p>
                          モニターページや出席登録ページからダウンロードしたJSONファイルをインポートできます。
                          過去のイベントデータを再利用したい場合に便利です。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 戻るボタン */}
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={() => navigate("/")}
                      variant="ghost"
                      colorScheme="gray"
                    >
                      ホームに戻る
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* 成功メッセージ */}
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle2
                      className="text-green-500 flex-shrink-0"
                      size={20}
                    />
                    <div>
                      <h4 className="font-semibold text-green-800">
                        読み込み成功
                      </h4>
                      <p className="text-green-600 text-sm">
                        イベントデータを正常に読み込みました
                      </p>
                    </div>
                  </div>

                  {/* イベントプレビュー */}
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-xl p-6 bg-gradient-to-br from-white to-gray-50">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileSpreadsheet
                          className="text-indigo-600"
                          size={20}
                        />
                        イベント情報
                      </h3>

                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            イベント名
                          </label>
                          <p className="text-lg font-semibold text-gray-900">
                            {importedData.eventname}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            イベント情報
                          </label>
                          <p className="text-gray-700">
                            {importedData.eventinfo || "（なし）"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <label className="text-xs font-medium text-gray-500">
                              参加者数
                            </label>
                            <p className="text-2xl font-bold text-indigo-600">
                              {importedData.participants.length}
                              <span className="text-sm font-normal text-gray-500 ml-1">
                                名
                              </span>
                            </p>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <label className="text-xs font-medium text-gray-500">
                              設定
                            </label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {importedData.arrowtoday && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                  当日参加
                                </span>
                              )}
                              {importedData.autotodayregister && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  自動登録
                                </span>
                              )}
                              {importedData.soukai && (
                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                  総会
                                </span>
                              )}
                              {importedData.nolist && (
                                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                  リストなし
                                </span>
                              )}
                              {!importedData.arrowtoday &&
                                !importedData.autotodayregister &&
                                !importedData.soukai &&
                                !importedData.nolist && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                    標準
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 当日参加者リストインポートオプション */}
                    {importedData.todaylist &&
                      importedData.todaylist.length > 0 && (
                        <div className="border border-amber-200 rounded-xl p-6 bg-amber-50">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id="restoreAttendance"
                              checked={restoreAttendance}
                              onChange={(e) =>
                                setRestoreAttendance(e.target.checked)
                              }
                              className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                              <label
                                htmlFor="restoreAttendance"
                                className="font-semibold text-amber-900 cursor-pointer"
                              >
                                当日参加者リストを含める
                              </label>
                              <p className="text-sm text-amber-700 mt-1">
                                チェックすると、当日参加者リスト（
                                {importedData.todaylist.length}
                                名）も一緒にインポートされます。
                                チェックを外すと、参加者リストのみを使用します。
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* 参加者リストプレビュー */}
                    {importedData.participants.length > 0 && (
                      <div className="border border-gray-200 rounded-xl p-6 bg-white">
                        <h4 className="font-semibold text-gray-800 mb-3">
                          参加者リスト（最初の10名）
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {importedData.participants
                            .slice(0, 10)
                            .map((participant, index) => {
                              const id =
                                typeof participant === "object"
                                  ? participant.id
                                  : participant;
                              const attended =
                                typeof participant === "object"
                                  ? participant.attended
                                  : false;
                              return (
                                <span
                                  key={index}
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    attended
                                      ? "bg-green-100 text-green-700"
                                      : "bg-indigo-50 text-indigo-700"
                                  }`}
                                >
                                  {id}
                                  {attended && " ✓"}
                                </span>
                              );
                            })}
                          {importedData.participants.length > 10 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                              他 {importedData.participants.length - 10} 名
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 当日参加者プレビュー */}
                    {importedData.todaylist &&
                      importedData.todaylist.length > 0 && (
                        <div className="border border-purple-200 rounded-xl p-6 bg-purple-50">
                          <h4 className="font-semibold text-purple-900 mb-3">
                            当日参加者（{importedData.todaylist.length}名）
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {importedData.todaylist
                              .slice(0, 10)
                              .map((student, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                                >
                                  {student}
                                </span>
                              ))}
                            {importedData.todaylist.length > 10 && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                                他 {importedData.todaylist.length - 10} 名
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* アクションボタン */}
                  <div className="mt-8 flex gap-4">
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      colorScheme="gray"
                      className="flex-1"
                      disabled={isRegistering}
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleRegister}
                      colorScheme="blue"
                      className="flex-1"
                      disabled={isRegistering}
                      rightIcon={
                        isRegistering ? undefined : <ArrowRight size={18} />
                      }
                    >
                      {isRegistering ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>登録中...</span>
                        </div>
                      ) : (
                        "イベントを登録"
                      )}
                    </Button>
                  </div>

                  {/* 登録完了メッセージ */}
                  {uuid && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-center"
                    >
                      <CheckCircle2
                        className="text-indigo-600 mx-auto mb-2"
                        size={32}
                      />
                      <p className="font-semibold text-indigo-900">
                        登録完了！
                      </p>
                      <p className="text-sm text-indigo-700 mt-1">
                        モニターページに移動します...
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ImportEvent;
