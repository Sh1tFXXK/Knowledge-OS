// src/env.d.ts

// 1. 声明核心模块
declare module 'react';
declare module 'react-dom/client';

// 2. 关键：声明 React 自动编译器需要的 runtime (解决你现在的报错)
declare module 'react/jsx-runtime' {
    export default any;
}

// 3. 解决 CSS 引入报错
declare module "*.css" {
    const content: any;
    export default content;
}

// 4. 解决 JSX 标签报错
declare namespace JSX {
    interface IntrinsicElements {
        [elemName: string]: any;
    }
}
