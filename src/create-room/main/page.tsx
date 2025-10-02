import "@/App.css";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Users,
  Upload,
} from "lucide-react";
import { Input } from "@yamada-ui/react";
import { Textarea } from "@yamada-ui/react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { Checkbox } from "@yamada-ui/react";

import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@yamada-ui/react";
import { Alert, AlertIcon, AlertDescription } from "@yamada-ui/react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router";
import { useNavigate } from "react-router";

import { invoke } from "@tauri-apps/api/core";
import { useParams } from "react-router";
import { Button } from "@yamada-ui/react";

interface FormData {
  eventname: string;
  eventinfo: string;
  participants: string[];
  arrowtoday: boolean;
  soukai: boolean; // オプションとして追加
  noList: boolean; // オプションとして追加

  autotodayregister: boolean; // オプションとして追加
}

const EventRegistration = () => {
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    eventname: "",
    eventinfo: "",
    participants: [],
    arrowtoday: false,
    autotodayregister: false,
    soukai: false,
    noList: false,
  });
  const { mode } = useParams<{ mode: string }>();

  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [uuid, setUuid] = useState("");
  const [domain, setDomain] = useState("");
  const [dataSended, setDataSended] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isJsonImported, setIsJsonImported] = useState(false);
  const navigate = useNavigate();

  const steps = [
    {
      id: "eventName",
      title: "イベント名",
      icon: <Calendar className="w-8 h-8 text-blue-500" />,
      placeholder: "イベント名を入力してください",
      type: "text",
    },
    {
      id: "eventInfo",
      title: "イベント情報",
      icon: <Calendar className="w-8 h-8 text-green-500" />,
      placeholder: "イベント情報を入力してください",
      type: "date",
    },
    {
      id: "participants",
      title: "参加者",
      icon: <MapPin className="w-8 h-8 text-red-500" />,
      placeholder: "参加者を入力してください",
      type: "list",
    },
    {
      id: "arrowtoday",
      title: "当日参加",
      icon: <Users className="w-8 h-8 text-purple-500" />,
      placeholder: "当日参加者を許可しますか？",
      type: "settings",
    },
    {
      id: "cpmplete",
      title: "完了",
      icon: <Users className="w-8 h-8 text-gray-500" />,
      placeholder: "イベント登録が完了しました",
      type: "complete",
    },
  ];

  useEffect(() => {
    const changeMode = () => {
      try {
        if (mode === "soukai") {
          setFormData((prev) => ({
            ...prev,
            soukai: true,
            arrowtoday: true,
            autotodayregister: true,
          }));
        } else if (mode === "check") {
          setFormData((prev) => ({
            ...prev,
          }));
        } else if (mode === "all") {
          setFormData((prev) => ({
            ...prev,
            arrowtoday: true,
          }));
        } else if (mode === "regist") {
          setFormData((prev) => ({
            ...prev,
            noList: true,
            arrowtoday: true,
          }));
        }
      } catch (error) {
        console.error("モードの変更に失敗:", error);
      }
    };
    changeMode();
    console.log("モード:", formData);

    const fetchDomain = async () => {
      try {
        const result = await invoke("get_local_ip");
        setDomain(result as string);
      } catch (error) {
        console.error("IPアドレスの取得に失敗:", error);
      }
    };
    fetchDomain();
    console.log("ドメイン: ", domain);
    setIsAnimating(false);
  }, []);

  const onDrop = async (files: File[]) => {
    setIsFileLoaded(false);
    const file = files[0];
    setLoading(true);

    // ファイルタイプの判定
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "json") {
      // JSONファイルの処理
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (e.target && e.target.result) {
            const jsonText = e.target.result as string;
            const jsonData = JSON.parse(jsonText);

            // JSONデータの検証
            if (jsonData.eventname && jsonData.participants) {
              await sleep(500);
              setFormData({
                eventname: jsonData.eventname || "",
                eventinfo: jsonData.eventinfo || "",
                participants: jsonData.participants || [],
                arrowtoday: jsonData.arrowtoday || false,
                autotodayregister: jsonData.autotodayregister || false,
                soukai: jsonData.soukai || false,
                noList: jsonData.nolist || false,
              });
              setIsJsonImported(true);
              setIsFileLoaded(true);
              setLoading(false);
              // JSONインポート時は設定ステップ（ステップ3）に移動
              setCurrentStep(3);
              console.log("JSONからイベントデータをインポート:", jsonData);
            } else {
              throw new Error("無効なJSONフォーマットです");
            }
          }
        } catch (error) {
          console.error("JSONファイル読み込みエラー:", error);
          alert(
            "JSONファイルの読み込みに失敗しました。正しいフォーマットか確認してください。"
          );
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } else {
      // Excel/CSVファイルの処理
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (e.target && e.target.result) {
            const data = new Uint8Array(e.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });

            // シートの最初の名前を取得;
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            if (formData.soukai) {
              // B列の2行目からのデータを抽出
              const participantList: any[] = [];
              let rowIndex = 2; // B列の2行目から開始

              while (true) {
                const cellAddress = "B" + rowIndex;
                const cell = worksheet[cellAddress];

                if (!cell) break;

                participantList.push(cell.v);
                rowIndex++;
              }
              await sleep(1000);
              setFormData((prev) => ({
                ...prev,
                participants: participantList,
              }));
              setIsFileLoaded(true);
              setLoading(false);
              console.log("参加者リスト:", participantList);
            } else {
              // A列のデータを抽出（ヘッダーなしを;想定）
              const participantList: any[] = [];
              let rowIndex = 1;

              while (true) {
                const cellAddress = "A" + rowIndex;
                const cell = worksheet[cellAddress];

                if (!cell) break;

                participantList.push(cell.v);
                rowIndex++;
              }
              await sleep(1000);
              setFormData((prev) => ({
                ...prev,
                participants: participantList,
              }));
              setIsFileLoaded(true);
              setLoading(false);
              console.log("参加者リスト:", participantList);
            }
          }
          setTimeout(() => setLoading(false), 10000);
        } catch (error) {
          console.error("ファイル読み込みエラー:", error);
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const nextStep = () => {
    if (formData.noList && currentStep === 1) {
      // noListがtrueの場合、参加者リストのステップをスキップ
      setCurrentStep(currentStep + 2);
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (formData.noList && currentStep === 3) {
      // noListがtrueの場合、参加者リストのステップをスキップ
      setCurrentStep(currentStep - 2);
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return formData.eventname.trim() !== "";
    }
    if (currentStep === 1) {
      return formData.eventinfo.trim() !== "";
    }
    if (currentStep === 2) {
      if (formData.noList) {
        return true; // noListがtrueの場合は参加者リストの入力をスキップ
      }
      return formData.participants.length > 0; // 参加者リストが空でないことを確認
    }
    if (currentStep === 3) {
      return true; // 最後のステップは常に進める
    }
    return false;
  };

  const handleSubmit = async () => {
    if (formData.arrowtoday === false) {
      const sendData = JSON.stringify({
        eventname: formData.eventname,
        eventinfo: formData.eventinfo,
        participants: formData.participants,
        arrowtoday: formData.arrowtoday,
        autotodayregister: false,
        soukai: formData.soukai,
        nolist: formData.noList,
      });
      console.log("送信データ:", sendData);
      const result = await invoke("register_event", { data: sendData });
      setTimeout(() => {
        invoke("debug_run_server");
        setUuid(result as string);
        setDataSended(true);
        setCurrentStep(steps.length - 1);
      }, 1000);
    } else {
      const sendData = JSON.stringify({
        eventname: formData.eventname,
        eventinfo: formData.eventinfo,
        participants: formData.participants,
        arrowtoday: formData.arrowtoday,
        autotodayregister: formData.autotodayregister,
        soukai: formData.soukai,
        nolist: formData.noList,
      });
      console.log("送信データ:", sendData);
      const result = await invoke("register_event", { data: sendData });
      setTimeout(() => {
        invoke("debug_run_server");
        setUuid(result as string);
        setDataSended(true);
        setCurrentStep(steps.length - 1);
      }, 1000);
    }
    console.log("イベント登録結果:");
    // 最後のステップに進む
  };

  const isLastStep = currentStep === steps.length - 2;

  const handlePageChange = (page: string) => {
    setIsAnimating(true);
    setTimeout(() => {
      navigate(page);
    }, 300);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-all duration-300  ease-in-out ${
        isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
          <h1 className="text-2xl font-bold text-center">イベント登録</h1>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index <= currentStep ? "bg-white" : "bg-white bg-opacity-30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* スライドコンテナ */}
        <div className="relative h-96 overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${currentStep * 100}%)` }}
          >
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="min-w-full flex flex-col justify-center items-center p-8"
              >
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">{step.icon}</div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    {step.title}
                  </h2>
                  <p className="text-sm text-gray-500">
                    ステップ {index + 1} / {steps.length}
                  </p>
                </div>

                <div className="w-full">
                  {step.type === "text" ? (
                    <Input
                      value={formData.eventname}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eventname: e.target.value,
                        })
                      }
                      placeholder={step.placeholder}
                      className="w-full"
                      autoFocus
                    />
                  ) : step.type === "date" ? (
                    <Textarea
                      value={formData.eventinfo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eventinfo: e.target.value,
                        })
                      }
                      placeholder={step.placeholder}
                      className="w-full h-24"
                    />
                  ) : step.type === "list" ? (
                    <>
                      {isFileLoaded ? (
                        <></>
                      ) : (
                        <div
                          {...getRootProps()}
                          className={cn(
                            "border-2 border-dashed rounded-lg p-4 text-center bg-gray-50",
                            {
                              "border-blue-500": isDragActive,
                              "border-gray-300": !isDragActive,
                            }
                          )}
                        >
                          <input {...getInputProps()} />
                          <Upload
                            className={cn("mx-auto mb-2", {
                              "text-blue-500": isDragActive,
                              "text-gray-400": !isDragActive,
                            })}
                            size={24}
                          />
                          <p className="text-gray-500 mb-2">
                            ドラッグ＆ドロップまたはクリックしてファイルをアップロード
                          </p>
                          <p className="text-xs text-gray-400">
                            対応形式: Excel (.xlsx, .xls) / JSON (.json)
                          </p>
                        </div>
                      )}
                      {loading && (
                        <div className="mt-4">
                          <Progress className="w-full" isAnimation />
                        </div>
                      )}
                      <AnimatePresence>
                        {isFileLoaded && (
                          <>
                            <motion.div
                              className="mt-4"
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                            >
                              <Alert status="success">
                                <AlertIcon />
                                <AlertDescription>
                                  {formData.participants.length}
                                  名の参加者が読み込まれました。
                                </AlertDescription>
                              </Alert>
                            </motion.div>
                            <motion.div
                              className="mt-4"
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                            >
                              <h3 className="text-lg font-medium text-gray-800 mb-2">
                                出席者一覧
                              </h3>
                              <ul className="max-h-60 overflow-y-auto space-y-1 h-25">
                                {formData.participants.map(
                                  (participant, index) => (
                                    <li
                                      key={index}
                                      className="px-3 py-2 bg-white rounded shadow-sm"
                                    >
                                      {participant}
                                    </li>
                                  )
                                )}
                              </ul>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </>
                  ) : step.type === "settings" ? (
                    <>
                      {isJsonImported && (
                        <motion.div
                          className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="text-sm font-medium text-blue-800 mb-2">
                            📄 JSONからインポートされたイベント
                          </div>
                          <div className="text-xs text-blue-700 space-y-1">
                            <div>
                              <strong>イベント名:</strong> {formData.eventname}
                            </div>
                            <div>
                              <strong>参加者数:</strong>{" "}
                              {formData.participants.length}名
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div>
                        <Checkbox
                          checked={formData.arrowtoday}
                          disabled={formData.soukai || formData.noList}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              arrowtoday: e.target.checked,
                            });
                          }}
                          colorScheme="green"
                        >
                          <span>当日参加を許可する</span>
                        </Checkbox>
                      </div>
                      <div>
                        {formData.arrowtoday && (
                          <Checkbox
                            checked={formData.autotodayregister}
                            disabled={formData.soukai}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                autotodayregister: e.target.checked,
                              })
                            }
                            colorScheme="blue"
                          >
                            <span>当日参加者を自動登録する</span>
                          </Checkbox>
                        )}
                      </div>

                      {dataSended ? (
                        <Link
                          to={`/monitor/${uuid}/${encodeURIComponent(
                            `${domain}:12345`
                          )}`}
                          className="text-blue-500 hover:underline mt-4 inline-block"
                        >
                          モニターページへ
                        </Link>
                      ) : null}
                    </>
                  ) : step.type === "complete" ? (
                    <div className="text-center w-full">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-xs text-blue-600 font-medium mb-0.5">
                              ルームID
                            </div>
                            <div className="text-sm font-mono font-bold text-blue-800 break-all leading-tight">
                              {uuid}
                            </div>
                          </div>

                          <div className="p-2.5 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-xs text-green-600 font-medium mb-0.5">
                              IPアドレス
                            </div>
                            <div className="text-sm font-mono font-semibold text-green-800">
                              {domain}
                            </div>
                          </div>

                          <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="text-xs text-purple-600 font-medium mb-0.5">
                              ポート番号
                            </div>
                            <div className="text-sm font-mono font-semibold text-purple-800">
                              12345
                            </div>
                          </div>

                          <Button
                            onClick={() =>
                              handlePageChange(
                                `/monitor/${uuid}/${encodeURIComponent(
                                  `${domain}:12345`
                                )}`
                              )
                            }
                            className="mt-3 w-full"
                            colorScheme="blue"
                            size="md"
                          >
                            モニターページへ
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ナビゲーションボタン */}
        <div className="p-6 bg-gray-50 flex justify-between items-center">
          {currentStep !== 4 ? (
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                currentStep === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              <ChevronLeft className="w-5 h-5" color="#3e9392" />
              <span>戻る</span>
            </button>
          ) : null}

          <div className="text-sm text-gray-500 text-center justify-center flex-1">
            {currentStep + 1} / {steps.length}
          </div>
          {currentStep !== 4 ? (
            <div>
              {isLastStep ? (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed() || dataSended}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-all duration-200 ${
                    canProceed()
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }
                  ${dataSended ? "cursor-not-allowed opacity-50" : ""}    
              `}
                >
                  <span>登録</span>
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    canProceed()
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <span>次へ</span>
                  <ChevronRight
                    className="w-5 h-5"
                    color={cn(canProceed() ? "#3e9392" : "black")}
                  />
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
export default EventRegistration;
