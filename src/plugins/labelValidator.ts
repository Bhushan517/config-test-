export const validateLabel = (label: string) => {
  const onlyNumbers = /^[0-9]+$/;
  if (onlyNumbers.test(label)) {
    throw new Error("Label cannot be only numbers.");
  }
};
