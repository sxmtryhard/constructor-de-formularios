import type { Metadata } from "next";
import { FormListView } from "@/features/forms/ui/form-list";

export const metadata: Metadata = { title: "Mis formularios" };

export default function FormsPage() {
  return <FormListView />;
}
