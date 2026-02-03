const UNIT_CONVERSIONS = {
    length: {
      cm: 1,
      mm: 0.1,
      m: 100,
      in: 2.54,
      ft: 30.48
    },
    weight: {
      kg: 1,
      g: 0.001,
      lb: 0.453592,
      oz: 0.0283495
    }
  };
  
  function convertLength(value: number, fromUnit: string, toUnit = 'cm') {
    const base = value * UNIT_CONVERSIONS.length[fromUnit];
    return base / UNIT_CONVERSIONS.length[toUnit];
  }
  
  function convertWeight(value: number, fromUnit: string, toUnit = 'kg') {
    const base = value * UNIT_CONVERSIONS.weight[fromUnit];
    return base / UNIT_CONVERSIONS.weight[toUnit];
  }