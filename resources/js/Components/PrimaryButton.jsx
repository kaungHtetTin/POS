export default function PrimaryButton({ className = '', disabled, children, ...props }) {
    return (
        <button
            {...props}
            className={
                `inline-flex min-h-[32px] items-center px-[9px] py-[5px] bg-[#0E684E] border border-[#0E684E] rounded-[5px] font-semibold text-xs text-white hover:bg-[#0A4E3D] hover:border-[#0A4E3D] focus:outline-none focus:ring-2 focus:ring-[#0E684E]/20 focus:ring-offset-2 transition ease-in-out duration-150 ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
