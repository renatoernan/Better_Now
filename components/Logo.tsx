
import React from 'react';

const Logo: React.FC = () => {
    return (
        <div className="flex flex-col items-center text-center -space-y-2">
            <svg width="60" height="60" viewBox="0 0 100 100" className="text-[#2c3e50]">
                <defs>
                    <path id="petal" d="M50 0 C65 20, 65 35, 50 50 C35 35, 35 20, 50 0 Z" />
                </defs>
                <circle cx="50" cy="50" r="12" fill="currentColor" />
                <g fill="currentColor">
                    <use href="#petal" transform="rotate(0 50 50)" />
                    <use href="#petal" transform="rotate(45 50 50)" />
                    <use href="#petal" transform="rotate(90 50 50)" />
                    <use href="#petal" transform="rotate(135 50 50)" />
                    <use href="#petal" transform="rotate(180 50 50)" />
                    <use href="#petal" transform="rotate(225 50 50)" />
                    <use href="#petal" transform="rotate(270 50 50)" />
                    <use href="#petal" transform="rotate(315 50 50)" />
                </g>
            </svg>
            <span className="font-pacifico text-4xl text-[#2c3e50]">Better Now</span>
            <span className="font-montserrat text-xs tracking-widest font-bold text-[#2c3e50]">PRODUÇÕES E EVENTOS</span>
        </div>
    );
};

export default Logo;
