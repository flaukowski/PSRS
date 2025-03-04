import { WalletConnect } from "@/components/WalletConnect";
import { Navigation } from "@/components/Navigation";
import { Link } from "wouter";
import { MusicPlayer } from "@/components/MusicPlayer";
import { useDimensionalTranslation } from "@/contexts/LocaleContext";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { NinjaTour } from "@/components/NinjaTour";
import { useDevice } from "@/hooks/use-mobile";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t } = useDimensionalTranslation();
  const { isMobile, isTablet } = useDevice();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isCompactView = isMobile || isTablet;

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background layer */}
      <div className="fixed inset-0 bg-background/95" />

      {/* Content layers */}
      <header className="relative z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto py-2 md:py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {t('app.title')}
              </h1>
            </Link>
            {!isCompactView && <Navigation />}
          </div>

          <div className="flex items-center gap-2">
            {!isCompactView ? (
              <>
                <LanguageSwitcher />
                <WalletConnect />
              </>
            ) : (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {mobileMenuOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[85vw] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>{t('app.title')}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <Navigation />
                    <div className="space-y-4">
                      <WalletConnect />
                      <LanguageSwitcher />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        {/* Dimensional Status Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary">
          <div 
            className="absolute inset-0 opacity-75"
            style={{
              background: 'linear-gradient(90deg, var(--primary) 0%, purple 50%, var(--primary) 100%)',
              animation: 'quantum-shift 2s infinite'
            }}
          />
        </div>
      </header>

      <main className="relative z-10 flex-grow overflow-x-hidden">
        <div className="container mx-auto pt-4 md:pt-8 pb-32 px-4">
          {children}
        </div>
      </main>

      {/* Fixed position elements */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="container mx-auto px-2 pb-2 md:px-4 md:pb-4">
          {/* Ninja Tour */}
          {!isCompactView && (
            <div className="mb-2 md:mb-4">
              <NinjaTour />
            </div>
          )}

          {/* Music Player */}
          <div className={`${isCompactView ? 'text-sm' : 'text-base'}`}>
            <MusicPlayer />
          </div>
        </div>
      </div>
    </div>
  );
}