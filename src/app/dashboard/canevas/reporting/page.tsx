export const dynamic = "force-dynamic";

import { getSessions } from "@/domains/academics/actions/academics.actions";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import ReportingClient from "./ReportingClient";

export const metadata = {
  title: "Centre de Reporting | Canevas | Edut",
  description: "Centre de reporting des canevas scolaires",
};

export default async function ReportingCentrePage() {
  const [sessionsRes, headerConfigRes] = await Promise.all([
    getSessions(),
    getDocumentHeaderConfig()
  ]);

  const sessions = (sessionsRes as any).data || sessionsRes || [];
  const activeSession = sessions.find((s: any) => s.isActive) || sessions[0];
  const activeSessionName = activeSession?.sessionName || (new Date().getFullYear() + "-" + (new Date().getFullYear() + 1));

  return (
    <ReportingClient
      sessions={sessions}
      activeSessionName={activeSessionName}
      headerConfig={(headerConfigRes as any)?.data || null}
    />
  );
}
