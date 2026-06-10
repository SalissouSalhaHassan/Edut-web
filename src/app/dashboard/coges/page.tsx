import React from "react";
import CogesUI from "./coges-ui";
import { getCogesPayments } from "@/domains/finance/actions/coges.actions";

export const metadata = {
  title: "Paiement COGES | École Plus",
};

export default async function CogesPage() {
  const result = await getCogesPayments();
  const initialPayments = (result?.success ? result.data : []) as any[];

  return (
    <div className="flex-1 h-full overflow-hidden bg-slate-50">
      <CogesUI initialPayments={initialPayments} />
    </div>
  );
}
