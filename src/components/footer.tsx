export default function Footer() {
  return (
    <footer className="border-t border-slate-800 py-6">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} QuizKeen — Learn. Play. Compete. Built by Abdullah Shafi.
      </div>
    </footer>
  );
}