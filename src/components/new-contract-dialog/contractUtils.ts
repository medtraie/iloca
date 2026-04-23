
export const calculateTotalPrice = (dailyPrice?: string, rentalDuration?: string) => {
  if (dailyPrice && rentalDuration) {
    return parseFloat(dailyPrice) * parseInt(rentalDuration, 10);
  }
  return 0;
};

export const calculateRemaining = (total: number, advance?: string) => {
  const adv = parseFloat(advance || "0");
  return total - adv;
};

export const calculateDateDifference = (startDate: string, endDate: string) => {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
};

export const getContractStatus = (_startDate: string, _endDate: string) => {
  // Simplifié : statut toujours "Ouvert".
  return { status: "Ouvert", statusColor: "text-green-600" };
};
