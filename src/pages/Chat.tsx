import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, User } from "lucide-react";
import chickMascot from "@/assets/chick-mascot.png";

const mockMessages = [
  { id: 1, sender: "them", text: "Hey! Nice to match with you guys!", timestamp: "10:30 AM", senderName: "Sarah" },
  { id: 2, sender: "us", text: "Hey! Great to meet you too!", timestamp: "10:32 AM", senderName: "You" },
  { id: 3, sender: "them", text: "Would you like to grab coffee this weekend?", timestamp: "10:35 AM", senderName: "Emma" },
  { id: 4, sender: "us", text: "That sounds perfect! Saturday afternoon?", timestamp: "10:36 AM", senderName: "You" },
];

const Chat = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(mockMessages);

  const handleSend = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: messages.length + 1,
      sender: "us",
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: "You",
    };
    
    setMessages([...messages, newMessage]);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/matches")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center absolute -right-3 top-0 border-2 border-card">
              <User className="w-6 h-6 text-primary" />
            </div>
          </div>

          <div className="flex-1 ml-2">
            <h2 className="font-semibold text-foreground">Sarah & Emma</h2>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "us" ? "justify-end" : "justify-start"} animate-slide-up`}
          >
            <div className={`max-w-[70%] ${msg.sender === "us" ? "order-2" : "order-1"}`}>
              <div className="flex items-end gap-2">
                {msg.sender === "them" && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1 px-2">
                    {msg.senderName}
                  </p>
                  <div
                    className={`rounded-3xl px-6 py-3 shadow-sm ${
                      msg.sender === "us"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground"
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-2">
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="rounded-full flex-1"
          />
          <Button
            variant="yolk"
            size="icon"
            className="rounded-full w-12 h-12 flex-shrink-0"
            onClick={handleSend}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
