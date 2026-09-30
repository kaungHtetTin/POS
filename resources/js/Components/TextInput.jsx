import { forwardRef, useEffect, useRef } from 'react';

export default forwardRef(function TextInput({ type = 'text', className = '', isFocused = false, ...props }, ref) {
    const input = ref ? ref : useRef();

    useEffect(() => {
        if (isFocused) {
            input.current.focus();
        }
    }, []);

    return (
        <div className="flex flex-col items-start">
            <input
                {...props}
                type={type}
                className={
                    'min-h-[34px] border-[#DDE5E1] bg-white px-[9px] py-[6px] text-[13px] text-[#132238] rounded-[4px] shadow-none ' +
                    className
                }
                ref={input}
            />
        </div>
    );
});
