export default function DangerButton({ className = '', disabled, children, ...props }) {
    return (
        <button
            {...props}
            className={
                `inline-flex min-h-[32px] items-center px-[9px] py-[5px] bg-white border border-[#F0CACA] rounded-[5px] font-semibold text-xs text-[#DC3C3C] hover:bg-[#FFF4F3] focus:outline-none focus:ring-2 focus:ring-[#DC3C3C]/20 focus:ring-offset-2 transition ease-in-out duration-150 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
