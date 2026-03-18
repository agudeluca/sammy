import { clearToken } from "../auth";
import { Community } from "../api";
import { CommunitySelector } from "../components/CommunitySelector";
import { FileUploader } from "../components/FileUploader";
import { DocumentList } from "../components/DocumentList";

export function AdminPage(container: HTMLElement) {
  container.innerHTML = "";

  let currentCommunity: Community | null = null;

  const layout = document.createElement("div");
  layout.style.cssText = "max-width:800px;margin:0 auto;padding:32px 16px;";

  // Header
  const header = document.createElement("div");
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;";

  const title = document.createElement("h1");
  title.textContent = "Admin";
  title.style.cssText = "font-size:22px;";

  const nav = document.createElement("div");
  nav.style.cssText = "display:flex;gap:12px;align-items:center;";

  const chatLink = document.createElement("a");
  chatLink.href = "/chat";
  chatLink.textContent = "Chat →";
  chatLink.style.cssText = "font-size:14px;color:#1a1a1a;text-decoration:none;";

  const logoutBtn = document.createElement("button");
  logoutBtn.textContent = "Salir";
  logoutBtn.style.cssText =
    "padding:6px 14px;background:transparent;border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;";
  logoutBtn.addEventListener("click", () => {
    clearToken();
    window.location.href = "/login";
  });

  nav.append(chatLink, logoutBtn);
  header.append(title, nav);

  // Community selector
  const selectorSection = document.createElement("div");
  CommunitySelector(selectorSection, (c) => {
    currentCommunity = c;
    docList.refresh();
  });

  // Uploader
  const uploaderSection = document.createElement("div");
  const docListSection = document.createElement("div");

  const docList = DocumentList(docListSection, () => currentCommunity?.id ?? null);

  FileUploader(uploaderSection, () => currentCommunity?.id ?? null, () => {
    docList.refresh();
  });

  const docsTitle = document.createElement("h2");
  docsTitle.textContent = "Documentos";
  docsTitle.style.cssText = "font-size:16px;margin-bottom:12px;margin-top:24px;";

  layout.append(header, selectorSection, uploaderSection, docsTitle, docListSection);
  container.appendChild(layout);
}
