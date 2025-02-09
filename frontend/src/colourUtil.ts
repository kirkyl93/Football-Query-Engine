
export function getColour(clubId: number): string {
    const hash = clubId * 2654435761 % 2 ** 32;

    const r = (hash >> 16) & 0xFF; // Red component
    const g = (hash >> 8) & 0xFF;  // Green component
    const b = hash & 0xFF;         // Blue component

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}


export function hexToRGB(hex: string, alpha: number) {
    // Remove the '#' if present
    hex = hex.replace(/^#/, '');

    // Parse r, g, b values from hex
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

