export const defaultDescriptor = {
    writable: true,
    enumerable: true,
    configurable: false,
};

export function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export function deCapitalize(s) {
    return s ? s.slice(0,1).toLowerCase()+s.slice(1) : s
}

export function mergeProperties(dest, src) {
    Object.getOwnPropertyNames(src).forEach(function forEachOwnPropertyName (name) {
        if (Object.hasOwnProperty.call(dest, name)) {
            return
        }
        const descriptor = Object.getOwnPropertyDescriptor(src, name);
        Object.defineProperty(dest, name, descriptor)
    });
    return dest
}
