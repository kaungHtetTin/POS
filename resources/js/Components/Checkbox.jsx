export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded-[4px] border-[#DDE5E1] text-[#0E684E] shadow-none focus:ring-[#0E684E]/20 ' +
                className
            }
        />
    );
}
