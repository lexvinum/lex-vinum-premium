type PremiumPageShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function PremiumPageShell({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: PremiumPageShellProps) {
  return (
    <div className="min-h-screen bg-[#efebe3] text-[#1f1a17]">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 md:px-6 md:pt-8">
        
        {/* HERO — COUNTRY CLUB */}
        <section className="relative overflow-hidden rounded-[28px] border border-[#465344] bg-[#233126]">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(20,18,15,0.18),rgba(20,18,15,0.62))]" />

          <div className="relative z-10 flex flex-col gap-6 p-6 md:p-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              {eyebrow && (
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#cbbfae]">
                  {eyebrow}
                </p>
              )}

              <h1 className="mt-4 font-serif text-4xl leading-[0.95] text-[#f4ede3] md:text-5xl xl:text-6xl">
                {title}
              </h1>

              {subtitle && (
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#ddd4c8]">
                  {subtitle}
                </p>
              )}
            </div>

            {actions && (
              <div className="flex flex-wrap items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </section>

        {/* CONTENT */}
        <div className="mt-10 flex flex-col gap-8">
          {children}
        </div>
      </div>
    </div>
  );
}