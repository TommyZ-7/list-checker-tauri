import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Box,
} from "@yamada-ui/react";

interface EventStruct {
  eventname: string;
  eventinfo: string;
  participants: string[];
  arrowtoday: boolean;
  autotodayregister: boolean;
  roomid?: string;
  password?: string;
}

export default function EventListPage() {
  const [events, setEvents] = useState<EventStruct[]>([]);
  const [localIP, setLocalIP] = useState<string>("");
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
    const domain = encodeURIComponent(`${localIP}:50345`);
    navigate(`/monitor/${uuid}/${domain}`);
  };

  return (
    <Box p={8} minH="100vh" bg="gray.50">
      <VStack gap={6}>
        <Heading size="2xl" textAlign="center">
          登録済みイベント一覧
        </Heading>

        <Button
          onClick={() => navigate("/")}
          colorScheme="blue"
          variant="outline"
        >
          ホームに戻る
        </Button>

        {events.length === 0 ? (
          <Card w="full" maxW="800px">
            <CardBody>
              <Text textAlign="center" color="gray.600">
                登録されているイベントがありません
              </Text>
            </CardBody>
          </Card>
        ) : (
          <VStack gap={4} w="full" maxW="800px">
            {events.map((event, index) => (
              <Card key={event.roomid || `event-${index}`} w="full">
                <CardHeader>
                  <HStack justify="space-between">
                    <Heading size="lg">{event.eventname}</Heading>
                    <Button
                      onClick={() => handleOpenMonitor(event.roomid)}
                      colorScheme="green"
                      size="sm"
                      isDisabled={!event.roomid}
                    >
                      モニタを開く
                    </Button>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="start" gap={2}>
                    <Text>
                      <strong>イベント情報:</strong> {event.eventinfo}
                    </Text>
                    <Text>
                      <strong>参加者数:</strong> {event.participants.length}名
                    </Text>
                    <Text>
                      <strong>UUID:</strong>{" "}
                      <code
                        style={{
                          fontSize: "0.85em",
                          background: "#f0f0f0",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {event.roomid || "不明"}
                      </code>
                    </Text>
                    <HStack gap={2}>
                      <Text>
                        <strong>当日登録:</strong>{" "}
                        {event.arrowtoday ? "許可" : "不許可"}
                      </Text>
                      <Text>
                        <strong>自動登録:</strong>{" "}
                        {event.autotodayregister ? "有効" : "無効"}
                      </Text>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
