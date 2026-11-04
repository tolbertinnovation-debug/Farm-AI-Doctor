import "./globals.css";

export const metadata = {
  title: "FarmDoctor",
  description: "Simple help for crops and animals."
};

export const viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-green-50 text-slate-900">
        <header className="bg-green-700 text-white">
          <div className="mx-auto flex max-w-md flex-wrap items-center justify-between gap-2 px-4 py-3">
            <span className="text-lg font-bold">🌱 FarmDoctor</span>
            <div className="flex flex-wrap gap-2">
              <a href="/dashboard" className="flex min-h-[48px] items-center rounded-lg bg-green-600 px-4 py-3 font-bold text-white">
                My farm
              </a>
              <a href="/signin" className="flex min-h-[48px] items-center rounded-lg bg-white px-4 py-3 font-bold text-green-800">
                Sign in
              </a>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-md px-4 py-6">{children}</main>
      </body>
    </html>
  );
}