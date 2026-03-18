import { sendChat, ChatMessage } from "../api";

export function ChatUI(
  container: HTMLElement,
  getCommunityId: () => string | null
) {
  const history: ChatMessage[] = [];

  const root = document.createElement("div");
  root.style.cssText =
    "display:flex;flex-direction:column;height:calc(100vh - 140px);";

  const messages = document.createElement("div");
  messages.style.cssText =
    "flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;";

  const inputRow = document.createElement("div");
  inputRow.style.cssText =
    "display:flex;gap:8px;padding:16px;border-top:1px solid #e5e5e5;";

  const textarea = document.createElement("textarea");
  textarea.placeholder = "Escribí tu pregunta…";
  textarea.rows = 2;
  textarea.style.cssText =
    "flex:1;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:none;font-family:inherit;";

  const sendBtn = document.createElement("button");
  sendBtn.textContent = "Enviar";
  sendBtn.style.cssText =
    "padding:10px 20px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;align-self:flex-end;";

  inputRow.append(textarea, sendBtn);
  root.append(messages, inputRow);
  container.appendChild(root);

  function addMessage(role: "user" | "assistant", content: string) {
    const bubble = document.createElement("div");
    const isUser = role === "user";
    bubble.style.cssText = `
      max-width:75%;align-self:${isUser ? "flex-end" : "flex-start"};
      background:${isUser ? "#1a1a1a" : "#fff"};
      color:${isUser ? "#fff" : "#1a1a1a"};
      padding:12px 16px;border-radius:${isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px"};
      font-size:14px;line-height:1.5;
      ${isUser ? "" : "border:1px solid #e5e5e5;"}
      white-space:pre-wrap;word-break:break-word;
    `;
    bubble.textContent = content;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  async function submit() {
    const communityId = getCommunityId();
    if (!communityId) {
      alert("Seleccioná una comunidad primero.");
      return;
    }
    const question = textarea.value.trim();
    if (!question) return;

    textarea.value = "";
    sendBtn.disabled = true;
    sendBtn.textContent = "…";

    addMessage("user", question);
    history.push({ role: "user", content: question });

    try {
      const { answer } = await sendChat(communityId, question, history);
      addMessage("assistant", answer);
      history.push({ role: "assistant", content: answer });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      addMessage("assistant", `⚠️ ${msg}`);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Enviar";
      textarea.focus();
    }
  }

  sendBtn.addEventListener("click", submit);
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
}
