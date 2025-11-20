"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
     const { theme, setTheme } = useTheme();
     const [mounted, setMounted] = useState(false);

     // Avoid hydration mismatch
     useEffect(() => {
          setMounted(true);
     }, []);

     if (!mounted) {
          return (
               <Button variant="outline" size="sm" className="gap-2">
                    <Sun className="h-4 w-4" />
               </Button>
          );
     }

     return (
          <Button
               variant="outline"
               size="sm"
               onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
               className="gap-2"
          >
               {theme === "dark" ? (
                    <>
                         <Sun className="h-4 w-4" />
                         <span className="hidden sm:inline">Light</span>
                    </>
               ) : (
                    <>
                         <Moon className="h-4 w-4" />
                         <span className="hidden sm:inline">Dark</span>
                    </>
               )}
          </Button>
     );
}
