import "@/App.css";
import { useState } from "react";

function JoinRoom() {
  const [domain, setDomain] = useState<string>("");
  const [port, setPort] = useState<string>("");
  const [uuid, setUuid] = useState<string>("");
  return (
    <main className="main_container">
      <input
        type="text"
        placeholder="Enter room code"
        className="input_field"
        style={{
          width: "300px",
          height: "40px",
          fontSize: "16px",
          borderRadius: "5px",
          padding: "10px",
        }}
        autoFocus
        onChange={(e) => setUuid(e.target.value)}
      />
      <input
        type="text"
        placeholder="Enter domain"
        className="input_field"
        style={{
          width: "300px",
          height: "40px",
          fontSize: "16px",
          borderRadius: "5px",
          padding: "10px",
        }}
        onChange={(e) => setDomain(e.target.value)}
      />
      <input
        type="text"
        placeholder="Enter port"
        className="input_field"
        style={{
          width: "300px",
          height: "40px",
          fontSize: "16px",
          borderRadius: "5px",
          padding: "10px",
        }}
        onChange={(e) => setPort(e.target.value)}
      />
      <button
        className="join_button"
        style={{
          width: "300px",
          height: "40px",
          fontSize: "16px",
          borderRadius: "5px",
          padding: "10px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
        }}
        onClick={() => {
          if (uuid && domain && port) {
            window.location.href = `/monitor/${uuid}/${encodeURIComponent(
              `${domain}:${port}`
            )}`;
          } else {
            alert("Please fill in all fields.");
          }
        }}
      >
        Join Room
      </button>
    </main>
  );
}

export default JoinRoom;
