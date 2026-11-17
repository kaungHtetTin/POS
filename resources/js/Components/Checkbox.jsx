export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded-[4px] border-[#DDE5E1] text-[#176B5B] shadow-none focus:ring-[#176B5B]/20 ' +
                className
            }
        />
    );
}
