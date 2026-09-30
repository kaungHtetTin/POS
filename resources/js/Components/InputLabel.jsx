export default function InputLabel({ value, className = '', children, ...props }) {
    return (
        <label {...props} className={`block text-[11px] leading-[1.3] font-semibold text-[#425466] ` + className}>
            {value ? value : children}
        </label>
    );
}
