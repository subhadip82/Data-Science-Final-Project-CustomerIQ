import { PublicNavbar } from "@/components/layout/PublicNavbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNavbar />
      <main>{children}</main>
    </>
  );
}
