export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <p {...props} className={'text-[11px] text-[#DC3C3C] ' + className}>
            {message}
        </p>
    ) : null;
}
