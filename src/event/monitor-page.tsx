import "@/App.css";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { invoke } from "@tauri-apps/api/core";
import { Text } from "@yamada-ui/react";
import { Button } from "@yamada-ui/react";
import Papa from "papaparse";

import {
  Drawer,
  DrawerOverlay,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  useDisclosure,
} from "@yamada-ui/react";

import { Tabs, Tab, TabPanel } from "@yamada-ui/react";
import { Card, CardHeader, CardBody } from "@yamada-ui/react";
import { AlignJustify, ExternalLink } from "lucide-react";
import { io } from "socket.io-client";
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

function MonitorPage() {
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
  const [downloadType, setDownloadType] = useState<number>(0);
  const [localIP, setLocalIP] = useState<string>("");
  const domainRaw = useParams<{ domain: string }>().domain || "default";
  const domain = decodeURIComponent(domainRaw);
  const socketRef = useRef<any>(null);
  const expectedAttendeesCopyRef = useRef<string[]>([]);

  const { uuid } = useParams<{ uuid: string }>();

  const { open, onOpen, onClose } = useDisclosure();

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

    fetchLocalIP();
    fetchData();
    setDataFetched(true);
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

  const downloadexcel = () => {
    if (expectedAttendees.length === 0) {
      alert("出席者がいません。");
      return;
    }

    if (downloadType === 0) {
      const data = expectedAttendees.map((attendee) => ({
        学籍番号: attendee.id,
        出席: attendee.attended ? "O" : "",
      }));
      const dataToday = onTheDay.map((attendee) => ({
        学籍番号: attendee,
      }));
      const dataStatistics = {
        出席者数: expectedAttendees.filter((attendee) => attendee.attended)
          .length,
        出席率:
          Math.round(
            (expectedAttendees.filter((attendee) => attendee.attended).length /
              expectedAttendees.length) *
              100
          ) + "%",
        当日参加者数: onTheDay.length,
        合計数:
          expectedAttendees.filter((attendee) => attendee.attended).length +
          onTheDay.length,
      };

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      const worksheetToday = XLSX.utils.json_to_sheet(dataToday);
      const worksheetStatistics = XLSX.utils.json_to_sheet([dataStatistics]);
      XLSX.utils.book_append_sheet(workbook, worksheet, "出席者リスト");
      XLSX.utils.book_append_sheet(workbook, worksheetToday, "当日参加者");
      XLSX.utils.book_append_sheet(workbook, worksheetStatistics, "統計情報");
      const fileName = `${roomName}_出席者リスト.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } else if (downloadType === 1) {
      const csvData = expectedAttendees.map((attendee) => ({
        学籍番号: attendee.id,
        出席: attendee.attended ? "O" : "",
      }));
      const csvDataToday = onTheDay.map((attendee) => ({
        学籍番号: attendee,
      }));
      const csvDataStatistics = {
        出席者数: expectedAttendees.filter((attendee) => attendee.attended)
          .length,
        出席率:
          Math.round(
            (expectedAttendees.filter((attendee) => attendee.attended).length /
              expectedAttendees.length) *
              100
          ) + "%",
        当日参加者数: onTheDay.length,
        合計数:
          expectedAttendees.filter((attendee) => attendee.attended).length +
          onTheDay.length,
      };
      const csv = Papa.unparse({
        fields: ["学籍番号", "出席"],
        data: csvData,
      });
      const csvToday = Papa.unparse({
        fields: ["学籍番号"],
        data: csvDataToday,
      });
      const csvStatistics = Papa.unparse({
        fields: ["出席者数", "出席率", "当日参加者数", "合計数"],
        data: [csvDataStatistics],
      });
      const csvHeader = `イベント名,${roomName}\nイベント情報,${roomInfo}\n\n`;
      const csvFooter = `\n\n出席者リスト\n${csv}\n\n当日参加者リスト\n${csvToday}\n\n統計情報\n${csvStatistics}`;
      const fileName = `${roomName}_出席者リスト.csv`;
      const blob = new Blob([csvHeader + csvFooter], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (downloadType === 2) {
      const jsonData = expectedAttendees.map((attendee) => ({
        id: attendee.id,
        attended: attendee.attended,
      }));
      const jsonDataToday = onTheDay.map((attendee) => ({
        id: attendee,
      }));

      const roomSettings = {
        eventname: roomName,
        eventinfo: roomInfo,
        arrowtoday: settings.arrowtoday,
        autotodayregister: settings.autotodayregister,
        soukai: settings.soukai,
        nolist: settings.noList,
      };

      const fileName = `${roomName}_出席者リスト.json`;
      const blob = new Blob(
        [
          JSON.stringify({
            attendees: jsonData,
            today: jsonDataToday,
            roomSettings: roomSettings,
          }),
        ],
        { type: "application/json" }
      );
      downloadBlob(blob, fileName);
      function downloadBlob(blob: Blob, fileName: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  const openAttendancePage = () => {
    const url = `http://${localIP}:8080/attendance.html?uuid=${uuid}&server=${domain}`;
    console.log("Opening attendance page with URL:", url);
    console.log("UUID:", uuid, "Server:", domain);
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen custom_font bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-lg sticky top-0 z-50 animate-fadeInDown animation-delay-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Text
            fontSize={"5xl"}
            bgGradient="linear(to-l, #7928CA, #FF0080)"
            bgClip="text"
            fontWeight="bold"
          >
            {roomName} - モニタ
          </Text>
          <div className="flex gap-4">
            <Button
              leftIcon={<ExternalLink className="w-5 h-5" />}
              onClick={openAttendancePage}
              colorScheme="primary"
            >
              出席登録ページを開く
            </Button>
            <Button
              rightIcon={<AlignJustify className="w-6 h-6 text-gray-500" />}
              onClick={onOpen}
            >
              Menu
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 統計情報カード */}
          <div className="lg:col-span-1">
            <Card className="bg-white shadow-lg rounded-xl p-6 sticky top-28">
              <CardBody>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                  統計情報
                </h2>
                {settings.soukai ? (
                  <div className="space-y-4">
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">委任状数</p>
                      <p className="text-3xl font-bold text-indigo-800">
                        {expectedAttendees.length -
                          expectedAttendees.filter((a) => a.attended).length}
                        <span className="text-sm font-normal text-gray-500 ml-1">
                          枚
                        </span>
                      </p>
                    </div>

                    <div className="bg-emerald-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">出席者数</p>
                      <p className="text-3xl font-bold text-emerald-800">
                        {onTheDay.length +
                          expectedAttendees.filter((a) => a.attended).length}
                        <span className="text-sm font-normal text-gray-500 ml-1">
                          名
                        </span>
                      </p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500">総数</p>
                      <p className="text-3xl font-bold text-purple-800">
                        {expectedAttendees.length}
                        <span className="text-sm font-normal text-gray-500 ml-1">
                          名
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!settings.noList && (
                      <>
                        <div className="bg-indigo-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500">出席者数</p>
                          <p className="text-3xl font-bold text-indigo-800">
                            {expectedAttendees.filter((a) => a.attended).length}
                            <span className="text-sm font-normal text-gray-500 ml-1">
                              / {expectedAttendees.length}人
                            </span>
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded-md shadow-sm">
                          <p className="text-sm text-gray-500 mb-2">出席率</p>
                          <div className="relative pt-1">
                            <div className="overflow-hidden h-3 text-xs flex rounded bg-indigo-200">
                              <div
                                style={{
                                  width: `${Math.round(
                                    (expectedAttendees.filter((a) => a.attended)
                                      .length /
                                      expectedAttendees.length) *
                                      100
                                  )}%`,
                                }}
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-1000"
                              ></div>
                            </div>
                          </div>
                          <p className="text-right text-indigo-600 font-bold text-2xl mt-2">
                            {Math.round(
                              (expectedAttendees.filter((a) => a.attended)
                                .length /
                                expectedAttendees.length) *
                                100
                            )}
                            %
                          </p>
                        </div>
                      </>
                    )}

                    {settings.arrowtoday && (
                      <>
                        <div className="bg-emerald-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500">当日参加者数</p>
                          <p className="text-3xl font-bold text-emerald-800">
                            {onTheDay.length}
                            <span className="text-sm font-normal text-gray-500 ml-1">
                              人
                            </span>
                          </p>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500">合計数</p>
                          <p className="text-3xl font-bold text-purple-800">
                            {expectedAttendees.filter((a) => a.attended)
                              .length + onTheDay.length}
                            <span className="text-sm font-normal text-gray-500 ml-1">
                              人
                            </span>
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">出席登録URL</p>
                  <p className="text-sm font-mono text-gray-800 break-all">
                    http://{localIP}:8080/attendance.html?uuid={uuid}&server=
                    {domain}
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 出席者リスト */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-lg rounded-xl p-6">
              <CardBody>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                  {settings.noList ? "当日参加者リスト" : "出席者リスト"}
                </h2>
                {settings.noList ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                            学籍番号
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {onTheDay.map((student) => (
                          <tr key={student} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <Text fontSize={"2xl"} fontWeight="medium">
                                {student}
                              </Text>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                            学籍番号
                          </th>
                          <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">
                            状態
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {expectedAttendees.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <Text fontSize={"2xl"} fontWeight="medium">
                                {student.id}
                              </Text>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {student.attended ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                  <svg
                                    className="mr-1.5 h-4 w-4 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M5 13l4 4L19 7"
                                    ></path>
                                  </svg>
                                  出席
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                  {settings.soukai ? "委任状" : "未出席"}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      <Drawer open={open} onClose={onClose}>
        <DrawerOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <DrawerHeader>メニュー</DrawerHeader>
        <DrawerBody>
          <Card variant={"outline"} className="mb-4 w-full">
            <CardHeader>
              <Text fontSize={"2xl"} fontWeight="bold">
                ダウンロード
              </Text>
            </CardHeader>
            <CardBody>
              <Tabs
                variant="sticky"
                index={downloadType}
                onChange={(index) => setDownloadType(index)}
              >
                <Tab>Excel</Tab>
                <Tab>CSV</Tab>
                <Tab>JSON</Tab>
                <TabPanel>
                  <Text fontSize={"lg"}>Excel形式でダウンロードします。</Text>
                </TabPanel>
                <TabPanel>
                  <Text fontSize={"lg"}>CSV形式でダウンロードします。</Text>
                </TabPanel>
                <TabPanel>
                  <Text fontSize={"lg"}>JSON形式でダウンロードします。</Text>
                </TabPanel>
              </Tabs>
              <Button
                colorScheme="primary"
                onClick={downloadexcel}
                className="w-full mt-4"
              >
                {downloadType === 0
                  ? "Excel"
                  : downloadType === 1
                  ? "CSV"
                  : "JSON"}
                でダウンロード
              </Button>
            </CardBody>
          </Card>

          <Card variant={"outline"} className="mb-4 w-full">
            <CardHeader>
              <Text fontSize={"2xl"} fontWeight="bold">
                イベント情報
              </Text>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">イベント名</p>
                  <p className="text-lg font-semibold">{roomName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">イベント情報</p>
                  <p className="text-lg">{roomInfo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">UUID</p>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                    {uuid}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </DrawerBody>
        <DrawerFooter>
          <Button variant="ghost" onClick={onClose}>
            とじる
          </Button>
        </DrawerFooter>
      </Drawer>
    </div>
  );
}

export default MonitorPage;
