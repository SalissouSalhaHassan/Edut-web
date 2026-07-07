export const dynamic = "force-dynamic";

import { getLibraryBooks, getLibraryIssues, deleteLibraryBook } from "@/domains/library/actions/library.actions";
import BookDialog from "@/domains/library/components/BookDialog";
import IssueBookDialog from "@/domains/library/components/IssueBookDialog";
import ReturnBookDialog from "@/domains/library/components/ReturnBookDialog";
import ActionMenu from "@/components/common/ActionMenu";
import { Book, Bookmark, Repeat, AlertCircle, MapPin, Search } from "lucide-react";

export default async function LibraryPage() {
  const booksRes = await getLibraryBooks();
  const issuesRes = await getLibraryIssues();
  const books = (booksRes as any).data?.data || (booksRes as any).data || [];
  const issues = (issuesRes as any).data?.data || (issuesRes as any).data || [];

  const stats = [
    { label: "Total Livres", value: books.reduce((acc: number, b: any) => acc + (b.totalQuantity || 0), 0), icon: Book, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Empruntés", value: issues.filter((i: any) => i.status !== "Retourné").length, icon: Repeat, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "En Retard", value: issues.filter((i: any) => i.status === "En retard" || (i.status === "En cours" && new Date(i.dueDate!) < new Date())).length, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Bibliothèque</h1>
          <p className="text-slate-500 mt-2 font-medium">Gérez le catalogue de livres et les emprunts</p>
        </div>
        <BookDialog mode="add" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-6">
              <div className={`p-5 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon size={28} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Book Inventory - 2/3 width */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Book className="text-primary" /> Catalogue des Livres
          </h2>
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Livre / Auteur</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Catégorie</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Dispo</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {books.map((book: any) => (
                  <tr key={book.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-900">{book.title}</p>
                      <p className="text-xs text-slate-400 font-medium">{book.author || "Auteur inconnu"}</p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-1">
                        <MapPin size={10} /> Rayon: {book.shelfLocation || "N/A"}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                        {book.category}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`text-lg font-black ${book.availableQuantity === 0 ? "text-rose-500" : "text-slate-900"}`}>
                        {book.availableQuantity}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold ml-1">/ {book.totalQuantity}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                         {book.availableQuantity > 0 && (
                          <IssueBookDialog 
                            bookId={book.id} 
                            bookTitle={book.title} 
                            trigger={
                              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors font-bold text-xs">
                                <Repeat size={14} /> Prêter
                              </button>
                            }
                          />
                        )}
                        <ActionMenu 
                          title="Gérer le livre"
                          onDelete={deleteLibraryBook.bind(null, book.id)}
                          editDialog={<BookDialog mode="edit" initialData={book} />}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Issues - 1/3 width */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Bookmark className="text-primary" /> Prêts en cours
          </h2>
          <div className="space-y-4">
            {issues.filter((i: any) => i.status !== "Retourné").map((issue: any) => {
              const isOverdue = new Date(issue.dueDate!) < new Date();
              return (
                <div key={issue.id} className={`p-6 rounded-[2rem] bg-white border ${isOverdue ? 'border-rose-100 bg-rose-50/30' : 'border-slate-100'} shadow-sm space-y-4`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">{issue.book?.title}</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Emprunté par: <span className="text-slate-900 font-bold">{issue.student?.nomEtudiant || issue.employee?.nom}</span>
                      </p>
                    </div>
                    {isOverdue && (
                      <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                        Retard
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Échéance</p>
                      <p className={`text-xs font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                        {new Date(issue.dueDate!).toLocaleDateString()}
                      </p>
                    </div>
                    <ReturnBookDialog 
                      issueId={issue.id} 
                      bookTitle={issue.book?.title!} 
                      borrowerName={issue.student?.nomEtudiant || issue.employee?.nom!} 
                      isOverdue={isOverdue} 
                    />
                  </div>
                </div>
              );
            })}
            
            {issues.filter((i: any) => i.status !== "Retourné").length === 0 && (
              <div className="py-20 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <Bookmark className="mx-auto text-slate-200 mb-2" size={40} />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Aucun prêt actif</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
