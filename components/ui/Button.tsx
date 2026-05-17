type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = 'rounded px-4 py-2 font-semibold transition focus:outline-none focus:ring';
  const styles =
    variant === 'primary'
      ? 'bg-accent text-night hover:bg-yellow-400 focus:ring-yellow-300'
      : 'bg-slate-700 text-slate-100 hover:bg-slate-600 focus:ring-slate-500';
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
