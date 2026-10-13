export default function Footer() {
  return (
    <footer className="relative mt-16 border-t border-white/5 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:text-left">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} QuizKeen — Lär. Spela. Tävla.
        </p>
        <p className="text-xs text-slate-600">Byggt av Abdullah Shafi</p>
      </div>
    </footer>
  );
}
