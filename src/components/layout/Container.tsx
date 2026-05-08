interface ContainerProps {
  children: React.ReactNode;
}

export function Container({ children }: ContainerProps) {
  return (
    <div className="max-w-[480px] mx-auto px-5 pt-[max(16px,env(safe-area-inset-top))] pb-32">
      {children}
    </div>
  );
}
