import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ShellFrame } from "@/components/shell/shell-frame";

export default async function ShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <ShellFrame>{children}</ShellFrame>;
}
