export const groupCajasByDate = <T extends { fechaCierre?: number }>(items: T[]) => {
    const groups: Record<string, T[]> = {};

    items.forEach((item) => {
        if (!item.fechaCierre) return;

        // Create a date string compatible with the desired grouping (e.g., "YYYY-MM-DD")
        // We use the local date to ensure correct grouping by day
        const date = new Date(item.fechaCierre);
        const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(item);
    });

    return groups;
};

export const formatDateHeader = (timestamp: number) => {
    const date = new Date(timestamp);
    // Example: "Miércoles, 7 de Enero"
    return date.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
};
