import { IconMoon, IconSun } from "./Icon";
import { useTheme } from "./Theme";

interface Props {
  className?: string;
  size?: number;
}

export default function ThemeToggle({ className, size = 16 }: Props) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={toggle}
      className={`btn-ghost !px-2 !py-1.5 ${className ?? ""}`}
      aria-label={label}
      title={label}
    >
      {isDark ? <IconSun size={size} /> : <IconMoon size={size} />}
    </button>
  );
}
