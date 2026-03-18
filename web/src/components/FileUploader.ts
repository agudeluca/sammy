import { uploadDocument } from "../api";

export function FileUploader(
  container: HTMLElement,
  getCommunityId: () => string | null,
  onUploaded: () => void
) {
  const root = document.createElement("div");
  root.style.cssText =
    "border:2px dashed #ddd;border-radius:8px;padding:32px;text-align:center;margin-bottom:16px;";

  const label = document.createElement("p");
  label.textContent = "Arrastrá archivos o hacé click para subir (PDF, DOCX, TXT)";
  label.style.cssText = "color:#666;margin-bottom:12px;font-size:14px;";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.docx,.txt";
  input.multiple = true;
  input.style.display = "none";

  const btn = document.createElement("button");
  btn.textContent = "Seleccionar archivos";
  btn.style.cssText =
    "padding:8px 16px;background:#1a1a1a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;";

  const status = document.createElement("p");
  status.style.cssText = "margin-top:10px;font-size:13px;color:#555;";

  root.append(label, btn, input, status);
  container.appendChild(root);

  btn.addEventListener("click", () => input.click());

  async function handleFiles(files: FileList) {
    const communityId = getCommunityId();
    if (!communityId) {
      alert("Seleccioná una comunidad primero.");
      return;
    }
    for (const file of Array.from(files)) {
      status.textContent = `Subiendo ${file.name}…`;
      try {
        await uploadDocument(file, communityId);
        status.textContent = `${file.name} subido. Procesando…`;
        onUploaded();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Error desconocido";
        status.textContent = `Error: ${msg}`;
      }
    }
  }

  input.addEventListener("change", () => {
    if (input.files?.length) handleFiles(input.files);
    input.value = "";
  });

  root.addEventListener("dragover", (e) => {
    e.preventDefault();
    root.style.borderColor = "#1a1a1a";
  });

  root.addEventListener("dragleave", () => {
    root.style.borderColor = "#ddd";
  });

  root.addEventListener("drop", (e) => {
    e.preventDefault();
    root.style.borderColor = "#ddd";
    if (e.dataTransfer?.files.length) handleFiles(e.dataTransfer.files);
  });
}
