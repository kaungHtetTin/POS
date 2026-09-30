export default function SecondaryButton({ type = 'button', className = '', disabled, children, ...props }) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex min-h-[32px] items-center px-[9px] py-[5px] bg-white border border-[#DDE5E1] rounded-[5px] font-semibold text-xs text-[#132238] hover:bg-[#F6F8F7] hover:border-[#B9C9C1] focus:outline-none focus:ring-2 focus:ring-[#0E684E]/20 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
