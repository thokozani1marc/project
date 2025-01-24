export const formatPrice = (amount: number) => `R${amount.toFixed(2)}`;

export const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString();
};
