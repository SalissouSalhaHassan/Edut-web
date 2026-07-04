import { getSessions } from "@/domains/academics/actions/academics.actions";
import ReportingClient from "./ReportingClient";

export const metadata = {
  title: "Centre de Reporting | Canevas | Edut",
  description: "Centre de reporting des canevas scolaires",
};

export default async function ReportingCentrePage() {
  const sessionsRes = await getSessions();
  const sessions = (sessionsRes as any).data || sessionsRes || [];

  const activeSession = sessions.find((s: any) => s.isActive) || sessions[0];
  const activeSessionName = activeSession?.sessionName || (new Date().getFullYear() + "-" + (new Date().getFullYear() + 1));

  return (
    <ReportingClient
      sessions={sessions}
      activeSessionName={activeSessionName}
    />
  );
}
