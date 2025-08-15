const { io } = require("socket.io-client");

const token = ""; 
const chatId = "cmcftdok80009zp0u853i1udh";

const socket = io("http://localhost:3000/chat", {
  auth: { token }
});

socket.on("connect", () => {
  console.log("Connected!");

  socket.emit("joinChat", { chatId });

  socket.on("joinedChat", (data) => {
    console.log("Joined chat:", data);
  });

  socket.on("message", (msg) => {
    console.log("New message:", msg);
  });

  socket.emit("sendMessage", { chatId, content: "MENSAGEM TESTE" });
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});