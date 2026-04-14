type PremiumSectionProps = {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function PremiumSection({
  title,
  subtitle,
  rightSlot,
  children,
  className = "",
}: PremiumSectionProps) {
  return (
    <section
      className={`rounded-[26px] border border-[#d7cfc2] bg-[#f6f2eb] p-6 md:p-8 ${className}`}
    >
      {(title || subtitle || rightSlot) && (
        <div className="mb-6 flex flex-col gap-4 border-b border-[#ddd5c9] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {title && (
              <h2 className="font-serif text-3xl text-[#221c18]">
                {title}
              </h2>
            )}

            {subtitle && (
              <p className="mt-2 text-sm leading-7 text-[#6a6156]">
                {subtitle}
              </p>
            )}
          </div>

          {rightSlot && <div>{rightSlot}</div>}
        </div>
      )}

      {children}
    </section>
  );
}

export function PremiumStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#d7cfc2] bg-[#f6f2eb] p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-[#7b7266]">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl text-[#221c18]">{value}</p>
      {hint && <p className="mt-2 text-sm text-[#6a6156]">{hint}</p>}
    </div>
  );
}

export function PremiumInfoCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-[#d8d0c4] bg-[#fbf8f2] shadow-[0_12px_34px_rgba(31,26,23,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}