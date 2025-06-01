import "@/App.css";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { data, useParams } from "react-router";
import { IconButton, is } from "@yamada-ui/react";
import { Input } from "@yamada-ui/react";
import { invoke } from "@tauri-apps/api/core";
import { Text } from "@yamada-ui/react";

import { Check } from "lucide-react";

import { io } from "socket.io-client";

type Attendee = {
  id: string;
  attended: boolean;
};
import { Card, CardBody, CardFooter } from "@yamada-ui/react";
import { E } from "node_modules/framer-motion/dist/types.d-CtuPurYT";

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-6 h-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-6.364-.386 1.591-1.591M3 12h2.25m.386-6.364 1.591 1.591"
    />
  </svg>
);

function EventPage() {
  const [expectedAttendees, setExpectedAttendees] = useState<Attendee[]>([
    { id: "データ未読み込み", attended: true },
  ]);
  const [newAttendee, setNewAttendee] = useState<string>("");
  const [dataFetched, setDataFetched] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [roomInfo, setRoomInfo] = useState<string>("");
  const [onTheDay, setOnTheDay] = useState<string[]>([]);
  const [arrowtoday, setArrowToday] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(
    useParams<{ isHost: string }>().isHost === "true" ? true : false
  );
  const [domain, setDomain] = useState<string>(
    useParams<{ domain: string }>().domain || "default"
  );
  const socketRef = useRef<any>(null);

  const { uuid } = useParams<{ uuid: string }>();
  const inputRef = useRef<HTMLInputElement>(null);

  interface EventData {
    participants: string[];
    eventname: string;
    eventinfo: string;
    arrowtoday: boolean;
  }

  useEffect(() => {
    if (!uuid) {
      console.error("UUID is not provided in the URL parameters.");
      return;
    }
    if (dataFetched) {
      console.log("Data already fetched, skipping fetch.");
      return;
    }
    console.log("EventPage mounted with UUID:", uuid);

    const fetchData = async () => {
      try {
        const response = await invoke<{
          participants: string[];
          eventname: string;
          eventinfo: string;
          arrowtoday: boolean;
        }>("get_event", { uuid });
        if (response) {
          console.log("Fetched event data:", response);
          // 学籍番号のリストを期待される出席者として設定
          setExpectedAttendees(
            response.participants.map((attendeeId) => ({
              id: attendeeId,
              attended: false,
            }))
          );
          setRoomName(response.eventname);
          setRoomInfo(response.eventinfo);
          setArrowToday(response.arrowtoday);
          console.log("Data fetched successfully:", response);
        } else {
          console.error("No data received for the event.");
        }
      } catch (error) {
        console.error("Error fetching event data:", error);
      } finally {
      }
    };
    const fetchDataSocket = () => {
      try {
        socketRef.current = io(`http://` + domain);

        socketRef.current.on("join_return", (data: any) => {
          console.log("Connected to server with ID:", socketRef.current.id);
          console.log("Connection data:", data);
          if (data) {
            setExpectedAttendees(
              data.participants.map((attendeeId: string) => ({
                id: attendeeId,
                attended: false,
              }))
            );
            setRoomName(data.eventname);
            setRoomInfo(data.eventinfo);
            setArrowToday(data.arrowtoday);
          } else {
            console.error("No data received from socket.");
          }
        });

        socketRef.current.emit("join", uuid);

        return () => {
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
          }
        };
      } catch (error) {
        console.error("Error fetching event data via socket:", error);
      }
    };
    if (isHost) {
      fetchData();
      setDataFetched(true);
    } else {
      fetchDataSocket();
      setDataFetched(true);
    }
  }, [uuid]);

  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const dataCompression = () => {
    // データ圧縮処理をここに実装
    const compressedData = [];
    let count = 0;
    for (const attendeeIndex of expectedAttendees) {
      if (attendeeIndex.attended) {
        compressedData.push(count);
      }
      count++;
    }
    return compressedData;
  };

  const handleAttendance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newAttendee.trim()) return; // 空の入力は無視

    const attendeeId = newAttendee.trim();
    setNewAttendee(""); // 入力フィールドをクリア

    // 既に出席済みか確認
    const existingAttendee = expectedAttendees.find(
      (attendee) => attendee.id === attendeeId
    );
    if (existingAttendee) {
      if (existingAttendee.attended) {
        alert(`${attendeeId} は既に出席済みです。`);
      } else {
        // 出席登録
        existingAttendee.attended = true;
        setExpectedAttendees([...expectedAttendees]);
        scrollToElement(attendeeId);
        setSelectedAttendee(attendeeId);
      }
    } else {
      // 新規参加者として追加
      if (onTheDay.includes(attendeeId)) {
        alert(`${attendeeId} は既に当日参加者に含まれています。`);
      } else {
        setOnTheDay((prev) => [...prev, attendeeId]);
      }
    }

    // 入力フィールドにフォーカスを戻す
    inputRef.current?.focus();
  };

  interface KeyDownEvent extends React.KeyboardEvent<HTMLInputElement> {}

  const handleKeyDown = (e: KeyDownEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAttendance({
        preventDefault: () => {},
      } as React.FormEvent<HTMLFormElement>);
    }
  };

  return (
    <div className="min-h-screen custom_font">
      {/* ヘッダー */}
      <header className="bg-white  shadow-lg sticky top-0 z-50 animate-fadeInDown animation-delay-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Text
            fontSize={"5xl"}
            bgGradient="linear(to-l, #7928CA, #FF0080)"
            bgClip="text"
            fontWeight="bold"
          >
            {roomName}
          </Text>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 学籍番号入力 */}
        <div>
          <Card className="mb-10 p-6 bg-white  rounded-xl shadow-2xl animate-fadeInUp animation-delay-200 sticky top-40">
            <CardBody>
              <div className="mb-4 w-full">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newAttendee}
                    onChange={(e) => setNewAttendee(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="学籍番号を入力"
                    className="w-full h-15 px-4 py-3 border border-indigo-300 ring-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200g"
                    autoFocus
                    style={{
                      border: "2px solid #c3dafe",
                      borderRadius: "8px",
                      fontSize: "1.5rem",
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <IconButton
                      onClick={() =>
                        handleAttendance({
                          preventDefault: () => {},
                        } as React.FormEvent<HTMLFormElement>)
                      }
                      icon={<Check />}
                      size="sm"
                      colorScheme={"primary"}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  学籍番号を入力してEnterキーを押すと出席が登録されます
                </p>
              </div>
              {/* 出席状況サマリー */}
              <div className="bg-indigo-50 w-full rounded-lg p-4 mt-4 animate-fadeIn">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-indigo-900">出席状況</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <p className="text-sm text-gray-500">出席者数</p>
                    <p className="text-2xl font-bold text-indigo-800 text-center">
                      {
                        expectedAttendees.filter(
                          (attendee) => attendee.attended
                        ).length
                      }{" "}
                      <span className="text-sm font-normal text-gray-500">
                        / {expectedAttendees.length}人
                      </span>
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <p className="text-sm text-gray-500">出席率</p>
                    <p className="text-2xl font-bold text-indigo-800 text-center">
                      {Math.round(
                        (expectedAttendees.filter(
                          (attendee) => attendee.attended
                        ).length /
                          expectedAttendees.length) *
                          100
                      )}
                      <span className="text-sm font-normal text-gray-500">
                        %
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-white p-3 rounded-md shadow-sm">
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-indigo-200">
                      <div
                        style={{
                          width: `${Math.round(
                            (expectedAttendees.filter(
                              (attendee) => attendee.attended
                            ).length /
                              expectedAttendees.length) *
                              100
                          )}%`,
                        }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-1000 ease-out"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-emerald-50 w-full rounded-lg p-4 mt-4 animate-fadeIn">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-emerald-900">その他</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <p className="text-sm text-gray-500">当日参加</p>
                    <p className="text-2xl font-bold text-emerald-800 text-center">
                      {onTheDay.length}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        人
                      </span>
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <p className="text-sm text-gray-500">合計数</p>
                    <p className="text-2xl font-bold text-emerald-800 text-center">
                      {expectedAttendees.filter((attendee) => attendee.attended)
                        .length + onTheDay.length}{" "}
                      <span className="text-sm font-normal text-gray-500">
                        人
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
            <CardFooter className="flex justify-end"></CardFooter>
          </Card>
        </div>

        {/* 学生リスト */}
        <div>
          <Card className="h-full min-h-[400px] bg-white shadow-lg rounded-xl p-6 animate-fadeInUp animation-delay-400">
            <CardBody>
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      学籍番号
                    </th>

                    <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状態
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expectedAttendees.map((student) => (
                    <tr
                      key={student.id}
                      id={student.id}
                      className={cn(
                        "transition-colors duration-150 animationFlash  m-3",
                        {
                          "bg-emerald-100": selectedAttendee === student.id,
                        }
                      )}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Text fontSize={"3xl"} fontWeight="medium">
                          {student.id}
                        </Text>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        {student.attended ? (
                          <span className="justify-center inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800 animate-scaleIn">
                            <svg
                              className="mr-1.5 h-4 w-4 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
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
                          <span className="m-3 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            <svg
                              className="mr-1.5 h-4 w-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              ></path>
                            </svg>
                            未確認
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default EventPage;
