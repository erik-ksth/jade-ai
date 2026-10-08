"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
     const { resolvedTheme, setTheme } = useTheme();
     const [mounted, setMounted] = useState(false);

     // Avoid hydration mismatch: the resolved theme is only known on the client
     useEffect(() => {
          setMounted(true);
     }, []);

     const isDark = mounted && resolvedTheme === "dark";
     const label = isDark ? "Switch to light theme" : "Switch to dark theme";

     return (
          <Button
               variant="ghost"
               size="icon-sm"
               onClick={() => setTheme(isDark ? "light" : "dark")}
               aria-label={label}
               title={label}
               className="text-muted-foreground hover:text-foreground"
          >
               {isDark ? <Sun /> : <Moon />}
          </Button>
     );
}
