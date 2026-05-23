export function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} F3 Nation. All rights reserved.</p>
        <p>F3 Codex - Fitness, Fellowship, Faith&reg;.</p>
      </div>
    </footer>
  );
}
