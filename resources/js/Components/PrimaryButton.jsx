export default function PrimaryButton({ className = '', disabled, children, ...props }) {
    return (
        <button
            {...props}
            className={
                `inline-flex min-h-[32px] items-center px-[9px] py-[5px] bg-[#176B5B] border border-[#176B5B] rounded-[5px] font-semibold text-xs text-white hover:bg-[#125346] hover:border-[#125346] focus:outline-none focus:ring-2 focus:ring-[#176B5B]/20 focus:ring-offset-2 transition ease-in-out duration-150 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
