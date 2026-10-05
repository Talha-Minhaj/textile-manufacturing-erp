import "./globals.css";
export const metadata = {
  title: "ThreadCraft ERP | Enterprise Apparel Manufacturing & Operations",
  description: "Next.js 14 & Prisma Enterprise Apparel Operations Platform",
};
export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>{children}</body></html>);
}
