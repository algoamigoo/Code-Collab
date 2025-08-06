import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import toast from "react-hot-toast";
import "./App.css";

const socket = io("https://code-collab-0ixr.onrender.com");

const EditorPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName] = useState(location.state?.userName || "");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start code here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [outPut, setOutPut] = useState("");
  const [version] = useState("*");
  const [userInput, setUserInput] = useState("");

  useEffect(() => {
    if (!location.state) {
      navigate("/");
      return;
    }

    socket.emit("join", { roomId, userName });

    socket.on("userJoined", (users) => {
      setUsers(users);
      if (users.length > 1) {
        toast.success(`${users[users.length - 1].slice(0, 8)}... joined the room`);
      }
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 8)}... is Typing`);
      setTimeout(() => setTyping(""), 2000);
    });

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });

    socket.on("codeResponse", (response) => {
      setOutPut(response.run.output);
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
    };
  }, [roomId, userName, navigate, location.state]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    navigate("/");
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopySuccess("Copied!");
      toast.success("Room ID has been copied to your clipboard");
      setTimeout(() => setCopySuccess(""), 2000);
    } catch (err) {
      toast.error("Could not copy the Room ID");
    }
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  };

  const runCode = () => {
    socket.emit("compileCode", {
      code,
      roomId,
      language,
      version,
      input: userInput,
    });
  };

  if (!location.state) {
    return null;
  }

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/code-collab.png" alt="code-collab-logo" />
            <h3>Code-Collab</h3>
            <h5>Code together, anywhere</h5>
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {users.map((user, index) => (
              <div key={index} className="client">
                <span className="userName">{user.slice(0, 8)}...</span>
              </div>
            ))}
          </div>
          <p className="typing-indicator">{typing}</p>
          <select
            className="language-selector"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>
      <div className="editorWrap">
        <Editor
          height={"60%"}
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
          }}
        />
        <textarea
          className="input-console"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter input here..."
        />
        <button className="run-btn" onClick={runCode}>
          Execute
        </button>
        <textarea
          className="output-console"
          value={outPut}
          readOnly
          placeholder="Output will appear here ..."
        />
      </div>
    </div>
  );
};

export default EditorPage;
