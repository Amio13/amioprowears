import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdmin } from "@/lib/admin/auth";

export const metadata = { title: "Log in" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdmin()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <p className="font-display text-3xl leading-none tracking-wide">
          <span className="text-brand">AMIO</span>PROWEARS
        </p>
        <h1 className="mt-4 text-xl font-bold">Admin login</h1>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </div>
  );
}
