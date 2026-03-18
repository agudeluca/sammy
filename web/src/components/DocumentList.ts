import { getDocuments, Document } from "../api";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processed: "#10b981",
  error: "#ef4444",
};

export function DocumentList(
  container: HTMLElement,
  getCommunityId: () => string | null
) {
  const root = document.createElement("div");
  container.appendChild(root);

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function render(docs: Document[]) {
    root.innerHTML = "";
    if (docs.length === 0) {
      root.innerHTML = '<p style="color:#666;font-size:14px;">Sin documentos cargados.</p>';
      return;
    }

    const table = document.createElement("table");
    table.style.cssText =
      "width:100%;border-collapse:collapse;font-size:14px;";
    table.innerHTML = `
      <thead>
        <tr style="border-bottom:2px solid #e5e5e5;text-align:left;">
          <th style="padding:8px 12px;">Archivo</th>
          <th style="padding:8px 12px;">Estado</th>
          <th style="padding:8px 12px;">Fecha</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement("tbody");
    for (const doc of docs) {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #f0f0f0";

      const color = STATUS_COLORS[doc.status] ?? "#666";
      const errorTip = doc.error_msg ? ` title="${doc.error_msg}"` : "";
      tr.innerHTML = `
        <td style="padding:8px 12px;">${doc.filename}</td>
        <td style="padding:8px 12px;">
          <span style="color:${color};font-weight:500;"${errorTip}>${doc.status}</span>
        </td>
        <td style="padding:8px 12px;color:#888;">${new Date(doc.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    root.appendChild(table);
  }

  async function refresh() {
    const communityId = getCommunityId();
    if (!communityId) {
      root.innerHTML = "";
      return;
    }
    const docs = await getDocuments(communityId);
    render(docs);

    const hasPending = docs.some((d) => d.status === "pending");
    if (hasPending && !pollTimer) {
      pollTimer = setInterval(refresh, 3000);
    } else if (!hasPending && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  return { refresh };
}
