import { getHostelRooms, getHostelAllocations } from "@/domains/hostel/actions/hostel.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import HostelClient from "./HostelClient";

export const metadata = {
  title: "Internat & Dortoirs | Edut",
  description: "Gestion des résidences étudiantes et des affectations de chambres",
};

export default async function HostelPage() {
  const roomsRes = await getHostelRooms();
  const allocationsRes = await getHostelAllocations();
  const studentsRes = await getStudents();

  const rooms: any[] = (roomsRes as any).data?.data || (roomsRes as any).data || [];
  const allocations: any[] = (allocationsRes as any).data?.data || (allocationsRes as any).data || [];
  const students: any[] = (studentsRes as any).data || (studentsRes.data as any)?.data || [];

  return (
    <HostelClient
      rooms={rooms}
      allocations={allocations}
      students={students}
    />
  );
}
