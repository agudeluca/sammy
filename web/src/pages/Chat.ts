import { clearToken } from "../auth";
import { Community } from "../api";
import { CommunitySelector } from "../components/CommunitySelector";
import { ChatUI } from "../components/ChatUI";

export function ChatPage(container: HTMLElement) {
  container.innerHTML = "";

  let currentCommunity: Community | null = null;

  const layout = document.createElement("div");
  layout.style.cssText = "max-width:800px;margin:0 auto;padding:16px;";

  // Header
  const header = document.createElement("div");
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;";

  const title = document.createElement("h1");
  title.textContent = "Chat";
  title.style.cssText = "font-size:22px;";

  const nav = document.createElement("div");
  nav.style.cssText = "display:flex;gap:12px;align-items:center;";

  const adminLink = document.createElement("a");
  adminLink.href = "/admin";
  adminLink.textContent = "← Admin";
  adminLink.style.cssText = "font-size:14px;color:#1a1a1a;text-decoration:none;";

  const logoutBtn = document.createElement("button");
  logoutBtn.textContent = "Salir";
  logoutBtn.style.cssText =
    "padding:6px 14px;background:transparent;border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;";
  logoutBtn.addEventListener("click", () => {
    clearToken();
    window.location.href = "/login";
  });

  nav.append(adminLink, logoutBtn);
  header.append(title, nav);

  const selectorSection = document.createElement("div");
  CommunitySelector(selectorSection, (c) => {
    currentCommunity = c;
  });

  const chatSection = document.createElement("div");
  ChatUI(chatSection, () => currentCommunity?.id ?? null);

  layout.append(header, selectorSection, chatSection);
  container.appendChild(layout);
}
