import { getGraduationProjects } from "@/domains/academics/actions/graduation.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import GraduationClient from "./GraduationClient";

export default async function ResearchGraduationPage() {
  const projectsRes = await getGraduationProjects() as any;
  const projects = projectsRes.data?.data || projectsRes.data || [];

  const employeesRes = await getEmployees() as any;
  const employees = employeesRes.data?.data || employeesRes.data || [];

  // Filter employees to only teachers/professors if needed, or pass all
  const teachers = employees.map((emp: any) => ({
    id: emp.id,
    nom: emp.nom || `${emp.prenom || ""} ${emp.nomFamille || ""}`
  }));

  return (
    <GraduationClient 
      initialProjects={projects} 
      teachers={teachers} 
    />
  );
}
